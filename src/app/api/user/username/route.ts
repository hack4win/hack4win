import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository, RESERVED_USERNAMES } from "@/lib/db/user-repository";

/**
 * Username Check & Assignment API Handler
 * 
 * GET: Check if a username is valid and available (real-time validation)
 * POST: Claim/set a unique username for the authenticated user (completing onboarding)
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json(
      { available: false, reason: "Username is required" },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    return NextResponse.json({
      available: false,
      reason: "Username must be at least 3 characters",
      username,
    });
  }

  if (username.length > 30) {
    return NextResponse.json({
      available: false,
      reason: "Username cannot exceed 30 characters",
      username,
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({
      available: false,
      reason: "Only letters, numbers, and underscores are allowed",
      username,
    });
  }

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({
      available: false,
      reason: "This username is reserved by the platform",
      username,
    });
  }

  // Get current user session if available to ignore own username
  const session = await getServerSession();
  const available = await userRepository.isUsernameAvailable(username, session?.user?.id);

  if (!available) {
    return NextResponse.json({
      available: false,
      reason: "This username is already taken",
      username,
    });
  }

  return NextResponse.json({
    available: true,
    reason: "Username is available",
    username,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = (body.username || "").trim().toLowerCase();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters with letters, numbers, and underscores only" },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(username)) {
      return NextResponse.json(
        { error: `Username @${username} is reserved by the platform. Please choose another.` },
        { status: 400 }
      );
    }

    const available = await userRepository.isUsernameAvailable(username, session.user.id);
    if (!available) {
      return NextResponse.json(
        { error: `Username @${username} is already taken. Please choose another.` },
        { status: 400 }
      );
    }

    const updated = await userRepository.updateProfile(session.user.id, {
      username,
      name: name || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Username claimed successfully!",
      user: updated,
    });
  } catch (error) {
    console.error("[Claim Username Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to claim username" },
      { status: 500 }
    );
  }
}
