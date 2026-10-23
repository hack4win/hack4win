import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

// Test session tokens
const ADMIN_TOKEN = "test_admin_token_" + Date.now();
const USER_TOKEN = "test_user_token_" + Date.now();
const TEAMMATE_TOKEN = "test_teammate_token_" + Date.now();
const JUDGE_TOKEN = "test_judge_token_" + Date.now();

let adminUserId = "";
let regularUserId = "";
let teammateUserId = "";
let judgeUserId = "";

let testHackathonId = "";
let testHackathonSlug = "";
let testSubmissionId = "";
let testInvitationId = "";
let testTagId = "";
let testSkillId = "";
let createdUserId = "";

// Helper for authenticated HTTP requests
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
    // Some endpoints may return empty body
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

  adminUserId = await getOrCreateTestUser("admin", "Test Admin", "admin.e2e@do4win.com");
  regularUserId = await getOrCreateTestUser("user", "Test User", "user1.e2e@do4win.com");
  teammateUserId = await getOrCreateTestUser("user", "Test Teammate", "teammate.e2e@do4win.com");
  judgeUserId = await getOrCreateTestUser("judge", "Test Judge", "judge.e2e@do4win.com");

  // Insert active test sessions into neon_auth.session
  await sql`
    INSERT INTO neon_auth.session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
    VALUES 
      (gen_random_uuid(), ${ADMIN_TOKEN}, ${adminUserId}::uuid, ${expiresAt}, NOW(), NOW()),
      (gen_random_uuid(), ${USER_TOKEN}, ${regularUserId}::uuid, ${expiresAt}, NOW(), NOW()),
      (gen_random_uuid(), ${TEAMMATE_TOKEN}, ${teammateUserId}::uuid, ${expiresAt}, NOW(), NOW()),
      (gen_random_uuid(), ${JUDGE_TOKEN}, ${judgeUserId}::uuid, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (token) DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt";
  `;
});

