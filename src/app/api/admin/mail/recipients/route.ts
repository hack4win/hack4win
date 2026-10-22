import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { mailRepository } from "@/lib/db/mail-repository";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";

  try {
    const result = await mailRepository.resolveRecipients(filter);
    return NextResponse.json({
      success: true,
      count: result.count,
      sampleRecipients: result.recipients.slice(0, 5),
    });
  } catch (error) {
    console.error("[Mail Recipients API Error]:", error);
    return NextResponse.json({ error: "Failed to resolve recipients" }, { status: 500 });
  }
}
