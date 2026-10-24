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
  accentColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  badgeText?: string;
}

export interface GeneratedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND_NAME = "Hack4Win";
const BRAND_URL = "https://hack4win.online";
const PRIMARY_COLOR = "#6366f1";
const CARD_BG = "#111827";
const TEXT_MUTED = "#9ca3af";
const TEXT_LIGHT = "#f3f4f6";

/**
 * Base email layout wrapper with responsive tables, gradient header, and compliant footer.
 */
export function wrapInEmailLayout(contentHtml: string, options: BaseTemplateOptions = {}): string {
  const preheaderText = options.preheader
    ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(options.preheader)}</span>`
    : "";

  const gradStart = options.gradientStart || "#4f46e5";
  const gradEnd = options.gradientEnd || "#7c3aed";
  const badgeLabel = options.badgeText || "Hackathon Platform";

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
            Questions or support? Contact our team at <a href="mailto:support@hack4win.online" style="color: ${PRIMARY_COLOR}; text-decoration: none;">support@hack4win.online</a>
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
            <td style="background: linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%); padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                      <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">⚡ Hack4Win</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255, 255, 255, 0.18); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${escapeHtml(badgeLabel)}
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
                    &copy; ${new Date().getFullYear()} Hack4Win (hack4win.online). Next-Gen Hackathon Platform.
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

// =========================================================================
// 1. AUTHENTICATION & ONBOARDING TEMPLATES
// =========================================================================

/**
 * 1.1 Welcome & Onboarding Email
 */
export function getWelcomeEmailTemplate(params: {
  name: string;
  email: string;
  username?: string;
  ctaUrl?: string;
}): GeneratedEmail {
  const profileUrl = params.username ? `${BRAND_URL}/u/${params.username}` : `${BRAND_URL}/profile`;
  const subject = `Welcome to Hack4Win, ${params.name || "Builder"}! 🚀`;

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Welcome to the Next Generation of Hackathons! 🎉
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.name)}</strong>, thank you for joining <strong>Hack4Win</strong>. You are now part of a global developer collective building groundbreaking software, autonomous agents, and campus innovations.
    </p>

    <!-- Highlights Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 20px 0; padding: 18px;">
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

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.ctaUrl || `${BRAND_URL}/hackathons`}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        Explore Live Hackathons &rarr;
      </a>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
      Customize your developer profile anytime at <a href="${profileUrl}" style="color: ${PRIMARY_COLOR}; text-decoration: none;">${profileUrl}</a>
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Hi ${params.name}, your Hack4Win account is ready. Discover live hackathons and join winning teams today.`,
    badgeText: "Welcome Builder",
  });

  const text = `Welcome to Hack4Win, ${params.name}!\n\n` +
    `Your account is ready. Explore live competitions, team up with fellow builders, and build innovative projects.\n\n` +
    `Explore Hackathons: ${BRAND_URL}/hackathons\n` +
    `Your Profile: ${profileUrl}\n\n` +
    `Best regards,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 1.2 Password Reset / Email OTP Verification
 */
export function getPasswordResetOtpEmailTemplate(params: {
  name: string;
  otpCode?: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}): GeneratedEmail {
  const expiry = params.expiresInMinutes || 15;
  const subject = `Your Hack4Win Verification Code: ${params.otpCode || "Security Verification"} 🔒`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Account Security Verification 🔒
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.name)}</strong>, a security request was received for your Hack4Win account. Use the verification credentials below to complete your action.
    </p>

    ${params.otpCode ? `
    <!-- Large OTP Code Box -->
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background-color: #0d1322; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px 36px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ffffff;">
          ${escapeHtml(params.otpCode)}
        </span>
      </div>
      <p style="margin: 8px 0 0; font-size: 12px; color: ${TEXT_MUTED};">
        This single-use security code expires in <strong>${expiry} minutes</strong>.
      </p>
    </div>
    ` : ""}

    ${params.resetUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        Reset Account Password &rarr;
      </a>
    </div>
    ` : ""}

    <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #fca5a5; line-height: 1.5;">
      ⚠️ <strong>Security Notice:</strong> If you did not request this verification, please disregard this email or report suspicious activity immediately to <a href="mailto:support@hack4win.online" style="color: #f87171;">support@hack4win.online</a>.
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your Hack4Win security verification code is ${params.otpCode || "available"}. Valid for ${expiry} minutes.`,
    badgeText: "Security Alert",
    gradientStart: "#4f46e5",
    gradientEnd: "#9333ea",
  });

  const text = `Security Verification for Hack4Win\n\n` +
    `Hi ${params.name},\n` +
    (params.otpCode ? `Your verification code is: ${params.otpCode}\n\n` : "") +
    (params.resetUrl ? `Reset password link: ${params.resetUrl}\n\n` : "") +
    `This code expires in ${expiry} minutes. If you did not request this, please contact support@hack4win.online.`;

  return { subject, html, text };
}

// =========================================================================
// 2. TEAM COLLABORATION & INVITATION TEMPLATES
// =========================================================================

/**
 * 2.1 Team Invitation Email
 */
export function getTeamInviteEmailTemplate(params: {
  senderName: string;
  receiverName?: string;
  hackathonTitle: string;
  teamName: string;
  role: string;
  acceptUrl: string;
  message?: string;
}): GeneratedEmail {
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
            Team Invitation
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
    badgeText: "Team Invitation",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  });

  const text = `Team Invitation for ${params.hackathonTitle}\n\n` +
    `${params.senderName} has invited you to join team "${params.teamName}" as ${params.role}.\n\n` +
    (params.message ? `Message: "${params.message}"\n\n` : "") +
    `Accept your invitation here: ${params.acceptUrl}\n\n` +
    `Happy building!\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 2.2 Team Invite Accepted Notification (Sent to Team Leader)
 */
