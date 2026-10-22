import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { mailRepository } from "@/lib/db/mail-repository";

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
    const recipientEmails = audience.recipients.map((r) => r.email);

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: "No recipients matched the selected filter criteria" },
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

    return NextResponse.json({
      success: true,
      campaign,
      deliveredCount: recipientEmails.length,
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
