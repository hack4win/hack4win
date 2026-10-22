import React from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { ProjectDetailsClient } from "./project-details-client";

import type { Metadata } from "next";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const submission = await hackathonRepository.getSubmissionById(id);

  if (!submission) {
    return {
      title: "Project Not Found | Hack4Win",
    };
  }

  const [session, hackathon] = await Promise.all([
    getServerSession(),
    hackathonRepository.findById(submission.hackathon_id),
  ]);

  if (hackathon?.status === "draft" && session?.user?.role !== "admin") {
    return {
      title: "Project Not Found | Hack4Win",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";
  const canonicalUrl = `${baseUrl}/projects/${submission.id}`;

  return {
    title: `${submission.title} - Built with ${(submission.tech_stack || []).slice(0, 3).join(", ") || "Code"} | Hack4Win`,
    description: submission.tagline || submission.description.slice(0, 160),
    keywords: [
      submission.title,
      ...(submission.tech_stack || []),
      "hackathon project",
      "hack4win showcase",
      "open source",
    ],
    alternates: {
      canonical: `/projects/${submission.id}`,
    },
    openGraph: {
      title: `${submission.title} | Hack4Win Project Showcase`,
      description: submission.tagline || submission.description.slice(0, 160),
      url: canonicalUrl,
      siteName: "Hack4Win",
      images: submission.cover_image ? [{ url: submission.cover_image, alt: submission.title }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${submission.title} | Hack4Win Project Showcase`,
      description: submission.tagline || submission.description.slice(0, 160),
      images: submission.cover_image ? [submission.cover_image] : [],
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [session, submission] = await Promise.all([
    getServerSession(),
    hackathonRepository.getSubmissionById(id),
  ]);

  if (!submission) {
    notFound();
  }

  // Fetch hackathon context, evaluations, and other submissions from the same hackathon
  const [hackathon, evaluations, allHackathonSubmissions] = await Promise.all([
    hackathonRepository.findById(submission.hackathon_id),
    hackathonRepository.getEvaluationsBySubmission(id),
    hackathonRepository.getSubmissions(submission.hackathon_id),
  ]);

  // If hackathon is draft, only admin can view its projects
  if (hackathon?.status === "draft" && session?.user?.role !== "admin") {
    notFound();
  }

  const relatedProjects = allHackathonSubmissions
    .filter((s) => s.id !== submission.id)
    .slice(0, 3);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": submission.title,
    "description": submission.tagline || submission.description.slice(0, 200),
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "All",
    "author": {
      "@type": "Person",
      "name": submission.user_name || "Builder",
    },
    "codeRepository": submission.github_url || undefined,
    "url": submission.demo_url || `${baseUrl}/projects/${submission.id}`,
    "image": submission.cover_image ? [submission.cover_image] : undefined,
  };

  return (
    <>
      {/* Schema.org SoftwareApplication JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(softwareJsonLd) }}
      />
      <ProjectDetailsClient
        submission={submission}
        hackathon={hackathon}
        evaluations={evaluations}
        relatedProjects={relatedProjects}
        currentUser={session?.user || null}
      />
    </>
  );
}
