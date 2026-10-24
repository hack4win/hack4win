import { db } from "../src/lib/db/index.ts";

async function main() {
  console.log("Starting production database cleanup...");

  const adminEmail = "khanakram8435@gmail.com";

  // Verify that the target admin exists before proceeding
  const adminCheck = await db.query(
    `SELECT id, name, email, role FROM public.users WHERE email = $1;`,
    [adminEmail]
  );

  if (adminCheck.length === 0) {
    throw new Error(`Target admin ${adminEmail} not found in public.users! Aborting cleanup to prevent lockout.`);
  }

  const adminUser = adminCheck[0];
  const adminId = adminUser.id;
  console.log(`Found target admin to preserve: ${adminUser.name} (${adminUser.email}), id: ${adminId}`);

  // Begin cleanup in sequence respecting foreign key constraints
  console.log("1. Deleting project evaluations...");
  await db.query(`DELETE FROM public.project_evaluations;`);

  console.log("2. Deleting team invitations...");
  await db.query(`DELETE FROM public.team_invitations;`);

  console.log("3. Deleting hackathon submissions...");
  await db.query(`DELETE FROM public.hackathon_submissions;`);

  console.log("4. Deleting hackathon registrations...");
  await db.query(`DELETE FROM public.hackathon_registrations;`);

  console.log("5. Deleting hackathon judges...");
  await db.query(`DELETE FROM public.hackathon_judges;`);

  console.log("6. Deleting email campaigns...");
  await db.query(`DELETE FROM public.email_campaigns;`);

  console.log("7. Deleting host inquiries...");
  await db.query(`DELETE FROM public.host_inquiries;`);

  console.log("8. Deleting hackathons...");
  await db.query(`DELETE FROM public.hackathons;`);

  console.log("9. Cleaning up neon_auth tables (keeping admin sessions/accounts)...");
  await db.query(`DELETE FROM neon_auth.session WHERE "userId" != $1::uuid;`, [adminId]);
  await db.query(`DELETE FROM neon_auth.account WHERE "userId" != $1::uuid;`, [adminId]);
  await db.query(`DELETE FROM neon_auth.member WHERE "userId" != $1::uuid;`, [adminId]);
  await db.query(`DELETE FROM neon_auth.invitation WHERE "inviterId" != $1::uuid;`, [adminId]);
  await db.query(`DELETE FROM neon_auth.verification;`);

  console.log("10. Deleting all other users from neon_auth.user...");
  await db.query(
    `DELETE FROM neon_auth.user WHERE email != $1 AND id != $2::uuid;`,
    [adminEmail, adminId]
  );

  console.log("11. Deleting all other users from public.users...");
  await db.query(
    `DELETE FROM public.users WHERE email != $1 AND id != $2;`,
    [adminEmail, adminId]
  );

  console.log("12. Ensuring admin user has role 'admin' and verified status in both schemas...");
  await db.query(
    `UPDATE public.users SET role = 'admin', email_verified = true WHERE id = $1;`,
    [adminId]
  );
  await db.query(
    `UPDATE neon_auth.user SET role = 'admin', "emailVerified" = true WHERE id = $1::uuid;`,
    [adminId]
  );

  console.log("\n--- POST-CLEANUP ROW COUNTS ---");
  const tables = [
    "public.users",
    "public.hackathons",
    "public.hackathon_submissions",
    "public.hackathon_registrations",
    "public.hackathon_judges",
    "public.project_evaluations",
    "public.team_invitations",
    "public.email_campaigns",
    "public.host_inquiries",
    "public.tags",
    "public.skills",
    "neon_auth.user",
    "neon_auth.session",
    "neon_auth.account",
  ];

  for (const t of tables) {
    const res = await db.query(`SELECT count(*) FROM ${t};`);
    console.log(t.padEnd(32), res[0].count);
  }

  const remainingPubUser = await db.query(`SELECT id, name, email, role FROM public.users;`);
  console.log("\nRemaining public.users:", remainingPubUser);

  const remainingNeonUser = await db.query(`SELECT id, name, email, role FROM neon_auth.user;`);
  console.log("Remaining neon_auth.user:", remainingNeonUser);

  console.log("\nDatabase successfully cleaned and ready for production!");
}

main().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
