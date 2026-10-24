import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { resetRateLimitKey } from "../src/lib/rate-limit.ts";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const ADMIN_TOKEN = "sec_test_admin_tok_" + Date.now();
const ORG1_TOKEN = "sec_test_org1_tok_" + Date.now();
const ORG2_TOKEN = "sec_test_org2_tok_" + Date.now();
const BUILDER_TOKEN = "sec_test_builder_tok_" + Date.now();

let adminId = "";
let org1Id = "";
let org2Id = "";
let builderId = "";

let hackathon1Id = "";
let hackathon1Slug = "";
let privateHackathonId = "";
let privateHackathonSlug = "";

async function api(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", token = null, body, headers: customHeaders = {} } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  if (token) {
    headers["Cookie"] = `neon-auth.session_token=${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Ignore JSON parse errors for empty or HTML responses
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${role === "user" ? null : username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  `;
  return id;
}

before(async () => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  adminId = await createActor("admin", "Admin Auditor", `sec_admin_${Date.now()}@h4w.security`);
  org1Id = await createActor("organizer", "Host Alpha", `sec_org1_${Date.now()}@h4w.security`);
  org2Id = await createActor("organizer", "Host Beta (Competitor)", `sec_org2_${Date.now()}@h4w.security`);
  builderId = await createActor("user", "Builder Charlie", `sec_builder_${Date.now()}@h4w.security`);

  await sql`
    INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
    VALUES 
      (${crypto.randomUUID()}::uuid, ${adminId}::uuid, ${ADMIN_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${org1Id}::uuid, ${ORG1_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${org2Id}::uuid, ${ORG2_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${builderId}::uuid, ${BUILDER_TOKEN}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (token) DO NOTHING;
  `;
});

