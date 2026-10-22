import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { getHostInquiryEmailTemplate, wrapInEmailLayout } from "@/lib/email/templates";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit to prevent open email relay abuse and inbox bombing
    const clientIp = getClientIp(req);
    const isTestOrLocal = process.env.NODE_ENV !== "production" && (clientIp === "127.0.0.1" || clientIp === "::1");
    const maxLimit = isTestOrLocal ? 100 : 5;
    const limiter = rateLimit(`host_inquiry:${clientIp}`, maxLimit, 10 * 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many inquiries submitted from this network. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const session = await getServerSession();
    const body = await req.json();

    const {
      organizationName,
      contactName,
      email,
      timeline,
      estimatedPrizePool,
      tracks,
      eventGoals,
    } = body;

    // Validate required fields and bounds
    if (!organizationName || typeof organizationName !== "string" || !organizationName.trim()) {
      return NextResponse.json(
        { error: "Organization or company name is required." },
        { status: 400 }
      );
    }
    if (organizationName.trim().length > 100) {
      return NextResponse.json(
        { error: "Organization name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      return NextResponse.json(
        { error: "Contact name is required." },
        { status: 400 }
      );
    }
    if (contactName.trim().length > 100) {
      return NextResponse.json(
        { error: "Contact name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || cleanEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "A valid business email address is required." },
        { status: 400 }
      );
    }

    if (!eventGoals || typeof eventGoals !== "string" || eventGoals.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a brief description of your event goals (at least 10 characters)." },
        { status: 400 }
      );
    }
    if (eventGoals.trim().length > 2000) {
      return NextResponse.json(
        { error: "Event goals description cannot exceed 2,000 characters." },
        { status: 400 }
      );
    }

    const cleanTimeline = typeof timeline === "string" ? timeline.trim().slice(0, 100) : "Flexible";
    const cleanPrizePool = typeof estimatedPrizePool === "string" ? estimatedPrizePool.trim().slice(0, 100) : "Not specified";

    // Dispatch inquiry confirmation to host and alert Hack4Win partnerships team
    try {
      const template = getHostInquiryEmailTemplate({
        organizationName: organizationName.trim(),
        contactName: contactName.trim(),
        email: cleanEmail,
        timeline: cleanTimeline,
        estimatedPrizePool: cleanPrizePool,
        eventGoals: eventGoals.trim(),
      });

      // Send to both user and platform support team
      await brevoService.sendEmail({
        to: [
          { email: cleanEmail, name: contactName.trim() },
          { email: "support@hack4win.online", name: "Hack4Win Partnerships" },
        ],
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        sender: HACK4WIN_SENDERS.SUPPORT,
        replyTo: { email: cleanEmail, name: contactName.trim() },
        tags: ["host-inquiry", "transactional"],
      });
    } catch (mailErr) {
      console.warn("[Host Inquiry Mail Dispatch Notice]:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your interest! Our Hackathon Operations & Partnerships team will review your inquiry and reach out within 24 hours.",
    });
  } catch (error) {
    console.error("[Host Inquiry Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while submitting your inquiry. Please try again." },
      { status: 500 }
    );
  }
}
