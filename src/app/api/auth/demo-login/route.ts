import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/db/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Demo / Test Roles Authentication Service
 * 
 * Provides instant 1-click test sign-in for all 4 Hack4Win platform roles:
 * - Admin (full platform control)
 * - Organizer (hackathon management)
 * - Judge (project evaluations & rubrics)
 * - Builder / User (participant submissions & teams)
 */

export const DEMO_ACCOUNTS: Record<
  UserRole,
  {
    id: string;
    name: string;
    username: string;
    email: string;
    role: UserRole;
    bio: string;
    description: string;
  }
> = {
  admin: {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "Alex Admin",
    username: "demo_admin",
    email: "admin@hack4win.online",
    role: "admin",
    bio: "Platform Administrator & Operations Lead for Hack4Win",
    description: "Full platform permissions: user management, site settings, all hackathons.",
  },
  organizer: {
    id: "a0000000-0000-4000-8000-000000000002",
    name: "Olivia Organizer",
    username: "demo_organizer",
    email: "organizer@hack4win.online",
    role: "organizer",
    bio: "Hackathon Host, DevRel & Global Community Lead",
    description: "Organizer access: host, publish, and manage sponsored competitions.",
  },
  judge: {
    id: "a0000000-0000-4000-8000-000000000003",
    name: "Julian Judge",
    username: "demo_judge",
    email: "judge@hack4win.online",
    role: "judge",
    bio: "Senior Technical Evaluator & Systems Architect",
    description: "Judge access: evaluate hackathon submissions, score rubrics, and feedback.",
  },
  user: {
    id: "a0000000-0000-4000-8000-000000000004",
    name: "Blake Builder",
    username: "demo_builder",
    email: "builder@hack4win.online",
    role: "user",
    bio: "Full-Stack Developer & Passionate Hackathon Hacker",
    description: "Participant access: register for challenges, build teams, submit hacks.",
  },
};

export async function GET() {
  if ((process.env.NODE_ENV as string) === "production") {
    return NextResponse.json(
      { error: "Demo accounts are disabled in production environment." },
      { status: 403 }
    );
  }
  return NextResponse.json({
    accounts: Object.values(DEMO_ACCOUNTS),
  });
}

export async function POST(req: NextRequest) {
  try {
    if ((process.env.NODE_ENV as string) === "production") {
      return NextResponse.json(
        { error: "Demo accounts are disabled in production environment." },
        { status: 403 }
      );
    }
    const clientIp = getClientIp(req);
    const isTestOrLocal = (process.env.NODE_ENV as string) !== "production" && (clientIp === "127.0.0.1" || clientIp === "::1");
    const limit = isTestOrLocal ? 200 : 15;
    const limiter = rateLimit(`demo_login:${clientIp}`, limit, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const role = (body.role || "").toLowerCase().trim() as UserRole;
    const email = (body.email || "").toLowerCase().trim();

    let targetAccount = DEMO_ACCOUNTS[role];
    if (!targetAccount && email) {
      targetAccount = Object.values(DEMO_ACCOUNTS).find((a) => a.email === email)!;
    }

    if (!targetAccount) {
      return NextResponse.json(
        { error: "Invalid demo role. Allowed roles: admin, organizer, judge, user" },
        { status: 400 }
      );
    }

    // Ensure the demo account exists in public.users and neon_auth.user
    await db`
      INSERT INTO neon_auth.user (
        id, name, email, "emailVerified", role, image, "createdAt", "updatedAt"
      ) VALUES (
        ${targetAccount.id}::uuid,
        ${targetAccount.name},
        ${targetAccount.email},
        true,
        ${targetAccount.role},
        ${"https://api.dicebear.com/7.x/bottts/svg?seed=" + targetAccount.role},
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        "updatedAt" = NOW();
    `;

    await db`
      INSERT INTO public.users (
        id, name, username, email, email_verified, image, role, bio, created_at, updated_at
      ) VALUES (
        ${targetAccount.id},
        ${targetAccount.name},
        ${targetAccount.username},
        ${targetAccount.email},
        true,
        ${"https://api.dicebear.com/7.x/bottts/svg?seed=" + targetAccount.role},
        ${targetAccount.role},
        ${targetAccount.bio},
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        bio = EXCLUDED.bio,
        updated_at = NOW();
    `;

    // Create session in neon_auth.session
    const sessionToken = "demo_token_" + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await db`
      INSERT INTO neon_auth.session (
        id, "userId", token, "expiresAt", "createdAt", "updatedAt"
      ) VALUES (
        ${crypto.randomUUID()}::uuid,
        ${targetAccount.id}::uuid,
        ${sessionToken},
        ${expiresAt},
        NOW(),
        NOW()
      );
    `;

    let redirectUrl = "/hackathons";
    if (targetAccount.role === "admin") {
      redirectUrl = "/admin";
    } else if (targetAccount.role === "organizer") {
      redirectUrl = "/organizer";
    } else if (targetAccount.role === "judge") {
      redirectUrl = "/judges";
    }

    const response = NextResponse.json({
      success: true,
      user: targetAccount,
      redirectUrl,
    });

    const isSecure = (process.env.NODE_ENV as string) === "production" && !req.url.includes("localhost");
    const cookieOpts = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      expires: expiresAt,
      secure: isSecure,
    };

    response.cookies.set("neon-auth.session_token", sessionToken, cookieOpts);
    response.cookies.set("better-auth.session_token", sessionToken, cookieOpts);

    return response;
  } catch (error) {
    console.error("[Demo Login Error]:", error);
    return NextResponse.json(
      { error: "Failed to establish demo session" },
      { status: 500 }
    );
  }
}
