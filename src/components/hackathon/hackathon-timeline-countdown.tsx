"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  CalendarPlus,
  Sparkles,
} from "lucide-react";

interface HackathonTimelineCountdownProps {
  title: string;
  startDate: string;
  submissionDeadline: string;
  endDate: string;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const emptySubscribe = () => () => {};
function useIsClient() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function HackathonTimelineCountdown({
  title,
  startDate,
  submissionDeadline,
  endDate,
  className = "",
}: HackathonTimelineCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  const mounted = useIsClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startMs = new Date(startDate).getTime();
  const deadlineMs = new Date(submissionDeadline || endDate).getTime();
  const endMs = new Date(endDate).getTime();

  // Phase Determination: upcoming, live (submissions_open), judging, or ended
  type Phase = "upcoming" | "submissions_open" | "judging" | "ended";
  let phase: Phase;
  let targetMs: number;
  let phaseTitle: string;

  if (now < startMs) {
    phase = "upcoming";
    targetMs = startMs;
    phaseTitle = "Competition Begins In";
  } else if (now < deadlineMs) {
    phase = "submissions_open";
    targetMs = deadlineMs;
    phaseTitle = "Submissions Close In";
  } else if (now < endMs) {
    phase = "judging";
    targetMs = endMs;
    phaseTitle = "Winners Announced In";
  } else {
    phase = "ended";
    targetMs = 0;
    phaseTitle = "Hackathon Concluded";
  }

  // Calculate Remaining Time
  const diff = Math.max(0, targetMs - now);
  const timeRemaining: TimeRemaining = {
    totalMs: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };

  // Calculate Progress percentage
  let progressPercent = 0;
  if (phase === "upcoming") {
    progressPercent = 0;
  } else if (phase === "ended") {
    progressPercent = 100;
  } else {
    const totalDuration = endMs - startMs;
    const elapsed = now - startMs;
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  }

  // High-contrast status theme definitions
  const statusTheme = {
    submissions_open: {
      cardBg:
        "bg-gradient-to-b from-emerald-500/12 via-emerald-500/[0.04] to-card border-emerald-500/40 shadow-xs dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-card dark:border-emerald-500/40 ring-1 ring-emerald-500/20",
      headerBg: "bg-emerald-500/15 border-b border-emerald-500/25 dark:bg-emerald-950/50",
      categoryText: "text-emerald-700 dark:text-emerald-300",
      categoryIcon: (
        <span className="relative flex size-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </span>
      ),
      categoryLabel: "Live Competition Clock",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs border border-emerald-400/40 shrink-0">
          <Radio className="size-3.5 text-white animate-pulse" />
          <span>Hacking Live Now</span>
        </span>
      ),
      banner: (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
          <span className="relative flex size-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="leading-tight">Hackathon is live! Submissions are currently open.</span>
        </div>
      ),
      boxBorder: "border-emerald-500/30 bg-background/95",
      digitColor: "text-emerald-600 dark:text-emerald-400",
      progressFill: "bg-gradient-to-r from-emerald-500 to-teal-500",
      progressLabel: "Competition Progress",
    },
    upcoming: {
      cardBg:
        "bg-gradient-to-b from-blue-500/12 via-blue-500/[0.04] to-card border-blue-500/40 shadow-xs dark:from-blue-950/40 dark:via-blue-950/20 dark:to-card dark:border-blue-500/40 ring-1 ring-blue-500/20",
      headerBg: "bg-blue-500/15 border-b border-blue-500/25 dark:bg-blue-950/50",
      categoryText: "text-blue-700 dark:text-blue-300",
      categoryIcon: <Clock className="size-3.5 text-blue-500 shrink-0" />,
      categoryLabel: "Upcoming Challenge Clock",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs border border-blue-400/40 shrink-0">
          <Clock className="size-3.5 text-white" />
          <span>Upcoming &middot; Starts Soon</span>
        </span>
      ),
      banner: (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-200 text-xs font-semibold">
          <Sparkles className="size-3.5 text-blue-500 shrink-0" />
          <span className="leading-tight">Registration is open! Countdown to kickoff.</span>
        </div>
      ),
      boxBorder: "border-blue-500/30 bg-background/95",
      digitColor: "text-blue-600 dark:text-blue-400",
      progressFill: "bg-gradient-to-r from-blue-500 to-indigo-500",
      progressLabel: "Kickoff Countdown",
    },
    judging: {
      cardBg:
        "bg-gradient-to-b from-amber-500/12 via-amber-500/[0.04] to-card border-amber-500/40 shadow-xs dark:from-amber-950/40 dark:via-amber-950/20 dark:to-card dark:border-amber-500/40 ring-1 ring-amber-500/20",
      headerBg: "bg-amber-500/15 border-b border-amber-500/25 dark:bg-amber-950/50",
      categoryText: "text-amber-700 dark:text-amber-300",
      categoryIcon: <Award className="size-3.5 text-amber-500 shrink-0" />,
      categoryLabel: "Judging Phase Clock",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs border border-amber-400/40 shrink-0">
          <Award className="size-3.5 text-white" />
          <span>Judging In Progress</span>
        </span>
      ),
      banner: (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
          <Award className="size-3.5 text-amber-500 shrink-0" />
          <span className="leading-tight">Submissions locked! Judges are reviewing projects.</span>
        </div>
      ),
      boxBorder: "border-amber-500/30 bg-background/95",
      digitColor: "text-amber-600 dark:text-amber-400",
      progressFill: "bg-gradient-to-r from-amber-500 to-orange-500",
      progressLabel: "Judging Progress",
    },
    ended: {
      cardBg: "bg-gradient-to-b from-muted/80 via-muted/40 to-card border-border shadow-xs",
      headerBg: "bg-muted/60 border-b border-border",
      categoryText: "text-muted-foreground",
      categoryIcon: <CheckCircle2 className="size-3.5 text-muted-foreground shrink-0" />,
      categoryLabel: "Competition Status",
      badge: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground shadow-xs border border-border shrink-0">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <span>Challenge Ended</span>
        </span>
      ),
      banner: null,
      boxBorder: "border-border bg-background/95",
      digitColor: "text-muted-foreground",
      progressFill: "bg-muted-foreground/60",
      progressLabel: "Final Status",
    },
  }[phase];

  // Google Calendar Link Generator
  const generateGoogleCalendarUrl = (eventTitle: string, eventDate: string) => {
    const dateObj = new Date(eventDate);
    const startIso = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDateObj = new Date(dateObj.getTime() + 60 * 60 * 1000);
    const endIso = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `${title}: ${eventTitle}`);
    url.searchParams.set("dates", `${startIso}/${endIso}`);
    url.searchParams.set("details", `Hack4Win hackathon event reminder for ${title}.`);
    return url.toString();
  };

  const steps = [
    {
      id: "start",
      title: "Starts & Kickoff",
      dateStr: startDate,
      passed: now >= startMs,
      active: phase === "upcoming" || (now >= startMs && now < deadlineMs),
      icon: <Calendar className="size-4" />,
      tag: now < startMs ? "Upcoming" : "Started",
    },
    {
      id: "deadline",
      title: "Submission Deadline",
      dateStr: submissionDeadline,
      passed: now >= deadlineMs,
      active: phase === "submissions_open",
      icon: <Clock className="size-4" />,
      tag: now < deadlineMs ? "Urgent Target" : "Passed",
    },
    {
      id: "end",
      title: "Ends & Winners Announced",
      dateStr: endDate,
      passed: now >= endMs,
      active: phase === "judging",
      icon: <Award className="size-4" />,
      tag: now < endMs ? "Final Phase" : "Concluded",
    },
  ];

  const timeUnits = [
    { label: "Days", short: "Days", value: timeRemaining.days },
    { label: "Hours", short: "Hrs", value: timeRemaining.hours },
    { label: "Minutes", short: "Mins", value: timeRemaining.minutes },
    { label: "Seconds", short: "Secs", value: timeRemaining.seconds },
  ];

  return (
    <div className={`space-y-6 min-w-0 ${className}`}>
      {/* Live / Upcoming / Ended Countdown Hero Widget */}
      <Card
        className={cn(
          "border rounded-2xl shadow-xs overflow-hidden relative py-0 gap-0 transition-colors duration-300",
          statusTheme.cardBg
        )}
      >
        {/* Header with responsive wrapping so title and badge never squeeze or clip */}
        <CardHeader
          className={cn(
            "py-4 px-4 sm:px-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3",
            statusTheme.headerBg
          )}
        >
          <div className="space-y-1 min-w-0 flex-1">
            <span
              className={cn(
                "text-[0.68rem] font-black uppercase tracking-wider flex items-center gap-1.5",
                statusTheme.categoryText
              )}
            >
              {statusTheme.categoryIcon}
              <span>{statusTheme.categoryLabel}</span>
            </span>
            <CardTitle className="text-base sm:text-lg font-black tracking-tight text-foreground leading-snug break-words">
              {phaseTitle}
            </CardTitle>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            {statusTheme.badge}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Informational Status Banner */}
          {statusTheme.banner}

          {phase === "ended" ? (
            <div className="text-center py-5 space-y-3">
              <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-base text-foreground">Hackathon Concluded</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  The competition has officially finished. Submissions are closed and winners have been announced!
                </p>
              </div>
              <div className="pt-1 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground px-3 py-1.5 rounded-xl bg-muted border border-border">
                  🏁 100% Completed
                </span>
              </div>
            </div>
          ) : (
            /* Responsive 4-Column Countdown Grid with no truncation */
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 text-center">
              {timeUnits.map((unit) => (
                <div
                  key={unit.label}
                  className={cn(
                    "py-2.5 px-1 sm:py-3 sm:px-2 rounded-xl border flex flex-col items-center justify-center min-w-0 shadow-2xs transition-colors",
                    statusTheme.boxBorder
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none",
                      statusTheme.digitColor
                    )}
                  >
                    {mounted ? String(unit.value).padStart(2, "0") : "--"}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5 leading-none text-center">
                    <span className="hidden sm:inline">{unit.short}</span>
                    <span className="sm:hidden">{unit.short}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar of Competition Duration */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground font-semibold">
              <span>{statusTheme.progressLabel}</span>
              <span className="font-mono font-bold text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden relative border border-border/40">
              <div
                className={cn("h-full transition-all duration-500 rounded-full", statusTheme.progressFill)}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Milestones & Dates Stepper */}
      <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
        <CardHeader className="py-4 px-4 sm:px-6 border-b bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="size-4 text-primary shrink-0" /> Key Milestones & Dates
          </CardTitle>
          <CardDescription className="text-xs">
            Mark your calendar so your team never misses a key deadline.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {steps.map((step) => {
              const dateObj = new Date(step.dateStr);
              const formattedDate = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={step.id} className="relative group min-w-0">
                  {/* Step Marker Dot */}
                  <div
                    className={`absolute -left-6 top-1 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      step.passed
                        ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                        : step.active
                        ? "bg-background border-primary text-primary ring-3 ring-primary/20"
                        : "bg-background border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {step.passed ? (
                      <CheckCircle2 className="size-3 stroke-[3]" />
                    ) : (
                      <div className="size-1.5 rounded-full bg-current" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">
                          {step.title}
                        </span>
                        {step.active && (
                          <span className="inline-flex items-center text-[0.65rem] font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary shrink-0">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">{formattedDate}</span>
                        <span>&middot;</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>

                    {/* Google Calendar Sync Button */}
                    <div className="pt-0.5 min-w-0">
                      <a
                        href={generateGoogleCalendarUrl(step.title, step.dateStr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-full hover:bg-primary/10 border border-primary/20 bg-background/60 cursor-pointer max-w-full"
                        title="Add reminder to Google Calendar"
                      >
                        <CalendarPlus className="size-3.5 shrink-0" />
                        <span className="truncate">Add to Google Calendar</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
