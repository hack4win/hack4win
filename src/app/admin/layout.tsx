import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  ShieldAlert,
  Users,
  LayoutDashboard,
  Settings,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * Admin Layout (Server Component)
 * 
 * Enforces role-based access control (RBAC).
 * Only users with role === 'admin' can access any child routes under /admin.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Console | Hack4Win",
  description: "Platform management console for Hack4Win hackathons",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // 1. Check Authentication
  if (!session) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // 2. Check Authorization (Admin, Judge, Organizer Roles)
  const isAuthorized =
    session.user.role === "admin" ||
    session.user.role === "judge" ||
    session.user.role === "organizer";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl border bg-card shadow-lg space-y-5">
          <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-semibold text-foreground">{session.user.email}</span> with role{" "}
              <Badge variant="outline" className="capitalize">{session.user.role}</Badge>.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Administrator, Organizer, or Judge privileges are required to access this portal.
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
    <AdminSidebar user={session.user}>
      {children}
    </AdminSidebar>
  );
}
