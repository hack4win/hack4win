import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Trophy } from "lucide-react";
import { OrganizerSidebar } from "@/components/organizer/organizer-sidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organizer Portal | Hack4Win Arena",
  description: "Create competitions, configure bounties, and manage judges for your hackathons",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // 1. Check Authentication
  if (!session) {
    redirect("/auth/signin?callbackUrl=/organizer");
  }

  // 2. Check Authorization (Organizer or Super Admin)
  const isAuthorized = session.user.role === "organizer" || session.user.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl border bg-card shadow-lg space-y-5">
          <div className="size-16 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Trophy className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Organizer Access Required</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-semibold text-foreground">{session.user.email}</span> with role{" "}
              <Badge variant="outline" className="capitalize">{session.user.role}</Badge>.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Organizer accounts are provisioned exclusively by platform administrators. If you wish to host an event, submit an inquiry or contact support.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full">
              <Link href="/host">Host an Event Inquiry</Link>
            </Button>
            <Button variant="outline" asChild size="lg" className="w-full">
              <Link href="/profile">View Your Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OrganizerSidebar user={session.user}>
      {children}
    </OrganizerSidebar>
  );
}
