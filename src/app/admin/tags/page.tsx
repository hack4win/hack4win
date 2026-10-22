import React from "react";
import { tagRepository } from "@/lib/db/tag-repository";
import { TagsClient } from "./tags-client";

import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tags Management | Admin Console",
  description: "Manage global tags and categories for Hack4Win hackathons",
};

export default async function AdminTagsPage() {
  const session = await getServerSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "organizer")) {
    redirect("/");
  }

  const tags = await tagRepository.listTags();

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Tags & Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define technological tracks, domains, and filter chips used across all hackathon challenges.
        </p>
      </div>

      <TagsClient initialTags={tags} />
    </main>
  );
}
