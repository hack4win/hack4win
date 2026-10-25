import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const ADMIN_TOKEN = "test_admin_token_paid_" + Date.now();
const USER_TOKEN = "test_user_token_paid_" + Date.now();

let adminUserId = "";
let studentUserId = "";
let testHackathonId = "";
const testHackathonSlug = `test-paid-ai-${Date.now()}`;

async function api(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: Record<string, unknown>;
  } = {}
) {
  const { method = "GET", token = null, body } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
    // empty
  }

  return { status: res.status, ok: res.ok, data };
}

async function getOrCreateTestUser(role: string, name: string, email: string) {
  const existing = (
    await sql`
      SELECT u.id FROM public.users u
      INNER JOIN neon_auth.user nu ON nu.id::text = u.id
      WHERE u.email = ${email}
      LIMIT 1
    `
  )[0];

  if (existing) {
    return existing.id;
  }

  const id = crypto.randomUUID();
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING id;
  `;

  await sql`
    INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
  `;

  return id;
}

before(async () => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  adminUserId = await getOrCreateTestUser("admin", "Admin Paid Test", "admin.paid@do4win.com");
  studentUserId = await getOrCreateTestUser("user", "Student Paid Test", "student.paid@do4win.com");

  await sql`
    INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
    VALUES 
      (${crypto.randomUUID()}::uuid, ${adminUserId}::uuid, ${expiresAt}, ${ADMIN_TOKEN}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${studentUserId}::uuid, ${expiresAt}, ${USER_TOKEN}, NOW(), NOW());
  `;
});

after(async () => {
  if (testHackathonId) {
    await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${testHackathonId}`;
    await sql`DELETE FROM public.hackathons WHERE id = ${testHackathonId}`;
  }
  await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${USER_TOKEN})`;
  await sql`DELETE FROM public.users WHERE email IN ('admin.paid@do4win.com', 'student.paid@do4win.com')`;
  await sql`DELETE FROM neon_auth.user WHERE email IN ('admin.paid@do4win.com', 'student.paid@do4win.com')`;
});

describe("Paid Hackathon UPI Flow E2E", () => {
  test("1. Admin creates a paid hackathon with UPI ID & registration fee", async () => {
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "AI Innovators Summit (Paid)",
        tagline: "Build premier generative AI apps",
        description: "Registration fee required to participate in this exclusive hackathon.",
        slug: testHackathonSlug,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        registration_deadline: new Date(Date.now() + 86400000).toISOString(),
        submission_deadline: new Date(Date.now() + 172800000).toISOString(),
        status: "published",
        is_paid: true,
        registration_fee: 299,
        fee_currency: "₹",
        upi_id: "hack4win@okaxis",
        payment_instructions: "Scan the QR code and transfer ₹299. Upload payment screenshot and 12-digit UTR.",
      },
    });

    assert.equal(res.status, 201, `Failed to create hackathon: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.hackathon, "Response missing hackathon data");
    assert.equal(res.data.hackathon.is_paid, true);
    assert.equal(Number(res.data.hackathon.registration_fee), 299);
    assert.equal(res.data.hackathon.upi_id, "hack4win@okaxis");

    testHackathonId = res.data.hackathon.id;
  });

  test("2. Registration endpoint returns UPI details and dynamic intent link", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "GET",
      token: USER_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.is_paid, true);
    assert.equal(Number(res.data.registration_fee), 299);
    assert.equal(res.data.upi_id, "hack4win@okaxis");
    assert.equal(res.data.registered, false);
  });

  test("3. Student submits registration with UPI screenshot and 12-digit UTR reference", async () => {
    const testUtr = "431289471920";
    const testScreenshot = "https://example.com/payments/proof-431289471920.png";

    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "POST",
      token: USER_TOKEN,
      body: {
        participation_type: "solo",
        payment_reference: testUtr,
        payment_screenshot_url: testScreenshot,
        student_id: "CS2026-901",
        college_name: "IIT Delhi",
      },
    });

    assert.equal(res.status, 200, `Registration submission failed: ${JSON.stringify(res.data)}`);
    assert.equal(res.data.success, true);
    assert.equal(res.data.registered, true);
    assert.equal(res.data.status, "pending", "Paid registration should be in pending status");
    assert.equal(res.data.payment_status, "pending_verification");
    assert.equal(res.data.requires_verification, true);
  });

  test("4. Organizer views student roster with payment status, UTR, and screenshot", async () => {
    const res = await api(`/api/organizer/hackathons/${testHackathonId}/students`, {
      method: "GET",
      token: ADMIN_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.registered_students));

    const studentRecord = res.data.registered_students.find((s: any) => s.user_id === studentUserId);
    assert.ok(studentRecord, "Registered student not found in organizer roster");
    assert.equal(studentRecord.payment_status, "pending_verification");
    assert.equal(studentRecord.payment_reference, "431289471920");
    assert.equal(studentRecord.payment_screenshot_url, "https://example.com/payments/proof-431289471920.png");
    assert.equal(Number(studentRecord.payment_amount), 299);
  });

  test("5. Organizer verifies payment and activates student registration", async () => {
    const res = await api(`/api/organizer/hackathons/${testHackathonId}/students`, {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        action: "verify_payment",
        student_user_id: studentUserId,
      },
    });

    assert.equal(res.status, 200, `Verify payment failed: ${JSON.stringify(res.data)}`);
    assert.equal(res.data.status, "approved");
    assert.equal(res.data.payment_status, "verified");

    // Check registration GET endpoint for student
    const checkRes = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "GET",
      token: USER_TOKEN,
    });
    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.data.registered, true);
    assert.equal(checkRes.data.status, "approved");
    assert.equal(checkRes.data.payment_status, "verified");
  });

  test("6. Organizer can reject invalid payment with custom feedback reason", async () => {
    const res = await api(`/api/organizer/hackathons/${testHackathonId}/students`, {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        action: "reject_payment",
        student_user_id: studentUserId,
        reason: "UTR not found in bank statement. Please check transaction ID.",
      },
    });

    assert.equal(res.status, 200, `Reject payment failed: ${JSON.stringify(res.data)}`);
    assert.equal(res.data.status, "rejected");
    assert.equal(res.data.payment_status, "rejected");

    // Verify in database
    const rows = await sql`
      SELECT status, payment_status, payment_rejection_reason
      FROM public.hackathon_registrations
      WHERE hackathon_id = ${testHackathonId} AND user_id = ${studentUserId}
    `;
    assert.equal(rows[0].status, "rejected");
    assert.equal(rows[0].payment_status, "rejected");
    assert.equal(rows[0].payment_rejection_reason, "UTR not found in bank statement. Please check transaction ID.");
  });
});
