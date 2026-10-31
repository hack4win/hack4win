"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  PieChart,
  Code2,
  Trophy,
  Users,
  Award,
  Globe,
  Radio,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

interface StatusCount {
  ongoing: number;
  upcoming: number;
  ended: number;
  draft: number;
  total: number;
}

interface FormatCount {
  online: number;
  inPerson: number;
  hybrid: number;
}

interface SkillCount {
  name: string;
  count: number;
  category?: string;
}

interface GrowthPoint {
  month: string;
  users: number;
  hackathons: number;
}

interface AdminAnalyticsChartsProps {
  statusCounts: StatusCount;
  formatCounts: FormatCount;
  topSkills: SkillCount[];
  totalPrizeValue: string;
  growthPoints: GrowthPoint[];
  totalParticipants?: number;
  totalHackers?: number;
}

export function AdminAnalyticsCharts({
  statusCounts,
  formatCounts,
  topSkills,
  totalPrizeValue,
  growthPoints,
  totalParticipants,
  totalHackers,
}: AdminAnalyticsChartsProps) {
  const totalCount = totalParticipants ?? totalHackers ?? 0;
  const [hoveredMonth, setHoveredMonth] = useState<GrowthPoint | null>(null);

  // Status donut calculation
  const totalCompetitions = Math.max(1, statusCounts.total);
  const ongoingPercent = Math.round((statusCounts.ongoing / totalCompetitions) * 100);
  const upcomingPercent = Math.round((statusCounts.upcoming / totalCompetitions) * 100);
  const endedPercent = Math.round((statusCounts.ended / totalCompetitions) * 100);
  const draftPercent = Math.round((statusCounts.draft / totalCompetitions) * 100);

  // SVG Donut circumference (radius = 40 => circumference = 2 * PI * 40 = 251.32)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const ongoingStroke = (ongoingPercent / 100) * circumference;
  const upcomingStroke = (upcomingPercent / 100) * circumference;
  const endedStroke = (endedPercent / 100) * circumference;
  const draftStroke = (draftPercent / 100) * circumference;

  const ongoingOffset = 0;
  const upcomingOffset = -ongoingStroke;
  const endedOffset = -(ongoingStroke + upcomingStroke);
  const draftOffset = -(ongoingStroke + upcomingStroke + endedStroke);

  // Format calculation
  const totalFormats = Math.max(1, formatCounts.online + formatCounts.inPerson + formatCounts.hybrid);
  const onlinePct = Math.round((formatCounts.online / totalFormats) * 100);
  const inPersonPct = Math.round((formatCounts.inPerson / totalFormats) * 100);
  const hybridPct = Math.round((formatCounts.hybrid / totalFormats) * 100);

  // Max for growth chart scaling
  const maxGrowthUsers = Math.max(1, ...growthPoints.map((p) => p.users));
  const totalGrowthUsers = growthPoints.reduce((acc, p) => acc + p.users, 0);
  const latestMonthUsers = growthPoints[growthPoints.length - 1]?.users || 0;
  const previousMonthUsers = growthPoints[growthPoints.length - 2]?.users || 0;
  const growthRate = previousMonthUsers > 0
    ? Math.round(((latestMonthUsers - previousMonthUsers) / previousMonthUsers) * 100)
    : latestMonthUsers > 0
      ? 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Upper Grid: Growth Trajectory + Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Platform Growth Chart (2 Cols) */}
        <Card className="lg:col-span-2 border rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Platform Trajectory & Participant Growth
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly participant onboardings and hackathon challenges created.
              </CardDescription>
            </div>
            {totalGrowthUsers > 0 ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <ArrowUpRight className="size-3.5" />
                <span>{growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`} Growth</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border">
                <TrendingUp className="size-3.5 text-muted-foreground" />
                <span>Live Analytics</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* SVG Area / Bar Chart */}
            <div className="h-48 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b">
              {growthPoints.map((point, idx) => {
                const heightPct = point.users > 0 && maxGrowthUsers > 0
                  ? Math.max(15, Math.round((point.users / maxGrowthUsers) * 100))
                  : 0;
                const isHovered = hoveredMonth?.month === point.month;

                return (
                  <div
                    key={point.month}
                    onMouseEnter={() => setHoveredMonth(point)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 px-2.5 py-1.5 rounded-lg bg-popover text-popover-foreground border shadow-md text-[11px] whitespace-nowrap animate-in fade-in zoom-in-95">
                        <div className="font-bold">{point.month}</div>
                        <div className="text-primary font-semibold">
                          {point.users} {point.users === 1 ? "Participant" : "Participants"}
                        </div>
                      </div>
                    )}

                    {/* Bar visualization */}
                    <div className="w-full max-w-[42px] bg-muted/40 rounded-t-xl overflow-hidden relative flex flex-col justify-end h-full">
                      {heightPct > 0 ? (
                        <div
                          className={`w-full rounded-t-xl transition-all duration-300 ${
                            isHovered
                              ? "bg-primary shadow-sm scale-y-102"
                              : "bg-gradient-to-t from-primary/80 to-primary/40 group-hover:from-primary group-hover:to-primary/70"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      ) : (
                        <div className="w-full h-1 bg-muted-foreground/20 rounded-full my-auto" />
                      )}
                    </div>

                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      {point.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Row */}
            <div className="grid grid-cols-3 gap-4 pt-2 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-muted-foreground">Total Participants</span>
                <div className="text-xl font-black text-foreground">{totalCount}</div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Capital Distributed</span>
                <div className="text-xl font-black text-primary">{totalPrizeValue}</div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Active Challenges</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {statusCounts.ongoing} Live
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Hackathon Status Donut (1 Col) */}
        <Card className="border rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-4 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChart className="size-4 text-primary" /> Lifecycle Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Live status breakdown of all platform competitions.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 flex flex-col items-center justify-center space-y-5">
            {/* Donut SVG */}
            <div className="relative size-36 flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-muted"
                  strokeWidth="11"
                  fill="transparent"
                />

                {/* Ongoing (Emerald) */}
                {ongoingStroke > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-500"
                    strokeWidth="11"
                    strokeDasharray={`${ongoingStroke} ${circumference}`}
                    strokeDashoffset={ongoingOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                )}

                {/* Upcoming (Blue) */}
                {upcomingStroke > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-blue-500 transition-all duration-500"
                    strokeWidth="11"
                    strokeDasharray={`${upcomingStroke} ${circumference}`}
                    strokeDashoffset={upcomingOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                )}

                {/* Ended (Zinc/Slate) */}
                {endedStroke > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-zinc-400 dark:stroke-zinc-600 transition-all duration-500"
                    strokeWidth="11"
                    strokeDasharray={`${endedStroke} ${circumference}`}
                    strokeDashoffset={endedOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                )}

                {/* Draft (Amber) */}
                {draftStroke > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-amber-500 transition-all duration-500"
                    strokeWidth="11"
                    strokeDasharray={`${draftStroke} ${circumference}`}
                    strokeDashoffset={draftOffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                )}
              </svg>

              {/* Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-foreground">{statusCounts.total}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Live Now
                </span>
                <span className="font-bold text-foreground">{statusCounts.ongoing}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Upcoming
                </span>
                <span className="font-bold text-foreground">{statusCounts.upcoming}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-zinc-400" />
                  Ended
                </span>
                <span className="font-bold text-foreground">{statusCounts.ended}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Draft
                </span>
                <span className="font-bold text-foreground">{statusCounts.draft}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Grid: Top Skills Demographic + Format Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Top Skills Demographics (2 Cols) */}
        <Card className="lg:col-span-2 border rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Code2 className="size-4 text-primary" /> Participant Skills & Tech Proficiencies
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of primary skills declared on participant profiles.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-3.5">
            {topSkills.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No skill profiles indexed yet.
              </div>
            ) : (
              topSkills.slice(0, 6).map((skill, idx) => {
                const maxCount = Math.max(1, topSkills[0].count);
                const pct = Math.max(8, Math.round((skill.count / maxCount) * 100));

                return (
                  <div key={skill.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                        <span>{skill.name}</span>
                        {skill.category && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({skill.category})
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-primary">{skill.count} participants</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/90 to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 4. Format & Attendance Breakdown (1 Col) */}
        <Card className="border rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-4 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Globe className="size-4 text-primary" /> Delivery & Format
            </CardTitle>
            <CardDescription className="text-xs">
              Online vs in-person attendance modes.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Segmented Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${onlinePct}%` }}
                  title={`Online: ${onlinePct}%`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${hybridPct}%` }}
                  title={`Hybrid: ${hybridPct}%`}
                />
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${inPersonPct}%` }}
                  title={`In-Person: ${inPersonPct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" /> Online ({onlinePct}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" /> Hybrid ({hybridPct}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-blue-500" /> In-Person ({inPersonPct}%)
                </span>
              </div>
            </div>

            {/* Format detail boxes */}
            <div className="space-y-2.5 pt-2 border-t">
              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs">
                <span className="text-muted-foreground font-medium">Online (Global)</span>
                <span className="font-extrabold text-foreground">{formatCounts.online} Challenges</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs">
                <span className="text-muted-foreground font-medium">In-Person (Onsite)</span>
                <span className="font-extrabold text-foreground">{formatCounts.inPerson} Challenges</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs">
                <span className="text-muted-foreground font-medium">Hybrid (Combined)</span>
                <span className="font-extrabold text-foreground">{formatCounts.hybrid} Challenges</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
