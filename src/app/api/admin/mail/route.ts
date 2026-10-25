import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { mailRepository } from "@/lib/db/mail-repository";
import { brevoService, HACK4WIN_SENDERS, isTestOrDummyEmail } from "@/lib/email/brevo-service";
import { getMarketingCampaignEmailTemplate, wrapInEmailLayout } from "@/lib/email/templates";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const campaigns = await mailRepository.listCampaigns();
    const stats = await mailRepository.getCampaignStats();
    return NextResponse.json({ campaigns, stats });
  } catch (error) {
    console.error("[Mail API GET Error]:", error);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      subject,
      type = "marketing",
      target_filter = "all",
      target_label = "All Platform Users",
      content,
      preheader,
    } = body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Email body content is required" }, { status: 400 });
    }

    // Resolve target audience emails
    const audience = await mailRepository.resolveRecipients(target_filter);
    const rawRecipientEmails = audience.recipients.map((r) => r.email);

    // Filter out test and dummy accounts to protect daily Brevo quota
    const recipientEmails = rawRecipientEmails.filter((email) => !isTestOrDummyEmail(email));

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients found (test and dummy accounts were excluded to protect email quota)" },
        { status: 400 }
      );
    }

    // Record campaign in database
    const campaign = await mailRepository.createCampaign({
      subject: subject.trim(),
      type: type === "transactional" ? "transactional" : "marketing",
      target_filter,
      target_label: target_label || target_filter,
      content: content.trim(),
      preheader: preheader?.trim() || undefined,
      recipient_emails: recipientEmails,
      recipient_count: recipientEmails.length,
      sent_by: session.user.email,
    });

    // Dispatch via Brevo Service
    const sender = (body.sender_key && body.sender_key in HACK4WIN_SENDERS)
      ? HACK4WIN_SENDERS[body.sender_key as keyof typeof HACK4WIN_SENDERS]
      : (type === "transactional" ? HACK4WIN_SENDERS.NOTIFICATIONS : HACK4WIN_SENDERS.NEWS);
    const template = getMarketingCampaignEmailTemplate({
      subject: subject.trim(),
      preheader: preheader?.trim(),
      contentMarkdownOrHtml: content.trim(),
      ctaText: body.cta_text || "Explore Hack4Win",
      ctaUrl: body.cta_url || "https://hack4win.online/hackathons",
    });

    const dispatchResult = await brevoService.sendEmail({
      to: recipientEmails.map((email) => ({ email })),
      subject: subject.trim(),
      htmlContent: template.html,
      textContent: template.text,
      sender,
      isCampaign: type === "marketing",
      tags: ["admin-campaign", type],
    });

    return NextResponse.json({
      success: true,
      campaign,
      deliveredCount: recipientEmails.length,
      engineUsed: dispatchResult.engineUsed,
      warning: dispatchResult.warning,
      isIpRestricted: dispatchResult.isIpRestricted,
      guidanceUrl: dispatchResult.guidanceUrl,
      message: `Successfully dispatched "${subject}" to ${recipientEmails.length} recipients.`,
    });
  } catch (error) {
    console.error("[Mail API POST Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch email campaign" },
      { status: 500 }
    );
  }
}
