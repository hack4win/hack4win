import { NextRequest, NextResponse } from "next/server";

/**
 * Neon Auth Proxy Route Handler
 * 
 * Proxies Better Auth requests between Next.js client/server and Neon Auth service.
 * Ensures cookies are set on the application domain as 1st-party cookies,
 * preventing cross-site cookie restrictions while enabling seamless SSR auth.
 */

const NEON_AUTH_BASE_URL =
  process.env.NEON_AUTH_BASE_URL ||
  "https://ep-little-dew-b3gw3u3i.neonauth.c-4.ap-southeast-1.aws.neon.tech/do4win/auth";

async function proxyAuthRequest(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/auth/, "");
  const targetUrl = `${NEON_AUTH_BASE_URL}${path}${url.search}`;

  const forwardHeaders = new Headers();
  const allowedHeaders = [
    "accept",
    "authorization",
    "content-type",
    "cookie",
    "user-agent",
  ];

  for (const [key, value] of req.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (allowedHeaders.includes(lowerKey)) {
      forwardHeaders.set(key, value);
    }
  }

  // Ensure origin is set to application origin
  forwardHeaders.set("origin", url.origin);

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: "manual",
    });

    if (upstreamRes.status >= 500) {
      console.error(`[Neon Auth 500 Error] on ${req.method} ${path}`);
    }

    const responseHeaders = new Headers(upstreamRes.headers);

    // Forward Set-Cookie header with proper 1st-party attributes
    const setCookieHeaders = upstreamRes.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      responseHeaders.delete("set-cookie");
      for (const cookieStr of setCookieHeaders) {
        // 1. Remove Domain attribute so cookie attaches to current host (localhost / do4win.com)
        let adjusted = cookieStr.replace(/;\s*Domain=[^;]+/gi, "");

        // 2. Remove Partitioned attribute (Partitioned is for 3rd-party iframes and requires Secure)
        adjusted = adjusted.replace(/;\s*Partitioned/gi, "");

        // 3. Change SameSite=None to SameSite=Lax for 1st-party cookie
        adjusted = adjusted.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
        if (!/SameSite=/i.test(adjusted)) {
          adjusted += "; SameSite=Lax";
        }

        // 4. Ensure Secure attribute is present (localhost is a secure context in all modern browsers)
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

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Neon Auth Proxy Error]:", error);
    return NextResponse.json(
      { error: "Authentication service unavailable", details: String(error) },
      { status: 502 }
    );
  }
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
export const PATCH = proxyAuthRequest;
