import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  brevoService,
  HACK4WIN_SENDERS,
  analyzeBrevoError,
  sendEmail,
  verifySmtpConnection,
  verifyApiConnection,
  verifyEmailService,
} from "../src/lib/email/brevo-service.ts";
import {
  getWelcomeEmailTemplate,
  getPasswordResetOtpEmailTemplate,
  getTeamInviteEmailTemplate,
  getTeamInviteAcceptedEmailTemplate,
  getHackathonRegistrationEmailTemplate,
  getPrivateCampusInviteEmailTemplate,
  getHackathonUpcomingReminderEmailTemplate,
  getSubmissionDeadlineWarningEmailTemplate,
  getProjectSubmittedEmailTemplate,
  getProjectEvaluatedFeedbackEmailTemplate,
  getWinnersAnnouncementEmailTemplate,
  getJudgeInviteEmailTemplate,
  getOrganizerProvisionedEmailTemplate,
  getHostInquiryEmailTemplate,
  getMarketingCampaignEmailTemplate,
  EMAIL_TEMPLATE_CATALOG,
  wrapInEmailLayout,
} from "../src/lib/email/templates.ts";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const ADMIN_TOKEN = "e2e_brevo_admin_tok_" + Date.now();
const USER_TOKEN = "e2e_brevo_user_tok_" + Date.now();

let adminId = "";
let userId = "";

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${role === "user" ? null : username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, username = COALESCE(EXCLUDED.username, public.users.username);
  `;
  return id;
}

before(async () => {
  adminId = await createActor("admin", "Brevo Admin Tester", `brevo_admin_${Date.now()}@hack4win.online`);
  userId = await createActor("user", "Brevo Builder Tester", `brevo_user_${Date.now()}@hack4win.online`);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
    VALUES 
      (${crypto.randomUUID()}::uuid, ${adminId}::uuid, ${ADMIN_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${userId}::uuid, ${USER_TOKEN}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (token) DO NOTHING;
  `;
});

