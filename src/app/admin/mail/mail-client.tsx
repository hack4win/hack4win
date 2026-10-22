"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Hackathon, Skill, EmailCampaign, EmailType, User } from "@/lib/db/types";
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
  Server,
  ShieldCheck,
  ExternalLink,
  UserCheck,
  Search,
  X,
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
  initialUsers?: User[];
}

export function MailClient({
  hackathons,
  skills,
  initialCampaigns,
  initialStats,
  totalUsersCount,
  initialUsers = [],
}: MailClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  // Targeting state
  const [filterMode, setFilterMode] = useState<"all" | "hackathon" | "role" | "skill" | "direct">("all");
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>(hackathons[0]?.id || "");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [selectedSkill, setSelectedSkill] = useState<string>(skills[0]?.name || "Next.js");
  const [directEmail, setDirectEmail] = useState<string>("");

  // Direct user picker state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [directInputMode, setDirectInputMode] = useState<"list" | "manual">("list");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Email form state
  const [mailType, setMailType] = useState<EmailType>("marketing");
  const [senderKey, setSenderKey] = useState<"NEWS" | "WELCOME" | "NOTIFICATIONS" | "REQUESTS" | "SUPPORT">("NEWS");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [content, setContent] = useState("");
  const [ctaText, setCtaText] = useState("View Hackathon Challenge");
  const [ctaUrl, setCtaUrl] = useState("https://hack4win.online/hackathons");

  // Brevo health check state
  const [brevoHealth, setBrevoHealth] = useState<{
    status: string;
    smtp?: { ok: boolean; message: string };
    api?: { ok: boolean; message: string };
    isIpRestricted?: boolean;
    detectedIp?: string;
    guidanceUrl?: string;
    guidanceMessage?: string | null;
  } | null>(null);
  const [isCheckingBrevo, setIsCheckingBrevo] = useState(false);
  const [isBrevoModalOpen, setIsBrevoModalOpen] = useState(false);

  const handleCheckBrevoHealth = async () => {
    setIsCheckingBrevo(true);
    try {
      const res = await fetch("/api/email/verify");
      const data = await res.json();
      setBrevoHealth(data);
      setIsBrevoModalOpen(true);
    } catch (err) {
      await showAlert({
        title: "Connection Test Failed",
        message: err instanceof Error ? err.message : "Unable to reach verification endpoint",
        type: "error",
      });
    } finally {
      setIsCheckingBrevo(false);
    }
  };

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

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter((u) =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [users, userSearchQuery]);

  const handleUserSearchChange = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) return;

    if (query.trim().length >= 2) {
      setIsSearchingUsers(true);
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query.trim())}&limit=20`);
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers((prev) => {
            const map = new Map(prev.map((u) => [u.id, u]));
            for (const u of data.users) {
              map.set(u.id, u);
            }
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn("User search error:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setDirectEmail(user.email);
  };

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
        if (selectedUser) {
          return `Direct: ${selectedUser.name || selectedUser.username || "User"} (${selectedUser.email})`;
        }
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
        setSenderKey("NEWS");
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

      case "direct_msg": {
        const name = selectedUser?.name || selectedUser?.username || "Builder";
        setFilterMode("direct");
        setMailType("transactional");
        setSenderKey("SUPPORT");
        setSubject(`Important Update from Hack4Win Platform Leadership`);
        setPreheader(`Personal message regarding your activity and opportunities on Hack4Win.`);
        setContent(
          `Hi ${name},\n\n` +
          `I am reaching out directly from the Hack4Win leadership team regarding your profile and contributions.\n\n` +
          `We noticed your active work on our hackathon platform and wanted to check in to see how your experience has been, or if there is anything our engineering team can assist you with.\n\n` +
          `Feel free to reply directly to this email with any thoughts, feature requests, or questions.`
        );
        setCtaText("Go to Hack4Win Dashboard");
        setCtaUrl("https://hack4win.online/dashboard");
        break;
      }

      case "payout": {
        const name = selectedUser?.name || selectedUser?.username || "Winner";
        setMailType("transactional");
        setSenderKey("NOTIFICATIONS");
        setSubject(`💰 Prize Disbursement Notification: ${hackathonTitle}`);
        setPreheader(`Your cash bounty for ${hackathonTitle} is queued for release.`);
        setContent(
          `Congratulations ${name}!\n\n` +
          `Following the conclusion of **${hackathonTitle}**, your prize payout has been approved by the competition organizers.\n\n` +
          `### Bounty Summary:\n` +
          `- **Hackathon**: ${hackathonTitle}\n` +
          `- **Prize Tier**: Grand Prize / Category Winner\n` +
          `- **Disbursement Method**: Direct Bank Wire / USDC / Stripe\n\n` +
          `Please visit your billing settings or reply to verify your tax form (W-8/W-9) and payout address so our finance team can release the funds without delay.`
        );
        setCtaText("Confirm Payout Details");
        setCtaUrl("https://hack4win.online/profile?tab=billing");
        break;
      }

      case "certificate": {
        const name = selectedUser?.name || selectedUser?.username || "Builder";
        setMailType("transactional");
        setSenderKey("WELCOME");
        setSubject(`🎓 Certificate of Achievement: ${hackathonTitle}`);
        setPreheader(`Your official verified digital completion credential has been generated.`);
        setContent(
          `Dear ${name},\n\n` +
          `Congratulations on successfully participating in **${hackathonTitle}**!\n\n` +
          `Your dedication, ingenuity, and high-impact build have earned you an official Hack4Win Certificate of Achievement.\n\n` +
          `### Credential Details:\n` +
          `- **Recipient**: ${name}\n` +
          `- **Event**: ${hackathonTitle}\n` +
          `- **Verification Status**: Cryptographically Signed & Verifiable\n\n` +
          `You can download your high-resolution certificate and add the verified credential directly to your LinkedIn profile.`
        );
        setCtaText("View Verified Certificate");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;
      }

      case "survey": {
        const name = selectedUser?.name || selectedUser?.username || "Builder";
        setMailType("marketing");
        setSenderKey("NEWS");
        setSubject(`📋 How Was Your Experience in ${hackathonTitle}? (3-Min Survey)`);
        setPreheader(`Help us shape the future of Hack4Win competitions with your quick feedback.`);
        setContent(
          `Hi ${name},\n\n` +
          `Now that **${hackathonTitle}** has wrapped up, we would love to hear your honest thoughts!\n\n` +
          `Your feedback directly helps us improve the platform, judging fairness, workshops, and sponsor prize tracks for upcoming events.\n\n` +
          `It only takes about 3 minutes to complete, and all respondents will be entered into our monthly developer swag draw.`
        );
        setCtaText("Start 3-Minute Survey");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;
      }

      case "warning": {
        const name = selectedUser?.name || selectedUser?.username || "User";
        setMailType("transactional");
        setSenderKey("REQUESTS");
        setSubject(`⚠️ Account Notice: Community Guidelines & Fair Play Compliance`);
        setPreheader(`Please review an important notice regarding Hack4Win platform policies.`);
        setContent(
          `Hello ${name},\n\n` +
          `This is an administrative communication regarding your account activity on Hack4Win.\n\n` +
          `Our integrity monitoring has identified a potential issue regarding fair competition rules (e.g. codebase pre-existence, code duplication, or terms of service compliance).\n\n` +
          `Please review our platform guidelines and submit any necessary clarification within **48 hours** to ensure your account remains in good standing.`
        );
        setCtaText("Review Community Guidelines");
        setCtaUrl("https://hack4win.online/terms");
        break;
      }

      case "approved": {
        const name = selectedUser?.name || selectedUser?.username || "Builder";
        setMailType("transactional");
        setSenderKey("NOTIFICATIONS");
        setSubject(`✅ Project Submission Approved for Judging in ${hackathonTitle}`);
        setPreheader(`Your project has passed compliance checks and advanced to evaluator scoring.`);
        setContent(
          `Hi ${name},\n\n` +
          `We are pleased to inform you that your submission for **${hackathonTitle}** has passed our compliance checklist and has been officially forwarded to the technical judging panel!\n\n` +
          `### What Happens Next?\n` +
          `1. Judges will score your repo, live demo, and video according to the rubric.\n` +
          `2. Keep your public demo links and repositories active throughout the judging period.\n` +
          `3. Final scores and winner podiums will be published on the leaderboard when evaluation concludes.`
        );
        setCtaText("View Project Scorecard");
        setCtaUrl(`https://hack4win.online/hackathons/${hackathonSlug}`);
        break;
      }
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
          sender_key: senderKey,
          target_filter: getComputedFilter(),
          target_label: getTargetLabel(),
          content: content.trim(),
          cta_text: ctaText.trim() || undefined,
          cta_url: ctaUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email");
      }

      setNotification({
        type: "success",
        message: data.warning
          ? `${data.message} — Notice: ${data.warning}`
          : data.message || `Email campaign dispatched to ${data.deliveredCount} recipients!`,
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
      {/* Brevo Email Service Integration Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border bg-card/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Server className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">Brevo Email Service</span>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Domain: hack4win.online
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                Port 587 STARTTLS & REST API v3
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              DKIM & DMARC verified sender identities active. Automatic REST API & SMTP Relay failover.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCheckBrevoHealth}
          disabled={isCheckingBrevo}
          className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
        >
          {isCheckingBrevo ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5 text-primary" />}
          Test Brevo Connection
        </Button>
      </div>

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
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> 1-Click Production Templates (10):
                </span>
                {selectedUser && (
                  <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 gap-1 bg-primary/5">
                    <UserCheck className="size-3" /> Auto-personalizing for {selectedUser.name || selectedUser.email}
                  </Badge>
                )}
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Direct Messaging & User Awards:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate("direct_msg")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-primary/10 border-primary/40 text-primary font-bold hover:bg-primary/20"
                    >
                      💬 Direct User Message
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate("payout")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold hover:bg-amber-500/20"
                    >
                      💰 Prize Payout Notice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate("certificate")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold hover:bg-emerald-500/20"
                    >
                      🎓 Certificate Award
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate("warning")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-destructive/10 border-destructive/30 text-destructive font-semibold hover:bg-destructive/20"
                    >
                      ⚠️ Guidelines Warning
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Hackathons & Submissions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
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
                      onClick={() => applyTemplate("approved")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                    >
                      ✅ Project Approved
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
                      onClick={() => applyTemplate("survey")}
                      className="rounded-full text-xs h-7.5 cursor-pointer bg-background"
                    >
                      📋 Post-Event Survey
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
                  <option value="direct">🎯 Direct Message to User / Single Email</option>
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
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <UserCheck className="size-3 text-primary" /> Target Recipient:
                      </Label>
                      <div className="inline-flex rounded-lg bg-muted/40 p-0.5 border text-[10px]">
                        <button
                          type="button"
                          onClick={() => setDirectInputMode("list")}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            directInputMode === "list" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Select User ({users.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectInputMode("manual")}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            directInputMode === "manual" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Custom Email
                        </button>
                      </div>
                    </div>

                    {directInputMode === "list" ? (
                      <div className="space-y-2">
                        {selectedUser ? (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 overflow-hidden">
                                {selectedUser.image ? (
                                  <img src={selectedUser.image} alt={selectedUser.name || ""} className="size-full object-cover" />
                                ) : (
                                  (selectedUser.name?.[0] || selectedUser.email[0] || "U")
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {selectedUser.name || "Unnamed Builder"}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4 px-1.5">
                                    {selectedUser.role}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate font-mono">
                                  {selectedUser.email} {selectedUser.username ? `(@${selectedUser.username})` : ""}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(null);
                                setDirectEmail("");
                              }}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                            >
                              <X className="size-3.5 mr-1" /> Change
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                              <Input
                                type="text"
                                value={userSearchQuery}
                                onChange={(e) => handleUserSearchChange(e.target.value)}
                                placeholder="Search user by name, email, or @username..."
                                className="h-8.5 pl-8 text-xs rounded-lg"
                              />
                              {isSearchingUsers && (
                                <Loader2 className="size-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                              )}
                            </div>

                            <div className="max-h-48 overflow-y-auto rounded-xl border bg-background/80 divide-y divide-border/60">
                              {filteredUsers.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                  No users found matching &ldquo;{userSearchQuery}&rdquo;
                                </div>
                              ) : (
                                filteredUsers.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => handleSelectUser(u)}
                                    className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="size-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] uppercase shrink-0 text-foreground overflow-hidden">
                                        {u.image ? (
                                          <img src={u.image} alt={u.name || ""} className="size-full object-cover" />
                                        ) : (
                                          (u.name?.[0] || u.email[0] || "U")
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                                          <span>{u.name || "Unnamed"}</span>
                                          <span className="text-[10px] font-normal text-muted-foreground">
                                            {u.username ? `@${u.username}` : ""}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate font-mono">
                                          {u.email}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold h-4 px-1 shrink-0 ml-2">
                                      {u.role}
                                    </Badge>
                                  </button>
                                ))
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center justify-between px-1">
                              <span>Showing {filteredUsers.length} of {users.length} loaded users</span>
                              <span className="font-medium text-primary">Click a user to select</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Input
                          type="email"
                          value={directEmail}
                          onChange={(e) => {
                            setDirectEmail(e.target.value);
                            setSelectedUser(null);
                          }}
                          placeholder="e.g. developer@gmail.com"
                          className="h-8.5 rounded-lg text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Type any custom email address to test deliverability or message an external contact.
                        </p>
                      </div>
                    )}
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
                    onClick={() => {
                      setMailType("marketing");
                      setSenderKey("NEWS");
                    }}
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
                    onClick={() => {
                      setMailType("transactional");
                      setSenderKey("NOTIFICATIONS");
                    }}
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

            {/* Verified Sender Identity Bar */}
            <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> Verified Brevo Sender Identity
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  hack4win.online &bull; DKIM & DMARC Active
                </Badge>
              </div>

              <select
                value={senderKey}
                onChange={(e) => setSenderKey(e.target.value as "NEWS" | "NOTIFICATIONS" | "WELCOME" | "REQUESTS" | "SUPPORT")}
                className="w-full h-9 rounded-full border border-input bg-background px-3 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="NEWS">Hack4Win News (news@hack4win.online) &mdash; Best for Marketing & Newsletters</option>
                <option value="NOTIFICATIONS">Hack4Win Notifications (notifications@hack4win.online) &mdash; Best for System Alerts</option>
                <option value="WELCOME">Hack4Win Welcome (welcome@hack4win.online) &mdash; Best for Onboarding & Welcomes</option>
                <option value="REQUESTS">Hack4Win Requests (request@hack4win.online) &mdash; Best for Transactional & Password Resets</option>
                <option value="SUPPORT">Hack4Win Support (support@hack4win.online) &mdash; Best for Inquiries & Helpdesk</option>
              </select>
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

      {/* Brevo Service Connection & Diagnostics Modal */}
      <Dialog open={isBrevoModalOpen} onOpenChange={setIsBrevoModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Badge
                className={`text-[10px] font-bold rounded-full ${
                  brevoHealth?.status === "connected"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : brevoHealth?.isIpRestricted
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }`}
              >
                {brevoHealth?.status === "connected"
                  ? "Connected & Live"
                  : brevoHealth?.isIpRestricted
                  ? "IP Restricted (Requires Action)"
                  : "Handshake Failed"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                smtp-relay.brevo.com:587
              </span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground pt-1">
              Brevo Email Service Diagnostics
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Health check report for Brevo REST API v3 and SMTP Relay on hack4win.online
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* IP Security Notice Banner if restricted */}
            {brevoHealth?.isIpRestricted && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Brevo Authorized IP Security Rule Detected</span>
                </div>
                <p className="leading-relaxed">
                  Your Brevo account has the &ldquo;Authorized IP addresses&rdquo; security restriction enabled. The current server IP {brevoHealth?.detectedIp ? <code className="font-mono bg-background px-1.5 py-0.5 rounded font-bold">{brevoHealth.detectedIp}</code> : "of this environment"} has not been added to your authorized IP list.
                </p>
                <div className="pt-1">
                  <a
                    href="https://app.brevo.com/security/authorised_ips"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors"
                  >
                    Manage Brevo Authorized IPs <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tip: In your Brevo dashboard, you can disable the IP restriction toggle or add your server IP to allow live dispatches.
                </p>
              </div>
            )}

            {/* Handshake Details */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>1. SMTP Relay (Port 587 STARTTLS)</span>
                  <Badge variant={brevoHealth?.smtp?.ok ? "outline" : "secondary"} className="text-[10px]">
                    {brevoHealth?.smtp?.ok ? "Ready" : "Blocked / 525"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono break-words">
                  {brevoHealth?.smtp?.message}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>2. Direct REST API v3 (HTTPS)</span>
                  <Badge variant={brevoHealth?.api?.ok ? "outline" : "secondary"} className="text-[10px]">
                    {brevoHealth?.api?.ok ? "Ready" : "Blocked / 401"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono break-words">
                  {brevoHealth?.api?.message}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                <div className="text-xs font-bold text-foreground">
                  3. Verified Sender Addresses
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                  <div>&bull; <strong>News:</strong> news@hack4win.online</div>
                  <div>&bull; <strong>Welcome:</strong> welcome@hack4win.online</div>
                  <div>&bull; <strong>Notifications:</strong> notifications@hack4win.online</div>
                  <div>&bull; <strong>Requests:</strong> request@hack4win.online</div>
                  <div>&bull; <strong>Support:</strong> support@hack4win.online</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBrevoModalOpen(false)}
              className="rounded-full text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
