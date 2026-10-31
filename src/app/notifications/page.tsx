import React from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { notificationService } from "@/lib/notifications/notification-service";
import { NotificationsClient } from "./notifications-client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications & Platform Action Center | Hack4Win",
  description:
    "Actionable notifications for Organizers, Judges, and Platform Administrators on Hack4Win Arena.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NotificationsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/notifications");
  }

  const { role } = session.user;
  const isPrivileged = role === "admin" || role === "organizer" || role === "judge";

  if (!isPrivileged) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl border bg-card shadow-lg space-y-5">
          <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Privileged Access Only</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-semibold text-foreground">{session.user.email}</span> with role{" "}
              <Badge variant="outline" className="capitalize">{session.user.role}</Badge>.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              The Platform Action Notifications Center is exclusively configured for Competition Organizers, Official Judges, and Administrators.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full">
              <Link href="/hackathons">Explore Hackathons</Link>
            </Button>
            <Button variant="outline" asChild size="lg" className="w-full">
              <Link href="/profile">View Your Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initialData = await notificationService.getNotificationsForUser(session.user);

  return <NotificationsClient initialData={initialData} currentUser={session.user} />;
}
