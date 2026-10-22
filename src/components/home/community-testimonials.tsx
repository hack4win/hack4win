"use client";

import React from "react";
import { Star, Quote, Award, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CommunityTestimonials() {
  const testimonials = [
    {
      quote:
        "We built an autonomous multi-agent dev assistant in 48 hours. The 2-way invite system made finding our React frontend lead effortless, and the transparent rubric feedback from judges gave us exactly what we needed to raise our pre-seed.",
      name: "Marcus Vance",
      role: "Founder & AI Engineer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      award: "🥇 1st Place AI Agents Challenge",
      stack: "Python • CrewAI • Next.js",
    },
    {
      quote:
        "Hack4Win is hands down the cleanest hackathon platform I've used. Having our live interactive demo, GitHub repo, and project scorecard in one verified public profile made showcasing to tech sponsors completely friction-free.",
      name: "Elena Rostova",
      role: "Spatial Computing Lead",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
      award: "✨ Best Spatial Experience",
      stack: "SwiftUI • VisionOS • WebAssembly",
    },
    {
      quote:
        "I registered solo with an idea for serverless developer tooling. Found two incredible collaborators through Hack4Win's matchmaking, won 2nd place runner-up, and we're now launching our hack as an open-source product.",
      name: "Devon Chen",
      role: "Backend Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      award: "🥈 2nd Place DevTools Sprint",
      stack: "Rust • TypeScript • Neon DB",
    },
  ];

  return (
    <section className="mt-28 w-full text-left space-y-10">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
        >
          <Sparkles className="size-3.5" /> Builder Stories
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Built on Hack4Win, Shipped to the World
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          See how engineers, designers, and solo participants form high-performance squads and launch their ideas into real-world software.
        </p>
      </div>

      {/* Testimonials Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item, idx) => (
          <div
            key={idx}
            className="rounded-3xl border bg-card p-6 sm:p-7 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6 group"
          >
            <div className="space-y-4">
              {/* Stars & Quote Icon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <Quote className="size-6 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
              </div>

              {/* Quote text */}
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            {/* Author info */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="size-10 rounded-full object-cover border"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1">
                    {item.name}
                    <CheckCircle2 className="size-3.5 text-primary" />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{item.role}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-primary">{item.award}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{item.stack}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
