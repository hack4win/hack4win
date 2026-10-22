import React from "react";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { UsersClient } from "./users-client";

import { redirect } from "next/navigation";

/**
 * Admin Users Management Page (Server Component)
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users Management | Admin Console",
  description: "View and manage user roles on Hack4Win platform",
};

export default async function AdminUsersPage() {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const [users, total] = await Promise.all([
    userRepository.listUsers({ limit: 50 }),
    userRepository.countUsers(),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Users & Access Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search platform accounts, audit verified status, and promote or demote user roles.
        </p>
      </div>

      <UsersClient initialUsers={users} initialTotal={total} currentUser={session?.user || null} />
    </main>
  );
}