export function getTeamInviteAcceptedEmailTemplate(params: {
  leaderName: string;
  memberEmail: string;
  memberName?: string;
  teamName: string;
  hackathonTitle: string;
  teamRosterUrl: string;
}): GeneratedEmail {
  const memberDisplay = params.memberName ? `${params.memberName} (${params.memberEmail})` : params.memberEmail;
  const subject = `Teammate Joined: ${params.memberName || "A builder"} accepted your invite for "${params.teamName}"! 🎉`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Your Team Roster Just Grew! 🎉
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.leaderName)}</strong>, great news! <strong>${escapeHtml(memberDisplay)}</strong> has accepted your invitation and joined your squad for <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 16px 0; padding: 16px;">
      <tr>
        <td>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.7;">
            👥 <strong>Team:</strong> <span style="color: #ffffff; font-weight: bold;">${escapeHtml(params.teamName)}</span><br>
            🏆 <strong>Hackathon:</strong> ${escapeHtml(params.hackathonTitle)}<br>
            ✅ <strong>Status:</strong> Active Team Member
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.teamRosterUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        View Team Workspace &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `${memberDisplay} accepted your team invitation for ${params.hackathonTitle}.`,
    badgeText: "Teammate Joined",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  });

  const text = `Teammate Joined: ${params.teamName}\n\n` +
    `Hi ${params.leaderName},\n` +
    `${memberDisplay} has accepted your team invite for ${params.hackathonTitle}.\n\n` +
    `Manage your team here: ${params.teamRosterUrl}`;

  return { subject, html, text };
}

// =========================================================================
// 3. HACKATHON PARTICIPATION & CAMPUS RESTRICTIONS
// =========================================================================

/**
 * 3.1 Hackathon Registration Confirmation
 */
