import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { inquiryRepository } from "@/lib/db/inquiry-repository";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const [inquiries, stats] = await Promise.all([
      inquiryRepository.listInquiries({ status, search, limit, offset }),
      inquiryRepository.getStats(),
    ]);

    return NextResponse.json({ inquiries, stats });
  } catch (error) {
    console.error("[Admin Inquiries GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve host inquiries" },
      { status: 500 }
    );
  }
}