after(async () => {
  await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${USER_TOKEN})`;
  if (adminId && userId) {
    await sql`DELETE FROM public.users WHERE id IN (${adminId}, ${userId})`;
    await sql`DELETE FROM neon_auth.user WHERE id IN (${adminId}::uuid, ${userId}::uuid)`;
  }
});

describe("1. Brevo Sender Identities & Configuration", () => {
  test("All 5 verified Hack4Win senders on domain hack4win.online are configured", () => {
    assert.equal(HACK4WIN_SENDERS.NEWS.email, "news@hack4win.online");
    assert.equal(HACK4WIN_SENDERS.REQUESTS.email, "request@hack4win.online");
    assert.equal(HACK4WIN_SENDERS.WELCOME.email, "welcome@hack4win.online");
    assert.equal(HACK4WIN_SENDERS.NOTIFICATIONS.email, "notifications@hack4win.online");
    assert.equal(HACK4WIN_SENDERS.SUPPORT.email, "support@hack4win.online");
  });
});

describe("2. Brevo IP Restriction Analysis (525 / Unrecognised IP)", () => {
  test("analyzeBrevoError correctly diagnoses 525 Unauthorized IP address", () => {
    const error525 = new Error("Invalid login: 525 5.7.1 Unauthorized IP address");
    const analysis = analyzeBrevoError(error525);
    assert.equal(analysis.isIpRestricted, true);
    assert.equal(analysis.guidanceUrl, "https://app.brevo.com/security/authorised_ips");
    assert.ok(analysis.guidanceMessage?.includes("Brevo IP Security Restriction"));
  });

  test("analyzeBrevoError extracts IP and generates guidance for REST API unrecognised IP message", () => {
    const apiMsg = "We have detected you are using an unrecognised IP address 103.31.41.184. If you performed this action make sure to add the new IP address in this link: https://app.brevo.com/security/authorised_ips";
    const analysis = analyzeBrevoError(apiMsg);
    assert.equal(analysis.isIpRestricted, true);
    assert.equal(analysis.detectedIp, "103.31.41.184");
    assert.equal(analysis.guidanceUrl, "https://app.brevo.com/security/authorised_ips");
  });

  test("analyzeBrevoError returns isIpRestricted=false for standard validation errors", () => {
    const regularError = new Error("Missing recipient email parameter");
    const analysis = analyzeBrevoError(regularError);
    assert.equal(analysis.isIpRestricted, false);
  });
});

describe("3. Email Templates Generator", () => {
  test("Welcome template generates personalized HTML with brand header and CTA", () => {
    const t = getWelcomeEmailTemplate({
      name: "Alex",
      email: "alex@hack4win.online",
      username: "alexdev",
    });
    assert.ok(t.subject.includes("Welcome to Hack4Win, Alex!"));
    assert.ok(t.html.includes("Hack4Win"));
    assert.ok(t.html.includes("/u/alexdev"));
    assert.ok(t.text.includes("Welcome to Hack4Win"));
  });

  test("Password reset OTP template generates verification code box and expiry warning", () => {
    const t = getPasswordResetOtpEmailTemplate({
      name: "Elena",
      otpCode: "482910",
      resetUrl: "https://hack4win.online/reset-password?code=482910",
      expiresInMinutes: 15,
    });
    assert.ok(t.subject.includes("482910"));
    assert.ok(t.html.includes("482910"));
    assert.ok(t.html.includes("15 minutes"));
    assert.ok(t.text.includes("482910"));
  });

  test("Team invitation template includes team name, role, message, and accept URL", () => {
    const t = getTeamInviteEmailTemplate({
      senderName: "Sarah",
      receiverName: "David",
      hackathonTitle: "AI Champions 2026",
      teamName: "Quantum Leap",
      role: "Backend Architect",
      acceptUrl: "https://hack4win.online/team-invites/xyz?action=accept",
      message: "Join us to win 1st prize!",
    });
    assert.ok(t.subject.includes("Quantum Leap"));
    assert.ok(t.html.includes("Quantum Leap"));
    assert.ok(t.html.includes("Backend Architect"));
    assert.ok(t.html.includes("Join us to win 1st prize!"));
    assert.ok(t.html.includes("https://hack4win.online/team-invites/xyz?action=accept"));
  });

  test("Team invite accepted template includes teammate name, team name, and roster link", () => {
    const t = getTeamInviteAcceptedEmailTemplate({
      leaderName: "Marcus",
      memberEmail: "dev@hack4win.online",
      memberName: "Devon",
      teamName: "Neural Forge",
      hackathonTitle: "Global AI Hack 2026",
      teamRosterUrl: "https://hack4win.online/hackathons/global-ai/team",
    });
    assert.ok(t.subject.includes("Neural Forge"));
    assert.ok(t.html.includes("Neural Forge"));
    assert.ok(t.html.includes("Devon"));
    assert.ok(t.html.includes("View Team Workspace"));
  });

  test("Hackathon registration confirmation template includes slug and start date", () => {
    const t = getHackathonRegistrationEmailTemplate({
      userName: "Alice",
      hackathonTitle: "Web3 World Cup",
      slug: "web3-cup",
      startDate: "2026-11-01T00:00:00Z",
      isPrivate: true,
      accessCode: "CAMPUS99",
    });
    assert.ok(t.subject.includes("Web3 World Cup"));
    assert.ok(t.html.includes("web3-cup"));
    assert.ok(t.html.includes("CAMPUS99"));
  });

  test("Private campus invite template includes passcode, restricted campus badge, and 1-click link", () => {
    const t = getPrivateCampusInviteEmailTemplate({
      studentName: "Liam",
      hackathonTitle: "MIT Collegiate Hack",
      organizerName: "Prof. Sanders",
      accessCode: "VIP-MIT-2026",
      inviteLink: "https://hack4win.online/hackathons/mit-hack?token=vip123",
      allowedDomains: ["mit.edu", "alumni.mit.edu"],
    });
    assert.ok(t.subject.includes("MIT Collegiate Hack"));
    assert.ok(t.html.includes("VIP-MIT-2026"));
    assert.ok(t.html.includes("@mit.edu"));
    assert.ok(t.html.includes("Claim 1-Click Campus Pass"));
  });

  test("Upcoming reminder template includes countdown hours and checklist", () => {
    const t = getHackathonUpcomingReminderEmailTemplate({
      userName: "Sophia",
      hackathonTitle: "GreenTech Sprint",
      slug: "greentech",
      hoursUntilStart: 24,
    });
    assert.ok(t.subject.includes("24 Hours"));
    assert.ok(t.html.includes("Pre-Flight Checklist"));
    assert.ok(t.html.includes("GreenTech Sprint"));
  });

  test("Submission deadline warning template includes urgency styling and submit CTA", () => {
    const t = getSubmissionDeadlineWarningEmailTemplate({
      userName: "Leo",
      hackathonTitle: "FinTech Hack",
      slug: "fintech-hack",
      hoursRemaining: 6,
    });
    assert.ok(t.subject.includes("6 Hours Remaining"));
    assert.ok(t.html.includes("Submission Deadline Approaching"));
    assert.ok(t.html.includes("Submit Your Project Now"));
  });

  test("Project submitted receipt template includes project title, links, and member list", () => {
    const t = getProjectSubmittedEmailTemplate({
      userName: "Chloe",
      projectTitle: "SolarPulse AI",
      hackathonTitle: "Climate Tech 2026",
      projectId: "proj_999",
      demoUrl: "https://solarpulse.app",
      githubUrl: "https://github.com/solarpulse",
      teamMembers: ["Chloe", "Zack", "Maya"],
    });
    assert.ok(t.subject.includes("SolarPulse AI"));
    assert.ok(t.html.includes("SolarPulse AI"));
    assert.ok(t.html.includes("Climate Tech 2026"));
    assert.ok(t.html.includes("solarpulse.app"));
    assert.ok(t.html.includes("Zack"));
  });

  test("Project evaluated feedback template includes judge notes and award badge", () => {
    const t = getProjectEvaluatedFeedbackEmailTemplate({
      userName: "Lucas",
      projectTitle: "OmniSearch",
      hackathonTitle: "Search Hack 2026",
      projectId: "proj_omni",
      feedbackNotes: "Exceptional architecture and clean UI execution.",
      awardBadge: "Best Technical Implementation",
    });
    assert.ok(t.subject.includes("OmniSearch"));
    assert.ok(t.html.includes("Best Technical Implementation"));
    assert.ok(t.html.includes("Exceptional architecture and clean UI"));
  });

  test("Winners announcement template includes ranked winners podium and prize amounts", () => {
    const t = getWinnersAnnouncementEmailTemplate({
      hackathonTitle: "Global Health Challenge",
      slug: "health-challenge",
      winners: [
        { rank: 1, title: "CardioScan", team: "HeartTech", prize: "$10,000" },
        { rank: 2, title: "NeuroTrack", team: "BrainWorks", prize: "$5,000" },
      ],
    });
    assert.ok(t.subject.includes("Global Health Challenge"));
    assert.ok(t.html.includes("CardioScan"));
    assert.ok(t.html.includes("HeartTech"));
    assert.ok(t.html.includes("$10,000"));
  });

  test("Judge appointment template includes portal access link", () => {
    const t = getJudgeInviteEmailTemplate({
      judgeName: "Dr. Evelyn",
      hackathonTitle: "Autonomous Agent Challenge",
      organizerName: "AI Institute",
    });
    assert.ok(t.subject.includes("Autonomous Agent Challenge"));
    assert.ok(t.html.includes("Open Judges Evaluation Portal"));
  });

  test("Organizer provisioned template includes workspace onboarding and portal link", () => {
    const t = getOrganizerProvisionedEmailTemplate({
      organizerName: "Stanford ACM",
      email: "acm@stanford.edu",
      portalUrl: "https://hack4win.online/organizer",
    });
    assert.ok(t.subject.includes("Organizer Workspace Activated"));
    assert.ok(t.html.includes("Stanford ACM"));
    assert.ok(t.html.includes("Launch Host Studio Workspace"));
  });

  test("Host inquiry template renders partner details and prize pool goals", () => {
    const t = getHostInquiryEmailTemplate({
      organizationName: "Venture Labs",
      contactName: "Sarah Connor",
      email: "sarah@venturelabs.io",
      timeline: "Q4 2026",
      estimatedPrizePool: "$50,000",
      eventGoals: "Recruit top AI researchers and build open source tooling.",
    });
    assert.ok(t.subject.includes("Venture Labs"));
    assert.ok(t.html.includes("Sarah Connor"));
    assert.ok(t.html.includes("$50,000"));
    assert.ok(t.html.includes("Recruit top AI researchers"));
  });

  test("Marketing campaign template includes compliant CAN-SPAM unsubscribe footer", () => {
    const t = getMarketingCampaignEmailTemplate({
      subject: "Hack4Win Fall 2026 Hackathons are Live!",
      preheader: "Over $100k in cash bounties waiting for builders.",
      contentMarkdownOrHtml: "<p>Check out the latest university competitions.</p>",
      ctaText: "Browse Challenges",
      ctaUrl: "https://hack4win.online/hackathons",
    });
    assert.ok(t.html.includes("Unsubscribe or manage email preferences"));
    assert.ok(t.html.includes("Browse Challenges"));
  });

  test("EMAIL_TEMPLATE_CATALOG contains 15 registered templates with verified senders", () => {
    assert.equal(EMAIL_TEMPLATE_CATALOG.length, 15);
    const ids = EMAIL_TEMPLATE_CATALOG.map((c) => c.id);
    assert.ok(ids.includes("welcome"));
    assert.ok(ids.includes("password_reset"));
    assert.ok(ids.includes("team_invite"));
    assert.ok(ids.includes("team_accepted"));
    assert.ok(ids.includes("registration"));
    assert.ok(ids.includes("campus_invite"));
    assert.ok(ids.includes("upcoming_reminder"));
    assert.ok(ids.includes("deadline_warning"));
    assert.ok(ids.includes("project_submitted"));
    assert.ok(ids.includes("project_evaluated"));
    assert.ok(ids.includes("winners_announced"));
    assert.ok(ids.includes("judge_invite"));
    assert.ok(ids.includes("organizer_provisioned"));
    assert.ok(ids.includes("host_inquiry"));
    assert.ok(ids.includes("campaign"));
  });
});

describe("4. Brevo Service Dispatcher & Fallback Mechanism", () => {
  test("sendEmail sends transactional email or gracefully handles IP restriction", async () => {
    const result = await brevoService.sendEmail({
      to: [{ email: "test_recipient@hack4win.online", name: "Tester" }],
      subject: "Test Transactional Dispatch",
      htmlContent: "<p>This is a test notification</p>",
      sender: HACK4WIN_SENDERS.NOTIFICATIONS,
      engine: "auto",
    });

    assert.equal(result.success, true);
    assert.ok(["brevo_api", "brevo_smtp", "simulated"].includes(result.engineUsed));
  });

  test("verifyEmailService reports health and diagnoses IP restriction", async () => {
    const health = await brevoService.verifyEmailService();
    assert.ok(["connected", "ip_restricted", "error"].includes(health.status));
    assert.ok(typeof health.isIpRestricted === "boolean");
    assert.equal(health.guidanceUrl, "https://app.brevo.com/security/authorised_ips");
  });
});

describe("5. Brevo API Endpoints (/api/email/send & /api/email/verify)", () => {
  test("POST /api/email/send rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "someone@hack4win.online",
        subject: "Unauthorized test",
        htmlContent: "<p>Hi</p>",
      }),
    });
    assert.equal(res.status, 401);
  });

  test("POST /api/email/send rejects marketing campaign requests from non-admin with 403", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({
        to: "audience@hack4win.online",
        subject: "Spam attempt",
        htmlContent: "<p>Promo</p>",
        isCampaign: true,
      }),
    });
    assert.equal(res.status, 403);
  });

  test("POST /api/email/send accepts transactional template email for authenticated user", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({
        to: "builder@hack4win.online",
        template: "welcome",
        templateData: { name: "Test Builder" },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.messageId);
  });

  test("POST /api/email/send dispatches campus_invite template", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({
        to: "student@harvard.edu",
        template: "campus_invite",
        templateData: {
          studentName: "Harvard Hacker",
          hackathonTitle: "Ivy League Hackathon",
          accessCode: "IVY2026",
          inviteLink: "https://hack4win.online/hackathons/ivy-hack?token=abc",
        },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.messageId);
  });

  test("POST /api/email/send dispatches project_submitted template", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({
        to: "creator@hack4win.online",
        template: "project_submitted",
        templateData: {
          userName: "Creator",
          projectTitle: "NeuroGrid",
          hackathonTitle: "Neural Challenge",
          projectId: "ng_123",
          demoUrl: "https://neurogrid.io",
        },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.messageId);
  });

  test("POST /api/email/send allows admin to dispatch winners_announced template", async () => {
    const res = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        to: ["participant1@hack4win.online", "participant2@hack4win.online"],
        template: "winners_announced",
        templateData: {
          hackathonTitle: "Grand Prix 2026",
          slug: "grand-prix-2026",
          winners: [{ rank: 1, title: "SpeedAI", team: "FastTrack", prize: "$20,000" }],
        },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.recipientCount, 2);
  });

  test("GET /api/email/verify rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${BASE_URL}/api/email/verify`);
    assert.equal(res.status, 401);
  });

  test("GET /api/email/verify rejects regular user with 403", async () => {
    const res = await fetch(`${BASE_URL}/api/email/verify`, {
      headers: { Cookie: `neon-auth.session_token=${USER_TOKEN}` },
    });
    assert.equal(res.status, 403);
  });

  test("GET /api/email/verify returns Brevo health diagnostics for Administrator", async () => {
    const res = await fetch(`${BASE_URL}/api/email/verify`, {
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(["connected", "ip_restricted", "error"].includes(data.status));
    assert.ok(Array.isArray(data.verifiedSenders));
    assert.equal(data.guidanceUrl, "https://app.brevo.com/security/authorised_ips");
  });
});
