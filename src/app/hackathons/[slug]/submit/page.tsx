import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { SubmitProjectClient } from "./submit-project-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const hackathon = await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    return {
      title: "Hackathon Not Found | Hack4Win",
    };
  }

  return {
    title: `Submit Project - ${hackathon.title} | Hack4Win`,
    description: `Submit your hackathon project for ${hackathon.title} on Hack4Win.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SubmitProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const hackathon = await hackathonRepository.findBySlug(slug);

  const session = await getServerSession();

  if (!hackathon || (hackathon.status === "draft" && session?.user?.role !== "admin")) {
    notFound();
  }

  // If not authenticated, redirect to sign in with return callback
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/hackathons/${slug}/submit`);
  }

  // If user has not chosen a username yet, complete signup first
  if (!session.user.username) {
    redirect(`/auth/choose-username?callbackUrl=/hackathons/${slug}/submit`);
  }

  const [isRegistered, existingSubmission, participants] = await Promise.all([
    hackathonRepository.isUserRegistered(hackathon.id, session.user.id),
    hackathonRepository.getUserSubmission(hackathon.id, session.user.id),
    hackathonRepository.getParticipants(hackathon.id),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Platform Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/hackathons"
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <BrandLogo size="md" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <UserMenu user={session.user} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full">
        <SubmitProjectClient
          hackathon={hackathon}
          sessionUser={session.user}
          isRegistered={isRegistered}
          existingSubmission={existingSubmission}
          availableParticipants={participants}
        />
      </main>

      {/* Platform Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
