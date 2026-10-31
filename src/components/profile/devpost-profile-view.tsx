"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useModalAlert } from "@/components/ui/modal-alert";
import {
  Rocket,
  Trophy,
  Users,
  Calendar,
  Globe,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Layers,
  FileCode2,
  Code2,
  Edit3,
  Award,
  ArrowUpRight,
  FileText,
  Check,
  Copy,
  Clock,
  Loader2,
  XCircle,
  Send,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  User,
  SessionUser,
  UserProjectSubmission,
  UserHackathonParticipation,
  Skill,
  TeamInvitation,
} from "@/lib/db/types";
import { ProfileEditor, COUNTRIES } from "@/app/profile/profile-editor";
import { InviteToTeamDialog } from "@/components/team/invite-to-team-dialog";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { UserAvatar } from "@/components/ui/user-avatar";

function GithubIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface DevpostProfileViewProps {
  user: User;
  projects: UserProjectSubmission[];
  hackathons: UserHackathonParticipation[];
  currentUser: SessionUser | null;
  availableSkills?: Skill[];
  invitations?: TeamInvitation[];
  initialTab?: "projects" | "hackathons" | "invites" | "about" | "edit";
}

export function DevpostProfileView({
  user,
  projects,
  hackathons,
  currentUser,
  availableSkills = [],
  invitations = [],
  initialTab = "projects",
}: DevpostProfileViewProps) {
  const isSelf = currentUser?.id === user.id;
  const { showAlert } = useModalAlert();
  const [activeTab, setActiveTab] = useState<"projects" | "hackathons" | "invites" | "about" | "edit">(initialTab);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invites, setInvites] = useState<TeamInvitation[]>(invitations);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [isProfileCopied, setIsProfileCopied] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [invitesSubTab, setInvitesSubTab] = useState<"received" | "sent">("received");

  const handleCopyProfileLink = async () => {
    if (!user.username) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://hack4win.online";
    const url = `${origin}/u/${user.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsProfileCopied(true);
      setTimeout(() => setIsProfileCopied(false), 2000);
    } catch {
      setIsProfileCopied(true);
      setTimeout(() => setIsProfileCopied(false), 2000);
    }
  };

  const handleRespondInvite = async (inviteId: string, status: "accepted" | "declined") => {
    setRespondingInviteId(inviteId);
    try {
      const res = await fetch(`/api/team-invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update invitation");
      }
      setInvites((prev) =>
        prev.map((inv) => (inv.id === inviteId ? { ...inv, status } : inv))
      );
    } catch (err) {
      await showAlert({
        title: "Invitation Error",
        message: err instanceof Error ? err.message : "Failed to update invitation",
        type: "error",
      });
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleCopyInviteLink = async (inviteId: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/team-invites/${inviteId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch {
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    }
  };

  const receivedInvites = invites.filter((inv) => inv.receiver_id === currentUser?.id);
  const sentInvites = invites.filter((inv) => inv.sender_id === currentUser?.id);
  const pendingReceivedCount = receivedInvites.filter((inv) => inv.status === "pending").length;

  const userCountryObj = COUNTRIES.find(
    (c) => c.name.toLowerCase() === (user.country || "India").toLowerCase()
  );

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* 1. DEVPOST-STYLE HERO HEADER & IDENTITY CARD                   */}
      {/* ============================================================== */}
      <div className="rounded-3xl border bg-card overflow-hidden shadow-xs">
        {/* Profile Banner */}
        <div className="h-44 sm:h-56 w-full relative bg-gradient-to-r from-primary/30 via-primary/10 to-muted/40 overflow-hidden">
          {user.banner_url ? (
            <img
              src={user.banner_url}
              alt={`${user.name || "User"} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-muted/30 flex items-center justify-center opacity-70">
              <Sparkles className="size-16 text-primary/30 animate-pulse" />
            </div>
          )}
        </div>

        {/* Identity & Actions Container */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar & Verification */}
            <div className="relative inline-block shrink-0">
              <UserAvatar
                src={user.image}
                name={user.name}
                alt={user.name || "User avatar"}
                className="size-28 sm:size-32 rounded-3xl border-4 border-card shadow-md bg-card"
                iconClassName="size-14"
              />
              {user.email_verified && (
                <div
                  className="absolute bottom-1 right-1 p-1 bg-emerald-500 text-white rounded-full border-2 border-card shadow-xs"
                  title="Verified Participant"
                >
                  <CheckCircle2 className="size-4" />
                </div>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
              {isSelf ? (
                <Button
                  size="sm"
                  onClick={() => setActiveTab(activeTab === "edit" ? "projects" : "edit")}
                  className="rounded-full text-xs font-bold gap-1.5 shadow-2xs cursor-pointer h-9 px-4"
                >
                  <Edit3 className="size-3.5" />
                  {activeTab === "edit" ? "View Public Profile" : "Edit Profile"}
                </Button>
              ) : (
                <>
                  {hackathons.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setIsInviteDialogOpen(true)}
                      className="rounded-full text-xs font-bold gap-1.5 shadow-2xs cursor-pointer h-9 px-5"
                    >
                      <Users className="size-3.5" />
                      Work with {user.name?.split(" ")[0] || "Builder"}
                    </Button>
                  )}
                  {getSafeExternalUrl(user.website) && (
                    <Button asChild variant="outline" size="sm" className="rounded-full text-xs h-9">
                      <a href={getSafeExternalUrl(user.website)} target="_blank" rel="noreferrer">
                        <Globe className="size-3.5 mr-1 text-primary" /> Portfolio
                      </a>
                    </Button>
                  )}
                </>
              )}

              {user.username && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyProfileLink}
                  className="rounded-full text-xs font-bold gap-1.5 shadow-2xs cursor-pointer h-9 px-3.5"
                  title={`Copy vanity profile link: /u/${user.username}`}
                >
                  {isProfileCopied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-muted-foreground" />
                      <span>Share /u/{user.username}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {user.name || "Anonymous Participant"}
              </h1>
              {user.username && (
                <span className="text-sm font-semibold text-muted-foreground font-mono">
                  @{user.username}
                </span>
              )}
              <Badge variant="secondary" className="rounded-full text-[11px] font-bold capitalize">
                {user.role}
              </Badge>
              {user.participation_type && (
                <Badge
                  variant="outline"
                  className={`rounded-full text-[11px] font-bold gap-1 ${
                    user.participation_type === "solo"
                      ? "text-muted-foreground border-border"
                      : user.participation_type === "has_team"
                      ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/5"
                      : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                  }`}
                >
                  <Users className="size-3" />
                  {user.participation_type === "solo"
                    ? "Solo Builder"
                    : user.participation_type === "has_team"
                    ? "In a Team"
                    : "Looking for Teammates"}
                </Badge>
              )}
            </div>

            {user.bio ? (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {user.bio}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Participant, builder, and challenge competitor on Hack4Win.
              </p>
            )}

            {/* Quick Metadata Bar */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                <span>
                  {userCountryObj?.flag || "🌍"} {user.country || "India"}
                </span>
              </span>

              {user.github_username && (
                <a
                  href={`https://github.com/${user.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <GithubIcon className="size-3.5 text-primary" />
                  <span>github.com/{user.github_username}</span>
                </a>
              )}

              {getSafeExternalUrl(user.website) && (
                <a
                  href={getSafeExternalUrl(user.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Globe className="size-3.5 text-primary" />
                  <span className="truncate max-w-[180px]">{user.website?.replace(/^https?:\/\//, "")}</span>
                </a>
              )}

              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>
                  Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Ribbon Bar */}
        <div className="grid grid-cols-3 border-t bg-muted/15 py-3 px-6 text-center divide-x divide-border">
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className="hover:opacity-80 transition-opacity cursor-pointer space-y-0.5"
          >
            <div className="text-xl sm:text-2xl font-black text-foreground">{projects.length}</div>
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
              <Rocket className="size-3 text-primary" /> Projects
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hackathons")}
            className="hover:opacity-80 transition-opacity cursor-pointer space-y-0.5"
          >
            <div className="text-xl sm:text-2xl font-black text-foreground">{hackathons.length}</div>
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
              <Trophy className="size-3 text-primary" /> Hackathons
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className="hover:opacity-80 transition-opacity cursor-pointer space-y-0.5"
          >
            <div className="text-xl sm:text-2xl font-black text-foreground">{user.skills?.length || 0}</div>
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
              <Code2 className="size-3 text-primary" /> Skills
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DEVPOST-STYLE TABS NAVIGATION BAR                           */}
      {/* ============================================================== */}
      <div className="border-b bg-card/60 backdrop-blur-xs rounded-2xl p-1.5 flex items-center justify-between gap-2 shadow-2xs border">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto">
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
              className={`rounded-full px-1.5 py-0 text-[10px] ml-1 ${
                activeTab === "projects" ? "border-primary-foreground/30 text-primary-foreground" : ""
              }`}
            >
              {projects.length}
            </Badge>
          </button>

          {/* Hackathons Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("hackathons")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === "hackathons"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Trophy className="size-4 shrink-0" />
            <span>Hackathons</span>
            <Badge
              variant={activeTab === "hackathons" ? "outline" : "secondary"}
              className={`rounded-full px-1.5 py-0 text-[10px] ml-1 ${
                activeTab === "hackathons" ? "border-primary-foreground/30 text-primary-foreground" : ""
              }`}
            >
              {hackathons.length}
            </Badge>
          </button>

          {/* Team Invites Tab (Only for current user) */}
          {isSelf && (
            <button
              type="button"
              onClick={() => setActiveTab("invites")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                activeTab === "invites"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Users className="size-4 shrink-0" />
              <span>Team Invites</span>
              {pendingReceivedCount > 0 ? (
                <Badge className="rounded-full px-1.5 py-0 text-[10px] ml-1 bg-emerald-500 text-white font-bold animate-pulse">
                  {pendingReceivedCount}
                </Badge>
              ) : (
                <Badge
                  variant={activeTab === "invites" ? "outline" : "secondary"}
                  className={`rounded-full px-1.5 py-0 text-[10px] ml-1 ${
                    activeTab === "invites" ? "border-primary-foreground/30 text-primary-foreground" : ""
                  }`}
                >
                  {invites.length}
                </Badge>
              )}
            </button>
          )}

          {/* About & Skills Tab */}
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
            <span>About & Skills</span>
          </button>

          {/* Edit Profile Tab (If current user) */}
          {isSelf && (
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                activeTab === "edit"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Edit3 className="size-4 shrink-0" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TAB CONTENT VIEWS                                           */}
      {/* ============================================================== */}

      {/* TAB 1: PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Projects Showcase ({projects.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Solutions, prototypes, and products built by {user.name || "this user"}.
              </p>
            </div>
            {isSelf && (
              <Button asChild size="sm" className="rounded-full text-xs font-bold gap-1.5">
                <Link href="/hackathons">
                  <Rocket className="size-3.5" /> Submit to Hackathon
                </Link>
              </Button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-3">
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Layers className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">No projects published yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {isSelf
                    ? "You haven't submitted any projects yet. Join an active hackathon to build and showcase your work!"
                    : `${user.name || "This user"} hasn't published any hackathon projects yet.`}
                </p>
              </div>
              {isSelf ? (
                <Button asChild size="sm" className="rounded-full text-xs font-bold mt-2">
                  <Link href="/hackathons">Explore Active Hackathons</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
                  <Link href="/hackathons">Explore Live Challenges</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="rounded-2xl border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between py-0 gap-0"
                >
                  <div className="space-y-3">
                    {/* Cover image */}
                    {project.cover_image ? (
                      <Link href={`/projects/${project.id}`} className="block h-40 w-full overflow-hidden relative bg-muted group">
                        <img
                          src={project.cover_image}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                    ) : (
                      <Link href={`/projects/${project.id}`} className="block h-32 w-full bg-gradient-to-br from-primary/15 via-muted/30 to-background flex items-center justify-center group">
                        <Rocket className="size-8 text-primary/40 group-hover:scale-110 transition-transform" />
                      </Link>
                    )}

                    <div className="p-5 pt-1 space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                          <Trophy className="size-3 shrink-0" />
                          <Link
                            href={`/hackathons/${project.hackathon_slug}`}
                            className="hover:underline truncate"
                          >
                            {project.hackathon_title}
                          </Link>
                        </div>
                        <h3 className="text-base font-extrabold text-foreground leading-snug hover:text-primary transition-colors">
                          <Link href={`/projects/${project.id}`}>
                            {project.title}
                          </Link>
                        </h3>
                        {project.tagline && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {project.tagline}
                          </p>
                        )}
                      </div>

                      {/* Team Members */}
                      {(() => {
                        const members =
                          project.team_members && project.team_members.length > 0
                            ? project.team_members
                            : [
                                {
                                  id: project.user_id,
                                  name: user.name || "Builder",
                                  image: user.image || null,
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
                                          className={`size-6 rounded-full shadow-xs ${
                                            isPending
                                              ? "ring-2 ring-amber-500/80 border border-dashed border-amber-500"
                                              : "ring-2 ring-card hover:ring-primary"
                                          }`}
                                          fallbackClassName={
                                            isPending
                                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                              : "bg-primary/10 text-primary"
                                          }
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
                                    : `/users/${members[0]?.id || project.user_id}`
                                }
                                className="flex items-center gap-2 min-w-0 flex-1 group/user hover:text-primary transition-colors cursor-pointer"
                              >
                                <UserAvatar
                                  src={members[0]?.image}
                                  name={members[0]?.name}
                                  alt={members[0]?.name || "Builder"}
                                  className={`size-5 rounded-full shrink-0 ring-1 ${
                                    members[0]?.status === "pending"
                                      ? "ring-amber-500/70 border border-dashed border-amber-500"
                                      : "ring-border group-hover/user:ring-primary"
                                  }`}
                                  fallbackClassName={
                                    members[0]?.status === "pending"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                      : "bg-primary/10 text-primary"
                                  }
                                />
                                <span className="font-semibold text-foreground group-hover/user:text-primary truncate max-w-[140px] sm:max-w-[180px]">
                                  {members[0]?.name || members[0]?.email || user.name || "Anonymous Builder"}
                                </span>
                                {members[0]?.status === "pending" && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                                    <Clock className="size-2.5" /> Not Accepted Yet
                                  </span>
                                )}
                              </Link>
                            )}
                          </div>
                        );
                      })()}

                      {/* Tech stack */}
                      {project.tech_stack && project.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {project.tech_stack.slice(0, 4).map((tech) => (
                            <Badge key={tech} variant="secondary" className="rounded-full text-[10px]">
                              {tech}
                            </Badge>
                          ))}
                          {project.tech_stack.length > 4 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{project.tech_stack.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Links footer */}
                  <div className="p-4 pt-2 border-t flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="size-3" /> View Project
                      </Link>
                      {getSafeExternalUrl(project.demo_url) && (
                        <a
                          href={getSafeExternalUrl(project.demo_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <Globe className="size-3" /> Live Demo
                        </a>
                      )}
                      {getSafeExternalUrl(project.github_url) && (
                        <a
                          href={getSafeExternalUrl(project.github_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1"
                        >
                          <GithubIcon className="size-3" /> GitHub
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HACKATHONS */}
      {activeTab === "hackathons" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Hackathons Participated ({hackathons.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Challenges where {user.name || "this user"} registered, formed teams, and competed.
            </p>
          </div>

          {hackathons.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-3">
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Trophy className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">No hackathons joined yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {isSelf
                    ? "Join upcoming hackathons on Hack4Win to challenge your skills and win cash prizes."
                    : `${user.name || "This user"} hasn't registered for any public hackathons yet.`}
                </p>
              </div>
              {isSelf ? (
                <Button asChild size="sm" className="rounded-full text-xs font-bold mt-2">
                  <Link href="/hackathons">Browse Hackathons</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
                  <Link href="/hackathons">Explore Live Challenges</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {hackathons.map((h) => (
                <div
                  key={h.id}
                  className="p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/hackathons/${h.slug}`}
                        className="font-bold text-base text-foreground hover:text-primary transition-colors truncate"
                      >
                        {h.title}
                      </Link>
                      <Badge
                        variant={h.status === "ongoing" ? "default" : "secondary"}
                        className="rounded-full text-[10px] font-bold capitalize"
                      >
                        {h.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`rounded-full text-[10px] font-bold gap-1 ${
                          h.participation_type === "solo"
                            ? "text-muted-foreground"
                            : h.participation_type === "has_team"
                            ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/5"
                            : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        }`}
                      >
                        <Users className="size-2.5" />
                        {h.participation_type === "solo"
                          ? "Solo Participant"
                          : h.participation_type === "has_team"
                          ? "In a Team"
                          : "Looking for Team"}
                      </Badge>
                    </div>

                    {h.tagline && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{h.tagline}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium pt-0.5">
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <Award className="size-3" /> {h.prize_pool} Total Prizes
                      </span>
                      <span className="capitalize">{h.format}</span>
                      <span>
                        Registered {new Date(h.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold shrink-0">
                    <Link href={`/hackathons/${h.slug}`}>
                      View Hackathon <ArrowUpRight className="size-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: TEAM INVITATIONS (Only for self) */}
      {isSelf && activeTab === "invites" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" /> Team Collaborations & Invitations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your received team requests and invitations you have sent to fellow participants.
              </p>
            </div>

            {/* Sub-Tabs: Received vs Sent */}
            <div className="inline-flex items-center p-1 rounded-full border bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => setInvitesSubTab("received")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  invitesSubTab === "received"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Inbox className="size-3.5" />
                <span>Received</span>
                <Badge
                  variant={invitesSubTab === "received" ? "default" : "secondary"}
                  className="rounded-full text-[10px] px-1.5 py-0 ml-0.5"
                >
                  {receivedInvites.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setInvitesSubTab("sent")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  invitesSubTab === "sent"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Send className="size-3.5" />
                <span>Sent</span>
                <Badge
                  variant={invitesSubTab === "sent" ? "default" : "secondary"}
                  className="rounded-full text-[10px] px-1.5 py-0 ml-0.5"
                >
                  {sentInvites.length}
                </Badge>
              </button>
            </div>
          </div>

          {/* Received Invites List */}
          {invitesSubTab === "received" && (
            <div className="space-y-3.5">
              {receivedInvites.length === 0 ? (
                <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-3">
                  <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Inbox className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-foreground">No received team invitations</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      When other participants invite you to collaborate on their hackathon project, their invites will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                receivedInvites.map((inv) => (
                  <Card key={inv.id} className="rounded-2xl border bg-card p-5 space-y-4 hover:border-primary/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <UserAvatar
                          src={inv.sender_image}
                          name={inv.sender_name}
                          alt={inv.sender_name || "Sender"}
                          className="size-10 rounded-full border shrink-0 mt-0.5 bg-primary/10 text-primary"
                          iconClassName="size-5 text-primary"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {inv.sender_name || "A Participant"}
                            </span>
                            <span className="text-xs text-muted-foreground">wants to team up for</span>
                            <Link
                              href={`/hackathons/${inv.hackathon_slug || inv.hackathon_id}`}
                              className="font-bold text-xs text-primary hover:underline truncate max-w-xs"
                            >
                              {inv.hackathon_title || "Hackathon Challenge"}
                            </Link>
                          </div>

                          {inv.team_name && (
                            <div className="text-xs text-muted-foreground font-medium">
                              Proposed Squad: <strong className="text-foreground">{inv.team_name}</strong>
                            </div>
                          )}

                          {inv.message && (
                            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border leading-relaxed mt-2 italic">
                              &ldquo;{inv.message}&rdquo;
                            </p>
                          )}

                          {inv.contact_info && (
                            <div className="text-[11px] text-muted-foreground pt-1">
                              Contact: <span className="font-semibold text-foreground">{inv.contact_info}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant="outline"
                        className={`self-start rounded-full text-xs font-bold capitalize px-3 py-1 shrink-0 ${
                          inv.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : inv.status === "declined"
                            ? "text-muted-foreground border-border"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                        }`}
                      >
                        {inv.status === "pending" ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3 animate-spin" /> Pending Response
                          </span>
                        ) : inv.status === "accepted" ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="size-3" /> Team Accepted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <XCircle className="size-3" /> Declined
                          </span>
                        )}
                      </Badge>
                    </div>

                    {/* Actions if Pending */}
                    {inv.status === "pending" && (
                      <div className="pt-3 border-t flex flex-wrap items-center justify-end gap-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondInvite(inv.id, "declined")}
                          disabled={respondingInviteId === inv.id}
                          className="rounded-full text-xs font-semibold h-8 px-4 cursor-pointer"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespondInvite(inv.id, "accepted")}
                          disabled={respondingInviteId === inv.id}
                          className="rounded-full text-xs font-bold h-8 px-5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          {respondingInviteId === inv.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Accept & Team Up
                        </Button>
                      </div>
                    )}

                    {/* Actions if Accepted */}
                    {inv.status === "accepted" && (
                      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="size-4" /> You and {inv.sender_name || "your partner"} are official team partners!
                        </span>
                        <Button asChild size="sm" className="rounded-full text-xs font-bold gap-1.5">
                          <Link href={`/hackathons/${inv.hackathon_slug || inv.hackathon_id}/submit`}>
                            <Rocket className="size-3" /> Submit Team Project
                          </Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Sent Invites List */}
          {invitesSubTab === "sent" && (
            <div className="space-y-3.5">
              {sentInvites.length === 0 ? (
                <div className="p-12 rounded-3xl border border-dashed text-center bg-card/50 space-y-3">
                  <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Send className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-foreground">No sent team invitations</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Explore hackathons, browse the participants roster, and click &ldquo;Work Together&rdquo; to invite teammates!
                    </p>
                  </div>
                  <Button asChild size="sm" className="rounded-full text-xs font-bold mt-2">
                    <Link href="/hackathons">Explore Hackathons</Link>
                  </Button>
                </div>
              ) : (
                sentInvites.map((inv) => (
                  <Card key={inv.id} className="rounded-2xl border bg-card p-5 space-y-3.5 hover:border-primary/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            Invited {inv.receiver_name || inv.receiver_email}
                          </span>
                          <span className="text-xs text-muted-foreground">for</span>
                          <Link
                            href={`/hackathons/${inv.hackathon_slug || inv.hackathon_id}`}
                            className="font-bold text-xs text-primary hover:underline truncate max-w-xs"
                          >
                            {inv.hackathon_title || "Hackathon Challenge"}
                          </Link>
                        </div>

                        {inv.team_name && (
                          <div className="text-xs text-muted-foreground font-medium">
                            Team: <strong className="text-foreground">{inv.team_name}</strong>
                          </div>
                        )}

                        {inv.message && (
                          <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border leading-relaxed mt-2 italic">
                            &ldquo;{inv.message}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <Badge
                        variant="outline"
                        className={`self-start rounded-full text-xs font-bold capitalize px-3 py-1 shrink-0 ${
                          inv.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : inv.status === "declined"
                            ? "text-muted-foreground border-border"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                        }`}
                      >
                        {inv.status === "pending" ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3 animate-spin" /> Pending Response
                          </span>
                        ) : inv.status === "accepted" ? (
                          <span className="flex items-center gap-1.5">
                            <Check className="size-3" /> Accepted!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <XCircle className="size-3" /> Declined
                          </span>
                        )}
                      </Badge>
                    </div>

                    {/* Invite Link Copy & View */}
                    <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyInviteLink(inv.id)}
                          className="rounded-full text-xs h-8 gap-1.5 cursor-pointer"
                        >
                          {copiedInviteId === inv.id ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>{copiedInviteId === inv.id ? "Copied Link!" : "Copy Invite Link"}</span>
                        </Button>

                        <Button asChild size="sm" variant="ghost" className="rounded-full text-xs h-8">
                          <Link href={`/team-invites/${inv.id}`}>
                            Open Invitation Page <ExternalLink className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </div>

                      <span className="text-[11px] text-muted-foreground">
                        Sent {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ABOUT & SKILLS */}
      {activeTab === "about" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
          {/* Left Column: Bio Story */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileCode2 className="size-4 text-primary shrink-0" /> Participant Biography & Story
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {user.bio || "No detailed biography provided yet."}
              </CardContent>
            </Card>

            {/* Skills Badges Cloud */}
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Code2 className="size-4 text-primary shrink-0" /> Technical Skills & Tools ({user.skills?.length || 0})
                </CardTitle>
                <CardDescription className="text-xs">
                  Technologies, languages, and frameworks {user.name?.split(" ")[0] || "this participant"} builds with.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {user.skills && user.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="rounded-full text-xs px-3 py-1 font-semibold border bg-background shadow-2xs text-foreground"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No skills listed yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Metadata & Details */}
          <div className="space-y-6">
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-sm font-bold">Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Location
                  </span>
                  <span className="text-foreground font-semibold text-xs flex items-center gap-1.5 mt-0.5">
                    {userCountryObj?.flag || "🌍"} {user.country || "India"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Platform Role
                  </span>
                  <span className="text-foreground font-semibold text-xs capitalize mt-0.5 block">
                    {user.role}
                  </span>
                </div>

                {user.github_username && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      GitHub
                    </span>
                    <a
                      href={`https://github.com/${user.github_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold text-xs mt-0.5 inline-flex items-center gap-1"
                    >
                      @{user.github_username} <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {getSafeExternalUrl(user.website) && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Portfolio
                    </span>
                    <a
                      href={getSafeExternalUrl(user.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold text-xs mt-0.5 inline-flex items-center gap-1 truncate max-w-full"
                    >
                      {user.website?.replace(/^https?:\/\//, "")} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Joined Hack4Win
                  </span>
                  <span className="text-muted-foreground font-medium text-xs mt-0.5 block">
                    {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: EDIT PROFILE (Only rendered when isSelf) */}
      {isSelf && activeTab === "edit" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <ProfileEditor initialUser={user} availableSkills={availableSkills} />
        </div>
      )}

      {/* Team Invitation Dialog */}
      {!isSelf && hackathons.length > 0 && (
        <InviteToTeamDialog
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          targetUser={user}
          hackathonId={hackathons[0]?.id}
          hackathonTitle={hackathons[0]?.title}
        />
      )}
    </div>
  );
}
