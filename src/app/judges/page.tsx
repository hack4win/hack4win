import React from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Gavel,
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Award,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Judges Command Center | Hack4Win Arena",
  description: "View assigned competitions, review submitted code, and submit rubric evaluations",
};

export default async function JudgesDashboardPage() {
  const session = await getServerSession();
  const isSuperAdmin = session?.user.role === "admin";

  const assignedHackathons = await hackathonRepository.getHackathonsForJudge(
    session?.user.id || "",
    isSuperAdmin
  );

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              Evaluation Portal
            </Badge>
            <span className="text-xs text-muted-foreground">Technical Review Workspace</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">
            Welcome, {session?.user.name || "Judge"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review submitted hacks, inspect repository architectures, and grade projects across official rubrics.
          </p>
        </div>

        <Button asChild className="gap-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
          <Link href="/judges/evaluations">
            <Gavel className="size-4" />
            Open Evaluation Queue
          </Link>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-2xs bg-card/60 rounded-2xl">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Assigned Hackathons</span>
              <Trophy className="size-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {assignedHackathons.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 text-[0.75rem] text-muted-foreground">
            Competitions under your technical evaluation purview
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-card/60 rounded-2xl">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Rubric Dimensions</span>
              <Sparkles className="size-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black">4 Standards</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 text-[0.75rem] text-muted-foreground">
            Innovation, Technical Craft, Design/UX, and Utility
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-card/60 rounded-2xl">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Scoring Status</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              Active Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 text-[0.75rem] text-muted-foreground">
            Ready for your scores and builder feedback
          </CardContent>
        </Card>
      </div>

      {/* Assigned Hackathons Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Trophy className="size-4.5 text-purple-600" />
            <span>Assigned Competitions</span>
          </h2>
        </div>

        {assignedHackathons.length === 0 ? (
          <Card className="border border-dashed p-10 text-center space-y-4">
            <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
              <Gavel className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">No Active Competitions Assigned Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Competition organizers will appoint you by email when submission reviews begin.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedHackathons.map((h) => (
              <Card key={h.id} className="border shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[0.65rem] capitalize py-0 px-2 border-purple-500/30 text-purple-600">
                      {h.status}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Prize: <strong className="text-foreground">{h.prize_pool || "Non-cash"}</strong>
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">{h.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {h.tagline || h.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 border-t bg-muted/10 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {h.participant_count || 0} participants
                  </span>

                  <Button asChild size="sm" className="gap-1.5 rounded-lg text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    <Link href={`/judges/evaluations?hackathonId=${h.id}`}>
                      <span>Score Projects</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
