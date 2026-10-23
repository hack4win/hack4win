import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { getHackathonStatus } from "@/lib/db/types";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { getHackathonRegistrationEmailTemplate } from "@/lib/email/templates";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ registered: false });
  }

  const { slug } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon || (hackathon.status === "draft" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  const reg = await hackathonRepository.getUserRegistration(hackathon.id, session.user.id);
  return NextResponse.json({
    registered: !!reg,
    participation_type: reg?.participation_type || "looking_for_team",
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required to join hackathon" }, { status: 401 });
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Hackathon identifier required" }, { status: 400 });
  }

  // Find hackathon by UUID id or by URL slug
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
        { error: "Registration is closed as this hackathon has ended." },
        { status: 400 }
      );
    }

    if (dynamicStatus === "draft" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Registration is not yet open for this draft hackathon." },
        { status: 400 }
      );
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Body may be empty
    }

    // 1. Private hackathon eligibility check
    if (hackathon.is_private) {
      const inviteTokenFromQuery =
        req.nextUrl?.searchParams?.get("invite") ||
        req.nextUrl?.searchParams?.get("token") ||
        undefined;
      const accessCheck = await hackathonRepository.verifyPrivateAccess(hackathon, {
        userId: session.user.id,
        userEmail: session.user.email,
        accessCode: typeof body?.access_code === "string" ? body.access_code : undefined,
        inviteToken: (typeof body?.invite_token === "string" ? body.invite_token : undefined) || inviteTokenFromQuery,
        userRole: session.user.role,
      });

      if (!accessCheck.allowed) {
        let errorMessage = "Registration is restricted. This is a private hackathon for college students or invited participants.";
        if (hackathon.allowed_email_domains && hackathon.allowed_email_domains.length > 0) {
          errorMessage = `Registration is restricted to students with institutional email addresses from: ${hackathon.allowed_email_domains.map((d) => "@" + d).join(", ")}.`;
        } else if (hackathon.access_code) {
          errorMessage = "This is a private competition. A valid student access code is required to register.";
        }
        return NextResponse.json(
          {
            error: errorMessage,
            requires_code: Boolean(hackathon.access_code),
            allowed_domains: hackathon.allowed_email_domains || [],
          },
          { status: 403 }
        );
      }
    }

    // 2. Check participant limit (capacity cap)
    if (hackathon.max_participants && hackathon.max_participants > 0) {
      const isAlreadyRegistered = await hackathonRepository.isUserRegistered(hackathon.id, session.user.id);
      if (!isAlreadyRegistered) {
        const currentCount = await hackathonRepository.getParticipantCount(hackathon.id);
        if (currentCount >= hackathon.max_participants) {
          return NextResponse.json(
            {
              error: `Registration is closed. This hackathon has reached its maximum participant limit of ${hackathon.max_participants}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const VALID_PARTICIPATION_TYPES = new Map<string, string>([
      ["solo", "solo"],
      ["individual", "solo"],
      ["looking_for_team", "looking_for_team"],
      ["has_team", "has_team"],
    ]);
    let participationType = "looking_for_team";
    if (body?.participation_type !== undefined) {
      const mapped = VALID_PARTICIPATION_TYPES.get(String(body.participation_type));
      if (!mapped) {
        return NextResponse.json(
          { error: "Invalid participation type. Allowed types: solo, looking_for_team, has_team" },
          { status: 400 }
        );
      }
      participationType = mapped;
    }

    const studentData = {
      student_id: typeof body?.student_id === "string" ? body.student_id.trim().slice(0, 100) : null,
      college_name: typeof body?.college_name === "string" ? body.college_name.trim().slice(0, 200) : null,
      academic_year: typeof body?.academic_year === "string" ? body.academic_year.trim().slice(0, 100) : null,
      branch: typeof body?.branch === "string" ? body.branch.trim().slice(0, 150) : null,
    };

    try {
      await hackathonRepository.registerUser(hackathon.id, session.user.id, participationType, studentData);
    const count = await hackathonRepository.getParticipantCount(hackathon.id);

    // Send confirmation email via Brevo
    if (session.user.email) {
      try {
        const regTemplate = getHackathonRegistrationEmailTemplate({
          userName: session.user.name || "Builder",
          hackathonTitle: hackathon.title,
          slug: hackathon.slug,
          startDate: hackathon.start_date,
          isPrivate: hackathon.is_private,
          accessCode: hackathon.access_code || undefined,
        });

        await brevoService.sendEmail({
          to: [{ email: session.user.email, name: session.user.name || undefined }],
          subject: regTemplate.subject,
          htmlContent: regTemplate.html,
          textContent: regTemplate.text,
          sender: HACK4WIN_SENDERS.NOTIFICATIONS,
          tags: ["hackathon-registration", "transactional"],
        });
      } catch (mailErr) {
        console.warn("[Registration Confirmation Mail Notice]:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      registered: true,
      participation_type: participationType,
      count,
    });
  } catch (err) {
    console.error("[Hackathon Register Error]:", err);
    return NextResponse.json({ error: "Failed to register for hackathon" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Hackathon identifier required" }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon || (hackathon.status === "draft" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  try {
    await hackathonRepository.unregisterUser(hackathon.id, session.user.id);
    const count = await hackathonRepository.getParticipantCount(hackathon.id);

    return NextResponse.json({ success: true, registered: false, count });
  } catch (err) {
    console.error("[Hackathon Unregister Error]:", err);
    return NextResponse.json({ error: "Failed to leave hackathon" }, { status: 500 });
  }
}
