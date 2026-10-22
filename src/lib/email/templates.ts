/**
 * Hack4Win Email Templates Library
 * 
 * Beautiful, responsive, transactional and marketing HTML email templates
 * with Hack4Win brand identity, inline styling, and CAN-SPAM / GDPR compliance.
 */

export interface BaseTemplateOptions {
  preheader?: string;
  recipientName?: string;
  recipientEmail?: string;
  unsubscribeUrl?: string;
  isMarketing?: boolean;
}

const BRAND_NAME = "Hack4Win";
const BRAND_URL = "https://hack4win.online";
const LOGO_URL = "https://hack4win.online/icon.png";
const PRIMARY_COLOR = "#6366f1";
const BG_DARK = "#090d16";
const CARD_BG = "#111827";
const TEXT_MUTED = "#9ca3af";
const TEXT_LIGHT = "#f3f4f6";

/**
 * Base email layout wrapper
 */
export function wrapInEmailLayout(contentHtml: string, options: BaseTemplateOptions = {}): string {
  const preheaderText = options.preheader
    ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(options.preheader)}</span>`
    : "";

  const unsubscribeFooter = options.isMarketing
    ? `
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; color: ${TEXT_MUTED};">
          <p style="margin: 0 0 8px;">
            You are receiving this announcement because your account is registered on Hack4Win.
          </p>
          <p style="margin: 0;">
            <a href="${options.unsubscribeUrl || `${BRAND_URL}/profile?tab=notifications`}" style="color: ${PRIMARY_COLOR}; text-decoration: underline;">
              Unsubscribe or manage email preferences
            </a>
            &nbsp;&bull;&nbsp;
            <a href="${BRAND_URL}" style="color: ${TEXT_MUTED}; text-decoration: none;">
              Visit Hack4Win
            </a>
          </p>
        </td>
      </tr>
    `
    : `
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; color: ${TEXT_MUTED};">
          <p style="margin: 0 0 4px;">
            This is an essential transactional notification from <a href="${BRAND_URL}" style="color: ${PRIMARY_COLOR}; text-decoration: none; font-weight: bold;">Hack4Win</a>.
          </p>
          <p style="margin: 0;">
            Questions? Contact our team at <a href="mailto:support@hack4win.online" style="color: ${PRIMARY_COLOR}; text-decoration: none;">support@hack4win.online</a>
          </p>
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${TEXT_LIGHT};">
  ${preheaderText}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: ${CARD_BG}; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Bar with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                      <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">⚡ Hack4Win</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255, 255, 255, 0.15); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Hackathon Platform
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #0b0f19; padding: 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${unsubscribeFooter}
                <tr>
                  <td style="padding-top: 12px; text-align: center; font-size: 10px; color: #6b7280;">
                    &copy; ${new Date().getFullYear()} Hack4Win (hack4win.online). All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Welcome / Onboarding Email Template
 */
export function getWelcomeEmailTemplate(params: {
  name: string;
  email: string;
  username?: string;
  ctaUrl?: string;
}): { subject: string; html: string; text: string } {
  const profileUrl = params.username
    ? `${BRAND_URL}/u/${params.username}`
    : `${BRAND_URL}/profile`;

  const subject = `Welcome to Hack4Win, ${params.name || "Builder"}! 🚀`;

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Welcome to the Next Generation of Hackathons! 🎉
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.name)}</strong>, thank you for joining <strong>Hack4Win</strong>. You are now part of a global developer collective building groundbreaking software, autonomous agents, and campus innovations.
    </p>

    <!-- Highlights Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 20px 0; padding: 16px;">
      <tr>
        <td>
          <div style="margin-bottom: 12px; font-size: 13px; font-weight: 700; color: #ffffff;">What you can do on Hack4Win:</div>
          <div style="font-size: 13px; line-height: 1.8; color: #9ca3af;">
            ✨ <strong>Browse Live Competitions</strong> with cash prizes and bounties.<br>
            🤝 <strong>Find Teammates</strong> and form cross-functional squads.<br>
            🎓 <strong>Join Private Campus Events</strong> with college email domains.<br>
            🚀 <strong>Showcase Your Builds</strong> with live demo video embeds & carousels.
          </div>
        </td>
      </tr>
    </table>

    <!-- Call to action button -->
    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.ctaUrl || `${BRAND_URL}/hackathons`}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        Explore Live Hackathons &rarr;
      </a>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
      You can also customize your developer profile anytime at <a href="${profileUrl}" style="color: ${PRIMARY_COLOR}; text-decoration: none;">${profileUrl}</a>
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Hi ${params.name}, your Hack4Win account is ready. Discover live hackathons and join winning teams today.`,
    recipientName: params.name,
    recipientEmail: params.email,
  });

  const text = `Welcome to Hack4Win, ${params.name}!\n\n` +
    `Your account is ready. Explore live competitions, team up with fellow builders, and build innovative projects.\n\n` +
    `Explore Hackathons: ${BRAND_URL}/hackathons\n` +
    `Your Profile: ${profileUrl}\n\n` +
    `Best regards,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 2. Team Invitation Email Template
 */
