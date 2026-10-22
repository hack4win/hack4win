"use client";

import React from "react";
import Link from "next/link";
import {
  Bot,
  Smartphone,
  Cpu,
  Globe,
  Leaf,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TracksEcosystemSection() {
  const tracks = [
    {
      name: "AI & Autonomous Agents",
      slug: "ai",
      tagline: "Autonomous workflows, multi-agent frameworks & multimodal intelligence.",
      icon: Bot,
      techs: ["OpenAI", "Anthropic", "LangChain", "CrewAI", "Python"],
      badge: "Trending 🔥",
      color: "from-blue-500/15 via-blue-500/5 to-transparent text-blue-500 border-blue-500/20",
    },
    {
      name: "Mobile & Spatial Computing",
      slug: "mobile",
      tagline: "Next-generation iOS, VisionOS, AR/VR experiences & fluid cross-platform apps.",
      icon: Smartphone,
      techs: ["React Native", "SwiftUI", "Flutter", "visionOS", "Unity"],
      badge: "High Growth",
      color: "from-purple-500/15 via-purple-500/5 to-transparent text-purple-500 border-purple-500/20",
    },
    {
      name: "Next-Gen DevTools & Cloud",
      slug: "devtools",
      tagline: "Developer productivity, serverless databases, caching & edge runtimes.",
      icon: Cpu,
      techs: ["Next.js", "Neon Postgres", "Rust", "Tailwind", "Docker"],
      badge: "Core Infra",
      color: "from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-500 border-emerald-500/20",
    },
    {
      name: "Web3 & Decentralized Systems",
      slug: "web3",
      tagline: "Decentralized protocols, peer-to-peer security & verifiable compute.",
      icon: Globe,
      techs: ["Solidity", "EVM", "Zero Knowledge", "IPFS", "Solana"],
      badge: "Community",
      color: "from-amber-500/15 via-amber-500/5 to-transparent text-amber-500 border-amber-500/20",
    },
    {
      name: "FinTech & Global Payments",
      slug: "fintech",
      tagline: "Smart invoicing, cross-border remittance & AI algorithmic finance.",
      icon: CreditCard,
      techs: ["Stripe", "Plaid", "Postgres", "Redis", "Security"],
      badge: "Ecosystem",
      color: "from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-500 border-cyan-500/20",
    },
    {
      name: "Climate Tech & Public Goods",
      slug: "climate",
      tagline: "Clean energy optimization, carbon offsetting & civic software.",
      icon: Leaf,
      techs: ["Open Data", "IoT Sensors", "Mapping", "Analytics"],
      badge: "Social Impact",
      color: "from-teal-500/15 via-teal-500/5 to-transparent text-teal-500 border-teal-500/20",
    },
  ];

  return (
    <section className="mt-28 w-full text-left space-y-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
          >
            <Sparkles className="size-3.5" /> Curated Tracks
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Explore By Innovation Tracks
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Target your specific tech stack and passion area to find challenges that match your expertise.
          </p>
        </div>

        <Button asChild variant="outline" className="rounded-full gap-2 text-xs font-semibold self-start md:self-auto">
          <Link href="/hackathons">
            All Tracks & Tags <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const Icon = track.icon;
          return (
            <Link
              key={track.slug}
              href={`/hackathons?track=${track.slug}`}
              className="rounded-2xl border bg-card p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group block"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`size-11 rounded-xl bg-gradient-to-br flex items-center justify-center border shadow-xs transition-transform duration-300 group-hover:scale-110 ${track.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                    {track.badge}
                  </span>
                </div>

                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  {track.name}
                  <ArrowRight className="size-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {track.tagline}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t flex flex-wrap gap-1.5">
                {track.techs.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
