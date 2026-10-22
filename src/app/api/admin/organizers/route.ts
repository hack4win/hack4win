import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { wrapInEmailLayout } from "@/lib/email/templates";

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

    // Dispatch Welcome Organizer onboarding email
    try {
      const host = req.headers.get("host") || "hack4win.online";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const organizerPortalUrl = `${protocol}://${host}/organizer`;

      const welcomeHtml = `
        <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 800; color: #ffffff;">
          Organizer Workspace Activated 🏢
        </h1>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
          Hi <strong>${organizerUser.name}</strong>, your Hack4Win Host Organizer account is ready! You can now launch public and private hackathons, configure scorecards, and invite judges.
        </p>
        <div style="text-align: center; margin: 28px 0 20px;">
          <a href="${organizerPortalUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">
            Launch Organizer Studio &rarr;
          </a>
        </div>
      `;

      await brevoService.sendEmail({
        to: [{ email: organizerUser.email, name: organizerUser.name || undefined }],
        subject: `Welcome to Hack4Win Host Studio, ${organizerUser.name}! 🚀`,
        htmlContent: wrapInEmailLayout(welcomeHtml, {
          preheader: "Your Hack4Win Organizer privileges are now active. Start hosting competitions.",
        }),
        sender: HACK4WIN_SENDERS.WELCOME,
        tags: ["organizer-onboarding", "transactional"],
      });
    } catch (mailErr) {
      console.warn("[Organizer Onboarding Mail Notice]:", mailErr);
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
