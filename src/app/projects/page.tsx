import React from "react";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { ProjectsDirectoryClient } from "./projects-directory-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project Showcase & Hackathon Builds | Hack4Win",
  description:
    "Explore cutting-edge software and applications built by developers across global hackathons on Hack4Win. Inspect open-source repositories, test live interactive demos, and discover winner submissions.",
  keywords: [
    "hackathon projects",
    "software showcase",
    "developer builds",
    "open source projects",
    "winner projects",
    "ai agents",
    "web3 applications",
    "hack4win showcase",
  ],
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Project Showcase & Hackathon Builds | Hack4Win",
    description:
      "Explore cutting-edge software and applications built by developers across global hackathons on Hack4Win.",
    url: "https://hack4win.online/projects",
    siteName: "Hack4Win",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Showcase & Hackathon Builds | Hack4Win",
    description:
      "Explore cutting-edge software and applications built by developers across global hackathons on Hack4Win.",
  },
};

interface ProjectsPageProps {
  searchParams?: Promise<{
    search?: string;
    tech?: string;
    filter?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { search, tech, filter } = resolvedParams;

  const session = await getServerSession();
  const isAdmin = session?.user?.role === "admin";

  // Fetch all submissions with strict draft isolation (only admins can view draft hackathon submissions)
  const submissions = await hackathonRepository.getAllSubmissions({
    includeDraftHackathons: isAdmin,
    limit: 200,
  });

  // Extract unique tech stacks from visible submissions
  const availableTechStacks = Array.from(
    new Set(
      submissions
        .flatMap((s) => s.tech_stack || [])
        .map((t) => t.trim())
        .filter(Boolean)
    )
  ).sort();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";

  // Schema.org ItemList JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hackathon Project Showcase",
    description: "Software applications and projects shipped during Hack4Win hackathons",
    numberOfItems: submissions.length,
    itemListElement: submissions.slice(0, 30).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "SoftwareApplication",
        name: p.title,
        description: p.tagline || p.description.slice(0, 160),
        url: `${baseUrl}/projects/${p.id}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        author: {
          "@type": "Person",
          name: p.user_name || "Hackathon Builder",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />
      <ProjectsDirectoryClient
        initialProjects={submissions}
        availableTechStacks={availableTechStacks}
        initialSearch={search || ""}
        initialTech={tech || ""}
        initialFilter={filter || "all"}
        currentUser={session?.user || null}
      />
    </>
  );
}
