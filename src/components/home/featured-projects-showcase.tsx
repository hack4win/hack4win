"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Star,
  Trophy,
  Globe,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { HackathonSubmission } from "@/lib/db/types";
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

interface FeaturedProjectsShowcaseProps {
  projects: HackathonSubmission[];
}

export function FeaturedProjectsShowcase({ projects }: FeaturedProjectsShowcaseProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  if (!projects || projects.length === 0) {
    return null;
  }

  const filteredProjects = projects.filter((p) => {
    if (filterCategory === "winners") return Boolean(p.winner_badge || p.is_featured);
    if (filterCategory === "ai") {
      const text = `${p.title} ${p.tagline} ${(p.tech_stack || []).join(" ")}`.toLowerCase();
      return text.includes("ai") || text.includes("agent") || text.includes("llm") || text.includes("python");
    }
    if (filterCategory === "mobile") {
      const text = `${p.title} ${p.tagline} ${(p.tech_stack || []).join(" ")}`.toLowerCase();
      return text.includes("mobile") || text.includes("ios") || text.includes("android") || text.includes("spatial") || text.includes("react native");
    }
    return true;
  });

  return (
    <section className="mt-28 w-full text-left space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
            >
              <Rocket className="size-3.5" /> Project Showcase & Hall of Fame
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Featured Projects & Winner Submissions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Explore software shipped by participants worldwide. Inspect source code, launch live demos, and review judge scorecards.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/40 border">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterCategory === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Builds ({projects.length})
          </button>
          <button
            onClick={() => setFilterCategory("winners")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterCategory === "winners"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="size-3 text-amber-500" /> Winners Only
          </button>
          <button
            onClick={() => setFilterCategory("ai")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterCategory === "ai"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🤖 AI & Agents
          </button>
          <button
            onClick={() => setFilterCategory("mobile")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterCategory === "mobile"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📱 Spatial & Mobile
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center border rounded-3xl bg-card space-y-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Rocket className="size-6" />
          </div>
          <h3 className="font-bold text-base">No projects match this category</h3>
          <p className="text-xs text-muted-foreground">
            Switch filter tabs above or explore all challenges to view active project builds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const members = p.team_members && p.team_members.length > 0 ? p.team_members : [];

            return (
              <Card
                key={p.id}
                className="group rounded-3xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Project Banner & Badges */}
                  <Link href={`/projects/${p.id}`} className="block relative h-44 w-full bg-muted overflow-hidden">
                    {p.cover_image ? (
                      <img
                        src={p.cover_image}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted text-primary">
                        <Rocket className="size-12 opacity-80 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      {p.winner_badge ? (
                        <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0 text-[10px] font-bold shadow-xs px-2.5 py-0.5 rounded-full">
                          {p.winner_badge}
                        </Badge>
                      ) : p.is_featured ? (
                        <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0 text-[10px] font-bold shadow-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="size-2.5 fill-white" /> Featured
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

                  {/* Card Content */}
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

                    {/* Tech Stack Pills */}
                    {p.tech_stack && p.tech_stack.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {p.tech_stack.slice(0, 3).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                          >
                            {tech}
                          </span>
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

                {/* Footer with Team & Actions */}
                <div className="px-5 pb-5 pt-2 border-t border-border/50 flex items-center justify-between gap-3">
                  {/* Builders Avatars */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                      {(members.length > 0 ? members.slice(0, 3) : [{ name: p.user_name, image: p.user_image }]).map(
                        (m, mIdx) => (
                          <UserAvatar
                            key={mIdx}
                            src={m.image}
                            name={m.name || "Builder"}
                            alt={m.name || "Builder"}
                            className="size-6 rounded-full ring-2 ring-background shrink-0 bg-primary/20 text-primary"
                            iconClassName="size-3 text-primary"
                          />
                        )
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[100px]">
                      {p.user_name || "Builder"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getSafeExternalUrl(p.demo_url) && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        asChild
                        className="rounded-full text-muted-foreground hover:text-primary cursor-pointer"
                        title="Live Demo"
                      >
                        <a href={getSafeExternalUrl(p.demo_url)} target="_blank" rel="noreferrer">
                          <Globe className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    {getSafeExternalUrl(p.github_url) && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        asChild
                        className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                        title="GitHub Repo"
                      >
                        <a href={getSafeExternalUrl(p.github_url)} target="_blank" rel="noreferrer">
                          <GithubIcon className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] font-bold rounded-full gap-1 px-2.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Link href={`/projects/${p.id}`}>
                        <Eye className="size-3" /> View
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
