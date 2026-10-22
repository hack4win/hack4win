import React from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Trophy,
  Plus,
  Users,
  Gavel,
  Rocket,
  Calendar,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organizer Command Center | Hack4Win Arena",
  description: "Monitor live competitions, participants, submissions, and judge assignments",
};

export default async function OrganizerDashboardPage() {
  const session = await getServerSession();
  const isSuperAdmin = session?.user.role === "admin";

  const allHackathons = await hackathonRepository.listHackathons({ includeDrafts: true });
  const myHackathons = isSuperAdmin
    ? allHackathons
    : allHackathons.filter((h) => h.organizer_id === session?.user.id);

  const judges = await hackathonRepository.getJudgesForOrganizer(session?.user.id || "", isSuperAdmin);

  const activeHackathons = myHackathons.filter(
    (h) => h.status === "published" || h.status === "ongoing" || (h.status as string) === "active"
  );
  const draftHackathons = myHackathons.filter((h) => h.status === "draft");

  // Sum total participants across my hackathons
  const totalParticipants = myHackathons.reduce((acc, h) => acc + (h.participant_count || 0), 0);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              Host Portal
            </Badge>
            <span className="text-xs text-muted-foreground">Organizer Workspace</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">
            Welcome, {session?.user.name || "Organizer"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your sponsored challenges, curate judging panels, and oversee project evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="gap-2 rounded-xl text-xs font-bold">
            <Link href="/organizer/judges">
              <Gavel className="size-4 text-blue-600" />
              Manage Judges
            </Link>
          </Button>

          <Button asChild className="gap-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
            <Link href="/organizer/hackathons/new">
              <Plus className="size-4" />
              Create Challenge
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-2xs bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>My Competitions</span>
              <Trophy className="size-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black">{myHackathons.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[0.75rem] text-muted-foreground">
            {activeHackathons.length} live active, {draftHackathons.length} drafts
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Total Builders</span>
              <Users className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {totalParticipants}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[0.75rem] text-muted-foreground">
            Registered participants across your challenges
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Judges Appointed</span>
              <Gavel className="size-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {judges.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[0.75rem] text-muted-foreground">
            Assigned to review & score submissions
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold flex items-center justify-between">
              <span>Submissions Evaluated</span>
              <CheckCircle2 className="size-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {judges.reduce((sum, j) => sum + (j.evaluation_count || 0), 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[0.75rem] text-muted-foreground">
            Completed project scorecards
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section: Competitions & Judges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Hackathons (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Trophy className="size-4.5 text-blue-600" />
              <span>Competitions Overview</span>
            </h2>
            <Button variant="ghost" asChild size="sm" className="text-xs gap-1">
              <Link href="/organizer/hackathons">
                <span>View All</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {myHackathons.length === 0 ? (
            <Card className="border border-dashed p-8 text-center space-y-4">
              <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                <Trophy className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">No Hackathons Created Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Launch your first developer competition, configure bounties, and invite builders worldwide.
                </p>
              </div>
              <Button asChild className="gap-2 rounded-xl text-xs font-bold bg-blue-600 text-white">
                <Link href="/organizer/hackathons/new">
                  <Plus className="size-4" /> Create Your First Challenge
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {myHackathons.slice(0, 5).map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-2xl border bg-card/60 hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm truncate">{h.title}</h3>
                      <Badge
                        variant={h.status === "published" || h.status === "ongoing" || (h.status as string) === "active" ? "default" : "outline"}
                        className="text-[0.65rem] capitalize py-0 px-2"
                      >
                        {h.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Prize: <strong className="text-foreground">{h.prize_pool || "Non-cash"}</strong></span>
                      <span>&middot;</span>
                      <span>{h.participant_count || 0} participants</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild className="h-8 rounded-lg text-xs">
                      <Link href={`/organizer/hackathons/${h.id}`}>Edit</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-8 rounded-lg text-xs">
                      <Link href={`/hackathons/${h.slug}`} target="_blank">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Judges Panel Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Gavel className="size-4.5 text-purple-600" />
              <span>Judging Panel</span>
            </h2>
            <Button variant="ghost" asChild size="sm" className="text-xs gap-1">
              <Link href="/organizer/judges">
                <span>Manage</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <Card className="border shadow-2xs bg-card/60 p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Appointed Judges</h3>
                <p className="text-xs text-muted-foreground">
                  Invite industry experts by email to evaluate project submissions.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs rounded-lg gap-1">
                <Link href="/organizer/judges">
                  <Plus className="size-3.5" /> Invite
                </Link>
              </Button>
            </div>

            {judges.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border-t border-dashed">
                No judges appointed yet. Click &quot;Invite&quot; to add evaluators with their email.
              </div>
            ) : (
              <div className="divide-y divide-border/60 text-xs">
                {judges.slice(0, 4).map((j) => (
                  <div key={j.id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-foreground truncate">{j.name}</div>
                      <div className="text-[0.7rem] text-muted-foreground truncate">{j.hackathon_title}</div>
                    </div>
                    <Badge variant="outline" className="text-[0.65rem] shrink-0">
                      {j.evaluation_count} scored
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
