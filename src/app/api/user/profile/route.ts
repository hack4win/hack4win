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

    if (name && typeof name === "string" && name.trim().length > 100) {
      return NextResponse.json({ error: "Name cannot exceed 100 characters" }, { status: 400 });
    }

    if (username && typeof username === "string" && username.trim().length > 40) {
      return NextResponse.json({ error: "Username cannot exceed 40 characters" }, { status: 400 });
    }

    if (bio && typeof bio === "string" && bio.trim().length > 2000) {
      return NextResponse.json({ error: "Bio cannot exceed 2,000 characters" }, { status: 400 });
    }

    if (github_username && typeof github_username === "string" && github_username.trim().length > 50) {
      return NextResponse.json({ error: "GitHub username cannot exceed 50 characters" }, { status: 400 });
    }

    if (country && typeof country === "string" && country.trim().length > 100) {
      return NextResponse.json({ error: "Country name cannot exceed 100 characters" }, { status: 400 });
    }

    if (skills) {
      if (!Array.isArray(skills)) {
        return NextResponse.json({ error: "Skills must be an array of strings" }, { status: 400 });
      }
      if (skills.length > 30) {
        return NextResponse.json({ error: "Maximum 30 skills allowed" }, { status: 400 });
      }
      for (const skill of skills) {
        if (typeof skill !== "string" || skill.trim().length > 40) {
          return NextResponse.json({ error: "Skill tags cannot exceed 40 characters" }, { status: 400 });
        }
      }
    }

    if (website && typeof website === "string" && website.trim().length > 300) {
      return NextResponse.json({ error: "Website URL cannot exceed 300 characters" }, { status: 400 });
    }

    if (image && typeof image === "string" && image.trim().length > 500) {
      return NextResponse.json({ error: "Image URL cannot exceed 500 characters" }, { status: 400 });
    }

    if (banner_url && typeof banner_url === "string" && banner_url.trim().length > 500) {
      return NextResponse.json({ error: "Banner URL cannot exceed 500 characters" }, { status: 400 });
    }

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
