"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="border-t bg-card/40 backdrop-blur-sm text-foreground w-full">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 space-y-12">
        {/* Top Section: Brand + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b">
          <div className="lg:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-bold text-xl tracking-tight hover:opacity-90 transition-opacity"
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Trophy className="size-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight">
                Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              The premier competitive arena for participants, founders, and dev teams. Discover global challenges, assemble multidisciplinary squads, and ship world-class software.
            </p>

            {/* Live Operational Status */}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-foreground">Operational</span>
              <span>• Neon Cloud & Turbopack Core Active</span>
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-3 p-6 rounded-3xl border bg-muted/20">
            <div className="space-y-1">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="size-3.5" /> Hackathon Dispatch
              </span>
              <h3 className="text-base sm:text-lg font-bold">
                Never Miss a High-Stakes Hackathon
              </h3>
              <p className="text-xs text-muted-foreground">
                Get notified the moment \$50k+ challenges, exclusive API grants, and sponsor bounties go live.
              </p>
            </div>

            {subscribed ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4" /> You&apos;re subscribed to high-stakes challenge alerts! 🚀
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 pt-1">
                <Input
                  type="email"
                  placeholder="Enter your email (e.g. dev@build.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-full h-10 text-xs bg-card px-4 border-input focus:ring-2 focus:ring-primary/20"
                  required
                />
                <Button type="submit" size="sm" className="rounded-full h-10 px-5 text-xs font-bold shrink-0 gap-1.5 shadow-sm">
                  Subscribe <ArrowRight className="size-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Multi-Column Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm">Competitions</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/hackathons" className="hover:text-primary transition-colors">
                  All Active Hackathons
                </Link>
              </li>
              <li>
                <Link href="/hackathons?tag=AI" className="hover:text-primary transition-colors">
                  AI & Autonomous Agents
                </Link>
              </li>
              <li>
                <Link href="/hackathons?tag=Mobile" className="hover:text-primary transition-colors">
                  Spatial & Mobile Challenge
                </Link>
              </li>
              <li>
                <Link href="/hackathons?tag=DevTools" className="hover:text-primary transition-colors">
                  DevTools & Infrastructure
                </Link>
              </li>
              <li>
                <Link href="/hackathons?tag=Web3" className="hover:text-primary transition-colors">
                  Decentralized Web3
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm">For Builders</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/hackathons" className="hover:text-primary transition-colors">
                  Find a Hackathon Team
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  Builder Portfolio & Badges
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-primary transition-colors">
                  Project Showcase & Hall of Fame
                </Link>
              </li>
              <li>
                <Link href="/hackathons" className="hover:text-primary transition-colors">
                  Submit a Project
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  Team Invites Inbox
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm">For Organizers</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/host" className="hover:text-primary transition-colors">
                  Host a Competition
                </Link>
              </li>
              <li>
                <Link href="/admin/judging" className="hover:text-primary transition-colors">
                  Judge & Scoring Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/projects" className="hover:text-primary transition-colors">
                  Submissions Management
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors">
                  Admin Analytics Console
                </Link>
              </li>
              <li>
                <Link href="/hackathons" className="hover:text-primary transition-colors">
                  Sponsor Bounties
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm">Platform & Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Platform Guidelines & IP
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Code of Conduct
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Security & Verification
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © 2026 <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved. The Next-Gen Hackathon Arena.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span>•</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
            <span>•</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">System Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
