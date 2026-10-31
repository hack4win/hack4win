import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const BUILDER_TOKEN = "gate_test_builder_tok_" + Date.now();
let builderId = "";
let organizerId = "";
let hackathonId = "";
let hackathonSlug = "";

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_gate_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  `;
  return id;
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

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  return { status: res.status, data };
}

describe("Registration Submission Gate Verification", () => {
  before(async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create a builder and organizer
    organizerId = await createActor("organizer", "Gate Test Organizer", `org_gate_${Date.now()}@h4w.security`);
    builderId = await createActor("user", "Gate Test Builder", `builder_gate_${Date.now()}@h4w.security`);

    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}::uuid, ${builderId}::uuid, ${BUILDER_TOKEN}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;

    // 2. Create an active free hackathon
    hackathonSlug = `gate-test-hackathon-${Date.now()}`;
    const hRes = await sql`
      INSERT INTO hackathons (
        title, slug, tagline, description, start_date, end_date, submission_deadline, status, organizer_id, organizer_name
      ) VALUES (
        'Gate Test Challenge',
        ${hackathonSlug},
        'A test challenge for registration access control',
        'Testing strict submission blocking for unregistered users',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '10 days',
        NOW() + INTERVAL '9 days',
        'published',
        ${organizerId}::uuid,
        'Gate Test Organizer'
      )
      RETURNING id
    `;
    hackathonId = hRes[0].id;
  });

  after(async () => {
    // Cleanup
    if (hackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${hackathonId}::uuid`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${hackathonId}::uuid`;
      await sql`DELETE FROM public.hackathons WHERE id = ${hackathonId}::uuid`;
    }
    await sql`DELETE FROM neon_auth.session WHERE token = ${BUILDER_TOKEN}`;
    if (builderId && organizerId) {
      await sql`DELETE FROM public.users WHERE id IN (${builderId}, ${organizerId})`;
      await sql`DELETE FROM neon_auth.user WHERE id IN (${builderId}::uuid, ${organizerId}::uuid)`;
    }
  });

  test("1. Unregistered user is blocked from submitting a project (403 Forbidden)", async () => {
    const res = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Unauthorized Project Submission",
        tagline: "Should be blocked because user is not registered",
        description: "This submission attempt should be rejected with 403 Forbidden because registration is strictly enforced.",
        agreeRules: true,
      },
    });

    assert.equal(res.status, 403, "Should return 403 Forbidden");
    assert.match(
      res.data?.error || "",
      /You must register for this hackathon before submitting/i,
      "Error message should explain registration is required"
    );
  });

  test("2. User registers for hackathon and is now able to submit", async () => {
    // Register the user
    const regRes = await api(`/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        participation_type: "solo",
      },
    });
    assert.equal(regRes.status, 200, "Registration should succeed");

    // Now submit project
    const subRes = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Authorized Builder Project",
        tagline: "Submitted after valid registration",
        description: "This submission succeeds because user is now verified and registered for the hackathon.",
        agreeRules: true,
      },
    });

    assert.equal(subRes.status, 200, "Submission should return 200 OK");
    assert.ok(subRes.data?.submission?.id, "Submission should have an id");
  });
});
