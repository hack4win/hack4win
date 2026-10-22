"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Gavel,
  Trophy,
  Clock,
  Sparkles,
  Shield,
  Layers,
  Code2,
  Mail,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FeaturesBentoGrid() {
  return (
    <section className="mt-28 w-full text-left space-y-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
          >
            <Sparkles className="size-3.5" /> Platform Superpowers
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Engineered For Participants, Refined For Judges
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Everything designed from the ground up to eliminate friction in hackathon coordination, team matching, and project evaluation.
          </p>
        </div>

        <Button asChild variant="ghost" className="rounded-full gap-1 text-xs font-semibold self-start md:self-auto">
          <Link href="/hackathons">
            View All Features <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Large Feature 1: 2-Way Matchmaking & Team Building */}
        <div className="md:col-span-2 rounded-3xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-all duration-300 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Users className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary mb-1 block">
                Two-Way Team Matchmaking
              </span>
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                Find Your Dream Squad or Invite Teammates by Email
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
                Need a frontend designer or an AI engineer? Send direct email invites or browse builders who are actively looking for a team. Teammates accept with one click, keeping everyone aligned.
              </p>
            </div>
          </div>

          {/* Interactive UI Mockup Card */}
          <div className="mt-6 p-4 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  AK
                </div>
                <div>
                  <div className="font-bold">Lead Full-Stack Builder</div>
                  <div className="text-[10px] text-muted-foreground">Looking for: UI/UX & AI Prompt Engineer</div>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                <CheckCircle2 className="size-3" /> Team Open
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono bg-muted/40 p-2 rounded-xl">
              <Mail className="size-3.5 text-primary" />
              <span>alex.designer@build.dev • Invitation Pending Confirmation</span>
            </div>
          </div>
        </div>

        {/* Feature 2: Transparent 50-Pt Judging System */}
        <div className="rounded-3xl border bg-gradient-to-br from-card via-card to-amber-500/5 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-amber-500/40 transition-all duration-300 group">
          <div className="space-y-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Gavel className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-600 mb-1 block">
                Rubric Scoring & Leaderboards
              </span>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Transparent 50-Point Rubric Judging
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                No subjective mystery scoring. Projects are evaluated across 5 clear dimensions: Innovation, Technical Architecture, UI/UX, Impact, and Demo Polish.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl border bg-card/80 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Rubric Dimensions</span>
              <span className="text-amber-500 flex items-center gap-1">
                <Star className="size-3 fill-amber-500" /> 48 / 50
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Innovation & Idea</span>
                <span className="font-semibold text-foreground">10/10</span>
              </div>
              <div className="flex justify-between">
                <span>Technical Architecture</span>
                <span className="font-semibold text-foreground">10/10</span>
              </div>
              <div className="flex justify-between">
                <span>Design & Usability</span>
                <span className="font-semibold text-foreground">9/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Verified Winner Hall of Fame */}
        <div className="rounded-3xl border bg-gradient-to-br from-card via-card to-purple-500/5 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-purple-500/40 transition-all duration-300 group">
          <div className="space-y-4">
            <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <Trophy className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-purple-600 mb-1 block">
                Proof of Work & Badges
              </span>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Verified Winner Hall of Fame
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Every awarded project receives a permanent badge (🥇 1st Place, Best AI Agent, etc.) and a dedicated showcase link for your resume or investors.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge className="bg-amber-500 text-white font-bold text-xs">
              🥇 1st Place Champion
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs font-bold">
              🤖 Best AI Innovation
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-xs font-bold">
              🎨 Best UI/UX Design
            </Badge>
          </div>
        </div>

        {/* Large Feature 4: Interactive Submissions & Live Demos */}
        <div className="md:col-span-2 rounded-3xl border bg-gradient-to-br from-card via-card to-emerald-500/5 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <Code2 className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 mb-1 block">
                Full Multimedia Submissions
              </span>
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                Live Interactive Previews, Video Pitches & GitHub Sync
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
                Showcase your build with embedded YouTube/Loom demo walkthroughs, live deployment links, tech stack badges, and rich Markdown documentation. Judges can test and review instantly.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-card border text-xs font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500"></span> Live Interactive Demo
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border text-xs font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500"></span> GitHub Repo Link
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border text-xs font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-purple-500"></span> Video Pitch Walkthrough
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-card border text-xs font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500"></span> Rich Markdown Story
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
