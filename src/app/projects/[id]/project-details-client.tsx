"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Hackathon, HackathonSubmission, ProjectEvaluation, SessionUser, SubmissionTeamMember } from "@/lib/db/types";
import { getSafeExternalUrl } from "@/lib/url-validation";
import { UserMenu } from "@/components/navigation/user-menu";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { SiteFooter } from "@/components/navigation/site-footer";
import {
  Trophy,
  ArrowLeft,
  ExternalLink,
  Code2,
  Play,
  Share2,
  CheckCircle2,
  Star,
  Users,
  Calendar,
  Award,
  Sparkles,
  Clock,
  Gavel,
  Copy,
  Check,
  Pencil,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Quote,
  Eye,
  Rocket,
  Maximize2,
  X,
  Image as ImageIcon,
  Film,
  Lock,
} from "lucide-react";

export interface MediaCarouselItem {
  id: string;
  type: "video" | "image";
  url: string;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  title: string;
  badge: string;
}

interface ProjectDetailsClientProps {
  submission: HackathonSubmission;
  hackathon: Hackathon | null;
  evaluations: ProjectEvaluation[];
  relatedProjects: HackathonSubmission[];
  currentUser: SessionUser | null;
}

export function getVideoThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const ytMatch = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

export function getEmbedVideoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    // YouTube (standard watch, short URL youtu.be, embed, shorts)
    const ytMatch = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }
    // Loom (share or embed)
    const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
    if (loomMatch && loomMatch[1]) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function ProjectDetailsClient({
  submission,
  hackathon,
  evaluations,
  relatedProjects,
  currentUser,
}: ProjectDetailsClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const embedVideoUrl = getEmbedVideoUrl(submission.video_url);

  // Compile unified media gallery items (Video + Cover Image + Screenshots)
  const mediaItems = React.useMemo<MediaCarouselItem[]>(() => {
    const items: MediaCarouselItem[] = [];

    // 1. Pitch / Demo Video (if recognized embed URL exists)
    if (embedVideoUrl) {
      items.push({
        id: "video-item",
        type: "video",
        url: submission.video_url || embedVideoUrl,
        embedUrl: embedVideoUrl,
        thumbnailUrl: getVideoThumbnail(submission.video_url) || submission.cover_image,
        title: "Pitch & Demo Video",
        badge: "Pitch Video",
      });
    }

    // 2. Cover Image (if present)
    if (submission.cover_image) {
      items.push({
        id: "cover-item",
        type: "image",
        url: submission.cover_image,
        thumbnailUrl: submission.cover_image,
        title: `${submission.title} Cover`,
        badge: "Cover Banner",
      });
    }

    // 3. Screenshots (multiple screenshots uploaded by developer)
    if (Array.isArray(submission.screenshots)) {
      submission.screenshots.forEach((shotUrl, idx) => {
        if (shotUrl && shotUrl !== submission.cover_image) {
          items.push({
            id: `screenshot-item-${idx}`,
            type: "image",
            url: shotUrl,
            thumbnailUrl: shotUrl,
            title: `Screenshot ${idx + 1}`,
            badge: `Screenshot #${idx + 1}`,
          });
        }
      });
    }

    return items;
  }, [embedVideoUrl, submission.video_url, submission.cover_image, submission.screenshots, submission.title]);

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailStripRef = React.useRef<HTMLDivElement>(null);

  // Keep active index within bounds
  const safeActiveIndex = mediaItems.length > 0 ? Math.min(activeMediaIndex, mediaItems.length - 1) : 0;
  const currentMedia = mediaItems[safeActiveIndex] || null;

  const handlePrevMedia = React.useCallback(() => {
    if (mediaItems.length <= 1) return;
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  }, [mediaItems.length]);

  const handleNextMedia = React.useCallback(() => {
    if (mediaItems.length <= 1) return;
    setActiveMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  }, [mediaItems.length]);

  const handleSelectMedia = (index: number) => {
    setActiveMediaIndex(index);
    if (thumbnailStripRef.current) {
      const childNode = thumbnailStripRef.current.children[index] as HTMLElement | undefined;
      if (childNode) {
        childNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  const scrollThumbnails = (direction: "left" | "right") => {
    if (thumbnailStripRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      thumbnailStripRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Keyboard navigation for carousel & lightbox
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "Escape") {
          setLightboxOpen(false);
        } else if (e.key === "ArrowLeft") {
          handlePrevMedia();
        } else if (e.key === "ArrowRight") {
          handleNextMedia();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, handlePrevMedia, handleNextMedia]);

  const isAuthorOrTeamMember =
    Boolean(currentUser) &&
    (currentUser?.id === submission.user_id ||
      submission.team_member_ids?.includes(currentUser?.id || "") ||
      currentUser?.role === "admin");

  const [isSubmissionsClosed] = useState(() => {
    if (!hackathon) return false;
    if (hackathon.status === "ended") return true;
    const now = Date.now();
    if (hackathon.submission_deadline && new Date(hackathon.submission_deadline).getTime() < now) {
      return true;
    }
    return new Date(hackathon.end_date).getTime() < now;
  });

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const members: SubmissionTeamMember[] =
    submission.team_members && submission.team_members.length > 0
      ? submission.team_members
      : [
          {
            id: submission.user_id,
            name: submission.user_name || "Builder",
            image: submission.user_image || null,
            role: "Creator",
            status: "accepted",
            email: null,
          },
        ];

  const hasScore = typeof submission.total_score === "number" && submission.total_score > 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <BrandLogo size="md" />
          </Link>

          {hackathon && (
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex rounded-full text-xs text-muted-foreground">
              <Link href={`/hackathons/${hackathon.slug}`} className="gap-1.5">
                <ArrowLeft className="size-3.5" /> Back to {hackathon.title}
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {(currentUser?.role === "admin" || currentUser?.role === "judge") && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:inline-flex rounded-full text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Link href="/admin/judging">
                <Gavel className="size-3.5 text-amber-500" /> Judging Portal
              </Link>
            </Button>
          )}

          {currentUser?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:inline-flex rounded-full text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Link href="/admin/projects">
                <ShieldCheck className="size-3.5 text-primary" /> Admin Projects
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShareLink}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            {copiedLink ? (
              <>
                <Check className="size-3.5 text-emerald-500" /> Link Copied
              </>
            ) : (
              <>
                <Share2 className="size-3.5" /> Share
              </>
            )}
          </Button>

          {currentUser ? (
            <UserMenu user={currentUser} />
          ) : (
            <Button asChild size="sm" className="rounded-full text-xs font-bold shadow-xs">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <Link href="/hackathons" className="hover:text-foreground transition-colors">
            Hackathons
          </Link>
          {hackathon && (
            <>
              <ChevronRight className="size-3 text-muted-foreground/60" />
              <Link
                href={`/hackathons/${hackathon.slug}`}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {hackathon.title}
              </Link>
            </>
          )}
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {submission.title}
          </span>
        </nav>

        {/* HERO TITLE & CALLOUTS */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.role === "admin" && (
              <Badge variant="outline" className="bg-primary/5 border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full gap-1">
                <ShieldCheck className="size-3.5" /> Admin View ({submission.status})
              </Badge>
            )}

            {submission.winner_badge && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md">
                <Trophy className="size-3.5 mr-1.5" /> {submission.winner_badge}
              </Badge>
            )}

            {hasScore && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-black text-xs px-3 py-1 rounded-full gap-1">
                <Star className="size-3 fill-amber-500" />
                Score: {submission.total_score} / 50
              </Badge>
            )}

            {hackathon && (
              <Link href={`/hackathons/${hackathon.slug}`} className="inline-flex">
                <Badge variant="outline" className="rounded-full text-xs px-3 py-1 font-semibold hover:bg-muted transition-colors cursor-pointer">
                  <Sparkles className="size-3 text-primary mr-1.5" /> Built for {hackathon.title}
                </Badge>
              </Link>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
            {submission.title}
          </h1>

          {submission.tagline && (
            <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-3xl font-medium">
              {submission.tagline}
            </p>
          )}

          {/* Action CTA Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {getSafeExternalUrl(submission.demo_url) && (
              <Button asChild size="lg" className="rounded-full text-xs sm:text-sm font-bold gap-2 shadow-md h-11 px-5">
                <a href={getSafeExternalUrl(submission.demo_url)} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Launch Live Demo
                </a>
              </Button>
            )}

            {getSafeExternalUrl(submission.github_url) && (
              <Button asChild variant="outline" size="lg" className="rounded-full text-xs sm:text-sm font-bold gap-2 h-11 px-5">
                <a href={getSafeExternalUrl(submission.github_url)} target="_blank" rel="noreferrer">
                  <Code2 className="size-4" /> Source Code
                </a>
              </Button>
            )}

            {getSafeExternalUrl(submission.video_url) && (
              <Button asChild variant="outline" size="lg" className="rounded-full text-xs sm:text-sm font-bold gap-2 h-11 px-5">
                <a href={getSafeExternalUrl(submission.video_url)} target="_blank" rel="noreferrer">
                  <Play className="size-4 text-primary" /> Watch Pitch Video
                </a>
              </Button>
            )}

            {isAuthorOrTeamMember && hackathon && (
              isSubmissionsClosed ? (
                <Badge
                  variant="outline"
                  className="rounded-full px-4 text-xs font-semibold gap-1.5 border-muted-foreground/30 text-muted-foreground bg-muted/40 cursor-not-allowed select-none h-11"
                  title="The submission deadline for this hackathon has passed"
                >
                  <Lock className="size-3.5 text-muted-foreground" />
                  <span>Submissions Locked (Deadline Passed)</span>
                </Badge>
              ) : (
                <Button asChild variant="ghost" size="lg" className="rounded-full text-xs font-bold gap-2 text-muted-foreground hover:text-foreground h-11">
                  <Link href={`/hackathons/${hackathon.slug}/submit`}>
                    <Pencil className="size-3.5" /> Edit Submission
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>

        {/* HERO MEDIA: INTERACTIVE VIDEO & SCREENSHOTS CAROUSEL */}
        {mediaItems.length > 0 && currentMedia && (
          <div className="space-y-3">
            {/* Main Carousel Display Viewport */}
            <div className="w-full aspect-video max-h-[560px] rounded-3xl overflow-hidden border bg-black shadow-2xl relative group">
              {currentMedia.type === "video" && currentMedia.embedUrl ? (
                <iframe
                  src={currentMedia.embedUrl}
                  title={`${submission.title} Demo Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full border-0"
                />
              ) : (
                <div
                  className="size-full flex items-center justify-center bg-zinc-950 cursor-pointer relative"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={currentMedia.url}
                    alt={currentMedia.title}
                    fetchPriority="high"
                    decoding="async"
                    className="size-full object-contain"
                  />
                  {/* Subtle hover zoom prompt */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                      <Maximize2 className="size-3.5" /> Click to enlarge
                    </div>
                  </div>
                </div>
              )}

              {/* Top Bar Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <Badge
                  variant="secondary"
                  className="bg-black/75 backdrop-blur-md text-white border-white/20 text-xs font-bold px-3 py-1 rounded-full shadow-lg gap-1.5 pointer-events-auto"
                >
                  {currentMedia.type === "video" ? (
                    <Play className="size-3 text-red-500 fill-red-500" />
                  ) : (
                    <ImageIcon className="size-3 text-primary" />
                  )}
                  <span>{currentMedia.badge}</span>
                  {mediaItems.length > 1 && (
                    <span className="text-white/60 ml-1 font-medium">
                      ({safeActiveIndex + 1}/{mediaItems.length})
                    </span>
                  )}
                </Badge>

                {currentMedia.type === "image" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLightboxOpen(true)}
                    className="rounded-full text-xs font-semibold h-8 px-3 gap-1.5 bg-black/75 backdrop-blur-md text-white border-white/20 hover:bg-black/90 pointer-events-auto cursor-pointer shadow-lg"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="size-3" /> Fullscreen
                  </Button>
                )}
              </div>

              {/* Prev / Next Navigation Arrows (visible if > 1 items) */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevMedia}
                    className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 hover:bg-background text-foreground border border-border/80 shadow-xl backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:scale-105 z-10"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMedia}
                    className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 hover:bg-background text-foreground border border-border/80 shadow-xl backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:scale-105 z-10"
                    aria-label="Next Slide"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            {/* Horizontal Scrollbar Thumbnail Strip */}
            {mediaItems.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Film className="size-3.5 text-primary" />
                    <span>Project Media Gallery ({mediaItems.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollThumbnails("left")}
                      className="size-7 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Scroll Thumbnails Left"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => scrollThumbnails("right")}
                      className="size-7 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Scroll Thumbnails Right"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                <div
                  ref={thumbnailStripRef}
                  className="flex items-center gap-3 overflow-x-auto pb-2.5 pt-0.5 px-0.5 scroll-smooth snap-x scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/60"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {mediaItems.map((item, idx) => {
                    const isActive = idx === safeActiveIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMedia(idx)}
                        className={`group/thumb relative w-32 sm:w-40 aspect-video shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer snap-start ${
                          isActive
                            ? "border-primary ring-2 ring-primary/40 shadow-lg scale-[1.02]"
                            : "border-border/70 opacity-60 hover:opacity-100 hover:border-primary/50"
                        }`}
                        title={item.title}
                      >
                        {item.type === "video" ? (
                          <div className="size-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover group-hover/thumb:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="size-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="size-7 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-md">
                                <Play className="size-3.5 fill-white ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-bold text-white bg-black/75 px-1.5 py-0.5 rounded-md truncate text-center">
                              Pitch Video
                            </span>
                          </div>
                        ) : (
                          <div className="size-full bg-zinc-900 relative overflow-hidden">
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              className="size-full object-cover group-hover/thumb:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 left-1.5 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-[85%]">
                              {item.badge}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FULLSCREEN LIGHTBOX MODAL */}
            {lightboxOpen && currentMedia && currentMedia.type === "image" && (
              <div
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
                onClick={() => setLightboxOpen(false)}
              >
                {/* Lightbox Header */}
                <div
                  className="flex items-center justify-between text-white pb-3 border-b border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm sm:text-base">{submission.title}</span>
                    <Badge variant="outline" className="text-white border-white/30 text-xs font-semibold">
                      {currentMedia.badge} ({safeActiveIndex + 1} of {mediaItems.length})
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLightboxOpen(false)}
                    className="size-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="Close (Esc)"
                  >
                    <X className="size-5" />
                  </Button>
                </div>

                {/* Lightbox Main Image & Navigation */}
                <div
                  className="flex-1 flex items-center justify-center p-2 sm:p-6 relative overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {mediaItems.length > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevMedia}
                      className="absolute left-2 sm:left-6 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-105 z-10"
                      title="Previous"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                  )}

                  <img
                    src={currentMedia.url}
                    alt={currentMedia.title}
                    className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl select-none"
                  />

                  {mediaItems.length > 1 && (
                    <button
                      type="button"
                      onClick={handleNextMedia}
                      className="absolute right-2 sm:right-6 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer hover:scale-105 z-10"
                      title="Next"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  )}
                </div>

                {/* Lightbox Footer Note */}
                <div
                  className="text-center text-xs text-white/60 pt-2 border-t border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  Use arrow keys (← / →) or on-screen arrows to navigate. Press Esc or click outside to exit.
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN BODY: 2 COLUMNS (STORY & SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Description Story, Tech Stack & Judge Critiques */}
          <div className="lg:col-span-8 space-y-8">
            {/* Project Story & Markdown Preview */}
            <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-4 px-6 sm:px-8">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Rocket className="size-4 text-primary" /> About This Project
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed architectural overview, problem statement, and technical execution.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <div className="prose dark:prose-invert max-w-none text-foreground text-sm sm:text-base leading-relaxed">
                  <MarkdownPreview content={submission.description} />
                </div>
              </CardContent>
            </Card>

            {/* Official Judge Evaluations & Critiques */}
            {evaluations.length > 0 && (
              <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
                <CardHeader className="border-b bg-muted/20 py-4 px-6 sm:px-8">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Gavel className="size-4 text-amber-500" /> Official Judge Scorecards & Critiques
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluated by verified hackathon jury on a 50-point rubric.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {evaluations.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-5 rounded-2xl border bg-muted/20 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <div className="font-bold text-sm text-foreground">
                            Judge: {ev.judge_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Verified Official Judge
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ev.award && (
                            <Badge className="bg-amber-500 text-white font-bold text-xs">
                              {ev.award}
                            </Badge>
                          )}
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-xs">
                            {ev.total_score} / 50 pts
                          </Badge>
                        </div>
                      </div>

                      {/* 5-Criteria Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-card border text-center">
                          <span className="text-[10px] text-muted-foreground block">Innovation</span>
                          <span className="font-bold">{ev.score_innovation} / 10</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-card border text-center">
                          <span className="text-[10px] text-muted-foreground block">Tech Stack</span>
                          <span className="font-bold">{ev.score_technical} / 10</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-card border text-center">
                          <span className="text-[10px] text-muted-foreground block">UI / UX</span>
                          <span className="font-bold">{ev.score_design} / 10</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-card border text-center">
                          <span className="text-[10px] text-muted-foreground block">Impact</span>
                          <span className="font-bold">{ev.score_impact} / 10</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-card border text-center">
                          <span className="text-[10px] text-muted-foreground block">Demo & Pitch</span>
                          <span className="font-bold">{ev.score_presentation} / 10</span>
                        </div>
                      </div>

                      {/* Qualitative Feedback Quote */}
                      {ev.feedback && (
                        <div className="p-4 rounded-xl bg-card border flex items-start gap-3">
                          <Quote className="size-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed">
                            &ldquo;{ev.feedback}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (4 cols): Sidebar with Hackathon, Builders, and Tech Stack */}
          <div className="lg:col-span-4 space-y-6">
            {/* Hackathon Context Card */}
            {hackathon && (
              <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
                <CardHeader className="border-b bg-muted/20 py-3.5 px-6">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Trophy className="size-4 text-primary" /> Competition Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {hackathon.banner_url && (
                    <div className="h-28 w-full rounded-2xl overflow-hidden border">
                      <img
                        src={hackathon.banner_url}
                        alt={hackathon.title}
                        className="size-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-base text-foreground leading-snug">
                      <Link href={`/hackathons/${hackathon.slug}`} className="hover:text-primary transition-colors">
                        {hackathon.title}
                      </Link>
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {hackathon.tagline}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border bg-muted/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prize Pool:</span>
                      <span className="font-bold text-primary">{hackathon.prize_pool}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-semibold capitalize text-foreground">{hackathon.format}</span>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="w-full rounded-full text-xs font-bold">
                    <Link href={`/hackathons/${hackathon.slug}`}>
                      View Hackathon Challenge <ExternalLink className="size-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Team Builders Squad */}
            <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Project Builders ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {members.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <Link
                      href={
                        member.username
                          ? `/u/${member.username}`
                          : `/users/${member.id || submission.user_id}`
                      }
                      className="flex items-center gap-3 min-w-0 group"
                    >
                      <UserAvatar
                        src={member.image}
                        name={member.name || member.email}
                        alt={member.name || "Builder"}
                        className="size-9 rounded-full bg-primary/10 text-primary border shrink-0"
                        iconClassName="size-4.5 text-primary"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {member.name || member.email || "Builder"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {member.role || (idx === 0 ? "Project Creator" : "Collaborator")}
                        </div>
                      </div>
                    </Link>

                    {member.status === "pending" ? (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Confirmed
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Technologies & Stack */}
            {submission.tech_stack && submission.tech_stack.length > 0 && (
              <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
                <CardHeader className="border-b bg-muted/20 py-3.5 px-6">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Code2 className="size-4 text-primary" /> Tech Stack & Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-1.5">
                    {submission.tech_stack.map((tech, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-mono font-medium rounded-lg px-2.5 py-1"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Metadata */}
            <Card className="rounded-3xl border bg-card shadow-xs overflow-hidden">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted On:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {new Date(submission.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-emerald-600 capitalize">
                    {submission.status || "Approved"}
                  </span>
                </div>
                {submission.is_featured && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Showcase:</span>
                    <span className="font-bold text-amber-500">Featured Build</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RELATED PROJECTS FROM THIS HACKATHON */}
        {relatedProjects.length > 0 && (
          <section className="pt-8 border-t space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  More Projects From This Hackathon
                </h3>
                <p className="text-xs text-muted-foreground">
                  Explore other builds competing in {hackathon?.title || "this competition"}.
                </p>
              </div>

              {hackathon && (
                <Button variant="ghost" asChild size="sm" className="rounded-full text-xs">
                  <Link href={`/hackathons/${hackathon.slug}?tab=projects`}>
                    View all projects <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {relatedProjects.map((rel) => (
                <Card
                  key={rel.id}
                  className="rounded-3xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  <Link href={`/projects/${rel.id}`} className="block">
                    <div className="h-36 w-full bg-muted overflow-hidden relative">
                      {rel.cover_image ? (
                        <img
                          src={rel.cover_image}
                          alt={rel.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
                          <Rocket className="size-8" />
                        </div>
                      )}
                      {rel.winner_badge && (
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className="bg-amber-500 text-white font-bold text-[10px] rounded-full border-0">
                            {rel.winner_badge}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {rel.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {rel.tagline || rel.description}
                      </p>
                    </div>
                  </Link>

                  <div className="px-5 pb-5 pt-0 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{rel.user_name || "Builder"}</span>
                    <Button asChild variant="outline" size="sm" className="rounded-full text-[11px] h-7 px-3">
                      <Link href={`/projects/${rel.id}`}>
                        <Eye className="size-3 mr-1" /> View
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
