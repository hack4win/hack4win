"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Hackathon, HackathonSubmission, ProjectEvaluation, SessionUser, PrizeTier } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Trophy,
  Gavel,
  Star,
  Award,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  Code2,
  Play,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  MessageSquare,
  AlertCircle,
  Loader2,
  User,
  Users,
  ChevronRight,
  TrendingUp,
  X,
  Share2,
  Check,
  Gift,
  Smartphone,
} from "lucide-react";

interface JudgingClientProps {
  hackathons: Hackathon[];
  initialHackathonId: string;
  initialSubmissions: HackathonSubmission[];
  initialEvaluations: ProjectEvaluation[];
  currentUser: SessionUser;
}

const RUBRIC_CRITERIA = [
  {
    key: "score_innovation",
    name: "Innovation & Originality",
    desc: "Uniqueness, creative problem solving, and novel approach to the problem statement.",
  },
  {
    key: "score_technical",
    name: "Technical Execution",
    desc: "Architecture robustness, stack complexity, code quality, and engineering craft.",
  },
  {
    key: "score_design",
    name: "UI / UX & Design",
    desc: "Visual appeal, intuitive user experience, typography, responsiveness, and polish.",
  },
  {
    key: "score_impact",
    name: "Potential Impact",
    desc: "Real-world viability, market applicability, and scale of problem addressed.",
  },
  {
    key: "score_presentation",
    name: "Demo & Completeness",
    desc: "Working interactive demo, video walkthrough, documentation, and overall pitch quality.",
  },
] as const;

export const COMMON_DISTINCTIONS = [
  "🤖 Best AI / ML Innovation",
  "⚙️ Best Technical Architecture",
  "🎨 Best UI / UX Design",
  "🚀 Most Impactful Solution",
  "❤️ Community Favorite",
  "🌟 Honorable Mention",
  "💡 Most Creative Concept",
  "🛡️ Best Security & Privacy",
];

export function getTierIcon(title: string, index: number): string {
  const t = title.toLowerCase();
  if (/^(\p{Emoji})/u.test(title)) return "";
  if (t.includes("1st") || index === 0) return "🥇";
  if (t.includes("2nd") || index === 1) return "🥈";
  if (t.includes("3rd") || index === 2) return "🥉";
  if (t.includes("ai") || t.includes("ml")) return "🤖";
  if (t.includes("mobile") || t.includes("ios") || t.includes("android")) return "📱";
  if (t.includes("design") || t.includes("ui") || t.includes("ux")) return "🎨";
  if (t.includes("spatial") || t.includes("vr") || t.includes("ar") || t.includes("vision")) return "🥽";
  if (t.includes("security") || t.includes("privacy")) return "🛡️";
  if (t.includes("hardware") || t.includes("iot") || t.includes("device")) return "⚙️";
  return "🏆";
}

