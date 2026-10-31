import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { User, AuthSession } from "@/lib/db/types";

/**
 * Server-side Session Management Service
 * 
 * Directly queries the Neon PostgreSQL session store for fast, reliable,
 * zero-network-hop session validation in Server Components and Route Handlers.
 * Wrapped in React cache() for zero-cost per-request deduplication.
 */

export const getServerSession = cache(async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("neon-auth.session_token")?.value ||
    cookieStore.get("__Secure-neon-auth.session_token")?.value ||
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    // In Better Auth, cookies are frequently signed as `token.signature`.
    // The database column s.token stores the token component before the period.
    const decodedToken = decodeURIComponent(sessionToken);
    const tokenPart = decodedToken.split(".")[0];

    const rows = await db`
      SELECT 
        s.id AS session_id,
        s.token AS session_token,
        s."expiresAt" AS session_expires_at,
        s."userId"::text AS session_user_id,
        u.id,
        u.name,
        u.username,
        u.email,
        u.email_verified,
        u.image,
        u.role,
        u.bio,
        u.github_username,
        u.skills,
        u.website,
        u.country,
        u.created_at,
        u.updated_at
      FROM neon_auth.session s
      LEFT JOIN public.users u ON u.id = s."userId"::text
      WHERE (s.token = ${sessionToken} OR s.token = ${decodedToken} OR s.token = ${tokenPart})
        AND s."expiresAt" > NOW()
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // If user record wasn't found in public.users, fetch from neon_auth.user and insert with username = NULL
    let userRecord: User;
    if (!row.id) {
      const neonUser = await db`
        SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt"
        FROM neon_auth.user
        WHERE id = ${row.session_user_id}::uuid
        LIMIT 1;
      `;

      if (!neonUser || neonUser.length === 0) {
        return null;
      }

      const nu = neonUser[0];
      const inserted = await db`
        INSERT INTO public.users (id, name, username, email, email_verified, image, role, created_at, updated_at)
        VALUES (
          ${nu.id.toString()},
          ${nu.name},
          NULL,
          ${nu.email},
          ${Boolean(nu.emailVerified)},
          ${nu.image},
          ${nu.role || 'user'},
          ${nu.createdAt || new Date()},
          ${nu.updatedAt || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          image = EXCLUDED.image,
          updated_at = NOW()
        RETURNING *;
      `;

      userRecord = inserted[0] as unknown as User;

      // Link any pending team invitations sent to this email address
      if (nu.email) {
        db`
          UPDATE public.team_invitations
          SET receiver_id = ${nu.id.toString()}, updated_at = NOW()
          WHERE receiver_id IS NULL AND LOWER(receiver_email) = LOWER(${nu.email});
        `.catch(() => {});
      }
    } else {
      userRecord = {
        id: row.id,
        name: row.name,
        username: row.username || null,
        email: row.email,
        email_verified: Boolean(row.email_verified),
        image: row.image,
        role: row.role || "user",
        bio: row.bio,
        github_username: row.github_username,
        skills: row.skills || [],
        website: row.website,
        country: row.country || "India",
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        username: userRecord.username || null,
        image: userRecord.image,
        role: userRecord.role,
        emailVerified: userRecord.email_verified,
      },
      session: {
        id: row.session_id,
        userId: row.session_user_id,
        expiresAt: row.session_expires_at,
        token: row.session_token,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[getServerSession Error]:", error);
    return null;
  }
});

/**
 * Require an authenticated session in Server Actions / Components
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Require an admin session in Server Actions / Components
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    throw new Error("FORBIDDEN_ADMIN_REQUIRED");
  }
  return session;
}