after(async () => {
  if (hackathon1Id) {
    await sql`DELETE FROM public.hackathons WHERE id = ${hackathon1Id}::uuid`;
  }
  if (privateHackathonId) {
    await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${privateHackathonId}::uuid`;
    await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${privateHackathonId}::uuid`;
    await sql`DELETE FROM public.hackathons WHERE id = ${privateHackathonId}::uuid`;
  }
  await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${ORG1_TOKEN}, ${ORG2_TOKEN}, ${BUILDER_TOKEN})`;
  if (adminId && org1Id && org2Id && builderId) {
    await sql`DELETE FROM public.users WHERE id IN (${adminId}, ${org1Id}, ${org2Id}, ${builderId})`;
    await sql`DELETE FROM neon_auth.user WHERE id IN (${adminId}::uuid, ${org1Id}::uuid, ${org2Id}::uuid, ${builderId}::uuid)`;
  }
});

describe("Security Fix 1: IDOR Prevention in Hackathon Management (/api/admin/hackathons/[id])", () => {
  test("Org1 creates a competition; Org2 cannot view, edit, or delete it", async () => {
    hackathon1Slug = `sec-hackathon-${Date.now()}`;
    const start = new Date(Date.now() - 3600000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();

    // Org1 creates Hackathon 1
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ORG1_TOKEN,
      body: {
        title: "Alpha Tech Sprint 2026",
        slug: hackathon1Slug,
        tagline: "Top tier security & reliability sprint",
        description: "Official Hack4Win internal competition.",
        prize_pool: "₹1,00,000",
        currency: "₹",
        format: "online",
        start_date: start,
        end_date: end,
        submission_deadline: end,
        max_participants: 100,
        tags: ["Security", "Rust"],
      },
    });

    assert.equal(createRes.status, 201, "Hackathon creation should succeed for Org1");
    hackathon1Id = createRes.data.hackathon.id;

    // Org2 attempts to GET Hackathon 1 details via admin endpoint
    const org2Get = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "GET",
      token: ORG2_TOKEN,
    });
    assert.equal(org2Get.status, 403, "Org2 must receive 403 Forbidden when accessing Org1's hackathon");
    assert.match(org2Get.data.error, /only view details for hackathons you organize/i);

    // Org2 attempts to PATCH Hackathon 1 details
    const org2Patch = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "PATCH",
      token: ORG2_TOKEN,
      body: {
        title: "Hacked by Competitor Beta",
      },
    });
    assert.equal(org2Patch.status, 403, "Org2 must receive 403 Forbidden when attempting to modify Org1's hackathon");
    assert.match(org2Patch.data.error, /only edit hackathons you organize/i);

    // Org2 attempts to DELETE Hackathon 1
    const org2Delete = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "DELETE",
      token: ORG2_TOKEN,
    });
    assert.equal(org2Delete.status, 403, "Org2 must receive 403 Forbidden when attempting to delete Org1's hackathon");
    assert.match(org2Delete.data.error, /only delete hackathons you organize/i);

    // Org1 (owner) CAN view and edit Hackathon 1
    const org1Get = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "GET",
      token: ORG1_TOKEN,
    });
    assert.equal(org1Get.status, 200, "Org1 should be able to view their own hackathon");
    assert.equal(org1Get.data.hackathon.title, "Alpha Tech Sprint 2026");

    const org1Patch = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "PATCH",
      token: ORG1_TOKEN,
      body: {
        title: "Alpha Tech Sprint 2026 - Verified",
      },
    });
    assert.equal(org1Patch.status, 200, "Org1 should be able to update their own hackathon");

    // Super Admin CAN view and edit any hackathon
    const adminGet = await api(`/api/admin/hackathons/${hackathon1Id}`, {
      method: "GET",
      token: ADMIN_TOKEN,
    });
    assert.equal(adminGet.status, 200, "Super admin can view any hackathon");
  });
});

describe("Security Fix 2: Private Hackathon Bypass Prevention via Submissions", () => {
  test("Unregistered user cannot bypass private hackathon gate via direct submission", async () => {
    privateHackathonSlug = `sec-private-${Date.now()}`;
    const start = new Date(Date.now() - 3600000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();

    // Create a private hackathon requiring access code "CAMPUS2026"
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ORG1_TOKEN,
      body: {
        title: "Private Campus Elite Hackathon",
        slug: privateHackathonSlug,
        tagline: "Exclusive private tournament",
        description: "Restricted entry challenge.",
        prize_pool: "$10,000",
        currency: "$",
        format: "online",
        start_date: start,
        end_date: end,
        submission_deadline: end,
        is_private: true,
        access_code: "CAMPUS2026",
      },
    });

    assert.equal(createRes.status, 201);
    privateHackathonId = createRes.data.hackathon.id;

    // Builder attempts to directly submit project WITHOUT access code or prior registration
    const directSubmitFail = await api(`/api/hackathons/${privateHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Bypassing Project Payload",
        description: "Attempting to circumvent private campus registration requirement.",
        demo_url: "https://demo.h4w.io",
        github_url: "https://github.com/h4w/sec",
        video_url: "https://youtube.com/watch?v=12345",
        cover_image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
      },
    });

    assert.equal(directSubmitFail.status, 403, "Direct submission without credentials must be blocked with 403");
    assert.match(directSubmitFail.data.error, /private hackathon/i);

    // Builder supplies the valid access code in submission body -> Auto-registration holds entry in pending verification
    const directSubmitPending = await api(`/api/hackathons/${privateHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Verified Student Project",
        description: "Legitimate submission with correct access code credentials.",
        demo_url: "https://demo.h4w.io",
        github_url: "https://github.com/h4w/sec",
        video_url: "https://youtube.com/watch?v=12345",
        cover_image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
        access_code: "CAMPUS2026",
      },
    });

    assert.equal(directSubmitPending.status, 403, "Direct submission with campus code must be held pending organizer verification");
    assert.equal(directSubmitPending.data.registration_status, "pending");

    // Organizer verifies and approves the builder's registration
    const approveRes = await api(`/api/organizer/hackathons/${privateHackathonId}/students`, {
      method: "POST",
      token: ORG1_TOKEN,
      body: {
        action: "approve_student",
        student_user_id: builderId,
      },
    });
    assert.equal(approveRes.status, 200, "Organizer should approve student");

    // Once approved by organizer, builder can successfully submit project
    const directSubmitSuccess = await api(`/api/hackathons/${privateHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Verified Student Project",
        description: "Legitimate submission with correct access code credentials.",
        demo_url: "https://demo.h4w.io",
        github_url: "https://github.com/h4w/sec",
        video_url: "https://youtube.com/watch?v=12345",
        cover_image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
      },
    });

    assert.equal(directSubmitSuccess.status, 200, "Submission after organizer approval must succeed");
    assert.equal(directSubmitSuccess.data.success, true);
  });
});

