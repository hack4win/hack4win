import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { brevoService, HACK4WIN_SENDERS } from "@/lib/email/brevo-service";
import { getHostInquiryEmailTemplate, wrapInEmailLayout } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  try {
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

    // Validate required fields
    if (!organizationName || typeof organizationName !== "string" || !organizationName.trim()) {
      return NextResponse.json(
        { error: "Organization or company name is required." },
        { status: 400 }
      );
    }

    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      return NextResponse.json(
        { error: "Contact name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
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

    // Dispatch inquiry confirmation to host and alert Hack4Win partnerships team
    try {
      const template = getHostInquiryEmailTemplate({
        organizationName: organizationName.trim(),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        timeline: timeline || "Flexible",
        estimatedPrizePool: estimatedPrizePool || "Not specified",
        eventGoals: eventGoals.trim(),
      });

      // Send to both user and platform support team
      await brevoService.sendEmail({
        to: [
          { email: email.trim().toLowerCase(), name: contactName.trim() },
          { email: "support@hack4win.online", name: "Hack4Win Partnerships" },
        ],
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        sender: HACK4WIN_SENDERS.SUPPORT,
        replyTo: { email: email.trim().toLowerCase(), name: contactName.trim() },
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
