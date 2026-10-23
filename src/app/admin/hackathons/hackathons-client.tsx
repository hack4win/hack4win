"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Hackathon, HackathonStatus } from "@/lib/db/types";
import { getHackathonStatus } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Filter,
  Trophy,
  Calendar,
  DollarSign,
  Users,
  ExternalLink,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Radio,
  Clock,
  Sparkles,
  Pencil,
  Gavel,
} from "lucide-react";

interface HackathonsClientProps {
  initialHackathons: Hackathon[];
  initialStats: {
    total: number;
    upcoming: number;
    ongoing: number;
    ended: number;
  };
}

export function HackathonsClient({
  initialHackathons,
  initialStats,
}: HackathonsClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  const [hackathons, setHackathons] = useState<Hackathon[]>(initialHackathons);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Filter hackathons
   */
  const filtered = hackathons.filter((h) => {
    const matchesSearch =
      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.organizer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const dynamicStatus = getHackathonStatus(h);
    const matchesStatus =
      selectedStatus === "all" ||
      dynamicStatus === selectedStatus ||
      h.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  /**
   * Update hackathon status
   */
  const handleStatusChange = async (id: string, newStatus: HackathonStatus) => {
    setUpdatingId(id);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/hackathons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setHackathons((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h))
      );
      setStatusMessage({
        type: "success",
        text: `Hackathon status changed to "${newStatus}".`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * Delete hackathon
   */
  const handleDelete = async (hackathon: Hackathon) => {
    const confirmed = await showConfirm({
      title: "Delete Hackathon Challenge",
      message: `Are you sure you want to delete "${hackathon.title}"? All associated submissions, judging records, and registrations will be affected. This cannot be undone.`,
      confirmText: "Delete Hackathon",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(hackathon.id);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/hackathons/${hackathon.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete hackathon");
      }

      setHackathons((prev) => prev.filter((h) => h.id !== hackathon.id));
      setStatusMessage({
        type: "success",
        text: `Hackathon "${hackathon.title}" was deleted.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete hackathon",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: HackathonStatus) => {
    switch (status) {
      case "ongoing":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
            <Radio className="size-3 animate-pulse" /> Live Now
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold gap-1">
            <Clock className="size-3" /> Upcoming
          </Badge>
        );
      case "ended":
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs font-medium">
            Ended
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-xs font-medium">
            Draft
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Hackathons</CardDescription>
            <CardTitle className="text-2xl font-bold">{hackathons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Upcoming</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {hackathons.filter((h) => h.status === "upcoming").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Live Ongoing</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {hackathons.filter((h) => h.status === "ongoing").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Ended</CardDescription>
            <CardTitle className="text-2xl font-bold text-muted-foreground">
              {hackathons.filter((h) => h.status === "ended").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="size-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, tagline, or organizer..."
            className="pl-10 rounded-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider shrink-0 mr-1">
            <Filter className="size-3.5" /> Status:
          </span>
          {["all", "upcoming", "ongoing", "ended", "draft"].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize shrink-0 cursor-pointer ${
                selectedStatus === s
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Table Card */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Competitions</CardTitle>
              <CardDescription>
                Showing {filtered.length} of {hackathons.length} registered hackathons
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Trophy className="size-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="font-bold text-lg">No hackathons found</h3>
                <p className="text-xs text-muted-foreground">
                  Get started by publishing a new hackathon challenge for the community.
                </p>
              </div>
              <Button asChild className="rounded-full gap-2">
                <Link href="/admin/hackathons/new">
                  <Plus className="size-4" />
                  Create First Hackathon
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3.5">Hackathon</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Format & Location</th>
                    <th className="px-6 py-3.5">Prizes</th>
                    <th className="px-6 py-3.5">Dates</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((h) => {
                    const isUpdating = updatingId === h.id;
                    const isDeleting = deletingId === h.id;

                    return (
                      <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                        {/* Title & Banner / Icon */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 border">
                              {h.banner_url ? (
                                <img
                                  src={h.banner_url}
                                  alt={h.title}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Trophy className="size-5" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  href={`/admin/hackathons/${h.id}/edit`}
                                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                                  title="Edit this hackathon"
                                >
                                  {h.title}
                                </Link>
                                {h.is_private && (
                                  <Badge className="text-[9px] px-1.5 py-0 rounded-full font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                    🎓 Campus Private
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {h.tagline}
                              </div>
                              <div className="text-[0.7rem] text-muted-foreground/80 font-mono mt-0.5">
                                slug: /{h.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">{getStatusBadge(getHackathonStatus(h))}</td>

                        {/* Format & Location */}
                        <td className="px-6 py-4 text-xs">
                          <div className="font-medium capitalize">{h.format}</div>
                          <div className="text-muted-foreground truncate max-w-[140px]">
                            {h.location}
                          </div>
                        </td>

                        {/* Prize Pool */}
                        <td className="px-6 py-4 text-xs font-semibold text-primary">
                          {h.prize_pool}
                        </td>

                        {/* Dates */}
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          <div>
                            {new Date(h.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(h.end_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[0.7rem] text-muted-foreground/75">
                            Deadline: {new Date(h.submission_deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            {isUpdating ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <select
                                value={h.status === "draft" ? "draft" : "published"}
                                onChange={(e) =>
                                  handleStatusChange(h.id, e.target.value as HackathonStatus)
                                }
                                className="h-8 rounded-full border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                              </select>
                            )}

                            {/* Edit Hackathon */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              title="Edit hackathon details"
                              className="rounded-full text-foreground/75 hover:text-primary hover:bg-primary/10"
                            >
                              <Link href={`/admin/hackathons/${h.id}/edit`}>
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>

                            {/* Student Roster & Invites */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              title={h.is_private ? "Campus Student Roster & Invites (Private)" : "Student Roster & Invites"}
                              className={`rounded-full transition-colors ${
                                h.is_private
                                  ? "text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                                  : "text-foreground/75 hover:text-purple-600 hover:bg-purple-500/10"
                              }`}
                            >
                              <Link href={`/organizer/hackathons/${h.id}/students`}>
                                <Users className="size-3.5" />
                              </Link>
                            </Button>

                            {/* Judging Portal */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              title="Judging & Scoring Portal"
                              className="rounded-full text-foreground/75 hover:text-amber-500 hover:bg-amber-500/10"
                            >
                              <Link href={`/admin/judging?hackathonId=${h.id}`}>
                                <Gavel className="size-3.5" />
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              title="View public page"
                              className="rounded-full text-foreground/75 hover:text-foreground"
                            >
                              <Link href={`/hackathons/${h.slug}`} target="_blank">
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>

                            <button
                              onClick={() => handleDelete(h)}
                              disabled={isDeleting}
                              title="Delete hackathon"
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
