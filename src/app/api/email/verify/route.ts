import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { brevoService } from "@/lib/email/brevo-service";

/**
 * Brevo Health & Handshake Verification Endpoint
 * 
 * GET /api/email/verify
 * Tests SMTP Relay (Port 587 STARTTLS) and REST API v3 connectivity.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: Admin or Organizer privileges required to test email service" },
      { status: 403 }
    );
  }

  try {
    const health = await brevoService.verifyEmailService();

    return NextResponse.json({
      success: health.status === "connected",
      status: health.status,
      smtp: health.smtp,
      api: health.api,
      isIpRestricted: health.isIpRestricted,
      detectedIp: health.detectedIp,
      guidanceUrl: health.guidanceUrl,
      guidanceMessage: health.isIpRestricted
        ? `Brevo IP Security Restriction is active. Whitelist ${health.detectedIp || "your current IP"} or disable IP restriction in Brevo at ${health.guidanceUrl}`
        : null,
      verifiedSenders: Object.values(brevoService.HACK4WIN_SENDERS),
    });
  } catch (error) {
    console.error("[GET /api/email/verify error]:", error);
    const analysis = brevoService.analyzeBrevoError(error);

    return NextResponse.json(
      {
        success: false,
        status: analysis.isIpRestricted ? "ip_restricted" : "error",
        error: error instanceof Error ? error.message : "Health check failed",
        isIpRestricted: analysis.isIpRestricted,
        detectedIp: analysis.detectedIp,
        guidanceUrl: analysis.guidanceUrl,
      },
      { status: 500 }
    );
  }
}
