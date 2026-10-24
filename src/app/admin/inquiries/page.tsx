import React from "react";
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { inquiryRepository } from "@/lib/db/inquiry-repository";
import { InquiriesClient } from "./inquiries-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Host Inquiries | Admin Console",
  description: "Review, manage, and follow up with organizer and corporate hackathon hosting inquiries",
};

export default async function AdminInquiriesPage() {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const [inquiries, stats] = await Promise.all([
    inquiryRepository.listInquiries({ limit: 100 }),
    inquiryRepository.getStats(),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
      <InquiriesClient initialInquiries={inquiries} initialStats={stats} />
    </main>
  );
}
