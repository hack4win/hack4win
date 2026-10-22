import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { brevoService, HACK4WIN_SENDERS, SendEmailOptions } from "@/lib/email/brevo-service";
import {
  getWelcomeEmailTemplate,
  getTeamInviteEmailTemplate,
  getHackathonRegistrationEmailTemplate,
  getJudgeInviteEmailTemplate,
  getMarketingCampaignEmailTemplate,
} from "@/lib/email/templates";

/**
 * Brevo Email Dispatch API Endpoint
 * 
 * POST /api/email/send
 * Allows sending transactional emails, invitations, or marketing broadcasts.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized: Please sign in to send emails" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      to,
      subject,
      htmlContent,
      textContent,
      senderKey, // "NEWS" | "REQUESTS" | "WELCOME" | "NOTIFICATIONS" | "SUPPORT"
      sender,
      replyTo,
      cc,
      bcc,
      tags,
      engine = "auto",
      template,
      templateData,
      isCampaign = false,
    } = body;

    // RBAC: Marketing/Campaign emails require Admin privileges
    if (isCampaign && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Platform administrator privileges required to dispatch marketing campaigns" },
        { status: 403 }
      );
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return NextResponse.json({ error: "Recipient ('to') is required" }, { status: 400 });
    }

    // Resolve sender identity
    let resolvedSender = sender;
    if (senderKey && senderKey in HACK4WIN_SENDERS) {
      resolvedSender = HACK4WIN_SENDERS[senderKey as keyof typeof HACK4WIN_SENDERS];
    }

    let finalSubject = subject;
    let finalHtml = htmlContent;
    let finalText = textContent;

    // Support built-in templates
    if (template) {
      switch (template) {
        case "welcome": {
          const t = getWelcomeEmailTemplate({
            name: templateData?.name || session.user.name || "Builder",
            email: Array.isArray(to) ? to[0]?.email || to[0] : to,
            username: templateData?.username || session.user.username || undefined,
          });
          finalSubject = finalSubject || t.subject;
          finalHtml = t.html;
          finalText = t.text;
          resolvedSender = resolvedSender || HACK4WIN_SENDERS.WELCOME;
          break;
        }
        case "team_invite": {
          const t = getTeamInviteEmailTemplate({
            senderName: templateData?.senderName || session.user.name || "A Participant",
            receiverName: templateData?.receiverName,
            hackathonTitle: templateData?.hackathonTitle || "Hack4Win Hackathon",
            teamName: templateData?.teamName || "Innovation Team",
            role: templateData?.role || "Co-Builder",
            acceptUrl: templateData?.acceptUrl || "https://hack4win.online/hackathons",
            message: templateData?.message,
          });
          finalSubject = finalSubject || t.subject;
          finalHtml = t.html;
          finalText = t.text;
          resolvedSender = resolvedSender || HACK4WIN_SENDERS.NOTIFICATIONS;
          break;
        }
        case "registration": {
          const t = getHackathonRegistrationEmailTemplate({
            userName: templateData?.userName || session.user.name || "Builder",
            hackathonTitle: templateData?.hackathonTitle || "Hackathon Challenge",
            slug: templateData?.slug || "hackathon",
            startDate: templateData?.startDate || new Date().toISOString(),
            isPrivate: templateData?.isPrivate,
            accessCode: templateData?.accessCode,
          });
          finalSubject = finalSubject || t.subject;
          finalHtml = t.html;
          finalText = t.text;
          resolvedSender = resolvedSender || HACK4WIN_SENDERS.NOTIFICATIONS;
          break;
        }
        case "judge_invite": {
          const t = getJudgeInviteEmailTemplate({
            judgeName: templateData?.judgeName || "Judge",
            hackathonTitle: templateData?.hackathonTitle || "Hackathon Challenge",
            organizerName: templateData?.organizerName || session.user.name || "Organizer",
            portalUrl: templateData?.portalUrl || "https://hack4win.online/judges",
          });
          finalSubject = finalSubject || t.subject;
          finalHtml = t.html;
          finalText = t.text;
          resolvedSender = resolvedSender || HACK4WIN_SENDERS.REQUESTS;
          break;
        }
        case "campaign": {
          const t = getMarketingCampaignEmailTemplate({
            subject: finalSubject || "Hack4Win Platform Announcement",
            preheader: templateData?.preheader,
            contentMarkdownOrHtml: templateData?.content || finalHtml || "",
            ctaText: templateData?.ctaText,
            ctaUrl: templateData?.ctaUrl,
            unsubscribeUrl: templateData?.unsubscribeUrl,
          });
          finalSubject = t.subject;
          finalHtml = t.html;
          finalText = t.text;
          resolvedSender = resolvedSender || HACK4WIN_SENDERS.NEWS;
          break;
        }
      }
    }

    if (!finalSubject || typeof finalSubject !== "string" || !finalSubject.trim()) {
      return NextResponse.json({ error: "Email subject is required" }, { status: 400 });
    }

    if (!finalHtml || typeof finalHtml !== "string" || !finalHtml.trim()) {
      return NextResponse.json({ error: "Email HTML content is required" }, { status: 400 });
    }

    const emailOptions: SendEmailOptions = {
      to: Array.isArray(to) ? to : [to],
      subject: finalSubject.trim(),
      htmlContent: finalHtml,
      textContent: finalText,
      sender: resolvedSender,
      replyTo,
      cc,
      bcc,
      tags: tags || (isCampaign ? ["campaign"] : ["transactional"]),
      engine,
      isCampaign,
    };

    const result = await brevoService.sendEmail(emailOptions);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      engineUsed: result.engineUsed,
      warning: result.warning,
      isIpRestricted: result.isIpRestricted || false,
      guidanceUrl: result.guidanceUrl,
      recipientCount: Array.isArray(to) ? to.length : 1,
    });
  } catch (error) {
    console.error("[POST /api/email/send error]:", error);
    const analysis = brevoService.analyzeBrevoError(error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to dispatch email",
        isIpRestricted: analysis.isIpRestricted,
        guidanceUrl: analysis.guidanceUrl,
        detectedIp: analysis.detectedIp,
      },
      { status: analysis.isIpRestricted ? 403 : 500 }
    );
  }
}
