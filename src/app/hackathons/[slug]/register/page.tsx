import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { getHackathonStatus } from "@/lib/db/types";
import { UpiPaymentForm } from "@/components/hackathon/upi-payment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Globe,
  Lock,
  MapPin,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    return { title: "Register for Hackathon | Hack4Win" };
  }

  return {
    title: `Register for ${hackathon.title} | Hack4Win`,
    description: `Complete your registration and payment for ${hackathon.title}`,
  };
}

export default async function HackathonRegisterPage({ params }: PageProps) {
  const { slug } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const hackathon = isUuid
    ? await hackathonRepository.findById(slug)
    : await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    notFound();
  }

  const session = await getServerSession();

  // If user is not logged in, prompt sign in with callback
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/hackathons/${hackathon.slug}/register`);
  }

  const dynamicStatus = getHackathonStatus(hackathon);
  const isClosed = dynamicStatus === "ended";

  const userReg = await hackathonRepository.getUserRegistration(hackathon.id, session.user.id);
  const isPaid = Boolean(hackathon.is_paid && Number(hackathon.registration_fee || 0) > 0);

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 -ml-2">
            <Link href={`/hackathons/${hackathon.slug}`}>
              <ArrowLeft className="size-4" />
              <span>Back to {hackathon.title}</span>
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            {hackathon.is_private && (
              <Badge variant="outline" className="text-purple-600 border-purple-500/30 gap-1 text-[0.7rem] font-bold">
                <Lock className="size-3" /> Private Campus
              </Badge>
            )}
            <Badge
              className={
                isPaid
                  ? "bg-emerald-600 text-white font-bold text-[0.7rem] gap-1"
                  : "bg-primary text-primary-foreground font-bold text-[0.7rem]"
              }
            >
              {isPaid ? (
                <>
                  <CreditCard className="size-3" /> Paid Entry ({hackathon.fee_currency || "₹"}{hackathon.registration_fee})
                </>
              ) : (
                "Free Entry"
              )}
            </Badge>
          </div>
        </div>

        {/* Mini Hackathon Header Banner */}
        <div className="relative rounded-3xl border bg-card/60 backdrop-blur-xs p-5 sm:p-6 overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {hackathon.thumbnail_url ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border bg-muted shrink-0 shadow-sm">
                <Image
                  src={hackathon.thumbnail_url}
                  alt={hackathon.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-sm">
                <Trophy className="size-8" />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                {hackathon.title}
              </h1>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {hackathon.tagline}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="size-3 text-primary" />
                  {new Date(hackathon.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(hackathon.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-primary" /> {hackathon.location || "Online"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3 text-primary" /> Max team: {hackathon.max_team_size}
                </span>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Trophy className="size-3 text-primary" /> Prize Pool: {hackathon.prize_pool}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isClosed ? (
          <div className="p-8 rounded-3xl border border-destructive/20 bg-destructive/5 text-center space-y-2">
            <h3 className="text-base font-bold text-destructive">Registration Closed</h3>
            <p className="text-xs text-muted-foreground">
              This hackathon has concluded. Registrations are no longer accepted.
            </p>
            <Button asChild variant="outline" size="sm" className="rounded-xl mt-3">
              <Link href={`/hackathons/${hackathon.slug}`}>View Challenge Overview</Link>
            </Button>
          </div>
        ) : isPaid ? (
          <UpiPaymentForm
            hackathon={hackathon}
            currentUser={session.user}
            existingRegistration={userReg}
          />
        ) : (
          /* Free Registration Prompt */
          <div className="p-8 rounded-3xl border bg-card/60 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Trophy className="size-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Free Registration</h2>
              <p className="text-xs text-muted-foreground mt-1">
                This competition is free to join. Complete your registration directly from the hackathon hub.
              </p>
            </div>
            <Button asChild className="rounded-xl font-bold">
              <Link href={`/hackathons/${hackathon.slug}`}>
                <span>Go to Registration Hub &rarr;</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
