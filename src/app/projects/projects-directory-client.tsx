"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { HackathonSubmission, SessionUser } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Rocket,
  Search,
  X,
  Star,
  ExternalLink,
  Code2,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";

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

interface ProjectsDirectoryClientProps {
  initialProjects: HackathonSubmission[];
  availableTechStacks: string[];
  initialSearch?: string;
  initialTech?: string;
  initialFilter?: string;
  currentUser: SessionUser | null;
}

export function ProjectsDirectoryClient({
  initialProjects,
  availableTechStacks,
  initialSearch = "",
  initialTech = "",
  initialFilter = "all",
  currentUser,
}: ProjectsDirectoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [selectedTech, setSelectedTech] = useState(initialTech);
  const [filterCategory, setFilterCategory] = useState<string>(initialFilter);

  // Sync state with URL params
  const updateUrlParams = (newSearch: string, newTech: string, newCategory: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newTech) params.set("tech", newTech);
    if (newCategory && newCategory !== "all") params.set("filter", newCategory);

    startTransition(() => {
      const q = params.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrlParams(val, selectedTech, filterCategory);
  };

  const handleTechClick = (tech: string) => {
    const nextTech = selectedTech.toLowerCase() === tech.toLowerCase() ? "" : tech;
    setSelectedTech(nextTech);
    updateUrlParams(search, nextTech, filterCategory);
  };

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    updateUrlParams(search, selectedTech, cat);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedTech("");
    setFilterCategory("all");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((p) => {
      // Category filter
      if (filterCategory === "winners" && !p.winner_badge) {
        return false;
      }
      if (filterCategory === "featured" && !p.is_featured) {
        return false;
      }

      // Tech Stack filter
      if (selectedTech) {
        const target = selectedTech.toLowerCase().trim();
        const matchesTech =
          p.tech_stack &&
          p.tech_stack.some(
            (t) =>
              t.toLowerCase().trim() === target ||
              t.toLowerCase().includes(target) ||
              target.includes(t.toLowerCase())
          );
        if (!matchesTech) {
          return false;
        }
      }

      // Search keyword filter
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchTagline = (p.tagline || "").toLowerCase().includes(q);
        const matchDesc = (p.description || "").toLowerCase().includes(q);
        const matchAuthor = (p.user_name || "").toLowerCase().includes(q);
        const matchHackathon = (p.hackathon_title || "").toLowerCase().includes(q);
        const matchTech = (p.tech_stack || []).some((t) => t.toLowerCase().includes(q));

        if (!matchTitle && !matchTagline && !matchDesc && !matchAuthor && !matchHackathon && !matchTech) {
          return false;
        }
      }

      return true;
    });
  }, [initialProjects, filterCategory, selectedTech, search]);

  const activeFiltersCount = [
    Boolean(search.trim()),
    Boolean(selectedTech),
    filterCategory !== "all",
  ].filter(Boolean).length;

  const totalWinnersCount = useMemo(
    () => initialProjects.filter((p) => Boolean(p.winner_badge)).length,
    [initialProjects]
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link
          href="/"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <BrandLogo size="md" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
            <Link href="/hackathons">Explore Challenges</Link>
          </Button>

          <Button variant="secondary" asChild className="hidden sm:inline-flex rounded-full text-xs font-bold gap-1.5 shadow-2xs">
            <Link href="/projects">
              <Rocket className="size-3.5 text-primary" /> Showcase
            </Link>
          </Button>

          {(currentUser?.role === "admin" || currentUser?.role === "judge") && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin/judging">Judging Portal</Link>
            </Button>
          )}

          {currentUser?.role === "admin" && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin">Admin Console</Link>
            </Button>
          )}

          {currentUser ? (
            <UserMenu user={currentUser} />
          ) : (
            <>
              <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full text-xs font-bold shadow-xs">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Headline Section */}
      <section className="border-b bg-muted/20 py-10 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
            >
              <Sparkles className="size-3.5" /> Global Project Directory & Gallery
            </Badge>
            {totalWinnersCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              >
                <Trophy className="size-3.5" /> {totalWinnersCount} Hall of Fame Winners
              </Badge>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
                World-Class Builds & Hackathon Projects
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Explore cutting-edge software shipped by developers and squads worldwide. Test live demos, inspect open-source code repositories, and review official judge scorecards.
              </p>
            </div>

            <Button asChild className="rounded-full text-xs font-bold gap-2 shrink-0 shadow-sm">
              <Link href="/hackathons">
                Submit Your Project <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Interactive Controls & Directory Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Search Bar & Category Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl border bg-card shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search projects by title, tech stack, builder, or competition..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-full pl-10 pr-9 text-xs sm:text-sm h-11 bg-background"
            />
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border shrink-0">
            <button
              type="button"
              onClick={() => handleCategoryChange("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === "all"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Projects ({initialProjects.length})
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("winners")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterCategory === "winners"
                  ? "bg-amber-500 text-white shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="size-3.5" /> Winners Only ({totalWinnersCount})
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange("featured")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterCategory === "featured"
                  ? "bg-primary text-primary-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="size-3.5" /> Featured
            </button>
          </div>
        </div>

        {/* Tech Stack Filter Pills Strip */}
        {availableTechStacks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Layers className="size-3 text-primary" /> Filter by Technology Stack
              </span>
              {selectedTech && (
                <button
                  type="button"
                  onClick={() => handleTechClick(selectedTech)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <X className="size-3" /> Clear tech filter ({selectedTech})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-1">
              {availableTechStacks.map((tech) => {
                const isSelected = selectedTech.toLowerCase() === tech.toLowerCase();
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => handleTechClick(tech)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "bg-card text-foreground hover:bg-muted/70 border-input"
                    }`}
                  >
                    {tech}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Showing</span>
            <strong className="text-foreground font-bold">{filteredProjects.length}</strong>
            <span>{filteredProjects.length === 1 ? "project" : "projects"}</span>
            {activeFiltersCount > 0 && (
              <span className="text-primary font-semibold">
                ({activeFiltersCount} {activeFiltersCount === 1 ? "filter" : "filters"} applied)
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 text-xs rounded-full text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="size-3" /> Reset All Filters
            </Button>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 border rounded-3xl bg-card space-y-4 max-w-md mx-auto p-8 shadow-xs">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Rocket className="size-8" />
            </div>
            <h3 className="text-lg font-bold">No Projects Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No hackathon submissions matched your current filter criteria. Try adjusting your search query or clearing technology filters.
            </p>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => {
              const members = p.team_members && p.team_members.length > 0 ? p.team_members : [];
              const safeGithub = getSafeExternalUrl(p.github_url);
              const safeDemo = getSafeExternalUrl(p.demo_url);

              return (
                <Card
                  key={p.id}
                  className="group rounded-3xl border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Project Banner & Badges */}
                    <Link
                      href={`/projects/${p.id}`}
                      className="block relative h-44 w-full bg-muted overflow-hidden"
                    >
                      {p.cover_image ? (
                        <img
                          src={p.cover_image}
                          alt={p.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted text-primary">
                          <Rocket className="size-12 opacity-80 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        {p.winner_badge ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-[10px] font-extrabold shadow-sm px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Trophy className="size-2.5 fill-white" /> {p.winner_badge}
                          </Badge>
                        ) : p.is_featured ? (
                          <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-[10px] font-bold shadow-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="size-2.5 fill-current" /> Featured Build
                          </Badge>
                        ) : (
                          <div />
                        )}

                        {p.hackathon_title && (
                          <span
                            className="text-[10px] font-bold bg-background/85 text-foreground backdrop-blur-md px-2.5 py-0.5 rounded-full border shadow-2xs truncate max-w-[170px]"
                            title={p.hackathon_title}
                          >
                            {p.hackathon_title}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      <div className="space-y-1.5">
                        <h3
                          className="font-black text-lg text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                          title={p.title}
                        >
                          <Link href={`/projects/${p.id}`}>
                            {p.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                          {p.tagline || p.description.slice(0, 110)}
                        </p>
                      </div>

                      {/* Tech Stack Tags */}
                      {p.tech_stack && p.tech_stack.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {p.tech_stack.slice(0, 3).map((tech, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTechClick(tech);
                              }}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            >
                              {tech}
                            </button>
                          ))}
                          {p.tech_stack.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{p.tech_stack.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Team Members & Actions */}
                  <div className="px-5 pb-5 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                    {/* Builders Avatars */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                        {(members.length > 0 ? members.slice(0, 3) : [{ name: p.user_name, image: p.user_image }]).map(
                          (m, mIdx) =>
                            m.image ? (
                              <img
                                key={mIdx}
                                src={m.image}
                                alt={m.name || "Builder"}
                                className="size-6 rounded-full object-cover ring-2 ring-background"
                                title={m.name || "Builder"}
                              />
                            ) : (
                              <div
                                key={mIdx}
                                className="size-6 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center ring-2 ring-background"
                                title={m.name || "Builder"}
                              >
                                {m.name ? m.name[0].toUpperCase() : "B"}
                              </div>
                            )
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground truncate">
                        {p.user_name || "Builder Squad"}
                      </span>
                    </div>

                    {/* Action Links */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {safeGithub && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          asChild
                          className="rounded-full text-muted-foreground hover:text-foreground size-7"
                          title="View Source Code"
                        >
                          <a href={safeGithub} target="_blank" rel="noopener noreferrer">
                            <GithubIcon className="size-3.5" />
                          </a>
                        </Button>
                      )}

                      {safeDemo && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          asChild
                          className="rounded-full text-muted-foreground hover:text-primary size-7"
                          title="Launch Live Demo"
                        >
                          <a href={safeDemo} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="rounded-full text-[11px] h-7 px-2.5 font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Link href={`/projects/${p.id}`}>
                          Inspect <ChevronRight className="size-3 ml-0.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Global Site Footer */}
      <SiteFooter />
    </div>
  );
}
