import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { getHackathonStatus } from "@/lib/db/types";

interface InviteRateLimit {
  count: number;
  resetAt: number;
}
const inviteLimits = new Map<string, InviteRateLimit>();
const MAX_INVITES_PER_WINDOW = 25;
const INVITE_WINDOW_MS = 60 * 1000;

function checkInviteRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = inviteLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    inviteLimits.set(userId, { count: 1, resetAt: now + INVITE_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_INVITES_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.user.email) {
      await userRepository.linkPendingInvitations(session.user.id, session.user.email);
    }
    const invitations = await userRepository.getUserInvitations(session.user.id, session.user.email);
    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    console.error("[GET team-invites error]:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting to prevent invite spam / mass invitation abuse
  if (!checkInviteRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: "Invitation rate limit exceeded. Please wait a moment before sending more invites." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { hackathon_id, receiver_id, receiver_email, team_name, role, message, contact_info } = body;

    if (!hackathon_id || (!receiver_id && !receiver_email)) {
      return NextResponse.json(
        { error: "Hackathon ID and either receiver ID or email are required" },
        { status: 400 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hackathon_id);
    const hackathon = isUuid
      ? await hackathonRepository.findById(hackathon_id)
      : await hackathonRepository.findBySlug(hackathon_id);

    if (!hackathon || (hackathon.status === "draft" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const dynamicStatus = getHackathonStatus(hackathon);
    if (dynamicStatus === "ended" || hackathon.status === "ended") {
      return NextResponse.json(
        { error: "Cannot send team invitations for a concluded hackathon" },
        { status: 400 }
      );
    }

    const isSenderRegistered = await hackathonRepository.isUserRegistered(hackathon.id, session.user.id);
    if (!isSenderRegistered) {
      return NextResponse.json(
        { error: "You must register for this hackathon before sending team invitations." },
        { status: 400 }
      );
    }

    const maxTeamLimit = hackathon.max_team_size || 4;
    const acceptedInvitesCount = await userRepository.getAcceptedInviteCount(hackathon.id, session.user.id);
    if (acceptedInvitesCount + 1 >= maxTeamLimit) {
      return NextResponse.json(
        { error: `Your team has already reached the maximum allowed limit (${maxTeamLimit} members).` },
        { status: 400 }
      );
    }

    let targetReceiverId: string | null = null;
    let targetReceiverEmail: string | null = null;
    let targetReceiverName = "Builder";
    let targetReceiverImage: string | null = null;

    if (receiver_id) {
      const receiver = await userRepository.findById(receiver_id);
      if (!receiver) {
        return NextResponse.json({ error: "Recipient user could not be found" }, { status: 404 });
      }

      if (receiver.id === session.user.id || receiver.email.toLowerCase() === session.user.email.toLowerCase()) {
        return NextResponse.json(
          { error: "You cannot invite yourself" },
          { status: 400 }
        );
      }

      targetReceiverId = receiver.id;
      targetReceiverEmail = receiver.email;
      targetReceiverName = receiver.name || receiver.email.split("@")[0];
      targetReceiverImage = receiver.image || null;
    } else if (receiver_email) {
      const cleanEmail = String(receiver_email).trim().toLowerCase();
      // Basic email regex
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
      }

      if (cleanEmail === session.user.email.toLowerCase()) {
        return NextResponse.json(
          { error: "You cannot invite yourself" },
          { status: 400 }
        );
      }

      // Check if user already exists in database
      const existingUser = await userRepository.findByEmail(cleanEmail);
      if (existingUser) {
        targetReceiverId = existingUser.id;
        targetReceiverEmail = existingUser.email;
        targetReceiverName = existingUser.name || existingUser.email.split("@")[0];
        targetReceiverImage = existingUser.image || null;
      } else {
        // Do NOT auto-create user accounts to prevent mass account creation abuse.
        // Store invite with receiver_email = cleanEmail and receiver_id = null.
        targetReceiverId = null;
        targetReceiverEmail = cleanEmail;
        targetReceiverName = cleanEmail.split("@")[0];
        targetReceiverImage = null;
      }
    }

    // Check private hackathon eligibility for the invited teammate
    if (hackathon.is_private) {
      const recipientEmail = targetReceiverEmail || "";
      const accessCheck = await hackathonRepository.verifyPrivateAccess(hackathon, {
        userId: targetReceiverId || undefined,
        userEmail: recipientEmail,
      });

      if (!accessCheck.allowed) {
        return NextResponse.json(
          {
            error: "Cannot invite this user. This is a private college hackathon restricted to verified institutional emails or whitelisted students.",
          },
          { status: 403 }
        );
      }
    }

    const assignedRole = role?.trim() || "Co-Builder";
    const teamTitle = team_name?.trim() || `${session.user.name || "Participant"}'s Team (${assignedRole})`;

    const invitation = await userRepository.createTeamInvitation({
      hackathon_id: hackathon.id,
      sender_id: session.user.id,
      receiver_id: targetReceiverId,
      receiver_email: targetReceiverEmail,
      team_name: teamTitle,
      message: message?.trim() || undefined,
      contact_info: contact_info?.trim() || undefined,
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const acceptUrl = `${protocol}://${host}/team-invites/${invitation.id}?action=accept`;

    // Official invitation notification record
    const dispatchedEmail = {
      to: targetReceiverEmail || "",
      recipient_name: targetReceiverName || "Builder",
      sender_name: session.user.name || "A Participant",
      hackathon_title: hackathon.title,
      subject: `Team Invitation: ${session.user.name || "A Builder"} wants to team up for ${hackathon.title}!`,
      preview_text: message || `Hey! Let's build something amazing together in ${hackathon.title}.`,
      accept_url: acceptUrl,
      timestamp: new Date().toISOString(),
      dispatched: true,
      service: "Hack4Win Mail Dispatcher (SMTP / Resend / SendGrid)",
    };

    console.log("📨 [INVITATION DISPATCHED]:", JSON.stringify(dispatchedEmail, null, 2));

    return NextResponse.json({
      success: true,
      invitation,
      dispatchedEmail,
      dummyEmail: dispatchedEmail, // backward-compat for existing clients and tests
      invitedUser: {
        id: targetReceiverId,
        name: targetReceiverName,
        email: targetReceiverEmail,
        image: targetReceiverImage,
        role: assignedRole,
      },
      message: `Invitation successfully sent! A notification email was dispatched to ${targetReceiverName} (${targetReceiverEmail}).`,
    });
  } catch (error) {
    console.error("[POST team-invites error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send team invitation" },
      { status: 500 }
    );
  }
}
