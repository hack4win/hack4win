"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  AtSign,
  User as UserIcon,
} from "lucide-react";

interface ChooseUsernameClientProps {
  user: User;
  callbackUrl: string;
}

export function ChooseUsernameClient({ user, callbackUrl }: ChooseUsernameClientProps) {
  const router = useRouter();

  // Initial candidate derived from name or email
  const defaultCandidate = useMemo(() => {
    const raw = (user.name || user.email.split("@")[0] || "builder")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return raw.length >= 3 ? raw.slice(0, 25) : `${raw}_dev`;
  }, [user.name, user.email]);

  const [username, setUsername] = useState(defaultCandidate);
  const [name, setName] = useState(user.name || "");
  const [isPending, startTransition] = useTransition();

  // Availability checking state
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    checked: boolean;
    available: boolean;
    reason?: string;
  }>({ checked: false, available: false });

  const [formError, setFormError] = useState<string | null>(null);

  // Suggestions list
  const suggestions = useMemo(() => {
    const base = defaultCandidate.replace(/_\d+$/, "");
    return [
      base,
      `${base}_dev`,
      `${base}_builder`,
      `${base}_${Math.floor(10 + Math.random() * 90)}`,
    ].filter((val, idx, self) => self.indexOf(val) === idx && val !== username);
  }, [defaultCandidate, username]);

  // Debounced live availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase();

    if (!clean) {
      setAvailability({ checked: true, available: false, reason: "Username cannot be empty" });
      setIsChecking(false);
      return;
    }

    if (clean.length < 3) {
      setAvailability({ checked: true, available: false, reason: "Minimum 3 characters required" });
      setIsChecking(false);
      return;
    }

    if (clean.length > 30) {
      setAvailability({ checked: true, available: false, reason: "Maximum 30 characters allowed" });
      setIsChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setAvailability({
        checked: true,
        available: false,
        reason: "Only letters, numbers, and underscores allowed",
      });
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setAvailability({
          checked: true,
          available: !!data.available,
          reason: data.reason,
        });
      } catch {
        setAvailability({
          checked: true,
          available: false,
          reason: "Error checking username",
        });
      } finally {
        setIsChecking(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !availability.available) {
      setFormError("Please select a valid, available username.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUsername,
            name: name.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to set username");
        }

        // Successfully completed registration! Redirect to destination
        window.location.href = callbackUrl;
      } catch (err) {
        console.error("Failed to complete username onboarding:", err);
        setFormError(err instanceof Error ? err.message : "Failed to claim username");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-bold text-2xl tracking-tight hover:opacity-85 transition-opacity"
          >
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="size-5" />
            </div>
            <span>
              Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
            </span>
          </Link>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Badge variant="secondary" className="rounded-full text-[11px] gap-1 px-3 py-0.5">
              <Sparkles className="size-3 text-primary" /> Step 2: Finalize Account
            </Badge>
          </div>
        </div>

        {/* Card */}
        <Card className="border shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1.5 pb-4 border-b bg-muted/20">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <AtSign className="size-5 text-primary" /> Choose Your Username
            </CardTitle>
            <CardDescription className="text-xs">
              Pick a unique handle for your public profile, team invitations, and hackathon leaderboards.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              {/* Signed-in identity */}
              <div className="p-3 rounded-xl bg-muted/30 border text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Authenticated via:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {user.email}
                </span>
              </div>

              {formError && (
                <div className="p-3 rounded-xl text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-bold flex items-center gap-1">
                  Unique Username <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    @
                  </span>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="e.g. alex_coder"
                    className="pl-8 pr-10 rounded-xl h-11 font-mono text-sm"
                    maxLength={30}
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isChecking ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : availability.checked && availability.available ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : availability.checked && !availability.available ? (
                      <XCircle className="size-4 text-destructive" />
                    ) : null}
                  </div>
                </div>

                {/* Validation message */}
                <div className="min-h-5 text-[11px]">
                  {isChecking ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Checking availability...
                    </span>
                  ) : availability.checked ? (
                    availability.available ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> @{username} is available!
                      </span>
                    ) : (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <XCircle className="size-3" /> {availability.reason || "Username is not available"}
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground">
                      3-30 characters (letters, numbers, underscores).
                    </span>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" /> Suggested for you:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 3).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setUsername(sug)}
                        className="text-xs px-2.5 py-1 rounded-lg border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="fullname" className="text-xs font-semibold flex items-center gap-1">
                  <UserIcon className="size-3.5 text-muted-foreground" /> Display Name
                </Label>
                <Input
                  id="fullname"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name or handle"
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  How you will be addressed on Hack4Win. You can change this anytime.
                </p>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isPending || isChecking || !availability.available}
                className="w-full h-11 rounded-xl text-sm font-bold gap-2 shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Completing Signup...
                  </>
                ) : (
                  <>
                    Complete Sign Up <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                By continuing, you agree to Hack4Win&apos;s Community Guidelines and Fair Play Rules.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
