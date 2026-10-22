import React from "react";
import Link from "next/link";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { HackathonsClient } from "./hackathons-client";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";

import { getServerSession } from "@/lib/auth/session";

/**
 * Admin Hackathons Management Page (Server Component)
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hackathons Management | Admin Console",
  description: "Create and manage hackathon competitions on Hack4Win platform",
};

export default async function AdminHackathonsPage() {
  const session = await getServerSession();
  const canSeeDrafts = session?.user.role === "admin";
  const hackathons = await hackathonRepository.listHackathons({ limit: 100, includeDrafts: canSeeDrafts });
  const stats = await hackathonRepository.getStats({ includeDrafts: canSeeDrafts });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hackathons Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize challenges, configure prize pools, and oversee competition lifecycles.
          </p>
        </div>

        <Button asChild className="gap-2 rounded-full shadow-xs">
          <Link href="/admin/hackathons/new">
            <Plus className="size-4" />
            Create Hackathon
          </Link>
        </Button>
      </div>

      <HackathonsClient initialHackathons={hackathons} initialStats={stats} />
    </main>
  );
}
