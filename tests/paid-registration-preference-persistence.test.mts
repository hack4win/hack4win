import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const USER_TOKEN = "test_user_pref_token_" + Date.now();
let testUserId = "";
let testHackathonId = "";
const testHackathonSlug = `test-paid-pref-${Date.now()}`;

describe("Paid Hackathon Registration - Preference Toggle Retains Verified Payment Status", () => {
  before(async () => {
    testUserId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const testEmail = 'pref_' + Date.now() + '@example.com';

    // Create user & session in neon_auth (trigger handles public.users or conflict)
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${testUserId}::uuid, 'Preference Test Student', ${testEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
    `;
    await sql`
      INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (${testUserId}, 'Preference Test Student', ${testEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${testUserId}, ${expiresAt}, ${USER_TOKEN}, NOW(), NOW())
    `;

    // Create paid hackathon
    testHackathonId = crypto.randomUUID();
    await sql`
      INSERT INTO hackathons (
        id, slug, title, tagline, description, start_date, submission_deadline, end_date,
        organizer_id, organizer_name, status, format, is_paid, registration_fee, fee_currency, upi_id
      ) VALUES (
        ${testHackathonId}::uuid, ${testHackathonSlug}, 'Paid Preference Test', 'Tagline', 'Description',
        NOW(), NOW() + INTERVAL '7 days', NOW() + INTERVAL '14 days',
        ${testUserId}, 'Test Org', 'published', 'online', true, 49.00, '₹', 'test@upi'
      )
    `;

    // Insert user registration as verified
    await sql`
      INSERT INTO hackathon_registrations (
        hackathon_id, user_id, participation_type, status, payment_status, payment_reference, payment_amount, payment_submitted_at, payment_verified_at, created_at
      ) VALUES (
        ${testHackathonId}::uuid, ${testUserId}, 'looking_for_team', 'approved', 'verified', '123456789012', 49.00, NOW(), NOW(), NOW()
      )
    `;
  });

  after(async () => {
    if (testHackathonId) {
      await sql`DELETE FROM hackathon_registrations WHERE hackathon_id = ${testHackathonId}::uuid`;
      await sql`DELETE FROM hackathons WHERE id = ${testHackathonId}::uuid`;
    }
    if (testUserId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${testUserId}`;
      await sql`DELETE FROM public.users WHERE id = ${testUserId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${testUserId}`;
    }
  });

  test("User toggles participation preference from looking_for_team to solo without losing verified payment", async () => {
    // Make POST request to /api/hackathons/[slug]/register with only participation_type
    const res = await fetch(`${BASE_URL}/api/hackathons/${testHackathonSlug}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `better-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({
        participation_type: "solo",
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200, `Expected 200 OK but got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.participation_type, "solo");
    assert.equal(body.payment_status, "verified", "Payment status must remain verified after preference toggle");

    // Check DB row directly
    const rows = await sql`
      SELECT status, payment_status, payment_reference, participation_type
      FROM hackathon_registrations
      WHERE hackathon_id = ${testHackathonId}::uuid AND user_id = ${testUserId}
    `;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "approved");
    assert.equal(rows[0].payment_status, "verified");
    assert.equal(rows[0].participation_type, "solo");
    assert.equal(rows[0].payment_reference, "123456789012");
  });
});
