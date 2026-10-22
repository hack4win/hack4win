"use client";

import React, { useState, useEffect } from "react";
import type { Hackathon, Skill, EmailCampaign, EmailType } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  Users,
  Trophy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Eye,
  FileText,
  Filter,
  Check,
  Zap,
  Globe,
  Radio,
  History,
  RotateCcw,
} from "lucide-react";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MailClientProps {
  hackathons: Hackathon[];
  skills: Skill[];
  initialCampaigns: EmailCampaign[];
  initialStats: {
    totalCampaigns: number;
    totalSent: number;
    marketingCount: number;
    transactionalCount: number;
  };
  totalUsersCount: number;
}

export function MailClient({
  hackathons,
  skills,
  initialCampaigns,
  initialStats,
  totalUsersCount,
}: MailClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  // Targeting state
  const [filterMode, setFilterMode] = useState<"all" | "hackathon" | "role" | "skill" | "direct">("all");
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>(hackathons[0]?.id || "");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [selectedSkill, setSelectedSkill] = useState<string>(skills[0]?.name || "Next.js");
  const [directEmail, setDirectEmail] = useState<string>("");

  // Email form state
  const [mailType, setMailType] = useState<EmailType>("marketing");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [content, setContent] = useState("");
  const [ctaText, setCtaText] = useState("View Hackathon Challenge");
  const [ctaUrl, setCtaUrl] = useState("https://hack4win.online/hackathons");

  // Audience resolution state
  const [audienceCount, setAudienceCount] = useState<number>(totalUsersCount);
  const [isResolvingAudience, setIsResolvingAudience] = useState(false);
  const effectiveAudienceCount = filterMode === "direct" && !directEmail.trim() ? 0 : audienceCount;

  // View state: 'compose' vs 'preview'
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);

  // Submission state
  const [isSending, setIsSending] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(initialCampaigns);
  const [stats, setStats] = useState(initialStats);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Compute target filter string
  const getComputedFilter = () => {
    switch (filterMode) {
      case "hackathon":
        return `hackathon:${selectedHackathonId}`;
      case "role":
        return `role:${selectedRole}`;
      case "skill":
        return `skill:${selectedSkill}`;
      case "direct":
        return `direct:${directEmail.trim()}`;
      default:
        return "all";
    }
  };

  const getTargetLabel = () => {
    switch (filterMode) {
      case "hackathon": {
        const found = hackathons.find((h) => h.id === selectedHackathonId);
        return found ? `Hackathon: ${found.title}` : "Hackathon Participants";
      }
      case "role":
        return `Role: ${selectedRole.toUpperCase()}`;
      case "skill":
        return `Skill: ${selectedSkill}`;
      case "direct":
        return `Direct: ${directEmail.trim() || "Single Recipient"}`;
      default:
        return "All Platform Users";
    }
  };

  // Resolve audience count when filter changes
  useEffect(() => {
    if (filterMode === "direct" && !directEmail.trim()) {
      return;
    }

    const filter = getComputedFilter();
    let isSubscribed = true;
    queueMicrotask(() => {
      if (isSubscribed) {
        setIsResolvingAudience(true);
      }
    });

    fetch(`/api/admin/mail/recipients?filter=${encodeURIComponent(filter)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.success) {
          setAudienceCount(data.count);
        }
      })
      .catch((err) => console.error("Error resolving audience:", err))
      .finally(() => {
        if (isSubscribed) setIsResolvingAudience(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [filterMode, selectedHackathonId, selectedRole, selectedSkill, directEmail]);

  // Apply Pre-made Templates
  const applyTemplate = (templateKey: string) => {
    const selectedHackathon = hackathons.find((h) => h.id === selectedHackathonId) || hackathons[0];
    const hackathonTitle = selectedHackathon?.title || "Upcoming Premier Hackathon";
    const hackathonSlug = selectedHackathon?.slug || "";

    switch (templateKey) {
      case "launch":
        setMailType("marketing");
        setSubject(`🚀 Announcing ${hackathonTitle} — Compete & Win Prizes!`);
        setPreheader(`Registrations are officially open for ${hackathonTitle}. Join top builders today.`);
        setContent(
          `Hi Participant,\n\nWe are thrilled to announce that **${hackathonTitle}** is officially live on Hack4Win!\n\n` +
          `Whether you are building autonomous AI agents, web applications, or decentralized software, this is your chance to compete for major cash prizes and showcase your skills to global judges.\n\n` +
          `### Key Highlights:\n` +
          `- **Total Prize Pool**: ${selectedHackathon?.prize_pool || "Substantial Cash Prizes"}\n` +
          `- **Format**: Online & Remote\n` +
          `- **Eligibility**: Open to all developers & teams worldwide\n\n` +
          `Form your team and get your project submission started before the deadline!`
        );
        setCtaText("Register for Challenge");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;

      case "deadline":
        setMailType("transactional");
        setSubject(`⏳ 24 Hours Left: Submit your project for ${hackathonTitle}`);
        setPreheader(`Final deadline approaching! Ensure your repository and video demo are submitted.`);
        setContent(
          `Hello Builders,\n\nThis is an urgent reminder that the submission window for **${hackathonTitle}** will strictly close in **24 hours**!\n\n` +
          `### Final Checklist Before Submission:\n` +
          `1. Ensure your GitHub repository is public with working code.\n` +
          `2. Record a 2-3 minute demonstration video showing your core user flow.\n` +
          `3. Complete all required fields on the project submission portal.\n\n` +
          `Late submissions will not be accepted by the judging panel. Good luck with your final push!`
        );
        setCtaText("Go to Submission Portal");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;

      case "winners":
        setMailType("marketing");
        setSubject(`🏆 Winners Announced: ${hackathonTitle} Results are Live!`);
        setPreheader(`Congratulations to the top teams and category winners! See who took the grand prizes.`);
        setContent(
          `Hey Participants,\n\nAfter comprehensive evaluation by our panel of industry judges, the official winners of **${hackathonTitle}** have been finalized!\n\n` +
          `Over hundreds of developers participated and submitted extraordinary solutions. We were blown away by the level of ingenuity, code quality, and polished execution.\n\n` +
          `Check out the podium winners, project demos, and track champions on the official leaderboard.`
        );
        setCtaText("View Leaderboard & Winners");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;

      case "update":
        setMailType("marketing");
        setSubject(`Hack4Win Monthly Developer Brief: New Challenges & Platform Updates`);
        setPreheader(`Discover our newest technical tracks, partner prizes, and hackathons.`);
        setContent(
          `Hey Developers,\n\nWelcome to this month's Hack4Win developer dispatch! We have exciting new competitions launching this month with expanded prize pools and sponsorship tracks.\n\n` +
          `### What's New:\n` +
          `- Expanded support for AI Agents & Multi-Agent hackathons\n` +
          `- Curated developer profiles with verified proficiency badges\n` +
          `- Live countdown clocks and calendar reminders for every stage\n\n` +
          `Explore the directory and start your next build!`
        );
        setCtaText("Explore All Hackathons");
        setCtaUrl("https://hack4win.online/hackathons");
        break;
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      setNotification({ type: "error", message: "Subject and body content are required." });
      return;
    }

    if (effectiveAudienceCount === 0) {
      setNotification({ type: "error", message: "No recipients match the selected audience filter." });
      return;
    }

    const confirmPrompt = await showConfirm({
      title: "Broadcast Email Campaign",
      message: `Are you sure you want to send this ${mailType.toUpperCase()} email "${subject}" to ${effectiveAudienceCount} recipients?`,
      confirmText: `Send to ${effectiveAudienceCount} Users`,
      cancelText: "Cancel",
    });
    if (!confirmPrompt) return;

    setIsSending(true);
    setNotification(null);

    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          preheader: preheader.trim() || undefined,
          type: mailType,
          target_filter: getComputedFilter(),
          target_label: getTargetLabel(),
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email");
      }

      setNotification({
        type: "success",
        message: data.message || `Email campaign dispatched to ${data.deliveredCount} recipients!`,
      });

      if (data.campaign) {
        setCampaigns((prev) => [data.campaign, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalCampaigns: prev.totalCampaigns + 1,
          totalSent: prev.totalSent + (data.deliveredCount || 0),
          marketingCount: mailType === "marketing" ? prev.marketingCount + 1 : prev.marketingCount,
          transactionalCount: mailType === "transactional" ? prev.transactionalCount + 1 : prev.transactionalCount,
        }));
      }

      // Reset form
      setSubject("");
      setPreheader("");
      setContent("");
      setActiveTab("compose");
    } catch (err) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Error sending campaign",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Mail className="size-3.5 text-primary" /> Campaigns Sent
            </span>
            <div className="text-2xl font-black text-foreground">{stats.totalCampaigns}</div>
            <p className="text-[0.7rem] text-muted-foreground">Historical dispatches</p>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Send className="size-3.5 text-primary" /> Emails Delivered
            </span>
            <div className="text-2xl font-black text-primary">{stats.totalSent.toLocaleString()}</div>
            <p className="text-[0.7rem] text-muted-foreground">Total messages delivered</p>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3.5 text-primary" /> Marketing Broadcasts
            </span>
            <div className="text-2xl font-black text-foreground">{stats.marketingCount}</div>
            <p className="text-[0.7rem] text-muted-foreground">News & launches</p>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-2xs">
          <CardContent className="p-5 space-y-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" /> Transactional Alerts
            </span>
            <div className="text-2xl font-black text-foreground">{stats.transactionalCount}</div>
            <p className="text-[0.7rem] text-muted-foreground">Deadlines & results</p>
          </CardContent>
        </Card>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Campaign Composer */}
      <Card className="border rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="py-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Email Dispatcher & Campaign Hub
            </CardTitle>
            <CardDescription className="text-xs">
              Broadcast marketing announcements or send targeted transactional alerts with audience segmentation.
            </CardDescription>
          </div>

          {/* Tab Switcher: Compose vs Live Preview */}
          <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "compose"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              Compose
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="size-3.5" />
              Inbox Preview
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSendMail} className="space-y-6">
            {/* Template Selector Bar */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary" /> 1-Click Templates:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("launch")}
                  className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                >
                  🚀 Hackathon Launch
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("deadline")}
                  className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                >
                  ⏳ 24h Deadline Warning
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("winners")}
                  className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                >
                  🏆 Winners Announcement
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("update")}
                  className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                >
                  📢 Monthly Newsletter
                </Button>
              </div>
            </div>

            {/* Target Audience & Type Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border">
              {/* Audience Targeting Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" /> Target Audience Filter
                  </Label>
                  <Badge variant="outline" className="text-xs font-bold rounded-full gap-1">
                    {isResolvingAudience ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Users className="size-3 text-primary" />
                    )}
                    <span>{effectiveAudienceCount} {effectiveAudienceCount === 1 ? "recipient" : "recipients"}</span>
                  </Badge>
                </div>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as "all" | "hackathon" | "role" | "skill" | "direct")}
                  className="w-full h-9 rounded-full border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">📢 All Registered Platform Users</option>
                  <option value="hackathon">🏆 Specific Hackathon Participants</option>
                  <option value="skill">⚡ Participants with Specific Tech Skill</option>
                  <option value="role">👥 By User Role (Participants / Organizers / Judges)</option>
                  <option value="direct">✉️ Single Direct Email Address (Test Mail)</option>
                </select>

                {/* Sub-Filters based on filter mode */}
                {filterMode === "hackathon" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Select Hackathon:</Label>
                    <select
                      value={selectedHackathonId}
                      onChange={(e) => setSelectedHackathonId(e.target.value)}
                      className="w-full h-8.5 rounded-full border border-input bg-background px-3 text-xs font-medium outline-none"
                    >
                      {hackathons.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.title} ({h.format})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {filterMode === "role" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Select Role:</Label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full h-8.5 rounded-full border border-input bg-background px-3 text-xs font-medium outline-none capitalize"
                    >
                      <option value="user">Participants (user)</option>
                      <option value="organizer">Competition Organizers (organizer)</option>
                      <option value="judge">Judging Panel (judge)</option>
                      <option value="admin">Administrators (admin)</option>
                    </select>
                  </div>
                )}

                {filterMode === "skill" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Select Developer Skill:</Label>
                    <select
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                      className="w-full h-8.5 rounded-full border border-input bg-background px-3 text-xs font-medium outline-none"
                    >
                      {skills.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {filterMode === "direct" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Recipient Email Address:</Label>
                    <Input
                      type="email"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="e.g. developer@gmail.com"
                      className="h-8.5 rounded-full text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Email Classification */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Classification & Nature
                </Label>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setMailType("marketing")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      mailType === "marketing"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Sparkles className="size-3.5 text-primary" /> Marketing Mail
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Announcements, promotional updates, and challenge discovery.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMailType("transactional")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      mailType === "transactional"
                        ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Zap className="size-3.5 text-amber-500" /> Transactional Mail
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Crucial deadline reminders, registration confirmations, judging updates.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Compose or Preview Panel */}
            {activeTab === "compose" ? (
              <div className="space-y-4">
                {/* Subject Line & Preheader */}
                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-xs font-semibold text-foreground">
                    Email Subject Line *
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. 🚀 Announcing Global AI Agents Hackathon 2026"
                    className="rounded-full text-xs h-9 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="preheader" className="text-xs font-semibold text-foreground">
                    Preheader / Inbox Preview Text
                  </Label>
                  <Input
                    id="preheader"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Brief snippet shown beside subject in email clients (e.g. Compete for ₹50,000 in prizes)"
                    className="rounded-full text-xs h-9"
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-xs font-semibold text-foreground">
                    Email Body Content (Markdown Supported) *
                  </Label>
                  <MarkdownEditor
                    value={content}
                    onChange={(val) => setContent(val)}
                    placeholder="Write your email body here... Markdown headings, lists, bold text are supported."
                    minRows={8}
                  />
                </div>

                {/* CTA Button Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Call-to-Action Button Label</Label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. View Hackathon Challenge"
                      className="rounded-full text-xs h-8.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Call-to-Action Link URL</Label>
                    <Input
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://hack4win.online/..."
                      className="rounded-full text-xs h-8.5"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Realistic Inbox HTML Preview */
              <div className="p-4 sm:p-6 rounded-2xl border bg-muted/30 space-y-4">
                <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                  <div className="space-y-0.5">
                    <div>
                      From: <strong className="text-foreground">Hack4Win Arena &lt;notifications@hack4win.online&gt;</strong>
                    </div>
                    <div>
                      To: <span className="text-foreground font-medium">{getTargetLabel()}</span>{" "}
                      <span className="text-muted-foreground">({effectiveAudienceCount} {effectiveAudienceCount === 1 ? "recipient" : "recipients"})</span>
                    </div>
                  </div>
                  <Badge
                    variant={mailType === "transactional" ? "outline" : "secondary"}
                    className="text-[10px] uppercase font-bold"
                  >
                    {mailType}
                  </Badge>
                </div>

                <div className="max-w-2xl mx-auto rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Trophy className="size-4.5" />
                      </div>
                      <span className="font-black text-lg tracking-tight">
                        Hack4Win<span className="text-muted-foreground text-xs font-normal">.online</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">Platform Dispatch</span>
                  </div>

                  {/* Subject & Message */}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-xl font-black text-foreground tracking-tight leading-snug">
                        {subject.trim() || "Email Subject Line Will Appear Here"}
                      </h2>
                      {preheader.trim() && (
                        <p className="text-xs text-muted-foreground italic mt-1 font-medium">
                          {preheader.trim()}
                        </p>
                      )}
                    </div>

                    {/* Rendered Markdown Body */}
                    <div className="pt-2 border-t text-sm leading-relaxed text-foreground/90">
                      {content.trim() ? (
                        <MarkdownPreview content={content} />
                      ) : (
                        <div className="text-muted-foreground text-xs italic py-6 text-center bg-muted/20 rounded-xl border border-dashed">
                          Nothing to preview yet. Switch to Compose to write your email content with markdown formatting.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA button */}
                  {ctaText.trim() && (
                    <div className="pt-3 text-center">
                      <a
                        href={ctaUrl.trim() || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-7 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
                      >
                        {ctaText.trim()}
                      </a>
                    </div>
                  )}

                  {/* Compliance Footer */}
                  <div className="pt-6 border-t text-[11px] text-muted-foreground text-center space-y-1">
                    <p>You received this because you are a registered participant on hack4win.online.</p>
                    <p>© 2026 Hack4Win Arena Inc. All rights reserved.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Bar */}
            <div className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>
                  Ready to send to <strong className="text-foreground">{effectiveAudienceCount}</strong> recipients ({getTargetLabel()})
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSending || !subject.trim() || !content.trim() || effectiveAudienceCount === 0}
                className="rounded-full px-8 gap-2 font-bold text-xs cursor-pointer w-full sm:w-auto"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span>Dispatch Campaign ({effectiveAudienceCount})</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Campaign History Log */}
      <Card className="border rounded-2xl shadow-xs">
        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="size-4 text-primary" /> Dispatched Campaign History ({campaigns.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Audit log of previous platform broadcasts and transactional emails.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No email campaigns dispatched yet. Use the composer above to send your first broadcast!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-3">Subject & Content</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Target Audience</th>
                    <th className="px-6 py-3">Delivered</th>
                    <th className="px-6 py-3">Sent At</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-3.5 max-w-xs">
                        <div className="font-bold text-foreground truncate">{camp.subject}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-sm mt-0.5">
                          {camp.content.slice(0, 80)}...
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge
                          variant={camp.type === "transactional" ? "outline" : "secondary"}
                          className="capitalize text-[10px] font-bold rounded-full"
                        >
                          {camp.type}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 font-medium text-foreground">
                        {camp.target_label}
                      </td>

                      <td className="px-6 py-3.5 font-extrabold text-primary">
                        {camp.recipient_count}
                      </td>

                      <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(camp.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold rounded-full gap-1">
                          <Check className="size-2.5" /> Sent
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewCampaign(camp)}
                          className="rounded-full h-7 px-3 text-xs font-semibold cursor-pointer text-primary hover:bg-primary/10 gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Campaign Preview Modal */}
      <Dialog open={!!previewCampaign} onOpenChange={(open) => !open && setPreviewCampaign(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Badge
                variant={previewCampaign?.type === "transactional" ? "outline" : "secondary"}
                className="capitalize text-[10px] font-bold rounded-full"
              >
                {previewCampaign?.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Sent to {previewCampaign?.recipient_count} recipients ({previewCampaign?.target_label})
              </span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground pt-1">
              {previewCampaign?.subject}
            </DialogTitle>
            {previewCampaign?.preheader && (
              <DialogDescription className="text-xs italic text-muted-foreground">
                {previewCampaign.preheader}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Rendered Body */}
          <div className="py-4 space-y-4">
            <div className="p-3.5 rounded-xl border bg-muted/20 text-xs">
              <div className="text-muted-foreground flex items-center justify-between">
                <span>Sender: <strong className="text-foreground">{previewCampaign?.sent_by || "Administrator"}</strong></span>
                <span>
                  {previewCampaign &&
                    new Date(previewCampaign.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-card shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Trophy className="size-3.5" />
                </div>
                <span className="font-extrabold text-sm tracking-tight">
                  Hack4Win<span className="text-muted-foreground text-xs font-normal">.online</span>
                </span>
              </div>

              <div className="text-sm leading-relaxed text-foreground/90">
                {previewCampaign?.content && <MarkdownPreview content={previewCampaign.content} />}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
