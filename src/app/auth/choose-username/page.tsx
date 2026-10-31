import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/user-repository";
import { ChooseUsernameClient } from "./choose-username-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose Your Username | Hack4Win",
  description: "Complete your Hack4Win platform registration by choosing a unique username.",
};

interface PageProps {
  searchParams?: Promise<{ callbackUrl?: string }>;
}

export default async function ChooseUsernamePage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/auth/choose-username");
  }

  const user = await userRepository.findById(session.user.id);
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawCallbackUrl = resolvedParams?.callbackUrl;
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl !== "/profile"
      ? rawCallbackUrl
      : "/hackathons";

  // If user already completed their username onboarding, redirect them directly
  if (user?.username) {
    redirect(callbackUrl);
  }

  return (
    <ChooseUsernameClient
      user={user || {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        email_verified: session.user.emailVerified,
        image: session.user.image,
        role: session.user.role,
        bio: null,
        github_username: null,
        skills: [],
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }}
      callbackUrl={callbackUrl}
    />
  );
}
