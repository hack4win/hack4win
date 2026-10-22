"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Gavel,
  Plus,
  Mail,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useModalAlert } from "@/components/ui/modal-alert";

interface JudgeItem {
  id: string;
  judge_id: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  hackathon_id: string;
  hackathon_title: string;
  hackathon_slug: string;
  assigned_at: string;
  evaluation_count: number;
}

interface HackathonOption {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface JudgesClientProps {
  initialJudges: JudgeItem[];
  hackathons: HackathonOption[];
}

export function JudgesClient({ initialJudges, hackathons }: JudgesClientProps) {
  const { showConfirm } = useModalAlert();
  const [judges, setJudges] = useState<JudgeItem[]>(initialJudges);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    email: "",
    name: "",
    hackathonId: hackathons.length > 0 ? hackathons[0].id : "",
    title: "",
    bio: "",
  });

  const filteredJudges = judges.filter((j) => {
    const matchesSearch =
      j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.hackathon_title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHackathon =
      selectedHackathon === "all" || j.hackathon_id === selectedHackathon;

    return matchesSearch && matchesHackathon;
  });

  const handleInviteJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = form.email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid judge email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/organizer/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite judge");
      }

      const assignedHackathon = hackathons.find((h) => h.id === form.hackathonId);

      const newJudgeItem: JudgeItem = {
        id: crypto.randomUUID(),
        judge_id: data.judge.id,
        name: data.judge.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        username: data.judge.username || null,
        image: data.judge.image || null,
        hackathon_id: form.hackathonId,
        hackathon_title: assignedHackathon?.title || "Competition",
        hackathon_slug: assignedHackathon?.slug || "",
        assigned_at: new Date().toISOString(),
        evaluation_count: 0,
      };

      setJudges((prev) => [newJudgeItem, ...prev]);
      setStatusMessage({
        type: "success",
        text: `Judge account ready for ${cleanEmail}! Invited to ${assignedHackathon?.title || "competition"}.`,
      });
      setIsInviteOpen(false);
      setForm({
        email: "",
        name: "",
        hackathonId: hackathons.length > 0 ? hackathons[0].id : "",
        title: "",
        bio: "",
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to invite judge");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveJudge = async (judge: JudgeItem) => {
    const confirm = await showConfirm({
      title: "Remove Judge Assignment",
      message: `Are you sure you want to remove judge "${judge.name}" from evaluating "${judge.hackathon_title}"?`,
      confirmText: "Remove Judge",
      destructive: true,
    });
    if (!confirm) return;

    try {
      const res = await fetch(
        `/api/organizer/judges?judgeId=${encodeURIComponent(judge.judge_id)}&hackathonId=${encodeURIComponent(judge.hackathon_id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove judge");
      }

      setJudges((prev) => prev.filter((j) => j.id !== judge.id));
      setStatusMessage({
        type: "success",
        text: `Judge "${judge.name}" removed from "${judge.hackathon_title}".`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove judge",
      });
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Judges & Evaluators</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite domain experts with emails to evaluate project submissions according to your competition rubrics.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteOpen(true)}
          className="gap-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
        >
          <Plus className="size-4" />
          Invite Judge by Email
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search judges by name, email, or hackathon..."
            className="pl-10 rounded-xl"
          />
        </div>

        {hackathons.length > 0 && (
          <select
            value={selectedHackathon}
            onChange={(e) => setSelectedHackathon(e.target.value)}
            className="h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 w-full sm:w-auto cursor-pointer"
          >
            <option value="all">All Competitions ({judges.length})</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Judges Table Card */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Appointed Judging Panel</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredJudges.length} Total
                </Badge>
              </CardTitle>
              <CardDescription>
                Judges have exclusive access to evaluate submissions in the /judges portal
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredJudges.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground space-y-3">
              <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
                <Gavel className="size-6" />
              </div>
              <p className="font-bold text-foreground">No Judges Appointed Yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Organizers can invite technical judges with an email address. The judge will gain access to evaluate projects under /judges.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInviteOpen(true)}
                className="gap-2 rounded-xl text-xs cursor-pointer mt-2"
              >
                <Plus className="size-3.5" /> Invite First Judge
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3.5">Judge Profile</th>
                    <th className="px-6 py-3.5">Assigned Competition</th>
                    <th className="px-6 py-3.5">Assigned Date</th>
                    <th className="px-6 py-3.5">Evaluations</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredJudges.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-purple-500/10 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                            {j.image ? (
                              <img
                                src={j.image}
                                alt={j.name}
                                className="size-full rounded-full object-cover"
                              />
                            ) : (
                              (j.name?.[0] || j.email[0]).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{j.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{j.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-foreground block truncate">
                            {j.hackathon_title}
                          </span>
                          <Link
                            href={`/hackathons/${j.hackathon_slug}`}
                            target="_blank"
                            className="text-[0.7rem] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                          >
                            <span>View Public Page</span>
                            <ExternalLink className="size-2.5" />
                          </Link>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(j.assigned_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={j.evaluation_count > 0 ? "default" : "outline"}
                          className={`text-xs ${j.evaluation_count > 0 ? "bg-purple-600 text-white" : ""}`}
                        >
                          {j.evaluation_count} Scored
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleRemoveJudge(j)}
                            title="Remove judge assignment"
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Judge Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Gavel className="size-5 text-purple-600" />
              <span>Invite Judge by Email</span>
            </DialogTitle>
            <DialogDescription>
              Create or assign a judge to evaluate project submissions for your competition.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteJudge} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="p-3 rounded-xl text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="judge-email" className="text-xs font-semibold">
                Judge Email Address *
              </Label>
              <Input
                id="judge-email"
                type="email"
                required
                placeholder="judge@expert.io"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="judge-name" className="text-xs font-semibold">
                Judge Full Name
              </Label>
              <Input
                id="judge-name"
                placeholder="Dr. Sarah Chen"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="judge-hackathon" className="text-xs font-semibold">
                Assigned Hackathon *
              </Label>
              <select
                id="judge-hackathon"
                required
                value={form.hackathonId}
                onChange={(e) => setForm({ ...form, hackathonId: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
              >
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} ({h.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="judge-title" className="text-xs font-semibold">
                Title / Affiliation (Optional)
              </Label>
              <Input
                id="judge-title"
                placeholder="e.g. AI Architect, Tech Lead at Stripe"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.email}
                className="rounded-xl gap-2 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Inviting Judge..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