export function getHackathonRegistrationEmailTemplate(params: {
  userName: string;
  hackathonTitle: string;
  slug: string;
  startDate: string;
  isPrivate?: boolean;
  accessCode?: string;
  status?: "approved" | "pending" | "rejected";
}): GeneratedEmail {
  const hackathonUrl = `${BRAND_URL}/hackathons/${params.slug}`;
  const isPending = params.status === "pending";

  const subject = isPending
    ? `Registration Received: Pending Campus Verification for ${params.hackathonTitle} ⏳`
    : `Registration Confirmed: You're in for ${params.hackathonTitle}! 🎟️`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      ${isPending ? "Registration Received & Pending Verification ⏳" : "You're Officially Registered! 🎟️"}
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, ${
        isPending
          ? `your campus registration request for <strong>${escapeHtml(params.hackathonTitle)}</strong> has been received and is awaiting organizer review.`
          : `your registration for <strong>${escapeHtml(params.hackathonTitle)}</strong> has been confirmed.`
      }
    </p>

    ${
      isPending
        ? `
      <div style="background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #fde68a; line-height: 1.6;">
        🛡️ <strong>Campus Security Verification Notice:</strong> Because this is an exclusive private campus challenge, the event organizers review all registrations to ensure student eligibility. You will receive an instant confirmation email as soon as your access is verified.
      </div>
    `
        : ""
    }

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
            🚀 <strong>Status:</strong> ${isPending ? "⏳ Pending Organizer Verification" : "Active Participant"}
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${hackathonUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        View Challenge Hub &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: isPending
      ? `Your registration request for ${params.hackathonTitle} is pending campus verification.`
      : `You have successfully joined ${params.hackathonTitle}. Access challenge rules, schedule, and team formation now.`,
    badgeText: isPending ? "Pending Review" : "Confirmed Entry",
  });

  const text = `${isPending ? "Registration Received (Pending Review)" : "Registration Confirmed"}: ${params.hackathonTitle}\n\n` +
    `Hi ${params.userName},\n` +
    (isPending
      ? `Your registration for ${params.hackathonTitle} has been received and is pending verification by the campus organizers.\n`
      : `You are officially registered for ${params.hackathonTitle}.\n\n`) +
    `Challenge URL: ${hackathonUrl}\n\n` +
    `Best regards,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 3.1.1 Campus Registration Approved Notification
 */
export function getCampusRegistrationApprovedEmailTemplate(params: {
  userName: string;
  hackathonTitle: string;
  slug: string;
  organizerName?: string;
}): GeneratedEmail {
  const hackathonUrl = `${BRAND_URL}/hackathons/${params.slug}`;
  const subject = `Registration Approved: You're in for ${params.hackathonTitle}! 🎓`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">
      Campus Registration Approved! 🎓
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>,
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Great news! The event organizers ${params.organizerName ? `(${escapeHtml(params.organizerName)}) ` : ""}have verified and <strong>approved</strong> your registration for <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>
    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
      You now have full builder clearance to collaborate on teams, access competition resources, and submit your project builds.
    </p>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${hackathonUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        Access Challenge Hub & Submit Project &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your campus registration for ${params.hackathonTitle} has been verified and approved.`,
    badgeText: "Verified & Approved",
  });

  const text = `Registration Approved: ${params.hackathonTitle}\n\n` +
    `Hi ${params.userName},\n` +
    `Your campus registration for ${params.hackathonTitle} has been verified and approved by the event organizers.\n\n` +
    `Challenge URL: ${hackathonUrl}\n\n` +
    `Happy building!\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 3.2 Private Campus Hackathon VIP Invitation
 */
export function getPrivateCampusInviteEmailTemplate(params: {
  studentName?: string;
  hackathonTitle: string;
  organizerName: string;
  accessCode?: string;
  inviteLink: string;
  allowedDomains?: string[];
}): GeneratedEmail {
  const subject = `Private Campus Invite: You're invited to ${params.hackathonTitle} by ${params.organizerName} 🎓`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Campus Invitation: Exclusive Hackathon Access 🎓
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi ${params.studentName ? `<strong>${escapeHtml(params.studentName)}</strong>` : "Student"}, you have been invited by <strong>${escapeHtml(params.organizerName)}</strong> to participate in the private campus competition: <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <!-- Campus Security Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #1c1430, #130e24); border: 1px solid #7c3aed; border-radius: 14px; margin: 20px 0; padding: 20px;">
      <tr>
        <td>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #c084fc; letter-spacing: 0.5px; margin-bottom: 6px;">
            🔒 Restricted Campus Access
          </div>
          <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
            ${escapeHtml(params.hackathonTitle)}
          </div>

          <div style="font-size: 13px; line-height: 1.7; color: #cbd5e1;">
            ${params.accessCode ? `🔑 <strong>Secret Passcode:</strong> <code style="font-family: monospace; font-size: 14px; color: #e9d5ff; background: #3b0764; padding: 2px 8px; border-radius: 6px; font-weight: bold;">${escapeHtml(params.accessCode)}</code><br>` : ""}
            ${params.allowedDomains && params.allowedDomains.length > 0 ? `🏛️ <strong>Eligible College Domains:</strong> ${params.allowedDomains.map((d) => "@" + d).join(", ")}<br>` : ""}
            ✨ <strong>Special Entry:</strong> Your email was placed on the host's authorized student roster.
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
        Claim 1-Click Campus Pass &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: ${TEXT_MUTED}; text-align: center;">
      Direct invite link: <a href="${params.inviteLink}" style="color: #c084fc; word-break: break-all;">${params.inviteLink}</a>
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Exclusive campus access to ${params.hackathonTitle} hosted by ${params.organizerName}. Claim your spot.`,
    badgeText: "Campus VIP Invite",
    gradientStart: "#7c3aed",
    gradientEnd: "#a855f7",
  });

  const text = `Campus Invitation: ${params.hackathonTitle}\n\n` +
    `You are invited by ${params.organizerName} to participate.\n` +
    (params.accessCode ? `Passcode: ${params.accessCode}\n` : "") +
    `Register with 1-click link: ${params.inviteLink}\n\n` +
    `The Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 3.3 Hackathon Starting Soon (24h Reminder)
 */
export function getHackathonUpcomingReminderEmailTemplate(params: {
  userName: string;
  hackathonTitle: string;
  slug: string;
  hoursUntilStart?: number;
}): GeneratedEmail {
  const hackathonUrl = `${BRAND_URL}/hackathons/${params.slug}`;
  const hours = params.hoursUntilStart || 24;
  const subject = `Starting in ${hours} Hours: ${params.hackathonTitle} is about to kick off! ⏰`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      The Countdown is On! Starts in ${hours} Hours ⏰
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, get your editor and coffee ready! <strong>${escapeHtml(params.hackathonTitle)}</strong> officially starts in <strong>${hours} hours</strong>.
    </p>

    <!-- Checklist Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 18px 0; padding: 18px;">
      <tr>
        <td>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">Pre-Flight Checklist:</div>
          <div style="font-size: 13px; line-height: 1.8; color: #9ca3af;">
            🤝 <strong>Finalize Your Team:</strong> Send any remaining team invites before hacking starts.<br>
            📋 <strong>Review the Rubric:</strong> Read the judging criteria and sponsor bounties.<br>
            🛠️ <strong>Set Up Environment:</strong> Prepare your repo template and API keys.
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${hackathonUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        Open Hackathon Command Center &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Only ${hours} hours left until ${params.hackathonTitle} kicks off. Review the schedule and team roster.`,
    badgeText: "Starting Imminent",
    gradientStart: "#2563eb",
    gradientEnd: "#3b82f6",
  });

  const text = `${params.hackathonTitle} starts in ${hours} hours!\n\n` +
    `Hi ${params.userName},\n` +
    `Get ready to build! Check rules and team setup at: ${hackathonUrl}\n\n` +
    `Happy hacking!\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 3.4 Submission Deadline Warning (Urgent Alert)
 */
export function getSubmissionDeadlineWarningEmailTemplate(params: {
  userName: string;
  hackathonTitle: string;
  slug: string;
  hoursRemaining?: number;
}): GeneratedEmail {
  const submitUrl = `${BRAND_URL}/hackathons/${params.slug}/submit`;
  const hours = params.hoursRemaining || 6;
  const subject = `URGENT: ${hours} Hours Remaining to Submit Your Project for ${params.hackathonTitle}! 🚨`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ef4444; letter-spacing: -0.5px;">
      Submission Deadline Approaching! 🚨
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, the clock is ticking! You have only <strong>${hours} hours</strong> left to submit your project for <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <div style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px; line-height: 1.7; color: #fca5a5;">
      ⏰ <strong>Important:</strong> Late submissions will be rejected automatically by the scoring engine.<br>
      💾 <strong>Auto-Save is Active:</strong> You can submit now and continue editing your details until the deadline.<br>
      🎥 <strong>Include Your Demo:</strong> Ensure demo video links (YouTube/Loom) and public repo URLs are working!
    </div>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${submitUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
        Submit Your Project Now &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Only ${hours} hours remaining before submissions close for ${params.hackathonTitle}. Submit your project now.`,
    badgeText: "Deadline Alert",
    gradientStart: "#dc2626",
    gradientEnd: "#ef4444",
  });

  const text = `URGENT: ${hours} Hours Left to Submit for ${params.hackathonTitle}!\n\n` +
    `Hi ${params.userName},\n` +
    `Submit your build now at: ${submitUrl}\n` +
    `Late entries cannot be evaluated.`;

  return { subject, html, text };
}

// =========================================================================
// 4. PROJECT SUBMISSIONS & EVALUATION FEEDBACK
// =========================================================================

/**
 * 4.1 Project Submission Confirmation Receipt
 */
export function getProjectSubmittedEmailTemplate(params: {
  userName: string;
  projectTitle: string;
  hackathonTitle: string;
  projectId: string;
  demoUrl?: string;
  githubUrl?: string;
  teamMembers?: string[];
}): GeneratedEmail {
  const projectUrl = `${BRAND_URL}/projects/${params.projectId}`;
  const subject = `Project Submitted: "${params.projectTitle}" is officially in the ring! 🚀`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Project Submission Received! 🎉
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Congratulations <strong>${escapeHtml(params.userName)}</strong>! Your project <strong>&ldquo;${escapeHtml(params.projectTitle)}&rdquo;</strong> has been successfully submitted to <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 18px 0; padding: 18px; font-size: 13px; color: #9ca3af; line-height: 1.7;">
      <tr>
        <td style="width: 120px; font-weight: bold; color: #ffffff;">Project Title:</td>
        <td style="color: #e5e7eb; font-weight: bold;">${escapeHtml(params.projectTitle)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Hackathon:</td>
        <td style="color: #e5e7eb;">${escapeHtml(params.hackathonTitle)}</td>
      </tr>
      ${params.demoUrl ? `
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Live Demo:</td>
        <td><a href="${escapeHtml(params.demoUrl)}" style="color: ${PRIMARY_COLOR};">${escapeHtml(params.demoUrl)}</a></td>
      </tr>
      ` : ""}
      ${params.githubUrl ? `
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Repository:</td>
        <td><a href="${escapeHtml(params.githubUrl)}" style="color: ${PRIMARY_COLOR};">${escapeHtml(params.githubUrl)}</a></td>
      </tr>
      ` : ""}
      ${params.teamMembers && params.teamMembers.length > 0 ? `
      <tr>
        <td style="font-weight: bold; color: #ffffff;">Team Builders:</td>
        <td style="color: #cbd5e1;">${escapeHtml(params.teamMembers.join(", "))}</td>
      </tr>
      ` : ""}
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        View Project Showcase Page &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your project "${params.projectTitle}" has been received for ${params.hackathonTitle}.`,
    badgeText: "Submission Confirmed",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  });

  const text = `Project Submission Confirmed: ${params.projectTitle}\n\n` +
    `Your submission for ${params.hackathonTitle} has been recorded.\n` +
    `View entry: ${projectUrl}`;

  return { subject, html, text };
}

/**
 * 4.2 Scorecard & Evaluation Feedback Completed
 */
export function getProjectEvaluatedFeedbackEmailTemplate(params: {
  userName: string;
  projectTitle: string;
  hackathonTitle: string;
  projectId: string;
  feedbackNotes?: string;
  awardBadge?: string;
}): GeneratedEmail {
  const projectUrl = `${BRAND_URL}/projects/${params.projectId}`;
  const subject = `Judges Feedback: "${params.projectTitle}" has been evaluated! 📊`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Your Submission Has Been Evaluated! 📊
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, the technical judges have reviewed <strong>&ldquo;${escapeHtml(params.projectTitle)}&rdquo;</strong> in <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    ${params.awardBadge ? `
    <div style="background: linear-gradient(145deg, #2e1a05, #1d1003); border: 1px solid #d97706; border-radius: 12px; padding: 16px; margin: 18px 0; text-align: center;">
      <span style="font-size: 24px;">🏆</span>
      <div style="font-size: 16px; font-weight: 900; color: #fde68a; margin-top: 4px;">
        Award Distinction: ${escapeHtml(params.awardBadge)}
      </div>
    </div>
    ` : ""}

    ${params.feedbackNotes ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 18px 0; padding: 18px;">
      <tr>
        <td>
          <div style="font-size: 12px; font-weight: 700; color: #a5b4fc; margin-bottom: 6px;">Evaluation Notes:</div>
          <div style="font-size: 13px; line-height: 1.7; color: #cbd5e1; font-style: italic;">
            &ldquo;${escapeHtml(params.feedbackNotes)}&rdquo;
          </div>
        </td>
      </tr>
    </table>
    ` : ""}

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        Inspect Scorecard Details &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Judges have concluded their evaluation for your build "${params.projectTitle}".`,
    badgeText: "Scorecard Ready",
  });

  const text = `Scorecard Feedback: ${params.projectTitle}\n\n` +
    `Your submission for ${params.hackathonTitle} has been evaluated.\n` +
    (params.awardBadge ? `Award: ${params.awardBadge}\n` : "") +
    (params.feedbackNotes ? `Notes: "${params.feedbackNotes}"\n\n` : "") +
    `View project: ${projectUrl}`;

  return { subject, html, text };
}

/**
 * 4.3 Winners Announcement (Celebration Broadcast)
 */
export function getWinnersAnnouncementEmailTemplate(params: {
  hackathonTitle: string;
  slug: string;
  winners: Array<{ rank: number; title: string; team: string; prize: string }>;
  leaderboardUrl?: string;
}): GeneratedEmail {
  const leaderboardUrl = params.leaderboardUrl || `${BRAND_URL}/hackathons/${params.slug}?tab=submissions`;
  const subject = `Winners Announced: Congratulations to the champions of ${params.hackathonTitle}! 🏆`;

  const winnersListHtml = params.winners.map((w) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #1f2937;">
        <span style="font-size: 16px; font-weight: 900; color: ${w.rank === 1 ? '#fbbf24' : w.rank === 2 ? '#cbd5e1' : '#f97316'};">
          #${w.rank}
        </span>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #1f2937;">
        <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${escapeHtml(w.title)}</div>
        <div style="font-size: 12px; color: #9ca3af;">by ${escapeHtml(w.team)}</div>
      </td>
      <td align="right" style="padding: 10px 0; border-bottom: 1px solid #1f2937; font-weight: 800; font-size: 13px; color: #34d399;">
        ${escapeHtml(w.prize)}
      </td>
    </tr>
  `).join("");

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 36px;">🏆</span>
      <h1 style="margin: 8px 0 6px; font-size: 22px; font-weight: 900; color: #fbbf24; letter-spacing: -0.5px;">
        Hackathon Champions Crowned!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #d1d5db;">
        The judging panel has concluded scores for <strong>${escapeHtml(params.hackathonTitle)}</strong>.
      </p>
    </div>

    <!-- Winners Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 18px 0; padding: 16px;">
      ${winnersListHtml}
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${leaderboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
        View Official Leaderboard & Projects &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Announcing the winning projects and award distribution for ${params.hackathonTitle}.`,
    badgeText: "Winners Crowned",
    gradientStart: "#b45309",
    gradientEnd: "#f59e0b",
  });

  const text = `Winners Announced: ${params.hackathonTitle}!\n\n` +
    params.winners.map((w) => `#${w.rank}: ${w.title} (by ${w.team}) - Prize: ${w.prize}`).join("\n") +
    `\n\nFull leaderboard: ${leaderboardUrl}`;

  return { subject, html, text };
}

// =========================================================================
// 5. ROLE APPOINTMENTS & MULTI-TENANT PORTALS
// =========================================================================

/**
 * 5.1 Judge Appointment Email
 */
export function getJudgeInviteEmailTemplate(params: {
  judgeName: string;
  hackathonTitle: string;
  organizerName: string;
  portalUrl?: string;
}): GeneratedEmail {
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
    badgeText: "Judge Access",
    gradientStart: "#6d28d9",
    gradientEnd: "#8b5cf6",
  });

  const text = `Judging Appointment for ${params.hackathonTitle}\n\n` +
    `Dear ${params.judgeName},\n` +
    `You have been assigned as an evaluator by ${params.organizerName}.\n\n` +
    `Open Judges Portal: ${judgesUrl}\n\n` +
    `Thank you,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 5.2 Host Organizer Provisioning Email
 */
export function getOrganizerProvisionedEmailTemplate(params: {
  organizerName: string;
  email: string;
  portalUrl?: string;
}): GeneratedEmail {
  const portalUrl = params.portalUrl || `${BRAND_URL}/organizer`;
  const subject = `Organizer Workspace Activated: Welcome to Hack4Win Host Studio 🏢`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Host Organizer Workspace Activated 🏢
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.organizerName)}</strong>, your administrative host credentials have been activated on <strong>Hack4Win</strong>. You can now launch university and public competitions.
    </p>

    <!-- Features Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; margin: 18px 0; padding: 18px; font-size: 13px; line-height: 1.8; color: #9ca3af;">
      <tr>
        <td>
          🚀 <strong>Launch Competitions:</strong> Public challenges or private campus hackathons.<br>
          🔑 <strong>Access Control:</strong> College email domain whitelists and passcodes.<br>
          ⚖️ <strong>Judging Management:</strong> Invite judges and configure scorecard weights.<br>
          👥 <strong>Attendee Roster:</strong> Real-time student tracking and bulk email additions.
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
        Launch Host Studio Workspace &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your Hack4Win Host Organizer account is ready. Launch your first competition at ${portalUrl}.`,
    badgeText: "Organizer Portal",
  });

  const text = `Host Organizer Workspace Activated\n\n` +
    `Hi ${params.organizerName},\n` +
    `Your organizer privileges are active.\n` +
    `Portal: ${portalUrl}\n\n` +
    `The Hack4Win Team`;

  return { subject, html, text };
}

