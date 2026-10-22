"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const deadlineMs = new Date(submissionDeadline).getTime();
  const endMs = new Date(endDate).getTime();

  // Phase Determination
  let phase: "upcoming" | "submissions_open" | "judging" | "ended";
  let targetMs: number;
  let phaseTitle: string;
  let phaseBadge: { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode };

  if (now < startMs) {
    phase = "upcoming";
    targetMs = startMs;
    phaseTitle = "Competition Begins In";
    phaseBadge = {
      label: "Upcoming Challenge",
      variant: "secondary",
      icon: <Clock className="size-3 text-blue-500" />,
    };
  } else if (now < deadlineMs) {
    phase = "submissions_open";
    targetMs = deadlineMs;
    phaseTitle = "Submissions Close In";
    phaseBadge = {
      label: "Hacking Live Now",
      variant: "default",
      icon: <Radio className="size-3 text-emerald-400 animate-pulse" />,
    };
  } else if (now < endMs) {
    phase = "judging";
    targetMs = endMs;
    phaseTitle = "Winners Announced In";
    phaseBadge = {
      label: "Judging Phase",
      variant: "secondary",
      icon: <Award className="size-3 text-amber-500" />,
    };
  } else {
    phase = "ended";
    targetMs = 0;
    phaseTitle = "Hackathon Concluded";
    phaseBadge = {
      label: "Challenge Ended",
      variant: "outline",
      icon: <CheckCircle2 className="size-3 text-muted-foreground" />,
    };
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Live Countdown Hero Widget */}
      <Card className="border rounded-2xl shadow-xs overflow-hidden relative bg-gradient-to-br from-card via-card to-muted/20 py-0 gap-0">
        <CardHeader className="py-4 px-6 border-b bg-muted/20 flex flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary shrink-0" /> Live Competition Clock
            </span>
            <CardTitle className="text-base font-bold flex items-center gap-2 truncate">
              {phaseTitle}
            </CardTitle>
          </div>
          <Badge
            variant={phaseBadge.variant}
            className="rounded-full px-2.5 py-1 text-xs font-semibold gap-1.5 shrink-0"
          >
            {phaseBadge.icon}
            {phaseBadge.label}
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {phase === "ended" ? (
            <div className="text-center py-4 space-y-2">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="font-extrabold text-base text-foreground">Competition Closed</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Submissions are locked and the hackathon has concluded. Check the winners showcase!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
              {[
                { label: "Days", value: timeRemaining.days },
                { label: "Hours", value: timeRemaining.hours },
                { label: "Minutes", value: timeRemaining.minutes },
                { label: "Seconds", value: timeRemaining.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="p-2 sm:p-3 rounded-xl border bg-background/80 shadow-2xs flex flex-col items-center justify-center min-w-0"
                >
                  <span className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums">
                    {mounted ? String(unit.value).padStart(2, "0") : "--"}
                  </span>
                  <span className="text-[0.62rem] sm:text-[0.7rem] uppercase tracking-wider font-bold text-muted-foreground mt-0.5 truncate w-full">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar of Competition Duration */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground font-medium">
              <span>Competition Progress</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Milestones & Dates Stepper */}
      <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="size-4 text-primary shrink-0" /> Key Milestones & Dates
          </CardTitle>
          <CardDescription className="text-xs">
            Mark your calendar so your team never misses a key deadline.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
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
                <div key={step.id} className="relative group">
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
                  <div className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          {step.title}
                        </span>
                        {step.active && (
                          <span className="inline-flex items-center text-[0.65rem] font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
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
                    <div className="pt-0.5">
                      <a
                        href={generateGoogleCalendarUrl(step.title, step.dateStr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-full hover:bg-primary/10 border border-primary/20 bg-background/60 cursor-pointer"
                        title="Add reminder to Google Calendar"
                      >
                        <CalendarPlus className="size-3.5 shrink-0" />
                        <span>Add to Google Calendar</span>
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
