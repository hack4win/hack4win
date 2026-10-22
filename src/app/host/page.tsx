import React from "react";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { HostOnboardingClient } from "./host-onboarding-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Host a Hackathon & Partner with Hack4Win | DevRel Platform",
  description:
    "Launch your branded hackathon, developer competition, or open-source grant on Hack4Win. Connect with 50k+ elite software engineers, streamline rubric-based judging, and accelerate ecosystem adoption.",
  keywords: [
    "host a hackathon",
    "organize hackathon",
    "developer competition platform",
    "devrel hackathon",
    "ai hackathon host",
    "web3 hackathon sponsor",
    "hack4win host",
  ],
  alternates: {
    canonical: "/host",
  },
  openGraph: {
    title: "Host a Hackathon & Partner with Hack4Win",
    description:
      "Launch your branded developer competition on Hack4Win. Connect with thousands of builders, streamline rubric-based judging, and accelerate API adoption.",
    url: "https://hack4win.online/host",
    siteName: "Hack4Win",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Host a Hackathon & Partner with Hack4Win",
    description:
      "Launch your branded developer competition on Hack4Win. Connect with thousands of builders, streamline rubric-based judging, and accelerate API adoption.",
  },
};

export default async function HostHackathonPage() {
  const session = await getServerSession();

  return <HostOnboardingClient currentUser={session?.user || null} />;
}
