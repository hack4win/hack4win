"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Rocket,
  ArrowLeft,
  Globe,
  Video,
  Code2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Calendar,
  Award,
  Users,
  ShieldCheck,
  Plus,
  X,
  FileCode2,
  ExternalLink,
  RotateCcw,
  Mail,
  Copy,
  Check,
  Clock,
  Send,
  UserCheck,
  UserPlus,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { ImageUploader } from "@/components/ui/image-uploader";
import { compressImage } from "@/lib/utils/image-compression";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getHackathonStatus, type Hackathon, type SessionUser, type HackathonSubmission, type SubmissionTeamMember, type User } from "@/lib/db/types";
import { getEmbedVideoUrl } from "@/app/projects/[id]/project-details-client";
import { isValidHttpUrl } from "@/lib/url-validation";
import { useModalAlert } from "@/components/ui/modal-alert";

function GithubIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const POPULAR_TECH_PRESETS = [
  "Next.js",
  "React",
  "TypeScript",
  "Python",
  "PyTorch",
  "OpenAI",
  "TailwindCSS",
  "PostgreSQL",
  "Neon",
  "FastAPI",
  "Docker",
  "Rust",
  "WebAssembly",
  "Solidity",
  "Three.js",
  "LangChain",
  "Go",
  "Flutter",
];

const DEFAULT_COVER_PRESETS = [
  {
    name: "AI & Neural Waves",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Code & Matrix",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Cyber Grid",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Cloud Network",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
  },
];

interface SubmitProjectClientProps {
  hackathon: Hackathon;
  sessionUser: SessionUser | null;
  isRegistered: boolean;
  existingSubmission: HackathonSubmission | null;
  availableParticipants?: User[];
}

