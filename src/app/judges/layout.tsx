import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel } from "lucide-react";
import { JudgesSidebar } from "@/components/judges/judges-sidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Judges Portal | Hack4Win Arena",
  description: "Evaluate hackathon project submissions, fill rubric scorecards, and score innovations",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function JudgesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // 1. Check Authentication
  if (!session) {
    redirect("/auth/signin?callbackUrl=/judges");
  }

  // 2. Check Authorization (Judge or Super Admin)
  const isAuthorized = session.user.role === "judge" || session.user.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl border bg-card shadow-lg space-y-5">
          <div className="size-16 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Gavel className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Judge Access Required</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-semibold text-foreground">{session.user.email}</span> with role{" "}
              <Badge variant="outline" className="capitalize">{session.user.role}</Badge>.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Judging credentials are issued exclusively by competition organizers or platform administrators.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full">
              <Link href="/profile">View Your Profile</Link>
            </Button>
            <Button variant="outline" asChild size="lg" className="w-full">
              <Link href="/">Back to Homepage</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <JudgesSidebar user={session.user}>
      {children}
    </JudgesSidebar>
  );
}