export function formatTierReward(
  tier: PrizeTier,
  currency: string = "₹"
): { label: string; shortLabel: string } {
  const cleanCurr = (currency || "₹").replace(/["']/g, "").trim();
  if (tier.type === "non-cash") {
    const itemName = tier.item_name || "Physical Device / Hardware";
    let valStr = "";
    if (tier.amount != null) {
      const amountStr = String(tier.amount);
      const num = parseFloat(amountStr.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        valStr = ` (${cleanCurr}${num.toLocaleString("en-IN")})`;
      }
    }
    return {
      label: `${itemName}${valStr}`,
      shortLabel: itemName,
    };
  }
  // Cash prize
  if (tier.amount != null) {
    const amountStr = String(tier.amount);
    const numStr = amountStr.replace(/[^0-9.]/g, "");
    const num = parseFloat(numStr);
    const formatted =
      !isNaN(num) && num > 0
        ? `${cleanCurr}${num.toLocaleString("en-IN")}`
        : `${cleanCurr}${amountStr}`;
    return {
      label: `${formatted} Cash`,
      shortLabel: formatted,
    };
  }
  return { label: "Winner Award", shortLabel: "" };
}

export function JudgingClient({
  hackathons,
  initialHackathonId,
  initialSubmissions,
  initialEvaluations,
  currentUser,
}: JudgingClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [hackathonsList, setHackathonsList] = useState<Hackathon[]>(hackathons);
  const [selectedHackathonId, setSelectedHackathonId] = useState(initialHackathonId);
  const [submissions, setSubmissions] = useState<HackathonSubmission[]>(initialSubmissions);
  const [evaluations, setEvaluations] = useState<ProjectEvaluation[]>(initialEvaluations);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"projects" | "leaderboard" | "evaluations">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scored" | "unscored" | "winners">("all");

  // Scoring Modal State
  const [activeSubmission, setActiveSubmission] = useState<HackathonSubmission | null>(null);
  const [scoreInnovation, setScoreInnovation] = useState<number>(8);
  const [scoreTechnical, setScoreTechnical] = useState<number>(8);
  const [scoreDesign, setScoreDesign] = useState<number>(8);
  const [scoreImpact, setScoreImpact] = useState<number>(8);
  const [scorePresentation, setScorePresentation] = useState<number>(8);
  const [feedback, setFeedback] = useState<string>("");
  const [selectedAward, setSelectedAward] = useState<string>("");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSuccessMessage, setScoreSuccessMessage] = useState<string | null>(null);
  const [scoreErrorMessage, setScoreErrorMessage] = useState<string | null>(null);

  // Switch Hackathon
  const handleHackathonChange = async (newId: string) => {
    setSelectedHackathonId(newId);
    setIsLoadingData(true);
    startTransition(() => {
      router.push(`/admin/judging?hackathonId=${newId}`);
    });

    try {
      const res = await fetch(`/api/admin/judging?hackathonId=${newId}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
        setEvaluations(data.evaluations || []);
        if (data.hackathons && Array.isArray(data.hackathons)) {
          setHackathonsList(data.hackathons);
        }
      }
    } catch (err) {
      console.error("Error switching hackathon:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Open Score Modal
  const handleOpenScoreModal = (submission: HackathonSubmission) => {
    setActiveSubmission(submission);
    setScoreSuccessMessage(null);
    setScoreErrorMessage(null);

    // Check if current user or anyone has evaluated this
    const existing = evaluations.find(
      (e) => e.submission_id === submission.id && e.judge_id === currentUser.id
    ) || evaluations.find((e) => e.submission_id === submission.id);

    if (existing) {
      setScoreInnovation(existing.score_innovation || 8);
      setScoreTechnical(existing.score_technical || 8);
      setScoreDesign(existing.score_design || 8);
      setScoreImpact(existing.score_impact || 8);
      setScorePresentation(existing.score_presentation || 8);
      setFeedback(existing.feedback || "");
      setSelectedAward(existing.award || submission.winner_badge || "");
    } else {
      setScoreInnovation(8);
      setScoreTechnical(8);
      setScoreDesign(8);
      setScoreImpact(8);
      setScorePresentation(8);
      setFeedback("");
      setSelectedAward(submission.winner_badge || "");
    }
  };

  const currentTotalScore =
    scoreInnovation + scoreTechnical + scoreDesign + scoreImpact + scorePresentation;

  const isSelfProject = Boolean(
    activeSubmission &&
      (activeSubmission.user_id === currentUser.id ||
        activeSubmission.team_member_ids?.includes(currentUser.id))
  );

  // Submit Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    if (isSelfProject) {
      setScoreErrorMessage("Judges cannot evaluate their own project submission.");
      return;
    }

    const scores = [scoreInnovation, scoreTechnical, scoreDesign, scoreImpact, scorePresentation];
    if (scores.some((s) => s < 1 || s > 10 || isNaN(s))) {
      setScoreErrorMessage("All scoring criteria must be graded between 1 and 10.");
      return;
    }

    if (feedback && feedback.trim().length > 5000) {
      setScoreErrorMessage("Feedback critique must not exceed 5,000 characters.");
      return;
    }

    setIsSubmittingScore(true);
    setScoreErrorMessage(null);
    setScoreSuccessMessage(null);

    try {
      const trimmedAward = selectedAward.trim();
      const payload = {
        submission_id: activeSubmission.id,
        hackathon_id: selectedHackathonId,
        score_innovation: scoreInnovation,
        score_technical: scoreTechnical,
        score_design: scoreDesign,
        score_impact: scoreImpact,
        score_presentation: scorePresentation,
        feedback,
        award: trimmedAward ? trimmedAward : null,
      };

      const res = await fetch("/api/admin/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save score");
      }

      const savedEval: ProjectEvaluation = data.evaluation;

      // Update evaluations list
      setEvaluations((prev) => {
        const filtered = prev.filter(
          (e) => !(e.submission_id === savedEval.submission_id && e.judge_id === savedEval.judge_id)
        );
        return [savedEval, ...filtered];
      });

      // Update submissions list
      setSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id === activeSubmission.id) {
            return {
              ...sub,
              total_score: currentTotalScore,
              judging_status: "scored",
              winner_badge: trimmedAward || null,
              is_featured: Boolean(trimmedAward) ? true : sub.is_featured,
            };
          }
          return sub;
        })
      );

      setScoreSuccessMessage("Project evaluated and score recorded! 🎯");
      setTimeout(() => {
        setActiveSubmission(null);
      }, 1200);
    } catch (err) {
      setScoreErrorMessage(err instanceof Error ? err.message : "Error saving score");
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.tagline && sub.tagline.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.user_name && sub.user_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "scored") return (sub.total_score || 0) > 0;
    if (statusFilter === "unscored") return !sub.total_score || sub.total_score === 0;
    if (statusFilter === "winners") return Boolean(sub.winner_badge);

    return true;
  });

  // Aggregated Stats
  const totalCount = submissions.length;
  const scoredCount = submissions.filter((s) => (s.total_score || 0) > 0).length;
  const unscoredCount = totalCount - scoredCount;
  const completionRate = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0;
  const topProject = [...submissions].sort(
    (a, b) => (b.total_score || 0) - (a.total_score || 0)
  )[0];

  const currentHackathon =
    hackathonsList.find((h) => h.id === selectedHackathonId) ||
    hackathons.find((h) => h.id === selectedHackathonId);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Gavel className="size-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Admin Judging & Scoring Portal
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review hackathon projects, grade on a 50-point rubric, provide judge critique, and designate official winners.
          </p>
        </div>

        {/* Hackathon Picker */}
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Active Hackathon
            </label>
            <select
              value={selectedHackathonId}
              onChange={(e) => handleHackathonChange(e.target.value)}
              className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/20 min-w-[220px] max-w-[320px] cursor-pointer shadow-xs"
            >
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} ({h.prize_pool})
                </option>
              ))}
            </select>
          </div>

          {currentHackathon && (
            <Button variant="outline" size="sm" asChild className="rounded-xl h-10 mt-5">
              <Link href={`/hackathons/${currentHackathon.slug}`} target="_blank">
                <ExternalLink className="size-3.5 mr-1.5" /> View Public Page
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Submissions Received</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black">{scoredCount}</div>
              <div className="text-xs text-muted-foreground">
                Evaluated ({completionRate}% done)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black">{unscoredCount}</div>
              <div className="text-xs text-muted-foreground">Awaiting Review</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
              <Trophy className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black truncate">
                {topProject && topProject.total_score ? `${topProject.total_score} / 50` : "—"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {topProject && topProject.total_score ? topProject.title : "Leaderboard Peak"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border max-w-fit">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "projects"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "leaderboard"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="size-3.5 text-amber-500" /> Leaderboard Ranking
          </button>
          <button
            onClick={() => setActiveTab("evaluations")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "evaluations"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Critique Log ({evaluations.length})
          </button>
        </div>

        {/* Search & Filter Controls */}
        {activeTab === "projects" && (
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects or builders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-medium cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="unscored">Awaiting Score</option>
              <option value="scored">Scored</option>
              <option value="winners">Winners & Badged</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Areas */}
      {isLoadingData ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 border rounded-2xl bg-card">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading submissions and scoring data...</p>
        </div>
      ) : activeTab === "projects" ? (
        /* PROJECTS SCORING GRID */
        filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center border rounded-2xl bg-card space-y-3">
            <Trophy className="size-10 text-muted-foreground mx-auto stroke-1" />
            <h3 className="text-base font-bold">No submissions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? "No projects match your search query."
                : "There are currently no projects submitted for this hackathon."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubmissions.map((sub) => {
              const hasScore = typeof sub.total_score === "number" && sub.total_score > 0;
              return (
                <Card
                  key={sub.id}
                  className="rounded-2xl border bg-card shadow-xs overflow-hidden flex flex-col hover:border-primary/40 transition-all group"
                >
                  {/* Cover Header */}
                  <div className="h-36 w-full relative bg-muted overflow-hidden border-b">
                    {sub.cover_image ? (
                      <img
                        src={sub.cover_image}
                        alt={sub.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
                        <Sparkles className="size-10" />
                      </div>
                    )}

                    {/* Score Badge Overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {hasScore ? (
                        <span className="px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border text-xs font-black flex items-center gap-1 shadow-xs text-amber-500">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          {sub.total_score} / 50
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border text-[11px] font-semibold text-muted-foreground">
                          Unscored
                        </span>
                      )}
                    </div>

                    {/* Winner Badge */}
                    {sub.winner_badge && (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-amber-500 text-white border-0 font-bold text-xs shadow-md">
                          {sub.winner_badge}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                          {sub.title}
                        </h3>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {sub.tagline || sub.description || "No project tagline provided."}
                      </p>

                      {/* Submitter info */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <UserAvatar
                          src={sub.user_image}
                          name={sub.user_name || "Builder"}
                          alt={sub.user_name || "User"}
                          className="size-6 rounded-full bg-primary/10 text-primary border shrink-0"
                          iconClassName="size-3 text-primary"
                        />
                        <span className="text-xs font-medium text-foreground truncate">
                          {sub.user_name || "Anonymous Builder"}
                        </span>
                      </div>

                      {/* Tech Stack Chips */}
                      {sub.tech_stack && sub.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {sub.tech_stack.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono"
                            >
                              {tech}
                            </span>
                          ))}
                          {sub.tech_stack.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                              +{sub.tech_stack.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Links & Score Action */}
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getSafeExternalUrl(sub.demo_url) && (
                            <a
                              href={getSafeExternalUrl(sub.demo_url)}
                              target="_blank"
                              rel="noreferrer"
                              title="Live Demo"
                              className="p-1.5 hover:text-primary transition-colors hover:bg-muted rounded-md"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                          {getSafeExternalUrl(sub.github_url) && (
                            <a
                              href={getSafeExternalUrl(sub.github_url)}
                              target="_blank"
                              rel="noreferrer"
                              title="GitHub Repository"
                              className="p-1.5 hover:text-primary transition-colors hover:bg-muted rounded-md"
                            >
                              <Code2 className="size-3.5" />
                            </a>
                          )}
                          {getSafeExternalUrl(sub.video_url) && (
                            <a
                              href={getSafeExternalUrl(sub.video_url)}
                              target="_blank"
                              rel="noreferrer"
                              title="Demo Video Walkthrough"
                              className="p-1.5 hover:text-primary transition-colors hover:bg-muted rounded-md"
                            >
                              <Play className="size-3.5" />
                            </a>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenScoreModal(sub)}
                          className="rounded-xl h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                          variant={hasScore ? "outline" : "default"}
                        >
                          <Gavel className="size-3.5" />
                          {hasScore ? "Update Score" : "Judge Project"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === "leaderboard" ? (
        /* LEADERBOARD VIEW */
        <Card className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" /> Hackathon Official Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Ranked order of evaluated submissions based on rubric scoring and assigned awards.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                    <th className="px-6 py-3.5 w-16 text-center">Rank</th>
                    <th className="px-6 py-3.5">Project</th>
                    <th className="px-6 py-3.5">Submitter</th>
                    <th className="px-6 py-3.5 text-center">Rubric Score</th>
                    <th className="px-6 py-3.5">Award / Distinction</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map((sub, idx) => {
                    const hasScore = typeof sub.total_score === "number" && sub.total_score > 0;
                    const rank = idx + 1;
                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-center font-black">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-500/15 text-amber-600 font-bold text-xs border border-amber-500/30">
                              🥇 1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center size-7 rounded-full bg-slate-300/30 text-slate-600 dark:text-slate-300 font-bold text-xs border">
                              🥈 2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-bold text-xs border">
                              🥉 3
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">#{rank}</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-muted overflow-hidden shrink-0 border">
                              {sub.cover_image ? (
                                <img
                                  src={sub.cover_image}
                                  alt={sub.title}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="size-full flex items-center justify-center text-primary/40">
                                  <Sparkles className="size-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate">{sub.title}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {sub.tagline || sub.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium">
                          {sub.user_name || "Anonymous Builder"}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {hasScore ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-black text-xs gap-1">
                              <Star className="size-3 fill-amber-500" />
                              {sub.total_score} / 50
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unscored</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {sub.winner_badge ? (
                            <Badge className="bg-amber-500 text-white font-bold text-xs">
                              {sub.winner_badge}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenScoreModal(sub)}
                            className="rounded-xl h-8 px-3 text-xs font-bold gap-1 cursor-pointer"
                          >
                            <Gavel className="size-3" /> Grade
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* EVALUATION CRITIQUE LOG */
        <Card className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" /> Judge Critique & Scorecard History
            </CardTitle>
            <CardDescription className="text-xs">
              Audit log of all evaluations submitted by judges for this hackathon.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {evaluations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No evaluations recorded yet for this hackathon.
              </div>
            ) : (
              <div className="space-y-4">
                {evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div>
                        <div className="font-bold text-sm">Judge: {ev.judge_name}</div>
                        <div className="text-[11px] text-muted-foreground">{ev.judge_email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.award && (
                          <Badge className="bg-amber-500 text-white text-xs font-bold">
                            {ev.award}
                          </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-black">
                          Score: {ev.total_score} / 50
                        </Badge>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground block">Innovation</span>
                        <span className="font-bold">{ev.score_innovation} / 10</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground block">Technical</span>
                        <span className="font-bold">{ev.score_technical} / 10</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground block">Design</span>
                        <span className="font-bold">{ev.score_design} / 10</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground block">Impact</span>
                        <span className="font-bold">{ev.score_impact} / 10</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground block">Demo & Pitch</span>
                        <span className="font-bold">{ev.score_presentation} / 10</span>
                      </div>
                    </div>

                    {/* Written Critique */}
                    {ev.feedback && (
                      <div className="text-xs p-3 rounded-lg bg-card border text-foreground/90 italic">
                        &quot;{ev.feedback}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SCORECARD RUBRIC MODAL */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-bold gap-1">
                    <Gavel className="size-3" /> Judge Rubric Evaluation
                  </Badge>
                  {activeSubmission.winner_badge && (
                    <Badge className="bg-amber-500 text-white text-xs font-bold">
                      {activeSubmission.winner_badge}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black">{activeSubmission.title}</h2>
                <p className="text-xs text-muted-foreground">
                  By {activeSubmission.user_name || "Anonymous Builder"} • {activeSubmission.tagline}
                </p>
              </div>

              <button
                onClick={() => setActiveSubmission(null)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Quick Demo & Code Links */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {getSafeExternalUrl(activeSubmission.demo_url) && (
                <Button variant="outline" size="sm" asChild className="rounded-xl h-8 text-xs">
                  <a href={getSafeExternalUrl(activeSubmission.demo_url)} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3 mr-1" /> Live Demo
                  </a>
                </Button>
              )}
              {getSafeExternalUrl(activeSubmission.github_url) && (
                <Button variant="outline" size="sm" asChild className="rounded-xl h-8 text-xs">
                  <a href={getSafeExternalUrl(activeSubmission.github_url)} target="_blank" rel="noreferrer">
                    <Code2 className="size-3 mr-1" /> GitHub Repo
                  </a>
                </Button>
              )}
              {getSafeExternalUrl(activeSubmission.video_url) && (
                <Button variant="outline" size="sm" asChild className="rounded-xl h-8 text-xs">
                  <a href={getSafeExternalUrl(activeSubmission.video_url)} target="_blank" rel="noreferrer">
                    <Play className="size-3 mr-1" /> Demo Video
                  </a>
                </Button>
              )}
            </div>

            {/* Dynamic Total Score Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-purple-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-muted-foreground">Cumulative Grade</div>
                <div className="text-3xl font-black text-foreground flex items-center gap-2">
                  <Star className="size-6 text-amber-500 fill-amber-500" />
                  {currentTotalScore} <span className="text-sm font-semibold text-muted-foreground">/ 50</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-background border shadow-xs inline-block">
                  {currentTotalScore >= 45
                    ? "🌟 Exceptional Tier"
                    : currentTotalScore >= 38
                    ? "✨ Strong Contender"
                    : currentTotalScore >= 28
                    ? "👍 Promising Build"
                    : "🔧 Needs Polish"}
                </span>
              </div>
            </div>

            {/* Conflict of Interest Warning */}
            {isSelfProject && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold block">Conflict of Interest Prevention</span>
                  You are registered as the creator or team member of this submission. Judges cannot evaluate their own project submission.
                </div>
              </div>
            )}

            {/* Scoring Form */}
            <form onSubmit={handleSaveEvaluation} className="space-y-6">
              {/* 5 Rubric Criteria Sliders */}
              <div className="space-y-5">
                {RUBRIC_CRITERIA.map((criterion) => {
                  let currentValue = 8;
                  let setValue = (v: number) => {};

                  if (criterion.key === "score_innovation") {
                    currentValue = scoreInnovation;
                    setValue = setScoreInnovation;
                  } else if (criterion.key === "score_technical") {
                    currentValue = scoreTechnical;
                    setValue = setScoreTechnical;
                  } else if (criterion.key === "score_design") {
                    currentValue = scoreDesign;
                    setValue = setScoreDesign;
                  } else if (criterion.key === "score_impact") {
                    currentValue = scoreImpact;
                    setValue = setScoreImpact;
                  } else if (criterion.key === "score_presentation") {
                    currentValue = scorePresentation;
                    setValue = setScorePresentation;
                  }

                  return (
                    <div key={criterion.key} className="p-4 rounded-2xl border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs">{criterion.name}</div>
                          <div className="text-[11px] text-muted-foreground">{criterion.desc}</div>
                        </div>
                        <div className="text-base font-black text-primary px-3 py-1 rounded-xl bg-primary/10 border border-primary/20">
                          {currentValue} / 10
                        </div>
                      </div>

                      {/* 1-10 Pill Selector */}
                      <div className="flex items-center gap-1 pt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setValue(num)}
                            className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentValue === num
                                ? "bg-primary text-primary-foreground shadow-xs scale-105"
                                : "bg-muted/50 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Award / Distinction Picker */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Award className="size-4 text-amber-500" /> Winner Award & Placement
                  </label>
                  {currentHackathon?.prize_pool && (
                    <span className="text-[11px] text-muted-foreground">
                      Prize Pool: <strong className="text-foreground">{currentHackathon.prize_pool}</strong>
                    </span>
                  )}
                </div>

                {/* 1. Official Competition Prizes from Hackathon Creation */}
                {currentHackathon?.prizes && currentHackathon.prizes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Trophy className="size-3 text-amber-500" /> Official Hackathon Prizes ({currentHackathon.prizes.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground/80">From hackathon configuration</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentHackathon.prizes.map((tier, idx) => {
                        const icon = getTierIcon(tier.title, idx);
                        const reward = formatTierReward(tier, currentHackathon.currency);
                        const prefix = icon ? `${icon} ` : "";
                        const badgeValue = reward.shortLabel
                          ? `${prefix}${tier.title} · ${reward.shortLabel}`
                          : `${prefix}${tier.title}`;
                        const isSelected =
                          selectedAward === badgeValue ||
                          (selectedAward && selectedAward.includes(tier.title));

                        return (
                          <button
                            key={tier.id || idx}
                            type="button"
                            onClick={() => setSelectedAward(isSelected ? "" : badgeValue)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? "bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-xs"
                                : "bg-card border-input hover:bg-muted/50 hover:border-primary/40 text-foreground"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs flex items-center gap-1.5 leading-snug">
                                {icon && <span className="text-base shrink-0">{icon}</span>}
                                <span className="truncate">{tier.title}</span>
                              </span>
                              {isSelected && (
                                <span className="size-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check className="size-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                                  tier.type === "non-cash"
                                    ? "bg-primary/10 border-primary/25 text-primary"
                                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {tier.type === "non-cash" ? (
                                  <span className="flex items-center gap-1">
                                    <Gift className="size-2.5" /> {reward.label}
                                  </span>
                                ) : (
                                  reward.label
                                )}
                              </span>

                              {tier.description && (
                                <span
                                  className="text-[10px] text-muted-foreground truncate max-w-[130px]"
                                  title={tier.description}
                                >
                                  {tier.description}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Fallback default placement tiers if hackathon has no custom prizes */
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="size-3 text-amber-500" /> Standard Placement Tiers
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { title: "🥇 1st Place Champion", value: "🥇 1st Place Champion" },
                        { title: "🥈 2nd Place Runner-Up", value: "🥈 2nd Place Runner-Up" },
                        { title: "🥉 3rd Place Finalist", value: "🥉 3rd Place Finalist" },
                      ].map((item) => {
                        const isSelected = selectedAward === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setSelectedAward(isSelected ? "" : item.value)}
                            className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer truncate ${
                              isSelected
                                ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30"
                                : "bg-muted/30 border-input hover:bg-muted text-foreground"
                            }`}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Common Track & Special Distinctions */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" /> Special Distinctions & Track Badges
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {COMMON_DISTINCTIONS.map((distinction) => {
                      const isSelected = selectedAward === distinction;
                      return (
                        <button
                          key={distinction}
                          type="button"
                          onClick={() => setSelectedAward(isSelected ? "" : distinction)}
                          className={`p-2 rounded-xl border text-left text-[11px] font-semibold transition-all cursor-pointer truncate ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 font-bold"
                              : "bg-muted/30 border-input hover:bg-muted text-foreground"
                          }`}
                          title={distinction}
                        >
                          <span className="truncate block">{distinction}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Selected Badge Customization & Clear Control */}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Award className="size-3.5 text-amber-500" /> Award Badge Label (Editable)
                    </span>
                    {selectedAward && (
                      <button
                        type="button"
                        onClick={() => setSelectedAward("")}
                        className="text-[11px] text-destructive hover:underline cursor-pointer font-medium"
                      >
                        Clear Award
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      value={selectedAward}
                      onChange={(e) => setSelectedAward(e.target.value)}
                      placeholder="Select an award from above or enter a custom badge label..."
                      className="h-9 rounded-xl text-xs bg-background pr-8"
                    />
                    {selectedAward && (
                      <button
                        type="button"
                        onClick={() => setSelectedAward("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Clear award"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {selectedAward && (
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-muted-foreground">Badge preview:</span>
                      <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-xs font-bold rounded-full px-2.5 py-0.5">
                        <Trophy className="size-3 mr-1 inline" /> {selectedAward}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Qualitative Critique Feedback */}
              <div className="space-y-2">
                <label className="text-xs font-bold block">
                  Qualitative Critique & Judge Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share constructive feedback on architecture, UX strengths, and areas for improvement..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Notifications */}
              {scoreErrorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" /> {scoreErrorMessage}
                </div>
              )}

              {scoreSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" /> {scoreSuccessMessage}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSubmission(null)}
                  className="rounded-xl text-xs h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingScore || isSelfProject}
                  className="rounded-xl text-xs h-10 px-5 font-bold gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmittingScore ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Recording Score...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Save Scorecard
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
