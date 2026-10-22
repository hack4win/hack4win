import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { JudgingClient } from "./judging-client";

import { HackathonSubmission, ProjectEvaluation } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Admin Judging & Scoring Portal | Hack4Win Arena",
  description: "Evaluate hackathon project submissions, assign rubric scores, critique, and award winners.",
};

interface JudgingPageProps {
  searchParams: Promise<{
    hackathonId?: string;
  }>;
}

export default async function AdminJudgingPage({ searchParams }: JudgingPageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/admin/judging");
  }

  if (session.user.role !== "admin" && session.user.role !== "judge") {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const canSeeDrafts = session.user.role === "admin";
  const hackathons = await hackathonRepository.listHackathons({ includeDrafts: canSeeDrafts });

  // Selected hackathon default to param or first hackathon
  const selectedHackathonId =
    resolvedParams.hackathonId || (hackathons.length > 0 ? hackathons[0].id : "");

  let submissions: HackathonSubmission[] = [];
  let evaluations: ProjectEvaluation[] = [];

  if (selectedHackathonId) {
    [submissions, evaluations] = await Promise.all([
      hackathonRepository.getJudgingLeaderboard(selectedHackathonId),
      hackathonRepository.getEvaluationsByHackathon(selectedHackathonId),
    ]);
  }

  return (
    <JudgingClient
      hackathons={hackathons}
      initialHackathonId={selectedHackathonId}
      initialSubmissions={submissions}
      initialEvaluations={evaluations}
      currentUser={session.user}
    />
  );
}
