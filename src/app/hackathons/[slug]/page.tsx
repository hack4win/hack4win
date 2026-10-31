import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  Globe,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Radio,
  FileCode2,
  ShieldCheck,
  Video,
  Code2,
  Building,
  Gift,
  Smartphone,
  Gavel,
  Lock,
  CreditCard,
} from "lucide-react";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { getHackathonStatus } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { HackathonTimelineCountdown } from "@/components/hackathon/hackathon-timeline-countdown";
import { HackathonActionCard } from "@/components/hackathon/hackathon-action-card";
import { HackathonTabs } from "@/components/hackathon/hackathon-tabs";

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hackathon = await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    return {
      title: "Hackathon Not Found | Hack4Win",
    };
  }

  const session = await getServerSession();
  if (hackathon.status === "draft" && session?.user?.role !== "admin") {
    return {
      title: "Hackathon Not Found | Hack4Win",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";
  const canonicalUrl = `${baseUrl}/hackathons/${hackathon.slug}`;

  return {
    title: `${hackathon.title} - Hackathon Challenge & Bounties`,
    description: hackathon.tagline || hackathon.description.slice(0, 160),
    keywords: [
      hackathon.title,
      "hackathon",
      hackathon.format,
      ...(hackathon.tags || []),
      "hack4win challenge",
    ],
    alternates: {
      canonical: `/hackathons/${hackathon.slug}`,
    },
    openGraph: {
      title: `${hackathon.title} | Hack4Win Hackathon`,
      description: hackathon.tagline || hackathon.description.slice(0, 160),
      url: canonicalUrl,
      siteName: "Hack4Win",
      images: hackathon.banner_url ? [{ url: hackathon.banner_url, alt: hackathon.title }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${hackathon.title} | Hack4Win Hackathon`,
      description: hackathon.tagline,
      images: hackathon.banner_url ? [hackathon.banner_url] : [],
    },
  };
}

export default async function HackathonDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hackathon = await hackathonRepository.findBySlug(slug);

  if (!hackathon) {
    notFound();
  }

  const session = await getServerSession();

  if (hackathon.status === "draft" && session?.user?.role !== "admin") {
    notFound();
  }

  const currentStatus = getHackathonStatus(hackathon);
  const now = new Date();
  const isDeadlinePassed = Boolean(
    hackathon.submission_deadline && new Date(hackathon.submission_deadline) < now
  );
  const isSubmissionsClosed =
    currentStatus === "ended" ||
    hackathon.status === "ended" ||
    isDeadlinePassed;

  // Check if current user is registered and fetch participant count, participants, and submissions
  const [userRegistration, participantCount, participants, submissions] = await Promise.all([
    session ? hackathonRepository.getUserRegistration(hackathon.id, session.user.id) : Promise.resolve(null),
    hackathonRepository.getParticipantCount(hackathon.id),
    hackathonRepository.getParticipants(hackathon.id),
    hackathonRepository.getSubmissions(hackathon.id),
  ]);

  const isRegistered = !!userRegistration?.registered;
  const participationType = (userRegistration?.participation_type as "solo" | "looking_for_team") || "looking_for_team";
  const registrationStatus = (userRegistration?.status || "approved") as "approved" | "pending" | "rejected";
  const isPaid = Boolean(hackathon.is_paid && Number(hackathon.registration_fee || 0) > 0);
  const paymentStatus = userRegistration?.payment_status || null;
  const paymentReference = userRegistration?.payment_reference || null;

  // Calculate duration in days
  const startMs = new Date(hackathon.start_date).getTime();
  const endMs = new Date(hackathon.end_date).getTime();
  const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const cleanPrizePool = (hackathon.prize_pool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": hackathon.title,
    "description": hackathon.tagline || hackathon.description.slice(0, 250),
    "startDate": hackathon.start_date,
    "endDate": hackathon.end_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode":
      hackathon.format.toLowerCase() === "in-person"
        ? "https://schema.org/OfflineEventAttendanceMode"
        : hackathon.format.toLowerCase() === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OnlineEventAttendanceMode",
    "location":
      hackathon.format.toLowerCase() === "in-person" && hackathon.location
        ? {
            "@type": "Place",
            "name": hackathon.location,
            "address": hackathon.location,
          }
        : {
            "@type": "VirtualLocation",
            "url": `${baseUrl}/hackathons/${hackathon.slug}`,
          },
    "image": hackathon.banner_url ? [hackathon.banner_url] : [],
    "organizer": {
      "@type": "Organization",
      "name": hackathon.organizer_name || "Hack4Win",
      "url": baseUrl,
    },
    "offers": {
      "@type": "Offer",
      "name": "Hackathon Registration",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": `${baseUrl}/hackathons/${hackathon.slug}`,
      "validFrom": hackathon.start_date,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Schema.org Event JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(eventJsonLd) }}
      />

      {/* Platform Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/hackathons"
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <BrandLogo size="md" />
          </Link>

          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex rounded-full">
            <Link href="/hackathons" className="gap-1.5 text-xs text-muted-foreground">
              <ArrowLeft className="size-3.5" /> All Hackathons
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {(session?.user.role === "admin" || session?.user.role === "judge") && (
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin/judging" className="gap-1.5">
                <Gavel className="size-3.5 text-amber-500" /> Judging Portal
              </Link>
            </Button>
          )}

          {session?.user.role === "admin" && (
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex rounded-full text-xs">
              <Link href="/admin/hackathons">Admin Console</Link>
            </Button>
          )}

          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <>
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex rounded-full text-xs">
                <Link href={`/auth/signin?callbackUrl=/hackathons/${hackathon.slug}`}>Sign In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full text-xs">
                <Link href={`/auth/signin?callbackUrl=/hackathons/${hackathon.slug}`}>Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Hackathon Detail Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Hero Banner Card */}
        <div className="rounded-3xl border bg-card shadow-xs relative overflow-hidden">
          <div className="h-44 sm:h-48 md:h-52 w-full bg-muted relative rounded-t-3xl overflow-hidden">
            {hackathon.banner_url ? (
              <img
                src={hackathon.banner_url}
                alt={hackathon.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                <Trophy className="size-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/65 to-transparent" />
          </div>

          {/* 2-Column Responsive Layout: Left Details & Right Action Card */}
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 -mt-16 sm:-mt-24 relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-8">
            {/* Left Content Area (Pills, Title, Tagline, Host) */}
            <div className="flex-1 space-y-3.5 min-w-0 pt-2 sm:pt-4">
              {/* Status & Format Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {currentStatus === "ongoing" ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1.5 rounded-full px-3 py-1">
                    <Radio className="size-3.5 animate-pulse" /> Live Competition
                  </Badge>
                ) : currentStatus === "upcoming" ? (
                  <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-semibold gap-1.5 rounded-full px-3 py-1">
                    <Clock className="size-3.5" /> Upcoming
                  </Badge>
                ) : currentStatus === "ended" ? (
                  <Badge variant="outline" className="text-muted-foreground text-xs font-medium rounded-full px-3 py-1">
                    Ended
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-xs font-medium rounded-full px-3 py-1">
                    Draft
                  </Badge>
                )}

                {hackathon.is_private && (
                  <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-semibold gap-1.5 rounded-full px-3 py-1">
                    <Lock className="size-3.5" /> Private Campus Event
                  </Badge>
                )}

                {isPaid && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1.5 rounded-full px-3 py-1">
                    <CreditCard className="size-3.5" /> Entry: {hackathon.fee_currency || "₹"}{hackathon.registration_fee}
                  </Badge>
                )}

                <Badge variant="outline" className="capitalize text-xs rounded-full px-3 py-1">
                  {hackathon.format}
                </Badge>

                <Badge variant="outline" className="text-xs rounded-full px-3 py-1">
                  {hackathon.location}
                </Badge>
              </div>

              {/* Title & Host Info */}
              <div className="space-y-2 min-w-0 pt-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground break-words">
                  {hackathon.title}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                  {hackathon.tagline}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Building className="size-3.5 text-primary shrink-0" />
                    <span>Hosted by <strong className="text-foreground">{hackathon.organizer_name}</strong></span>
                  </span>
                  {getSafeExternalUrl(hackathon.website_url) && (
                    <>
                      <span>&middot;</span>
                      <a
                        href={getSafeExternalUrl(hackathon.website_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                      >
                        Official Website <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Registration & Share Action Card */}
            <div className="w-full lg:w-[340px] shrink-0">
              <HackathonActionCard
                hackathonId={hackathon.id}
                slug={hackathon.slug}
                title={hackathon.title}
                prizePool={cleanPrizePool}
                maxTeamSize={hackathon.max_team_size}
                initialIsRegistered={isRegistered}
                initialParticipationType={participationType}
                initialParticipantCount={participantCount}
                isLoggedIn={!!session}
                status={currentStatus}
                isSubmissionsClosed={isSubmissionsClosed}
                maxParticipants={hackathon.max_participants}
                isPrivate={Boolean(hackathon.is_private)}
                allowedEmailDomains={hackathon.allowed_email_domains || []}
                hasAccessCode={Boolean(hackathon.access_code)}
                initialRegistrationStatus={registrationStatus}
                isPaid={isPaid}
                registrationFee={hackathon.registration_fee}
                feeCurrency={hackathon.fee_currency || "₹"}
                initialPaymentStatus={paymentStatus}
                initialPaymentReference={paymentReference}
              />
            </div>
          </div>
        </div>

        {/* Quick Highlights Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl border bg-card shadow-2xs flex flex-col justify-center min-w-0 overflow-hidden">
            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Award className="size-3.5 text-primary shrink-0" /> Total Prizes
            </span>
            <span className="text-base sm:text-xl font-black text-primary mt-1 tracking-tight break-words line-clamp-2" title={cleanPrizePool}>
              {cleanPrizePool}
            </span>
          </div>

          <div className="p-4 rounded-2xl border bg-card shadow-2xs flex flex-col justify-center min-w-0">
            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3.5 text-primary shrink-0" /> Duration
            </span>
            <span className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">
              {durationDays} Days
            </span>
          </div>

          <div className="p-4 rounded-2xl border bg-card shadow-2xs flex flex-col justify-center min-w-0">
            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="size-3.5 text-primary shrink-0" /> Team Size
            </span>
            <span className="text-base sm:text-xl font-bold text-foreground mt-1 truncate">
              1 - {hackathon.max_team_size} Participants
            </span>
          </div>

          <div className="p-4 rounded-2xl border bg-card shadow-2xs flex flex-col justify-center min-w-0">
            <span className="text-[0.68rem] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3.5 text-primary shrink-0" /> Format
            </span>
            <span className="text-base sm:text-xl font-bold capitalize text-foreground mt-1 truncate">
              {hackathon.format}
            </span>
          </div>
        </div>

        {/* Content Columns: Left (Devpost Tabs) vs Right (Countdown & Timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Devpost Tabs (About, Projects, Participants) */}
          <div className="lg:col-span-2 space-y-8">
            <HackathonTabs
              hackathon={hackathon}
              initialParticipants={participants}
              initialSubmissions={submissions}
              currentUser={session?.user || null}
              isRegistered={isRegistered}
              initialTab={resolvedSearchParams?.tab as "about" | "projects" | "participants" | undefined}
            />
          </div>

          {/* Right Column: Countdown, Timeline, Rules & Organizer */}
          <div className="space-y-6 min-w-0">
            {/* Live Countdown & Milestones Stepper */}
            <HackathonTimelineCountdown
              title={hackathon.title}
              startDate={hackathon.start_date}
              submissionDeadline={hackathon.submission_deadline}
              endDate={hackathon.end_date}
            />

            {/* Rules & Eligibility */}
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary shrink-0" /> Rules & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs text-muted-foreground">
                {((Array.isArray(hackathon.rules) && hackathon.rules.length > 0)
                  ? hackathon.rules
                  : [
                      `Maximum ${hackathon.max_team_size || 4} members per team (solo builders welcome).`,
                      "All code must be written within the official competition window.",
                      "Use of open-source libraries and public AI models/APIs is fully allowed.",
                      "Follow fair play and platform community code of conduct.",
                    ]
                ).map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Organizer Card */}
            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building className="size-4 text-primary shrink-0" /> Organizer & Host
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    {hackathon.organizer_name[0]?.toUpperCase() || "H"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-foreground truncate">{hackathon.organizer_name}</h4>
                    <p className="text-xs text-muted-foreground">Verified Challenge Organizer</p>
                  </div>
                </div>

                {getSafeExternalUrl(hackathon.website_url) && (
                  <Button variant="outline" asChild size="sm" className="w-full rounded-full text-xs mt-2">
                    <a href={getSafeExternalUrl(hackathon.website_url)} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                      <span>Visit Organizer Site</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 <span className="font-semibold text-foreground">hack4win.online</span>. All rights reserved.
      </footer>
    </div>
  );
}
