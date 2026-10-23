import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession();
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Hackathon identifier required" }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  if (!hackathon.is_private) {
    return NextResponse.json({
      allowed: true,
      valid: true,
      is_private: false,
      reason: "public",
      message: "This is a public competition. Open to all builders.",
    });
  }

  const accessCode = req.nextUrl.searchParams.get("code")?.trim() || undefined;
  const inviteToken =
    req.nextUrl.searchParams.get("invite")?.trim() ||
    req.nextUrl.searchParams.get("token")?.trim() ||
    undefined;

  const check = await hackathonRepository.verifyPrivateAccess(hackathon, {
    userId: session?.user.id,
    userEmail: session?.user.email,
    accessCode,
    inviteToken,
    userRole: session?.user.role,
  });

  return NextResponse.json({
    allowed: check.allowed,
    valid: check.allowed,
    is_private: true,
    reason: check.reason,
    requires_code: Boolean(hackathon.access_code),
    allowed_domains: hackathon.allowed_email_domains || [],
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession();
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Hackathon identifier required" }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
  }

  // If hackathon is public, no access gate is required
  if (!hackathon.is_private) {
    return NextResponse.json({
      valid: true,
      is_private: false,
      message: "This is a public competition. Open to all builders.",
    });
  }

  const body = await req.json().catch(() => ({}));
  const accessCode = body?.access_code ? String(body.access_code).trim() : undefined;
  const inviteToken = body?.invite_token ? String(body.invite_token).trim() : undefined;

  const check = await hackathonRepository.verifyPrivateAccess(hackathon, {
    userId: session?.user.id,
    userEmail: session?.user.email,
    accessCode,
    inviteToken,
    userRole: session?.user.role,
  });

  if (check.allowed) {
    return NextResponse.json({
      allowed: true,
      valid: true,
      is_private: true,
      reason: check.reason,
      message: "Access granted! You are verified to participate in this competition.",
    });
  }

  let errorMessage = "Invalid access credentials.";
  if (accessCode && hackathon.access_code) {
    errorMessage = "Invalid access code. Please verify the passcode with your university host.";
  } else if (session?.user.email && hackathon.allowed_email_domains && hackathon.allowed_email_domains.length > 0) {
    errorMessage = `Your email (${session.user.email}) is not from an approved institutional domain (${hackathon.allowed_email_domains.map((d) => "@" + d).join(", ")}).`;
  }

  return NextResponse.json(
    {
      valid: false,
      is_private: true,
      error: errorMessage,
      allowed_domains: hackathon.allowed_email_domains || [],
      requires_code: Boolean(hackathon.access_code),
    },
    { status: 403 }
  );
}
