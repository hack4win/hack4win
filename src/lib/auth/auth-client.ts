"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, adminClient } from "better-auth/client/plugins";

/**
 * Better Auth Client for Hack4Win Platform
 * 
 * Configured with:
 * - Local /api/auth proxy to ensure 1st-party cookie storage
 * - emailOTPClient for passwordless email OTP authentication
 * - adminClient for administrative user management
 * - Google OAuth provider via signIn.social
 */

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
  plugins: [
    emailOTPClient(),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  emailOtp,
} = authClient;
