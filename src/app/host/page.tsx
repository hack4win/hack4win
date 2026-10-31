import React from "react";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/seo/config";
import { HostOnboardingClient } from "./host-onboarding-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Host a Hackathon & Partner with Hack4Win | DevRel Platform",
  description:
    "Launch your branded hackathon, developer competition, or open-source grant on Hack4Win. Connect with 50k+ elite software engineers, streamline rubric-based judging, and accelerate ecosystem adoption on hack4win.online.",
  keywords: [
    "host a hackathon",
    "organize hackathon",
    "developer competition platform",
    "devrel hackathon",
    "ai hackathon host",
    "web3 hackathon sponsor",
    "hack4win host",
    "hack4win online",
  ],
  alternates: {
    canonical: `${SITE_URL}/host`,
  },
  openGraph: {
    title: "Host a Hackathon & Partner with Hack4Win",
    description:
      "Launch your branded developer competition on Hack4Win. Connect with thousands of builders, streamline rubric-based judging, and accelerate API adoption on hack4win.online.",
    url: `${SITE_URL}/host`,
    siteName: "Hack4Win",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Host a Hackathon & Partner with Hack4Win",
    description:
      "Launch your branded developer competition on Hack4Win. Connect with thousands of builders, streamline rubric-based judging, and accelerate API adoption on hack4win.online.",
  },
};

export default async function HostHackathonPage() {
  const session = await getServerSession();
  const baseUrl = SITE_URL;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${baseUrl}/host#service`,
        "name": "Hackathon Hosting & Ecosystem DevRel Platform",
        "description": "Custom branded hackathon competitions, transparent rubric judging, and global developer recruitment on Hack4Win.",
        "provider": {
          "@type": "Organization",
          "name": "Hack4Win",
          "url": baseUrl,
        },
        "url": `${baseUrl}/host`,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/host#breadcrumbs`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Host a Hackathon",
            "item": `${baseUrl}/host`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />
      <HostOnboardingClient currentUser={session?.user || null} />
    </>
  );
}
