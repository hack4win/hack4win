import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "");

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, username = COALESCE(EXCLUDED.username, public.users.username);
  `;
  return id;
}

describe("Suite AP: Host Inquiries & Admin Management Portal", () => {
  let adminUserId = "";
  let regularUserId = "";
  let createdInquiryId = "";

  const ADMIN_EMAIL = `admin_inq_${Date.now()}@hack4win.online`;
  const USER_EMAIL = `user_inq_${Date.now()}@gmail.com`;

  const ADMIN_TOKEN = "e2e_admin_inq_tok_" + Date.now();
  const USER_TOKEN = "e2e_user_inq_tok_" + Date.now();

  before(async () => {
    adminUserId = await createActor("admin", "Admin Inquiries Lead", ADMIN_EMAIL);
    regularUserId = await createActor("user", "Regular Builder", USER_EMAIL);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES
        (${crypto.randomUUID()}::uuid, ${adminUserId}::uuid, ${ADMIN_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${regularUserId}::uuid, ${USER_TOKEN}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;
  });

  after(async () => {
    if (createdInquiryId) {
      await sql`DELETE FROM public.host_inquiries WHERE id = ${createdInquiryId}::uuid;`;
    }
    await sql`DELETE FROM public.host_inquiries WHERE email LIKE 'test_lead_%@venture.io';`;
    await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${USER_TOKEN});`;
    const userIds = [adminUserId, regularUserId].filter(Boolean);
    if (userIds.length > 0) {
      await sql`DELETE FROM public.users WHERE id = ANY(${userIds});`;
      await sql`DELETE FROM neon_auth.user WHERE id = ANY(${userIds.map((id) => id)}::uuid[]);`;
    }
  });

  it("AP.1. Prospective host can submit an inquiry via POST /api/host/inquiry and it is saved to database", async () => {
    const payload = {
      organizationName: "Nova AI Labs",
      contactName: "Dr. Evelyn Reed",
      email: `test_lead_${Date.now()}@venture.io`,
      timeline: "Next 30 Days (Fast Track)",
      estimatedPrizePool: "$50,000 - $100,000",
      tracks: ["AI & Autonomous Agents", "Next-Gen Developer Tools"],
      eventGoals: "We want 300+ developers to build autonomous agentic workflows using our Nova API SDK.",
    };

    const res = await fetch(`${BASE_URL}/api/host/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.inquiry_id, "Response must include created inquiry_id");
    createdInquiryId = data.inquiry_id;

    // Verify in database
    const dbRow = await sql`
      SELECT * FROM public.host_inquiries WHERE id = ${createdInquiryId}::uuid;
    `;
    assert.equal(dbRow.length, 1);
    assert.equal(dbRow[0].organization_name, "Nova AI Labs");
    assert.equal(dbRow[0].contact_name, "Dr. Evelyn Reed");
    assert.equal(dbRow[0].status, "new");
  });

  it("AP.2. Non-admin or unauthenticated access to /api/admin/inquiries is forbidden", async () => {
    // Unauthenticated
    const unauthRes = await fetch(`${BASE_URL}/api/admin/inquiries`);
    assert.equal(unauthRes.status, 401);

    // Regular user
    const userRes = await fetch(`${BASE_URL}/api/admin/inquiries`, {
      headers: { Cookie: `neon-auth.session_token=${USER_TOKEN}` },
    });
    assert.equal(userRes.status, 403);
  });

  it("AP.3. Admin can list all inquiries and stats via GET /api/admin/inquiries", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/inquiries`, {
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.inquiries));
    assert.ok(data.stats);
    assert.ok(data.stats.total >= 1);
    assert.ok(data.stats.new >= 1);

    const found = data.inquiries.find((i: { id: string }) => i.id === createdInquiryId);
    assert.ok(found, "Created inquiry must appear in admin inquiries list");
    assert.equal(found.organization_name, "Nova AI Labs");
  });

  it("AP.4. Admin can inspect single inquiry by ID via GET /api/admin/inquiries/[id]", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/inquiries/${createdInquiryId}`, {
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.inquiry);
    assert.equal(data.inquiry.id, createdInquiryId);
    assert.equal(data.inquiry.organization_name, "Nova AI Labs");
  });

  it("AP.5. Admin can update status and internal administrative notes via PATCH /api/admin/inquiries/[id]", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/inquiries/${createdInquiryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        status: "in_discussion",
        adminNotes: "Had kickoff call with Dr. Reed. Target sponsorship tier is $75k with Nova API credits.",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.inquiry.status, "in_discussion");
    assert.equal(data.inquiry.admin_notes, "Had kickoff call with Dr. Reed. Target sponsorship tier is $75k with Nova API credits.");

    // Verify in database
    const dbRow = await sql`
      SELECT status, admin_notes FROM public.host_inquiries WHERE id = ${createdInquiryId}::uuid;
    `;
    assert.equal(dbRow[0].status, "in_discussion");
    assert.equal(dbRow[0].admin_notes, "Had kickoff call with Dr. Reed. Target sponsorship tier is $75k with Nova API credits.");
  });

  it("AP.6. Admin Inquiries page (/admin/inquiries) renders HTML with leads table, stats, and search bar", async () => {
    const res = await fetch(`${BASE_URL}/admin/inquiries`, {
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });

    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Host Inquiries & Leads") || html.includes("Host Inquiries"), "Must render Host Inquiries page title");
    assert.ok(html.includes("Nova AI Labs"), "Must render submitted organization lead");
    assert.ok(html.includes("Dr. Evelyn Reed"), "Must render contact name");
    assert.ok(html.includes("Log New Inquiry"), "Must provide button to log new inquiry");
  });

  it("AP.7. Admin can delete an inquiry via DELETE /api/admin/inquiries/[id]", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/inquiries/${createdInquiryId}`, {
      method: "DELETE",
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    // Verify deletion
    const dbRow = await sql`
      SELECT * FROM public.host_inquiries WHERE id = ${createdInquiryId}::uuid;
    `;
    assert.equal(dbRow.length, 0);
    createdInquiryId = "";
  });
});
