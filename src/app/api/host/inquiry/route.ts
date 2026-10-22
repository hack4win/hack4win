import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

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

    // In a production environment, this dispatches a notification email or persists to an inquiries table.
    console.log("[Host Hackathon Inquiry Received]:", {
      organizationName: organizationName.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      timeline: timeline || "Flexible",
      estimatedPrizePool: estimatedPrizePool || "Not specified",
      tracks: Array.isArray(tracks) ? tracks : [],
      eventGoals: eventGoals.trim(),
      submittedByUserId: session?.user?.id || null,
      submittedAt: new Date().toISOString(),
    });

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