// =========================================================================
// 6. OPERATIONS, SUPPORT & MARKETING
// =========================================================================

/**
 * 6.1 Marketing Campaign & Platform Announcement Email
 */
export function getMarketingCampaignEmailTemplate(params: {
  subject: string;
  preheader?: string;
  contentMarkdownOrHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}): GeneratedEmail {
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
    badgeText: "Announcement",
  });

  const text = `${params.subject}\n\n` +
    `${stripHtml(params.contentMarkdownOrHtml)}\n\n` +
    (params.ctaUrl ? `Learn more: ${params.ctaUrl}\n\n` : "") +
    `Hack4Win: ${BRAND_URL}`;

  return { subject: params.subject, html, text };
}

/**
 * 6.2 Host Partnership Inquiry Email
 */
export function getHostInquiryEmailTemplate(params: {
  organizationName: string;
  contactName: string;
  email: string;
  timeline?: string;
  estimatedPrizePool?: string;
  eventGoals: string;
}): GeneratedEmail {
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
    badgeText: "Host Inquiry",
    gradientStart: "#1e3a8a",
    gradientEnd: "#3b82f6",
  });

  const text = `New Hackathon Partnership Inquiry\n\n` +
    `Organization: ${params.organizationName}\n` +
    `Contact: ${params.contactName} (${params.email})\n` +
    `Timeline: ${params.timeline || "Flexible"}\n` +
    `Goals: ${params.eventGoals}\n`;

  return { subject, html, text };
}