after(async () => {
  // Clean up test sessions and test entities created during test
  try {
    await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${USER_TOKEN}, ${TEAMMATE_TOKEN}, ${JUDGE_TOKEN});`;
    if (testHackathonId) {
      await sql`DELETE FROM public.project_evaluations WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.team_invitations WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${testHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${testHackathonId}::uuid;`;
    }
    if (createdUserId) {
      await sql`DELETE FROM public.users WHERE id = ${createdUserId};`;
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
});

describe("1. Role-Based Access Control (RBAC) & Authentication", () => {
  test("Unauthenticated request to protected endpoint returns 401 Unauthorized", async () => {
    const res = await api("/api/user/profile");
    assert.equal(res.status, 401);
    assert.equal(res.data?.error, "Unauthorized");
  });

  test("Regular user accessing admin endpoint returns 403 Forbidden", async () => {
    const res = await api("/api/admin/users", { token: USER_TOKEN });
    assert.equal(res.status, 403);
    assert.match(res.data?.error, /Forbidden/i);
  });

  test("Admin user accessing admin endpoint returns 200 OK", async () => {
    const res = await api("/api/admin/users", { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data?.users));
  });
});

describe("2. User Profile Management Workflow", () => {
  test("Authenticated user can fetch their own profile", async () => {
    const res = await api("/api/user/profile", { token: USER_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.profile?.id, regularUserId);
  });

  test("User can check username availability (valid, taken, and invalid format)", async () => {
    // 1. Available username
    const uniqueCandidate = `unique_user_${Date.now().toString().slice(-6)}`;
    const resAvailable = await api(`/api/user/username?username=${uniqueCandidate}`, { token: USER_TOKEN });
    assert.equal(resAvailable.status, 200);
    assert.equal(resAvailable.data?.available, true);

    // 2. Taken username (regular user already has @aarav_sharma or similar)
    const resTaken = await api("/api/user/username?username=aarav_sharma", { token: USER_TOKEN });
    assert.equal(resTaken.status, 200);
    assert.equal(resTaken.data?.available, false);

    // 3. Invalid characters
    const resInvalid = await api("/api/user/username?username=bad@user!", { token: USER_TOKEN });
    assert.equal(resInvalid.status, 200);
    assert.equal(resInvalid.data?.available, false);
  });

  test("User can claim a unique username via onboarding API", async () => {
    const chosenUsername = `hacker_${Date.now().toString().slice(-6)}`;
    const res = await api("/api/user/username", {
      method: "POST",
      token: USER_TOKEN,
      body: {
        username: chosenUsername,
        name: "Test Hacker Deluxe",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.user?.username, chosenUsername);
    assert.equal(res.data?.user?.name, "Test Hacker Deluxe");
  });

  test("Claiming an already taken username returns 400 error", async () => {
    const res = await api("/api/user/username", {
      method: "POST",
      token: TEAMMATE_TOKEN,
      body: {
        username: "aarav_sharma", // Already taken
      },
    });

    assert.equal(res.status, 400);
    assert.ok(res.data?.error?.includes("already taken"));
  });

  test("Authenticated user can update profile information and change username", async () => {
    const newBio = `Full-stack engineer & AI hacker (${Date.now()})`;
    const updatedUsername = `switched_${Date.now().toString().slice(-6)}`;
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: USER_TOKEN,
      body: {
        username: updatedUsername,
        bio: newBio,
        skills: ["Next.js", "TypeScript", "PostgreSQL", "Docker"],
        country: "India",
        website: "https://myportfolio.dev",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.profile?.username, updatedUsername);
    assert.equal(res.data?.profile?.bio, newBio);
    assert.ok(res.data?.profile?.skills.includes("Next.js"));
  });

  test("Updating username to a taken username in profile section returns 400 error", async () => {
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: USER_TOKEN,
      body: {
        username: "aarav_sharma", // taken by Aarav Sharma
      },
    });

    assert.equal(res.status, 400);
    assert.ok(res.data?.error?.includes("already taken"));
  });

  test("User cannot claim a reserved username (e.g. 'admin' or 'support')", async () => {
    // 1. Availability check returns false with reserved reason
    const checkRes = await api("/api/user/username?username=admin", { token: USER_TOKEN });
    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.data?.available, false);
    assert.ok(checkRes.data?.reason?.includes("reserved"));

    // 2. Claiming reserved username returns 400
    const claimRes = await api("/api/user/username", {
      method: "POST",
      token: USER_TOKEN,
      body: { username: "admin" },
    });
    assert.equal(claimRes.status, 400);
    assert.ok(claimRes.data?.error?.includes("reserved"));

    // 3. Updating profile to reserved username returns 400
    const patchRes = await api("/api/user/profile", {
      method: "PATCH",
      token: USER_TOKEN,
      body: { username: "support" },
    });
    assert.equal(patchRes.status, 400);
    assert.ok(patchRes.data?.error?.includes("reserved"));
  });
});

describe("3. Hackathon Lifecycle & Admin Management Workflow", () => {
  test("Admin can create a new hackathon with custom competition rules", async () => {
    testHackathonSlug = `e2e-hackathon-${Date.now()}`;
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Autonomous Web3 & AI Grand Prix 2026",
        slug: testHackathonSlug,
        tagline: "Build futuristic intelligent decentralized apps",
        description: "Full end-to-end hackathon test suite description with comprehensive details.",
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        submission_deadline: new Date(Date.now() + 86400000 * 6).toISOString(),
        prize_pool: "$50,000",
        currency: "$",
        status: "ongoing",
        format: "online",
        location: "Virtual",
        tags: ["AI", "Web3", "Next.js"],
        rules: [
          "Maximum 4 members per team (solo builders welcome).",
          "All code must be written within the official competition window.",
          "Submissions must be deployed to a live URL.",
        ],
        prizes: [
          { place: "1st Place", amount: "$25,000", description: "Grand Champion" },
          { place: "2nd Place", amount: "$15,000", description: "Runner Up" },
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.hackathon?.id);
    assert.ok(Array.isArray(res.data.hackathon.rules));
    assert.equal(res.data.hackathon.rules.length, 3);
    assert.equal(res.data.hackathon.rules[2], "Submissions must be deployed to a live URL.");
    testHackathonId = res.data.hackathon.id;
    testHackathonSlug = res.data.hackathon.slug;
  });

  test("Admin can fetch hackathon by primary ID and inspect rules", async () => {
    const res = await api(`/api/admin/hackathons/${testHackathonId}`, { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.hackathon?.id, testHackathonId);
    assert.ok(Array.isArray(res.data?.hackathon?.rules));
    assert.equal(res.data.hackathon.rules.length, 3);
  });

  test("Admin can update hackathon properties and rules", async () => {
    const updatedRules = [
      "Updated Rule 1: All commits must be made during hackathon window",
      "Updated Rule 2: 3-minute demo video mandatory",
    ];
    const res = await api(`/api/admin/hackathons/${testHackathonId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        prize_pool: "$75,000",
        tagline: "Updated futuristic tagline for developers worldwide",
        rules: updatedRules,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.hackathon?.prize_pool, "$75,000");
    assert.deepEqual(res.data?.hackathon?.rules, updatedRules);
  });
});

