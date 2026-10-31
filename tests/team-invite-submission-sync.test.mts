import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const USER_A_TOKEN = "team_test_a_tok_" + Date.now();
const USER_B_TOKEN = "team_test_b_tok_" + Date.now();

let userAId = "";
let userBId = "";
let hackathonId = "";
let hackathonSlug = "";

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

describe("Team Invites & Submission Teammates Synchronization", () => {
  before(async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create two builders: User A (Lead) and User B (Teammate)
    userAId = await createActor("user", "Team Lead Alice", `lead_alice_${Date.now()}@h4w.security`);
    userBId = await createActor("user", "Builder Bob", `builder_bob_${Date.now()}@h4w.security`);

    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES 
        (${crypto.randomUUID()}::uuid, ${userAId}::uuid, ${USER_A_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${userBId}::uuid, ${USER_B_TOKEN}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;

    // 2. Create an active free hackathon
    hackathonSlug = `team-sync-hackathon-${Date.now()}`;
    const hRes = await sql`
      INSERT INTO hackathons (
        title, slug, tagline, description, start_date, end_date, submission_deadline, status, organizer_id, organizer_name
      ) VALUES (
        'Team Sync Challenge',
        ${hackathonSlug},
        'A test challenge for team invitations and project teammate sync',
        'Verifying both participants appear on submitted project',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '10 days',
        NOW() + INTERVAL '9 days',
        'published',
        ${userAId}::uuid,
        'Team Challenge Organizer'
      )
      RETURNING id
    `;
    hackathonId = hRes[0].id;

    // 3. Register both users for the hackathon
    await api(`/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      token: USER_A_TOKEN,
      body: { participation_type: "looking_for_team" },
    });

    await api(`/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      token: USER_B_TOKEN,
      body: { participation_type: "looking_for_team" },
    });
  });

  after(async () => {
    if (hackathonId) {
      await sql`DELETE FROM public.team_invitations WHERE hackathon_id = ${hackathonId}::uuid`;
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${hackathonId}::uuid`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${hackathonId}::uuid`;
      await sql`DELETE FROM public.hackathons WHERE id = ${hackathonId}::uuid`;
    }
    await sql`DELETE FROM neon_auth.session WHERE token IN (${USER_A_TOKEN}, ${USER_B_TOKEN})`;
    if (userAId && userBId) {
      await sql`DELETE FROM public.users WHERE id IN (${userAId}, ${userBId})`;
      await sql`DELETE FROM neon_auth.user WHERE id IN (${userAId}::uuid, ${userBId}::uuid)`;
    }
  });

  test("1. User A invites User B via Work Together (/api/team-invites)", async () => {
    const inviteRes = await api("/api/team-invites", {
      method: "POST",
      token: USER_A_TOKEN,
      body: {
        hackathon_id: hackathonId,
        receiver_id: userBId,
        team_name: "Quantum Builders (AI Engineer)",
        message: "Hey Bob, let's team up for this hackathon!",
      },
    });

    assert.equal(inviteRes.status, 200, "Invite creation should succeed");
    assert.ok(inviteRes.data?.invitation?.id, "Invitation should have an ID");
    assert.ok(inviteRes.data?.dispatchedEmail?.accept_url, "Accept URL should be generated");

    const inviteId = inviteRes.data.invitation.id;

    // 2. User B accepts the invitation
    const acceptRes = await api(`/api/team-invites/${inviteId}`, {
      method: "PATCH",
      token: USER_B_TOKEN,
      body: {
        status: "accepted",
      },
    });

    assert.equal(acceptRes.status, 200, "Accept invitation should succeed");
    assert.equal(acceptRes.data?.invitation?.status, "accepted", "Invitation status should be accepted");
  });

  test("2. User A submits project and both participants are automatically included", async () => {
    const submitRes = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: USER_A_TOKEN,
      body: {
        title: "Quantum AI Project",
        tagline: "Collaborative build by Alice and Bob",
        description: "An AI project built by team members working together.",
        agreeRules: true,
      },
    });

    assert.equal(submitRes.status, 200, "Project submission should succeed");
    const sub = submitRes.data?.submission;
    assert.ok(sub?.id, "Submission should have an id");

    // Fetch submissions for this hackathon
    const getRes = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "GET",
      token: USER_A_TOKEN,
    });

    assert.equal(getRes.status, 200, "Submissions fetch should succeed");
    const submissions = getRes.data?.submissions || [];
    assert.ok(submissions.length >= 1, "Should have at least 1 submission");

    const targetSub = submissions.find((s: any) => s.id === sub.id);
    assert.ok(targetSub, "Target submission should be found");

    // Verify BOTH Alice (userA) and Bob (userB) are in team_members
    const memberIds = (targetSub.team_members || []).map((m: any) => m.id);
    assert.ok(memberIds.includes(userAId), "Team Lead Alice should be in team_members");
    assert.ok(memberIds.includes(userBId), "Builder Bob should be in team_members");
    assert.equal(targetSub.team_members.length, 2, "Submission should show both participants");
  });

  test("3. If project is submitted FIRST and invite accepted LATER, submission synchronizes both participants", async () => {
    // Create a 3rd builder (Charlie)
    const userCId = await createActor("user", "Builder Charlie", `charlie_${Date.now()}@h4w.security`);
    const USER_C_TOKEN = "team_test_c_tok_" + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}::uuid, ${userCId}::uuid, ${USER_C_TOKEN}, ${expiresAt}, NOW(), NOW())
    `;

    // Register Charlie
    await api(`/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      token: USER_C_TOKEN,
      body: { participation_type: "looking_for_team" },
    });

    // Alice invites Charlie (pending)
    const inviteRes = await api("/api/team-invites", {
      method: "POST",
      token: USER_A_TOKEN,
      body: {
        hackathon_id: hackathonId,
        receiver_id: userCId,
        team_name: "Quantum Builders (Frontend Dev)",
        message: "Hey Charlie, join our team!",
      },
    });
    const charlieInviteId = inviteRes.data?.invitation?.id;
    assert.ok(charlieInviteId, "Charlie invite should exist");

    // Charlie accepts the invite
    const acceptRes = await api(`/api/team-invites/${charlieInviteId}`, {
      method: "PATCH",
      token: USER_C_TOKEN,
      body: { status: "accepted" },
    });
    assert.equal(acceptRes.status, 200, "Charlie accept should succeed");

    // Check submission again: Charlie should now also be in team_members!
    const getRes = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "GET",
      token: USER_A_TOKEN,
    });
    const sub = getRes.data?.submissions?.[0];
    const memberIds = (sub?.team_members || []).map((m: any) => m.id);
    assert.ok(memberIds.includes(userCId), "Charlie should now be synchronized into team_members");

    // Cleanup Charlie
    await sql`DELETE FROM neon_auth.session WHERE token = ${USER_C_TOKEN}`;
    await sql`DELETE FROM public.users WHERE id = ${userCId}`;
    await sql`DELETE FROM neon_auth.user WHERE id = ${userCId}::uuid`;
  });
});
