import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { skillRepository } from "@/lib/db/skill-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/seo/config";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft } from "lucide-react";
import { DevpostProfileView } from "@/components/profile/devpost-profile-view";

import type { Metadata } from "next";
import type { User } from "@/lib/db/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id).trim();
  let user = await userRepository.findById(decoded);
  if (!user) {
    const cleanUsername = decoded.startsWith("@") ? decoded.slice(1) : decoded;
    user = await userRepository.findByUsername(cleanUsername);
  }

  if (!user) {
    return {
      title: "User Not Found | Hack4Win",
    };
  }

  const handle = user.username ? `@${user.username}` : user.name || "builder";
  const baseUrl = SITE_URL;
  const canonicalPath = user.username ? `/u/${user.username}` : `/users/${user.id}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  return {
    title: `${user.name || "Builder"} (${handle}) - Portfolio & Hackathon Builds | Hack4Win`,
    description: user.bio || `Explore hackathons, software submissions, and tech stacks built by ${user.name} on Hack4Win (hack4win.online).`,
    keywords: [
      user.name || "Builder",
      user.username || "",
      ...(user.skills || []),
      "builder portfolio",
      "hackathon developer",
      "hack4win profile",
      "hack4win online",
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${user.name || "Builder"} (${handle}) | Hack4Win Profile`,
      description: user.bio || `Explore hackathons and projects built by ${user.name} on Hack4Win.`,
      url: canonicalUrl,
      siteName: "Hack4Win",
      images: user.image ? [{ url: user.image, alt: user.name || "Builder" }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${user.name || "Builder"} (${handle}) | Hack4Win Profile`,
      description: user.bio || `Explore hackathons and projects built by ${user.name} on Hack4Win.`,
      images: user.image ? [user.image] : [],
    },
  };
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const decoded = decodeURIComponent(id).trim();

  let user = await userRepository.findById(decoded);
  if (!user) {
    const cleanUsername = decoded.startsWith("@") ? decoded.slice(1) : decoded;
    user = await userRepository.findByUsername(cleanUsername);
  }

  const [session, availableSkills] = await Promise.all([
    getServerSession(),
    skillRepository.listSkills(),
  ]);

  if (!user) {
    notFound();
  }

  const isOwner = session?.user.id === user.id;
  const isAdmin = session?.user.role === "admin";
  const canSeeDrafts = isAdmin;

  const [projects, hackathons, invitations] = await Promise.all([
    userRepository.getUserProjects(user.id, { includeDrafts: canSeeDrafts }),
    userRepository.getUserHackathons(user.id, { includeDrafts: canSeeDrafts }),
    isOwner ? userRepository.getUserInvitations(user.id) : Promise.resolve([]),
  ]);

  const baseUrl = SITE_URL;
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": user.name || "Builder",
      "alternateName": user.username ? `@${user.username}` : undefined,
      "description": user.bio || undefined,
      "image": user.image || undefined,
      "url": `${baseUrl}/users/${user.username ? `@${user.username}` : user.id}`,
      "sameAs": [
        user.github_username ? `https://github.com/${user.github_username}` : null,
        user.website || null,
      ].filter(Boolean),
    },
  };

  // Strip private email address from RSC flight payloads unless viewer is the owner or an admin
  const canViewEmail = Boolean(
    session?.user && (session.user.id === user.id || session.user.role === "admin")
  );

  const safeUser: User = canViewEmail
    ? user
    : {
        ...user,
        email: "",
      };

  const safeProjects = canViewEmail
    ? projects
    : projects.map((p) => ({
        ...p,
        team_members: (p.team_members || []).map((m) => {
          if (!m.email) return m;
          const { email, ...rest } = m;
          return rest;
        }),
      }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Schema.org ProfilePage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(personJsonLd) }}
      />
      {/* Navigation Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/hackathons"
            className="flex items-center hover:opacity-85 transition-opacity"
          >
            <BrandLogo size="md" />
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            Participant Profile
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs">
            <Link href="/hackathons">
              <ArrowLeft className="size-3.5 mr-1" /> Hackathons
            </Link>
          </Button>

          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <Button asChild size="sm" className="rounded-full text-xs">
              <Link href={`/auth/signin?callbackUrl=/users/${id}`}>Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        <DevpostProfileView
          user={safeUser}
          projects={safeProjects}
          hackathons={hackathons}
          invitations={invitations}
          currentUser={session?.user || null}
          availableSkills={availableSkills}
          initialTab={(resolvedSearchParams?.tab as "projects" | "hackathons" | "about" | "edit") || "projects"}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
