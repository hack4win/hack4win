"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { HostInquiry, HostInquiryStatus } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Building2,
  Users,
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  FileText,
  ShieldCheck,
  Tag,
  Copy,
  Check,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface InquiriesClientProps {
  initialInquiries: HostInquiry[];
  initialStats: {
    total: number;
    new: number;
    contacted: number;
    in_discussion: number;
    approved: number;
    archived: number;
  };
}

const AVAILABLE_TRACK_OPTIONS = [
  "AI & Autonomous Agents",
  "Spatial & Mobile Apps",
  "Next-Gen Developer Tools",
  "Web3 & Decentralized Protocols",
  "FinTech & Open Banking",
  "HealthTech & BioTech",
  "Climate & Clean Energy",
  "Gaming & Virtual Worlds",
];

const STATUS_CONFIG: Record<
  HostInquiryStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  new: {
    label: "New Lead",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  contacted: {
    label: "Contacted",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  in_discussion: {
    label: "In Discussion",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  approved: {
    label: "Approved / Partnered",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Archived",
    bg: "bg-muted/60",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
};

export function InquiriesClient({ initialInquiries, initialStats }: InquiriesClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  const [inquiries, setInquiries] = useState<HostInquiry[]>(initialInquiries);
  const [stats, setStats] = useState(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail Modal State
  const [selectedInquiry, setSelectedInquiry] = useState<HostInquiry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Create Form Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    organizationName: "",
    contactName: "",
    email: "",
    timeline: "Next 30 Days (Fast Track)",
    estimatedPrizePool: "$25,000 - $50,000",
    tracks: ["AI & Autonomous Agents"],
    eventGoals: "",
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/inquiries");
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const data = await res.json();
      setInquiries(data.inquiries || []);
      setStats(data.stats || initialStats);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Detail
  const openDetail = (inquiry: HostInquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotesInput(inquiry.admin_notes || "");
    setIsDetailOpen(true);
  };

  // Update Status
  const handleStatusChange = async (inquiryId: string, newStatus: HostInquiryStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setInquiries((prev) =>
        prev.map((inq) => (inq.id === inquiryId ? { ...inq, status: newStatus } : inq))
      );
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      // Refresh stats
      const statsRes = await fetch("/api/admin/inquiries");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (err) {
      await showAlert({
        title: "Status Update Error",
        message: err instanceof Error ? err.message : "Failed to update inquiry status",
        type: "error",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Notes
  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${selectedInquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: adminNotesInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes");

      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === selectedInquiry.id ? { ...inq, admin_notes: adminNotesInput } : inq
        )
      );
      setSelectedInquiry((prev) => (prev ? { ...prev, admin_notes: adminNotesInput } : null));

      await showAlert({
        title: "Notes Saved",
        message: "Internal administrative notes have been saved.",
        type: "success",
      });
    } catch (err) {
      await showAlert({
        title: "Save Error",
        message: err instanceof Error ? err.message : "Failed to save notes",
        type: "error",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Delete Inquiry
  const handleDeleteInquiry = async (inquiry: HostInquiry) => {
    const confirmed = await showConfirm({
      title: "Delete Host Inquiry",
      message: `Are you sure you want to permanently delete the inquiry from "${inquiry.organization_name}"? This action cannot be undone.`,
      confirmText: "Delete Lead",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete inquiry");

      setInquiries((prev) => prev.filter((inq) => inq.id !== inquiry.id));
      if (selectedInquiry?.id === inquiry.id) {
        setIsDetailOpen(false);
        setSelectedInquiry(null);
      }
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [inquiry.status]: Math.max(0, (prev[inquiry.status] || 1) - 1),
      }));

      await showAlert({
        title: "Inquiry Deleted",
        message: `Inquiry from ${inquiry.organization_name} has been removed.`,
        type: "success",
      });
    } catch (err) {
      await showAlert({
        title: "Delete Error",
        message: err instanceof Error ? err.message : "Failed to delete inquiry",
        type: "error",
      });
    }
  };

  // Handle Form Track Toggle
  const toggleFormTrack = (track: string) => {
    setCreateForm((prev) => {
      const exists = prev.tracks.includes(track);
      if (exists) {
        return { ...prev, tracks: prev.tracks.filter((t) => t !== track) };
      } else {
        return { ...prev, tracks: [...prev.tracks, track] };
      }
    });
  };

  // Handle Create Inquiry Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.organizationName.trim() || !createForm.contactName.trim() || !createForm.email.trim()) {
      await showAlert({
        title: "Required Fields",
        message: "Please fill in Company Name, Contact Name, and Email.",
        type: "warning",
      });
      return;
    }

    if (createForm.eventGoals.trim().length < 10) {
      await showAlert({
        title: "Event Description",
        message: "Please enter at least 10 characters describing the event goals.",
        type: "warning",
      });
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch("/api/host/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit inquiry");

      await showAlert({
        title: "Inquiry Created",
        message: "New organizer host inquiry has been logged successfully.",
        type: "success",
      });

      setIsCreateOpen(false);
      setCreateForm({
        organizationName: "",
        contactName: "",
        email: "",
        timeline: "Next 30 Days (Fast Track)",
        estimatedPrizePool: "$25,000 - $50,000",
        tracks: ["AI & Autonomous Agents"],
        eventGoals: "",
      });

      // Refresh listings
      await refreshData();
    } catch (err) {
      await showAlert({
        title: "Creation Error",
        message: err instanceof Error ? err.message : "Failed to log inquiry",
        type: "error",
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Copy email helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Filtered inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    if (selectedStatus !== "all" && inq.status !== selectedStatus) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchOrg = inq.organization_name.toLowerCase().includes(q);
      const matchContact = inq.contact_name.toLowerCase().includes(q);
      const matchEmail = inq.email.toLowerCase().includes(q);
      const matchGoals = inq.event_goals.toLowerCase().includes(q);
      const matchTracks = inq.tracks.some((t) => t.toLowerCase().includes(q));
      if (!matchOrg && !matchContact && !matchEmail && !matchGoals && !matchTracks) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Host Inquiries & Leads</h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Partnerships
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review incoming hackathon proposals submitted via the Host Inquiry form on{" "}
            <Link href="/host#inquiry-form" target="_blank" className="text-primary hover:underline font-semibold inline-flex items-center gap-1">
              hack4win.online/host <ExternalLink className="size-3" />
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="rounded-full text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Link href="/host#inquiry-form" target="_blank">
              <ExternalLink className="size-3.5" />
              Live Host Form
            </Link>
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="rounded-full text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Log New Inquiry
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Inquiries */}
        <Card
          onClick={() => setSelectedStatus("all")}
          className={`rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === "all" ? "ring-2 ring-primary border-primary shadow-xs" : "hover:border-primary/50"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Total Inquiries</span>
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">All received submissions</p>
          </CardContent>
        </Card>

        {/* New Leads */}
        <Card
          onClick={() => setSelectedStatus("new")}
          className={`rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === "new" ? "ring-2 ring-blue-500 border-blue-500 shadow-xs" : "hover:border-blue-500/50"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                New Leads
              </span>
              <span className="relative flex size-2.5">
                {stats.new > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full size-2.5 bg-blue-500"></span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 text-blue-600 dark:text-blue-400">
              {stats.new}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting initial review</p>
          </CardContent>
        </Card>

        {/* In Discussion */}
        <Card
          onClick={() => setSelectedStatus("in_discussion")}
          className={`rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === "in_discussion" ? "ring-2 ring-purple-500 border-purple-500 shadow-xs" : "hover:border-purple-500/50"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                In Discussion
              </span>
              <MessageSquare className="size-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 text-purple-600 dark:text-purple-400">
              {stats.in_discussion}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scope & tier negotiation</p>
          </CardContent>
        </Card>

        {/* Contacted */}
        <Card
          onClick={() => setSelectedStatus("contacted")}
          className={`rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === "contacted" ? "ring-2 ring-amber-500 border-amber-500 shadow-xs" : "hover:border-amber-500/50"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Contacted
              </span>
              <Mail className="size-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 text-amber-600 dark:text-amber-400">
              {stats.contacted}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Initial email / call dispatched</p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card
          onClick={() => setSelectedStatus("approved")}
          className={`rounded-2xl border transition-all cursor-pointer col-span-2 lg:col-span-1 ${
            selectedStatus === "approved" ? "ring-2 ring-emerald-500 border-emerald-500 shadow-xs" : "hover:border-emerald-500/50"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Approved
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
              {stats.approved}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready to launch</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search company, contact person, email, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9.5 text-xs h-9.5 bg-background border-input rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All", count: stats.total },
            { id: "new", label: "New", count: stats.new },
            { id: "contacted", label: "Contacted", count: stats.contacted },
            { id: "in_discussion", label: "Discussion", count: stats.in_discussion },
            { id: "approved", label: "Approved", count: stats.approved },
            { id: "archived", label: "Archived", count: stats.archived },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedStatus(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedStatus === item.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === item.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground/70"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Cards Grid */}
      {filteredInquiries.length === 0 ? (
        <Card className="rounded-3xl border border-dashed p-12 text-center bg-card">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Building2 className="size-7" />
          </div>
          <h3 className="text-base font-bold">No Inquiries Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchTerm || selectedStatus !== "all"
              ? "No host inquiries match your current search and status filters. Try clearing your search."
              : "No hosting inquiries have been submitted yet. Inquiries submitted via /host will appear here automatically."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(searchTerm || selectedStatus !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStatus("all");
                }}
                className="rounded-full text-xs"
              >
                Reset Filters
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-full text-xs font-bold gap-1.5"
            >
              <Plus className="size-3.5" /> Log First Inquiry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInquiries.map((inq) => {
            const statusConfig = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
            const formattedDate = new Date(inq.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <Card
                key={inq.id}
                className="rounded-3xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary shrink-0" />
                        <h3 className="text-base font-extrabold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {inq.organization_name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Received on {formattedDate}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      <span className={`size-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Contact info row */}
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                        <Users className="size-3 text-muted-foreground shrink-0" />
                        {inq.contact_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="size-3 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${inq.email}?subject=Hack4Win%20Hosting%20Inquiry%20-%20${encodeURIComponent(
                            inq.organization_name
                          )}`}
                          className="hover:text-primary hover:underline"
                        >
                          {inq.email}
                        </a>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full shrink-0"
                      onClick={() => handleCopyEmail(inq.email)}
                      title="Copy email address"
                    >
                      <Copy className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Key Proposal Metrics: Timeline & Prize Pool */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border bg-background/50 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3 text-primary" /> Target Timeline
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 truncate text-[11px]">
                        {inq.timeline || "Flexible"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-background/50 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <DollarSign className="size-3 text-emerald-500" /> Target Prize Pool
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 truncate text-[11px]">
                        {inq.estimated_prize_pool || "Not specified"}
                      </span>
                    </div>
                  </div>

                  {/* Focus Areas & Tracks */}
                  {inq.tracks && inq.tracks.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Focus Tracks
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {inq.tracks.slice(0, 3).map((track, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.2 rounded-full font-medium"
                          >
                            {track}
                          </Badge>
                        ))}
                        {inq.tracks.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.2 rounded-full text-muted-foreground"
                          >
                            +{inq.tracks.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event Goals / Scope Preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Event Goals & Requirements
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {inq.event_goals}
                    </p>
                  </div>

                  {/* Notes indicator if present */}
                  {inq.admin_notes && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary space-y-0.5">
                      <span className="font-bold text-[10px] uppercase flex items-center gap-1">
                        <FileText className="size-3" /> Admin Internal Notes
                      </span>
                      <p className="text-[11px] text-foreground/80 line-clamp-1 italic">
                        &ldquo;{inq.admin_notes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 sm:p-5 border-t bg-muted/10 flex items-center justify-between gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={inq.status}
                    onChange={(e) => handleStatusChange(inq.id, e.target.value as HostInquiryStatus)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="new">Mark as: New</option>
                    <option value="contacted">Mark as: Contacted</option>
                    <option value="in_discussion">Mark as: In Discussion</option>
                    <option value="approved">Mark as: Approved</option>
                    <option value="archived">Mark as: Archived</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteInquiry(inq)}
                      className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete lead"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => openDetail(inq)}
                      className="rounded-full text-xs font-bold gap-1 shadow-2xs"
                    >
                      Review Proposal
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail / Review Modal */}
      {selectedInquiry && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black">
                      {selectedInquiry.organization_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Submitted on{" "}
                      {new Date(selectedInquiry.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </DialogDescription>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                    STATUS_CONFIG[selectedInquiry.status].bg
                  } ${STATUS_CONFIG[selectedInquiry.status].text} ${
                    STATUS_CONFIG[selectedInquiry.status].border
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${STATUS_CONFIG[selectedInquiry.status].dot}`}
                  />
                  {STATUS_CONFIG[selectedInquiry.status].label}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4 text-xs">
              {/* Contact Lead Details */}
              <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" /> Organizer Contact Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-[10px]">Contact Person:</span>
                    <p className="font-bold text-sm text-foreground">{selectedInquiry.contact_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">Work Email Address:</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${selectedInquiry.email}`}
                        className="font-bold text-sm text-primary hover:underline truncate"
                      >
                        {selectedInquiry.email}
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-full shrink-0"
                        onClick={() => handleCopyEmail(selectedInquiry.email)}
                        title="Copy email"
                      >
                        {copiedEmail ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Scope & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-primary" /> Target Launch Timeline
                  </span>
                  <p className="font-bold text-sm text-foreground">{selectedInquiry.timeline}</p>
                </div>

                <div className="p-4 rounded-2xl border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <DollarSign className="size-3 text-emerald-500" /> Target Prize Pool
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {selectedInquiry.estimated_prize_pool}
                  </p>
                </div>
              </div>

              {/* Focus Tracks */}
              {selectedInquiry.tracks && selectedInquiry.tracks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="size-3.5 text-primary" /> Focus Areas & Technological Tracks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedInquiry.tracks.map((track, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs px-3 py-1 rounded-full font-semibold"
                      >
                        {track}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Goals & Challenge Scope */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-primary" /> Event Goals & Challenge Scope
                </span>
                <div className="p-4 rounded-2xl border bg-background text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.event_goals}
                </div>
              </div>

              {/* Change Status Selector */}
              <div className="space-y-2 p-4 rounded-2xl border bg-muted/20">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary" /> Pipeline Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(["new", "contacted", "in_discussion", "approved", "archived"] as HostInquiryStatus[]).map(
                    (st) => {
                      const cfg = STATUS_CONFIG[st];
                      const isSelected = selectedInquiry.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(selectedInquiry.id, st)}
                          disabled={isUpdatingStatus}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-primary/30 shadow-xs`
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <span className={`size-2 rounded-full ${cfg.dot}`} />
                          <span className="text-[11px]">{cfg.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" /> Internal Administrative Notes
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Visible only to platform admins
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder="Record call logs, proposed contract terms, sponsorship tier, or next follow-up date..."
                  className="w-full rounded-2xl text-xs p-3.5 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="rounded-full text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSavingNotes ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Notes"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteInquiry(selectedInquiry)}
                className="text-destructive hover:bg-destructive/10 rounded-full text-xs gap-1.5"
              >
                <Trash2 className="size-3.5" /> Delete Lead
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-semibold gap-1.5"
                >
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=Hack4Win%20Partnerships%20-%20${encodeURIComponent(
                      selectedInquiry.organization_name
                    )}&body=Hi%20${encodeURIComponent(
                      selectedInquiry.contact_name
                    )},%0A%0AThank%20you%20for%20submitting%20your%20hackathon%20proposal%20for%20${encodeURIComponent(
                      selectedInquiry.organization_name
                    )}.%20We%20would%20love%20to%20schedule%20a%20brief%20call%20to%20review%20your%20timeline%20and%20prizes.%0A%0ABest%20regards,%0AHack4Win%20Team`}
                  >
                    <Mail className="size-3.5" /> Email Organizer
                  </a>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="rounded-full text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <Link
                    href={`/admin/users?search=${encodeURIComponent(selectedInquiry.email)}`}
                    target="_blank"
                  >
                    <Users className="size-3.5" /> Provision Organizer Account
                  </Link>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Log New Inquiry Modal (Form identical to /host) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">
                  Log New Host Inquiry
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Manually record a corporate, university, or ecosystem sponsor competition proposal.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Organization Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Building2 className="size-3.5 text-primary" /> Company / Organization Name *
                </label>
                <Input
                  placeholder="e.g. Acme AI, Solana Labs, DevRel Foundation"
                  value={createForm.organizationName}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, organizationName: e.target.value }))
                  }
                  className="rounded-xl text-xs h-10 bg-background"
                  required
                />
              </div>

              {/* Contact Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Users className="size-3.5 text-primary" /> Contact Full Name *
                </label>
                <Input
                  placeholder="e.g. Sarah Connor"
                  value={createForm.contactName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, contactName: e.target.value }))}
                  className="rounded-xl text-xs h-10 bg-background"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Mail className="size-3.5 text-primary" /> Business / Work Email *
                </label>
                <Input
                  type="email"
                  placeholder="e.g. lead@organization.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-xl text-xs h-10 bg-background"
                  required
                />
              </div>

              {/* Timeline */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Calendar className="size-3.5 text-primary" /> Target Launch Timeline
                </label>
                <select
                  value={createForm.timeline}
                  onChange={(e) => setCreateForm((p) => ({ ...p, timeline: e.target.value }))}
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <DollarSign className="size-3.5 text-primary" /> Estimated Prize Pool Target
              </label>
              <select
                value={createForm.estimatedPrizePool}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, estimatedPrizePool: e.target.value }))
                }
                className="w-full rounded-xl text-xs h-10 px-3 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="$10,000 - $25,000">$10,000 - $25,000 (Community Sprint)</option>
                <option value="$25,000 - $50,000">$25,000 - $50,000 (Premier Hackathon)</option>
                <option value="$50,000 - $100,000">$50,000 - $100,000 (Global Flagship Challenge)</option>
                <option value="$100,000+">$100,000+ (Enterprise / Ecosystem Fund)</option>
                <option value="Non-Cash (Hardware / Cloud Credits)">
                  Non-Cash (Hardware, VR Kits, API Credits)
                </option>
              </select>
            </div>

            {/* Focus Areas & Tracks */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Focus Areas & Tracks (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TRACK_OPTIONS.map((track) => {
                  const isSelected = createForm.tracks.includes(track);
                  return (
                    <button
                      type="button"
                      key={track}
                      onClick={() => toggleFormTrack(track)}
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

            {/* Event Goals & Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <MessageSquare className="size-3.5 text-primary" /> Event Goals & Challenge Scope *
              </label>
              <textarea
                rows={4}
                placeholder="Tell us about the APIs, SDKs, or tools you want developers to build with, expected participant size, and any special requirements..."
                value={createForm.eventGoals}
                onChange={(e) => setCreateForm((p) => ({ ...p, eventGoals: e.target.value }))}
                className="w-full rounded-2xl text-xs p-3.5 bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
                required
              />
            </div>

            <DialogFooter className="border-t pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCreate}
                className="rounded-full text-xs font-bold gap-1.5 shadow-xs"
              >
                {isSubmittingCreate ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" /> Submit Organizer Inquiry
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
