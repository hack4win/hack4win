"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getHackathonStatus, type Hackathon, type User, type HackathonSubmission, type SessionUser } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileCode2,
  Trophy,
  Users,
  Rocket,
  Search,
  ExternalLink,
  Video,
  Globe,
  Plus,
  CheckCircle2,
  Code2,
  ShieldCheck,
  Gift,
  Smartphone,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  UserCheck,
  User as UserIcon,
  Clock,
  CreditCard,
} from "lucide-react";
import { InviteToTeamDialog } from "@/components/team/invite-to-team-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";

interface HackathonTabsProps {
  hackathon: Hackathon;
  initialParticipants: User[];
  initialSubmissions: HackathonSubmission[];
  currentUser: SessionUser | null;
  isRegistered: boolean;
  initialTab?: "about" | "projects" | "participants";
}

export function HackathonTabs({
  hackathon,
  initialParticipants,
  initialSubmissions,
  currentUser,
  isRegistered,
  initialTab,
}: HackathonTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"about" | "projects" | "participants">(
    initialTab || "about"
  );

  // Participants state
  const [participants] = useState<User[]>(initialParticipants);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedInviteUser, setSelectedInviteUser] = useState<User | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<HackathonSubmission[]>(initialSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<HackathonSubmission | null>(null);

  // Status checks for disabling/enabling actions
  const dynamicStatus = getHackathonStatus(hackathon);
  const isUpcoming = dynamicStatus === "upcoming";
  const isEnded = dynamicStatus === "ended" || hackathon.status === "ended";
  const [isDeadlinePassed] = useState(() =>
    Boolean(
      hackathon.submission_deadline &&
        new Date(hackathon.submission_deadline).getTime() < Date.now()
    )
  );
  const isSubmissionsClosed = isEnded || isDeadlinePassed;

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = p.name?.toLowerCase().includes(q);
    const emailMatch = p.email.toLowerCase().includes(q);
    const skillMatch = p.skills?.some((s) => s.toLowerCase().includes(q));
    const roleMatch = p.role?.toLowerCase().includes(q);
    return nameMatch || emailMatch || skillMatch || roleMatch;
  });

  return (
    <div className="space-y-6">
      {/* Devpost-style Horizontal Navigation Bar */}
      <div className="border-b bg-card/60 backdrop-blur-xs rounded-2xl p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs border">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto pb-0.5 sm:pb-0">
          {/* About Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === "about"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileCode2 className="size-4 shrink-0" />
            <span>About</span>
          </button>

          {/* Projects Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === "projects"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Rocket className="size-4 shrink-0" />
            <span>Projects</span>
            <Badge
              variant={activeTab === "projects" ? "outline" : "secondary"}
              className={`text-[10px] px-1.5 py-0 rounded-full font-bold ml-0.5 ${
                activeTab === "projects" ? "border-primary-foreground/30 text-primary-foreground bg-primary-foreground/15" : ""
              }`}
            >
              {submissions.length}
            </Badge>
          </button>

          {/* Participants Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("participants")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === "participants"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="size-4 shrink-0" />
            <span>Participants</span>
            <Badge
              variant={activeTab === "participants" ? "outline" : "secondary"}
              className={`text-[10px] px-1.5 py-0 rounded-full font-bold ml-0.5 ${
                activeTab === "participants" ? "border-primary-foreground/30 text-primary-foreground bg-primary-foreground/15" : ""
              }`}
            >
              {participants.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. ABOUT TAB CONTENT                                          */}
      {/* ============================================================== */}
      {activeTab === "about" && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          {/* Overview / Markdown Guidelines */}
          <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-4 px-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileCode2 className="size-5 text-primary shrink-0" /> Challenge Guidelines & Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed mission brief, problem statements, and requirements for this challenge.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <MarkdownPreview content={hackathon.description} />
            </CardContent>
          </Card>

          {/* Devpost-style Prizes Section */}
          {hackathon.prizes && hackathon.prizes.length > 0 && (() => {
            const cleanPrizePool = (hackathon.prize_pool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");
            const cleanCurr = (hackathon.currency || "₹").trim();

            return (
              <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
                <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Trophy className="size-5 text-primary shrink-0" /> Prizes
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5 break-words">
                      {cleanPrizePool} in total prizes across {hackathon.prizes.length} award {hackathon.prizes.length === 1 ? "tier" : "tiers"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-xs bg-primary/5 text-primary border-primary/20 shrink-0 self-start sm:self-auto max-w-full truncate">
                    {cleanPrizePool} Total
                  </Badge>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hackathon.prizes.map((tier, idx) => {
                      const isNonCash = tier.type === "non-cash";
                      let formattedAmount = "";
                      if (tier.amount !== undefined && tier.amount !== null) {
                        const rawAmount = String(tier.amount);
                        const numStr = rawAmount.replace(/[^0-9.]/g, "");
                        if (numStr && !isNaN(parseFloat(numStr))) {
                          formattedAmount = `${cleanCurr}${parseFloat(numStr).toLocaleString("en-IN")}`;
                        } else {
                          formattedAmount = rawAmount.replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");
                        }
                      }

                      const isFirst = idx === 0 || tier.title.toLowerCase().includes("1st");
                      const isSecond = idx === 1 || tier.title.toLowerCase().includes("2nd");
                      const isThird = idx === 2 || tier.title.toLowerCase().includes("3rd");

                      const medalIcon = isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : "🏆";
                      const borderClass = isFirst
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                        : isSecond
                        ? "border-slate-400/30 bg-slate-500/5 hover:border-slate-400/50"
                        : isThird
                        ? "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
                        : "border-border/80 bg-muted/20 hover:border-primary/40";

                      return (
                        <div
                          key={tier.id || idx}
                          className={`p-5 rounded-2xl border transition-all duration-200 space-y-3 ${borderClass}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background border shadow-2xs">
                              <span>{medalIcon}</span>
                              <span className="truncate max-w-[150px] sm:max-w-none">{tier.title}</span>
                            </span>

                            <span className="text-[0.68rem] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider bg-background shadow-2xs shrink-0">
                              {isNonCash ? (
                                <span className="text-primary flex items-center gap-1">
                                  <Gift className="size-3" /> Non-Cash / Device
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Cash Prize
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Main Prize Label */}
                          <div>
                            {isNonCash ? (
                              <h4 className="font-black text-base sm:text-lg text-foreground flex items-center gap-1.5 leading-snug break-words">
                                <Smartphone className="size-4 text-primary shrink-0" />
                                <span className="break-words">{tier.item_name || "Physical Device / Hardware"}</span>
                              </h4>
                            ) : (
                              <div className="font-black text-xl sm:text-2xl text-primary tracking-tight break-words">
                                {formattedAmount}
                              </div>
                            )}
                          </div>

                          {tier.description ? (
                            <p className="text-xs text-muted-foreground leading-relaxed break-words">
                              {tier.description}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              {isNonCash
                                ? "Brand new hardware reward provided directly to the winning team."
                                : "Awarded to the top qualifying project for this category."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Submission Requirements Checklist */}
          <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-4 px-6">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary shrink-0" /> Submission Deliverables
              </CardTitle>
              <CardDescription className="text-xs">
                Make sure your project contains all required deliverables before the deadline.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5">
              <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20">
                <Code2 className="size-4 text-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">Open Source Repository</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Public repository containing source code, installation instructions, and an MIT/Apache compatible license.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20">
                <Video className="size-4 text-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">Video Pitch & Demonstration</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    A 2-3 minute video demonstration walking through user flow, architecture, and value proposition.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20">
                <Globe className="size-4 text-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">Live Deployment URL</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Working web, API, or test deployment accessible to judges for interactive evaluation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracks & Tags */}
          {hackathon.tags && hackathon.tags.length > 0 && (
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold">Categories & Technological Tracks</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  {hackathon.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-3.5 py-1.5 rounded-full font-medium"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PROJECTS TAB CONTENT                                        */}
      {/* ============================================================== */}
      {activeTab === "projects" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Rocket className="size-4 text-primary" /> Submitted Projects ({submissions.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse submissions created by builders competing in {hackathon.title}.
              </p>
            </div>

            {isSubmissionsClosed ? (
              <Badge
                variant="outline"
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold gap-1.5 text-muted-foreground bg-muted/50 border-muted-foreground/30 shrink-0"
              >
                <Clock className="size-3.5" /> Submissions Closed
              </Badge>
            ) : isUpcoming ? (
              <Badge
                variant="outline"
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold gap-1.5 text-muted-foreground bg-muted/50 border-muted-foreground/30 shrink-0"
              >
                <Clock className="size-3.5 text-primary" /> Submissions Open at Hackathon Start
              </Badge>
            ) : isRegistered ? (
              <Button
                asChild
                className="rounded-full text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
              >
                <Link href={`/hackathons/${hackathon.slug}/submit`}>
                  <Plus className="size-3.5" /> Submit a Project
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-full text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
              >
                <Link
                  href={
                    hackathon.is_paid
                      ? `/hackathons/${hackathon.slug}/register`
                      : currentUser
                      ? `/hackathons/${hackathon.slug}?register=true`
                      : `/auth/signin?callbackUrl=/hackathons/${hackathon.slug}`
                  }
                >
                  {hackathon.is_paid ? (
                    <CreditCard className="size-3.5" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {currentUser
                    ? hackathon.is_paid
                      ? `Register & Pay (${hackathon.currency || "₹"}${hackathon.registration_fee || 0})`
                      : "Register for Hackathon to Submit"
                    : "Sign in to Register"}
                </Link>
              </Button>
            )}
          </div>

          {submissions.length === 0 ? (
            /* Devpost-style Empty Submissions State */
            <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-4">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Layers className="size-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-foreground">No projects submitted yet</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isSubmissionsClosed
                    ? "Submissions for this hackathon have concluded. No projects were submitted before the deadline."
                    : isUpcoming
                    ? "This hackathon has not started yet. Project submissions will open once the hackathon officially begins! Assemble your squad, brainstorm ideas, and get ready to build."
                    : "Project submissions are open for this hackathon! Form your team, build your prototype, and be the first to showcase your solution on the leaderboard."}
                </p>
              </div>

              {!isSubmissionsClosed && !isUpcoming && (
                <div className="pt-2">
                  {isRegistered ? (
                    <Button
                      asChild
                      className="rounded-full text-xs font-bold gap-1.5 cursor-pointer px-6 shadow-xs"
                    >
                      <Link href={`/hackathons/${hackathon.slug}/submit`}>
                        <Plus className="size-3.5" />
                        Submit Your Project
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="rounded-full text-xs font-bold gap-1.5 px-6 cursor-pointer shadow-xs"
                    >
                      <Link
                        href={
                          hackathon.is_paid
                            ? `/hackathons/${hackathon.slug}/register`
                            : currentUser
                            ? `/hackathons/${hackathon.slug}?register=true`
                            : `/auth/signin?callbackUrl=/hackathons/${hackathon.slug}`
                        }
                      >
                        {hackathon.is_paid ? (
                          <CreditCard className="size-3.5" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {currentUser
                          ? hackathon.is_paid
                            ? `Register & Pay (${hackathon.currency || "₹"}${hackathon.registration_fee || 0})`
                            : "Register for Hackathon to Submit"
                          : "Sign in to Register & Submit"}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Project Submissions Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border bg-card p-5 space-y-4 hover:border-primary/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between min-w-0"
                >
                  <div className="space-y-3 min-w-0">
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-base text-foreground leading-snug hover:text-primary transition-colors break-words line-clamp-2">
                          <Link href={`/projects/${sub.id}`}>
                            {sub.title}
                          </Link>
                        </h3>
                        {sub.tagline && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words">
                            {sub.tagline}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0 rounded-full">
                        Submitted
                      </Badge>
                    </div>

                    {/* Submitter & Team Members details */}
                    {(() => {
                      const members =
                        sub.team_members && sub.team_members.length > 0
                          ? sub.team_members
                          : [
                              {
                                id: sub.user_id,
                                name: sub.user_name || "Builder",
                                image: sub.user_image || null,
                                role: "Creator",
                              },
                            ];
                      const isMulti = members.length > 1;

                      return (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground min-w-0">
                          {isMulti ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Overlapping Profile Icons of all team members */}
                              <div className="flex items-center -space-x-2 shrink-0">
                                {members.map((member, mIdx) => {
                                  const isPending = member.status === "pending";
                                  return (
                                    <Link
                                      key={member.id || mIdx}
                                      href={member.username ? `/u/${member.username}` : `/users/${member.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`relative inline-block transition-transform hover:scale-115 hover:z-20 cursor-pointer ${
                                        isPending ? "opacity-90" : ""
                                      }`}
                                      title={`${member.name || member.email || "Builder"}${
                                        isPending ? " (Not Accepted Yet)" : member.role ? ` (${member.role})` : ""
                                      }`}
                                    >
                                      <UserAvatar
                                        src={member.image}
                                        name={member.name}
                                        alt={member.name || "Builder"}
                                        className={`size-6.5 rounded-full shadow-xs ${
                                          isPending
                                            ? "ring-2 ring-amber-500/80 border border-dashed border-amber-500"
                                            : "ring-2 ring-card hover:ring-primary"
                                        }`}
                                        fallbackClassName={
                                          isPending
                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                            : "bg-primary/10 text-primary"
                                        }
                                        iconClassName="size-3.5"
                                      />
                                      {isPending && (
                                        <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-amber-500 rounded-full flex items-center justify-center">
                                          <Clock className="size-1.5 text-white" />
                                        </div>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>

                              <div className="min-w-0 flex-1 truncate text-xs flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                                <span className="font-semibold text-foreground truncate">
                                  {members.map((m) => m.name || m.email || "Builder").join(", ")}
                                </span>
                                {members.some((m) => m.status === "pending") && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                                    <Clock className="size-2.5" /> Not Accepted Yet
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({members.length} team members)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={
                                members[0]?.username
                                  ? `/u/${members[0].username}`
                                  : `/users/${members[0]?.id || sub.user_id}`
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 min-w-0 flex-1 group/user hover:text-primary transition-colors cursor-pointer"
                            >
                              <UserAvatar
                                src={members[0]?.image}
                                name={members[0]?.name}
                                alt={members[0]?.name || "Builder"}
                                className={`size-6 rounded-full shrink-0 ring-1 ${
                                  members[0]?.status === "pending"
                                    ? "ring-amber-500/70 border border-dashed border-amber-500"
                                    : "ring-border group-hover/user:ring-primary"
                                }`}
                                fallbackClassName={
                                  members[0]?.status === "pending"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                    : "bg-primary/10 text-primary"
                                }
                                iconClassName="size-3.5"
                              />
                              <span className="font-semibold text-foreground group-hover/user:text-primary truncate max-w-[140px] sm:max-w-[180px]">
                                {members[0]?.name || members[0]?.email || sub.user_name || "Anonymous Builder"}
                              </span>
                              {members[0]?.status === "pending" && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                                  <Clock className="size-2.5" /> Not Accepted Yet
                                </span>
                              )}
                            </Link>
                          )}

                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Tech Stack Chips */}
                    {sub.tech_stack && sub.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sub.tech_stack.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-foreground truncate max-w-[120px]"
                          >
                            {tech}
                          </span>
                        ))}
                        {sub.tech_stack.length > 4 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{sub.tech_stack.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Links Bar */}
                  <div className="pt-3 border-t flex items-center justify-between gap-2 text-xs">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-bold h-7 px-3 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Link href={`/projects/${sub.id}`}>
                        <FileText className="size-3 mr-1" /> View Project
                      </Link>
                    </Button>

                    <div className="flex items-center gap-2">
                      {getSafeExternalUrl(sub.demo_url) && (
                        <a
                          href={getSafeExternalUrl(sub.demo_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Live Demo"
                        >
                          <Globe className="size-3.5" />
                        </a>
                      )}
                      {getSafeExternalUrl(sub.github_url) && (
                        <a
                          href={getSafeExternalUrl(sub.github_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Source Code"
                        >
                          <Code2 className="size-3.5" />
                        </a>
                      )}
                      {getSafeExternalUrl(sub.video_url) && (
                        <a
                          href={getSafeExternalUrl(sub.video_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Demo Video"
                        >
                          <Video className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. PARTICIPANTS TAB CONTENT                                    */}
      {/* ============================================================== */}
      {activeTab === "participants" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" /> Registered Builders ({participants.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Developers, designers, and engineers actively participating in this challenge.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search by name, role or skill..."
                className="pl-8.5 rounded-full text-xs h-8.5"
              />
            </div>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-2">
              <Users className="size-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No participants found</h3>
              <p className="text-xs text-muted-foreground">
                No registered participants match &ldquo;{participantSearch}&rdquo;. Try another search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredParticipants.map((user) => {
                const isCurrentUser = currentUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    onClick={() =>
                      router.push(user.username ? `/u/${user.username}` : `/users/${user.id}`)
                    }
                    className={`p-4 rounded-2xl border bg-card transition-all duration-200 flex flex-col justify-between space-y-3 min-w-0 cursor-pointer hover:border-primary/50 hover:shadow-xs group/card ${
                      isCurrentUser ? "border-primary/40 ring-1 ring-primary/20 bg-primary/5" : "hover:border-primary/40"
                    }`}
                  >
                    <div className="space-y-2.5 min-w-0">
                      {/* Avatar & Role Header */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1 group">
                          <UserAvatar
                            src={user.image}
                            name={user.name}
                            alt={user.name || "Participant"}
                            className="size-10 rounded-full border shrink-0 bg-primary/10 text-primary group-hover:scale-105 transition-transform"
                            iconClassName="size-5 text-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-foreground flex items-center gap-1.5 min-w-0 group-hover:text-primary transition-colors">
                              <span className="truncate">{user.name || "Anonymous Builder"}</span>
                              {isCurrentUser && (
                                <Badge className="text-[9px] px-1.5 py-0 rounded-full bg-primary text-primary-foreground shrink-0">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground capitalize block truncate">
                              {user.role || "Participant"}
                            </span>
                          </div>
                        </div>

                        {user.participation_type === "solo" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold rounded-full text-muted-foreground shrink-0 gap-1"
                          >
                            <UserIcon className="size-2.5" /> Solo Participant
                          </Badge>
                        ) : user.participation_type === "has_team" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold rounded-full text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/5 shrink-0 gap-1"
                          >
                            <Users className="size-2.5" /> In a Team
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold rounded-full text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shrink-0 gap-1"
                          >
                            <Users className="size-2.5" /> Looking for Team
                          </Badge>
                        )}
                      </div>

                      {/* Bio snippet */}
                      {user.bio ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                          {user.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Registered competitor ready to collaborate and build.
                        </p>
                      )}

                      {/* Skills Chips */}
                      {user.skills && user.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {user.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-foreground truncate max-w-[110px]"
                            >
                              {skill}
                            </span>
                          ))}
                          {user.skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{user.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer with Profile Link & Team Up action */}
                    <div className="pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.country && (
                          <>
                            <span className="font-semibold text-foreground">{user.country}</span>
                            <span>&middot;</span>
                          </>
                        )}
                        <span className="text-primary group-hover/card:underline font-bold inline-flex items-center gap-1">
                          View Profile &rarr;
                        </span>
                      </div>

                      {!isCurrentUser && !isEnded && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInviteUser(user);
                          }}
                          className="rounded-full text-[11px] font-bold gap-1.5 h-7 px-3 text-primary border-primary/20 hover:bg-primary/5 cursor-pointer"
                        >
                          <Users className="size-3" /> Work Together
                        </Button>
                      )}
                      {!isCurrentUser && isEnded && (
                        <span className="text-[10px] text-muted-foreground font-medium italic">
                          Competition Concluded
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* ============================================================== */}
      {/* VIEW SINGLE SUBMISSION DETAILS MODAL                           */}
      {/* ============================================================== */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                Project Submission
              </Badge>
              <span className="text-xs text-muted-foreground">
                Submitted by {selectedSubmission?.user_name || "Builder"}
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground pt-1 break-words">
              {selectedSubmission?.title}
            </DialogTitle>
            {selectedSubmission?.tagline && (
              <DialogDescription className="text-xs text-muted-foreground break-words">
                {selectedSubmission.tagline}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs">
            {/* Quick Links */}
            <div className="flex flex-wrap gap-2">
              {getSafeExternalUrl(selectedSubmission?.demo_url) && (
                <a
                  href={getSafeExternalUrl(selectedSubmission?.demo_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-xs"
                >
                  <Globe className="size-3" /> Live Demo
                </a>
              )}
              {getSafeExternalUrl(selectedSubmission?.github_url) && (
                <a
                  href={getSafeExternalUrl(selectedSubmission?.github_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-foreground font-bold text-xs hover:bg-muted"
                >
                  <Code2 className="size-3" /> GitHub Repo
                </a>
              )}
              {getSafeExternalUrl(selectedSubmission?.video_url) && (
                <a
                  href={getSafeExternalUrl(selectedSubmission?.video_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-foreground font-bold text-xs hover:bg-muted"
                >
                  <Video className="size-3" /> Demo Video
                </a>
              )}
            </div>

            {/* Tech Stack */}
            {selectedSubmission?.tech_stack && selectedSubmission.tech_stack.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Built With:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubmission.tech_stack.map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members List */}
            {selectedSubmission && (
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 mt-3">
                <span className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  {selectedSubmission.team_members && selectedSubmission.team_members.length > 1
                    ? `Project Builders (${selectedSubmission.team_members.length})`
                    : "Project Builder"}
                </span>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {(selectedSubmission.team_members && selectedSubmission.team_members.length > 0
                    ? selectedSubmission.team_members
                    : [
                        {
                          id: selectedSubmission.user_id,
                          name: selectedSubmission.user_name || "Builder",
                          image: selectedSubmission.user_image || null,
                          role: "Creator",
                          status: "accepted" as const,
                          email: null,
                        },
                      ]
                  ).map((m, mIdx) => {
                    const isPending = m.status === "pending";
                    const isCreator = m.id === selectedSubmission.user_id;

                    return (
                      <Link
                        key={m.id || mIdx}
                        href={m.username ? `/u/${m.username}` : `/users/${m.id}`}
                        className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-colors group cursor-pointer ${
                          isPending
                            ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                            : "bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <UserAvatar
                            src={m.image}
                            name={m.name || m.email}
                            alt={m.name || "Member"}
                            className={`size-6.5 rounded-full shrink-0 ${
                              isPending ? "ring-1 ring-amber-500/60 border border-dashed border-amber-500" : ""
                            }`}
                            fallbackClassName={
                              isPending
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-primary/10 text-primary"
                            }
                            iconClassName="size-3.5"
                          />
                          {isPending && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-amber-500 rounded-full flex items-center justify-center shadow-2xs">
                              <Clock className="size-1.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight truncate flex items-center gap-1.5">
                            <span>{m.name || m.email || "Builder"}</span>
                            {isCreator ? (
                              <Badge className="text-[8px] px-1.5 py-0 rounded-full bg-primary text-primary-foreground shrink-0 font-bold">
                                Lead
                              </Badge>
                            ) : isPending ? (
                              <Badge
                                variant="outline"
                                className="text-[8px] px-1.5 py-0 rounded-full border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 shrink-0 font-semibold gap-0.5"
                              >
                                <Clock className="size-2" /> Not Accepted Yet
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[8px] px-1.5 py-0 rounded-full border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 shrink-0 font-semibold"
                              >
                                Confirmed
                              </Badge>
                            )}
                          </div>
                          {m.role && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {m.role}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description rendered with Markdown */}
            <div className="p-5 rounded-2xl border bg-muted/20 space-y-3 mt-3">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                Project Overview & Story
              </span>
              <div className="text-sm leading-relaxed text-foreground">
                <MarkdownPreview content={selectedSubmission?.description || ""} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite to Team Dialog */}
      <InviteToTeamDialog
        isOpen={!!selectedInviteUser}
        onOpenChange={(open) => !open && setSelectedInviteUser(null)}
        targetUser={selectedInviteUser}
        hackathonId={hackathon.id}
        hackathonTitle={hackathon.title}
      />
    </div>
  );
}