/**
 * 6.3 Direct Admin / Executive Message Template (1:1 to User)
 */
export function getDirectAdminMessageEmailTemplate(params: {
  recipientName: string;
  senderName?: string;
  subject: string;
  messageMarkdownOrHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  replyToEmail?: string;
}): GeneratedEmail {
  const senderDisplay = params.senderName || "Hack4Win Leadership Team";
  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      Message from ${escapeHtml(senderDisplay)} ✉️
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.recipientName)}</strong>,
    </p>
    <div style="background-color: #0d1322; border-left: 3px solid #6366f1; border-radius: 0 12px 12px 0; padding: 18px 20px; margin: 18px 0; font-size: 14px; line-height: 1.7; color: #e5e7eb;">
      ${params.messageMarkdownOrHtml}
    </div>
    ${params.ctaText && params.ctaUrl ? `
    <div style="text-align: center; margin: 26px 0 20px;">
      <a href="${params.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 13px 30px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
        ${escapeHtml(params.ctaText)} &rarr;
      </a>
    </div>
    ` : ""}
    <p style="margin: 20px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
      Warm regards,<br>
      <strong style="color: #ffffff;">${escapeHtml(senderDisplay)}</strong><br>
      Hack4Win Platform Administration
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Direct communication from ${senderDisplay}.`,
    badgeText: "Direct Message",
    gradientStart: "#4338ca",
    gradientEnd: "#6366f1",
  });

  const text = `Message from ${senderDisplay}\n\n` +
    `Hi ${params.recipientName},\n\n` +
    `${stripHtml(params.messageMarkdownOrHtml)}\n\n` +
    (params.ctaUrl ? `Action link: ${params.ctaUrl}\n\n` : "") +
    `Best regards,\n${senderDisplay}\nHack4Win`;

  return { subject: params.subject, html, text };
}

/**
 * 6.4 Prize Pool Payout & Cash Bounty Notice
 */
export function getPrizePayoutEmailTemplate(params: {
  winnerName: string;
  hackathonTitle: string;
  prizeAmount: string;
  awardTitle: string;
  claimUrl: string;
  claimDeadline?: string;
  paymentMethod?: string;
}): GeneratedEmail {
  const subject = `Prize Payout Alert: Claim your ${params.prizeAmount} bounty for ${params.hackathonTitle}! 💰`;

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 38px;">💰</span>
      <h1 style="margin: 8px 0 6px; font-size: 22px; font-weight: 900; color: #fbbf24; letter-spacing: -0.5px;">
        Prize Bounty Ready for Disbursement!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #d1d5db;">
        Congratulations <strong>${escapeHtml(params.winnerName)}</strong>! Your award for <strong>${escapeHtml(params.hackathonTitle)}</strong> is queued.
      </p>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #1f1903, #130f02); border: 1px solid #d97706; border-radius: 14px; margin: 20px 0; padding: 20px; text-align: center;">
      <tr>
        <td>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #fde68a; letter-spacing: 0.5px; margin-bottom: 4px;">
            ${escapeHtml(params.awardTitle)}
          </div>
          <div style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 8px;">
            ${escapeHtml(params.prizeAmount)}
          </div>
          <div style="font-size: 12px; color: #d1d5db;">
            ${params.paymentMethod ? `Payout Channel: <strong>${escapeHtml(params.paymentMethod)}</strong> &bull; ` : ""}
            ${params.claimDeadline ? `Claim Deadline: <strong>${escapeHtml(params.claimDeadline)}</strong>` : "Prompt processing recommended"}
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-size: 14px; font-weight: 800; padding: 14px 34px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
        Confirm Payout Credentials &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
      Need assistance with banking, invoice tax forms, or crypto addresses? Email us at <a href="mailto:support@hack4win.online" style="color: #fbbf24;">support@hack4win.online</a>.
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Claim your ${params.prizeAmount} prize for ${params.hackathonTitle}. Confirm your disbursement details.`,
    badgeText: "Prize Disbursement",
    gradientStart: "#b45309",
    gradientEnd: "#f59e0b",
  });

  const text = `Prize Payout Alert: ${params.prizeAmount}\n\n` +
    `Hi ${params.winnerName},\n` +
    `Your award for ${params.hackathonTitle} (${params.awardTitle}) is ready.\n` +
    `Amount: ${params.prizeAmount}\n` +
    `Claim details: ${params.claimUrl}\n\n` +
    `The Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 6.5 Verifiable Certificate of Completion / Achievement Template
 */
export function getCertificateAwardEmailTemplate(params: {
  recipientName: string;
  hackathonTitle: string;
  completionDate: string;
  certificateUrl: string;
  verificationId: string;
  shareUrl?: string;
}): GeneratedEmail {
  const subject = `Your Certificate is Ready: Congratulations on finishing ${params.hackathonTitle}! 🎓`;

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 38px;">🎓</span>
      <h1 style="margin: 8px 0 6px; font-size: 22px; font-weight: 900; color: #34d399; letter-spacing: -0.5px;">
        Certificate of Achievement Issued!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #d1d5db;">
        Honoring <strong>${escapeHtml(params.recipientName)}</strong> for participation in <strong>${escapeHtml(params.hackathonTitle)}</strong>.
      </p>
    </div>

    <!-- Certificate Chip Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #062b1a, #03180e); border: 1px solid #059669; border-radius: 14px; margin: 20px 0; padding: 20px; text-align: center;">
      <tr>
        <td>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #6ee7b7; letter-spacing: 0.5px; margin-bottom: 6px;">
            Verified Digital Credential
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
            ${escapeHtml(params.hackathonTitle)}
          </div>
          <div style="font-size: 12px; font-family: monospace; color: #a7f3d0; background: rgba(5, 150, 105, 0.25); display: inline-block; padding: 4px 12px; border-radius: 6px; margin-bottom: 6px;">
            ID: ${escapeHtml(params.verificationId)}
          </div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 6px;">
            Issued on ${escapeHtml(params.completionDate)} &bull; Permanently verifiable on Hack4Win
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.certificateUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        View & Download Certificate &rarr;
      </a>
    </div>

    ${params.shareUrl ? `
    <p style="margin: 16px 0 0; font-size: 13px; color: #9ca3af; text-align: center;">
      Add this credential to your <a href="${params.shareUrl}" style="color: #34d399; font-weight: bold;">LinkedIn profile or portfolio</a>!
    </p>
    ` : ""}
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your verifiable certificate of completion for ${params.hackathonTitle} is ready.`,
    badgeText: "Certificate Award",
    gradientStart: "#047857",
    gradientEnd: "#10b981",
  });

  const text = `Certificate Issued: ${params.hackathonTitle}\n\n` +
    `Congratulations ${params.recipientName}!\n` +
    `Credential ID: ${params.verificationId}\n` +
    `View certificate: ${params.certificateUrl}\n\n` +
    `The Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 6.6 Post-Hackathon Feedback & Survey Request Template
 */
export function getSurveyFeedbackEmailTemplate(params: {
  recipientName: string;
  hackathonTitle: string;
  surveyUrl: string;
  estimatedMinutes?: number;
  incentive?: string;
}): GeneratedEmail {
  const mins = params.estimatedMinutes || 3;
  const subject = `Your Thoughts? Help us improve: ${params.hackathonTitle} Feedback Survey 📋`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
      How Was Your Experience? 📋
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.recipientName)}</strong>, thank you for participating in <strong>${escapeHtml(params.hackathonTitle)}</strong>! We want to make the next edition even bigger and better for builders.
    </p>

    <div style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px; line-height: 1.8; color: #cbd5e1;">
      ⏱️ <strong>Quick & Easy:</strong> Takes only ~${mins} minutes.<br>
      💡 <strong>Direct Impact:</strong> Your suggestions shape future judging criteria, prize pools, and tracks.<br>
      ${params.incentive ? `🎁 <strong>Reward:</strong> Complete the survey to receive <em>${escapeHtml(params.incentive)}</em>.<br>` : ""}
    </div>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.surveyUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
        Take 3-Minute Survey &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Share your thoughts on ${params.hackathonTitle} in ~${mins} minutes.`,
    badgeText: "Feedback Survey",
    gradientStart: "#6366f1",
    gradientEnd: "#8b5cf6",
  });

  const text = `Hackathon Survey: ${params.hackathonTitle}\n\n` +
    `Hi ${params.recipientName},\n` +
    `Please take 3 minutes to share your thoughts:\n` +
    `${params.surveyUrl}\n\n` +
    `Thank you,\nThe Hack4Win Team`;

  return { subject, html, text };
}

