"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  UserPlus,
  Rocket,
  Gavel,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Discover & Join Challenges",
      description:
        "Explore curated global hackathons across AI Agents, Mobile & Spatial, DevTools, and Web3 with real cash prize pools and verified organizers.",
      icon: Compass,
      tag: "Explore",
      color: "from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/30",
    },
    {
      step: "02",
      title: "Match & Assemble Squad",
      description:
        "Compete solo or build your dream team. Invite teammates via email or connect with builders searching for your exact frontend, backend, or design skills.",
      icon: UserPlus,
      tag: "Collaborate",
      color: "from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/30",
    },
    {
      step: "03",
      title: "Build, Ship & Submit",
      description:
        "Turn ideas into working software. Submit your project with GitHub repository links, video walkthroughs, tech stack tags, and interactive live previews.",
      icon: Rocket,
      tag: "Create",
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/30",
    },
    {
      step: "04",
      title: "Transparent Judging & Win",
      description:
        "Industry judges evaluate your project across a transparent 50-point rubric (Innovation, Code, UX, Impact, Demo) and award prize money & winner badges.",
      icon: Gavel,
      tag: "Compete",
      color: "from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/30",
    },
  ];

  return (
    <section className="mt-28 w-full text-left space-y-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
          >
            <Sparkles className="size-3.5" /> Simple 4-Step Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            How Hack4Win Hackathons Work
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            From discovery and team formation to submission and rubric scoring — everything you need in one unified arena.
          </p>
        </div>

        <Button asChild variant="outline" className="rounded-full gap-2 self-start md:self-auto text-xs font-semibold">
          <Link href="/hackathons">
            Explore Active Arena <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="relative rounded-2xl border bg-card p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Step indicator header */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-2xl font-black font-mono text-muted-foreground/40 group-hover:text-primary/70 transition-colors">
                  {item.step}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border bg-muted text-muted-foreground">
                  {item.tag}
                </span>
              </div>

              {/* Icon & Title */}
              <div className="space-y-3 mb-4">
                <div
                  className={`size-11 rounded-xl bg-gradient-to-br flex items-center justify-center border shadow-xs transition-transform duration-300 group-hover:scale-110 ${item.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Subtle footer checkmark */}
              <div className="pt-4 border-t flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-medium">
                <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                <span>Fully automated workflow</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
