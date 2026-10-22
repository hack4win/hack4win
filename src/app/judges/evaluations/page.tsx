import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { JudgingClient } from "@/app/admin/judging/judging-client";
import { HackathonSubmission, ProjectEvaluation } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evaluation Queue | Judges Portal",
  description: "Evaluate project submissions, assign rubric scores, and leave feedback for builders",
};

interface EvaluationsPageProps {
  searchParams: Promise<{
    hackathonId?: string;
  }>;
}

export default async function JudgesEvaluationsPage({ searchParams }: EvaluationsPageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/judges/evaluations");
  }

  const isSuperAdmin = session.user.role === "admin";
  const hackathons = await hackathonRepository.getHackathonsForJudge(
    session.user.id,
    isSuperAdmin
  );

  const resolvedParams = await searchParams;
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
    <div className="p-4 sm:p-6">
      <JudgingClient
        hackathons={hackathons}
        initialHackathonId={selectedHackathonId}
        initialSubmissions={submissions}
        initialEvaluations={evaluations}
        currentUser={session.user}
      />
    </div>
  );
}
