import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { getHackathonStatus } from "@/lib/db/types";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { getTeamInviteAcceptedEmailTemplate } from "@/lib/email/templates";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invitation = await userRepository.getInvitationById(id);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const session = await getServerSession();
    const isAuthorized =
      Boolean(session) &&
      (session?.user.id === invitation.sender_id ||
        session?.user.id === invitation.receiver_id ||
        (Boolean(session?.user.email) &&
          Boolean(invitation.receiver_email) &&
          invitation.receiver_email!.toLowerCase() === session!.user.email.toLowerCase()) ||
        session?.user.role === "admin");

    if (!isAuthorized) {
      // Redact sensitive details (contact_info, receiver_email, private message) to protect against data snooping
      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          hackathon_id: invitation.hackathon_id,
          hackathon_title: invitation.hackathon_title,
          hackathon_slug: invitation.hackathon_slug,
          sender_name: invitation.sender_name,
          sender_image: invitation.sender_image,
          team_name: invitation.team_name,
          status: invitation.status,
          created_at: invitation.created_at,
        },
        requiresAuth: true,
      });
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("[GET invite error]:", error);
    return NextResponse.json({ error: "Failed to fetch invitation" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const invitation = await userRepository.getInvitationById(id);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}.` },
        { status: 400 }
      );
    }

    // Verify recipient: matches receiver_id or matches receiver_email
    const isRecipient =
      invitation.receiver_id === session.user.id ||
      (Boolean(session.user.email) &&
        Boolean(invitation.receiver_email) &&
        invitation.receiver_email!.toLowerCase() === session.user.email.toLowerCase());

    if (!isRecipient) {
      return NextResponse.json(
        { error: "Only the recipient can accept or decline this invite" },
        { status: 403 }
      );
    }

    if (status === "accepted") {
      const hackathon = await hackathonRepository.findById(invitation.hackathon_id);
      if (hackathon) {
        if (hackathon.status === "draft" && session.user.role !== "admin") {
          return NextResponse.json(
            { error: "Cannot accept invitation because this hackathon has not been published yet." },
            { status: 403 }
          );
        }

        const dynamicStatus = getHackathonStatus(hackathon);
        if (dynamicStatus === "ended" || hackathon.status === "ended") {
          return NextResponse.json(
            { error: "Cannot accept invitation because this hackathon has ended." },
            { status: 400 }
          );
        }

        const maxTeamLimit = hackathon.max_team_size || 4;

        // 1. Check existing project submission for the sender or team
        const senderSubmission = await hackathonRepository.getUserSubmission(
          invitation.hackathon_id,
          invitation.sender_id
        );

        if (senderSubmission) {
          const acceptedMemberIds = new Set<string>();
          if (senderSubmission.user_id) acceptedMemberIds.add(senderSubmission.user_id);
          if (Array.isArray(senderSubmission.team_member_ids)) {
            senderSubmission.team_member_ids.forEach((mId) => acceptedMemberIds.add(mId));
          }
          if (Array.isArray(senderSubmission.team_members)) {
            senderSubmission.team_members.forEach((m) => {
              if (m.id && (m.status === "accepted" || !m.status)) {
                acceptedMemberIds.add(m.id);
              }
            });
          }

          if (!acceptedMemberIds.has(session.user.id) && acceptedMemberIds.size >= maxTeamLimit) {
            return NextResponse.json(
              { error: `Team size exceeds maximum allowed limit (${maxTeamLimit} members).` },
              { status: 400 }
            );
          }
        }

        // 2. Check total accepted invitations for this sender and hackathon
        const acceptedInvitesCount = await userRepository.getAcceptedInviteCount(
          invitation.hackathon_id,
          invitation.sender_id
        );
        // Sender (1) + previously accepted invites
        if (acceptedInvitesCount + 1 >= maxTeamLimit) {
          return NextResponse.json(
            { error: `Team size exceeds maximum allowed limit (${maxTeamLimit} members).` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await userRepository.updateInvitationStatus(id, status, session.user.id);

    // If accepted, auto-register receiver as having a team for this hackathon
    if (status === "accepted") {
      await hackathonRepository.registerUser(
        invitation.hackathon_id,
        session.user.id,
        "has_team"
      );
      await hackathonRepository.registerUser(
        invitation.hackathon_id,
        invitation.sender_id,
        "has_team"
      );
      const syncOptions = {
        senderId: invitation.sender_id,
        memberName: session.user.name || undefined,
        memberImage: session.user.image || null,
        memberRole: invitation.team_name?.includes("(")
          ? invitation.team_name.split("(")[1].replace(")", "")
          : "Co-Builder",
      };

      // Synchronize all accepted team members in project submissions
      await hackathonRepository.syncAcceptedTeamMembersForHackathon(
        invitation.hackathon_id,
        [invitation.sender_id, session.user.id]
      );

      // Notify team leader synchronously that invite was accepted
      try {
        const senderUser = await userRepository.findById(invitation.sender_id);
        if (senderUser?.email) {
          const host = req.headers.get("host") || "localhost:3000";
          const protocol = req.headers.get("x-forwarded-proto") || "http";
          const baseUrl = `${protocol}://${host}`;
          const teamRosterUrl = `${baseUrl}/hackathons/${invitation.hackathon_slug || ""}`;

          const emailTemplate = getTeamInviteAcceptedEmailTemplate({
            leaderName: senderUser.name || "Team Lead",
            memberEmail: session.user.email || invitation.receiver_email || "Teammate",
            memberName: session.user.name || undefined,
            teamName: invitation.team_name || "Innovation Team",
            hackathonTitle: invitation.hackathon_title || "Hackathon Challenge",
            teamRosterUrl,
          });

          const brevoResult = await brevoService.sendEmail({
            to: [{ email: senderUser.email, name: senderUser.name || "Team Lead" }],
            subject: emailTemplate.subject,
            htmlContent: emailTemplate.html,
            textContent: emailTemplate.text,
            sender: HACK4WIN_SENDERS.NOTIFICATIONS,
            tags: ["team-invite-accepted", "transactional"],
          });
          console.log("📨 [TEAM INVITE ACCEPTED EMAIL DISPATCHED]:", JSON.stringify(brevoResult, null, 2));
        }
      } catch (leaderEmailErr) {
        console.warn("[Brevo Team Invite Accepted Email Error]:", leaderEmailErr);
      }
    } else if (status === "declined") {
      await hackathonRepository.updateSubmissionTeamMemberStatus(
        invitation.hackathon_id,
        session.user.id,
        "declined",
        session.user.id
      );
      await hackathonRepository.updateSubmissionTeamMemberStatus(
        invitation.hackathon_id,
        id,
        "declined",
        session.user.id
      );
      if (session.user.email) {
        await hackathonRepository.updateSubmissionTeamMemberStatus(
          invitation.hackathon_id,
          session.user.email,
          "declined",
          session.user.id
        );
      }
      if (invitation.receiver_email) {
        await hackathonRepository.updateSubmissionTeamMemberStatus(
          invitation.hackathon_id,
          invitation.receiver_email,
          "declined",
          session.user.id
        );
      }
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
      message: status === "accepted" ? "Team invitation accepted! 🎉" : "Invitation declined.",
    });
  } catch (error) {
    console.error("[PATCH invite error]:", error);
    return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invitation = await userRepository.getInvitationById(id);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const isSender = invitation.sender_id === session.user.id;
    const isReceiver =
      invitation.receiver_id === session.user.id ||
      (Boolean(session.user.email) &&
        Boolean(invitation.receiver_email) &&
        invitation.receiver_email!.toLowerCase() === session.user.email.toLowerCase());

    if (!isSender && !isReceiver && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only the sender, recipient, or an admin can revoke or delete this invitation" },
        { status: 403 }
      );
    }

    // If invitation was accepted, unlink the two users from any shared project submissions
    if (invitation.status === "accepted" && invitation.receiver_id) {
      await hackathonRepository.removeTeammateFromHackathon(
        invitation.hackathon_id,
        invitation.sender_id,
        invitation.receiver_id
      );

      // Check remaining teammates for sender
      const senderTeammates = await userRepository.getAcceptedTeammates(
        invitation.hackathon_id,
        invitation.sender_id
      );
      if (senderTeammates.length <= 1) {
        await hackathonRepository.registerUser(
          invitation.hackathon_id,
          invitation.sender_id,
          "looking_for_team"
        );
      }

      // Check remaining teammates for receiver
      const receiverTeammates = await userRepository.getAcceptedTeammates(
        invitation.hackathon_id,
        invitation.receiver_id
      );
      if (receiverTeammates.length <= 1) {
        await hackathonRepository.registerUser(
          invitation.hackathon_id,
          invitation.receiver_id,
          "looking_for_team"
        );
      }
    }

    // Delete the invitation
    await userRepository.deleteInvitation(id);

    return NextResponse.json({
      success: true,
      message: invitation.status === "accepted"
        ? "Successfully left the team and unlinked collaboration."
        : "Invitation cancelled.",
    });
  } catch (error) {
    console.error("[DELETE invite error]:", error);
    return NextResponse.json({ error: "Failed to delete invitation" }, { status: 500 });
  }
}