export function SubmitProjectClient({
  hackathon,
  sessionUser,
  isRegistered,
  existingSubmission,
  availableParticipants = [],
}: SubmitProjectClientProps) {
  const router = useRouter();
  const { showAlert } = useModalAlert();

  // Status checks for disabling/enabling actions
  const dynamicStatus = getHackathonStatus(hackathon);
  const isEnded = dynamicStatus === "ended" || hackathon.status === "ended";
  const [isDeadlinePassed] = useState(() =>
    Boolean(
      hackathon.submission_deadline &&
        new Date(hackathon.submission_deadline).getTime() < Date.now()
    )
  );
  const isSubmissionsClosed = isEnded || isDeadlinePassed;

  // Team members state
  const [teamMembers, setTeamMembers] = useState<SubmissionTeamMember[]>(() => {
    if (existingSubmission?.team_members && existingSubmission.team_members.length > 0) {
      return existingSubmission.team_members;
    }
    return sessionUser
      ? [
          {
            id: sessionUser.id,
            name: sessionUser.name || "Creator",
            email: sessionUser.email,
            image: sessionUser.image || null,
            role: "Project Lead",
            status: "accepted",
          },
        ]
      : [];
  });

  // 2-Way Add Team Member state
  const [addMethod, setAddMethod] = useState<"email" | "participant">("email");

  // Way 1: Email invitation state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailRole, setInviteEmailRole] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; acceptUrl?: string; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSendEmailInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmissionsClosed) {
      setInviteError("Cannot invite teammates to a concluded hackathon");
      return;
    }
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setInviteError("Please enter a valid email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setInviteError("Please enter a valid email format");
      return;
    }
    if (sessionUser && cleanEmail === sessionUser.email.toLowerCase()) {
      setInviteError("You are already the project lead!");
      return;
    }
    const maxTeamLimit = hackathon.max_team_size || 4;
    if (teamMembers.length >= maxTeamLimit) {
      setInviteError(`Team is at maximum capacity (${maxTeamLimit} members).`);
      return;
    }
    if (teamMembers.some((m) => m.email?.toLowerCase() === cleanEmail)) {
      setInviteError("This email has already been added to your team");
      return;
    }

    setIsSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/team-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: hackathon.id,
          receiver_email: cleanEmail,
          role: inviteEmailRole.trim() || "Co-Builder",
          message: `Join our project team for ${hackathon.title}!`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      const invited = data.invitedUser || {};
      const newMember: SubmissionTeamMember = {
        id: invited.id || `pending_${Date.now()}`,
        name: invited.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        image: invited.image || null,
        role: inviteEmailRole.trim() || invited.role || "Co-Builder",
        status: "pending",
        invite_id: data.invitation?.id,
        invited_at: new Date().toISOString(),
      };

      setTeamMembers((prev) => [...prev, newMember]);
      setInviteSuccess({
        email: cleanEmail,
        acceptUrl: data.dispatchedEmail?.accept_url || data.dummyEmail?.accept_url,
        message: data.message || `Invitation sent to ${cleanEmail}!`,
      });
      setInviteEmail("");
      setInviteEmailRole("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error sending email invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Way 2: Registered participant state
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [collaboratorRole, setCollaboratorRole] = useState("");
  const [isSendingParticipantInvite, setIsSendingParticipantInvite] = useState(false);
  const [participantInviteError, setParticipantInviteError] = useState<string | null>(null);
  const [participantInviteSuccess, setParticipantInviteSuccess] = useState<{
    name: string;
    email: string;
    acceptUrl?: string;
    message: string;
  } | null>(null);

  const handleSendParticipantInvite = async () => {
    if (isSubmissionsClosed) {
      setParticipantInviteError("Cannot invite teammates to a concluded hackathon");
      return;
    }
    if (!selectedParticipantId) {
      setParticipantInviteError("Please select a registered participant");
      return;
    }
    const participant = availableParticipants.find((p) => p.id === selectedParticipantId);
    if (!participant) {
      setParticipantInviteError("Selected builder could not be found");
      return;
    }
    if (
      sessionUser &&
      (participant.id === sessionUser.id || participant.email.toLowerCase() === sessionUser.email.toLowerCase())
    ) {
      setParticipantInviteError("You are already the project lead!");
      return;
    }
    const maxTeamLimit = hackathon.max_team_size || 4;
    if (teamMembers.length >= maxTeamLimit) {
      setParticipantInviteError(`Team is at maximum capacity (${maxTeamLimit} members).`);
      return;
    }
    if (
      teamMembers.some(
        (m) =>
          m.id === participant.id ||
          (m.email && participant.email && m.email.toLowerCase() === participant.email.toLowerCase())
      )
    ) {
      setParticipantInviteError(`${participant.name || participant.email} has already been added or invited to your team`);
      return;
    }

    setIsSendingParticipantInvite(true);
    setParticipantInviteError(null);
    setParticipantInviteSuccess(null);

    try {
      const res = await fetch("/api/team-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: hackathon.id,
          receiver_id: participant.id,
          receiver_email: participant.email,
          role: collaboratorRole.trim() || "Co-Builder",
          message: `Join our project team for ${hackathon.title}!`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send team invitation");
      }

      const newMember: SubmissionTeamMember = {
        id: participant.id,
        name: participant.name || participant.email.split("@")[0],
        email: participant.email,
        image: participant.image || null,
        role: collaboratorRole.trim() || "Co-Builder",
        status: "pending",
        invite_id: data.invitation?.id,
        invited_at: new Date().toISOString(),
      };

      setTeamMembers((prev) => [...prev, newMember]);
      setParticipantInviteSuccess({
        name: participant.name || participant.email,
        email: participant.email,
        acceptUrl: data.dispatchedEmail?.accept_url || data.dummyEmail?.accept_url,
        message: data.message || `Invitation dispatched to ${participant.name || participant.email}!`,
      });
      setSelectedParticipantId("");
      setCollaboratorRole("");
    } catch (err) {
      setParticipantInviteError(err instanceof Error ? err.message : "Error sending team invitation");
    } finally {
      setIsSendingParticipantInvite(false);
    }
  };

  const handleRemoveCollaborator = (id: string) => {
    if (id === sessionUser?.id) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Form states & Draft Auto-Save Persistence (Improve 2)
  const DRAFT_STORAGE_KEY = `hack4win_submission_draft_${hackathon.slug}_${sessionUser?.id || "anon"}${existingSubmission ? `_${existingSubmission.id}` : ""}`;
  const hasLoadedDraftRef = React.useRef(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const [title, setTitle] = useState(existingSubmission?.title || "");
  const [tagline, setTagline] = useState(existingSubmission?.tagline || "");
  const [description, setDescription] = useState(
    existingSubmission?.description ||
      `## Inspiration

## What it does

## How we built it

## Challenges we ran into

## Accomplishments that we're proud of

## What we learned

## What's next for Untitled`
  );

  const handleResetTemplate = () => {
    const nextForTitle = title.trim() ? `## What's next for ${title.trim()}` : "## What's next for Untitled";
    setDescription(
      `## Inspiration\n\n## What it does\n\n## How we built it\n\n## Challenges we ran into\n\n## Accomplishments that we're proud of\n\n## What we learned\n\n${nextForTitle}`
    );
  };
  const [coverImage, setCoverImage] = useState(existingSubmission?.cover_image || "");
  const [screenshots, setScreenshots] = useState<string[]>(
    existingSubmission?.screenshots || []
  );
  const [screenshotUrlInput, setScreenshotUrlInput] = useState("");
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [isDraggingScreenshots, setIsDraggingScreenshots] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const screenshotFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadScreenshots = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingScreenshots(true);
    setScreenshotError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          throw new Error(`File "${file.name}" is not an image.`);
        }
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.84,
        });
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("folder", "submissions");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to upload image");
        }
        uploadedUrls.push(data.url);
      }
      setScreenshots((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setScreenshotError(err instanceof Error ? err.message : "Error uploading screenshots");
    } finally {
      setIsUploadingScreenshots(false);
      if (screenshotFileInputRef.current) {
        screenshotFileInputRef.current.value = "";
      }
    }
  };

  const handleAddScreenshotUrl = () => {
    const trimmed = screenshotUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setScreenshotError("Screenshot URL must start with http:// or https://");
      return;
    }
    setScreenshots((prev) => [...prev, trimmed]);
    setScreenshotUrlInput("");
    setScreenshotError(null);
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveScreenshot = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= screenshots.length) return;
    setScreenshots((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const [githubUrl, setGithubUrl] = useState(existingSubmission?.github_url || "");
  const [demoUrl, setDemoUrl] = useState(existingSubmission?.demo_url || "");
  const [videoUrl, setVideoUrl] = useState(existingSubmission?.video_url || "");
  const previewEmbedUrl = getEmbedVideoUrl(videoUrl);
  const [techStack, setTechStack] = useState<string[]>(
    existingSubmission?.tech_stack || ["Next.js", "TypeScript"]
  );
  const [customTechInput, setCustomTechInput] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Restore draft from localStorage / sessionStorage on mount (Improve 2)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = typeof window !== "undefined"
          ? (localStorage.getItem(DRAFT_STORAGE_KEY) || sessionStorage.getItem(DRAFT_STORAGE_KEY))
          : null;
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft) {
            if (!existingSubmission || draft.isDraftOverride) {
              if (typeof draft.title === "string" && draft.title) setTitle(draft.title);
              if (typeof draft.tagline === "string" && draft.tagline) setTagline(draft.tagline);
              if (typeof draft.description === "string" && draft.description) setDescription(draft.description);
              if (typeof draft.coverImage === "string" && draft.coverImage) setCoverImage(draft.coverImage);
              if (Array.isArray(draft.screenshots) && draft.screenshots.length > 0) setScreenshots(draft.screenshots);
              if (typeof draft.githubUrl === "string" && draft.githubUrl) setGithubUrl(draft.githubUrl);
              if (typeof draft.demoUrl === "string" && draft.demoUrl) setDemoUrl(draft.demoUrl);
              if (typeof draft.videoUrl === "string" && draft.videoUrl) setVideoUrl(draft.videoUrl);
              if (Array.isArray(draft.techStack) && draft.techStack.length > 0) setTechStack(draft.techStack);
              setIsDraftRestored(true);
              if (draft.updatedAt) {
                setLastSavedTime(new Date(draft.updatedAt));
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not read draft from storage", e);
      } finally {
        hasLoadedDraftRef.current = true;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [DRAFT_STORAGE_KEY, existingSubmission]);

  // Auto-save form draft on change to localStorage / sessionStorage (Improve 2)
  React.useEffect(() => {
    if (!hasLoadedDraftRef.current || isSuccess) return;

    const DEFAULT_TEMPLATE = `## Inspiration\n\n## What it does\n\n## How we built it\n\n## Challenges we ran into\n\n## Accomplishments that we're proud of\n\n## What we learned\n\n## What's next for Untitled`;

    const hasDraftContent = Boolean(
      title.trim() ||
      tagline.trim() ||
      (description && description.trim() !== DEFAULT_TEMPLATE.trim()) ||
      coverImage ||
      screenshots.length > 0 ||
      githubUrl.trim() ||
      demoUrl.trim() ||
      videoUrl.trim()
    );

    if (!hasDraftContent) {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      const timer = setTimeout(() => setLastSavedTime(null), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const now = new Date();
      const draftData = {
        title,
        tagline,
        description,
        coverImage,
        screenshots,
        githubUrl,
        demoUrl,
        videoUrl,
        techStack,
        isDraftOverride: true,
        updatedAt: now.toISOString(),
      };

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch {
        try {
          sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        } catch {}
      }
      setLastSavedTime(now);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    title,
    tagline,
    description,
    coverImage,
    screenshots,
    githubUrl,
    demoUrl,
    videoUrl,
    techStack,
    DRAFT_STORAGE_KEY,
    isSuccess,
  ]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    const DEFAULT_TEMPLATE = `## Inspiration\n\n## What it does\n\n## How we built it\n\n## Challenges we ran into\n\n## Accomplishments that we're proud of\n\n## What we learned\n\n## What's next for Untitled`;
    setTitle(existingSubmission?.title || "");
    setTagline(existingSubmission?.tagline || "");
    setDescription(existingSubmission?.description || DEFAULT_TEMPLATE);
    setCoverImage(existingSubmission?.cover_image || "");
    setScreenshots(existingSubmission?.screenshots || []);
    setGithubUrl(existingSubmission?.github_url || "");
    setDemoUrl(existingSubmission?.demo_url || "");
    setVideoUrl(existingSubmission?.video_url || "");
    setTechStack(existingSubmission?.tech_stack || ["Next.js", "TypeScript"]);
    setIsDraftRestored(false);
    setLastSavedTime(null);
  };

  // Add tech tag
  const handleAddTag = (tech: string) => {
    const trimmed = tech.trim();
    if (!trimmed) return;
    if (!techStack.includes(trimmed)) {
      setTechStack((prev) => [...prev, trimmed]);
    }
    setCustomTechInput("");
  };

  const handleRemoveTag = (tech: string) => {
    setTechStack((prev) => prev.filter((t) => t !== tech));
  };

  const handleCustomTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(customTechInput);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSubmissionsClosed) {
      setErrorMessage("Submissions are closed for this hackathon.");
      await showAlert({
        title: "Submissions Closed",
        message: "Submissions are currently closed for this hackathon challenge.",
        type: "warning",
      });
      return;
    }

    if (!sessionUser) {
      setErrorMessage("Please sign in to submit your project.");
      await showAlert({
        title: "Authentication Required",
        message: "Please sign in to submit your project to this hackathon.",
        type: "error",
      });
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      const msg = "Project title is required and must be at least 3 characters long.";
      setErrorMessage(msg);
      await showAlert({ title: "Incomplete Field", message: msg, type: "warning" });
      return;
    }

    if (!description.trim() || description.trim().length < 30) {
      const msg = "Please provide a thorough project description (at least 30 characters).";
      setErrorMessage(msg);
      await showAlert({ title: "Description Too Short", message: msg, type: "warning" });
      return;
    }

    // Validate URLs
    if (githubUrl.trim() && !isValidHttpUrl(githubUrl.trim())) {
      const msg = "GitHub Repository URL must be a valid URL starting with http:// or https://";
      setErrorMessage(msg);
      await showAlert({ title: "Invalid URL", message: msg, type: "warning" });
      return;
    }

    if (demoUrl.trim() && !isValidHttpUrl(demoUrl.trim())) {
      const msg = "Live Interactive Demo URL must be a valid URL starting with http:// or https://";
      setErrorMessage(msg);
      await showAlert({ title: "Invalid URL", message: msg, type: "warning" });
      return;
    }

    if (videoUrl.trim() && !isValidHttpUrl(videoUrl.trim())) {
      const msg = "Video Demo URL must be a valid URL starting with http:// or https://";
      setErrorMessage(msg);
      await showAlert({ title: "Invalid URL", message: msg, type: "warning" });
      return;
    }

    if (coverImage.trim() && !isValidHttpUrl(coverImage.trim())) {
      const msg = "Cover Image URL must be a valid URL starting with http:// or https://";
      setErrorMessage(msg);
      await showAlert({ title: "Invalid URL", message: msg, type: "warning" });
      return;
    }

    for (const shot of screenshots) {
      if (!isValidHttpUrl(shot)) {
        const msg = "All screenshot URLs must start with http:// or https://";
        setErrorMessage(msg);
        await showAlert({ title: "Invalid Screenshot URL", message: msg, type: "warning" });
        return;
      }
    }

    if (!agreeRules) {
      const msg = "Please accept the hackathon code of conduct and submission rules.";
      setErrorMessage(msg);
      await showAlert({ title: "Rules Agreement Required", message: msg, type: "warning" });
      return;
    }

    const maxTeamLimit = hackathon.max_team_size || 4;
    if (teamMembers.length > maxTeamLimit) {
      const msg = `Team size exceeds maximum allowed limit (${maxTeamLimit} members).`;
      setErrorMessage(msg);
      await showAlert({ title: "Team Limit Exceeded", message: msg, type: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        cover_image: coverImage.trim() || undefined,
        screenshots: screenshots,
        github_url: githubUrl.trim() || undefined,
        demo_url: demoUrl.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        tech_stack: techStack,
        team_members: teamMembers,
        team_member_ids: teamMembers.map((m) => m.id),
      };

      const res = await fetch(`/api/hackathons/${hackathon.slug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit project");
      }

      setIsSuccess(true);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      setTimeout(() => {
        router.push(`/hackathons/${hackathon.slug}?tab=projects`);
        router.refresh();
      }, 1200);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error submitting project";
      setErrorMessage(errMsg);
      await showAlert({ title: "Submission Failed", message: errMsg, type: "error" });
      setIsSubmitting(false);
    }
  };

  const cleanPrize = (hackathon.prize_pool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <Link
          href={`/hackathons/${hackathon.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {hackathon.title}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] rounded-full gap-1 border-primary/20 text-primary bg-primary/5">
            <Award className="size-3" /> {cleanPrize} Prize Pool
          </Badge>
          <Badge variant="secondary" className="text-[11px] rounded-full capitalize">
            {hackathon.format}
          </Badge>
        </div>
      </div>

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-card via-card to-muted/30 shadow-xs relative overflow-hidden space-y-3">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
          <Rocket className="size-6" />
        </div>

        <div className="space-y-1 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Submit Your Project
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Showcase your prototype to judges, fellow participants, and the global Hack4Win community competing in{" "}
            <span className="font-semibold text-foreground">{hackathon.title}</span>.
          </p>
        </div>

        {isSubmissionsClosed && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 mt-4">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Submissions Closed for This Hackathon</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This competition has concluded or its submission deadline has passed. The submission form is in read-only mode and new submissions or modifications can no longer be processed.
              </p>
            </div>
          </div>
        )}

        {!sessionUser && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>You must be signed in to submit a project for this hackathon.</span>
            </div>
            <Button asChild size="sm" className="rounded-full text-xs font-bold shrink-0">
              <Link href={`/auth/signin?callbackUrl=/hackathons/${hackathon.slug}/submit`}>
                Sign In to Continue
              </Link>
            </Button>
          </div>
        )}

        {sessionUser && !isRegistered && (
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs flex items-center gap-2.5 text-foreground mt-4">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>
              You are currently submitting as <strong>{sessionUser.name || sessionUser.email}</strong>. Submitting will automatically register your team to the hackathon!
            </span>
          </div>
        )}

        {existingSubmission && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2.5 mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                You previously submitted <strong>{existingSubmission.title}</strong>. Submitting will update your project details.
              </span>
            </div>
          </div>
        )}

        {isDraftRestored && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-primary text-xs flex items-center justify-between gap-3 animate-in fade-in-50 mt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span>
                <strong>Pitch Draft Restored:</strong> Your unsaved pitch draft from a previous session was automatically loaded from local storage.
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-7 text-xs text-muted-foreground hover:text-destructive rounded-full px-2.5 shrink-0 cursor-pointer"
            >
              Discard Draft
            </Button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {isSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in-50 duration-200">
          <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm">Project Successfully Submitted! 🎉</h3>
            <p className="text-xs opacity-90">Redirecting to the projects showcase tab...</p>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <fieldset disabled={isSubmissionsClosed} className="space-y-8 disabled:opacity-85 border-0 p-0 m-0 min-w-0">
        {/* SECTION 1: PROJECT IDENTITY */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" /> 1. Project Identity & Pitch
            </CardTitle>
            <CardDescription className="text-xs">
              Give your project an unforgettable name and an engaging elevator pitch.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="project-title" className="text-xs font-semibold flex items-center justify-between">
                <span>Project Name / Title *</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {title.length}/80 characters
                </span>
              </Label>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. AgentCraft: Multi-Agent Workspace"
                className="h-10 rounded-full text-xs font-semibold bg-background"
                required
              />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <Label htmlFor="project-tagline" className="text-xs font-semibold flex items-center justify-between">
                <span>Elevator Pitch / Tagline</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {tagline.length}/140 characters
                </span>
              </Label>
              <Input
                id="project-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={140}
                placeholder="e.g. A visual drag-and-drop canvas for composing autonomous AI agent swarms"
                className="h-10 rounded-full text-xs bg-background"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2 pt-1">
              <ImageUploader
                label="Project Cover / Banner Image"
                value={coverImage}
                onChange={setCoverImage}
                presets={DEFAULT_COVER_PRESETS}
                folder="submissions"
                aspectRatio="banner"
              />
            </div>

            {/* Screenshots Gallery Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-primary" />
                    Project Screenshots & Gallery
                    {screenshots.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] ml-1.5 rounded-full px-2 py-0">
                        {screenshots.length} {screenshots.length === 1 ? "screenshot" : "screenshots"}
                      </Badge>
                    )}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Add multiple screenshots of your UI, architecture, or features. These will appear in the interactive horizontal media carousel on your project details page.
                  </p>
                </div>
              </div>

              {/* Upload Drop Zone / Button & URL input */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7">
                  <div
                    onClick={() => screenshotFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingScreenshots(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingScreenshots(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingScreenshots(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingScreenshots(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleUploadScreenshots(e.dataTransfer.files);
                      }
                    }}
                    className={`border-2 border-dashed transition-all rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 group ${
                      isDraggingScreenshots
                        ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20 scale-[1.01]"
                        : "border-muted-foreground/25 hover:border-primary bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <input
                      ref={screenshotFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleUploadScreenshots(e.target.files);
                        }
                      }}
                    />
                    <div
                      className={`size-10 rounded-full flex items-center justify-center transition-all ${
                        isDraggingScreenshots
                          ? "bg-primary text-primary-foreground scale-110 shadow-sm"
                          : "bg-primary/10 text-primary group-hover:scale-105"
                      }`}
                    >
                      {isUploadingScreenshots ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <UploadCloud className="size-5" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        {isUploadingScreenshots
                          ? "Uploading screenshots..."
                          : isDraggingScreenshots
                          ? "Drop image files here to upload"
                          : "Drag & drop image files here or click to browse"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Drag multiple screenshots from your desktop folder &middot; PNG, JPG, WEBP, GIF up to 10MB each
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Or add via image URL:</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={screenshotUrlInput}
                      onChange={(e) => setScreenshotUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddScreenshotUrl();
                        }
                      }}
                      placeholder="https://.../screenshot.png"
                      className="h-9 rounded-full text-xs bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddScreenshotUrl}
                      disabled={!screenshotUrlInput.trim()}
                      className="h-9 rounded-full text-xs font-semibold px-3 shrink-0 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {screenshotError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{screenshotError}</span>
                </div>
              )}

              {/* Screenshots Preview Gallery */}
              {screenshots.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Uploaded Screenshots ({screenshots.length}) — Reorder or remove:</span>
                    <button
                      type="button"
                      onClick={() => setScreenshots([])}
                      className="text-[10px] text-destructive hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {screenshots.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="group relative rounded-xl border bg-muted/30 overflow-hidden aspect-video shadow-xs flex flex-col justify-between"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${idx + 1}`}
                          className="size-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          #{idx + 1}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveScreenshot(idx, "left")}
                              className="size-7 rounded-full bg-background/90 text-foreground hover:bg-background flex items-center justify-center shadow-xs cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="size-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(idx)}
                            className="size-7 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive flex items-center justify-center shadow-xs cursor-pointer"
                            title="Remove Screenshot"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          {idx < screenshots.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveScreenshot(idx, "right")}
                              className="size-7 rounded-full bg-background/90 text-foreground hover:bg-background flex items-center justify-center shadow-xs cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: TEAM MEMBERS & COLLABORATORS */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="size-4 text-primary shrink-0" /> 2. Team Members & Collaborators
              </CardTitle>
              <CardDescription className="text-xs">
                Did multiple builders collaborate on this project? Credit your teammates so their profile icons appear on the project card.
              </CardDescription>
            </div>
            {teamMembers.length > 1 && (
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20 bg-primary/5 self-start sm:self-auto rounded-full">
                Team Project ({teamMembers.length} Builders)
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Current Team Members Roster */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Credited Project Builders ({teamMembers.length})</Label>
                <span className="text-[10px] text-muted-foreground">
                  Accepted builders appear as confirmed; pending invites show as compact &quot;Not Accepted Yet&quot;.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((member) => {
                  const isLead = member.id === sessionUser?.id;
                  const isPending = member.status === "pending";
                  const acceptUrl = member.invite_id
                    ? `${typeof window !== "undefined" ? window.location.origin : ""}/team-invites/${member.invite_id}?action=accept`
                    : null;

                  return (
                    <div
                      key={member.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 min-w-0 ${
                        isPending
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <UserAvatar
                            src={member.image}
                            name={member.name || member.email}
                            alt={member.name || "Member"}
                            className={`size-9 rounded-full ${
                              isPending
                                ? "ring-2 ring-amber-500/50 border border-dashed border-amber-500"
                                : ""
                            }`}
                            fallbackClassName={
                              isPending
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-primary/10 text-primary"
                            }
                            iconClassName="size-4.5"
                          />
                          {isPending && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs">
                              <Clock className="size-2.5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">{member.name || member.email || "Builder"}</span>
                            {isLead && (
                              <Badge className="text-[9px] px-1.5 py-0 rounded-full bg-primary text-primary-foreground shrink-0">
                                Lead
                              </Badge>
                            )}
                            {isPending && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 rounded-full border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-medium shrink-0 gap-0.5"
                              >
                                Not Accepted Yet
                              </Badge>
                            )}
                            {!isLead && !isPending && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 rounded-full border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium shrink-0 gap-0.5"
                              >
                                Confirmed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
                            <span className="truncate">
                              {member.role || (isLead ? "Project Lead / Creator" : "Co-Builder")}
                            </span>
                            {member.email && member.name && member.name !== member.email && (
                              <span className="truncate opacity-75 hidden sm:inline">({member.email})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isPending && acceptUrl && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(acceptUrl, member.id)}
                            className="size-7 rounded-full hover:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Copy teammate's acceptance link"
                          >
                            {copiedId === member.id ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        )}

                        {!isLead && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(member.id)}
                            className="size-7 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove teammate"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2-WAY ADD TEAM MEMBER CONTAINER */}
            <div className="p-4 sm:p-5 rounded-2xl border bg-muted/20 space-y-4">
              {/* Way Switcher Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="size-3.5 text-primary" /> Add Teammate (2 Ways):
                </span>
                <div className="flex items-center gap-1 bg-background p-1 rounded-xl border self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAddMethod("email");
                      setInviteError(null);
                      setParticipantInviteError(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      addMethod === "email"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="size-3" /> 1. Invite by Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddMethod("participant");
                      setInviteError(null);
                      setParticipantInviteError(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      addMethod === "participant"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="size-3" /> 2. Pick Hackathon Builder
                  </button>
                </div>
              </div>

              {/* WAY 1: INVITE BY EMAIL */}
              {addMethod === "email" && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Enter your teammate&apos;s email to dispatch an invitation email containing an acceptance link. Once they accept, they become fully confirmed; until then, they appear compactly on the project as <strong>&quot;Not Accepted Yet&quot;</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSendEmailInvite();
                          }
                        }}
                        placeholder="Teammate's email (e.g. builder@gmail.com)"
                        className="h-9 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Input
                        value={inviteEmailRole}
                        onChange={(e) => setInviteEmailRole(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSendEmailInvite();
                          }
                        }}
                        placeholder="Role (e.g. Frontend, AI, Designer)"
                        className="h-9 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Button
                        type="button"
                        onClick={() => handleSendEmailInvite()}
                        disabled={isSendingInvite || !inviteEmail.trim()}
                        size="sm"
                        className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        {isSendingInvite ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" /> Send Invite
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {inviteError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Invitation successfully dispatched to {inviteSuccess.email}!</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        An official invitation notification was dispatched with a direct acceptance link. They can accept via the link or you can copy and share it directly below.
                      </p>
                      {inviteSuccess.acceptUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(inviteSuccess.acceptUrl!, "banner")}
                            className="h-7 text-[11px] rounded-lg gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-background cursor-pointer"
                          >
                            {copiedId === "banner" ? (
                              <>
                                <Check className="size-3 text-emerald-600" /> Copied Acceptance Link!
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy Acceptance Link
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WAY 2: PICK REGISTERED PARTICIPANT */}
              {addMethod === "participant" && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Select a registered builder from <strong>{hackathon.title}</strong> to send them an invitation email with an acceptance link. They appear on the project as <strong>&quot;Not Accepted Yet&quot;</strong> until they accept.
                  </p>

                  {availableParticipants.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <Select
                          value={selectedParticipantId}
                          onValueChange={(val) => {
                            setSelectedParticipantId(val || "");
                            setParticipantInviteError(null);
                          }}
                        >
                          <SelectTrigger className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground cursor-pointer">
                            <SelectValue placeholder="Select registered builder..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border bg-popover text-popover-foreground shadow-lg max-h-60">
                            {availableParticipants
                              .filter(
                                (p) =>
                                  p.id !== sessionUser?.id &&
                                  !teamMembers.some(
                                    (m) =>
                                      m.id === p.id ||
                                      (m.email && p.email && m.email.toLowerCase() === p.email.toLowerCase())
                                  )
                              )
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {p.name || p.email} ({p.role || "Builder"})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-4">
                        <Input
                          value={collaboratorRole}
                          onChange={(e) => setCollaboratorRole(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendParticipantInvite();
                            }
                          }}
                          placeholder="Role (e.g. Backend, AI, Designer)"
                          className="h-9 rounded-xl text-xs bg-background"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Button
                          type="button"
                          onClick={() => handleSendParticipantInvite()}
                          disabled={isSendingParticipantInvite || !selectedParticipantId}
                          size="sm"
                          className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          {isSendingParticipantInvite ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Sending...
                            </>
                          ) : (
                            <>
                              <Send className="size-3.5" /> Send Invite
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground text-center">
                      No other registered participants available for this hackathon yet. Use <strong>Way 1: Invite by Email</strong> to invite your teammates!
                    </div>
                  )}

                  {participantInviteError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{participantInviteError}</span>
                    </div>
                  )}

                  {participantInviteSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Invitation successfully dispatched to {participantInviteSuccess.name}!</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        An invitation email was dispatched to <strong>{participantInviteSuccess.email}</strong> with an acceptance link. They appear on your project as <strong>&quot;Not Accepted Yet&quot;</strong> until accepted. You can also copy the link below:
                      </p>
                      {participantInviteSuccess.acceptUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(participantInviteSuccess.acceptUrl!, "participant_banner")}
                            className="h-7 text-[11px] rounded-lg gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-background cursor-pointer"
                          >
                            {copiedId === "participant_banner" ? (
                              <>
                                <Check className="size-3 text-emerald-600" /> Copied Acceptance Link!
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy Acceptance Link
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: THE PROJECT STORY */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCode2 className="size-4 text-primary shrink-0" /> 3. The Project Story & Implementation *
              </CardTitle>
              <CardDescription className="text-xs">
                Explain the core problem, how you engineered the solution, and technical challenges conquered. Supports full Markdown.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <span
                data-testid="draft-autosave-status"
                className={`text-[11px] text-muted-foreground/80 items-center gap-1 font-medium ${
                  lastSavedTime ? "inline-flex" : "hidden"
                }`}
              >
                <CheckCircle2 className="size-3 text-emerald-500" /> Draft auto-saved
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetTemplate}
                className="text-xs rounded-full gap-1.5 h-8 text-muted-foreground hover:text-foreground self-start sm:self-auto cursor-pointer"
                title="Reset or insert Devpost story headings"
              >
                <RotateCcw className="size-3" /> Insert Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Write your project story, architectural diagram links, and implementation overview..."
              minRows={14}
            />
          </CardContent>
        </Card>

        {/* SECTION 4: REPOSITORIES & LINKS */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Globe className="size-4 text-primary shrink-0" /> 4. Code & Live Demonstration
            </CardTitle>
            <CardDescription className="text-xs">
              Provide judges and community members with links to test and inspect your work.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GitHub */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <GithubIcon className="size-3.5 text-primary" /> GitHub / Source Code URL
                </Label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="h-10 rounded-full text-xs bg-background"
                />
              </div>

              {/* Live Demo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="size-3.5 text-primary" /> Live Demo / Web Application
                </Label>
                <Input
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://my-project.vercel.app"
                  className="h-10 rounded-full text-xs bg-background"
                />
              </div>
            </div>

            {/* Video walkthrough */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Video className="size-3.5 text-primary" /> Demo Video URL (YouTube, Loom, Vimeo)
                </Label>
                {videoUrl.trim() && (
                  <span className="text-[11px]">
                    {previewEmbedUrl ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Embed recognized
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">External link</span>
                    )}
                  </span>
                )}
              </div>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
                className="h-10 rounded-full text-xs bg-background"
              />
              {previewEmbedUrl && (
                <div className="pt-2">
                  <div className="w-full max-w-sm aspect-video rounded-2xl overflow-hidden border bg-black shadow-xs relative">
                    <iframe
                      src={previewEmbedUrl}
                      title="Demo Video Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="size-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: TECHNOLOGIES & TECH STACK */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Code2 className="size-4 text-primary shrink-0" /> 5. Technologies & Built With
            </CardTitle>
            <CardDescription className="text-xs">
              Highlight the frameworks, APIs, databases, and languages powering your solution.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Selected Tags */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Selected Technologies ({techStack.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl border bg-muted/20 min-h-[46px]">
                {techStack.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No technologies added yet. Pick from presets below or type your own.
                  </span>
                ) : (
                  techStack.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="rounded-full text-xs pl-3 pr-1.5 py-1 gap-1.5 bg-background border shadow-2xs font-semibold"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tech)}
                        className="size-4 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2">
              <Input
                value={customTechInput}
                onChange={(e) => setCustomTechInput(e.target.value)}
                onKeyDown={handleCustomTechKeyDown}
                placeholder="Type a technology (e.g. Supabase, LangGraph, WebGL) and press Enter"
                className="h-9 rounded-full text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddTag(customTechInput)}
                disabled={!customTechInput.trim()}
                className="rounded-full text-xs font-semibold h-9 px-4 shrink-0 cursor-pointer"
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TECH_PRESETS.map((preset) => {
                  const isSelected = techStack.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => (isSelected ? handleRemoveTag(preset) : handleAddTag(preset))}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: CODE OF CONDUCT & SUBMIT */}
        <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeRules}
                onChange={(e) => setAgreeRules(e.target.checked)}
                className="size-4 mt-0.5 rounded text-primary focus:ring-primary border-muted cursor-pointer"
              />
              <span className="text-foreground leading-relaxed">
                I certify that this submission was created for <strong>{hackathon.title}</strong>, represents original work of our team, and complies with all competition guidelines and community fair play rules.
              </span>
            </label>

            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  asChild
                  className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Link href={`/hackathons/${hackathon.slug}`}>Cancel & Return</Link>
                </Button>
                <span
                  data-testid="draft-footer-status"
                  className={`text-[11px] text-muted-foreground items-center gap-1 font-medium ${
                    lastSavedTime ? "inline-flex" : "hidden"
                  }`}
                >
                  <CheckCircle2 className="size-3 text-emerald-500" /> Draft auto-saved
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !sessionUser || !title.trim() || !agreeRules || isSubmissionsClosed}
                className="w-full sm:w-auto rounded-full text-xs font-bold gap-2 px-8 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Submitting Project...</span>
                  </>
                ) : isSubmissionsClosed ? (
                  <>
                    <Clock className="size-4" />
                    <span>Submissions Closed</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-4" />
                    <span>Submit Project to {hackathon.title}</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        </fieldset>
      </form>
    </div>
  );
}
