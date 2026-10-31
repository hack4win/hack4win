"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Award,
  Clock,
  Radio,
  Building,
  Timer,
  Flame,
  CalendarClock,
  CheckCircle2,
  Lock,
  Ticket,
} from "lucide-react";
import type { Hackathon } from "@/lib/db/types";
import { getHackathonStatus } from "@/lib/db/types";

interface HorizontalHackathonCardProps {
  hackathon: Hackathon;
  isRegistered?: boolean;
}

export function HorizontalHackathonCard({ hackathon, isRegistered }: HorizontalHackathonCardProps) {
  const dynamicStatus = getHackathonStatus(hackathon);

  // Status Styling & Left Border configuration
  const statusStyles = {
    ongoing: {
      leftBorder: "border-l-emerald-500 hover:border-l-emerald-600",
      badge: (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
          <Radio className="size-3 animate-pulse" /> Live Now
        </Badge>
      ),
    },
    upcoming: {
      leftBorder: "border-l-blue-500 hover:border-l-blue-600",
      badge: (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
          <Clock className="size-3" /> Upcoming
        </Badge>
      ),
    },
    ended: {
      leftBorder: "border-l-zinc-400 dark:border-l-zinc-600 hover:border-l-zinc-500",
      badge: (
        <Badge variant="outline" className="text-muted-foreground text-xs font-medium rounded-full px-2.5 py-0.5">
          Ended
        </Badge>
      ),
    },
    draft: {
      leftBorder: "border-l-amber-500 hover:border-l-amber-600",
      badge: (
        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 text-xs font-medium rounded-full px-2.5 py-0.5">
          Draft
        </Badge>
      ),
    },
  }[dynamicStatus];

  const startDateFormatted = new Date(hackathon.start_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDateFormatted = new Date(hackathon.end_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate dynamic remaining days tag for top right corner
  const getTimeRemainingTag = () => {
    if (dynamicStatus === "draft") {
      return {
        text: "Draft Challenge",
        isUnder24Hours: false,
        tooltip: "Draft Challenge - Not yet published",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        icon: <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />,
      };
    }

    const now = new Date().getTime();
    const start = new Date(hackathon.start_date).getTime();
    const end = new Date(hackathon.end_date).getTime();

    if (dynamicStatus === "upcoming") {
      const diffMs = start - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

      let text = "";
      if (diffDays > 1) {
        text = `Starts in ${diffDays} days`;
      } else if (diffDays === 1 || diffHours > 12) {
        text = `Starts tomorrow`;
      } else if (diffHours > 1) {
        text = `Starts in ${diffHours} hours`;
      } else if (diffHours === 1) {
        text = `Starts in 1 hour`;
      } else {
        text = `Starts today`;
      }

      return {
        text,
        isUnder24Hours: false,
        tooltip: `Competition Schedule: Starts on ${startDateFormatted}`,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        icon: <CalendarClock className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />,
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

      let text = "";
      if (diffHours === 1) {
        text = `Ends in 1 hour`;
      } else if (isUnder24Hours) {
        text = `Ends in ${diffHours} hours`;
      } else if (diffDays === 1 || diffHours <= 24) {
        text = `Ends tomorrow`;
      } else if (diffDays > 1) {
        text = `Ends in ${diffDays} days`;
      } else {
        text = `Ends today`;
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
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse ring-1 ring-rose-500/20"
          : isUrgent
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        icon: isUnder24Hours ? (
          <Flame className="size-4 shrink-0 text-rose-500 animate-pulse" />
        ) : isUrgent ? (
          <Flame className="size-4 shrink-0 text-rose-500" />
        ) : (
          <Timer className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ),
      };
    }

    // ended
    const diffMs = now - end;
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let text = "Ended";
    if (daysAgo === 0) {
      text = "Ended today";
    } else if (daysAgo === 1) {
      text = "Ended yesterday";
    } else if (daysAgo > 1 && daysAgo <= 30) {
      text = `Ended ${daysAgo} days ago`;
    } else {
      text = "Challenge Ended";
    }

    return {
      text,
      isUnder24Hours: false,
      tooltip: `Competition concluded on ${endDateFormatted}`,
      className: "bg-muted text-muted-foreground border-border/80",
      icon: <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />,
    };
  };

  const timeTag = getTimeRemainingTag();
  const cleanPrizePool = (hackathon.prize_pool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");

  return (
    <div
      className={`group overflow-hidden border border-l-4 sm:border-l-[6px] rounded-2xl bg-card hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row ${statusStyles.leftBorder} ${
        isRegistered ? "ring-1 ring-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.03] via-card to-card" : ""
      }`}
    >
      {/* Horizontal Left Banner Area */}
      <Link
        href={`/hackathons/${hackathon.slug}`}
        className="w-full sm:w-64 md:w-72 lg:w-80 shrink-0 h-48 sm:h-auto min-h-[190px] relative overflow-hidden bg-muted block group/banner cursor-pointer"
      >
        {hackathon.banner_url ? (
          <img
            src={hackathon.banner_url}
            alt={hackathon.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted text-primary">
            <Trophy className="size-16 stroke-[1.5]" />
          </div>
        )}

        {/* Overlay Format Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 flex-wrap">
          <Badge className="bg-black/75 backdrop-blur-md text-white border-0 text-[0.68rem] font-semibold capitalize rounded-full px-2.5 py-0.5">
            {hackathon.format}
          </Badge>
          {hackathon.is_private && (
            <Badge className="bg-purple-950/80 backdrop-blur-md text-purple-200 border border-purple-400/30 text-[0.68rem] font-bold rounded-full px-2 py-0.5 flex items-center gap-1">
              <Lock className="size-2.5" /> Private
            </Badge>
          )}
          {isRegistered && (
            <Badge className="bg-emerald-600 text-white border border-emerald-400/40 text-[0.68rem] font-black rounded-full px-2.5 py-0.5 flex items-center gap-1 shadow-md backdrop-blur-md">
              <CheckCircle2 className="size-3" /> Registered
            </Badge>
          )}
        </div>
      </Link>

      {/* Horizontal Right Content Area */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          {/* Header Row: Status badge & Highlighted Company Name on Left, Prominent Remaining Days Tag on Top Right */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              {statusStyles.badge}

              {isRegistered && (
                <Badge
                  data-testid="user-registered-badge"
                  className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 shadow-2xs"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" /> You&apos;re Registered
                </Badge>
              )}

              {hackathon.is_paid && hackathon.registration_fee && Number(hackathon.registration_fee) > 0 ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 text-xs font-semibold gap-1 rounded-full px-2.5 py-0.5">
                  <Ticket className="size-3" /> {hackathon.fee_currency || "₹"}{hackathon.registration_fee}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs font-medium rounded-full px-2.5 py-0.5">
                  Free
                </Badge>
              )}
              {hackathon.is_private && (
                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25 text-xs font-semibold gap-1 rounded-full px-2.5 py-0.5">
                  <Lock className="size-3" /> Campus
                </Badge>
              )}
              {/* Highlighted Company Name */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs shadow-2xs hover:bg-primary/15 transition-colors">
                <Building className="size-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-primary/70">By</span>
                <span className="truncate max-w-[140px] sm:max-w-[200px] text-primary font-extrabold tracking-tight">
                  {hackathon.organizer_name}
                </span>
              </div>
            </div>

            {/* Top Right: Remaining Days / Deadline Tag in larger font */}
            <div
              data-testid="hackathon-deadline-pill"
              className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs sm:text-sm md:text-base font-black tracking-tight border shadow-2xs shrink-0 transition-transform duration-200 group-hover:scale-105 ${timeTag.className}`}
              title={timeTag.tooltip}
            >
              {timeTag.isUnder24Hours && (
                <span data-testid="urgency-pulse-indicator" className="relative flex size-2 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-rose-500"></span>
                </span>
              )}
              {timeTag.icon}
              <span>{timeTag.text}</span>
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-foreground group-hover:text-primary transition-colors">
              <Link href={`/hackathons/${hackathon.slug}`} className="hover:underline">
                {hackathon.title}
              </Link>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {hackathon.tagline}
            </p>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs">
          {/* Metrics */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
            {/* Highlighted Prize Pool Badge */}
            <div
              data-testid="hackathon-prize-highlight"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-400/30 shadow-2xs hover:bg-amber-500/20 transition-all"
            >
              <div className="size-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-900/80 dark:text-amber-200/90 tracking-tight">
                  Prizes:
                </span>
                <span className="font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base tracking-tight">
                  {cleanPrizePool}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate max-w-[130px] font-medium">{hackathon.location}</span>
            </div>

            {/* Highlighted Participants Badge */}
            {hackathon.max_participants && hackathon.max_participants > 0 ? (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-2xs ${
                  (hackathon.participant_count ?? 0) >= hackathon.max_participants
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : (hackathon.participant_count ?? 0) / hackathon.max_participants > 0.8
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-500/25 dark:border-indigo-800/40 text-foreground"
                }`}
              >
                <div
                  className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                    (hackathon.participant_count ?? 0) >= hackathon.max_participants
                      ? "bg-rose-500/20 text-rose-600"
                      : (hackathon.participant_count ?? 0) / hackathon.max_participants > 0.8
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <Users className="size-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-foreground tracking-tight">
                    {hackathon.participant_count ?? 0}
                    <span className="text-muted-foreground font-normal text-[11px]"> / {hackathon.max_participants}</span>
                  </span>
                  <span
                    className={`text-[11px] font-extrabold ${
                      (hackathon.participant_count ?? 0) >= hackathon.max_participants
                        ? "text-rose-600 dark:text-rose-400"
                        : (hackathon.participant_count ?? 0) / hackathon.max_participants > 0.8
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    Participants
                  </span>
                  <div className="w-14 h-1.5 bg-indigo-500/20 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (hackathon.participant_count ?? 0) >= hackathon.max_participants
                          ? "bg-rose-500"
                          : (hackathon.participant_count ?? 0) / hackathon.max_participants > 0.8
                          ? "bg-amber-500"
                          : "bg-indigo-600 dark:bg-indigo-400"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((hackathon.participant_count ?? 0) / hackathon.max_participants) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  {(hackathon.participant_count ?? 0) >= hackathon.max_participants && (
                    <Badge
                      variant="outline"
                      className="text-[9px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 px-1.5 py-0 rounded-full font-bold uppercase"
                    >
                      Full
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/25 dark:border-indigo-800/40 text-foreground shadow-2xs hover:bg-indigo-500/15 transition-all">
                <div className="size-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="size-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-foreground tracking-tight">
                    {hackathon.participant_count ?? 0}
                  </span>
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                    {(hackathon.participant_count ?? 0) === 1 ? "Participant" : "Participants"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="font-medium">Max {hackathon.max_team_size} per team</span>
            </div>
          </div>

          {/* Tag Chips */}
          {hackathon.tags && hackathon.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {hackathon.tags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[0.65rem] px-2.5 py-0.5 rounded-full font-medium"
                >
                  {tag}
                </Badge>
              ))}
              {hackathon.tags.length > 4 && (
                <span className="text-[0.68rem] text-muted-foreground font-medium">
                  +{hackathon.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
