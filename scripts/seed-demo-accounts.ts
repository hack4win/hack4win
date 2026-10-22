import { db } from "../src/lib/db/index.ts";

export const DEMO_USERS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "Alex Admin",
    username: "demo_admin",
    email: "admin@hack4win.online",
    role: "admin",
    bio: "Platform Administrator & Operations Lead for Hack4Win",
    skills: ["DevOps", "Security", "Management"],
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    name: "Olivia Organizer",
    username: "demo_organizer",
    email: "organizer@hack4win.online",
    role: "organizer",
    bio: "Hackathon Host, DevRel & Global Community Lead",
    skills: ["Event Ops", "Community", "Public Relations"],
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=organizer",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    name: "Julian Judge",
    username: "demo_judge",
    email: "judge@hack4win.online",
    role: "judge",
    bio: "Senior Technical Evaluator & Systems Architect",
    skills: ["Architecture", "Code Review", "AI/ML"],
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=judge",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    name: "Blake Builder",
    username: "demo_builder",
    email: "builder@hack4win.online",
    role: "user",
    bio: "Full-Stack Developer & Passionate Hackathon Hacker",
    skills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=builder",
  },
];

export async function seedDemoAccounts() {
  console.log("Seeding Hack4Win demo accounts...");
  for (const u of DEMO_USERS) {
    // 1. neon_auth.user
    await db`
      INSERT INTO neon_auth.user (
        id, name, email, "emailVerified", role, image, "createdAt", "updatedAt"
      ) VALUES (
        ${u.id}::uuid, ${u.name}, ${u.email}, true, ${u.role}, ${u.image}, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        image = EXCLUDED.image,
        "updatedAt" = NOW();
    `;

    // 2. public.users
    await db`
      INSERT INTO public.users (
        id, name, username, email, email_verified, image, role, bio, skills, created_at, updated_at
      ) VALUES (
        ${u.id}, ${u.name}, ${u.username}, ${u.email}, true, ${u.image}, ${u.role}, ${u.bio}, ${u.skills}, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        image = EXCLUDED.image,
        updated_at = NOW();
    `;
    console.log(`✓ Seeded demo account: ${u.email} [${u.role}] (@${u.username})`);
  }
  console.log("All demo accounts are ready!");
}

if (process.argv[1]?.endsWith("seed-demo-accounts.ts") || process.argv[1]?.endsWith("seed-demo-accounts.js")) {
  seedDemoAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to seed demo accounts:", err);
      process.exit(1);
    });
}
