"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateSlug } from "@/lib/utils/slug";
import type {
  Hackathon,
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
  CheckCircle2,
  ExternalLink,
  Lock,
  Key,
  Shield,
  School,
  UserCheck,
  Copy,
  Check,
  RefreshCw,
  Share2,
  CreditCard,
  QrCode,
  IndianRupee,
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

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().slice(0, 16);
  try {
    return new Date(dateStr).toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

interface EditHackathonClientProps {
  hackathon: Hackathon;
}

export function EditHackathonClient({ hackathon }: EditHackathonClientProps) {
  const router = useRouter();
  const { showAlert } = useModalAlert();

  // Basic Details
  const [title, setTitle] = useState(hackathon.title);
  const [slug, setSlug] = useState(hackathon.slug);
  const [slugEdited, setSlugEdited] = useState(true);
  const [tagline, setTagline] = useState(hackathon.tagline);
  const [organizerName, setOrganizerName] = useState(hackathon.organizer_name || "Hack4Win Arena");
  const [websiteUrl, setWebsiteUrl] = useState(hackathon.website_url || "");

  // Publication Status
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">(
    hackathon.status === "draft" ? "draft" : "published"
  );

  // Format & Location
  const [format, setFormat] = useState<HackathonFormat>(hackathon.format || "online");
  const [location, setLocation] = useState(hackathon.location || "Global (Online)");

  // Schedule
  const [startDate, setStartDate] = useState(() => formatDateForInput(hackathon.start_date));
  const [endDate, setEndDate] = useState(() => formatDateForInput(hackathon.end_date));
  const [submissionDeadline, setSubmissionDeadline] = useState(() =>
    formatDateForInput(hackathon.submission_deadline || hackathon.end_date)
  );
  const [maxTeamSize, setMaxTeamSize] = useState(hackathon.max_team_size || 4);
  const [hasParticipantLimit, setHasParticipantLimit] = useState(
    hackathon.max_participants != null && hackathon.max_participants > 0
  );
  const [maxParticipants, setMaxParticipants] = useState(
    hackathon.max_participants != null && hackathon.max_participants > 0
      ? String(hackathon.max_participants)
      : ""
  );

  // Private Hackathon & Access Control
  const [isPrivate, setIsPrivate] = useState(Boolean(hackathon.is_private));
  const [accessCode, setAccessCode] = useState(hackathon.access_code || "");
  const [allowedDomainsStr, setAllowedDomainsStr] = useState(
    (hackathon.allowed_email_domains || []).join(", ")
  );
  const [invitedEmailsStr, setInvitedEmailsStr] = useState(
    (hackathon.invited_emails || []).join("\n")
  );
  const [inviteToken, setInviteToken] = useState<string>(
    () => hackathon.invite_token || Math.random().toString(36).substring(2, 12)
  );
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Paid Hackathon & UPI Configuration
  const [isPaid, setIsPaid] = useState(Boolean(hackathon.is_paid));
  const [registrationFee, setRegistrationFee] = useState<string>(
    hackathon.registration_fee != null && Number(hackathon.registration_fee) > 0
      ? String(hackathon.registration_fee)
      : "299"
  );
  const [feeCurrency, setFeeCurrency] = useState<string>(hackathon.fee_currency || "₹");
  const [upiId, setUpiId] = useState<string>(hackathon.upi_id || "");
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState<string>(hackathon.upi_qr_code_url || "");
  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    hackathon.payment_instructions ||
      "Scan the UPI QR code or pay directly to the UPI ID. Enter your 12-digit UTR / UPI reference number and attach a screenshot of the completed payment."
  );

  const generateAccessCode = () => {
    const prefix = title
      ? title.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
      : "CAMPUS";
    const rand = Math.floor(1000 + Math.random() * 9000);
    setAccessCode(`${prefix || "CAMPUS"}-${rand}`);
  };

  // Prizes & Currency
  const [currency, setCurrency] = useState(hackathon.currency || "$");
  const [prizes, setPrizes] = useState<PrizeTier[]>(() => {
    if (Array.isArray(hackathon.prizes) && hackathon.prizes.length > 0) {
      return hackathon.prizes as PrizeTier[];
    }
    return [
      { id: "1", title: "1st Place (Grand Prize)", amount: "25000", description: "Overall winner" },
      { id: "2", title: "2nd Place", amount: "15000", description: "Runner up" },
      { id: "3", title: "3rd Place", amount: "10000", description: "Third place" },
    ];
  });

  // Tags System
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(hackathon.tags || ["AI & Agents"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Competition Rules & Eligibility
  const [rules, setRules] = useState<string[]>(() => {
    if (Array.isArray(hackathon.rules) && hackathon.rules.length > 0) {
      return hackathon.rules;
    }
    return DEFAULT_HACKATHON_RULES;
  });

  // Images & Media
  const [bannerUrl, setBannerUrl] = useState(hackathon.banner_url || PRESET_BANNERS[0].url);
  const [thumbnailUrl, setThumbnailUrl] = useState(hackathon.thumbnail_url || PRESET_COVERS[0].url);

  // Markdown Description
  const [description, setDescription] = useState(hackathon.description || "");

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load available tags
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

  // Add custom tag
  const handleAddCustomTag = async (e: React.FormEvent | React.KeyboardEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();

    const name = customTagInput.trim();
    if (!name) return;

    if (selectedTags.includes(name)) {
      setCustomTagInput("");
      return;
    }

    setIsAddingTag(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.tag) {
        setAvailableTags((prev) => [data.tag, ...prev.filter((t) => t.id !== data.tag.id)]);
      }
      setSelectedTags((prev) => [...prev, name]);
      setCustomTagInput("");
    } catch {
      setSelectedTags((prev) => [...prev, name]);
      setCustomTagInput("");
    } finally {
      setIsAddingTag(false);
    }
  };

  // Format total prize pool
  const totalPrizeAmount = prizes.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const formattedPrizePool = totalPrizeAmount > 0
    ? `${currency}${totalPrizeAmount.toLocaleString()}`
    : `${currency}0`;

  // Dynamic preview status
  const previewHackathonObj = {
    start_date: startDate,
    end_date: endDate,
    submission_deadline: submissionDeadline,
    status: publishStatus,
  } as Hackathon;
  const computedStatus = getHackathonStatus(previewHackathonObj);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

    if (isPaid && (Number(registrationFee) <= 0 || isNaN(Number(registrationFee)))) {
      const msg = "Please enter a valid registration fee greater than 0 for paid hackathons.";
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
        status: publishStatus,
        is_private: isPrivate,
        access_code: isPrivate && accessCode.trim() ? accessCode.trim().toUpperCase() : null,
        allowed_email_domains: isPrivate && allowedDomainsStr.trim()
          ? allowedDomainsStr.split(/[\n,; ]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean)
          : [],
        invited_emails: isPrivate && invitedEmailsStr.trim()
          ? invitedEmailsStr.split(/[\n,; ]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
          : [],
        invite_token: isPrivate ? inviteToken : null,
        is_paid: isPaid,
        registration_fee: isPaid ? (Number(registrationFee) || 0) : 0,
        fee_currency: feeCurrency,
        upi_id: isPaid && upiId.trim() ? upiId.trim() : null,
        upi_qr_code_url: isPaid && upiQrCodeUrl.trim() ? upiQrCodeUrl.trim() : null,
        payment_instructions: isPaid && paymentInstructions.trim() ? paymentInstructions.trim() : null,
      };

      const res = await fetch(`/api/admin/hackathons/${hackathon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update hackathon");
      }

      setSuccessMessage("Hackathon updated successfully! ✨");
      await showAlert({
        title: "Hackathon Updated!",
        message: `"${trimmedTitle}" has been successfully updated.`,
        type: "success",
      });

      setTimeout(() => {
        router.push("/admin/hackathons");
        router.refresh();
      }, 500);
    } catch (err) {
      console.error("Hackathon update error:", err);
      const errMsg = err instanceof Error ? err.message : "Error updating hackathon";
      setErrorMessage(errMsg);
      await showAlert({
        title: "Update Failed",
        message: errMsg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild className="rounded-full">
            <Link href="/admin/hackathons">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Edit Hackathon
              </h1>
              <Badge variant="outline" className="text-xs font-mono">
                /{hackathon.slug}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Update challenge information, timeline dates, prize tiers, rules, and publishing status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button variant="outline" asChild size="sm" className="rounded-full gap-1.5 text-xs">
            <Link href={`/hackathons/${hackathon.slug}`} target="_blank">
              <ExternalLink className="size-3.5" /> View Public Page
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm" className="rounded-full gap-1.5 text-xs">
            <Link href={`/admin/judging?hackathonId=${hackathon.id}`}>
              <Award className="size-3.5 text-amber-500" /> Open Judging Portal
            </Link>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Form Area (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Basic Metadata Card */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trophy className="size-4 text-primary" /> Basic Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Set the core title, tagline, slug URL, and host credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-semibold">
                    Hackathon Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. NextGen Mobile & Spatial Apps Challenge 2026"
                    required
                    className="h-10 text-sm font-semibold rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slug" className="text-xs font-semibold">
                      Custom URL Slug
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      /hackathons/{slug || "slug-preview"}
                    </span>
                  </div>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(generateSlug(e.target.value));
                      setSlugEdited(true);
                    }}
                    placeholder="custom-slug-url"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-xs font-semibold">
                    Tagline / One-liner Pitch *
                  </Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Build revolutionary spatial computing experiences and AI agents."
                    required
                    className="h-10 text-sm rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="organizer" className="text-xs font-semibold">
                      Host / Organizer Name
                    </Label>
                    <Input
                      id="organizer"
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      placeholder="e.g. Google DeepMind, OpenAI"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs font-semibold flex items-center gap-1">
                      <Globe className="size-3 text-muted-foreground" /> Official Website URL
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://hackathon.org"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access & Privacy (Private College / Campus Hackathon) */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Lock className="size-4 text-purple-600 dark:text-purple-400" /> Access & Privacy Controls
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Restrict participation to your university, student batch, or authorized campus email domains.
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
                            const link = `${origin}/hackathons/${slug.trim() || hackathon.slug}?invite=${inviteToken}`;
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
                        {typeof window !== "undefined" ? window.location.origin : "https://hack4win.online"}/hackathons/{slug.trim() || hackathon.slug}?invite={inviteToken}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground">
                        Distribute this link in college groups or emails. Visiting with this link automatically unlocks registration for the student.
                      </p>
                    </div>

                    {/* 5. Live Student Roster Link */}
                    <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Track enrolled students, inspect project submission rates, and export the official campus CSV roster.
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl text-xs font-bold gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer shrink-0"
                      >
                        <Link href={`/organizer/hackathons/${hackathon.id}/students`}>
                          <Users className="size-3.5" />
                          <span>Open Student Roster &rarr;</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section: Registration Fee & UPI Payment Model */}
            <Card className="border shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="size-4 text-emerald-500" /> Registration Fee &amp; UPI Payment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose whether this hackathon is free to enter or requires a registration fee paid via UPI QR code.
                  </CardDescription>
                </div>
                <Badge variant={isPaid ? "default" : "outline"} className={isPaid ? "bg-emerald-600 text-white font-bold" : ""}>
                  {isPaid ? `Paid (₹${registrationFee || "0"})` : "Free Entry"}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Fee Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      !isPaid
                        ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-600/20"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="size-4" /> Free Registration
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      No fee. Any authenticated participant can register directly with 1 click.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isPaid
                        ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-600/20"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <IndianRupee className="size-4" /> Paid Registration (UPI QR)
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Charge a registration fee. Participants scan your UPI QR code, attach screenshot, and you verify manually.
                    </div>
                  </button>
                </div>

                {/* Paid Configuration Fields */}
                {isPaid && (
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <QrCode className="size-4" /> UPI Payment Setup
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Registration Fee */}
                      <div className="space-y-1.5">
                        <Label htmlFor="registrationFee" className="text-xs font-semibold flex items-center gap-1">
                          <IndianRupee className="size-3 text-emerald-600" /> Registration Fee Amount (₹) *
                        </Label>
                        <Input
                          id="registrationFee"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 299"
                          value={registrationFee}
                          onChange={(e) => setRegistrationFee(e.target.value)}
                          className="rounded-xl font-semibold"
                          required
                        />
                        <p className="text-[0.7rem] text-muted-foreground">
                          Exact amount participants must send via UPI to register.
                        </p>
                      </div>

                      {/* Organizer UPI ID */}
                      <div className="space-y-1.5">
                        <Label htmlFor="upiId" className="text-xs font-semibold flex items-center gap-1">
                          <CreditCard className="size-3 text-emerald-600" /> UPI ID / VPA *
                        </Label>
                        <Input
                          id="upiId"
                          type="text"
                          placeholder="e.g. organizer@okaxis, 9876543210@paytm"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="rounded-xl font-mono text-sm"
                        />
                        <p className="text-[0.7rem] text-muted-foreground">
                          Your UPI ID where participants will send the registration fee.
                        </p>
                      </div>
                    </div>

                    {/* Custom UPI QR Code Image (Optional) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <QrCode className="size-3.5 text-emerald-600" /> Custom UPI QR Code Image (Optional)
                      </Label>
                      <ImageUploader
                        label="Upload your UPI QR code (Google Pay / PhonePe / Paytm scanner image)"
                        folder="qr_codes"
                        value={upiQrCodeUrl}
                        onChange={(url) => setUpiQrCodeUrl(url)}
                      />
                      <p className="text-[0.7rem] text-muted-foreground">
                        💡 If left empty, Hack4Win will automatically generate a crisp, scannable UPI QR code from your UPI ID and fee!
                      </p>
                    </div>

                    {/* Payment Instructions */}
                    <div className="space-y-1.5">
                      <Label htmlFor="paymentInstructions" className="text-xs font-semibold">
                        Payment Instructions for Participants
                      </Label>
                      <Input
                        id="paymentInstructions"
                        placeholder="e.g. Scan QR, pay ₹299, enter 12-digit UTR, and upload screenshot."
                        value={paymentInstructions}
                        onChange={(e) => setPaymentInstructions(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Format, Location & Schedule Card */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-primary" /> Format, Location & Dates
                </CardTitle>
                <CardDescription className="text-xs">
                  Define event format, team size restrictions, and competition timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Event Format</Label>
                    <select
                      value={format}
                      onChange={(e) => {
                        const val = e.target.value as HackathonFormat;
                        setFormat(val);
                        if (val === "online") setLocation("Global (Online)");
                        else if (val === "in-person" && location === "Global (Online)") setLocation("San Francisco, CA");
                      }}
                      className="w-full h-10 rounded-xl border border-input bg-card px-3 text-xs font-medium cursor-pointer"
                    >
                      <option value="online">Online (Virtual)</option>
                      <option value="in-person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-semibold flex items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground" /> Location
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Global (Online) or San Francisco"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="maxTeamSize" className="text-xs font-semibold flex items-center gap-1">
                      <Users className="size-3 text-muted-foreground" /> Max Team Size (Members)
                    </Label>
                    <Input
                      id="maxTeamSize"
                      type="number"
                      min={1}
                      max={12}
                      value={maxTeamSize}
                      onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxParticipants" className="text-xs font-semibold flex items-center gap-1">
                        <Users className="size-3 text-muted-foreground" /> Participant Capacity Limit
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
                        id="maxParticipants"
                        type="number"
                        min={1}
                        placeholder="e.g. 100 participants"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    ) : (
                      <div className="h-10 px-3.5 rounded-xl border border-dashed flex items-center text-xs text-muted-foreground bg-muted/20">
                        Unlimited Participants (No Cap)
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-xs font-semibold">
                      Start Date & Time *
                    </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-xs font-semibold">
                      Submission Deadline *
                    </Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={submissionDeadline}
                      onChange={(e) => setSubmissionDeadline(e.target.value)}
                      required
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-xs font-semibold">
                      End Date & Time *
                    </Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Prizes & Tracks Builder */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="size-4 text-primary" /> Prizes & Tracks Builder
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure cash rewards and track prizes for winning developers.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Calculated Total</span>
                  <span className="text-lg font-black text-primary">{formattedPrizePool}</span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <Label className="text-xs font-semibold">Currency Symbol:</Label>
                  <div className="flex items-center gap-1.5">
                    {["$", "₹", "€", "£"].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setCurrency(sym)}
                        className={`size-8 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          currency === sym
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <PrizesBuilder
                  currency={currency}
                  onCurrencyChange={setCurrency}
                  prizes={prizes}
                  onPrizesChange={setPrizes}
                />
              </CardContent>
            </Card>

            {/* 4. Full Markdown Story & Rules */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-4 px-6">
                <CardTitle className="text-base font-bold">Hackathon Description & Rules *</CardTitle>
                <CardDescription className="text-xs">
                  Full rich markdown guide for participants covering rules, judging criteria, and resources.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <MarkdownEditor value={description} onChange={setDescription} />
              </CardContent>
            </Card>

            {/* 5. Competition Rules & Eligibility Guidelines */}
            <RulesBuilder
              rules={rules}
              onRulesChange={setRules}
              maxTeamSize={Number(maxTeamSize) || 4}
            />
          </div>

          {/* Right Column (1 Col: Media, Tags, Publish Status) */}
          <div className="space-y-6">
            {/* Publication Status Card */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Radio className="size-3.5 text-primary" /> Publication Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Publish State</Label>
                  <select
                    value={publishStatus}
                    onChange={(e) => setPublishStatus(e.target.value as "draft" | "published")}
                    className="w-full h-10 rounded-xl border border-input bg-card px-3 text-xs font-semibold cursor-pointer"
                  >
                    <option value="published">Published (Live & Visible)</option>
                    <option value="draft">Draft (Hidden from Participants)</option>
                  </select>
                </div>

                {/* Computed Dynamic Status indicator */}
                <div className="p-3 rounded-xl border bg-muted/30 space-y-1">
                  <div className="text-[11px] text-muted-foreground">Dynamic Timeline Status:</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs capitalize font-bold ${
                        computedStatus === "ongoing"
                           ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                          : computedStatus === "upcoming"
                          ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
                          : computedStatus === "ended"
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-500/20 text-amber-600"
                      }`}
                    >
                      {computedStatus}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      (Auto-calculated by schedule)
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl h-10 text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Save Hackathon
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Banner & Thumbnail Media Card */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Eye className="size-3.5 text-primary" /> Visual Branding & Media
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Hero Banner Image</Label>
                  <ImageUploader
                    label="Banner Image"
                    value={bannerUrl}
                    onChange={setBannerUrl}
                    folder="banners"
                    aspectRatio="banner"
                  />
                  <div className="pt-1">
                    <span className="text-[10px] text-muted-foreground block mb-1">Preset Themes:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESET_BANNERS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setBannerUrl(preset.url)}
                          className="text-[10px] p-1.5 rounded-lg border bg-muted/30 hover:bg-muted text-foreground font-medium truncate cursor-pointer text-left"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <Label className="text-xs font-semibold">Thumbnail / Card Cover</Label>
                  <ImageUploader
                    label="Thumbnail Image"
                    value={thumbnailUrl}
                    onChange={setThumbnailUrl}
                    folder="covers"
                    aspectRatio="square"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags & Categorization Card */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TagIcon className="size-3.5 text-primary" /> Tags & Tracks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t">
                  <Input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={handleAddCustomTag}
                    placeholder="Add custom tag..."
                    className="h-8 text-xs rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomTag}
                    disabled={isAddingTag || !customTagInput.trim()}
                    className="h-8 text-xs rounded-lg px-2.5"
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </main>
  );
}
