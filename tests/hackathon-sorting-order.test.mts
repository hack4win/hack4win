import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "");

describe("Suite AQ: Hackathons Default Status Sorting Order (Live -> Upcoming -> Ended)", () => {
  let liveHackathonId = "";
  let upcomingHackathonId = "";
  let endedHackathonId = "";

  const liveSlug = `e2e-sort-live-${Date.now()}`;
  const upcomingSlug = `e2e-sort-upcoming-${Date.now()}`;
  const endedSlug = `e2e-sort-ended-${Date.now()}`;

  before(async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 1. Create a Live hackathon (started yesterday, ends in 5 days)
    const liveRows = await sql`
      INSERT INTO public.hackathons (
        title, slug, tagline, description, format, location, organizer_name,
        start_date, end_date, submission_deadline, status, prize_pool, created_at, updated_at
      )
      VALUES (
        'E2E Alpha Live Competition', ${liveSlug}, 'Currently live and active', 'Building live software', 'online', 'Global', 'Hack4Win Test',
        ${new Date(now - oneDay).toISOString()}, ${new Date(now + oneDay * 5).toISOString()}, ${new Date(now + oneDay * 4).toISOString()},
        'ongoing', '$30,000', NOW(), NOW()
      )
      RETURNING id;
    `;
    liveHackathonId = liveRows[0].id;

    // 2. Create an Upcoming hackathon (starts in 3 days, ends in 10 days)
    const upcomingRows = await sql`
      INSERT INTO public.hackathons (
        title, slug, tagline, description, format, location, organizer_name,
        start_date, end_date, submission_deadline, status, prize_pool, created_at, updated_at
      )
      VALUES (
        'E2E Beta Upcoming Challenge', ${upcomingSlug}, 'Starting soon', 'Preparing squads', 'online', 'Global', 'Hack4Win Test',
        ${new Date(now + oneDay * 3).toISOString()}, ${new Date(now + oneDay * 10).toISOString()}, ${new Date(now + oneDay * 9).toISOString()},
        'upcoming', '$50,000', NOW(), NOW()
      )
      RETURNING id;
    `;
    upcomingHackathonId = upcomingRows[0].id;

    // 3. Create an Ended hackathon (started 10 days ago, ended 2 days ago)
    const endedRows = await sql`
      INSERT INTO public.hackathons (
        title, slug, tagline, description, format, location, organizer_name,
        start_date, end_date, submission_deadline, status, prize_pool, created_at, updated_at
      )
      VALUES (
        'E2E Gamma Concluded Contest', ${endedSlug}, 'Already finished', 'Winners announced', 'online', 'Global', 'Hack4Win Test',
        ${new Date(now - oneDay * 10).toISOString()}, ${new Date(now - oneDay * 2).toISOString()}, ${new Date(now - oneDay * 3).toISOString()},
        'ended', '$20,000', NOW(), NOW()
      )
      RETURNING id;
    `;
    endedHackathonId = endedRows[0].id;
  });

  after(async () => {
    const ids = [liveHackathonId, upcomingHackathonId, endedHackathonId].filter(Boolean);
    if (ids.length > 0) {
      await sql`DELETE FROM public.hackathons WHERE id = ANY(${ids}::uuid[]);`;
    }
  });

  it("AQ.1. Browse page /hackathons renders with Sort selector showing default (Live -> Upcoming -> Ended)", async () => {
    const res = await fetch(`${BASE_URL}/hackathons`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(
      html.includes("Default (Live → Upcoming → Ended)"),
      "Page must render the default sort option describing Live -> Upcoming -> Ended ordering"
    );
  });

  it("AQ.2. Default order renders Live hackathons first, then Upcoming, then Ended", async () => {
    const res = await fetch(`${BASE_URL}/hackathons`);
    assert.equal(res.status, 200);
    const html = await res.text();

    const liveIndex = html.indexOf(liveSlug);
    const upcomingIndex = html.indexOf(upcomingSlug);
    const endedIndex = html.indexOf(endedSlug);

    assert.ok(liveIndex !== -1, `Live hackathon (${liveSlug}) must be rendered on page`);
    assert.ok(upcomingIndex !== -1, `Upcoming hackathon (${upcomingSlug}) must be rendered on page`);
    assert.ok(endedIndex !== -1, `Ended hackathon (${endedSlug}) must be rendered on page`);

    assert.ok(
      liveIndex < upcomingIndex,
      `Live hackathon (index ${liveIndex}) must appear BEFORE Upcoming hackathon (index ${upcomingIndex})`
    );

    assert.ok(
      upcomingIndex < endedIndex,
      `Upcoming hackathon (index ${upcomingIndex}) must appear BEFORE Ended hackathon (index ${endedIndex})`
    );
  });

  it("AQ.3. Explicit ?sort=default preserves the Live -> Upcoming -> Ended order", async () => {
    const res = await fetch(`${BASE_URL}/hackathons?sort=default`);
    assert.equal(res.status, 200);
    const html = await res.text();

    const liveIndex = html.indexOf(liveSlug);
    const upcomingIndex = html.indexOf(upcomingSlug);
    const endedIndex = html.indexOf(endedSlug);

    assert.ok(liveIndex < upcomingIndex, "Live must appear before Upcoming with ?sort=default");
    assert.ok(upcomingIndex < endedIndex, "Upcoming must appear before Ended with ?sort=default");
  });
});
