import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { UserRole } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";

/**
 * Admin Users Management API Handler
 * 
 * Protected by Admin Role check
 * GET: List users with optional search and role filtering
 * PATCH: Update user role (e.g. promote to admin, organizer, judge)
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const role = url.searchParams.get("role") || undefined;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const hideTestAccounts = url.searchParams.get("hideTestAccounts") === "true";

  const users = await userRepository.listUsers({ search, role, limit, offset, hideTestAccounts });
  const total = await userRepository.countUsers({ search, role, hideTestAccounts });
  const stats = await userRepository.getStats();

  return NextResponse.json({ users, stats, total, limit, offset });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (userId === session.user.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot revoke your own administrative privileges." },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["user", "organizer", "judge", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const updatedUser = await userRepository.updateRole(userId, role);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("[Admin Role Update Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update role" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new user (Admin privileges required)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, role = "user", bio, github_username, website, image, skills } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    if (!isValidHttpUrl(website) || !isValidHttpUrl(image)) {
      return NextResponse.json(
        { error: "URLs must start with http:// or https://" },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["user", "organizer", "judge", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const newUser = await userRepository.createUser({
      name: name?.trim() || email.split("@")[0],
      email: email.trim().toLowerCase(),
      role,
      bio: bio?.trim(),
      github_username: github_username?.trim(),
      website: website?.trim(),
      image: image?.trim(),
      skills: Array.isArray(skills) ? skills : [],
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("[Admin Create User Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 400 }
    );
  }
}

/**
 * DELETE: Delete a user by ID (Admin privileges required)
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 });
    }

    // Protect against self-deletion
    if (session.user.id === userId) {
      return NextResponse.json({ error: "Cannot delete your own administrative account" }, { status: 400 });
    }

    await userRepository.deleteUser(userId);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("[Admin Delete User Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
