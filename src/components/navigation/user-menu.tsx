"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionUser } from "@/lib/db/types";
import { signOut } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Trophy,
  ChevronDown,
  Loader2,
  Rocket,
  Users,
  Gavel,
  ExternalLink,
} from "lucide-react";

interface UserMenuProps {
  user: SessionUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/");
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-full border bg-card hover:bg-muted/50 transition-all text-sm font-medium outline-none cursor-pointer"
      >
        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="size-full rounded-full object-cover"
            />
          ) : (
            (user.name?.[0] || user.email[0]).toUpperCase()
          )}
        </div>
        <span className="max-w-[120px] truncate hidden sm:inline text-xs font-semibold">
          {user.name || user.email.split("@")[0]}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-card p-2 shadow-lg z-50 space-y-1 text-sm animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b mb-1">
              <div className="font-semibold text-foreground truncate text-xs flex items-center justify-between gap-1">
                <span className="truncate">{user.name || "Participant"}</span>
                {user.username && (
                  <span className="text-[10px] text-muted-foreground font-mono font-normal">
                    @{user.username}
                  </span>
                )}
              </div>
              <div className="text-[0.75rem] text-muted-foreground truncate">
                {user.email}
              </div>
              <div className="mt-1">
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className="text-[0.65rem] capitalize px-2 py-0"
                >
                  {user.role}
                </Badge>
              </div>
            </div>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              My Profile
            </Link>

            {user.username && (
              <Link
                href={`/u/${user.username}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-primary"
              >
                <ExternalLink className="size-4 text-primary" />
                Public Profile (/u/{user.username})
              </Link>
            )}

            <Link
              href="/profile?tab=projects"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors"
            >
              <Rocket className="size-4 text-muted-foreground" />
              My Projects
            </Link>

            <Link
              href="/profile?tab=hackathons"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors"
            >
              <Trophy className="size-4 text-muted-foreground" />
              My Hackathons
            </Link>

            <Link
              href="/profile?tab=invites"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors"
            >
              <Users className="size-4 text-muted-foreground" />
              Team Invites
            </Link>

            {(user.role === "judge") && (
              <Link
                href="/judges"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-purple-600 dark:text-purple-400 font-semibold"
              >
                <Gavel className="size-4 text-purple-500" />
                Judging Portal (/judges)
              </Link>
            )}

            {user.role === "organizer" && (
              <>
                <Link
                  href="/organizer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-blue-600 dark:text-blue-400 font-semibold"
                >
                  <Trophy className="size-4 text-blue-500" />
                  Organizer Portal (/organizer)
                </Link>
                <Link
                  href="/organizer/judges"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-purple-600 dark:text-purple-400"
                >
                  <Gavel className="size-4 text-purple-500" />
                  Manage Judges
                </Link>
              </>
            )}

            {user.role === "admin" && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-primary font-semibold"
                >
                  <ShieldCheck className="size-4 text-primary" />
                  Super Admin Console
                </Link>
                <Link
                  href="/organizer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-blue-600 dark:text-blue-400"
                >
                  <Trophy className="size-4 text-blue-500" />
                  Organizer Portal (/organizer)
                </Link>
                <Link
                  href="/judges"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-muted font-medium transition-colors text-purple-600 dark:text-purple-400"
                >
                  <Gavel className="size-4 text-purple-500" />
                  Judges Portal (/judges)
                </Link>
              </>
            )}

            <div className="border-t my-1" />

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10 font-medium transition-colors text-left"
            >
              {isSigningOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
