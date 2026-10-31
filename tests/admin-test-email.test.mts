import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const ADMIN_TOKEN = "test_admin_mail_tok_" + Date.now();
const USER_TOKEN = "test_user_mail_tok_" + Date.now();
let testAdminId = "";
let testUserId = "";

describe("Admin Settings - Email Delivery Test System", () => {
  before(async () => {
    testAdminId = crypto.randomUUID();
    testUserId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create test admin
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${testAdminId}::uuid, 'Test Admin', 'admin_test_mail@hack4win.online', true, 'admin', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET role = 'admin';
    `;
    await sql`
      INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (${testAdminId}, 'Test Admin', 'admin_test_mail@hack4win.online', true, 'admin', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET role = 'admin';
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${testAdminId}, ${expiresAt}, ${ADMIN_TOKEN}, NOW(), NOW())
    `;

    // 2. Create regular user
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${testUserId}::uuid, 'Test Builder', 'regular_builder@example.com', true, 'user', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET role = 'user';
    `;
    await sql`
      INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (${testUserId}, 'Test Builder', 'regular_builder@example.com', true, 'user', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET role = 'user';
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${testUserId}, ${expiresAt}, ${USER_TOKEN}, NOW(), NOW())
    `;
  });

  after(async () => {
    if (testAdminId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${testAdminId}`;
      await sql`DELETE FROM public.users WHERE id = ${testAdminId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${testAdminId}`;
    }
    if (testUserId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${testUserId}`;
      await sql`DELETE FROM public.users WHERE id = ${testUserId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${testUserId}`;
    }
  });

  test("1. Unauthenticated request to POST /api/admin/mail/test returns 401 Unauthorized", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/mail/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 401);
  });

  test("2. Non-admin user request to POST /api/admin/mail/test returns 403 Forbidden", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/mail/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `better-auth.session_token=${USER_TOKEN}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 403);
  });

  test("3. Authenticated Admin request to POST /api/admin/mail/test dispatches test email", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/mail/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `better-auth.session_token=${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        recipientEmail: "khanakram8435@gmail.com",
        senderKey: "NOTIFICATIONS",
        subject: "Unit Test Verification Mail",
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200 OK but got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.success, true);
    assert.equal(data.recipient, "khanakram8435@gmail.com");
    assert.ok(data.messageId);
    assert.ok(data.engineUsed);
  });
});
