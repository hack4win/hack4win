import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { skillRepository } from "@/lib/db/skill-repository";
import { DevpostProfileView } from "@/components/profile/devpost-profile-view";
import { Button } from "@/components/ui/button";
import { Trophy, ShieldCheck, ArrowLeft, Gavel } from "lucide-react";
import { UserMenu } from "@/components/navigation/user-menu";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Profile | Hack4Win",
  description: "Manage your hackathon participant profile on Hack4Win",
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const canSeeDrafts = session.user.role === "admin";

  // Fetch full domain profile record, available platform skills, projects, hackathons, and team invitations
  const [user, availableSkills, projects, hackathons, invitations] = await Promise.all([
    userRepository.findById(session.user.id),
    skillRepository.listSkills(),
    userRepository.getUserProjects(session.user.id, { includeDrafts: canSeeDrafts }),
    userRepository.getUserHackathons(session.user.id, { includeDrafts: canSeeDrafts }),
    userRepository.getUserInvitations(session.user.id),
  ]);

  if (!user) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  // If new user has not completed username selection, guide them to choose-username
  if (!user.username) {
    redirect("/auth/choose-username?callbackUrl=/profile");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/hackathons"
            className="flex items-center gap-2.5 font-bold text-xl tracking-tight hover:opacity-85 transition-opacity"
          >
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="size-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
            </span>
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            Participant Profile
          </span>
        </div>

        <div className="flex items-center gap-3">
          {(user.role === "admin" || user.role === "judge") && (
            <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin/judging">
                <Gavel className="size-3.5 mr-1 text-amber-500" /> Judging Portal
              </Link>
            </Button>
          )}
          {user.role === "admin" && (
            <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin">
                <ShieldCheck className="size-3.5 mr-1" /> Admin
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs">
            <Link href="/hackathons">
              <ArrowLeft className="size-3.5 mr-1" /> Hackathons
            </Link>
          </Button>
          <UserMenu user={session.user} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        <DevpostProfileView
          user={user}
          projects={projects}
          hackathons={hackathons}
          invitations={invitations}
          currentUser={session.user}
          availableSkills={availableSkills}
          initialTab={(resolvedSearchParams?.tab as "projects" | "hackathons" | "invites" | "about" | "edit") || "projects"}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
