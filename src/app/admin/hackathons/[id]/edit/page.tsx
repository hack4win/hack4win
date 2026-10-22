import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { EditHackathonClient } from "./edit-hackathon-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Hackathon | Admin Console",
  description: "Modify hackathon competition details, prizes, timeline, and media",
};

export default async function EditHackathonPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "organizer")) {
    redirect("/admin");
  }

  const { id } = await params;
  const hackathon = await hackathonRepository.findById(id);

  if (!hackathon) {
    notFound();
  }

  return <EditHackathonClient hackathon={hackathon} />;
}
