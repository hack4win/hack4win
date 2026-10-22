import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { CreateHackathonInput } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";

/**
 * Admin Hackathons API Handler
 * 
 * Protected by Admin Role check
 * GET: List all hackathons and stats
 * POST: Create a new hackathon
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit") || 50);

  const canSeeDrafts = session.user.role === "admin";
  const hackathons = await hackathonRepository.listHackathons({ search, status, limit, includeDrafts: canSeeDrafts });
  const stats = await hackathonRepository.getStats({ includeDrafts: canSeeDrafts });

  return NextResponse.json({ hackathons, stats });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as CreateHackathonInput;

    if (!body.title || !body.tagline || !body.description || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "Title, tagline, description, start_date, and end_date are required." },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(body.website_url) || !isValidHttpUrl(body.banner_url) || !isValidHttpUrl(body.thumbnail_url)) {
      return NextResponse.json({ error: "URLs must start with http:// or https://" }, { status: 400 });
    }

    const start = new Date(body.start_date).getTime();
    const end = new Date(body.end_date).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return NextResponse.json({ error: "The hackathon end date must be after the start date." }, { status: 400 });
    }

    if (body.submission_deadline) {
      const deadline = new Date(body.submission_deadline).getTime();
      if (!isNaN(deadline) && deadline < start) {
        return NextResponse.json({ error: "Deadline cannot be earlier than the start date" }, { status: 400 });
      }
      if (!isNaN(deadline) && deadline > end) {
        return NextResponse.json({ error: "The project submission deadline cannot be later than the hackathon end date." }, { status: 400 });
      }
    }

    const hackathon = await hackathonRepository.createHackathon({
      ...body,
      organizer_id: body.organizer_id || session.user.id,
      organizer_name: body.organizer_name || session.user.name || "Hack4Win Admin",
    });

    return NextResponse.json({ success: true, hackathon }, { status: 201 });
  } catch (error) {
    console.error("[Admin Create Hackathon Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create hackathon" },
      { status: 400 }
    );
  }
}
