import AdminHackathonsNewPage from "@/app/admin/hackathons/new/page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Challenge | Organizer Portal",
  description: "Launch a new hackathon challenge with bounties, timeline, and custom rubrics",
};

export default function OrganizerHackathonsNewPage() {
  return <AdminHackathonsNewPage />;
}
