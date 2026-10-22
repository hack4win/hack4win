import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { isValidHttpUrl } from "@/lib/url-validation";

/**
 * User Profile API Handler
 * 
 * GET: Retrieve full profile for the authenticated user
 * PATCH: Update profile fields (name, bio, github_username, skills, website)
 */

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await userRepository.findById(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, username, bio, github_username, skills, website, image, banner_url, country } = body;

    if (!isValidHttpUrl(website) || !isValidHttpUrl(image) || !isValidHttpUrl(banner_url)) {
      return NextResponse.json({ error: "URLs must start with http:// or https://" }, { status: 400 });
    }

    const updated = await userRepository.updateProfile(session.user.id, {
      name: typeof name === "string" ? name.trim() : undefined,
      username: typeof username === "string" ? username.trim() : undefined,
      bio: typeof bio === "string" ? bio.trim() : undefined,
      github_username: typeof github_username === "string" ? github_username.trim() : undefined,
      skills: Array.isArray(skills) ? skills : undefined,
      website: typeof website === "string" ? website.trim() : undefined,
      image: typeof image === "string" ? image.trim() : undefined,
      banner_url: typeof banner_url === "string" ? banner_url.trim() : undefined,
      country: typeof country === "string" ? country.trim() : undefined,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("[Profile Update Error]:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const isClientError = message.toLowerCase().includes("taken") || 
      message.toLowerCase().includes("reserved") ||
      message.toLowerCase().includes("must be") || 
      message.toLowerCase().includes("cannot be");
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
