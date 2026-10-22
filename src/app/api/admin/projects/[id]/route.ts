import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { UpdateSubmissionInput } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const project = await hackathonRepository.getSubmissionById(id);

    if (!project) {
      return NextResponse.json({ error: "Project submission not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("[GET /api/admin/projects/[id] error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = (await req.json()) as UpdateSubmissionInput;

    if (!isValidHttpUrl(body.demo_url) || !isValidHttpUrl(body.github_url) || !isValidHttpUrl(body.video_url) || !isValidHttpUrl(body.cover_image)) {
      return NextResponse.json({ error: "URLs must start with http:// or https://" }, { status: 400 });
    }

    if (body.screenshots) {
      if (!Array.isArray(body.screenshots) || body.screenshots.some((s) => !isValidHttpUrl(s))) {
        return NextResponse.json({ error: "Screenshot URLs must start with http:// or https://" }, { status: 400 });
      }
    }

    const updated = await hackathonRepository.updateSubmission(id, body);
    return NextResponse.json({
      success: true,
      project: updated,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("[PATCH /api/admin/projects/[id] error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const success = await hackathonRepository.deleteSubmission(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete project submission" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/admin/projects/[id] error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
