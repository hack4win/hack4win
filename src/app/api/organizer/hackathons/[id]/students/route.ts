import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import {
  getPrivateCampusInviteEmailTemplate,
  getCampusRegistrationApprovedEmailTemplate,
} from "@/lib/email/templates";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Organizer Student Roster & Invites Management API
 * 
 * GET: Fetch registered students, whitelist emails, and invite configuration
 * POST: Bulk add student emails or manage access settings
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "organizer" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Host Organizer privileges required" }, { status: 403 });
  }

  const { id } = await context.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const hackathon = isUuid
    ? await hackathonRepository.findById(id)
    : await hackathonRepository.findBySlug(id);

  if (!hackathon) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  // Verify ownership (unless Super Admin)
  if (session.user.role !== "admin" && (!hackathon.organizer_id || hackathon.organizer_id !== session.user.id)) {
    return NextResponse.json({ error: "Forbidden: You do not own this competition" }, { status: 403 });
  }

  const students = await hackathonRepository.getRegisteredStudents(hackathon.id);

  return NextResponse.json({
    success: true,
    hackathon_id: hackathon.id,
    title: hackathon.title,
    is_private: hackathon.is_private || false,
    access_code: hackathon.access_code,
    allowed_email_domains: hackathon.allowed_email_domains || [],
    invited_emails: hackathon.invited_emails || [],
    invite_token: hackathon.invite_token,
    registered_students: students,
    registered_count: students.length,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "organizer" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Host Organizer privileges required" }, { status: 403 });
  }

  const { id } = await context.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const hackathon = isUuid
    ? await hackathonRepository.findById(id)
    : await hackathonRepository.findBySlug(id);

  if (!hackathon) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  // Verify ownership (unless Super Admin)
  if (session.user.role !== "admin" && (!hackathon.organizer_id || hackathon.organizer_id !== session.user.id)) {
    return NextResponse.json({ error: "Forbidden: You do not own this competition" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action || "add_emails";

    if (action === "approve_student") {
      const studentUserId =
        typeof body.student_user_id === "string"
          ? body.student_user_id
          : typeof body.user_id === "string"
          ? body.user_id
          : "";
      if (!studentUserId) {
        return NextResponse.json({ error: "student_user_id is required" }, { status: 400 });
      }

      await hackathonRepository.updateRegistrationStatus(hackathon.id, studentUserId, "approved");

      // Notify the student via Brevo email that their campus registration has been verified and approved
      const students = await hackathonRepository.getRegisteredStudents(hackathon.id);
      const student = students.find((s) => s.user_id === studentUserId);
      if (student?.email) {
        try {
          const appTemplate = getCampusRegistrationApprovedEmailTemplate({
            userName: student.name || "Builder",
            hackathonTitle: hackathon.title,
            slug: hackathon.slug,
            organizerName: session.user.name || "Campus Organizer",
          });

          await brevoService.sendEmail({
            to: [{ email: student.email, name: student.name || undefined }],
            subject: appTemplate.subject,
            htmlContent: appTemplate.html,
            textContent: appTemplate.text,
            sender: HACK4WIN_SENDERS.WELCOME,
            tags: ["campus-registration-approved", "transactional"],
          });
        } catch (mailErr) {
          console.warn("[Campus Approval Email Notice]:", mailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Approved registration for ${student?.name || student?.email || "student"}`,
        student_user_id: studentUserId,
        status: "approved",
      });
    }

    if (action === "reject_student") {
      const studentUserId =
        typeof body.student_user_id === "string"
          ? body.student_user_id
          : typeof body.user_id === "string"
          ? body.user_id
          : "";
      if (!studentUserId) {
        return NextResponse.json({ error: "student_user_id is required" }, { status: 400 });
      }

      await hackathonRepository.updateRegistrationStatus(hackathon.id, studentUserId, "rejected");

      return NextResponse.json({
        success: true,
        message: "Registration status set to rejected",
        student_user_id: studentUserId,
        status: "rejected",
      });
    }

    if (action === "regenerate_token") {
      const newToken = await hackathonRepository.regenerateInviteToken(hackathon.id);
      return NextResponse.json({
        success: true,
        message: "Invite link regenerated successfully",
        invite_token: newToken,
      });
    }

    if (action === "remove_email") {
      const emailToRemove = typeof body.email === "string" ? body.email.trim() : "";
      if (!emailToRemove) {
        return NextResponse.json({ error: "Email to remove is required" }, { status: 400 });
      }
      const updated = await hackathonRepository.removeInvitedEmail(hackathon.id, emailToRemove);
      return NextResponse.json({
        success: true,
        message: `Removed ${emailToRemove} from student whitelist`,
        invited_emails: updated,
      });
    }

    if (action === "send_invite") {
      const targetEmail = typeof body.email === "string" ? body.email.trim() : "";
      if (!targetEmail) {
        return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
      }
      const baseUrl = process.env.NEXTAUTH_URL || "https://hack4win.online";
      const inviteLink = `${baseUrl}/hackathons/${hackathon.slug}?invite=${hackathon.invite_token || ""}`;
      const template = getPrivateCampusInviteEmailTemplate({
        hackathonTitle: hackathon.title,
        organizerName: session.user.name || "Campus Organizer",
        accessCode: hackathon.access_code || undefined,
        inviteLink,
        allowedDomains: hackathon.allowed_email_domains || undefined,
      });

      await brevoService.sendEmail({
        to: [{ email: targetEmail }],
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        sender: HACK4WIN_SENDERS.WELCOME,
        engine: "auto",
      });

      return NextResponse.json({
        success: true,
        message: `Invitation email dispatched to ${targetEmail}`,
      });
    }

    if (action === "add_emails" || action === "update_emails") {
      const rawEmails = Array.isArray(body.emails)
        ? body.emails
        : typeof body.emails === "string"
        ? body.emails.split(/[\n,; ]+/).filter(Boolean)
        : [];

      const currentEmails = action === "add_emails" ? hackathon.invited_emails || [] : [];
      const combined = [...currentEmails, ...rawEmails];
      const updatedEmails = await hackathonRepository.updateInvitedEmails(hackathon.id, combined);

      // Optionally dispatch branded VIP campus invitation emails to newly added students
      if (body.sendInviteEmails !== false && rawEmails.length > 0) {
        try {
          const newEmails = rawEmails.filter(
            (e: string) => !currentEmails.some((ce: string) => ce.toLowerCase() === e.toLowerCase().trim())
          );
          if (newEmails.length > 0) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://hack4win.online";
            const inviteLink = `${baseUrl}/hackathons/${hackathon.slug}?invite=${hackathon.invite_token || ""}`;
            const template = getPrivateCampusInviteEmailTemplate({
              hackathonTitle: hackathon.title,
              organizerName: session.user.name || "Campus Organizer",
              accessCode: hackathon.access_code || undefined,
              inviteLink,
              allowedDomains: hackathon.allowed_email_domains || undefined,
            });

            for (const email of newEmails) {
              brevoService
                .sendEmail({
                  to: [{ email: email.trim() }],
                  subject: template.subject,
                  htmlContent: template.html,
                  textContent: template.text,
                  sender: HACK4WIN_SENDERS.WELCOME,
                  engine: "auto",
                })
                .catch((err) => console.warn(`[Brevo Student Invite Warning for ${email}]:`, err.message));
            }
          }
        } catch (studentMailErr) {
          console.warn("[Brevo Student Invite Dispatch Error]:", studentMailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Updated student invite roster (${updatedEmails.length} total whitelisted)`,
        invited_emails: updatedEmails,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Organizer Students Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update student roster" },
      { status: 500 }
    );
  }
}
