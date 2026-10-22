import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";

/**
 * Super Admin Organizers Provisioning API
 * 
 * RBAC Rules:
 * - ONLY Platform Admins can create Organizer accounts.
 * - Non-admins receive 403 Forbidden.
 */

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only platform administrators can create organizer accounts" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, name, bio, website, organization } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "A valid email address is required for the organizer account" },
        { status: 400 }
      );
    }

    let organizerUser = await userRepository.findByEmail(cleanEmail);

    if (organizerUser) {
      if (organizerUser.role !== "admin") {
        organizerUser = await userRepository.updateRole(organizerUser.id, "organizer");
      }
    } else {
      organizerUser = await userRepository.createUser({
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split("@")[0],
        role: "organizer",
        bio: bio?.trim() || (organization ? `Organizer at ${organization}` : "Hackathon Competition Host"),
        website: website?.trim() || null,
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        organizer: organizerUser,
        message: `Organizer account ready for ${organizerUser.email}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin Create Organizer Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create organizer" },
      { status: 500 }
    );
  }
}
