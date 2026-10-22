import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "judge" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin, Judge, or Organizer privileges required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const hackathonId = searchParams.get("hackathon_id") || undefined;
    const status = searchParams.get("status") || undefined;
    const isFeaturedParam = searchParams.get("is_featured");
    const isFeatured = isFeaturedParam !== null ? isFeaturedParam === "true" : undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const canSeeDrafts = session.user.role === "admin";
    const [projects, stats] = await Promise.all([
      hackathonRepository.getAllSubmissions({
        search,
        hackathonId,
        status,
        isFeatured,
        limit,
        offset,
        includeDraftHackathons: canSeeDrafts,
      }),
      hackathonRepository.getSubmissionStats(),
    ]);

    return NextResponse.json({
      success: true,
      projects,
      stats,
    });
  } catch (error) {
    console.error("[GET /api/admin/projects error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
