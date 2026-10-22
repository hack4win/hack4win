import React from "react";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { skillRepository } from "@/lib/db/skill-repository";
import { mailRepository } from "@/lib/db/mail-repository";
import { userRepository } from "@/lib/db/user-repository";
import { MailClient } from "./mail-client";

import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Dispatcher & Campaigns | Admin Console",
  description: "Send targeted marketing broadcasts and transactional deadline alerts to users and hackathon participants",
};

export default async function AdminMailPage() {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const [hackathons, skills, campaigns, mailStats, userStats] = await Promise.all([
    hackathonRepository.listHackathons({ limit: 100 }),
    skillRepository.listSkills(),
    mailRepository.listCampaigns(),
    mailRepository.getCampaignStats(),
    userRepository.getStats(),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Email Campaigns & Communications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose and dispatch targeted marketing broadcasts, hackathon deadline reminders, and transactional updates.
        </p>
      </div>

      <MailClient
        hackathons={hackathons}
        skills={skills}
        initialCampaigns={campaigns}
        initialStats={mailStats}
        totalUsersCount={userStats.totalUsers}
      />
    </main>
  );
}
