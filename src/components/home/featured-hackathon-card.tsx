"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Calendar,
  Users,
  Award,
  Clock,
  Radio,
  Building,
  Timer,
  Flame,
  CalendarClock,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Lock,
} from "lucide-react";
import type { Hackathon } from "@/lib/db/types";
import { getHackathonStatus } from "@/lib/db/types";

interface FeaturedHackathonCardProps {
  hackathon: Hackathon;
}

export function FeaturedHackathonCard({ hackathon }: FeaturedHackathonCardProps) {
  const dynamicStatus = getHackathonStatus(hackathon);

  const statusBadge = {
    ongoing: (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[11px] font-bold gap-1 rounded-full px-2.5 py-0.5 shadow-2xs">
        <Radio className="size-2.5 animate-pulse text-emerald-500" /> Live Now
      </Badge>
    ),
    upcoming: (
      <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25 text-[11px] font-bold gap-1 rounded-full px-2.5 py-0.5 shadow-2xs">
        <Clock className="size-2.5 text-blue-500" /> Upcoming
      </Badge>
    ),
    ended: (
      <Badge variant="outline" className="text-muted-foreground text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-muted/30">
        Ended
      </Badge>
    ),
    draft: (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 text-[11px] font-semibold rounded-full px-2.5 py-0.5">
        Draft
      </Badge>
    ),
  }[dynamicStatus];

  // Modern formatted date range
  const startDateFormatted = new Date(hackathon.start_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDateFormatted = new Date(hackathon.end_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate dynamic remaining days / deadline urgency
  const getTimeRemainingTag = () => {
    if (dynamicStatus === "draft") {
      return {
        text: "Draft Challenge",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        icon: <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />,
      };
    }

    const now = new Date().getTime();
    const start = new Date(hackathon.start_date).getTime();
    const end = new Date(hackathon.end_date).getTime();

    if (dynamicStatus === "upcoming") {
      const diffMs = start - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

      let text = "Starts soon";
      if (diffDays > 1) {
        text = `Starts in ${diffDays} days`;
      } else if (diffDays === 1 || diffHours > 12) {
        text = "Starts tomorrow";
      } else if (diffHours > 1) {
        text = `Starts in ${diffHours} hours`;
      } else if (diffHours === 1) {
        text = "Starts in 1 hour";
      } else {
        text = "Starts today";
      }

      return {
        text,
        isUnder24Hours: false,
        tooltip: `Competition Schedule: Starts on ${startDateFormatted}`,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        icon: <CalendarClock className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />,
      };
    }

    if (dynamicStatus === "ongoing") {
      const deadlineDate = hackathon.submission_deadline && new Date(hackathon.submission_deadline).getTime() > now
        ? new Date(hackathon.submission_deadline)
        : new Date(hackathon.end_date);
      const targetMs = deadlineDate.getTime();
      const diffMs = targetMs - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

      const isUnder24Hours = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
      const isUrgent = isUnder24Hours || diffDays <= 2;

      let text = "Ends soon";
      if (diffHours === 1) {
        text = "Ends in 1 hour";
      } else if (isUnder24Hours) {
        text = `Ends in ${diffHours} hours`;
      } else if (diffDays === 1 || diffHours <= 24) {
        text = "Ends tomorrow";
      } else if (diffDays > 1) {
        text = `Ends in ${diffDays} days`;
      } else {
        text = "Ends today";
      }

      const exactBoundary = deadlineDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });

      const tooltip = isUnder24Hours
        ? `Imminent Deadline: Submissions close at ${exactBoundary} (less than 24 hours remaining!)`
        : `Competition Schedule: ${startDateFormatted} – ${endDateFormatted}`;

      return {
        text,
        isUnder24Hours,
        tooltip,
        className: isUnder24Hours
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse ring-1 ring-rose-500/20 font-bold"
          : isUrgent
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold",
        icon: isUnder24Hours ? (
          <Flame className="size-3.5 shrink-0 text-rose-500 animate-pulse" />
        ) : isUrgent ? (
          <Flame className="size-3.5 shrink-0 text-rose-500" />
        ) : (
          <Timer className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ),
      };
    }

    // ended
    const diffMs = now - end;
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let text = "Challenge Ended";
    if (daysAgo === 0) {
      text = "Ended today";
    } else if (daysAgo === 1) {
      text = "Ended yesterday";
    } else if (daysAgo > 1 && daysAgo <= 30) {
      text = `Ended ${daysAgo}d ago`;
    }

    return {
      text,
      isUnder24Hours: false,
      tooltip: `Competition concluded on ${endDateFormatted}`,
      className: "bg-muted text-muted-foreground border-border/80 font-medium",
      icon: <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />,
    };
  };

  const timeTag = getTimeRemainingTag();
  const cleanPrizePool = (hackathon.prize_pool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");
  const participantCount = hackathon.participant_count ?? 0;
  const maxParticipants = hackathon.max_participants ?? 0;
  const hasParticipantLimit = maxParticipants > 0;
  const isFull = hasParticipantLimit && participantCount >= maxParticipants;
  const fillPercentage = hasParticipantLimit
    ? Math.min(100, Math.round((participantCount / maxParticipants) * 100))
    : 0;

  return (
    <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden flex flex-col group border bg-card relative">
      {/* Banner / Visual Top */}
      <Link href={`/hackathons/${hackathon.slug}`} className="block relative overflow-hidden">
        {hackathon.banner_url ? (
          <div className="h-44 w-full bg-muted overflow-hidden relative border-b">
            <img
              src={hackathon.banner_url}
              alt={hackathon.title}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </div>
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-primary/15 via-primary/5 to-muted flex items-center justify-center border-b">
            <Trophy className="size-12 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        {/* Format Badge (Top Left) */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <Badge className="bg-background/90 backdrop-blur-md border text-[11px] font-bold capitalize text-foreground shadow-xs">
            {hackathon.format || "Online"}
          </Badge>
          {hackathon.is_private && (
            <Badge className="bg-purple-950/80 backdrop-blur-md text-purple-200 border border-purple-400/30 text-[11px] font-bold rounded-full px-2 py-0.5 flex items-center gap-1 shadow-xs">
              <Lock className="size-2.5" /> Campus
            </Badge>
          )}
        </div>

        {/* Live / Status Pill (Top Right) */}
        <div className="absolute top-3 right-3 z-10">
          {statusBadge}
        </div>

        {/* Dynamic Urgency / Modern Date Pill (Bottom Left on Banner) */}
        <div className="absolute bottom-3 left-3 z-10">
          <div
            data-testid="hackathon-deadline-pill"
            title={timeTag.tooltip}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border backdrop-blur-md shadow-xs ${timeTag.className}`}
          >
            {timeTag.isUnder24Hours && (
              <span data-testid="urgency-pulse-indicator" className="relative flex size-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-rose-500"></span>
              </span>
            )}
            {timeTag.icon}
            <span className="font-semibold">{timeTag.text}</span>
          </div>
        </div>
      </Link>

      {/* Card Header & Content */}
      <CardHeader className="gap-2 flex-1 pb-2 p-5 sm:p-6">
        {/* Organizer info */}
        {hackathon.organizer_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Building className="size-3.5 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground">By</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">
              {hackathon.organizer_name}
            </span>
          </div>
        )}

        {/* Title */}
        <CardTitle className="text-lg sm:text-xl font-black tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-1">
          <Link href={`/hackathons/${hackathon.slug}`} className="hover:underline">
            {hackathon.title}
          </Link>
        </CardTitle>

        {/* Tagline */}
        <CardDescription className="line-clamp-2 text-xs leading-relaxed text-muted-foreground min-h-[32px]">
          {hackathon.tagline || "Join creators and builders to develop next-generation software."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-4 px-5 sm:px-6">
        {/* Prize Pool Highlight Box */}
        <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-400/30 flex items-center justify-between shadow-2xs hover:bg-amber-500/15 transition-all">
          <span className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/90 flex items-center gap-1.5 font-bold tracking-tight">
            <Award className="size-4 text-amber-600 dark:text-amber-400 shrink-0" /> Prize Pool
          </span>
          <span className="font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base md:text-lg tracking-tight">
            {cleanPrizePool}
          </span>
        </div>

        {/* Modern Date Range */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground shrink-0" /> Schedule
          </span>
          <span className="font-semibold text-foreground font-mono text-[11px]">
            {startDateFormatted} – {endDateFormatted}
          </span>
        </div>

        {/* Highlighted Participants Stat */}
        <div
          className={`p-2.5 rounded-xl border transition-all shadow-2xs space-y-2 ${
            isFull
              ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              : fillPercentage > 80
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-500/25 dark:border-indigo-800/40 text-foreground"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`flex items-center gap-1.5 font-bold ${
                isFull
                  ? "text-rose-700 dark:text-rose-300"
                  : fillPercentage > 80
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-indigo-700 dark:text-indigo-300"
              }`}
            >
              <div
                className={`size-5 rounded-md flex items-center justify-center shrink-0 ${
                  isFull
                    ? "bg-rose-500/20 text-rose-600"
                    : fillPercentage > 80
                    ? "bg-amber-500/20 text-amber-600"
                    : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                }`}
              >
                <Users className="size-3" />
              </div>
              Participants
            </span>

            {hasParticipantLimit ? (
              <div className="flex items-center gap-1.5">
                <span className="font-black text-foreground">
                  {participantCount}
                  <span className="text-muted-foreground font-normal text-[11px]"> / {maxParticipants}</span>
                </span>
                {isFull && (
                  <Badge
                    variant="outline"
                    className="text-[9px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 px-1.5 py-0 rounded-full font-bold uppercase"
                  >
                    Full
                  </Badge>
                )}
              </div>
            ) : (
              <span className="font-black text-xs text-foreground">
                {participantCount} <span className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400">{participantCount === 1 ? "participant" : "participants"}</span>
              </span>
            )}
          </div>

          {/* Visual Progress Bar when limited */}
          {hasParticipantLimit && (
            <div className="w-full h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFull
                    ? "bg-rose-500"
                    : fillPercentage > 80
                    ? "bg-amber-500"
                    : "bg-indigo-600 dark:bg-indigo-400"
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>

      {/* Card Action Footer */}
      <CardFooter className="pt-0 p-5 sm:p-6 mt-auto">
        <Button
          asChild
          className="w-full rounded-full font-bold text-xs h-10 gap-1.5 shadow-xs group-hover:shadow-sm cursor-pointer"
          variant={dynamicStatus === "ended" ? "outline" : "default"}
        >
          <Link href={`/hackathons/${hackathon.slug}`}>
            {dynamicStatus === "ongoing"
              ? "Join Challenge"
              : dynamicStatus === "upcoming"
              ? "View & Pre-Register"
              : "View Showcase"}
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
