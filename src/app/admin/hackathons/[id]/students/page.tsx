import React from "react";
import OrganizerStudentsPage from "@/app/organizer/hackathons/[id]/students/page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Roster & Invites | Admin Console",
  description: "Track registered students, whitelist college emails, manage passcode access, and export roster CSV",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminHackathonStudentsPage(props: PageProps) {
  return <OrganizerStudentsPage {...props} />;
}
