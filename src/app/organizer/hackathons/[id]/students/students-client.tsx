"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { Hackathon, RegisteredStudent, SessionUser } from "@/lib/db/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useModalAlert } from "@/components/ui/modal-alert";
import {
  School,
  Lock,
  Unlock,
  Users,
  UserCheck,
  Mail,
  Plus,
  Download,
  Search,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  Rocket,
  Clock,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

interface OrganizerStudentsClientProps {
  hackathon: Hackathon;
  initialStudents: RegisteredStudent[];
  currentUser: SessionUser;
}

export function OrganizerStudentsClient({
  hackathon,
  initialStudents,
  currentUser: _currentUser,
}: OrganizerStudentsClientProps) {
  const { showAlert, showConfirm } = useModalAlert();

  const [students, setStudents] = useState<RegisteredStudent[]>(initialStudents);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<string[]>(hackathon.invited_emails || []);
  const [inviteToken, setInviteToken] = useState<string | null>(hackathon.invite_token || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "submitted" | "pending_submission" | "pending_verification" | "approved" | "rejected" | "solo" | "team"
  >("all");
  const [activeTab, setActiveTab] = useState<"registered" | "whitelist" | "access">("registered");

  // Modal State for adding emails
  const [isAddEmailsModalOpen, setIsAddEmailsModalOpen] = useState(false);
  const [newEmailsInput, setNewEmailsInput] = useState("");
  const [sendInviteEmails, setSendInviteEmails] = useState(true);
  const [isSubmittingEmails, setIsSubmittingEmails] = useState(false);

  // Quick Action States
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [sendingInviteEmail, setSendingInviteEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  // Metrics
  const totalRegistered = students.length;
  const totalSubmitted = students.filter((s) => s.has_submitted).length;
  const submissionRate = totalRegistered > 0 ? Math.round((totalSubmitted / totalRegistered) * 100) : 0;
  const soloCount = students.filter((s) => s.participation_type === "solo").length;
  const teamCount = students.filter((s) => s.participation_type !== "solo").length;
  const pendingReviewCount = students.filter((s) => s.status === "pending").length;
  const approvedCount = students.filter((s) => s.status !== "pending" && s.status !== "rejected").length;
  const rejectedCount = students.filter((s) => s.status === "rejected").length;

  // Registered email set for fast lookup
  const registeredEmailSet = useMemo(() => {
    return new Set(students.map((s) => s.email.toLowerCase().trim()));
  }, [students]);

  // Pending whitelisted emails (invited but not yet registered)
  const pendingWhitelistEmails = useMemo(() => {
    return invitedEmails.filter((email) => !registeredEmailSet.has(email.toLowerCase().trim()));
  }, [invitedEmails, registeredEmailSet]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesUsername = s.username?.toLowerCase().includes(q) || false;
        const matchesStudentId = s.student_id?.toLowerCase().includes(q) || false;
        const matchesBranch = s.branch?.toLowerCase().includes(q) || false;
        const matchesProject = s.submission_title?.toLowerCase().includes(q) || false;

        if (!matchesName && !matchesEmail && !matchesUsername && !matchesStudentId && !matchesBranch && !matchesProject) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === "submitted") return s.has_submitted;
      if (statusFilter === "pending_submission") return !s.has_submitted;
      if (statusFilter === "pending_verification") return s.status === "pending";
      if (statusFilter === "approved") return s.status === "approved" || !s.status;
      if (statusFilter === "rejected") return s.status === "rejected";
      if (statusFilter === "solo") return s.participation_type === "solo";
      if (statusFilter === "team") return s.participation_type !== "solo";

      return true;
    });
  }, [students, searchQuery, statusFilter]);

  // Helper to copy secret invite link
  const handleCopyInviteLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://hack4win.online";
    const link = `${origin}/hackathons/${hackathon.slug}?invite=${inviteToken || ""}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Helper to copy access code
  const handleCopyAccessCode = () => {
    if (!hackathon.access_code) return;
    navigator.clipboard.writeText(hackathon.access_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Helper to regenerate invite token
  const handleRegenerateToken = async () => {
    const confirmed = await showConfirm({
      title: "Regenerate Secret Invite Link?",
      message: "Previous share links will immediately stop working. Students who have not yet registered will need the new link.",
      confirmText: "Regenerate Link",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setIsRegeneratingToken(true);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate_token" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate invite token");

      setInviteToken(data.invite_token);
      showAlert({
        title: "Link Regenerated",
        message: "New secret invite link has been generated successfully.",
        type: "info",
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to regenerate token",
        type: "error",
      });
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Helper to add emails to whitelist
  const handleAddEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailsInput.trim()) return;

    setIsSubmittingEmails(true);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_emails",
          emails: newEmailsInput,
          sendInviteEmails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student emails");

      setInvitedEmails(data.invited_emails || []);
      setNewEmailsInput("");
      setIsAddEmailsModalOpen(false);

      showAlert({
        title: "Students Added",
        message: data.message || "Student whitelist updated successfully.",
        type: "info",
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to add emails",
        type: "error",
      });
    } finally {
      setIsSubmittingEmails(false);
    }
  };

  // Helper to remove an email from whitelist
  const handleRemoveEmail = async (email: string) => {
    const confirmed = await showConfirm({
      title: "Remove from Whitelist?",
      message: `Are you sure you want to remove "${email}" from the authorized student whitelist?`,
      confirmText: "Remove Email",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setRemovingEmail(email);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_email",
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove email");

      setInvitedEmails(data.invited_emails || []);
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to remove email",
        type: "error",
      });
    } finally {
      setRemovingEmail(null);
    }
  };

  // Helper to resend invite email to a specific student
  const handleResendInvite = async (email: string) => {
    setSendingInviteEmail(email);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_invite",
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation email");

      showAlert({
        title: "Invitation Sent",
        message: `Branded VIP campus pass email was dispatched to ${email}.`,
        type: "info",
      });
    } catch (err) {
      showAlert({
        title: "Email Error",
        message: err instanceof Error ? err.message : "Failed to send email",
        type: "error",
      });
    } finally {
      setSendingInviteEmail(null);
    }
  };

  // Helper to approve student registration
  const handleApproveStudent = async (studentUserId: string, studentName: string) => {
    setUpdatingStudentId(studentUserId);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_student",
          student_user_id: studentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve student");

      setStudents((prev) =>
        prev.map((s) => (s.user_id === studentUserId ? { ...s, status: "approved" } : s))
      );

      showAlert({
        title: "Registration Approved",
        message: `${studentName || "Student"}'s campus registration is now approved. Confirmation email dispatched.`,
        type: "info",
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to approve student",
        type: "error",
      });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Helper to reject student registration
  const handleRejectStudent = async (studentUserId: string, studentName: string) => {
    const confirmed = await showConfirm({
      title: "Reject Registration?",
      message: `Are you sure you want to reject ${studentName || "this student"}'s registration? They will not be allowed to submit projects.`,
      confirmText: "Reject Registration",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setUpdatingStudentId(studentUserId);
    try {
      const res = await fetch(`/api/organizer/hackathons/${hackathon.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_student",
          student_user_id: studentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject registration");

      setStudents((prev) =>
        prev.map((s) => (s.user_id === studentUserId ? { ...s, status: "rejected" } : s))
      );

      showAlert({
        title: "Registration Rejected",
        message: `${studentName || "Student"}'s registration has been marked as rejected.`,
        type: "info",
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to reject student",
        type: "error",
      });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Helper to export CSV
  const handleExportCSV = () => {
    if (students.length === 0) {
      showAlert({
        title: "No Students",
        message: "There are currently no registered students to export.",
        type: "info",
      });
      return;
    }

    const headers = [
      "Student Name",
      "Email",
      "Username",
      "Student ID / Roll No",
      "College / Campus",
      "Academic Year",
      "Branch",
      "Verification Status",
      "Participation Mode",
      "Submission Status",
      "Project Title",
      "Registration Date",
    ];

    const rows = students.map((s) => [
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.email || "").replace(/"/g, '""')}"`,
      `"${(s.username || "").replace(/"/g, '""')}"`,
      `"${(s.student_id || "").replace(/"/g, '""')}"`,
      `"${(s.college_name || "").replace(/"/g, '""')}"`,
      `"${(s.academic_year || "").replace(/"/g, '""')}"`,
      `"${(s.branch || "").replace(/"/g, '""')}"`,
      `"${(s.status || "approved").toUpperCase()}"`,
      `"${s.participation_type === "solo" ? "Solo" : "Looking for Team"}"`,
      `"${s.has_submitted ? "Submitted" : "Pending"}"`,
      `"${(s.submission_title || "").replace(/"/g, '""')}"`,
      `"${new Date(s.registered_at).toLocaleString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${hackathon.slug}-student-roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link href="/organizer/hackathons" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="size-3.5" /> Back to Competitions
          </Link>
          <span>/</span>
          <Link href={`/admin/hackathons/${hackathon.id}/edit`} className="hover:text-foreground transition-colors truncate max-w-xs">
            {hackathon.title}
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Student Roster</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Campus Student Roster & Invites
              </h1>
              {hackathon.is_private ? (
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 rounded-full text-xs font-bold px-3">
                  <Lock className="size-3" /> Private Campus
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 rounded-full text-xs font-bold px-3">
                  <Unlock className="size-3 text-emerald-500" /> Public Competition
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Manage student enrollment, inspect project submissions, and distribute exclusive access passes for{" "}
              <Link href={`/hackathons/${hackathon.slug}`} target="_blank" className="font-semibold text-foreground hover:underline inline-flex items-center gap-1">
                {hackathon.title} <ExternalLink className="size-3" />
              </Link>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 cursor-pointer"
            >
              <Download className="size-3.5 text-primary" />
              Export Roster CSV
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddEmailsModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              Add Student Emails
            </Button>
          </div>
        </div>
      </div>

      {/* Access Gate Credentials Banner */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Shareable Invite Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Share2 className="size-3.5" /> One-Click Student Invite Link
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={isRegeneratingToken}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
                  title="Generate a new secret token"
                >
                  <RefreshCw className={`size-3 ${isRegeneratingToken ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/hackathons/${hackathon.slug}?invite=${inviteToken || ""}`
                      : `/hackathons/${hackathon.slug}?invite=${inviteToken || ""}`
                  }
                  className="font-mono text-xs bg-background/80 h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyInviteLink}
                  className="shrink-0 h-9 px-3 gap-1 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedLink ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Students visiting with this link bypass all passcode and email restrictions.
              </p>
            </div>

            {/* 2. Passcode */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Key className="size-3.5" /> Student Access Passcode
              </span>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={hackathon.access_code || "No passcode configured"}
                  className="font-mono font-bold tracking-wider text-xs uppercase bg-background/80 h-9"
                />
                {hackathon.access_code && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAccessCode}
                    className="shrink-0 h-9 px-3 gap-1 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copiedCode ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Announce this in lectures, college Slack, or WhatsApp groups for direct access.
              </p>
            </div>

            {/* 3. Allowed Domains */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <School className="size-3.5" /> Approved Campus Domains
              </span>
              <div className="min-h-9 p-2 rounded-xl bg-background/80 border flex items-center gap-1.5 flex-wrap">
                {hackathon.allowed_email_domains && hackathon.allowed_email_domains.length > 0 ? (
                  hackathon.allowed_email_domains.map((dom) => (
                    <Badge
                      key={dom}
                      variant="outline"
                      className="font-mono text-[10px] py-0 px-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10"
                    >
                      @{dom.replace(/^@/, "")}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Any email domain accepted via passcode</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Students logging in with these domains join automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campus Security Alert Banner */}
      {pendingReviewCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>Campus Verification Required</span>
                <Badge className="bg-amber-500 text-amber-950 font-black text-[10px] px-2 py-0.5">
                  {pendingReviewCount} Action{pendingReviewCount > 1 ? "s" : ""} Needed
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Students registered via campus access code or invite link are held in pending verification. Review their campus credentials to approve or reject project submission access.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setActiveTab("registered");
              setStatusFilter("pending_verification");
            }}
            className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer"
          >
            Review Pending ({pendingReviewCount})
          </Button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Registered */}
        <Card className="shadow-xs border">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Registered Students</span>
              <Users className="size-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-1">
            <div className="text-3xl font-black tracking-tight text-foreground">{totalRegistered}</div>
            <p className="text-xs text-muted-foreground">Total campus participants</p>
          </CardContent>
        </Card>

        {/* Verification Queue (Pending Review) */}
        <Card className={`shadow-xs border ${pendingReviewCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
          <CardHeader className="pt-6 px-6 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Awaiting Review</span>
              <Clock className="size-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-1">
            <div className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {pendingReviewCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingReviewCount > 0 ? "Require organizer approval" : "All students verified"}
            </p>
          </CardContent>
        </Card>

        {/* Project Submissions */}
        <Card className="shadow-xs border">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Projects Submitted</span>
              <Rocket className="size-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-1">
            <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalSubmitted}
              <span className="text-xs font-bold text-muted-foreground ml-2">({submissionRate}%)</span>
            </div>
            <p className="text-xs text-muted-foreground">Completed submissions in judging queue</p>
          </CardContent>
        </Card>

        {/* Builders Mode Breakdown */}
        <Card className="shadow-xs border">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Participation Mode</span>
              <UserCheck className="size-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-1">
            <div className="text-xl font-black tracking-tight text-foreground">
              {soloCount} <span className="text-xs font-normal text-muted-foreground">Solo</span> &bull; {teamCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">Team</span>
            </div>
            <p className="text-xs text-muted-foreground">Builder collaboration distribution</p>
          </CardContent>
        </Card>

        {/* Pending Whitelist Invites */}
        <Card className="shadow-xs border">
          <CardHeader className="pt-6 px-6 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pending Invites</span>
              <Mail className="size-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-1">
            <div className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {pendingWhitelistEmails.length}
            </div>
            <p className="text-xs text-muted-foreground">Whitelisted students yet to register</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("registered")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "registered"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="size-3.5" />
          Registered Students ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whitelist")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "whitelist"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Mail className="size-3.5" />
          Pending Whitelist Invites ({pendingWhitelistEmails.length})
        </button>
      </div>

      {/* Tab 1: Registered Students Roster */}
      {activeTab === "registered" && (
        <Card className="border shadow-xs">
          <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Enrolled Campus Builders</span>
                <Badge variant="outline" className="text-xs">
                  {filteredStudents.length} of {students.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Students who have successfully activated their registration for this challenge.
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-64">
                <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search name, roll no, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Statuses ({students.length})</option>
                <option value="pending_verification">⏳ Pending Review ({pendingReviewCount})</option>
                <option value="approved">✅ Approved ({approvedCount})</option>
                <option value="rejected">❌ Rejected ({rejectedCount})</option>
                <option value="submitted">🚀 Submitted Projects ({totalSubmitted})</option>
                <option value="pending_submission">⏱️ In Progress / Not Submitted</option>
                <option value="solo">👤 Solo Builders ({soloCount})</option>
                <option value="team">🤝 Looking for Team ({teamCount})</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Users className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">No students match your criteria</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? "Try adjusting your search terms or filters."
                      : "Distribute your secret invite link or passcode to start enrolling students."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-3.5">Student / Participant</th>
                      <th className="px-6 py-3.5">Campus Credentials</th>
                      <th className="px-6 py-3.5">Mode</th>
                      <th className="px-6 py-3.5">Verification</th>
                      <th className="px-6 py-3.5">Submission Status</th>
                      <th className="px-6 py-3.5">Actions</th>
                      <th className="px-6 py-3.5">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((s) => (
                      <tr key={s.user_id} className="hover:bg-muted/20 transition-colors">
                        {/* Student Name & Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden shrink-0 border text-xs">
                              {s.image ? (
                                <img src={s.image} alt={s.name} className="size-full object-cover" />
                              ) : (
                                s.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground text-xs truncate flex items-center gap-1.5">
                                <span>{s.name}</span>
                                {s.username && (
                                  <Link
                                    href={`/u/${s.username}`}
                                    target="_blank"
                                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono"
                                  >
                                    @{s.username}
                                  </Link>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Campus Credentials (ID, Branch, Academic Year) */}
                        <td className="px-6 py-4 text-xs">
                          {s.student_id || s.branch || s.academic_year ? (
                            <div className="space-y-0.5">
                              {s.student_id && (
                                <div className="font-mono font-bold text-foreground text-[11px]">
                                  ID: {s.student_id}
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                                {s.branch && <span>{s.branch}</span>}
                                {s.branch && s.academic_year && <span>&bull;</span>}
                                {s.academic_year && <span className="font-medium">{s.academic_year}</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Standard Account</span>
                          )}
                        </td>

                        {/* Mode */}
                        <td className="px-6 py-4 text-xs">
                          {s.participation_type === "solo" ? (
                            <Badge variant="outline" className="text-[10px] rounded-full font-bold">
                              👤 Solo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] rounded-full font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                              🤝 Team Search
                            </Badge>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td className="px-6 py-4 text-xs">
                          {s.status === "pending" ? (
                            <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] rounded-full font-bold gap-1">
                              <Clock className="size-3" /> Pending Review
                            </Badge>
                          ) : s.status === "rejected" ? (
                            <Badge className="bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] rounded-full font-bold gap-1">
                              <AlertCircle className="size-3" /> Rejected
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-bold gap-1">
                              <CheckCircle2 className="size-3" /> Approved
                            </Badge>
                          )}
                        </td>

                        {/* Submission Status */}
                        <td className="px-6 py-4 text-xs">
                          {s.has_submitted ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-bold gap-1">
                                <CheckCircle2 className="size-3" /> Submitted
                              </Badge>
                              {s.submission_title && (
                                <Link
                                  href={`/projects/${s.submission_id}`}
                                  target="_blank"
                                  className="block font-semibold text-foreground hover:text-primary transition-colors truncate max-w-xs text-[11px]"
                                >
                                  {s.submission_title} &rarr;
                                </Link>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] rounded-full font-bold text-muted-foreground gap-1">
                              <Clock className="size-3" /> In Progress
                            </Badge>
                          )}
                        </td>

                        {/* Quick Approval / Rejection Actions */}
                        <td className="px-6 py-4 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {s.status === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={updatingStudentId === s.user_id}
                                  onClick={() => handleApproveStudent(s.user_id, s.name)}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs cursor-pointer"
                                >
                                  {updatingStudentId === s.user_id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingStudentId === s.user_id}
                                  onClick={() => handleRejectStudent(s.user_id, s.name)}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1 cursor-pointer"
                                >
                                  Reject
                                </Button>
                              </>
                            ) : s.status === "rejected" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingStudentId === s.user_id}
                                onClick={() => handleApproveStudent(s.user_id, s.name)}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                              >
                                {updatingStudentId === s.user_id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                                Re-Approve
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updatingStudentId === s.user_id}
                                onClick={() => handleRejectStudent(s.user_id, s.name)}
                                className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                title="Revoke or Reject Registration"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="px-6 py-4 text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(s.registered_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Pending Whitelist Invites */}
      {activeTab === "whitelist" && (
        <Card className="border shadow-xs">
          <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Authorized Student Whitelist</span>
                <Badge variant="outline" className="text-xs">
                  {pendingWhitelistEmails.length} Pending
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Students pre-approved by email who have not activated their registration on Hack4Win yet.
              </CardDescription>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddEmailsModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              Add More Emails
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {pendingWhitelistEmails.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">All Whitelisted Students Registered!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Every student added to the pre-approved whitelist has joined the hackathon.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-3.5">Student Email</th>
                      <th className="px-6 py-3.5">Access Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingWhitelistEmails.map((email) => (
                      <tr key={email} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3.5 text-xs font-mono font-medium text-foreground">
                          {email}
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          <Badge variant="outline" className="text-[10px] rounded-full font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
                            ⏳ Invite Pending
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={sendingInviteEmail === email}
                              onClick={() => handleResendInvite(email)}
                              className="h-8 rounded-xl text-xs gap-1 cursor-pointer"
                              title="Resend VIP invite email via Brevo"
                            >
                              {sendingInviteEmail === email ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Send className="size-3 text-purple-600" />
                              )}
                              <span>Resend Invite</span>
                            </Button>

                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              disabled={removingEmail === email}
                              onClick={() => handleRemoveEmail(email)}
                              className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove email from whitelist"
                            >
                              {removingEmail === email ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
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
      )}

      {/* Add Emails Dialog */}
      <Dialog open={isAddEmailsModalOpen} onOpenChange={setIsAddEmailsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white rounded-full text-[10px] font-bold">
                Student Enrollment
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{hackathon.title}</span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground pt-1">
              Add Students to Whitelist Roster
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste registered university student emails below. They will be granted instant access to join this private challenge.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEmails} className="py-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="emailsInput" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-purple-600" />
                Student Emails (comma, space, or newline separated)
              </label>
              <textarea
                id="emailsInput"
                rows={5}
                required
                value={newEmailsInput}
                onChange={(e) => setNewEmailsInput(e.target.value)}
                placeholder="alice@college.edu, bob@mit.edu, charlie@stanford.edu..."
                className="w-full text-xs font-mono p-3 rounded-2xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                Duplicate or existing emails are automatically deduplicated.
              </p>
            </div>

            {/* Send Invite Emails Toggle */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="sendInviteCheckbox"
                checked={sendInviteEmails}
                onChange={(e) => setSendInviteEmails(e.target.checked)}
                className="size-4 mt-0.5 rounded accent-purple-600 cursor-pointer"
              />
              <label htmlFor="sendInviteCheckbox" className="text-xs space-y-0.5 cursor-pointer">
                <span className="font-bold text-foreground block">
                  Send Branded VIP Invitation Emails via Brevo
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Automatically delivers the student invite link, access code, and challenge guidelines to each newly added student email.
                </span>
              </label>
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddEmailsModalOpen(false)}
                disabled={isSubmittingEmails}
                className="rounded-full text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEmails || !newEmailsInput.trim()}
                className="rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs gap-1.5"
              >
                {isSubmittingEmails ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Adding & Dispatching...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5" />
                    <span>Add to Student Roster</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
