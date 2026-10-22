"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/db/types";
import { UserMenu } from "@/components/navigation/user-menu";
import { SiteFooter } from "@/components/navigation/site-footer";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Sparkles,
  Rocket,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  Send,
  Loader2,
  Gavel,
  Zap,
  DollarSign,
  Building2,
  Mail,
  Calendar,
  MessageSquare,
  Lock,
} from "lucide-react";

interface HostOnboardingClientProps {
  currentUser: SessionUser | null;
}

export function HostOnboardingClient({ currentUser }: HostOnboardingClientProps) {
  const { showAlert } = useModalAlert();

  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [timeline, setTimeline] = useState("Q1 2027");
  const [estimatedPrizePool, setEstimatedPrizePool] = useState("$25,000 - $50,000");
  const [selectedTracks, setSelectedTracks] = useState<string[]>(["AI & Autonomous Agents"]);
  const [eventGoals, setEventGoals] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const availableTrackOptions = [
    "AI & Autonomous Agents",
    "Next-Gen DevTools",
    "Spatial & Mobile Apps",
    "Web3 & Decentralized Protocols",
    "FinTech & Global Payments",
    "Open Source Tooling",
  ];

  const toggleTrack = (track: string) => {
    if (selectedTracks.includes(track)) {
      setSelectedTracks(selectedTracks.filter((t) => t !== track));
    } else {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      await showAlert({
        title: "Required Field",
        message: "Please enter your company or organization name.",
        type: "warning",
      });
      return;
    }

    if (!contactName.trim()) {
      await showAlert({
        title: "Required Field",
        message: "Please enter the organizer contact name.",
        type: "warning",
      });
      return;
    }

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      await showAlert({
        title: "Valid Email Required",
        message: "Please enter a valid work email address where our DevRel team can reach you.",
        type: "warning",
      });
      return;
    }

    if (!eventGoals.trim() || eventGoals.trim().length < 10) {
      await showAlert({
        title: "Event Description Required",
        message: "Please provide a brief overview of your hackathon goals (at least 10 characters).",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/host/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          timeline,
          estimatedPrizePool,
          tracks: selectedTracks,
          eventGoals: eventGoals.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }

      setSubmitted(true);
      await showAlert({
        title: "Inquiry Dispatched!",
        message: "Thank you for reaching out to Hack4Win! Our Hackathon Partnerships team will review your requirements and reach out within 24 hours.",
        type: "success",
      });
    } catch (err) {
      console.error("[Host Inquiry Error]:", err);
      await showAlert({
        title: "Submission Error",
        message: err instanceof Error ? err.message : "Unable to submit inquiry. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdminOrOrganizer =
    currentUser?.role === "admin" || currentUser?.role === "organizer";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xs">
            <Trophy className="size-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">
            Hack4Win<span className="text-muted-foreground text-sm font-normal">.online</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
            <Link href="/hackathons">Explore Challenges</Link>
          </Button>

          <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
            <Link href="/projects">Showcase</Link>
          </Button>

          <Button variant="secondary" asChild className="hidden sm:inline-flex rounded-full text-xs font-bold gap-1.5 shadow-2xs">
            <Link href="/host">
              <Sparkles className="size-3.5 text-primary" /> Host an Event
            </Link>
          </Button>

          {(currentUser?.role === "admin" || currentUser?.role === "judge") && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin/judging">Judging Portal</Link>
            </Button>
          )}

          {currentUser?.role === "admin" && (
            <Button variant="outline" asChild className="hidden sm:inline-flex rounded-full text-xs font-semibold">
              <Link href="/admin">Admin Console</Link>
            </Button>
          )}

          {currentUser ? (
            <UserMenu user={currentUser} />
          ) : (
            <>
              <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex rounded-full text-xs font-semibold">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full text-xs font-bold shadow-xs">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Headline Section */}
      <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background py-16 px-6 sm:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-5">
          <Badge
            variant="outline"
            className="rounded-full px-3.5 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
          >
            <Sparkles className="size-3.5" /> Turnkey Hackathon Hosting & DevRel Platform
          </Badge>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
            Host Your High-Impact Hackathon on Hack4Win
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Engage tens of thousands of top-tier engineers, founders, and creators. Spin up branded competitions, custom API grant bounties, and transparent judging leaderboards in minutes.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full font-bold text-sm h-12 px-7 gap-2 shadow-md cursor-pointer"
              onClick={() => {
                document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Send className="size-4" /> Start Organizer Inquiry
            </Button>

            {isAdminOrOrganizer ? (
              <Button size="lg" variant="outline" asChild className="rounded-full font-bold text-sm h-12 px-7 gap-2">
                <Link href="/admin/hackathons/new">
                  <Rocket className="size-4 text-primary" /> Launch Direct via Admin
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" asChild className="rounded-full font-bold text-sm h-12 px-7">
                <Link href="/hackathons">Browse Existing Events</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-12 space-y-16">
        {/* Capability Feature Highlights */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Why Companies & Foundations Partner with Hack4Win
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Built by developers for developers, with deep tooling to ensure maximum developer adoption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-3xl border bg-card space-y-3 shadow-xs">
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <h3 className="font-bold text-base">Global Elite Developer Reach</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with experienced builders, ML engineers, systems programmers, and designers looking to build software on your stack.
              </p>
            </Card>

            <Card className="p-6 rounded-3xl border bg-card space-y-3 shadow-xs">
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Gavel className="size-5" />
              </div>
              <h3 className="font-bold text-base">Fair & Blind Scoring Rubrics</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dedicated Judging Portals with conflict-of-interest prevention, weighted criteria, real-time leaderboards, and private reviewer notes.
              </p>
            </Card>

            <Card className="p-6 rounded-3xl border bg-card space-y-3 shadow-xs">
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Zap className="size-5" />
              </div>
              <h3 className="font-bold text-base">Turnkey Team & Submission Flow</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated team matchmaking, email invites, deadline enforcement, interactive video pitch carousels, and verified code repo inspection.
              </p>
            </Card>
          </div>
        </section>

        {/* Admin/Organizer Direct Shortcut Banner */}
        {isAdminOrOrganizer && (
          <div className="p-6 rounded-3xl border-2 border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                Organizer Privileges Detected
              </Badge>
              <h3 className="font-bold text-base">Skip the Inquiry Form</h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                As an authorized administrator or organizer on Hack4Win, you can immediately create, configure, and publish hackathons directly in the management console.
              </p>
            </div>
            <Button asChild className="rounded-full font-bold text-xs gap-1.5 shrink-0 shadow-sm">
              <Link href="/admin/hackathons/new">
                Create New Hackathon <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Organizer Inquiry & Onboarding Form */}
        <section id="inquiry-form" className="scroll-mt-24 max-w-3xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="px-3 py-0.5 text-xs font-semibold gap-1.5 rounded-full">
              <Building2 className="size-3 text-primary" /> Host Inquiry
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Tell Us About Your Competition
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              Fill out the details below and a dedicated Hack4Win Hackathon Director will reach out with a custom proposal, pricing tier, and launch timeline.
            </p>
          </div>

          <Card className="p-6 sm:p-8 rounded-3xl border bg-card shadow-sm">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-xl font-black">Inquiry Successfully Received!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-foreground">{contactName}</strong>. Our Partnerships team has received the specifications for <strong className="text-foreground">{organizationName}</strong> and will contact you at <strong className="text-foreground">{email}</strong> within 24 business hours.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setSubmitted(false)} className="rounded-full text-xs">
                    Submit Another Inquiry
                  </Button>
                  <Button asChild className="rounded-full text-xs font-bold">
                    <Link href="/hackathons">Explore Live Challenges</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company / Organization Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Building2 className="size-3.5 text-primary" /> Company / Organization Name *
                    </label>
                    <Input
                      placeholder="e.g. Acme AI, Solana Labs, DevRel Foundation"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="rounded-xl text-xs h-10 bg-background"
                      required
                    />
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Users className="size-3.5 text-primary" /> Contact Full Name *
                    </label>
                    <Input
                      placeholder="e.g. Sarah Connor"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="rounded-xl text-xs h-10 bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Mail className="size-3.5 text-primary" /> Business / Work Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. lead@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl text-xs h-10 bg-background"
                      required
                    />
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Calendar className="size-3.5 text-primary" /> Target Launch Timeline
                    </label>
                    <select
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className="w-full rounded-xl text-xs h-10 px-3 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Next 30 Days (Fast Track)">Next 30 Days (Fast Track)</option>
                      <option value="Q1 2027">Q1 2027</option>
                      <option value="Q2 2027">Q2 2027</option>
                      <option value="Q3/Q4 2027">Q3 / Q4 2027</option>
                      <option value="Flexible / Exploring">Flexible / Exploring</option>
                    </select>
                  </div>
                </div>

                {/* Estimated Prize Pool */}
                <div className="space-y-2">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <DollarSign className="size-3.5 text-primary" /> Estimated Prize Pool Target
                  </label>
                  <select
                    value={estimatedPrizePool}
                    onChange={(e) => setEstimatedPrizePool(e.target.value)}
                    className="w-full rounded-xl text-xs h-10 px-3 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="$10,000 - $25,000">$10,000 - $25,000 (Community Sprint)</option>
                    <option value="$25,000 - $50,000">$25,000 - $50,000 (Premier Hackathon)</option>
                    <option value="$50,000 - $100,000">$50,000 - $100,000 (Global Flagship Challenge)</option>
                    <option value="$100,000+">$100,000+ (Enterprise / Ecosystem Fund)</option>
                    <option value="Non-Cash (Hardware / Cloud Credits)">Non-Cash (Hardware, VR Kits, API Credits)</option>
                  </select>
                </div>

                {/* Tracks / Focus Areas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Focus Areas & Tracks (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTrackOptions.map((track) => {
                      const isSelected = selectedTracks.includes(track);
                      return (
                        <button
                          type="button"
                          key={track}
                          onClick={() => toggleTrack(track)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                              : "bg-background text-foreground hover:bg-muted/60 border-input"
                          }`}
                        >
                          {track}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Event Goals & Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <MessageSquare className="size-3.5 text-primary" /> Event Goals & Challenge Scope *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about the APIs, SDKs, or tools you want developers to build with, expected participant size, and any special requirements..."
                    value={eventGoals}
                    onChange={(e) => setEventGoals(e.target.value)}
                    className="w-full rounded-2xl text-xs p-3.5 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
                    required
                  />
                </div>

                {/* Submit CTA */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full rounded-full font-bold text-sm h-12 gap-2 shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Submitting Inquiry...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" /> Submit Organizer Inquiry
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Your information is securely encrypted and never shared with third parties.
                </p>
              </form>
            )}
          </Card>
        </section>
      </main>

      {/* Global Site Footer */}
      <SiteFooter />
    </div>
  );
}
