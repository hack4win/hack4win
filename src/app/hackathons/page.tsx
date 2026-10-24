import React from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { tagRepository } from "@/lib/db/tag-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Sparkles,
  Search,
  RotateCcw,
} from "lucide-react";
import { getHackathonStatus } from "@/lib/db/types";
import { HackathonFilters } from "@/components/hackathon/hackathon-filters";
import { HorizontalHackathonCard } from "@/components/hackathon/horizontal-hackathon-card";

import type { Metadata } from "next";

interface BrowsePageProps {
  searchParams: Promise<{
    status?: string;
    format?: string;
    tag?: string;
    track?: string;
    search?: string;
    sort?: string;
    access?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore Hackathons & Coding Challenges",
  description: "Browse world-class online and in-person hackathons on Hack4Win. Compete for cash prizes, developer bounties, and showcase your builds.",
  keywords: [
    "hackathons",
    "coding competitions",
    "ai challenges",
    "web3 bounties",
    "software competitions",
    "developer challenges",
  ],
  alternates: {
    canonical: "/hackathons",
  },
  openGraph: {
    title: "Explore Hackathons & Competitions | Hack4Win",
    description: "Discover upcoming and active hackathons, assemble developer squads, and compete for global bounties.",
    url: "https://hack4win.online/hackathons",
    siteName: "Hack4Win",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Hackathons & Competitions | Hack4Win",
    description: "Discover upcoming and active hackathons, assemble developer squads, and compete for global bounties.",
  },
};

export default async function HackathonsBrowsePage({ searchParams }: BrowsePageProps) {
  const { status, format, tag, track, search, sort, access } = await searchParams;
  const activeTag = tag || track;

  const session = await getServerSession();
  const isAdmin = session?.user.role === "admin";
  const userId = session?.user.id;

  const [allHackathons, tagsList, registeredIds] = await Promise.all([
    hackathonRepository.listHackathons({ limit: 100, includeDrafts: isAdmin }),
    tagRepository.listTags(),
    userId ? hackathonRepository.getUserRegisteredHackathonIds(userId) : Promise.resolve(new Set<string>()),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";

  // Filter hackathons visible to current viewer:
  // 1. Unpublished drafts are strictly admin-only.
  // 2. Private hackathons are hidden from public/unregistered users;
  //    only registered participants, hackathon organizers, and platform admins can see them.
  const visibleHackathons = allHackathons.filter((h) => {
    if (h.status === "draft" && !isAdmin) return false;
    if (h.is_private) {
      if (isAdmin) return true;
      if (userId && (h.organizer_id === userId || registeredIds.has(h.id))) return true;
      return false;
    }
    return true;
  });

  // Extract all tag names (only from visible hackathons)
  const availableTagNames = Array.from(
    new Set([
      ...tagsList.map((t) => t.name),
      ...visibleHackathons.flatMap((h) => h.tags || []),
    ])
  ).sort();

  // Filter hackathons
  const filteredHackathons = visibleHackathons.filter((h) => {
    // 1. Permissions: Only admin can see unpublished drafts
    if (h.status === "draft" && !isAdmin) {
      return false;
    }

    // 2. Status filter
    if (status && status !== "all") {
      if (status === "draft" && !isAdmin) return false;
      const dynamicStatus = getHackathonStatus(h);
      if (status === "draft" && h.status !== "draft") return false;
      if (status !== "draft" && dynamicStatus !== status) return false;
    }

    // 3. Format filter
    if (format && format !== "all") {
      if (h.format.toLowerCase() !== format.toLowerCase()) return false;
    }

    // 4. Tag / Track filter
    if (activeTag) {
      const normalizedTarget = activeTag.toLowerCase().trim();
      const hasMatch =
        h.tags &&
        h.tags.some((t) => {
          const lower = t.toLowerCase().trim();
          if (lower === normalizedTarget) return true;

          // Match slugified tag, e.g. "ai-agents" vs "ai" or "devtools"
          const slugified = lower.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          if (slugified === normalizedTarget) return true;

          // Track keyword / word boundary match, e.g. "ai" in "AI & Agents", "mobile" in "Mobile Apps"
          const words = lower.split(/[^a-z0-9]+/);
          if (words.includes(normalizedTarget)) return true;

          return false;
        });

      if (!hasMatch) {
        return false;
      }
    }

    // 5. Access Type filter (public vs campus private)
    if (access === "public" && h.is_private) {
      return false;
    }
    if ((access === "campus" || access === "private") && !h.is_private) {
      return false;
    }

    // 6. Keyword Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = h.title.toLowerCase().includes(q);
      const matchSlug = (h.slug || "").toLowerCase().includes(q);
      const matchTagline = h.tagline.toLowerCase().includes(q);
      const matchLocation = h.location.toLowerCase().includes(q);
      const matchHost = h.organizer_name.toLowerCase().includes(q);
      const matchTags = h.tags && h.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchTitle && !matchSlug && !matchTagline && !matchLocation && !matchHost && !matchTags) {
        return false;
      }
    }

    return true;
  });

  // Apply sorting if requested
  if (sort === "deadline") {
    filteredHackathons.sort((a, b) => {
      const aDate = new Date(a.submission_deadline || a.end_date).getTime();
      const bDate = new Date(b.submission_deadline || b.end_date).getTime();
      return aDate - bDate;
    });
  } else if (sort === "prize") {
    filteredHackathons.sort((a, b) => {
      const aVal = parseFloat((a.prize_pool || "").replace(/[^0-9.]/g, "")) || 0;
      const bVal = parseFloat((b.prize_pool || "").replace(/[^0-9.]/g, "")) || 0;
      return bVal - aVal;
    });
  } else if (sort === "newest") {
    filteredHackathons.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const clearHref = sort ? `/hackathons?sort=${encodeURIComponent(sort)}` : "/hackathons";
  const popularTagSuggestions = ["AI", "Web3", "Next.js", "DevTools", "Mobile"];

  const getSuggestedTagHref = (suggestedTag: string) => {
    const params = new URLSearchParams();
    params.set("tag", suggestedTag);
    if (sort) params.set("sort", sort);
    return `/hackathons?${params.toString()}`;
  };

  const activeFiltersCount = [
    status && status !== "all",
    format && format !== "all",
    !!activeTag,
    !!search,
  ].filter(Boolean).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Hackathons and Developer Competitions",
    "description": "Active and upcoming hackathons on Hack4Win",
    "numberOfItems": filteredHackathons.length,
    "itemListElement": filteredHackathons.slice(0, 20).map((h, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Event",
        "name": h.title,
        "description": h.tagline,
        "url": `${baseUrl}/hackathons/${h.slug}`,
        "startDate": h.start_date,
        "endDate": h.end_date,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Schema.org ItemList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link
          href="/"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <BrandLogo size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs">
            <Link href="/">Home</Link>
          </Button>

          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs">
            <Link href="/projects">Showcase</Link>
          </Button>

          {(session?.user.role === "admin" || session?.user.role === "judge") && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs">
              <Link href="/admin/judging">Judging Portal</Link>
            </Button>
          )}

          {session?.user.role === "admin" && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs">
              <Link href="/admin/hackathons">Admin Console</Link>
            </Button>
          )}

          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <>
              <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full text-xs">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Headline */}
      <div className="border-b bg-muted/20 py-8 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="secondary" className="px-3 py-0.5 text-xs font-semibold gap-1.5 rounded-full mb-1">
              <Sparkles className="size-3 text-primary" /> Global Arena
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Explore Hackathons
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Discover active, upcoming, and past competitions. Filter by track, format, and status.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Left Filters & Right Horizontal Cards */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Left Side: Filter Sidebar working with Query Parameters */}
          <HackathonFilters
            availableTags={availableTagNames}
            totalResults={filteredHackathons.length}
          />

          {/* Right Side: Horizontal Hackathon Listings */}
          <div className="flex-1 w-full space-y-5">
            {/* Results bar & active filter chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Showing</span>
                <strong className="text-foreground font-bold">{filteredHackathons.length}</strong>
                <span>{filteredHackathons.length === 1 ? "challenge" : "challenges"}</span>
                {activeFiltersCount > 0 && (
                  <span className="text-primary font-semibold">
                    ({activeFiltersCount} {activeFiltersCount === 1 ? "filter" : "filters"} applied)
                  </span>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs rounded-full text-muted-foreground hover:text-foreground">
                  <Link href={clearHref} className="gap-1.5">
                    <RotateCcw className="size-3" /> Clear Filters
                  </Link>
                </Button>
              )}
            </div>

            {/* Horizontal Cards List */}
            {filteredHackathons.length === 0 ? (
              <div className="text-center py-16 border rounded-3xl bg-card space-y-5 max-w-lg mx-auto p-8 shadow-xs">
                <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Trophy className="size-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold tracking-tight">No Hackathons Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No competitions matched your current filter criteria. Clear your filters or explore popular topics below.
                  </p>
                </div>

                <div className="pt-2 flex flex-col items-center gap-4 w-full">
                  <Button asChild size="default" className="rounded-full gap-2 px-6 shadow-sm">
                    <Link href={clearHref}>
                      <RotateCcw className="size-4" /> Clear All Filters
                    </Link>
                  </Button>

                  <div className="pt-4 border-t w-full space-y-2.5">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Suggested popular tags:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {popularTagSuggestions.map((suggestedTag) => (
                        <Button
                          key={suggestedTag}
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-full text-xs h-7 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <Link href={getSuggestedTagHref(suggestedTag)}>
                            {suggestedTag}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {filteredHackathons.map((h) => (
                  <HorizontalHackathonCard key={h.id} hackathon={h} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
