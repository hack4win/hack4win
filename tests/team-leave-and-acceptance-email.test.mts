import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

const SENDER_TOKEN = "test_sender_leave_token_" + Date.now();
const RECEIVER_TOKEN = "test_receiver_leave_token_" + Date.now();

let senderId = "";
let receiverId = "";
let testHackathonId = "";
const testHackathonSlug = `test-leave-flow-${Date.now()}`;
let invitationId = "";
let submissionId = "";

describe("Team Leave & Acceptance Notification Flow", () => {
  before(async () => {
    senderId = crypto.randomUUID();
    receiverId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const senderEmail = `sender_${Date.now()}@example.com`;
    const receiverEmail = `receiver_${Date.now()}@example.com`;

    // 1. Create Sender User & Session
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${senderId}::uuid, 'Sender Builder', ${senderEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
    `;
    await sql`
      INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (${senderId}, 'Sender Builder', ${senderEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${senderId}, ${expiresAt}, ${SENDER_TOKEN}, NOW(), NOW())
    `;

    // 2. Create Receiver User & Session
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${receiverId}::uuid, 'Receiver Builder', ${receiverEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
    `;
    await sql`
      INSERT INTO public.users (id, name, email, email_verified, role, created_at, updated_at)
      VALUES (${receiverId}, 'Receiver Builder', ${receiverEmail}, true, 'user', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", "expiresAt", token, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${receiverId}, ${expiresAt}, ${RECEIVER_TOKEN}, NOW(), NOW())
    `;

    // 3. Create Hackathon
    testHackathonId = crypto.randomUUID();
    await sql`
      INSERT INTO hackathons (
        id, slug, title, tagline, description, start_date, submission_deadline, end_date,
        organizer_id, organizer_name, status, format
      ) VALUES (
        ${testHackathonId}::uuid, ${testHackathonSlug}, 'Leave Team Hackathon', 'Tagline', 'Description',
        NOW(), NOW() + INTERVAL '7 days', NOW() + INTERVAL '14 days',
        ${senderId}, 'Test Org', 'published', 'online'
      )
    `;

    // 4. Register both users for hackathon
    await sql`
      INSERT INTO hackathon_registrations (hackathon_id, user_id, participation_type, status, created_at)
      VALUES (${testHackathonId}::uuid, ${senderId}, 'looking_for_team', 'approved', NOW()),
             (${testHackathonId}::uuid, ${receiverId}, 'looking_for_team', 'approved', NOW())
    `;

    // 5. Create Team Invitation from Sender to Receiver
    invitationId = crypto.randomUUID();
    await sql`
      INSERT INTO team_invitations (
        id, hackathon_id, sender_id, receiver_id, receiver_email, team_name, message, status, created_at, updated_at
      ) VALUES (
        ${invitationId}::uuid, ${testHackathonId}::uuid, ${senderId}, ${receiverId}, ${receiverEmail},
        'Awesome Squad (Co-Builder)', 'Join us!', 'pending', NOW(), NOW()
      )
    `;

    // 6. Create Sender's Project Submission
    submissionId = crypto.randomUUID();
    await sql`
      INSERT INTO hackathon_submissions (
        id, hackathon_id, user_id, title, tagline, description, status, created_at, updated_at,
        team_member_ids, team_members
      ) VALUES (
        ${submissionId}::uuid, ${testHackathonId}::uuid, ${senderId}, 'Awesome Project', 'Tagline', 'Story', 'draft', NOW(), NOW(),
        ${[senderId]}, ${JSON.stringify([{ id: senderId, name: 'Sender Builder', role: 'Project Lead', status: 'accepted' }])}
      )
    `;
  });

  after(async () => {
    if (testHackathonId) {
      await sql`DELETE FROM team_invitations WHERE hackathon_id = ${testHackathonId}::uuid`;
      await sql`DELETE FROM hackathon_submissions WHERE hackathon_id = ${testHackathonId}::uuid`;
      await sql`DELETE FROM hackathon_registrations WHERE hackathon_id = ${testHackathonId}::uuid`;
      await sql`DELETE FROM hackathons WHERE id = ${testHackathonId}::uuid`;
    }
    if (senderId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${senderId}`;
      await sql`DELETE FROM public.users WHERE id = ${senderId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${senderId}`;
    }
    if (receiverId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${receiverId}`;
      await sql`DELETE FROM public.users WHERE id = ${receiverId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${receiverId}`;
    }
  });

  test("1. Receiver accepts team invitation -> updates status and syncs submission teammates", async () => {
    const res = await fetch(`${BASE_URL}/api/team-invites/${invitationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `better-auth.session_token=${RECEIVER_TOKEN}`,
      },
      body: JSON.stringify({ status: "accepted" }),
    });

    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200 OK: ${JSON.stringify(data)}`);
    assert.equal(data.invitation.status, "accepted");

    // Check submission teammates directly
    const subs = await sql`
      SELECT team_member_ids, team_members FROM hackathon_submissions WHERE id = ${submissionId}::uuid
    `;
    assert.equal(subs.length, 1);
    const memberIds = subs[0].team_member_ids.map(String);
    assert.ok(memberIds.includes(senderId), "Submission must include sender");
    assert.ok(memberIds.includes(receiverId), "Submission must include receiver after accept");
  });

  test("2. Receiver leaves team (DELETE /api/team-invites/[id]) -> unlinks from project submission", async () => {
    const res = await fetch(`${BASE_URL}/api/team-invites/${invitationId}`, {
      method: "DELETE",
      headers: {
        Cookie: `better-auth.session_token=${RECEIVER_TOKEN}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200 OK: ${JSON.stringify(data)}`);
    assert.equal(data.success, true);

    // Verify invitation is deleted from DB
    const invites = await sql`
      SELECT * FROM team_invitations WHERE id = ${invitationId}::uuid
    `;
    assert.equal(invites.length, 0, "Invitation should be removed upon leaving");

    // Verify receiver is removed from sender's project submission
    const subs = await sql`
      SELECT team_member_ids, team_members FROM hackathon_submissions WHERE id = ${submissionId}::uuid
    `;
    assert.equal(subs.length, 1);
    const memberIds = subs[0].team_member_ids.map(String);
    assert.ok(memberIds.includes(senderId), "Sender remains project lead");
    assert.ok(!memberIds.includes(receiverId), "Receiver must be unlinked after leaving team");

    // Verify receiver's registration reverted to looking_for_team
    const regs = await sql`
      SELECT participation_type FROM hackathon_registrations
      WHERE hackathon_id = ${testHackathonId}::uuid AND user_id = ${receiverId}
    `;
    assert.equal(regs.length, 1);
    assert.equal(regs[0].participation_type, "looking_for_team", "Should revert to looking_for_team");
  });
});
