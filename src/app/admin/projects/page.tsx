import React from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { AdminProjectsClient } from "./projects-client";
import { Rocket, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects & Showcase Management | Admin Console",
  description: "Review, manage, feature, and moderate hackathon project submissions on Hack4Win platform",
};

export default async function AdminProjectsPage() {
  const session = await getServerSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "judge" && session.user.role !== "organizer")) {
    redirect("/");
  }

  const canSeeDrafts = session.user.role === "admin";
  const [projects, hackathons, stats] = await Promise.all([
    hackathonRepository.getAllSubmissions({ limit: 200, includeDraftHackathons: canSeeDrafts, includePrivateHackathons: true }),
    hackathonRepository.listHackathons({ limit: 100, includeDrafts: canSeeDrafts }),
    hackathonRepository.getSubmissionStats(),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Projects & Showcase Management</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {projects.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review all submitted hacks, feature standout projects on the home showcase, and manage awards.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" asChild size="sm" className="rounded-full gap-1.5 text-xs">
            <Link href="/" target="_blank">
              <Sparkles className="size-3.5 text-amber-500" /> View Home Showcase
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-full gap-1.5 text-xs">
            <Link href="/hackathons">
              <Trophy className="size-3.5" /> Explore Hackathons
            </Link>
          </Button>
        </div>
      </div>

      <AdminProjectsClient
        initialProjects={projects}
        hackathons={hackathons}
        initialStats={stats}
      />
    </main>
  );
}
