import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { SaveEvaluationInput } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "judge") {
    return NextResponse.json({ error: "Forbidden: Judge or Admin privileges required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get("hackathonId");

    const canSeeDrafts = session.user.role === "admin";

    if (!hackathonId || hackathonId === "all") {
      const hackathons = await hackathonRepository.listHackathons({ includeDrafts: canSeeDrafts });
      return NextResponse.json({
        success: true,
        hackathons,
        submissions: [],
        evaluations: [],
      });
    }

    const targetHackathon = await hackathonRepository.findById(hackathonId);
    if (!targetHackathon || (targetHackathon.status === "draft" && !canSeeDrafts)) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const [hackathons, submissions, evaluations] = await Promise.all([
      hackathonRepository.listHackathons({ includeDrafts: canSeeDrafts }),
      hackathonRepository.getJudgingLeaderboard(hackathonId),
      hackathonRepository.getEvaluationsByHackathon(hackathonId),
    ]);

    return NextResponse.json({
      success: true,
      hackathons,
      submissions,
      evaluations,
    });
  } catch (error) {
    console.error("[Admin Judging GET Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load judging data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "judge") {
    return NextResponse.json({ error: "Forbidden: Judge or Admin privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      submission_id,
      hackathon_id,
      score_innovation,
      score_technical,
      score_design,
      score_impact,
      score_presentation,
      feedback,
      award,
    } = body;

    if (!submission_id || !hackathon_id) {
      return NextResponse.json(
        { error: "submission_id and hackathon_id are required" },
        { status: 400 }
      );
    }

    const submission = await hackathonRepository.getSubmissionById(submission_id);
    if (!submission) {
      return NextResponse.json(
        { error: "Project submission not found" },
        { status: 404 }
      );
    }

    if (submission.hackathon_id !== hackathon_id) {
      return NextResponse.json(
        { error: "The submission does not belong to the specified hackathon." },
        { status: 400 }
      );
    }

    const targetHackathon = await hackathonRepository.findById(hackathon_id);
    if (!targetHackathon || (targetHackathon.status === "draft" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Hackathon not found or not published" },
        { status: 404 }
      );
    }

    if (
      submission.user_id === session.user.id ||
      submission.team_member_ids?.includes(session.user.id)
    ) {
      return NextResponse.json(
        { error: "Judges cannot evaluate their own project submission." },
        { status: 403 }
      );
    }

    const input: SaveEvaluationInput = {
      submission_id,
      hackathon_id,
      judge_id: session.user.id,
      judge_name: session.user.name || "Admin Judge",
      judge_email: session.user.email || "admin@platform.com",
      score_innovation: Math.min(10, Math.max(1, Number(score_innovation) || 1)),
      score_technical: Math.min(10, Math.max(1, Number(score_technical) || 1)),
      score_design: Math.min(10, Math.max(1, Number(score_design) || 1)),
      score_impact: Math.min(10, Math.max(1, Number(score_impact) || 1)),
      score_presentation: Math.min(10, Math.max(1, Number(score_presentation) || 1)),
      feedback: feedback ? String(feedback).trim().slice(0, 3000) : null,
      award: award ? String(award).trim().slice(0, 100) : null,
    };

    const evaluation = await hackathonRepository.saveEvaluation(input);

    return NextResponse.json({
      success: true,
      evaluation,
      message: "Scorecard saved and project evaluated successfully!",
    });
  } catch (error) {
    console.error("[Admin Judging POST Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save evaluation" },
      { status: 500 }
    );
  }
}
