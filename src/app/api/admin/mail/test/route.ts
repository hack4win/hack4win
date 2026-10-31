import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { brevoService, HACK4WIN_SENDERS, SendEmailOptions } from "@/lib/email/brevo-service";
import { wrapInEmailLayout } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/seo/config";

/**
 * Admin Test Email Dispatch Endpoint
 * POST /api/admin/mail/test
 * 
 * Sends a live diagnostic test email to the administrator (or specified address)
 * to verify Brevo REST API / SMTP relay connectivity, DKIM, and delivery speed.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required to dispatch diagnostic test emails" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const recipientEmail = typeof body.recipientEmail === "string" && body.recipientEmail.trim()
      ? body.recipientEmail.trim()
      : session.user.email;

    const senderKey = (body.senderKey as keyof typeof HACK4WIN_SENDERS) || "NOTIFICATIONS";
    const selectedSender = HACK4WIN_SENDERS[senderKey] || HACK4WIN_SENDERS.NOTIFICATIONS;
    const engine = (body.engine as "auto" | "brevo_api" | "brevo_smtp") || "auto";

    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Asia/Kolkata",
    });

    const subject = typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : `⚡ Hack4Win • Infrastructure Email Delivery Test (${now.toLocaleTimeString()})`;

    // Generate responsive HTML diagnostic email
    const emailContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
            Email Delivery Test Successful
          </h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; color: #e0e7ff;">
            Dispatched from Hack4Win Infrastructure Settings Console
          </p>
        </div>

        <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
            Hello <strong>${session.user.name || "Administrator"}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            This diagnostic test email confirms that your outgoing mail services (Brevo REST API v3 &amp; SMTP Relay) are functioning properly with domain DKIM and SPF alignment on <strong>hack4win.online</strong>.
          </p>

          <div style="margin: 24px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px;">
            <h3 style="margin: 0 0 14px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">
              Diagnostic Parameters
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Recipient:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #0f172a;">${recipientEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sender Identity:</td>
                <td style="padding: 6px 0; font-family: monospace;">${selectedSender.name} &lt;${selectedSender.email}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dispatched At:</td>
                <td style="padding: 6px 0;">${formattedDate} (IST)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Platform Domain:</td>
                <td style="padding: 6px 0;"><a href="${SITE_URL}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${SITE_URL}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Engine Selected:</td>
                <td style="padding: 6px 0; text-transform: uppercase; font-family: monospace; font-size: 12px; font-weight: 700; color: #059669;">${engine}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${SITE_URL}/admin/settings" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
              Open Settings Console &rarr;
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Sent by Hack4Win System Daemon &bull; Automated Infrastructure Diagnostics
          </p>
        </div>
      </div>
    `;

    const htmlContent = wrapInEmailLayout(emailContent, {
      preheader: `Diagnostic test email for ${recipientEmail} from Hack4Win`,
      badgeText: "System Diagnostic",
      isMarketing: false,
    });

    const sendOptions: SendEmailOptions = {
      to: [recipientEmail],
      subject,
      htmlContent,
      textContent: `Hack4Win Email Delivery Test: Outgoing mail services are active. Dispatched at ${formattedDate} to ${recipientEmail}.`,
      sender: selectedSender,
      replyTo: { email: HACK4WIN_SENDERS.SUPPORT.email, name: HACK4WIN_SENDERS.SUPPORT.name },
      tags: ["admin-test", "diagnostics", senderKey.toLowerCase()],
      engine,
      forceLive: true,
    };

    const result = await brevoService.sendEmail(sendOptions);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      engineUsed: result.engineUsed,
      recipient: recipientEmail,
      sender: selectedSender.email,
      sentAt: now.toISOString(),
      warning: result.warning,
      isIpRestricted: result.isIpRestricted,
    });
  } catch (error) {
    console.error("[POST /api/admin/mail/test Error]:", error);
    const analysis = brevoService.analyzeBrevoError(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to dispatch test email",
        isIpRestricted: analysis.isIpRestricted,
        detectedIp: analysis.detectedIp,
        guidanceUrl: analysis.guidanceUrl,
        guidanceMessage: analysis.guidanceMessage,
      },
      { status: 500 }
    );
  }
}
