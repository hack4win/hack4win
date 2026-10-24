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

describe("Suite AO: Private Hackathons Customizations & Student Roster Management", () => {
  let hackathonId = "";
  let hackathonSlug = "";
  let inviteToken = "";
  let organizerUserId = "";
  let studentUserId = "";
  let pendingStudentUserId = "";
  let inviteStudentUserId = "";

  const ORGANIZER_EMAIL = `org_campus_${Date.now()}@university.edu`;
  const STUDENT_EMAIL = `student_campus_${Date.now()}@university.edu`;
  const WHITELIST_EXTRA_EMAIL = `pending_student_${Date.now()}@gmail.com`;
  const PENDING_STUDENT_EMAIL = `code_student_${Date.now()}@external.org`;
  const INVITE_STUDENT_EMAIL = `invite_student_${Date.now()}@external.org`;

  const ORGANIZER_TOKEN = "e2e_org_campus_tok_" + Date.now();
  const STUDENT_TOKEN = "e2e_student_campus_tok_" + Date.now();
  const PENDING_STUDENT_TOKEN = "e2e_pending_code_tok_" + Date.now();
  const INVITE_STUDENT_TOKEN = "e2e_invite_tok_" + Date.now();

  before(async () => {
    // 1. Create Organizer User
    organizerUserId = await createActor("organizer", "Prof Campus Organizer", ORGANIZER_EMAIL);

    // 2. Create Student User (domain-whitelisted)
    studentUserId = await createActor("user", "Jane Doe Student", STUDENT_EMAIL);

    // 3. Create External Students (who use access code or invite link)
    pendingStudentUserId = await createActor("user", "Bob Leaked Code", PENDING_STUDENT_EMAIL);
    inviteStudentUserId = await createActor("user", "Alice Invite Link", INVITE_STUDENT_EMAIL);

    // 4. Create Sessions in neon_auth.session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES
        (${crypto.randomUUID()}::uuid, ${organizerUserId}::uuid, ${ORGANIZER_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${studentUserId}::uuid, ${STUDENT_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${pendingStudentUserId}::uuid, ${PENDING_STUDENT_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${inviteStudentUserId}::uuid, ${INVITE_STUDENT_TOKEN}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;
  });

  after(async () => {
    if (hackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${hackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${hackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${hackathonId}::uuid;`;
    }
    await sql`DELETE FROM neon_auth.session WHERE token IN (${ORGANIZER_TOKEN}, ${STUDENT_TOKEN}, ${PENDING_STUDENT_TOKEN}, ${INVITE_STUDENT_TOKEN});`;
    const userIds = [organizerUserId, studentUserId, pendingStudentUserId, inviteStudentUserId].filter(Boolean);
    if (userIds.length > 0) {
      await sql`DELETE FROM public.users WHERE id = ANY(${userIds});`;
      await sql`DELETE FROM neon_auth.user WHERE id = ANY(${userIds.map((id) => id)}::uuid[]);`;
    }
  });

  it("AO.1. Organizer can create a Private Campus Hackathon with custom access controls", async () => {
    hackathonSlug = `campus-ai-challenge-${Date.now()}`;
    const payload = {
      title: "MIT & Stanford Campus AI Challenge 2026",
      slug: hackathonSlug,
      tagline: "Exclusive campus hackathon for university researchers",
      description: "Build cutting-edge agentic workflows with university peers.",
      format: "hybrid",
      location: "Cambridge, MA & Virtual",
      prize_pool: "$25,000",
      currency: "USD",
      is_private: true,
      access_code: "CAMPUS-PASS-2026",
      allowed_email_domains: ["university.edu", "mit.edu", "stanford.edu"],
      invited_emails: [WHITELIST_EXTRA_EMAIL],
      start_date: new Date(Date.now() - 3600000).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      submission_deadline: new Date(Date.now() + 86400000 * 6).toISOString(),
    };

    const res = await fetch(`${BASE_URL}/api/admin/hackathons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201, "Expected 201 Created for organizer creating hackathon");
    const data = await res.json();
    assert.equal(data.success, true);
    hackathonId = data.hackathon.id;
    inviteToken = data.hackathon.invite_token;
    assert.ok(hackathonId, "Hackathon ID must be returned");
    assert.ok(inviteToken, "Secret invite token must be generated");
    assert.equal(data.hackathon.is_private, true);
  });

  it("AO.2. Student can register with custom campus questionnaire credentials (student_id, branch, year)", async () => {
    const regPayload = {
      participation_type: "solo",
      student_id: "STU-2026-CS99",
      college_name: "Massachusetts Institute of Technology",
      academic_year: "3rd Year",
      branch: "Computer Science & Artificial Intelligence",
    };

    const res = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${STUDENT_TOKEN}`,
      },
      body: JSON.stringify(regPayload),
    });

    assert.equal(res.status, 200, "Expected 200 OK for student registration");
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.registered, true);
  });

  it("AO.3. Student Roster API returns extended student details and submission tracking", async () => {
    const res = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "GET",
      headers: {
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.registered_count, 1);

    const studentRecord = data.registered_students[0];
    assert.equal(studentRecord.user_id, studentUserId);
    assert.equal(studentRecord.student_id, "STU-2026-CS99");
    assert.equal(studentRecord.college_name, "Massachusetts Institute of Technology");
    assert.equal(studentRecord.academic_year, "3rd Year");
    assert.equal(studentRecord.branch, "Computer Science & Artificial Intelligence");
    assert.equal(studentRecord.has_submitted, false);
    assert.equal(studentRecord.submission_id, null);
  });

  it("AO.4. Submitting a project updates student's submission status on the roster", async () => {
    // Student submits a project
    const subPayload = {
      title: "Agentic Campus Tutor",
      tagline: "AI tutor built for university students",
      description: "Automated tutoring system powered by multimodal models.",
      repository_url: "https://github.com/hack4win/agentic-tutor",
      demo_url: "https://tutor.demo.hack4win.online",
      tech_stack: ["TypeScript", "Next.js", "PostgreSQL"],
    };

    const submitRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${STUDENT_TOKEN}`,
      },
      body: JSON.stringify(subPayload),
    });

    assert.equal(submitRes.status, 200);
    const subData = await submitRes.json();
    assert.ok(subData.submission?.id);

    // Organizer inspects roster again
    const res = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "GET",
      headers: {
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const studentRecord = data.registered_students[0];
    assert.equal(studentRecord.has_submitted, true);
    assert.equal(studentRecord.submission_id, subData.submission.id);
    assert.equal(studentRecord.submission_title, "Agentic Campus Tutor");
  });

  it("AO.5. Organizer can remove an email from the student whitelist", async () => {
    const res = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
      body: JSON.stringify({
        action: "remove_email",
        email: WHITELIST_EXTRA_EMAIL,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(!data.invited_emails.includes(WHITELIST_EXTRA_EMAIL));
  });

  it("AO.6. Organizer can trigger a direct VIP invitation email dispatch", async () => {
    const testRecipient = "invited_test_student@university.edu";
    const res = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
      body: JSON.stringify({
        action: "send_invite",
        email: testRecipient,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes(testRecipient));
  });

  it("AO.7. Verification endpoint accepts either ?invite= or ?token= parameters interchangeably", async () => {
    // 1. Using ?invite=
    const res1 = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/verify-access?invite=${inviteToken}`);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.allowed, true);
    assert.equal(data1.reason, "invite_token");

    // 2. Using ?token=
    const res2 = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/verify-access?token=${inviteToken}`);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.allowed, true);
    assert.equal(data2.reason, "invite_token");
  });

  it("AO.8. Dedicated Organizer Student Roster page (/organizer/hackathons/[id]/students) returns HTTP 200", async () => {
    const res = await fetch(`${BASE_URL}/organizer/hackathons/${hackathonId}/students`, {
      headers: {
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
    });

    assert.equal(res.status, 200, "Organizer student roster portal page must render HTTP 200");
    const html = await res.text();
    assert.ok(html.includes("Campus Student Roster"), "Page must contain Roster header");
  });

  it("AO.9. Student registering via campus access code receives pending verification status", async () => {
    const regRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${PENDING_STUDENT_TOKEN}`,
      },
      body: JSON.stringify({
        participation_type: "solo",
        access_code: "CAMPUS-PASS-2026",
        student_id: "EXT-8821",
        college_name: "External University",
        academic_year: "4th Year",
        branch: "Cybersecurity",
      }),
    });

    assert.equal(regRes.status, 200, "Registration using valid access code should succeed");
    const regData = await regRes.json();
    assert.equal(regData.registered, true);
    assert.equal(regData.status, "pending", "Campus access code registration must be pending verification");
    assert.equal(regData.requires_verification, true);
  });

  it("AO.10. Student with pending verification status cannot submit project (HTTP 403)", async () => {
    const subRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${PENDING_STUDENT_TOKEN}`,
      },
      body: JSON.stringify({
        title: "Blocked Campus Project",
        tagline: "Attempt before approval",
        description: "Trying to submit while registration status is pending verification.",
        demo_url: "https://demo.hack4win.online",
        github_url: "https://github.com/hack4win/pending-test",
        video_url: "https://youtube.com/watch?v=pending",
        cover_image: "https://hack4win.online/cover.png",
      }),
    });

    assert.equal(subRes.status, 403, "Submissions must be blocked while registration is pending verification");
    const subData = await subRes.json();
    assert.equal(subData.registration_status, "pending");
    assert.ok(subData.error.includes("pending organizer verification"));
  });

  it("AO.11. Organizer can review and approve pending student from roster API", async () => {
    // 1. Verify roster reports the student as pending
    const rosterRes = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      headers: {
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
    });
    assert.equal(rosterRes.status, 200);
    const rosterData = await rosterRes.json();
    const pendingStudent = rosterData.registered_students.find((s: any) => s.user_id === pendingStudentUserId);
    assert.ok(pendingStudent, "Pending student must be in roster");
    assert.equal(pendingStudent.status, "pending", "Roster must report pending status");

    // 2. Organizer approves student
    const approveRes = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
      body: JSON.stringify({
        action: "approve_student",
        student_user_id: pendingStudentUserId,
      }),
    });

    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.success, true);
    assert.equal(approveData.status, "approved");
  });

  it("AO.12. Approved student can now successfully submit project", async () => {
    const subRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${PENDING_STUDENT_TOKEN}`,
      },
      body: JSON.stringify({
        title: "Verified Campus Project",
        tagline: "Submission after organizer approval",
        description: "Now allowed to submit after campus credentials verified.",
        demo_url: "https://demo.hack4win.online",
        github_url: "https://github.com/hack4win/approved-test",
        video_url: "https://youtube.com/watch?v=approved",
        cover_image: "https://hack4win.online/cover.png",
      }),
    });

    assert.equal(subRes.status, 200, "Approved student should submit successfully");
    const subData = await subRes.json();
    assert.ok(subData.submission?.id);
  });

  it("AO.13. Student registering via secret invite token receives pending verification status", async () => {
    const regRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/register?invite=${inviteToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${INVITE_STUDENT_TOKEN}`,
      },
      body: JSON.stringify({
        participation_type: "solo",
        student_id: "INV-9900",
        college_name: "Invite Campus College",
        academic_year: "2nd Year",
        branch: "Data Science",
      }),
    });

    assert.equal(regRes.status, 200);
    const regData = await regRes.json();
    assert.equal(regData.registered, true);
    assert.equal(regData.status, "pending", "Invite token registration must be pending verification");
    assert.equal(regData.requires_verification, true);
  });

  it("AO.14. Organizer can reject registration, preventing project submissions", async () => {
    // 1. Organizer rejects registration
    const rejectRes = await fetch(`${BASE_URL}/api/organizer/hackathons/${hackathonId}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}`,
      },
      body: JSON.stringify({
        action: "reject_student",
        student_user_id: inviteStudentUserId,
      }),
    });

    assert.equal(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.success, true);
    assert.equal(rejectData.status, "rejected");

    // 2. Rejected student attempts to submit a project
    const subRes = await fetch(`${BASE_URL}/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `neon-auth.session_token=${INVITE_STUDENT_TOKEN}`,
      },
      body: JSON.stringify({
        title: "Rejected Student Project",
        tagline: "Attempt after rejection",
        description: "Trying to submit after registration was rejected.",
        demo_url: "https://demo.hack4win.online",
        github_url: "https://github.com/hack4win/rejected-test",
        video_url: "https://youtube.com/watch?v=rejected",
        cover_image: "https://hack4win.online/cover.png",
      }),
    });

    assert.equal(subRes.status, 403, "Rejected student submission must be blocked with HTTP 403");
    const subData = await subRes.json();
    assert.equal(subData.registration_status, "rejected");
  });
});
