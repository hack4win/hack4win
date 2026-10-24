import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamInviteClient } from "./team-invite-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TeamInvitePage({ params }: PageProps) {
  const { id } = await params;
  const invitation = await userRepository.getInvitationById(id);

  if (!invitation) {
    notFound();
  }

  const [session, hackathon] = await Promise.all([
    getServerSession(),
    hackathonRepository.findById(invitation.hackathon_id),
  ]);

  if (hackathon?.status === "draft" && session?.user.role !== "admin") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
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
          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <Button asChild size="sm" className="rounded-full text-xs">
              <Link href={`/auth/signin?callbackUrl=/team-invites/${id}`}>Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <TeamInviteClient invitation={invitation} currentUser={session?.user || null} />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
