import React from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { HackathonsClient } from "@/app/admin/hackathons/hackathons-client";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Hackathons | Organizer Portal",
  description: "Manage, publish, and track competitions hosted by you",
};

export default async function OrganizerHackathonsPage() {
  const session = await getServerSession();
  const isSuperAdmin = session?.user.role === "admin";

  const allHackathons = await hackathonRepository.listHackathons({ limit: 100, includeDrafts: true });
  const myHackathons = isSuperAdmin
    ? allHackathons
    : allHackathons.filter((h) => h.organizer_id === session?.user.id);

  const stats = await hackathonRepository.getStats({ includeDrafts: true });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Competitions Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize developer challenges, configure bounties, and oversee competition lifecycles.
          </p>
        </div>

        <Button asChild className="gap-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
          <Link href="/organizer/hackathons/new">
            <Plus className="size-4" />
            Create Challenge
          </Link>
        </Button>
      </div>

      <HackathonsClient initialHackathons={myHackathons} initialStats={stats} />
    </main>
  );
}
