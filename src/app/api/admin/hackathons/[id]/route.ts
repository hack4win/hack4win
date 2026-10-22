import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { UpdateHackathonInput } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  const { id } = await context.params;
  const hackathon = await hackathonRepository.findById(id);

  if (!hackathon || (hackathon.status === "draft" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  return NextResponse.json({ hackathon });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = (await req.json()) as UpdateHackathonInput;

    if (!isValidHttpUrl(body.website_url) || !isValidHttpUrl(body.banner_url) || !isValidHttpUrl(body.thumbnail_url)) {
      return NextResponse.json({ error: "URLs must start with http:// or https://" }, { status: 400 });
    }

    if (body.start_date || body.end_date || body.submission_deadline) {
      const existing = await hackathonRepository.findById(id);
      if (existing) {
        const start = new Date(body.start_date || existing.start_date).getTime();
        const end = new Date(body.end_date || existing.end_date).getTime();
        const deadlineStr = body.submission_deadline !== undefined ? body.submission_deadline : existing.submission_deadline;

        if (end <= start) {
          return NextResponse.json({ error: "The hackathon end date must be after the start date." }, { status: 400 });
        }

        if (deadlineStr) {
          const deadline = new Date(deadlineStr).getTime();
          if (!isNaN(deadline) && deadline < start) {
            return NextResponse.json({ error: "Deadline cannot be earlier than the start date" }, { status: 400 });
          }
          if (!isNaN(deadline) && deadline > end) {
            return NextResponse.json({ error: "The project submission deadline cannot be later than the hackathon end date." }, { status: 400 });
          }
        }
      }
    }

    const updated = await hackathonRepository.updateHackathon(id, body);
    return NextResponse.json({ success: true, hackathon: updated });
  } catch (error) {
    console.error("[Admin Update Hackathon Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hackathon" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await hackathonRepository.deleteHackathon(id);
    return NextResponse.json({ success: true, message: "Hackathon deleted successfully" });
  } catch (error) {
    console.error("[Admin Delete Hackathon Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete hackathon" },
      { status: 500 }
    );
  }
}