export function getTeamInviteEmailTemplate(params: {
  senderName: string;
  receiverName?: string;
  hackathonTitle: string;
  teamName: string;
  role: string;
  acceptUrl: string;
  message?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Team Invite: ${params.senderName} invited you to join "${params.teamName}" for ${params.hackathonTitle}! 🤝`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      You've Been Invited to Join a Hackathon Team! 🤝
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi ${params.receiverName ? `<strong>${escapeHtml(params.receiverName)}</strong>` : "Builder"}, <strong>${escapeHtml(params.senderName)}</strong> has invited you to collaborate in <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <!-- Team Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #131c2e, #0e1523); border: 1px solid #1f2937; border-radius: 14px; margin: 20px 0; padding: 20px;">
      <tr>
        <td>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: ${PRIMARY_COLOR}; letter-spacing: 0.5px; margin-bottom: 6px;">
            Invitation Details
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
            ${escapeHtml(params.teamName)}
          </div>
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #9ca3af; line-height: 1.6;">
            <tr>
              <td style="padding: 4px 0; width: 120px;"><strong>Hackathon:</strong></td>
              <td style="padding: 4px 0; color: #e5e7eb;">${escapeHtml(params.hackathonTitle)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Assigned Role:</strong></td>
              <td style="padding: 4px 0; color: #a5b4fc; font-weight: bold;">${escapeHtml(params.role)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Invited By:</strong></td>
              <td style="padding: 4px 0; color: #e5e7eb;">${escapeHtml(params.senderName)}</td>
            </tr>
            ${params.message ? `
            <tr>
              <td style="padding: 8px 0 4px; vertical-align: top;"><strong>Message:</strong></td>
              <td style="padding: 8px 0 4px; color: #cbd5e1; font-style: italic;">&ldquo;${escapeHtml(params.message)}&rdquo;</td>
            </tr>
            ` : ""}
          </table>
        </td>
      </tr>
    </table>

    <!-- Call to action button -->
    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        Accept Team Invitation &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
      Or paste this URL into your browser:<br>
      <a href="${params.acceptUrl}" style="color: ${PRIMARY_COLOR}; word-break: break-all;">${params.acceptUrl}</a>
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `${params.senderName} invited you to join team "${params.teamName}" for ${params.hackathonTitle}. Accept your spot now.`,
  });

  const text = `Team Invitation for ${params.hackathonTitle}\n\n` +
    `${params.senderName} has invited you to join team "${params.teamName}" as ${params.role}.\n\n` +
    (params.message ? `Message: "${params.message}"\n\n` : "") +
    `Accept your invitation here: ${params.acceptUrl}\n\n` +
    `Happy building!\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 3. Hackathon Registration Confirmation Email Template
 */
export function getHackathonRegistrationEmailTemplate(params: {
  userName: string;
  hackathonTitle: string;
  slug: string;
  startDate: string;
  isPrivate?: boolean;
  accessCode?: string;
}): { subject: string; html: string; text: string } {
  const hackathonUrl = `${BRAND_URL}/hackathons/${params.slug}`;
  const subject = `Registration Confirmed: You're in for ${params.hackathonTitle}! 🎟️`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      You're Officially Registered! 🎟️
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, your registration for <strong>${escapeHtml(params.hackathonTitle)}</strong> has been confirmed.
    </p>

    <!-- Hackathon Overview Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 20px 0; padding: 18px;">
      <tr>
        <td>
          ${params.isPrivate ? `
          <div style="display: inline-block; background-color: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; margin-bottom: 10px;">
            🔒 Private Campus Challenge
          </div>
          ` : ""}
          <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
            ${escapeHtml(params.hackathonTitle)}
          </div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">
            📅 <strong>Starts:</strong> ${new Date(params.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}<br>
            ${params.accessCode ? `🔑 <strong>Access Passcode:</strong> <code style="font-family: monospace; color: #a5b4fc; background: #1e1b4b; padding: 2px 6px; border-radius: 4px;">${escapeHtml(params.accessCode)}</code><br>` : ""}
            🚀 <strong>Status:</strong> Active Participant
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${hackathonUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        View Challenge & Team Workspace &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `You have successfully joined ${params.hackathonTitle}. Access challenge rules, schedule, and team formation now.`,
  });

  const text = `Registration Confirmed: ${params.hackathonTitle}\n\n` +
    `Hi ${params.userName},\n` +
    `You are officially registered for ${params.hackathonTitle}.\n\n` +
    `Challenge URL: ${hackathonUrl}\n\n` +
    `Best of luck!\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 4. Judge Appointment Email Template
 */
export function getJudgeInviteEmailTemplate(params: {
  judgeName: string;
  hackathonTitle: string;
  organizerName: string;
  portalUrl?: string;
}): { subject: string; html: string; text: string } {
  const judgesUrl = params.portalUrl || `${BRAND_URL}/judges`;
  const subject = `Judges Appointment: You are assigned to judge ${params.hackathonTitle} ⚖️`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Judging Panel Appointment ⚖️
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Dear <strong>${escapeHtml(params.judgeName)}</strong>, you have been invited by <strong>${escapeHtml(params.organizerName)}</strong> to serve as a technical evaluator for <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 20px 0; padding: 18px;">
      <tr>
        <td>
          <div style="font-size: 13px; line-height: 1.8; color: #9ca3af;">
            📊 <strong>Scorecard Engine:</strong> Multi-criteria weighted rubrics.<br>
            🔒 <strong>Evaluation Mode:</strong> Blind / Verified evaluation flow.<br>
            🎯 <strong>Command Center:</strong> Direct access to submitted demos and repositories.
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${judgesUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
        Open Judges Evaluation Portal &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `You have been selected to judge submissions for ${params.hackathonTitle}. Access your scorecards at ${judgesUrl}.`,
  });

  const text = `Judging Appointment for ${params.hackathonTitle}\n\n` +
    `Dear ${params.judgeName},\n` +
    `You have been assigned as an evaluator by ${params.organizerName}.\n\n` +
    `Open Judges Portal: ${judgesUrl}\n\n` +
    `Thank you,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 5. Marketing & Platform Announcement Email Template
 */
export function getMarketingCampaignEmailTemplate(params: {
  subject: string;
  preheader?: string;
  contentMarkdownOrHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const content = `
    <div style="font-size: 14px; line-height: 1.7; color: #d1d5db;">
      ${params.contentMarkdownOrHtml}
    </div>

    ${params.ctaText && params.ctaUrl ? `
    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 30px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        ${escapeHtml(params.ctaText)} &rarr;
      </a>
    </div>
    ` : ""}
  `;

  const html = wrapInEmailLayout(content, {
    preheader: params.preheader,
    isMarketing: true,
    unsubscribeUrl: params.unsubscribeUrl,
  });

  const text = `${params.subject}\n\n` +
    `${stripHtml(params.contentMarkdownOrHtml)}\n\n` +
    (params.ctaUrl ? `Learn more: ${params.ctaUrl}\n\n` : "") +
    `Hack4Win: ${BRAND_URL}`;

  return { subject: params.subject, html, text };
}

/**
 * 6. Host Inquiry Notification Template
 */
export function getHostInquiryEmailTemplate(params: {
  organizationName: string;
  contactName: string;
  email: string;
  timeline?: string;
  estimatedPrizePool?: string;
  eventGoals: string;
}): { subject: string; html: string; text: string } {
  const subject = `Hackathon Hosting Inquiry: ${params.organizationName} (${params.contactName})`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      New Hackathon Partnership Inquiry Received 🏢
    </h1>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 16px 0; padding: 18px; font-size: 13px; color: #9ca3af; line-height: 1.7;">
      <tr>
        <td style="width: 140px; font-weight: bold; color: #ffffff;">Organization:</td>
        <td style="color: #e5e7eb;">${escapeHtml(params.organizationName)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Contact Person:</td>
        <td style="color: #e5e7eb;">${escapeHtml(params.contactName)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Contact Email:</td>
        <td style="color: #a5b4fc;"><a href="mailto:${escapeHtml(params.email)}" style="color: #a5b4fc;">${escapeHtml(params.email)}</a></td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Timeline:</td>
        <td style="color: #e5e7eb;">${escapeHtml(params.timeline || "Flexible")}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Prize Pool:</td>
        <td style="color: #e5e7eb;">${escapeHtml(params.estimatedPrizePool || "Not specified")}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff; vertical-align: top; padding-top: 8px;">Goals & Vision:</td>
        <td style="color: #d1d5db; padding-top: 8px;">${escapeHtml(params.eventGoals)}</td>
      </tr>
    </table>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `New hosting inquiry from ${params.organizationName}.`,
  });

  const text = `New Hackathon Partnership Inquiry\n\n` +
    `Organization: ${params.organizationName}\n` +
    `Contact: ${params.contactName} (${params.email})\n` +
    `Timeline: ${params.timeline || "Flexible"}\n` +
    `Goals: ${params.eventGoals}\n`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "").trim();
}
