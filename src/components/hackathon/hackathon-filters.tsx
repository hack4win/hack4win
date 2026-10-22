"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  X,
  Radio,
  Clock,
  CheckCircle2,
  Globe,
  MapPin,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

interface HackathonFiltersProps {
  availableTags: string[];
  totalResults: number;
}

export function HackathonFilters({ availableTags = [], totalResults }: HackathonFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read current query parameters
  const currentStatus = searchParams.get("status") || "all";
  const currentFormat = searchParams.get("format") || "all";
  const currentTag = searchParams.get("tag") || searchParams.get("track") || "";
  const currentSearch = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Check if any filter is active
  const hasActiveFilters =
    currentStatus !== "all" || currentFormat !== "all" || !!currentTag || !!currentSearch;

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    if ("tag" in updates) {
      params.delete("track");
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() });
  };

  const handleClearAll = () => {
    setSearchInput("");
    const currentSort = searchParams.get("sort");
    startTransition(() => {
      const target = currentSort ? `${pathname}?sort=${encodeURIComponent(currentSort)}` : pathname;
      router.push(target, { scroll: false });
    });
  };

  const statusOptions = [
    { id: "all", label: "All Statuses", icon: null },
    {
      id: "ongoing",
      label: "Live Now",
      icon: <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />,
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "upcoming",
      label: "Upcoming",
      icon: <span className="size-2 rounded-full bg-blue-500 inline-block" />,
      colorClass: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "ended",
      label: "Ended",
      icon: <span className="size-2 rounded-full bg-zinc-400 inline-block" />,
      colorClass: "text-muted-foreground",
    },
  ];

  const formatOptions = [
    { id: "all", label: "All Formats" },
    { id: "online", label: "Online (Remote)" },
    { id: "in-person", label: "In-Person" },
    { id: "hybrid", label: "Hybrid" },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 shrink-0 space-y-6">
      {/* Mobile Toggle Button */}
      <div className="md:hidden flex items-center justify-between gap-3 p-3 rounded-2xl border bg-card">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="gap-2 rounded-full text-xs font-semibold cursor-pointer"
        >
          <SlidersHorizontal className="size-3.5" />
          <span>{mobileOpen ? "Hide Filters" : "Filter Challenges"}</span>
          {hasActiveFilters && (
            <Badge variant="default" className="size-4 p-0 rounded-full text-[10px] flex items-center justify-center">
              !
            </Badge>
          )}
        </Button>

        <span className="text-xs text-muted-foreground font-medium">
          {totalResults} {totalResults === 1 ? "hackathon" : "hackathons"}
        </span>
      </div>

      {/* Filter Content */}
      <div className={`space-y-6 ${mobileOpen ? "block" : "hidden md:block"}`}>
        {/* Search Input Box */}
        <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Search className="size-3.5 text-primary" /> Search
            </label>
            {currentSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateFilters({ search: null });
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
              >
                <X className="size-3" /> Clear
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              placeholder="Search title, tech, host..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-full pl-8 text-xs h-9 bg-background"
            />
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>

        {/* Status Filter */}
        <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Radio className="size-3.5 text-primary" /> Competition Status
          </label>

          <div className="space-y-1.5">
            {statusOptions.map((opt) => {
              const isSelected = currentStatus === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFilters({ status: opt.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <span className="text-[10px] uppercase tracking-wider">Active</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format Filter */}
        <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3.5 text-primary" /> Format & Attendance
          </label>

          <div className="space-y-1.5">
            {formatOptions.map((opt) => {
              const isSelected = currentFormat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFilters({ format: opt.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span className="text-[10px] uppercase tracking-wider">Active</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tracks & Tags Filter */}
        {availableTags.length > 0 && (
          <div className="p-5 rounded-2xl border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Track / Domain
              </label>
              {currentTag && (
                <button
                  type="button"
                  onClick={() => updateFilters({ tag: null, track: null })}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
                >
                  <X className="size-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {availableTags.map((tag) => {
                const target = currentTag.toLowerCase().trim();
                const cand = tag.toLowerCase().trim();
                const isSelected =
                  target === cand ||
                  cand.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === target ||
                  cand.split(/[^a-z0-9]+/).includes(target);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateFilters({ tag: isSelected ? null : tag, track: null })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-background text-foreground hover:bg-muted/60 border-input"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="w-full rounded-full text-xs gap-2 cursor-pointer border-dashed hover:border-destructive hover:text-destructive transition-colors"
          >
            <RotateCcw className="size-3.5" />
            <span>Clear All Filters</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
