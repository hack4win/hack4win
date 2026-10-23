import React from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { OrganizerStudentsClient } from "./students-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Roster & Invites | Organizer Portal",
  description: "Track registered students, whitelist college emails, manage passcode access, and export roster CSV",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerStudentsPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/auth/signin?callbackUrl=/organizer");
  }

  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const hackathon = isUuid
    ? await hackathonRepository.findById(id)
    : await hackathonRepository.findBySlug(id);

  if (!hackathon) {
    notFound();
  }

  // Verify ownership (unless Super Admin)
  if (
    session.user.role !== "admin" &&
    (!hackathon.organizer_id || hackathon.organizer_id !== session.user.id)
  ) {
    redirect("/organizer");
  }

  const students = await hackathonRepository.getRegisteredStudents(hackathon.id);

  return (
    <OrganizerStudentsClient
      hackathon={hackathon}
      initialStudents={students}
      currentUser={session.user}
    />
  );
}
