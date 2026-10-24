import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Sparkles,
  Rocket,
  ArrowRight,
  Search,
  Calendar,
  Users,
  Award,
  Zap,
  CheckCircle2,
  Bot,
  Smartphone,
  Cpu,
  Globe,
} from "lucide-react";

import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { safeJsonLdReplacer } from "@/lib/json-ld";
import { BRAND_LOGO } from "@/lib/constants/branding";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { FeaturedHackathonCard } from "@/components/home/featured-hackathon-card";
import { FeaturedProjectsShowcase } from "@/components/home/featured-projects-showcase";
import { PlatformStatsTicker } from "@/components/home/platform-stats-ticker";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { FeaturesBentoGrid } from "@/components/home/features-bento-grid";
import { TracksEcosystemSection } from "@/components/home/tracks-ecosystem-section";
import { CommunityTestimonials } from "@/components/home/community-testimonials";
import { FAQAccordion } from "@/components/home/faq-accordion";
import { SiteFooter } from "@/components/navigation/site-footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();
  const isAdmin = session?.user.role === "admin";
  const userId = session?.user.id;

  const [liveHackathons, featuredProjects, platformStats, submissionStats, registeredIds] =
    await Promise.all([
      hackathonRepository.listHackathons({ limit: 20, includeDrafts: isAdmin }),
      hackathonRepository.getFeaturedSubmissions(6),
      hackathonRepository.getStats({ includeDrafts: false }),
      hackathonRepository.getSubmissionStats(),
      userId ? hackathonRepository.getUserRegisteredHackathonIds(userId) : Promise.resolve(new Set<string>()),
    ]);

  const publishedHackathons = liveHackathons
    .filter((h) => {
      if (h.status === "draft" && !isAdmin) return false;
      if (h.is_private) {
        if (isAdmin) return true;
        if (userId && (h.organizer_id === userId || registeredIds.has(h.id))) return true;
        return false;
      }
      return true;
    })
    .slice(0, 6);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "Hack4Win",
        "description": "Global Hackathon Platform - Build, Showcase & Win",
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${baseUrl}/hackathons?search={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        ],
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "Hack4Win",
        "url": baseUrl,
        "logo": BRAND_LOGO.s3UrlPng,
        "description": "The Premier Global Hackathon Arena & Software Showcase",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Schema.org JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      {/* Top Navigation Bar */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link
          href="/"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <BrandLogo size="md" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
            <Link href="/hackathons">Explore Challenges</Link>
          </Button>

          <Button variant="ghost" asChild className="hidden md:inline-flex rounded-full text-xs font-semibold">
            <Link href="/projects">Showcase</Link>
          </Button>

          {(session?.user.role === "admin" || session?.user.role === "judge") && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin/judging">Judging Portal</Link>
            </Button>
          )}

          {session?.user.role === "admin" && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin">Admin Console</Link>
            </Button>
          )}

          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <>
              <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full text-xs font-bold shadow-xs">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 text-center max-w-6xl mx-auto w-full space-y-16">
        {/* HERO SECTION */}
        <div className="flex flex-col items-center max-w-4xl mx-auto w-full">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1.5 text-xs font-semibold gap-2 rounded-full border bg-muted/60 shadow-xs"
          >
            <Sparkles className="size-3.5 text-primary" />
            Hack4Win 2026 Hackathon Arena • Over $350,000 in Prizes
          </Badge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-4xl leading-[1.1] text-foreground">
            Build, Showcase & Compete in{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-amber-500 bg-clip-text text-transparent">
              World-Class Hackathons
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            The all-in-one competitive platform for participants, organizers, and tech sponsors. Discover global challenges, assemble multidisciplinary squads with 2-way invites, and get scored on a transparent 50-point rubric.
          </p>

          {/* Quick Search Bar & Popular Tags (Temporarily Hidden) */}
          {/*
          <div className="mt-10 w-full max-w-xl flex items-center gap-2 p-2 rounded-full border bg-card/80 backdrop-blur-sm shadow-md">
            <div className="pl-3.5 text-muted-foreground">
              <Search className="size-5" />
            </div>
            <Input
              placeholder="Search AI Agents, Spatial Mobile, Web3..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm sm:text-base h-11 px-2 bg-transparent"
            />
            <Button asChild size="default" className="gap-2 shrink-0 rounded-full font-bold text-xs h-10 px-5 shadow-sm">
              <Link href="/hackathons">Search Arena</Link>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="text-[11px] font-semibold text-muted-foreground/80">Popular:</span>
            <Link
              href="/hackathons?track=ai"
              className="px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-foreground/80 font-medium transition-colors"
            >
              🤖 AI & Autonomous Agents
            </Link>
            <Link
              href="/hackathons?track=mobile"
              className="px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-foreground/80 font-medium transition-colors"
            >
              📱 Spatial & Mobile
            </Link>
            <Link
              href="/hackathons?track=devtools"
              className="px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-foreground/80 font-medium transition-colors"
            >
              ⚡ Next-Gen DevTools
            </Link>
            <Link
              href="/hackathons?track=web3"
              className="px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-foreground/80 font-medium transition-colors"
            >
              🌐 Web3
            </Link>
          </div>
          */}

          {/* Hero Action CTA Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Button size="lg" asChild className="gap-2.5 shadow-md rounded-full font-bold text-sm h-12 px-6">
              <Link href="/hackathons">
                <Rocket className="size-4.5" />
                Browse Active Hackathons
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full font-bold text-sm h-12 px-6">
              <Link href={session?.user.role === "admin" ? "/admin/hackathons/new" : "/host"}>
                Host a Hackathon
              </Link>
            </Button>
          </div>
        </div>

        {/* 1. PLATFORM STATS & SOCIAL PROOF TICKER (Temporarily Hidden) */}
        {/* 
        <PlatformStatsTicker
          hackathonCount={platformStats.total}
          totalSubmissions={submissionStats.total}
        />
        */}

        {/* 2. FEATURED COMPETITIONS CARDS */}
        <section className="w-full text-left space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
                >
                  <Trophy className="size-3.5" /> Spotlight Challenges
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                Featured Competitions
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                High-stakes global hackathons actively accepting team registrations and submissions.
              </p>
            </div>
            <Button variant="ghost" asChild size="sm" className="rounded-full gap-1 text-xs font-semibold">
              <Link href="/hackathons">
                View all challenges <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publishedHackathons.length > 0 ? (
              publishedHackathons.slice(0, 3).map((h) => (
                <FeaturedHackathonCard key={h.id} hackathon={h} />
              ))
            ) : (
              <div className="col-span-3 p-12 text-center border rounded-2xl bg-card">
                <Trophy className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Competitions are loading...</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. HOW IT WORKS 4-STEP PATHWAY */}
        <HowItWorksSection />

        {/* 4. PLATFORM SUPERPOWERS BENTO GRID */}
        <FeaturesBentoGrid />

        {/* 5. CURATED TRACKS & TECHNOLOGY ECOSYSTEM (Temporarily Hidden) */}
        {/* <TracksEcosystemSection /> */}

        {/* 6. FEATURED PROJECTS SHOWCASE */}
        <FeaturedProjectsShowcase projects={featuredProjects} />

        {/* 7. BUILDER TESTIMONIALS / COMMUNITY VOICES (Temporarily Hidden) */}
        {/* <CommunityTestimonials /> */}

        {/* 8. INTERACTIVE FAQ ACCORDION */}
        <FAQAccordion />

        {/* 9. BOTTOM CALL TO ACTION BANNER */}
        <section className="w-full p-8 sm:p-14 rounded-3xl border bg-gradient-to-br from-card via-card to-primary/10 text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 size-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative space-y-5 max-w-2xl mx-auto">
            <Badge
              variant="outline"
              className="rounded-full px-3.5 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
            >
              <Rocket className="size-3.5" /> Ready to Launch Your Idea?
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight">
              Form Your Squad & Ship Software That Matters
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Join thousands of developers, ML researchers, and product designers. Submit working builds, gain verified badges, and unlock cash bounties.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild className="rounded-full gap-2 shadow-sm font-bold text-sm h-12 px-7">
                <Link href="/hackathons">
                  <Trophy className="size-4" /> Browse Active Challenges
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full font-bold text-sm h-12 px-7">
                <Link href={session?.user.role === "admin" ? "/admin/hackathons/new" : "/host"}>
                  Host a Hackathon
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 10. SITE FOOTER */}
      <SiteFooter />
    </div>
  );
}