/**
 * 6.7 Account / Community Guidelines Notice & Fair Play Alert
 */
export function getAccountWarningEmailTemplate(params: {
  userName: string;
  violationType: string;
  details: string;
  appealUrl?: string;
  deadlineHours?: number;
}): GeneratedEmail {
  const hours = params.deadlineHours || 48;
  const subject = `Notice Regarding Your Hack4Win Account: ${params.violationType} ⚠️`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ef4444; letter-spacing: -0.5px;">
      Community Guidelines & Compliance Notice ⚠️
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hello <strong>${escapeHtml(params.userName)}</strong>, our automated integrity systems or hackathon organizers have flagged an issue regarding your account activity.
    </p>

    <div style="background-color: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px; line-height: 1.7; color: #fca5a5;">
      🚨 <strong>Concern Identified:</strong> <span style="color: #ffffff; font-weight: bold;">${escapeHtml(params.violationType)}</span><br>
      📝 <strong>Details:</strong> ${escapeHtml(params.details)}<br>
      ⏳ <strong>Response Window:</strong> Please review and address within <strong>${hours} hours</strong> to prevent account restriction or submission disqualification.
    </div>

    ${params.appealUrl ? `
    <div style="text-align: center; margin: 26px 0 20px;">
      <a href="${params.appealUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 13px 30px; border-radius: 9999px; text-decoration: none;">
        Review Notice & Submit Clarification &rarr;
      </a>
    </div>
    ` : ""}

    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
      Questions regarding this notice? You can reply directly to <a href="mailto:support@hack4win.online" style="color: #f87171;">support@hack4win.online</a>.
    </p>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Important notice regarding your Hack4Win account: ${params.violationType}.`,
    badgeText: "Integrity Notice",
    gradientStart: "#b91c1c",
    gradientEnd: "#ef4444",
  });

  const text = `Account Notice: ${params.violationType}\n\n` +
    `Hi ${params.userName},\n` +
    `Issue: ${params.violationType}\n` +
    `Details: ${params.details}\n\n` +
    (params.appealUrl ? `Action link: ${params.appealUrl}\n\n` : "") +
    `Hack4Win Trust & Safety`;

  return { subject, html, text };
}

/**
 * 6.8 Project Approved & Qualified for Judging Template
 */
export function getProjectApprovedEmailTemplate(params: {
  userName: string;
  projectTitle: string;
  hackathonTitle: string;
  projectUrl: string;
  judgingStartsAt?: string;
}): GeneratedEmail {
  const subject = `Project Approved: "${params.projectTitle}" is qualified for judging in ${params.hackathonTitle}! ✅`;

  const content = `
    <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">
      Project Passed Eligibility Review! ✅
    </h1>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
      Hi <strong>${escapeHtml(params.userName)}</strong>, great news! Your project <strong>&ldquo;${escapeHtml(params.projectTitle)}&rdquo;</strong> has passed compliance screening and is officially approved for technical scoring in <strong>${escapeHtml(params.hackathonTitle)}</strong>.
    </p>

    <div style="background-color: #0d1322; border: 1px solid #1f2937; border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px; line-height: 1.8; color: #9ca3af;">
      🚀 <strong>Status:</strong> <span style="color: #34d399; font-weight: bold;">Verified & Approved</span><br>
      ⚖️ <strong>Evaluation:</strong> Assigned to industry judging panel.<br>
      ${params.judgingStartsAt ? `⏰ <strong>Judging Period Starts:</strong> ${escapeHtml(params.judgingStartsAt)}<br>` : ""}
      ⭐ <strong>Tip:</strong> Keep demo video links public throughout the entire evaluation period.
    </div>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${params.projectUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 30px; border-radius: 9999px; text-decoration: none;">
        View Verified Project Entry &rarr;
      </a>
    </div>
  `;

  const html = wrapInEmailLayout(content, {
    preheader: `Your project "${params.projectTitle}" is approved and qualified for judging in ${params.hackathonTitle}.`,
    badgeText: "Project Approved",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  });

  const text = `Project Approved: ${params.projectTitle}\n\n` +
    `Hi ${params.userName},\n` +
    `Your submission for ${params.hackathonTitle} has been approved for judging.\n` +
    `View entry: ${params.projectUrl}\n\n` +
    `The Hack4Win Team`;

  return { subject, html, text };
}

// =========================================================================
// TEMPLATE REGISTRY CATALOG (For UI & API Dispatching)
// =========================================================================

export const EMAIL_TEMPLATE_CATALOG = [
  { id: "welcome", name: "Welcome / Onboarding", category: "auth", sender: "welcome@hack4win.online" },
  { id: "password_reset", name: "Security OTP / Password Reset", category: "auth", sender: "request@hack4win.online" },
  { id: "team_invite", name: "Team Invitation", category: "teaming", sender: "notifications@hack4win.online" },
  { id: "team_accepted", name: "Team Invite Accepted", category: "teaming", sender: "notifications@hack4win.online" },
  { id: "registration", name: "Registration Confirmation", category: "hackathon", sender: "notifications@hack4win.online" },
  { id: "campus_invite", name: "Private Campus VIP Invite", category: "hackathon", sender: "welcome@hack4win.online" },
  { id: "upcoming_reminder", name: "Starting Soon (24h Reminder)", category: "hackathon", sender: "notifications@hack4win.online" },
  { id: "deadline_warning", name: "Deadline Approaching (Urgent)", category: "hackathon", sender: "notifications@hack4win.online" },
  { id: "project_submitted", name: "Project Submission Receipt", category: "submission", sender: "notifications@hack4win.online" },
  { id: "project_evaluated", name: "Judges Scorecard Feedback", category: "submission", sender: "request@hack4win.online" },
  { id: "winners_announced", name: "Winners Announcement", category: "marketing", sender: "news@hack4win.online" },
  { id: "judge_invite", name: "Judge Panel Appointment", category: "judging", sender: "request@hack4win.online" },
  { id: "organizer_provisioned", name: "Organizer Studio Activated", category: "judging", sender: "welcome@hack4win.online" },
  { id: "host_inquiry", name: "Host Partnership Inquiry", category: "support", sender: "support@hack4win.online" },
  { id: "campaign", name: "Platform Broadcast Campaign", category: "marketing", sender: "news@hack4win.online" },
  { id: "direct_message", name: "Direct Message from Admin / Leadership", category: "support", sender: "support@hack4win.online" },
  { id: "prize_payout", name: "Prize Bounty Payout & Disbursement", category: "hackathon", sender: "notifications@hack4win.online" },
  { id: "certificate_award", name: "Certificate of Achievement Credential", category: "hackathon", sender: "welcome@hack4win.online" },
  { id: "survey_feedback", name: "Post-Event Survey & Builder Feedback", category: "marketing", sender: "news@hack4win.online" },
  { id: "account_warning", name: "Account Notice & Fair Play Alert", category: "auth", sender: "request@hack4win.online" },
  { id: "project_approved", name: "Project Approved for Judging Round", category: "submission", sender: "notifications@hack4win.online" },
] as const;

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
