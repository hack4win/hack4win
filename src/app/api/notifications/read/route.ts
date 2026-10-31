import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { notificationService } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = session.user;
    if (role !== "admin" && role !== "organizer" && role !== "judge") {
      return NextResponse.json(
        { error: "Notifications are only accessible for Organizer, Judge, or Admin roles" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, all } = body;

    await notificationService.markAsRead(session.user.id, notificationId, Boolean(all));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/notifications/read Error]:", error);
    return NextResponse.json(
      { error: "Failed to update notification read status" },
      { status: 500 }
    );
  }
}
