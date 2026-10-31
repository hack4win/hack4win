import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { db } from "@/lib/db";
import { User } from "@/lib/db/types";

/**
 * OAuth Callback Handler for Hack4Win Platform
 * 
 * Handles Google OAuth and external SSO redirects:
 * 1. Exchanges `neon_auth_session_verifier` token with Neon Auth service for session tokens.
 * 2. Mirrors and sets first-party session cookies on the application domain.
 * 3. Automatically syncs new Google users into `public.users`.
 * 4. Checks username onboarding state and routes appropriately.
 */

const NEON_AUTH_BASE_URL =
  process.env.NEON_AUTH_BASE_URL ||
  "https://ep-little-dew-b3gw3u3i.neonauth.c-4.ap-southeast-1.aws.neon.tech/do4win/auth";

function processSetCookieHeaders(setCookieHeaders: string[], responseHeaders: Headers) {
  for (const cookieStr of setCookieHeaders) {
    // 1. Remove Domain attribute so cookie attaches to current host
    let adjusted = cookieStr.replace(/;\s*Domain=[^;]+/gi, "");

    // 2. Remove Partitioned attribute
    adjusted = adjusted.replace(/;\s*Partitioned/gi, "");

    // 3. Change SameSite=None to SameSite=Lax for 1st-party cookie
    adjusted = adjusted.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    if (!/SameSite=/i.test(adjusted)) {
      adjusted += "; SameSite=Lax";
    }

    // 4. Ensure Secure attribute is present
    if (!/;\s*Secure/i.test(adjusted)) {
      adjusted += "; Secure";
    }

    responseHeaders.append("set-cookie", adjusted);

    // 5. Mirror neon-auth cookie as better-auth cookie so both client libraries find it
    if (adjusted.includes("neon-auth.")) {
      const mirroredBetterAuth = adjusted.replace(/neon-auth\./g, "better-auth.");
      responseHeaders.append("set-cookie", mirroredBetterAuth);
    }

    // 6. Fallback for non-secure HTTP environments (strip __Secure- prefix and Secure attribute)
    if (adjusted.includes("__Secure-")) {
      const nonSecureCookie = adjusted
        .replace(/__Secure-/g, "")
        .replace(/;\s*Secure/gi, "");
      responseHeaders.append("set-cookie", nonSecureCookie);

      if (nonSecureCookie.includes("neon-auth.")) {
        const nonSecureBetterAuth = nonSecureCookie.replace(/neon-auth\./g, "better-auth.");
        responseHeaders.append("set-cookie", nonSecureBetterAuth);
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const verifier = url.searchParams.get("neon_auth_session_verifier");
  const rawCallbackUrl = url.searchParams.get("callbackUrl") || "/profile";

  // Prevent open redirect by validating callbackUrl is an internal path
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/profile";

  const responseHeaders = new Headers();

  // 1. If OAuth session verifier is present, exchange it with Neon Auth
  if (verifier) {
    try {
      const targetUrl = `${NEON_AUTH_BASE_URL}/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`;
      const exchangeHeaders = new Headers();
      exchangeHeaders.set("cookie", req.headers.get("cookie") || "");
      exchangeHeaders.set("user-agent", req.headers.get("user-agent") || "");
      const neonOrigin = new URL(NEON_AUTH_BASE_URL).origin;
      exchangeHeaders.set("origin", neonOrigin);

      const upstreamRes = await fetch(targetUrl, {
        method: "GET",
        headers: exchangeHeaders,
        redirect: "manual",
      });

      if (upstreamRes.ok) {
        const setCookieHeaders = upstreamRes.headers.getSetCookie();
        if (setCookieHeaders && setCookieHeaders.length > 0) {
          processSetCookieHeaders(setCookieHeaders, responseHeaders);
        }

        const data = await upstreamRes.json().catch(() => null);
        const userId = data?.user?.id || data?.session?.userId;

        if (userId) {
          // Look up user in public.users
          let user = await userRepository.findById(String(userId));

          // If user does not exist in public.users yet, provision from neon_auth.user
          if (!user) {
            const neonUsers = await db`
              SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt"
              FROM neon_auth.user
              WHERE id = ${String(userId)}::uuid
              LIMIT 1;
            `;

            if (neonUsers && neonUsers.length > 0) {
              const nu = neonUsers[0];
              const inserted = await db`
                INSERT INTO public.users (id, name, username, email, email_verified, image, role, created_at, updated_at)
                VALUES (
                  ${nu.id.toString()},
                  ${nu.name},
                  NULL,
                  ${nu.email},
                  ${Boolean(nu.emailVerified)},
                  ${nu.image},
                  ${nu.role || "user"},
                  ${nu.createdAt || new Date()},
                  ${nu.updatedAt || new Date()}
                )
                ON CONFLICT (id) DO UPDATE SET
                  name = COALESCE(EXCLUDED.name, public.users.name),
                  email = COALESCE(EXCLUDED.email, public.users.email),
                  image = COALESCE(EXCLUDED.image, public.users.image),
                  updated_at = NOW()
                RETURNING *;
              `;
              user = inserted[0] as unknown as User;
            }
          }

          // If user does not have a username chosen, route to choose-username
          if (!user || !user.username) {
            const chooseUsernameUrl = new URL("/auth/choose-username", req.url);
            chooseUsernameUrl.searchParams.set("callbackUrl", callbackUrl);
            return NextResponse.redirect(chooseUsernameUrl, {
              status: 307,
              headers: responseHeaders,
            });
          }
        }

        return NextResponse.redirect(new URL(callbackUrl, req.url), {
          status: 307,
          headers: responseHeaders,
        });
      } else {
        const errorText = await upstreamRes.text().catch(() => "");
        console.error("[OAuth Verifier Exchange Failed]:", upstreamRes.status, errorText);
      }
    } catch (err) {
      console.error("[OAuth Callback Error]:", err);
    }
  }

  // 2. Fallback: Check existing session if already established via cookie
  const session = await getServerSession();
  if (session) {
    const user = await userRepository.findById(session.user.id);
    if (!user?.username) {
      const chooseUsernameUrl = new URL("/auth/choose-username", req.url);
      chooseUsernameUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(chooseUsernameUrl, {
        status: 307,
        headers: responseHeaders,
      });
    }

    return NextResponse.redirect(new URL(callbackUrl, req.url), {
      status: 307,
      headers: responseHeaders,
    });
  }

  // 3. Neither verifier nor existing session succeeded -> redirect back to signin with error indicator
  const signInUrl = new URL("/auth/signin", req.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  if (verifier) {
    signInUrl.searchParams.set("error", "oauth_failed");
  }
  return NextResponse.redirect(signInUrl, { headers: responseHeaders });
}
