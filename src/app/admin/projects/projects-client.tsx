"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useModalAlert } from "@/components/ui/modal-alert";
import {
  Rocket,
  Search,
  Star,
  Sparkles,
  Trophy,
  Users,
  Award,
  ExternalLink,
  Video,
  Globe,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Check,
  AlertCircle,
  Loader2,
  Layers,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { HackathonSubmission, Hackathon } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";

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

interface AdminProjectsClientProps {
  initialProjects: HackathonSubmission[];
  hackathons: Hackathon[];
  initialStats: {
    total: number;
    featured: number;
    approved: number;
    under_review: number;
    uniqueHackathons: number;
    totalBuilders: number;
  };
}

export function AdminProjectsClient({
  initialProjects,
  hackathons,
  initialStats,
}: AdminProjectsClientProps) {
  const { showAlert } = useModalAlert();
  const [projects, setProjects] = useState<HackathonSubmission[]>(initialProjects);
  const [stats, setStats] = useState(initialStats);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState("all");
  const [selectedFeatured, setSelectedFeatured] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Selection / Modal state
  const [previewProject, setPreviewProject] = useState<HackathonSubmission | null>(null);
  const [editingAward, setEditingAward] = useState("");
  const [editingStatus, setEditingStatus] = useState("approved");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  // Delete modal state
  const [projectToDelete, setProjectToDelete] = useState<HackathonSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle Featured status optimistically
  const handleToggleFeatured = async (project: HackathonSubmission) => {
    const nextFeatured = !project.is_featured;

    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, is_featured: nextFeatured } : p))
    );
    setStats((prev) => ({
      ...prev,
      featured: nextFeatured ? prev.featured + 1 : Math.max(0, prev.featured - 1),
    }));

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: nextFeatured }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle featured status");
      }
    } catch {
      // Revert optimistic update on failure
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, is_featured: project.is_featured } : p))
      );
      setStats((prev) => ({
        ...prev,
        featured: project.is_featured ? prev.featured : Math.max(0, prev.featured - 1),
      }));
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (p: HackathonSubmission) => {
    setPreviewProject(p);
    setEditingAward(p.winner_badge || "");
    setEditingStatus(p.status || "approved");
    setUpdateFeedback(null);
  };

  // Save changes from Preview Modal
  const handleSaveModalChanges = async () => {
    if (!previewProject) return;

    if (editingAward.trim().length > 100) {
      setUpdateFeedback("Winner badge or award title cannot exceed 100 characters.");
      return;
    }

    setIsUpdating(true);
    setUpdateFeedback(null);

    try {
      const res = await fetch(`/api/admin/projects/${previewProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_badge: editingAward.trim() || null,
          status: editingStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update project");
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === previewProject.id
            ? { ...p, winner_badge: editingAward.trim() || null, status: editingStatus }
            : p
        )
      );

      setPreviewProject((prev) =>
        prev
          ? { ...prev, winner_badge: editingAward.trim() || null, status: editingStatus }
          : null
      );

      setUpdateFeedback("Project updated successfully! ✨");
      setTimeout(() => setUpdateFeedback(null), 2500);
    } catch (err) {
      setUpdateFeedback(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Status change from table
  const handleQuickStatusChange = async (project: HackathonSubmission, newStatus: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p))
    );

    try {
      await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Status change error:", err);
    }
  };

  // Delete project confirmation
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete project");
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        featured: projectToDelete.is_featured ? Math.max(0, prev.featured - 1) : prev.featured,
      }));
      setProjectToDelete(null);
    } catch (err) {
      await showAlert({
        title: "Delete Failed",
        message: err instanceof Error ? err.message : "Failed to delete project",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesTagline = (p.tagline || "").toLowerCase().includes(query);
        const matchesCreator = (p.user_name || "").toLowerCase().includes(query);
        const matchesHackathon = (p.hackathon_title || "").toLowerCase().includes(query);
        const matchesTech = (p.tech_stack || []).some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesTagline && !matchesCreator && !matchesHackathon && !matchesTech) {
          return false;
        }
      }

      // Hackathon filter
      if (selectedHackathon !== "all" && p.hackathon_id !== selectedHackathon) {
        return false;
      }

      // Featured filter
      if (selectedFeatured === "featured" && !p.is_featured) return false;
      if (selectedFeatured === "standard" && p.is_featured) return false;

      // Status filter
      if (selectedStatus !== "all" && (p.status || "approved") !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, selectedHackathon, selectedFeatured, selectedStatus]);

  // Total unique builders across filtered projects
  const totalBuildersCount = useMemo(() => {
    let count = 0;
    projects.forEach((p) => {
      count += (p.team_members && p.team_members.length > 0) ? p.team_members.length : 1;
    });
    return count;
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* 1. KEY METRICS STATS RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Submissions
              </span>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {stats.total}
              </div>
            </div>
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Rocket className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFeatured(selectedFeatured === "featured" ? "all" : "featured")}
          className={`rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            selectedFeatured === "featured"
              ? "border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/20"
              : "hover:border-amber-500/30"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Star className="size-3 fill-amber-500 text-amber-500" /> Featured Showcase
              </span>
              <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                {stats.featured}
              </div>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active Competitions
              </span>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {stats.uniqueHackathons}
              </div>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Trophy className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Builders Credited
              </span>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {totalBuildersCount}
              </div>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <Card className="rounded-2xl border shadow-2xs py-4 px-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project name, tagline, creator, tech stack..."
              className="pl-9 h-9 rounded-xl text-xs bg-background"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Hackathon Filter */}
            <Select value={selectedHackathon} onValueChange={(val) => setSelectedHackathon(val || "all")}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl text-xs bg-background">
                <SelectValue placeholder="All Hackathons" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Hackathons</SelectItem>
                {hackathons.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Featured Filter */}
            <Select value={selectedFeatured} onValueChange={(val) => setSelectedFeatured(val || "all")}>
              <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs bg-background">
                <SelectValue placeholder="Featured: All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">Featured: All</SelectItem>
                <SelectItem value="featured">⭐ Featured Only</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "all")}>
              <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs bg-background">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || selectedHackathon !== "all" || selectedFeatured !== "all" || selectedStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedHackathon("all");
                  setSelectedFeatured("all");
                  setSelectedStatus("all");
                }}
                className="h-9 text-xs rounded-xl text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 3. PROJECTS LIST / TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Showing <strong>{filteredProjects.length}</strong> of {projects.length} submissions</span>
          <span className="text-[11px]">Click the star ⭐ to feature a project on the landing page</span>
        </div>

        {filteredProjects.length === 0 ? (
          <Card className="rounded-2xl border p-12 text-center space-y-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mx-auto">
              <Rocket className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base">No project submissions found</h3>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search criteria or filters to find projects.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((p) => {
              const isFeatured = Boolean(p.is_featured);
              const members = p.team_members && p.team_members.length > 0 ? p.team_members : [];

              return (
                <Card
                  key={p.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isFeatured
                      ? "border-amber-500/40 bg-card shadow-xs ring-1 ring-amber-500/20"
                      : "bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Project Meta */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Project Cover / Fallback */}
                      <Link
                        href={`/projects/${p.id}`}
                        className="group relative size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border shrink-0 block hover:opacity-90 transition-opacity"
                        title="View project details page"
                      >
                        {p.cover_image ? (
                          <img
                            src={p.cover_image}
                            alt={p.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                            <Rocket className="size-7" />
                          </div>
                        )}
                        {isFeatured && (
                          <div
                            className="absolute top-1 left-1 size-5 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-xs"
                            title="Featured on Landing Page"
                          >
                            <Star className="size-3 fill-white" />
                          </div>
                        )}
                      </Link>

                      {/* Title, Tagline, Hackathon origin */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-foreground truncate">
                            <Link
                              href={`/projects/${p.id}`}
                              className="hover:text-primary transition-colors inline-block truncate max-w-full"
                              title="View project details page"
                            >
                              {p.title}
                            </Link>
                          </h3>

                          {p.winner_badge && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold rounded-full px-2 py-0">
                              <Award className="size-3 mr-1" /> {p.winner_badge}
                            </Badge>
                          )}

                          {isFeatured && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold rounded-full px-2 py-0 gap-1">
                              <Sparkles className="size-2.5" /> Featured on Home
                            </Badge>
                          )}
                        </div>

                        {p.tagline && (
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {p.tagline}
                          </p>
                        )}

                        {/* Hackathon & Creator */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                          {p.hackathon_title && (
                            <Link
                              href={`/hackathons/${p.hackathon_slug || p.hackathon_id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Trophy className="size-3 text-primary shrink-0" />
                              <span className="truncate max-w-[200px]">{p.hackathon_title}</span>
                            </Link>
                          )}

                          <span>&middot;</span>

                          <span className="flex items-center gap-1.5">
                            {p.user_image ? (
                              <img
                                src={p.user_image}
                                alt={p.user_name || "Creator"}
                                className="size-4.5 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-4.5 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                                {p.user_name ? p.user_name[0].toUpperCase() : "B"}
                              </div>
                            )}
                            <span className="truncate max-w-[150px]">{p.user_name || "Builder"}</span>
                          </span>

                          {members.length > 1 && (
                            <>
                              <span>&middot;</span>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="size-3" /> {members.length} team builders
                              </span>
                            </>
                          )}
                        </div>

                        {/* Tech Stack Tags */}
                        {p.tech_stack && p.tech_stack.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {p.tech_stack.slice(0, 5).map((tech, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                              >
                                {tech}
                              </span>
                            ))}
                            {p.tech_stack.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{p.tech_stack.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                      {/* External Links */}
                      <div className="flex items-center gap-1">
                        {getSafeExternalUrl(p.demo_url) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            className="rounded-full text-muted-foreground hover:text-primary cursor-pointer"
                            title="Visit Live Demo"
                          >
                            <a href={getSafeExternalUrl(p.demo_url)} target="_blank" rel="noreferrer">
                              <Globe className="size-4" />
                            </a>
                          </Button>
                        )}
                        {getSafeExternalUrl(p.github_url) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                            title="View GitHub Repository"
                          >
                            <a href={getSafeExternalUrl(p.github_url)} target="_blank" rel="noreferrer">
                              <GithubIcon className="size-4" />
                            </a>
                          </Button>
                        )}
                        {getSafeExternalUrl(p.video_url) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            className="rounded-full text-muted-foreground hover:text-rose-500 cursor-pointer"
                            title="Watch Demo Video"
                          >
                            <a href={getSafeExternalUrl(p.video_url)} target="_blank" rel="noreferrer">
                              <Video className="size-4" />
                            </a>
                          </Button>
                        )}
                      </div>

                      {/* Status Selector Pill */}
                      <Select
                        value={p.status || "approved"}
                        onValueChange={(val) => handleQuickStatusChange(p, val || "approved")}
                      >
                        <SelectTrigger className="h-8 w-[125px] rounded-full text-xs font-semibold border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl text-xs">
                          <SelectItem value="approved">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="size-3" /> Approved
                            </span>
                          </SelectItem>
                          <SelectItem value="under_review">
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                              <Clock className="size-3" /> Under Review
                            </span>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <span className="flex items-center gap-1.5 text-destructive font-semibold">
                              <XCircle className="size-3" /> Rejected
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* FEATURE TOGGLE BUTTON */}
                      <Button
                        type="button"
                        variant={isFeatured ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleFeatured(p)}
                        className={`h-8 rounded-full text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                          isFeatured
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs border-amber-600"
                            : "hover:border-amber-500/50 hover:text-amber-600"
                        }`}
                        title={isFeatured ? "Click to remove from landing page" : "Click to feature on landing page"}
                      >
                        <Star className={`size-3.5 ${isFeatured ? "fill-white" : ""}`} />
                        <span>{isFeatured ? "Featured" : "Feature"}</span>
                      </Button>

                      {/* Details Page Link Button */}
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-8 rounded-full text-xs font-bold gap-1 cursor-pointer"
                        title="View project details page"
                      >
                        <Link href={`/projects/${p.id}`}>
                          <Eye className="size-3.5" /> Details
                        </Link>
                      </Button>

                      {/* Award & Winner Management Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(p)}
                        className={`h-8 rounded-full text-xs font-bold gap-1 cursor-pointer ${
                          p.winner_badge
                            ? "border-amber-500/40 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                            : "hover:border-amber-500/40 hover:text-amber-600"
                        }`}
                        title="Assign or edit winner award badge"
                      >
                        <Award className="size-3.5 text-amber-500" />
                        <span>{p.winner_badge ? "Awarded" : "Award"}</span>
                      </Button>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setProjectToDelete(p)}
                        className="rounded-full text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete project submission"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PROJECT PREVIEW & EDIT MODAL */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 gap-0">
          {previewProject && (
            <div>
              {/* Modal Banner */}
              <div className="relative h-48 sm:h-60 w-full bg-muted overflow-hidden">
                {previewProject.cover_image ? (
                  <img
                    src={previewProject.cover_image}
                    alt={previewProject.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                    <Rocket className="size-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-md text-xs font-semibold">
                      {previewProject.hackathon_title || "Hackathon Project"}
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground drop-shadow-xs">
                      {previewProject.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-bold gap-1.5 bg-background/90 backdrop-blur-md hover:bg-background"
                    >
                      <Link href={`/projects/${previewProject.id}`}>
                        <ExternalLink className="size-3.5" /> Project Page
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant={previewProject.is_featured ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFeatured(previewProject)}
                      className={`rounded-full text-xs font-bold gap-1.5 cursor-pointer ${
                        previewProject.is_featured
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-background/90 backdrop-blur-md"
                      }`}
                    >
                      <Star className={`size-3.5 ${previewProject.is_featured ? "fill-white" : ""}`} />
                      {previewProject.is_featured ? "Featured on Home" : "Feature on Home"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Admin Quick Editor Ribbon */}
                <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" /> Admin Controls & Award Management
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted-foreground">Winner Award Badge</label>
                        {editingAward && (
                          <button
                            type="button"
                            onClick={() => setEditingAward("")}
                            className="text-[10px] text-destructive hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <Input
                        value={editingAward}
                        onChange={(e) => setEditingAward(e.target.value)}
                        placeholder="e.g. Overall Winner 🏆, 1st Place 🥇, Best AI 🤖"
                        className="h-9 rounded-xl text-xs bg-background"
                      />

                      {/* Dynamic Hackathon Prizes */}
                      {(() => {
                        const projectHackathon = hackathons.find((h) => h.id === previewProject.hackathon_id);
                        if (!projectHackathon) return null;

                        return (
                          <div className="space-y-1 pt-1">
                            {projectHackathon.prizes && projectHackathon.prizes.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                  <Trophy className="size-3 text-amber-500" /> Prizes:
                                </span>
                                {projectHackathon.prizes.map((pTier, idx) => {
                                  const icon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🏆";
                                  const rewardLabel =
                                    pTier.type === "non-cash"
                                      ? pTier.item_name || "Device Prize"
                                      : pTier.amount
                                      ? `${projectHackathon.currency || "₹"}${pTier.amount}`
                                      : "";
                                  const chipText = rewardLabel
                                    ? `${icon} ${pTier.title} · ${rewardLabel}`
                                    : `${icon} ${pTier.title}`;
                                  const isSelected = editingAward === chipText;
                                  return (
                                    <button
                                      key={pTier.id || idx}
                                      type="button"
                                      onClick={() => setEditingAward(isSelected ? "" : chipText)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-amber-500 text-white border-amber-600"
                                          : "bg-background hover:bg-muted text-foreground border-input"
                                      }`}
                                    >
                                      {chipText}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                <Sparkles className="size-3 text-primary" /> Common:
                              </span>
                              {["🤖 Best AI", "⚙️ Best Architecture", "🎨 Best UI/UX", "🚀 Most Impactful", "❤️ Community Favorite"].map(
                                (dist) => (
                                  <button
                                    key={dist}
                                    type="button"
                                    onClick={() => setEditingAward(editingAward === dist ? "" : dist)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                                      editingAward === dist
                                        ? "bg-amber-500 text-white border-amber-600"
                                        : "bg-background hover:bg-muted text-foreground border-input"
                                    }`}
                                  >
                                    {dist}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Approval Status</label>
                      <Select value={editingStatus} onValueChange={(val) => setEditingStatus(val || "approved")}>
                        <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl text-xs">
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-3 flex items-end">
                      <Button
                        type="button"
                        onClick={handleSaveModalChanges}
                        disabled={isUpdating}
                        size="sm"
                        className="w-full h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                      >
                        {isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  {updateFeedback && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{updateFeedback}</span>
                    </div>
                  )}
                </div>

                {/* External Links */}
                <div className="flex flex-wrap items-center gap-2">
                  {getSafeExternalUrl(previewProject.demo_url) && (
                    <Button variant="outline" size="sm" asChild className="rounded-full text-xs gap-1.5">
                      <a href={getSafeExternalUrl(previewProject.demo_url)} target="_blank" rel="noreferrer">
                        <Globe className="size-3.5 text-primary" /> Live Demo <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                  {getSafeExternalUrl(previewProject.github_url) && (
                    <Button variant="outline" size="sm" asChild className="rounded-full text-xs gap-1.5">
                      <a href={getSafeExternalUrl(previewProject.github_url)} target="_blank" rel="noreferrer">
                        <GithubIcon className="size-3.5" /> Source Code <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                  {getSafeExternalUrl(previewProject.video_url) && (
                    <Button variant="outline" size="sm" asChild className="rounded-full text-xs gap-1.5">
                      <a href={getSafeExternalUrl(previewProject.video_url)} target="_blank" rel="noreferrer">
                        <Video className="size-3.5 text-rose-500" /> Video Demo <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Tagline */}
                {previewProject.tagline && (
                  <div className="p-3.5 rounded-xl bg-muted/30 border text-sm text-foreground italic">
                    &quot;{previewProject.tagline}&quot;
                  </div>
                )}

                {/* Team Builders */}
                {previewProject.team_members && previewProject.team_members.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Users className="size-3.5 text-primary" /> Credited Builders ({previewProject.team_members.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {previewProject.team_members.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-2.5 rounded-xl border bg-card flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {m.image ? (
                              <img src={m.image} alt={m.name || "Member"} className="size-8 rounded-full object-cover" />
                            ) : (
                              <div className="size-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                                {m.name ? m.name[0].toUpperCase() : "B"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{m.name || m.email}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{m.role || "Co-Builder"}</div>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 rounded-full capitalize ${
                              m.status === "accepted"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {m.status || "confirmed"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Stack */}
                {previewProject.tech_stack && previewProject.tech_stack.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Code2 className="size-3.5 text-primary" /> Built With
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewProject.tech_stack.map((t, idx) => (
                        <Badge key={idx} variant="secondary" className="rounded-lg text-xs font-medium">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Markdown Description */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Project Story & Implementation
                  </span>
                  <div className="p-4 rounded-2xl border bg-card">
                    <MarkdownPreview content={previewProject.description} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Project Submission
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete <strong>{projectToDelete?.title}</strong>? This action will permanently remove the project submission from the database and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProjectToDelete(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="rounded-full text-xs font-bold gap-1.5"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Yes, Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
