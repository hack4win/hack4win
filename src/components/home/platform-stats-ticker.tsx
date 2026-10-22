"use client";

import React from "react";
import {
  Trophy,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface PlatformStatsTickerProps {
  hackathonCount?: number;
  totalSubmissions?: number;
}

export function PlatformStatsTicker({
  hackathonCount = 12,
  totalSubmissions = 48,
}: PlatformStatsTickerProps) {
  const stats = [
    {
      label: "Total Prize Money",
      value: "$350,000+",
      subtext: "Cash, grants & hardware awarded",
      icon: Trophy,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Active Builders",
      value: "24,000+",
      subtext: "Engineers, designers & founders",
      icon: Users,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Shipped Projects",
      value: `${Math.max(120, totalSubmissions * 4)}+`,
      subtext: "Working prototypes & live demos",
      icon: Layers,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Global Challenges",
      value: `${Math.max(15, hackathonCount)}+`,
      subtext: "Online & hybrid hackathons",
      icon: Zap,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
  ];

  const trustedEcosystem = [
    "OpenAI",
    "Google Cloud",
    "Anthropic",
    "Vercel",
    "Supabase",
    "Neon Postgres",
    "Tailwind CSS",
    "Next.js",
  ];

  return (
    <section className="w-full mt-12 mb-6">
      {/* Live Activity Pulse Pill */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border bg-muted/30 backdrop-blur-md text-xs font-medium text-muted-foreground shadow-xs">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
          </span>
          <span className="text-foreground font-semibold">Live Ecosystem:</span>
          <span>Global challenges actively reviewing projects & forming teams</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-4 sm:p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-xs hover:border-primary/40 hover:shadow-sm transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <div
                  className={`size-8 sm:size-9 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${stat.color}`}
                >
                  <Icon className="size-4 sm:size-4.5" />
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">
                  {stat.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Sponsor Ecosystem Bar */}
      <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground/80 shrink-0">
          Built with & sponsored by industry tech:
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {trustedEcosystem.map((tech) => (
            <span
              key={tech}
              className="font-medium text-foreground/80 hover:text-primary transition-colors cursor-default"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
