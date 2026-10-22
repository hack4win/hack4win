import React from "react";
import EditHackathonPage from "@/app/admin/hackathons/[id]/edit/page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit Challenge | Organizer Portal",
  description: "Modify competition details, prizes, timeline, and rules",
};

export default async function OrganizerHackathonEditPage(props: PageProps) {
  return <EditHackathonPage {...props} />;
}
