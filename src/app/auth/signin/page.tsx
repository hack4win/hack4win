"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, emailOtp } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Mail,
  KeyRound,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Users,
  Code2,
  ArrowRight,
  Flame,
  Globe2,
} from "lucide-react";

/**
 * Redesigned Sign In Page for Hack4Win Platform
 * 
 * Features:
 * - Responsive split-screen design on desktop, streamlined card on mobile
 * - Ambient backdrop glow and developer platform visual aesthetics
 * - Google OAuth Single Sign-On (Neon Auth social provider)
 * - Passwordless Email OTP Authentication with 6-digit verification & countdown resend
 * - Accessible, mobile-keyboard optimized forms (modern web standards)
 */

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/profile";

  // State management
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "oauth_failed"
      ? "Google authentication could not be completed. Please try again or use email code."
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"google" | "send-otp" | "verify-otp" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resendCountdown, setResendCountdown] = useState(0);
  const [demoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);

  /**
   * 1-Click Instant Demo / Test Role Login
   */
  const handleDemoLogin = async (role: string) => {
    setError(null);
    setSuccessMessage(null);
    setDemoLoadingRole(role);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in as demo account");
      }
      window.location.href = data.redirectUrl || callbackUrl;
    } catch (err) {
      console.error("Demo login error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign in as demo account");
      setDemoLoadingRole(null);
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  /**
   * Handle Google OAuth Sign-In
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setActiveAction("google");

    startTransition(async () => {
      try {
        const authCallbackUrl = `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        await signIn.social({
          provider: "google",
          callbackURL: authCallbackUrl,
        });
      } catch (err) {
        console.error("Google Sign-In failed:", err);
        setError("Failed to initiate Google sign-in. Please try again or use email code.");
        setActiveAction(null);
      }
    });
  };

  /**
   * Step 1: Request OTP code to be sent to user's email
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError("Please provide a valid email address (e.g. dev@example.com).");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setActiveAction("send-otp");

    startTransition(async () => {
      try {
        const res = await emailOtp.sendVerificationOtp({
          email: trimmedEmail,
          type: "sign-in",
        });

        if (res.error) {
          setError(res.error.message || "Failed to send verification code. Please try again.");
          setActiveAction(null);
          return;
        }

        setStep("otp");
        setResendCountdown(60);
        setSuccessMessage(`A 6-digit code was sent to ${trimmedEmail}`);
        setActiveAction(null);
      } catch (err) {
        console.error("Failed to send OTP:", err);
        setError("Failed to send verification code. Please check your connection.");
        setActiveAction(null);
      }
    });
  };

  /**
   * Step 2: Verify OTP code and establish user session
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, "");

    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setActiveAction("verify-otp");

    startTransition(async () => {
      try {
        const res = await signIn.emailOtp({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          callbackURL: callbackUrl,
        });

        if (res.error) {
          setError(res.error.message || "Invalid or expired verification code. Please try again.");
          setActiveAction(null);
          return;
        }

        // Successfully signed in -> verify if user has selected a platform username
        try {
          const profileRes = await fetch("/api/user/profile");
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (!profileData?.profile?.username) {
              window.location.href = `/auth/choose-username?callbackUrl=${encodeURIComponent(callbackUrl)}`;
              return;
            }
          }
        } catch {
          // If profile check fails, fallback to callbackUrl
        }

        window.location.href = callbackUrl;
      } catch (err) {
        console.error("OTP verification failed:", err);
        setError("Failed to verify code. Please check the code and try again.");
        setActiveAction(null);
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground relative selection:bg-primary/20 selection:text-primary">
      {/* Background Decorative Ambient Glows */}
      <div
        className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* LEFT PANEL: Branding, Value Proposition & Social Proof (Visible on Desktop) */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-border/60 bg-muted/20 backdrop-blur-sm relative z-10 overflow-hidden">
        {/* Subtle geometric dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
          aria-hidden="true"
        />

        {/* Top Branding */}
        <div className="relative z-10 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-bold text-2xl tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Trophy className="size-6 text-primary" />
            </div>
            <span className="text-2xl font-black tracking-tight">
              Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
            </span>
          </Link>

          <div>
            <Badge
              variant="outline"
              className="rounded-full px-3.5 py-1 text-xs font-semibold gap-1.5 border-primary/20 bg-primary/5 text-primary"
            >
              <Sparkles className="size-3 text-amber-500" />
              The Arena for Global Builders
            </Badge>
          </div>
        </div>

        {/* Hero Narrative & Features */}
        <div className="relative z-10 space-y-8 my-auto py-10">
          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15]">
              Build bold hacks. <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-amber-500 bg-clip-text text-transparent">
                Claim real prizes.
              </span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Join thousands of developers, designers, and innovators competing in virtual & hybrid hackathons, shipping standout projects, and climbing global leaderboards.
            </p>
          </div>

          {/* Value Prop Badges */}
          <div className="grid grid-cols-1 gap-3.5 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs shadow-2xs">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="size-5" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Transparent Prize Pools</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Over $150K+ in active bounties, awards, and sponsored competition tracks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs shadow-2xs">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="size-5" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Frictionless Team Matchmaking</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Find teammates by tech stack, send instant invites, and collaborate smoothly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs shadow-2xs">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Code2 className="size-5" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Showcase & Builder Portfolio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanent project showcases with video demos, live links, and verified badges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof Ticker */}
        <div className="relative z-10 pt-6 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Globe2 className="size-4 text-primary" />
            <span>Active in 40+ countries</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>PostgreSQL & Neon Auth Verified</span>
          </div>
        </div>
      </section>

      {/* RIGHT PANEL: Interactive Sign-In Form (Mobile & Desktop) */}
      <main className="w-full lg:w-1/2 flex flex-col justify-between items-center p-4 sm:p-8 md:p-12 relative z-10 min-h-screen">
        {/* Mobile Top Navigation & Back Link */}
        <header className="w-full max-w-md flex items-center justify-between pt-2 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group px-3 py-1.5 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Hack4Win</span>
          </Link>

          {/* Mobile Logo (Visible on mobile only) */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="size-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">Hack4Win</span>
          </div>
        </header>

        {/* Center Auth Card */}
        <div className="w-full max-w-md my-auto space-y-6">
          {/* Card Frame */}
          <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl p-6 sm:p-8 space-y-6 transition-all duration-300">
            {/* Form Header */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
                >
                  {step === "email" ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="size-3 text-amber-500" /> Passwordless & SSO
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <KeyRound className="size-3 text-primary" /> Enter 6-Digit Code
                    </span>
                  )}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {step === "email" ? "Welcome back" : "Check your inbox"}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {step === "email"
                  ? "Sign in or create your account to participate in challenges."
                  : `Enter the one-time code sent to your email.`}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1"
              >
                <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
                  {error}
                </div>
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && !error && (
              <div
                role="status"
                className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1"
              >
                <CheckCircle2 className="size-4.5 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
                  {successMessage}
                </div>
              </div>
            )}

            {/* STEP 1: EMAIL & GOOGLE SIGN-IN */}
            {step === "email" ? (
              <div className="space-y-5">
                {/* 1. Google OAuth Social Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 rounded-2xl font-semibold gap-3 border-border/80 hover:bg-muted hover:border-foreground/20 text-foreground transition-all duration-200 shadow-2xs"
                  disabled={isPending}
                  onClick={handleGoogleSignIn}
                >
                  {isPending && activeAction === "google" ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin text-primary" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </Button>

                {/* Elegant Separator */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-border/80" />
                  <span className="bg-card px-3.5 text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">
                    or magic code
                  </span>
                </div>

                {/* 2. Passwordless Email OTP Form */}
                <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                    >
                      <span>Email address</span>
                      <span className="text-[0.68rem] text-muted-foreground/80 lowercase">No password needed</span>
                    </label>

                    <div className="relative">
                      <Mail className="size-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 pl-10.5 rounded-2xl text-sm font-medium bg-background/50 border-input focus-visible:ring-primary/20"
                        required
                        disabled={isPending}
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-2xl font-bold gap-2 shadow-sm transition-all duration-200"
                    disabled={isPending || !email.trim()}
                  >
                    {isPending && activeAction === "send-otp" ? (
                      <>
                        <Loader2 className="size-4.5 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Login Code</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* 3. Instant Test Accounts for All Roles */}
                <div className="pt-2 border-t border-border/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-500" />
                      Test Accounts (1-Click)
                    </span>
                    <Badge variant="outline" className="text-[0.65rem] py-0 px-2 font-mono text-muted-foreground">
                      4 Roles Available
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || Boolean(demoLoadingRole)}
                      onClick={() => handleDemoLogin("admin")}
                      className="h-11 rounded-xl justify-start px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    >
                      {demoLoadingRole === "admin" ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5 text-primary" />
                      ) : (
                        <span className="text-base mr-1.5">👑</span>
                      )}
                      <div className="text-left min-w-0">
                        <span className="block font-bold leading-none truncate">Admin</span>
                        <span className="text-[10px] text-muted-foreground leading-tight truncate block">Full Console</span>
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || Boolean(demoLoadingRole)}
                      onClick={() => handleDemoLogin("organizer")}
                      className="h-11 rounded-xl justify-start px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    >
                      {demoLoadingRole === "organizer" ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5 text-primary" />
                      ) : (
                        <span className="text-base mr-1.5">🎪</span>
                      )}
                      <div className="text-left min-w-0">
                        <span className="block font-bold leading-none truncate">Organizer</span>
                        <span className="text-[10px] text-muted-foreground leading-tight truncate block">Host & Manage</span>
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || Boolean(demoLoadingRole)}
                      onClick={() => handleDemoLogin("judge")}
                      className="h-11 rounded-xl justify-start px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    >
                      {demoLoadingRole === "judge" ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5 text-primary" />
                      ) : (
                        <span className="text-base mr-1.5">⚖️</span>
                      )}
                      <div className="text-left min-w-0">
                        <span className="block font-bold leading-none truncate">Judge</span>
                        <span className="text-[10px] text-muted-foreground leading-tight truncate block">Score & Review</span>
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || Boolean(demoLoadingRole)}
                      onClick={() => handleDemoLogin("user")}
                      className="h-11 rounded-xl justify-start px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    >
                      {demoLoadingRole === "user" ? (
                        <Loader2 className="size-3.5 animate-spin mr-1.5 text-primary" />
                      ) : (
                        <span className="text-base mr-1.5">💻</span>
                      )}
                      <div className="text-left min-w-0">
                        <span className="block font-bold leading-none truncate">Builder</span>
                        <span className="text-[10px] text-muted-foreground leading-tight truncate block">Submit & Compete</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: VERIFICATION OTP CODE FORM */
              <form onSubmit={handleVerifyOtp} noValidate className="space-y-5 animate-in fade-in">
                {/* Active Email Pill with Quick Change Button */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/70 text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-primary hover:underline font-semibold shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* 6-Digit Code Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="otp"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center"
                  >
                    6-Digit Verification Code
                  </label>

                  <div className="relative">
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setOtp(val);
                      }}
                      className="h-14 rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.4em] sm:tracking-[0.6em] bg-background/50 border-input focus-visible:ring-primary/25 transition-all"
                      autoFocus
                      required
                      disabled={isPending}
                    />
                  </div>

                  <p className="text-[0.75rem] text-center text-muted-foreground">
                    Check your spam or promotions folder if you don&apos;t see it shortly.
                  </p>
                </div>

                {/* Submit Verification Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-2xl font-bold gap-2 shadow-sm transition-all"
                  disabled={isPending || otp.trim().length < 4}
                >
                  {isPending && activeAction === "verify-otp" ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin" />
                      <span>Verifying & Signing in...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4.5" />
                      <span>Verify & Enter Arena</span>
                    </>
                  )}
                </Button>

                {/* Resend & Back Actions */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="size-3" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e)}
                    disabled={resendCountdown > 0 || isPending}
                    className="text-primary hover:underline font-semibold disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : "Resend Code"}
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Security Assurance */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-2 text-[0.72rem] text-muted-foreground text-center">
              <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
              <span>Passwordless encrypted auth powered by Neon & PostgreSQL</span>
            </div>
          </div>

          {/* Legal / Policy Disclaimer */}
          <p className="text-center text-[0.72rem] text-muted-foreground max-w-xs mx-auto leading-relaxed">
            By signing in, you agree to Hack4Win&apos;s Terms of Service and acknowledge our Privacy Policy.
          </p>
        </div>

        {/* Desktop Bottom Footnote */}
        <footer className="w-full max-w-md py-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Hack4Win platform. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Loading sign in...</span>
          </div>
        </div>
      }
    >
      <SignInForm />
    </React.Suspense>
  );
}
