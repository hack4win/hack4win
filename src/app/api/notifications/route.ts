import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { notificationService } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const data = await notificationService.getNotificationsForUser(session.user);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/notifications Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve notifications" },
      { status: 500 }
    );
  }
}
