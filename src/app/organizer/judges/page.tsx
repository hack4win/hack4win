import React from "react";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { JudgesClient } from "./judges-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Judges Management | Organizer Portal",
  description: "Invite judges with emails and assign them to score your hackathon competitions",
};

export default async function OrganizerJudgesPage() {
  const session = await getServerSession();
  const isSuperAdmin = session?.user.role === "admin";

  const allHackathons = await hackathonRepository.listHackathons({ includeDrafts: true });
  const myHackathons = isSuperAdmin
    ? allHackathons
    : allHackathons.filter((h) => h.organizer_id === session?.user.id);

  const judges = await hackathonRepository.getJudgesForOrganizer(session?.user.id || "", isSuperAdmin);

  const hackathonOptions = myHackathons.map((h) => ({
    id: h.id,
    title: h.title,
    slug: h.slug,
    status: h.status,
  }));

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
      <JudgesClient initialJudges={judges} hackathons={hackathonOptions} />
    </main>
  );
}
