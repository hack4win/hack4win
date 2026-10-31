import { NextRequest, NextResponse } from "next/server";

/**
 * Global Authentication & Authorization Middleware
 * 
 * Enforces route-level access control following the Principle of Least Privilege:
 * 1. Protected User Routes: /profile, /settings -> requires active session cookie.
 * 2. Protected Admin Routes: /admin/* -> requires active session cookie.
 * 3. Guest Only Routes: /auth/signin -> redirect to /profile if already signed in.
 */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Retrieve session token from cookie (supports both neon-auth and better-auth prefixes)
  const sessionToken =
    req.cookies.get("neon-auth.session_token")?.value ||
    req.cookies.get("__Secure-neon-auth.session_token")?.value ||
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // Redirect aliases: /orgnizer/* -> /organizer/* and /judge/* -> /judges/*
  if (pathname === "/orgnizer" || pathname.startsWith("/orgnizer/")) {
    const canonical = pathname.replace(/^\/orgnizer/, "/organizer");
    const targetUrl = new URL(canonical + req.nextUrl.search, req.url);
    return NextResponse.redirect(targetUrl);
  }
  if (pathname === "/judge" || pathname.startsWith("/judge/")) {
    const canonical = pathname.replace(/^\/judge/, "/judges");
    const targetUrl = new URL(canonical + req.nextUrl.search, req.url);
    return NextResponse.redirect(targetUrl);
  }

  // 1. Protect Profile and User Account Routes
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 2. Protect Admin Routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    // Deep role check is enforced at the layout/server component level via requireAdmin()
  }

  // 3. Protect Organizer Routes
  if (pathname.startsWith("/organizer")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 4. Protect Judges Routes
  if (pathname.startsWith("/judges")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 5. Protect Choose Username Onboarding Route
  if (pathname.startsWith("/auth/choose-username") && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 4. Prevent authenticated users from getting stuck in Sign-In page (redirect to /hackathons)
  if (pathname === "/auth/signin" && isAuthenticated && !req.nextUrl.searchParams.has("callbackUrl")) {
    return NextResponse.redirect(new URL("/hackathons", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/admin/:path*",
    "/organizer/:path*",
    "/orgnizer/:path*",
    "/judges/:path*",
    "/judge/:path*",
    "/settings/:path*",
    "/auth/signin",
    "/auth/choose-username",
  ],
};
