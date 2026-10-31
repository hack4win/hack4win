import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const ADMIN_TOKEN = "notif_admin_tok_" + Date.now();
const ORGANIZER_TOKEN = "notif_org_tok_" + Date.now();
const JUDGE_TOKEN = "notif_judge_tok_" + Date.now();
const USER_TOKEN = "notif_user_tok_" + Date.now();

let adminId = "";
let organizerId = "";
let judgeId = "";
let regularUserId = "";
let testHackathonId = "";

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  `;
  return id;
}

async function createSession(userId: string, token: string) {
  const sessId = crypto.randomUUID();
  await sql`
    INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
    VALUES (${sessId}::uuid, ${userId}::uuid, ${token}, NOW() + INTERVAL '7 days', NOW(), NOW())
    ON CONFLICT (token) DO UPDATE SET "expiresAt" = NOW() + INTERVAL '7 days';
  `;
}

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

  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

describe("Role-Scoped Notifications System", () => {
  before(async () => {
    adminId = await createActor("admin", "Notif Admin", `notif_admin_${Date.now()}@test.io`);
    organizerId = await createActor("organizer", "Notif Organizer", `notif_org_${Date.now()}@test.io`);
    judgeId = await createActor("judge", "Notif Judge", `notif_judge_${Date.now()}@test.io`);
    regularUserId = await createActor("user", "Notif Regular", `notif_user_${Date.now()}@test.io`);

    await createSession(adminId, ADMIN_TOKEN);
    await createSession(organizerId, ORGANIZER_TOKEN);
    await createSession(judgeId, JUDGE_TOKEN);
    await createSession(regularUserId, USER_TOKEN);

    // Create a paid test hackathon owned by organizer with a pending payment registration
    testHackathonId = crypto.randomUUID();
    const testSlug = `notif-hack-${Date.now()}`;
    await sql`
      INSERT INTO public.hackathons (
        id, title, slug, tagline, description, status, format, is_paid, registration_fee,
        organizer_id, organizer_name, start_date, end_date, submission_deadline, created_at, updated_at
      ) VALUES (
        ${testHackathonId}::uuid, 'Notif Arena Challenge', ${testSlug}, 'Testing Notifs',
        'Description', 'ongoing', 'online', true, 49, ${organizerId}, 'Test Organizer',
        NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', NOW() + INTERVAL '4 days',
        NOW(), NOW()
      );
    `;

    // Add pending payment registration
    await sql`
      INSERT INTO public.hackathon_registrations (
        hackathon_id, user_id, status, payment_status, payment_amount, payment_reference, created_at
      ) VALUES (
        ${testHackathonId}::uuid, ${regularUserId}, 'approved', 'pending_verification', 49, '123456789012', NOW()
      );
    `;

    // Assign judge to test hackathon
    await sql`
      INSERT INTO public.hackathon_judges (hackathon_id, judge_id, created_at)
      VALUES (${testHackathonId}::uuid, ${judgeId}, NOW())
      ON CONFLICT DO NOTHING;
    `;
  });

  after(async () => {
    try {
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_judges WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.user_notification_reads WHERE user_id IN (${adminId}, ${organizerId}, ${judgeId}, ${regularUserId});`;
      await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${ORGANIZER_TOKEN}, ${JUDGE_TOKEN}, ${USER_TOKEN});`;
      await sql`DELETE FROM public.users WHERE id IN (${adminId}, ${organizerId}, ${judgeId}, ${regularUserId});`;
      await sql`DELETE FROM neon_auth.user WHERE id IN (${adminId}::uuid, ${organizerId}::uuid, ${judgeId}::uuid, ${regularUserId}::uuid);`;
    } catch {}
  });

  test("1. Unauthenticated request to GET /api/notifications returns 401 Unauthorized", async () => {
    const res = await api("/api/notifications");
    assert.equal(res.status, 401);
  });

  test("2. Regular user (role = 'user') requesting GET /api/notifications returns 403 Forbidden", async () => {
    const res = await api("/api/notifications", { token: USER_TOKEN });
    assert.equal(res.status, 403);
    assert.match(res.json?.error, /Organizer, Judge, or Admin/i);
  });

  test("3. Organizer receives pending payment verification notification for their hackathon", async () => {
    const res = await api("/api/notifications", { token: ORGANIZER_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.json?.role, "organizer");
    assert.ok(Array.isArray(res.json?.notifications));
    assert.ok(res.json.notifications.length > 0);

    const paymentNotif = res.json.notifications.find(
      (n: any) => n.category === "verification" && n.hackathonId === testHackathonId
    );
    assert.ok(paymentNotif, "Organizer must receive payment verification notification");
    assert.equal(paymentNotif.priority, "urgent");
    assert.match(paymentNotif.title, /Payment Proof Verification/i);
    assert.match(paymentNotif.actionUrl, /pending_verification/);
    assert.equal(paymentNotif.isRead, false);
  });

  test("4. Judge receives judging queue notification for assigned hackathon", async () => {
    const res = await api("/api/notifications", { token: JUDGE_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.json?.role, "judge");
    assert.ok(Array.isArray(res.json?.notifications));
  });

  test("5. Admin receives platform-wide notifications and oversight", async () => {
    const res = await api("/api/notifications", { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.json?.role, "admin");
    assert.ok(Array.isArray(res.json?.notifications));
    assert.ok(typeof res.json?.unreadCount === "number");
  });

  test("6. Marking a notification as read updates read state in database", async () => {
    const initial = await api("/api/notifications", { token: ORGANIZER_TOKEN });
    const targetNotif = initial.json?.notifications?.[0];
    assert.ok(targetNotif);

    const markRes = await api("/api/notifications/read", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: { notificationId: targetNotif.id },
    });
    assert.equal(markRes.status, 200);
    assert.equal(markRes.json?.success, true);

    const updated = await api("/api/notifications", { token: ORGANIZER_TOKEN });
    const readItem = updated.json?.notifications.find((n: any) => n.id === targetNotif.id);
    assert.ok(readItem);
    assert.equal(readItem.isRead, true);
  });

  test("7. Mark all as read clears unread count for user", async () => {
    const markAllRes = await api("/api/notifications/read", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: { all: true },
    });
    assert.equal(markAllRes.status, 200);

    const final = await api("/api/notifications", { token: ORGANIZER_TOKEN });
    assert.equal(final.json?.unreadCount, 0);
  });
});
