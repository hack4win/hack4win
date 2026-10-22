import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { getHackathonStatus, type SubmissionTeamMember } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { getProjectSubmittedEmailTemplate } from "@/lib/email/templates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const hackathon = isUuid
      ? await hackathonRepository.findById(slug)
      : await hackathonRepository.findBySlug(slug);

    const session = await getServerSession();

    if (!hackathon || (hackathon.status === "draft" && session?.user.role !== "admin")) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const submissions = await hackathonRepository.getSubmissions(hackathon.id);
    const isAdmin = session?.user.role === "admin";
    const currentUserId = session?.user.id;

    // Sanitize submissions so private emails and internal invite tokens are not leaked to public scrapers
    const sanitizedSubmissions = submissions.map((sub) => {
      const isOwnerOrMember =
        Boolean(currentUserId) &&
        (sub.user_id === currentUserId || sub.team_member_ids?.includes(currentUserId || ""));

      if (isAdmin || isOwnerOrMember) {
        return sub;
      }

      // Public viewer: strip private emails and internal invite tokens
      const { user_email, ...safeSub } = sub;
      const safeTeamMembers = sub.team_members?.map((m) => {
        const { email, invite_id, ...safeMember } = m;
        return safeMember;
      });

      return {
        ...safeSub,
        team_members: safeTeamMembers,
      };
    });

    return NextResponse.json({ success: true, submissions: sanitizedSubmissions });
  } catch (error) {
    console.error("[GET submissions error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Sign in required" }, { status: 401 });
    }

    const { slug } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const hackathon = isUuid
      ? await hackathonRepository.findById(slug)
      : await hackathonRepository.findBySlug(slug);

    if (!hackathon || (hackathon.status === "draft" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const dynamicStatus = getHackathonStatus(hackathon);
    if (dynamicStatus === "ended" || hackathon.status === "ended") {
      return NextResponse.json(
        { error: "This hackathon has concluded. Submissions are closed." },
        { status: 400 }
      );
    }

    if (dynamicStatus === "upcoming") {
      return NextResponse.json(
        { error: "Submissions have not opened yet. Please wait until the hackathon starts." },
        { status: 400 }
      );
    }

    if (dynamicStatus === "draft" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "This hackathon is in draft mode. Submissions are not yet open." },
        { status: 400 }
      );
    }

    if (hackathon.submission_deadline && new Date(hackathon.submission_deadline) < new Date()) {
      return NextResponse.json(
        { error: "The submission deadline for this hackathon has passed." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      tagline,
      description,
      demo_url,
      github_url,
      video_url,
      cover_image,
      screenshots: rawScreenshots,
      tech_stack,
      team_members,
      team_member_ids,
    } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    if (title.trim().length > 150) {
      return NextResponse.json({ error: "Title cannot exceed 150 characters" }, { status: 400 });
    }

    if (tagline && typeof tagline === "string" && tagline.trim().length > 250) {
      return NextResponse.json({ error: "Tagline cannot exceed 250 characters" }, { status: 400 });
    }

    if (description.trim().length > 20000) {
      return NextResponse.json({ error: "Description exceeds maximum allowed length (20,000 characters)" }, { status: 400 });
    }

    if (!isValidHttpUrl(demo_url) || !isValidHttpUrl(github_url) || !isValidHttpUrl(video_url) || !isValidHttpUrl(cover_image)) {
      return NextResponse.json({ error: "URLs must start with http:// or https://" }, { status: 400 });
    }

    const screenshots: string[] = [];
    if (Array.isArray(rawScreenshots)) {
      if (rawScreenshots.length > 10) {
        return NextResponse.json({ error: "Maximum of 10 screenshots allowed per project" }, { status: 400 });
      }
      for (const shot of rawScreenshots) {
        if (typeof shot === "string" && shot.trim()) {
          const trimmedShot = shot.trim();
          if (trimmedShot.length > 500) {
            return NextResponse.json({ error: "Screenshot URL is too long" }, { status: 400 });
          }
          if (!isValidHttpUrl(trimmedShot)) {
            return NextResponse.json({ error: "Screenshot URLs must start with http:// or https://" }, { status: 400 });
          }
          screenshots.push(trimmedShot);
        }
      }
    }

    // Auto-register user if not already registered (checking participant capacity and private campus eligibility)
    const isAlreadyRegistered = await hackathonRepository.isUserRegistered(hackathon.id, session.user.id);
    if (!isAlreadyRegistered) {
      // SECURITY GATE: If the hackathon is private, verify private access before allowing auto-registration
      if (hackathon.is_private && session.user.role !== "admin" && hackathon.organizer_id !== session.user.id) {
        const accessCheck = await hackathonRepository.verifyPrivateAccess(hackathon, {
          userId: session.user.id,
          userEmail: session.user.email,
          accessCode: body.access_code,
          inviteToken: body.invite_token,
          userRole: session.user.role,
        });

        if (!accessCheck.allowed) {
          return NextResponse.json(
            {
              error: "Forbidden: This is a private hackathon. Access credentials required.",
              reason: accessCheck.reason,
              is_private: true,
              requires_code: Boolean(hackathon.access_code),
            },
            { status: 403 }
          );
        }
      }

      if (hackathon.max_participants && hackathon.max_participants > 0) {
        const currentCount = await hackathonRepository.getParticipantCount(hackathon.id);
        if (currentCount >= hackathon.max_participants) {
          return NextResponse.json(
            { error: "This hackathon has reached its maximum participant capacity." },
            { status: 400 }
          );
        }
      }
      await hackathonRepository.registerUser(hackathon.id, session.user.id);
    }

    // Check if an existing project submission exists for this hackathon
    const existingSubmission = await hackathonRepository.getUserSubmission(hackathon.id, session.user.id);

    // Prepare team members array ensuring both editor and original creator are preserved
    const finalTeamMembers: SubmissionTeamMember[] = Array.isArray(team_members) ? [...team_members] : [];

    if (existingSubmission && existingSubmission.user_id !== session.user.id) {
      // Editing as an accepted teammate: ensure the original creator remains in team members
      const origCreatorIndex = finalTeamMembers.findIndex((m) => m.id === existingSubmission.user_id);
      if (origCreatorIndex === -1) {
        finalTeamMembers.unshift({
          id: existingSubmission.user_id,
          name: existingSubmission.user_name || "Creator",
          image: existingSubmission.user_image || null,
          role: "Project Lead",
          status: "accepted",
        });
      }
      // Ensure the editing teammate is also marked accepted
      const editorIndex = finalTeamMembers.findIndex((m) => m.id === session.user.id);
      if (editorIndex === -1) {
        finalTeamMembers.push({
          id: session.user.id,
          name: session.user.name || "Teammate",
          image: session.user.image || null,
          role: "Co-Builder",
          status: "accepted",
        });
      } else {
        finalTeamMembers[editorIndex] = {
          ...finalTeamMembers[editorIndex],
          status: "accepted",
        };
      }
    } else {
      // Submitting or editing as creator
      const creatorIndex = finalTeamMembers.findIndex((m) => m.id === session.user.id);
      if (creatorIndex === -1) {
        finalTeamMembers.unshift({
          id: session.user.id,
          name: session.user.name || "Creator",
          image: session.user.image || null,
          role: "Project Lead",
          status: "accepted",
        });
      } else {
        finalTeamMembers[creatorIndex] = {
          ...finalTeamMembers[creatorIndex],
          status: "accepted",
          role: finalTeamMembers[creatorIndex].role || "Project Lead",
        };
      }
    }

    const finalMemberIds = Array.from(
      new Set([
        session.user.id,
        ...(existingSubmission ? [existingSubmission.user_id] : []),
        ...(Array.isArray(team_member_ids) ? team_member_ids : []),
        ...finalTeamMembers.map((m) => m.id),
      ])
    ).filter(Boolean);

    const maxTeamLimit = hackathon.max_team_size || 4;
    if (finalMemberIds.length > maxTeamLimit || finalTeamMembers.length > maxTeamLimit) {
      return NextResponse.json(
        { error: `Team size exceeds maximum allowed limit (${maxTeamLimit} members).` },
        { status: 400 }
      );
    }

    const submission = await hackathonRepository.createSubmission({
      hackathon_id: hackathon.id,
      user_id: session.user.id,
      title: title.trim(),
      tagline: tagline?.trim() || undefined,
      description: description.trim(),
      demo_url: demo_url?.trim() || undefined,
      github_url: github_url?.trim() || undefined,
      video_url: video_url?.trim() || undefined,
      cover_image: cover_image?.trim() || undefined,
      screenshots: screenshots,
      tech_stack: Array.isArray(tech_stack) ? tech_stack : [],
      team_members: finalTeamMembers,
      team_member_ids: finalMemberIds,
    });

    // Send project submission confirmation receipt asynchronously
    try {
      if (session.user.email) {
        const emailTemplate = getProjectSubmittedEmailTemplate({
          userName: session.user.name || "Builder",
          projectTitle: title.trim(),
          hackathonTitle: hackathon.title,
          projectId: submission.id,
          demoUrl: demo_url?.trim() || undefined,
          githubUrl: github_url?.trim() || undefined,
          teamMembers: finalTeamMembers.map((m) => m.name || m.id),
        });

        brevoService
          .sendEmail({
            to: [{ email: session.user.email, name: session.user.name || "Builder" }],
            subject: emailTemplate.subject,
            htmlContent: emailTemplate.html,
            textContent: emailTemplate.text,
            sender: HACK4WIN_SENDERS.NOTIFICATIONS,
            engine: "auto",
          })
          .catch((err) => console.warn("[Brevo Submission Email Warning]:", err.message));
      }
    } catch (emailErr) {
      console.warn("[Brevo Submission Email Dispatch Error]:", emailErr);
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        user_name: session.user.name,
        user_image: session.user.image,
      },
      message: "Project successfully submitted!",
    });
  } catch (error) {
    console.error("[POST submission error]:", error);
    return NextResponse.json({ error: "Failed to submit project" }, { status: 500 });
  }
}
