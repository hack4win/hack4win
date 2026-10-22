import React from "react";
import { skillRepository } from "@/lib/db/skill-repository";
import { SkillsClient } from "./skills-client";

import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Skills Management | Admin Console",
  description: "Manage global platform skills selectable on developer profiles",
};

export default async function AdminSkillsPage() {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const skills = await skillRepository.listSkills();

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Skills & Proficiencies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform technical skills and proficiencies that users can add to their public developer profiles.
        </p>
      </div>

      <SkillsClient initialSkills={skills} />
    </main>
  );
}
