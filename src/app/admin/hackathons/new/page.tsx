"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateSlug } from "@/lib/utils/slug";
import type {
  HackathonFormat,
  HackathonStatus,
  PrizeTier,
  Tag as TagType,
} from "@/lib/db/types";
import { getHackathonStatus } from "@/lib/db/types";
import { isValidHttpUrl } from "@/lib/url-validation";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImageUploader } from "@/components/ui/image-uploader";
import { PrizesBuilder } from "@/components/ui/prizes-builder";
import { RulesBuilder, DEFAULT_HACKATHON_RULES } from "@/components/ui/rules-builder";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  ArrowLeft,
  Trophy,
  Sparkles,
  Calendar,
  Users,
  MapPin,
  Tag as TagIcon,
  Globe,
  Loader2,
  AlertCircle,
  Eye,
  Plus,
  Radio,
  Clock,
  Award,
  Lock,
  Key,
  Shield,
  School,
  UserCheck,
  Copy,
  Check,
  RefreshCw,
  Share2,
} from "lucide-react";

const PRESET_BANNERS = [
  {
    name: "Cyber Neon",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Deep AI Cosmos",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Modern Code",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Quantum Circuit",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  },
];

const PRESET_COVERS = [
  {
    name: "AI Spark",
    url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Terminal",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Hexagon Net",
    url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=300&q=80",
  },
];

export default function CreateHackathonPage() {
  const router = useRouter();
  const { showAlert } = useModalAlert();

  // Basic Details
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [tagline, setTagline] = useState("");
  const [organizerName, setOrganizerName] = useState("Hack4Win Arena");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Publication Status (Draft vs Published only)
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("published");

  // Format & Location
  const [format, setFormat] = useState<HackathonFormat>("online");
  const [location, setLocation] = useState("Global (Online)");

  // Schedule
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 86400000 * 16).toISOString().slice(0, 16)
  );
  const [submissionDeadline, setSubmissionDeadline] = useState(() =>
    new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 16)
  );
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [hasParticipantLimit, setHasParticipantLimit] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState("");

  // Private Hackathon & Access Control
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [allowedDomainsStr, setAllowedDomainsStr] = useState("");
  const [invitedEmailsStr, setInvitedEmailsStr] = useState("");
  const [inviteToken, setInviteToken] = useState(() => Math.random().toString(36).substring(2, 12));
  const [copiedInvite, setCopiedInvite] = useState(false);

  const generateAccessCode = () => {
    const prefix = title
      ? title.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
      : "CAMPUS";
    const rand = Math.floor(1000 + Math.random() * 9000);
    setAccessCode(`${prefix || "CAMPUS"}-${rand}`);
  };

  // Prizes & Currency
  const [currency, setCurrency] = useState("$");
  const [prizes, setPrizes] = useState<PrizeTier[]>([
    { id: "1", title: "1st Place (Grand Prize)", amount: "25000", description: "Overall winner" },
    { id: "2", title: "2nd Place", amount: "15000", description: "Runner up" },
    { id: "3", title: "3rd Place", amount: "10000", description: "Third place" },
  ]);

  // Tags System (Database-backed)
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["AI & Agents", "Open Source"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Competition Rules & Eligibility
  const [rules, setRules] = useState<string[]>(DEFAULT_HACKATHON_RULES);

  // Images & Media
  const [bannerUrl, setBannerUrl] = useState(PRESET_BANNERS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(PRESET_COVERS[0].url);

  // Markdown Description
  const [description, setDescription] = useState(`## Overview
Welcome to this premier hackathon hosted on **Hack4Win**! Build cutting-edge solutions, collaborate with talented developers, and compete for substantial cash prizes.

### Tracks & Challenge Areas
- **Track 1: AI & Automation**: Autonomous workflows and multi-agent systems.
- **Track 2: Web3 & Decentralized Tools**: Secure, user-centric blockchain applications.
- **Track 3: Open Innovation**: Solve high-impact problems across developer productivity, healthcare, or climate.

### Submission Guidelines
1. Working prototype with public GitHub repository.
2. 3-minute video pitch & demonstration.
3. Detailed README with installation and testing instructions.
`);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available tags from database on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const res = await fetch("/api/admin/tags");
        const data = await res.json();
        if (data.tags) {
          setAvailableTags(data.tags);
        }
      } catch (err) {
        console.warn("Failed to load tags:", err);
      }
    }
    loadTags();
  }, []);

  // Title to slug generator
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) {
      setSlug(generateSlug(val));
    }
  };

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  // Add custom tag: immediately saves to public.tags in database and selects it
  const handleAddCustomTag = async (e: React.FormEvent | React.KeyboardEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();

    const name = customTagInput.trim();
    if (!name) return;

    // If already in selectedTags, just clear input
    if (selectedTags.includes(name)) {
      setCustomTagInput("");
      return;
    }

    setIsAddingTag(true);
    try {
      // Save tag to database
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: "technology" }),
      });

      const data = await res.json();
      if (res.ok && data.tag) {
        // Add to available tags if not present
        if (!availableTags.some((t) => t.id === data.tag.id)) {
          setAvailableTags((prev) => [...prev, data.tag]);
        }
      }

      // Add to selectedTags for this hackathon
      setSelectedTags((prev) => [...prev, name]);
      setCustomTagInput("");
    } catch (err) {
      console.error("Failed to add custom tag:", err);
      // Still select locally as fallback
      setSelectedTags((prev) => [...prev, name]);
      setCustomTagInput("");
    } finally {
      setIsAddingTag(false);
    }
  };

  // Calculate formatted total prize pool
  const cashPrizes = prizes.filter((p) => p.type !== "non-cash");
  const nonCashPrizes = prizes.filter((p) => p.type === "non-cash");

  const totalCashNumber = cashPrizes.reduce((acc, curr) => {
    const amountStr = curr?.amount != null ? String(curr.amount) : "";
    const num = parseFloat(amountStr.replace(/[^0-9.]/g, "")) || 0;
    return acc + num;
  }, 0);

  let formattedPrizePool = "";
  if (totalCashNumber > 0 && nonCashPrizes.length > 0) {
    formattedPrizePool = `${currency}${totalCashNumber.toLocaleString()} + Devices & Perks`;
  } else if (totalCashNumber > 0) {
    formattedPrizePool = `${currency}${totalCashNumber.toLocaleString()}`;
  } else if (nonCashPrizes.length > 0) {
    if (nonCashPrizes.length === 1 && nonCashPrizes[0].item_name) {
      formattedPrizePool = nonCashPrizes[0].item_name;
    } else {
      formattedPrizePool = "Devices, Tech Gear & Perks";
    }
  } else {
    formattedPrizePool = `${currency}0`;
  }

  // Dynamic preview status
  const previewStatus = getHackathonStatus({
    status: publishStatus,
    start_date: startDate,
    end_date: endDate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedTagline = tagline.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      const msg = "Please enter a hackathon title of at least 3 characters.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (!trimmedTagline || trimmedTagline.length < 5) {
      const msg = "Please enter a hackathon tagline of at least 5 characters.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (!trimmedDescription || trimmedDescription.length < 20) {
      const msg = "Please enter a comprehensive hackathon description (at least 20 characters).";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const deadline = new Date(submissionDeadline).getTime();

    if (isNaN(start) || isNaN(end)) {
      const msg = "Please enter valid start and end dates.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (end <= start) {
      const msg = "The hackathon end date must be after the start date.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (!isNaN(deadline) && deadline < start) {
      const msg = "Deadline cannot be earlier than the start date";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (!isNaN(deadline) && deadline > end) {
      const msg = "The project submission deadline cannot be later than the hackathon end date.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    const teamSize = Number(maxTeamSize);
    if (!teamSize || teamSize < 1 || teamSize > 50) {
      const msg = "Maximum team size must be between 1 and 50 members.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (hasParticipantLimit) {
      const participantLimit = Number(maxParticipants);
      if (!participantLimit || participantLimit < 1) {
        const msg = "Please provide a valid participant limit of at least 1, or toggle off the limit.";
        setErrorMessage(msg);
        setIsSubmitting(false);
        await showAlert({ title: "Validation Error", message: msg, type: "warning" });
        return;
      }
    }

    if (websiteUrl.trim() && !isValidHttpUrl(websiteUrl.trim())) {
      const msg = "Official website URL must be a valid HTTP or HTTPS address.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (bannerUrl.trim() && !isValidHttpUrl(bannerUrl.trim())) {
      const msg = "Banner image URL must be a valid HTTP or HTTPS address.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    if (thumbnailUrl.trim() && !isValidHttpUrl(thumbnailUrl.trim())) {
      const msg = "Thumbnail image URL must be a valid HTTP or HTTPS address.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      await showAlert({ title: "Validation Error", message: msg, type: "warning" });
      return;
    }

    try {
      const payload = {
        title: trimmedTitle,
        slug: slug.trim() || generateSlug(trimmedTitle),
        tagline: trimmedTagline,
        description: trimmedDescription,
        format,
        location: location.trim(),
        prize_pool: formattedPrizePool,
        currency,
        prizes,
        tags: selectedTags,
        rules,
        start_date: startDate,
        end_date: endDate,
        submission_deadline: submissionDeadline,
        max_team_size: teamSize,
        max_participants:
          hasParticipantLimit && Number(maxParticipants) > 0
            ? Number(maxParticipants)
            : null,
        website_url: websiteUrl.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        organizer_name: organizerName.trim(),
        status: publishStatus, // "draft" or "published"
        is_private: isPrivate,
        access_code: isPrivate && accessCode.trim() ? accessCode.trim().toUpperCase() : undefined,
        allowed_email_domains: isPrivate && allowedDomainsStr.trim()
          ? allowedDomainsStr.split(/[\n,; ]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean)
          : undefined,
        invited_emails: isPrivate && invitedEmailsStr.trim()
          ? invitedEmailsStr.split(/[\n,; ]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
          : undefined,
        invite_token: isPrivate ? inviteToken : undefined,
      };

      const res = await fetch("/api/admin/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create hackathon");
      }

      await showAlert({
        title: "Hackathon Created!",
        message: `"${trimmedTitle}" has been successfully published.`,
        type: "success",
      });
      router.push("/admin/hackathons");
      router.refresh();
    } catch (err) {
      console.error("Hackathon creation error:", err);
      const errMsg = err instanceof Error ? err.message : "Error creating hackathon";
      setErrorMessage(errMsg);
      await showAlert({
        title: "Creation Failed",
        message: errMsg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild className="rounded-full">
            <Link href="/admin/hackathons">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Create New Hackathon
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure competition prizes, media, markdown guidelines, and publish to community.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            asChild
            className="rounded-full"
            disabled={isSubmitting}
          >
            <Link href="/admin/hackathons">Cancel</Link>
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !tagline}
            className="rounded-full gap-2 shadow-sm px-6 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isSubmitting
              ? "Saving..."
              : publishStatus === "draft"
              ? "Save as Draft"
              : "Publish Hackathon"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl text-sm bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Configuration */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Section: Publication Mode */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold">
                Publication Mode
              </CardTitle>
              <CardDescription>
                Choose whether this hackathon is ready to be published or saved as an internal draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPublishStatus("published")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    publishStatus === "published"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" /> Publish Now
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Publicly accessible. Display status (Upcoming, Live Now, Ended) is automatically driven by start & end dates.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishStatus("draft")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    publishStatus === "draft"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" /> Save as Draft
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Hidden from public directories until you decide to publish.
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Section: Access & Privacy (Private College / Campus Hackathon) */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="size-4 text-purple-600 dark:text-purple-400" /> Access & Privacy Controls
                </CardTitle>
                <CardDescription className="text-xs">
                  Host an open global challenge or restrict participation to your college students and invitees.
                </CardDescription>
              </div>
              <Badge variant={isPrivate ? "default" : "outline"} className={isPrivate ? "bg-purple-600 text-white" : ""}>
                {isPrivate ? "Private Campus Mode" : "Public Marketplace"}
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Privacy Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    !isPrivate
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Globe className="size-4 text-primary" /> Public Competition
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Listed on the public hackathons marketplace. Any authenticated builder can join.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPrivate(true);
                    if (!accessCode) generateAccessCode();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isPrivate
                      ? "border-purple-600 bg-purple-500/10 ring-2 ring-purple-600/20"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <School className="size-4" /> Private / College Exclusive
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Restricted to your campus students, university domain emails, or pre-registered roster.
                  </div>
                </button>
              </div>

              {/* Private Configuration Fields */}
              {isPrivate && (
                <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    <Shield className="size-4" /> Campus Access Gate Settings
                  </div>

                  {/* 1. Student Access Code / Passcode */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="accessCode" className="text-xs font-semibold flex items-center gap-1.5">
                        <Key className="size-3.5 text-purple-600" /> Student Access Code / Passcode
                      </Label>
                      <button
                        type="button"
                        onClick={generateAccessCode}
                        className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <RefreshCw className="size-3" /> Auto-Generate
                      </button>
                    </div>
                    <Input
                      id="accessCode"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. IITB-AI-2026 or STANFORD-HACK"
                      className="font-mono uppercase font-bold tracking-wider"
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      Students can enter this passcode on the hackathon page to unlock registration.
                    </p>
                  </div>

                  {/* 2. Allowed College Email Domains */}
                  <div className="space-y-1.5">
                    <Label htmlFor="allowedDomains" className="text-xs font-semibold flex items-center gap-1.5">
                      <School className="size-3.5 text-purple-600" /> Approved College Email Domains
                    </Label>
                    <Input
                      id="allowedDomains"
                      value={allowedDomainsStr}
                      onChange={(e) => setAllowedDomainsStr(e.target.value)}
                      placeholder="e.g. iitb.ac.in, mit.edu, stanford.edu (comma separated)"
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      Any student logging in with an email matching these domains (e.g. <code>@iitb.ac.in</code>) can register automatically without needing an access code.
                    </p>
                  </div>

                  {/* 3. Pre-Approved Student Whitelist */}
                  <div className="space-y-1.5">
                    <Label htmlFor="invitedEmails" className="text-xs font-semibold flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-purple-600" /> Whitelisted Student Emails (Roster)
                    </Label>
                    <textarea
                      id="invitedEmails"
                      rows={3}
                      value={invitedEmailsStr}
                      onChange={(e) => setInvitedEmailsStr(e.target.value)}
                      placeholder="student1@college.edu, student2@gmail.com (separated by commas or newlines)"
                      className="w-full text-xs font-mono p-3 rounded-xl border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-y"
                    />
                    <p className="text-[0.7rem] text-muted-foreground">
                      Specific student emails allowed to register regardless of their email provider domain.
                    </p>
                  </div>

                  {/* 4. One-Click Secret Invite Link */}
                  <div className="p-3.5 rounded-xl bg-background/80 border space-y-1.5">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Share2 className="size-3.5 text-purple-600" /> Secret Shareable Invite Link
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const origin = typeof window !== "undefined" ? window.location.origin : "https://hack4win.online";
                          const targetSlug = slug.trim() || generateSlug(title || "challenge");
                          const link = `${origin}/hackathons/${targetSlug}?invite=${inviteToken}`;
                          navigator.clipboard.writeText(link);
                          setCopiedInvite(true);
                          setTimeout(() => setCopiedInvite(false), 2000);
                        }}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedInvite ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        {copiedInvite ? "Copied Link!" : "Copy Secret Link"}
                      </button>
                    </div>
                    <p className="text-[0.7rem] font-mono text-muted-foreground truncate">
                      {typeof window !== "undefined" ? window.location.origin : "https://hack4win.online"}/hackathons/{slug.trim() || generateSlug(title || "challenge")}?invite={inviteToken}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Distribute this link in college groups or emails. Visiting with this link automatically unlocks registration for the student.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section: General Info */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="size-4 text-primary" /> General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Hackathon Title *
                </Label>
                <Input
                  id="title"
                  required
                  placeholder="e.g. Global AI Agents Sprint 2026"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="rounded-full h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-xs font-semibold">
                  URL Slug (Auto-generated) *
                </Label>
                <div className="flex items-center rounded-full border bg-muted/30 px-3.5 h-10">
                  <span className="text-xs text-muted-foreground mr-1">hack4win.online/hackathons/</span>
                  <input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    placeholder="ai-agents-sprint"
                    className="flex-1 bg-transparent text-xs font-mono outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tagline" className="text-xs font-semibold">
                  Catchy Tagline / Hook *
                </Label>
                <Input
                  id="tagline"
                  required
                  placeholder="Build autonomous AI agents that solve real-world industry problems."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="rounded-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="organizer" className="text-xs font-semibold">
                    Organizer / Host Name *
                  </Label>
                  <Input
                    id="organizer"
                    required
                    placeholder="e.g. OpenAI Ecosystem & Hack4Win"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-semibold">
                    Official Website / Link
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://hackathon.example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Format, Location & Capacity */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Format & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Competition Format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["online", "in-person", "hybrid"] as HackathonFormat[]).map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => {
                          setFormat(f);
                          if (f === "online") setLocation("Global (Online)");
                        }}
                        className={`py-2 px-3 text-xs font-medium rounded-full capitalize border transition-all cursor-pointer ${
                          format === f
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "bg-card hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-semibold">
                    Location Name
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Global (Online) or City, Country"
                    className="rounded-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="teamsize" className="text-xs font-semibold">
                    Maximum Team Size (Members)
                  </Label>
                  <Input
                    id="teamsize"
                    type="number"
                    min={1}
                    max={12}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                    className="rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxparticipants" className="text-xs font-semibold">
                      Participant Capacity Limit
                    </Label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasParticipantLimit}
                        onChange={(e) => setHasParticipantLimit(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      <span>Limit Spots</span>
                    </label>
                  </div>
                  {hasParticipantLimit ? (
                    <Input
                      id="maxparticipants"
                      type="number"
                      min={1}
                      placeholder="e.g. 100 participants"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-10 px-4 rounded-full border border-dashed flex items-center text-xs text-muted-foreground bg-muted/20">
                      Unlimited Participants (No Cap)
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Multiple Prizes Builder & Currency */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="size-4 text-primary" /> Prizes & Winner Breakdown
              </CardTitle>
              <CardDescription>
                Configure prize currency and break down awards for multiple winners and special tracks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <PrizesBuilder
                currency={currency}
                onCurrencyChange={setCurrency}
                prizes={prizes}
                onPrizesChange={setPrizes}
              />
            </CardContent>
          </Card>

          {/* Section: Tags & Tracks (Database-Backed) */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TagIcon className="size-4 text-primary" /> Competition Tags & Tracks
                </CardTitle>
                <CardDescription>
                  Select from existing database tags or add new custom tags.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs rounded-full">
                <Link href="/admin/tags" target="_blank">
                  Manage Tags Table &rarr;
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Tag selector chips */}
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.name);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Input: saves to DB immediately */}
              <div className="pt-2 border-t">
                <Label className="text-xs font-semibold mb-2 block">
                  Add Custom Tag (Instantly Saved to Database)
                </Label>
                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    placeholder="e.g. Agentic AI, Autonomous Workflows"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag(e);
                      }
                    }}
                    className="rounded-full text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomTag}
                    disabled={isAddingTag || !customTagInput.trim()}
                    className="rounded-full text-xs h-9 shrink-0 gap-1 cursor-pointer"
                  >
                    {isAddingTag ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Add Tag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Competition Schedule */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Schedule & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start" className="text-xs font-semibold">
                  Start Date *
                </Label>
                <Input
                  id="start"
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-xs font-semibold">
                  Submission Deadline *
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  required
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="rounded-full text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end" className="text-xs font-semibold">
                  End Date *
                </Label>
                <Input
                  id="end"
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-full text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Images (Neon S3 Upload, Presets, URL) */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Banner & Cover Images
              </CardTitle>
              <CardDescription>
                Upload directly to S3 cloud storage, choose preset art, or specify an image URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Banner Image */}
              <ImageUploader
                label="Banner Image (Hero Background)"
                value={bannerUrl}
                onChange={setBannerUrl}
                presets={PRESET_BANNERS}
                folder="hackathons/banners"
                aspectRatio="banner"
              />

              {/* Cover / Thumbnail Image */}
              <div className="pt-4 border-t">
                <ImageUploader
                  label="Cover Image / Card Thumbnail"
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                  presets={PRESET_COVERS}
                  folder="hackathons/covers"
                  aspectRatio="square"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Markdown Description with Live Preview */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="text-base font-semibold">
                Hackathon Description & Guidelines (Markdown Supported) *
              </CardTitle>
              <CardDescription>
                Use the formatting toolbar to format headings, bullet points, code blocks, and links.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write rich markdown description..."
                minRows={12}
              />
            </CardContent>
          </Card>

          {/* Section: Competition Rules & Eligibility */}
          <RulesBuilder
            rules={rules}
            onRulesChange={setRules}
            maxTeamSize={Number(maxTeamSize) || 4}
          />

          {/* Bottom Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              asChild
              className="rounded-full"
            >
              <Link href="/admin/hackathons">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title || !tagline}
              className="rounded-full gap-2 shadow-sm px-7 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isSubmitting
                ? "Saving..."
                : publishStatus === "draft"
                ? "Save as Draft"
                : "Publish Hackathon"}
            </Button>
          </div>
        </form>

        {/* Right 1 Col: Live Participant Preview Card */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="size-3.5 text-primary" /> Live Card Preview
            </div>

            <Card className="border shadow-md rounded-2xl overflow-hidden hover:border-primary/50 transition-all bg-card">
              {/* Banner */}
              <div className="h-36 w-full bg-muted relative overflow-hidden">
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Hackathon banner preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                    <Trophy className="size-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-black/70 backdrop-blur-md text-white text-xs border-0 capitalize">
                    {format}
                  </Badge>
                </div>
              </div>

              <CardHeader className="gap-2 pb-3">
                <div className="flex items-center justify-between">
                  {/* Dynamic Status Display calculated from dates! */}
                  {previewStatus === "ongoing" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
                      <Radio className="size-3 animate-pulse" /> Live Now
                    </Badge>
                  ) : previewStatus === "upcoming" ? (
                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold gap-1">
                      <Clock className="size-3" /> Upcoming
                    </Badge>
                  ) : previewStatus === "ended" ? (
                    <Badge variant="outline" className="text-muted-foreground text-xs font-medium">
                      Ended
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-xs font-medium">
                      Draft
                    </Badge>
                  )}

                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <CardTitle className="text-lg font-bold line-clamp-1">
                  {title || "Untitled Hackathon"}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {tagline || "Compelling tagline will appear right here for participants."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Award className="size-3.5 text-primary" /> Total Prizes
                  </span>
                  <span className="font-extrabold text-primary text-sm">
                    {formattedPrizePool}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3.5" /> Location
                  </span>
                  <span className="font-medium truncate max-w-[150px]">{location}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="size-3.5" /> Max Team
                  </span>
                  <span className="font-medium">{maxTeamSize} members</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="size-3.5 text-primary" /> Capacity
                  </span>
                  <span className="font-semibold text-foreground">
                    {hasParticipantLimit && Number(maxParticipants) > 0
                      ? `0 / ${maxParticipants} Spots`
                      : "Unlimited Spots"}
                  </span>
                </div>

                {/* Selected tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedTags.slice(0, 3).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[0.65rem] px-2 py-0"
                      >
                        {t}
                      </Badge>
                    ))}
                    {selectedTags.length > 3 && (
                      <span className="text-[0.65rem] text-muted-foreground">
                        +{selectedTags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="p-4 pt-0">
                <Button variant="outline" className="w-full rounded-full text-xs">
                  Join Hackathon
                </Button>
              </div>
            </Card>

            <div className="p-4 rounded-2xl border bg-muted/30 text-xs text-muted-foreground space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-primary" /> Target URL
              </div>
              <div className="font-mono text-[0.7rem] bg-card p-2 rounded-lg border text-foreground truncate">
                /hackathons/{slug || "slug"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
