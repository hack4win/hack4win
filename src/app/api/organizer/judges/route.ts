import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { userRepository } from "@/lib/db/user-repository";

/**
 * Organizer Judges Management API
 * 
 * RBAC Rules:
 * - ONLY Organizers and Platform Admins can access this endpoint.
 * - Regular builders / participants receive 403 Forbidden.
 * - Organizers can only assign judges to hackathons they own.
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOrganizer = session.user.role === "organizer";
  const isAdmin = session.user.role === "admin";

  if (!isOrganizer && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Only hackathon organizers and admins can access judges" },
      { status: 403 }
    );
  }

  const judges = await hackathonRepository.getJudgesForOrganizer(session.user.id, isAdmin);
  return NextResponse.json({ success: true, judges });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOrganizer = session.user.role === "organizer";
  const isAdmin = session.user.role === "admin";

  if (!isOrganizer && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Only hackathon organizers and admins can create or invite judges" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, name, hackathonId, bio, title } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "A valid judge email address is required" },
        { status: 400 }
      );
    }

    // Verify hackathon ownership if hackathonId is supplied
    if (hackathonId) {
      const hackathon = await hackathonRepository.findById(hackathonId);
      if (!hackathon) {
        return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
      }

      if (!isAdmin && hackathon.organizer_id !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only assign judges to hackathons you organize" },
          { status: 403 }
        );
      }
    }

    // Check if user already exists
    let judgeUser = await userRepository.findByEmail(cleanEmail);

    if (judgeUser) {
      // If user exists and is not admin or organizer, promote to judge
      if (judgeUser.role === "user") {
        judgeUser = await userRepository.updateRole(judgeUser.id, "judge");
      }
    } else {
      // Provision a new judge user
      judgeUser = await userRepository.createUser({
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split("@")[0],
        role: "judge",
        bio: bio?.trim() || title?.trim() || "Hackathon Evaluator & Technical Judge",
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });
    }

    // If hackathonId was passed, assign the judge
    if (hackathonId) {
      await hackathonRepository.assignJudge(hackathonId, judgeUser.id, session.user.id);
    }

    return NextResponse.json(
      {
        success: true,
        judge: judgeUser,
        assigned: Boolean(hackathonId),
        message: `Judge account ready for ${judgeUser.email}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Organizer Create Judge Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite judge" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOrganizer = session.user.role === "organizer";
  const isAdmin = session.user.role === "admin";

  if (!isOrganizer && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Only organizers and admins can remove judges" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const judgeId = url.searchParams.get("judgeId");
    const hackathonId = url.searchParams.get("hackathonId");

    if (!judgeId || !hackathonId) {
      return NextResponse.json(
        { error: "Both judgeId and hackathonId parameters are required" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      const hackathon = await hackathonRepository.findById(hackathonId);
      if (!hackathon || hackathon.organizer_id !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only remove judges from hackathons you organize" },
          { status: 403 }
        );
      }
    }

    await hackathonRepository.removeJudge(hackathonId, judgeId);
    return NextResponse.json({ success: true, message: "Judge assignment removed" });
  } catch (error) {
    console.error("[Organizer Remove Judge Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove judge" },
      { status: 500 }
    );
  }
}