describe("4. Hackathon Participation & Registration Workflow", () => {
  test("Check initial registration status (should be false)", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, { token: USER_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, false);
  });

  test("User can register for the hackathon", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "POST",
      token: USER_TOKEN,
      body: { participation_type: "looking_for_team" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.registered, true);
    assert.equal(res.data?.participation_type, "looking_for_team");
  });

  test("User can unregister from the hackathon", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "DELETE",
      token: USER_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.registered, false);
  });

  test("User can re-register for the hackathon", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, {
      method: "POST",
      token: USER_TOKEN,
      body: { participation_type: "looking_for_team" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, true);
  });
});

describe("5. Team Invitations & Collaboration Workflow", () => {
  test("Prevent user from inviting themselves (should return 400)", async () => {
    const res = await api("/api/team-invites", {
      method: "POST",
      token: USER_TOKEN,
      body: {
        hackathon_id: testHackathonId,
        receiver_id: regularUserId,
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /cannot invite yourself/i);
  });

  test("User can send team invitation to another builder", async () => {
    const res = await api("/api/team-invites", {
      method: "POST",
      token: USER_TOKEN,
      body: {
        hackathon_id: testHackathonId,
        receiver_id: teammateUserId,
        team_name: "Quantum Agents Squad",
        role: "Frontend Architect",
        message: "Hey! Let us team up and win 1st place in this challenge!",
        contact_info: "Discord: @hacker#1234",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.invitation?.id);
    assert.equal(res.data?.invitation?.status, "pending");
    assert.ok(res.data?.dummyEmail?.accept_url);
    testInvitationId = res.data.invitation.id;
  });

  test("Sending duplicate pending invite updates existing without duplicate spam", async () => {
    const res = await api("/api/team-invites", {
      method: "POST",
      token: USER_TOKEN,
      body: {
        hackathon_id: testHackathonId,
        receiver_id: teammateUserId,
        team_name: "Quantum Agents Squad Updated",
        role: "Frontend Architect",
        message: "Updated note: Let us definitely team up!",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.invitation?.id, testInvitationId);
  });

  test("Unauthenticated user fetching invitation gets redacted privacy-safe data", async () => {
    const res = await api(`/api/team-invites/${testInvitationId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data?.requiresAuth, true);
    // Sensitive contact info and receiver email must be redacted
    assert.equal(res.data?.invitation?.contact_info, undefined);
    assert.equal(res.data?.invitation?.receiver_email, undefined);
    assert.equal(res.data?.invitation?.message, undefined);
  });

  test("Unauthorized user attempting to accept invite receives 403 Forbidden", async () => {
    // Admin user is neither the receiver nor recipient of the invite response
    const res = await api(`/api/team-invites/${testInvitationId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: { status: "accepted" },
    });

    assert.equal(res.status, 403);
    assert.match(res.data?.error, /Only the recipient/i);
  });

  test("Recipient can accept team invitation", async () => {
    const res = await api(`/api/team-invites/${testInvitationId}`, {
      method: "PATCH",
      token: TEAMMATE_TOKEN,
      body: { status: "accepted" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.invitation?.status, "accepted");
  });

  test("Accepting invite sets has_team registration for receiver", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/register`, { token: TEAMMATE_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, true);
    assert.equal(res.data?.participation_type, "has_team");
  });
});

describe("6. Project Submissions & Privacy Protection Workflow", () => {
  test("User can submit a project for the hackathon", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/submissions`, {
      method: "POST",
      token: USER_TOKEN,
      body: {
        title: "NeuroMesh Agentic IDE",
        tagline: "Autonomous collaborative AI development environment",
        description: "NeuroMesh is an intelligent pair programming platform powered by multi-agent reasoning and real-time synchronization.",
        demo_url: "https://neuromesh.demo.dev",
        github_url: "https://github.com/do4win/neuromesh",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
        tech_stack: ["Next.js", "TypeScript", "PostgreSQL", "Docker", "Turbopack"],
        team_members: [
          {
            id: regularUserId,
            name: "Test User 1",
            role: "Project Lead",
            status: "accepted",
          },
          {
            id: teammateUserId,
            name: "Test Teammate",
            role: "Frontend Architect",
            status: "accepted",
            invite_id: testInvitationId,
          },
        ],
        team_member_ids: [regularUserId, teammateUserId],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.submission?.id);
    assert.equal(res.data?.submission?.title, "NeuroMesh Agentic IDE");
    testSubmissionId = res.data.submission.id;
  });

  test("Public query of hackathon submissions does NOT leak user private emails", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/submissions`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data?.submissions));
    const sub = res.data.submissions.find((s: any) => s.id === testSubmissionId);
    assert.ok(sub, "Submitted project should be listed in public showcase");
    // Assert email leak prevention
    assert.equal(sub.user_email, undefined, "user_email must not be exposed to public");
    for (const member of sub.team_members || []) {
      assert.equal(member.email, undefined, "Team member private email must not be exposed to public");
      assert.equal(member.invite_id, undefined, "Internal invite token must not be exposed to public");
    }
  });

  test("Author can update their submission details", async () => {
    const res = await api(`/api/hackathons/${testHackathonSlug}/submissions`, {
      method: "POST",
      token: USER_TOKEN,
      body: {
        title: "NeuroMesh Agentic IDE 2.0",
        tagline: "Updated revolutionary AI development environment",
        description: "NeuroMesh 2.0 with improved performance and enhanced real-time collaboration features.",
        tech_stack: ["Next.js", "TypeScript", "Tailwind CSS"],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.submission?.title, "NeuroMesh Agentic IDE 2.0");
  });
});

describe("7. Judging & Evaluation Workflow", () => {
  test("Regular non-judge user is forbidden from judging (returns 403)", async () => {
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: USER_TOKEN,
      body: {
        submission_id: testSubmissionId,
        hackathon_id: testHackathonId,
      },
    });

    assert.equal(res.status, 403);
    assert.match(res.data?.error, /Judge or Admin privileges required/i);
  });

  test("Judge or Admin can evaluate project scorecard", async () => {
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: testSubmissionId,
        hackathon_id: testHackathonId,
        score_innovation: 10,
        score_technical: 9,
        score_design: 10,
        score_impact: 9,
        score_presentation: 10,
        feedback: "Exceptional architecture, beautiful user interface, and clear real-world utility!",
        award: "1st Place Winner",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.evaluation?.total_score, 48); // 10+9+10+9+10 = 48
    assert.equal(res.data?.evaluation?.award, "1st Place Winner");
  });

  test("Judging leaderboard reflects evaluated score and award badge", async () => {
    const res = await api(`/api/admin/judging?hackathonId=${testHackathonId}`, { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data?.submissions));
    const scoredSub = res.data.submissions.find((s: any) => s.id === testSubmissionId);
    assert.ok(scoredSub);
    assert.equal(scoredSub.total_score, 48);
    assert.equal(scoredSub.judging_status, "scored");
    assert.equal(scoredSub.winner_badge, "1st Place Winner");
    assert.equal(scoredSub.is_featured, true);
  });
});

describe("8. Admin Projects Moderation Workflow", () => {
  test("Admin can list and filter all project submissions", async () => {
    const res = await api("/api/admin/projects", { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data?.projects));
    assert.ok(res.data?.stats?.total >= 1);
  });

  test("Admin can fetch a specific project submission", async () => {
    const res = await api(`/api/admin/projects/${testSubmissionId}`, { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.project?.id, testSubmissionId);
  });

  test("Admin can moderate project properties", async () => {
    const res = await api(`/api/admin/projects/${testSubmissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        status: "approved",
        is_featured: true,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.project?.is_featured, true);
    assert.equal(res.data?.project?.status, "approved");
  });
});

describe("9. Admin User Management Workflow", () => {
  test("Admin can create a new user account", async () => {
    const newEmail = `dev_${Date.now()}@platform.io`;
    const res = await api("/api/admin/users", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Test Developer",
        email: newEmail,
        role: "user",
        bio: "AI Engineer",
        skills: ["Rust", "Python", "TypeScript"],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.user?.id);
    createdUserId = res.data.user.id;
  });

  test("Admin can promote user role to judge", async () => {
    const res = await api("/api/admin/users", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        userId: createdUserId,
        role: "judge",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.user?.role, "judge");
  });

  test("Admin cannot delete their own administrative account (protect self-deletion)", async () => {
    const res = await api(`/api/admin/users?userId=${adminUserId}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /Cannot delete your own/i);
  });

  test("Admin cannot revoke their own administrative privileges (protect self-demotion lockout)", async () => {
    const res = await api("/api/admin/users", {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        userId: adminUserId,
        role: "user",
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data?.error, "You cannot revoke your own administrative privileges.");
  });

  test("Admin can delete test user", async () => {
    const res = await api(`/api/admin/users?userId=${createdUserId}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    createdUserId = ""; // Reset since deleted
  });
});

describe("10. Admin Email Campaigns & Target Audience Workflow", () => {
  test("Admin can resolve recipient count for marketing filters", async () => {
    const res = await api("/api/admin/mail/recipients?filter=all", { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(typeof res.data?.count === "number");
  });

  test("Admin can dispatch a platform email announcement campaign", async () => {
    const res = await api("/api/admin/mail", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        subject: `E2E Announcement: Hackathon Platform Update ${Date.now()}`,
        type: "marketing",
        target_filter: "all",
        target_label: "All Platform Hackers",
        content: "Exciting new challenge tracks and rewards have launched on do4win!",
        preheader: "Check out the newest hackathons and prizes.",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.campaign?.id);
    assert.ok(res.data?.deliveredCount > 0);
  });

  test("Admin can list email campaigns history and metrics", async () => {
    const res = await api("/api/admin/mail", { token: ADMIN_TOKEN });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data?.campaigns));
    assert.ok(res.data?.stats?.totalCampaigns >= 1);
  });
});

describe("11. Admin Tags & Skills Catalog Management", () => {
  test("Public can list tags and Admin can create/delete tags", async () => {
    // List tags
    const listRes = await api("/api/admin/tags");
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data?.tags));

    // Admin create tag
    const tagName = `Tag-${Date.now()}`;
    const createRes = await api("/api/admin/tags", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: { name: tagName, category: "technology" },
    });
    assert.equal(createRes.status, 201);
    assert.ok(createRes.data?.tag?.id);
    testTagId = createRes.data.tag.id;

    // Admin delete tag
    const delRes = await api(`/api/admin/tags?id=${testTagId}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });
    assert.equal(delRes.status, 200);
  });

  test("Public can list skills and Admin can create/delete skills", async () => {
    // List skills
    const listRes = await api("/api/admin/skills");
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data?.skills));

    // Admin create skill
    const skillName = `Skill-${Date.now()}`;
    const createRes = await api("/api/admin/skills", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: { name: skillName, category: "frontend" },
    });
    assert.equal(createRes.status, 201);
    assert.ok(createRes.data?.skill?.id);
    testSkillId = createRes.data.skill.id;

    // Admin delete skill
    const delRes = await api(`/api/admin/skills?id=${testSkillId}`, {
      method: "DELETE",
      token: ADMIN_TOKEN,
    });
    assert.equal(delRes.status, 200);
  });
});