describe("Security Fix 3: Host Inquiry Input Bounds & Abuse Prevention (/api/host/inquiry)", () => {
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

  test("Rejects excessively long organization names (> 100 characters)", async () => {
    const res = await api("/api/host/inquiry", {
      method: "POST",
      headers: { "x-forwarded-for": testIp },
      body: {
        organizationName: "A".repeat(101),
        contactName: "John Doe",
        email: "host@company.com",
        eventGoals: "We want to host a global university hackathon with 500 builders.",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /Organization name cannot exceed 100 characters/i);
  });

  test("Rejects excessively long event goals (> 2,000 characters)", async () => {
    const res = await api("/api/host/inquiry", {
      method: "POST",
      headers: { "x-forwarded-for": testIp },
      body: {
        organizationName: "Acme Corp",
        contactName: "John Doe",
        email: "host@company.com",
        eventGoals: "G".repeat(2001),
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /Event goals description cannot exceed 2,000 characters/i);
  });

  test("Rate limiting stops spamming inquiries after limit exceeded", async () => {
    const spammerIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

    // Send 5 valid requests
    for (let i = 0; i < 5; i++) {
      const res = await api("/api/host/inquiry", {
        method: "POST",
        headers: { "x-forwarded-for": spammerIp },
        body: {
          organizationName: `Partner ${i}`,
          contactName: "Pat Doe",
          email: `partner${i}@org.com`,
          eventGoals: "Host a community challenge with real prize pool.",
        },
      });
      assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
    }

    // 6th request within window must be rate limited with HTTP 429
    const rateLimitedRes = await api("/api/host/inquiry", {
      method: "POST",
      headers: { "x-forwarded-for": spammerIp },
      body: {
        organizationName: "Spammer Corp",
        contactName: "Bot",
        email: "bot@spam.com",
        eventGoals: "Flooding with repetitive inquiries.",
      },
    });

    assert.equal(rateLimitedRes.status, 429, "6th request should return 429 Too Many Requests");
    assert.match(rateLimitedRes.data.error, /Too many inquiries/i);
  });
});

describe("Security Fix 4: Unauthorized Email Dispatch & Spoofing Prevention (/api/email/send)", () => {
  before(() => {
    resetRateLimitKey(`email_send:${builderId}`);
  });

  test("Non-admin user cannot send arbitrary custom HTML content", async () => {
    const res = await api("/api/email/send", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        to: "victim@target.com",
        subject: "Urgent Phishing Simulation",
        htmlContent: "<h1>Your account is compromised. Click here to verify password.</h1>",
      },
    });

    assert.equal(res.status, 403, "Non-admin must be forbidden from sending custom HTML");
    assert.match(res.data.error, /Only platform administrators can send custom HTML/i);
  });

  test("Non-admin user cannot dispatch administrator-only templates", async () => {
    const res = await api("/api/email/send", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        to: "victim@target.com",
        template: "account_warning",
        templateData: {
          userName: "Victim User",
          violationType: "Suspended",
          details: "Fake suspension notice",
        },
      },
    });

    assert.equal(res.status, 403, "Non-admin must be forbidden from using account_warning template");
    assert.match(res.data.error, /Administrator privileges required/i);
  });

  test("Non-admin user cannot spoof sender headers", async () => {
    const res = await api("/api/email/send", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        to: "victim@target.com",
        template: "welcome",
        sender: { name: "CEO of Hack4Win", email: "ceo@hack4win.online" },
      },
    });

    assert.equal(res.status, 403, "Non-admin must not override sender headers");
    assert.match(res.data.error, /cannot override sender headers/i);
  });

  test("Regular builder cannot send to multiple recipients at once", async () => {
    const res = await api("/api/email/send", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        to: ["target1@victim.com", "target2@victim.com"],
        template: "welcome",
      },
    });

    assert.equal(res.status, 403, "Regular users cannot send bulk emails");
    assert.match(res.data.error, /at most 1 recipient/i);
  });
});

describe("Security Fix 5: User Profile Field Bounds & Validation (/api/user/profile)", () => {
  test("Rejects profile update with bio exceeding 2,000 characters", async () => {
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        bio: "B".repeat(2001),
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /Bio cannot exceed 2,000 characters/i);
  });

  test("Rejects profile update with name exceeding 100 characters", async () => {
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        name: "N".repeat(101),
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /Name cannot exceed 100 characters/i);
  });

  test("Rejects profile update with more than 30 skills", async () => {
    const excessiveSkills = Array.from({ length: 31 }, (_, i) => `Skill${i}`);
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        skills: excessiveSkills,
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data.error, /Maximum 30 skills allowed/i);
  });

  test("Accepts valid profile update within bounds", async () => {
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        bio: "Passionate systems engineer interested in security & compilers.",
        name: "Charlie Security",
        skills: ["Rust", "TypeScript", "AppSec"],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.profile.name, "Charlie Security");
  });
});

describe("Security Fix 6: Organizer Student Roster Ownership Protection", () => {
  test("Competitor organizer Org2 cannot view or modify student roster for Org1's hackathon", async () => {
    // Org2 attempts to GET student roster for Hackathon 1
    const rosterGet = await api(`/api/organizer/hackathons/${hackathon1Id}/students`, {
      method: "GET",
      token: ORG2_TOKEN,
    });

    assert.equal(rosterGet.status, 403, "Org2 must receive 403 Forbidden");
    assert.match(rosterGet.data.error, /You do not own this competition/i);

    // Org2 attempts to POST new emails to Hackathon 1
    const rosterPost = await api(`/api/organizer/hackathons/${hackathon1Id}/students`, {
      method: "POST",
      token: ORG2_TOKEN,
      body: {
        action: "add_emails",
        emails: ["intruder@hacker.com"],
      },
    });

    assert.equal(rosterPost.status, 403, "Org2 must receive 403 Forbidden");
    assert.match(rosterPost.data.error, /You do not own this competition/i);

    // Org1 (owner) can view and modify student roster
    const org1RosterGet = await api(`/api/organizer/hackathons/${hackathon1Id}/students`, {
      method: "GET",
      token: ORG1_TOKEN,
    });
    assert.equal(org1RosterGet.status, 200, "Org1 should be allowed to view their roster");
  });
});
