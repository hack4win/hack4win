"use client";

import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { User, Skill } from "@/lib/db/types";
import { signOut } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Globe,
  Code2,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Search,
  Check,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";
import { compressImage } from "@/lib/utils/image-compression";
import { isValidHttpUrl } from "@/lib/url-validation";
import { useModalAlert } from "@/components/ui/modal-alert";

export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "OTHER", name: "Other / Remote", flag: "🌐" },
];

interface ProfileEditorProps {
  initialUser: User;
  availableSkills: Skill[];
}

export function ProfileEditor({ initialUser, availableSkills = [] }: ProfileEditorProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useModalAlert();

  // Form State
  const [name, setName] = useState(initialUser.name || "");
  const [username, setUsername] = useState(initialUser.username || "");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [bio, setBio] = useState(initialUser.bio || "");
  const [country, setCountry] = useState(initialUser.country || "India");
  const [github, setGithub] = useState(initialUser.github_username || "");
  const [website, setWebsite] = useState(initialUser.website || "");
  const [skills, setSkills] = useState<string[]>(initialUser.skills || []);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.image || "");
  const [bannerUrl, setBannerUrl] = useState(initialUser.banner_url || "");

  // Debounce check username uniqueness against API
  React.useEffect(() => {
    const clean = username.trim().toLowerCase();

    const timeout = setTimeout(async () => {
      if (!clean) {
        setUsernameAvailable(null);
        setUsernameError("Username cannot be empty");
        return;
      }
      if (clean === (initialUser.username || "").toLowerCase()) {
        setUsernameAvailable(true);
        setUsernameError(null);
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
        setUsernameAvailable(false);
        setUsernameError("Must be 3-30 characters (letters, numbers, underscores)");
        return;
      }

      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/user/username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setUsernameAvailable(!!data.available);
        setUsernameError(data.available ? null : data.reason || "Username is already taken");
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [username, initialUser.username]);

  // Custom skill input & skill catalog search
  const [customSkill, setCustomSkill] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Image Uploading States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Transition & Feedback State
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Derive unique categories from available skills
  const categories = ["All", ...Array.from(new Set(availableSkills.map((s) => s.category || "General"))).sort()];

  // Filter available skills
  const filteredSkills = availableSkills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(skillSearch.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" || (s.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  /**
   * Handle Smart Avatar Upload
   */
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setUploadFeedback(null);

    try {
      // Smart Compression: Square 500x500 WebP with high quality
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.86,
        format: "image/webp",
      });

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar");

      setAvatarUrl(data.url);
      setUploadFeedback("Avatar updated! Click 'Save Changes' to apply.");
    } catch (err) {
      console.error("Avatar upload error:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload avatar image",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  /**
   * Handle Smart Banner Upload
   */
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setUploadFeedback(null);

    try {
      // Smart Compression: 1920x600 WebP with 0.84 quality
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 600,
        quality: 0.84,
        format: "image/webp",
      });

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("folder", "banners");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload banner");

      setBannerUrl(data.url);
      setUploadFeedback("Banner updated! Click 'Save Changes' to apply.");
    } catch (err) {
      console.error("Banner upload error:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload banner image",
      });
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  /**
   * Toggle skill selection
   */
  const handleToggleSkill = (skillName: string) => {
    if (skills.includes(skillName)) {
      setSkills(skills.filter((s) => s !== skillName));
    } else {
      setSkills([...skills, skillName]);
    }
  };

  /**
   * Add a custom skill
   */
  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setCustomSkill("");
    }
  };

  /**
   * Submit updated profile to API
   */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setUploadFeedback(null);

    if (!name.trim()) {
      const msg = "Display Name cannot be empty.";
      setStatusMessage({ type: "error", text: msg });
      await showAlert({ title: "Incomplete Field", message: msg, type: "warning" });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      const msg = "Username cannot be empty.";
      setStatusMessage({ type: "error", text: msg });
      await showAlert({ title: "Incomplete Field", message: msg, type: "warning" });
      return;
    }
    if (usernameError || usernameAvailable === false) {
      const msg = usernameError || "Please choose a valid and available username.";
      setStatusMessage({ type: "error", text: msg });
      await showAlert({ title: "Invalid Username", message: msg, type: "warning" });
      return;
    }

    if (website.trim() && !isValidHttpUrl(website.trim())) {
      const msg = "Personal Website URL must start with http:// or https://";
      setStatusMessage({ type: "error", text: msg });
      await showAlert({ title: "Invalid Website URL", message: msg, type: "warning" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            username: cleanUsername,
            bio: bio.trim(),
            github_username: github.trim(),
            website: website.trim(),
            skills,
            image: avatarUrl,
            banner_url: bannerUrl,
            country,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update profile");
        }

        setStatusMessage({ type: "success", text: "Profile updated successfully! ✨" });
        router.refresh();
      } catch (err: unknown) {
        console.error("Save profile error:", err);
        const errMsg = err instanceof Error ? err.message : "Failed to update profile";
        if (errMsg.toLowerCase().includes("username")) {
          setUsernameError(errMsg);
        }
        setStatusMessage({
          type: "error",
          text: errMsg,
        });
        await showAlert({
          title: "Update Failed",
          message: errMsg,
          type: "error",
        });
      }
    });
  };

  /**
   * Terminate user session
   */
  const handleSignOut = async () => {
    const confirmed = await showConfirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out of Hack4Win?",
      confirmText: "Sign Out",
      cancelText: "Stay Signed In",
    });
    if (!confirmed) return;

    setIsSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/signin");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/auth/signin");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Notifications */}
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

      {uploadFeedback && (
        <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="size-4 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Hero Profile Card with Interactive Banner and Avatar */}
      <Card className="border shadow-xs overflow-hidden rounded-2xl relative">
        {/* Banner Area */}
        <div className="relative h-44 sm:h-52 w-full bg-muted overflow-hidden group">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Profile Banner"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="size-full bg-gradient-to-r from-primary/20 via-primary/10 to-muted flex items-center justify-center text-muted-foreground/40">
              <ImageIcon className="size-12 stroke-[1.5]" />
            </div>
          )}

          {/* Banner Upload Button Overlay */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-background/85 hover:bg-background text-foreground shadow-sm backdrop-blur-md border border-border/60 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isUploadingBanner ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5 text-primary" />
              )}
              <span>{bannerUrl ? "Change Banner" : "Upload Banner"}</span>
            </button>
            {bannerUrl && (
              <button
                type="button"
                onClick={() => setBannerUrl("")}
                className="p-1.5 rounded-full bg-background/85 hover:bg-background text-muted-foreground hover:text-destructive shadow-sm backdrop-blur-md border border-border/60 transition-all cursor-pointer"
                title="Remove banner"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Header & Avatar Area */}
        <CardHeader className="relative -mt-16 sm:-mt-20 pb-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-5">
              {/* Avatar with Camera Trigger */}
              <div className="relative group shrink-0">
                <div className="size-28 sm:size-32 rounded-full border-4 border-background bg-card text-foreground font-black text-3xl flex items-center justify-center shadow-lg overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || "User Avatar"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{(name?.[0] || initialUser.email?.[0] || "U").toUpperCase()}</span>
                  )}
                </div>

                {/* Avatar Camera Overlay Button */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-transparent backdrop-blur-[2px]"
                  title="Change avatar photo"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="size-6 animate-spin text-white" />
                  ) : (
                    <>
                      <Camera className="size-6 text-white mb-1" />
                      <span className="text-[10px] font-semibold tracking-wide uppercase">Change</span>
                    </>
                  )}
                </button>
              </div>

              {/* User Bio Headline */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {name || "Anonymous Participant"}
                  </h1>
                  {username && (
                    <span className="text-sm font-semibold text-muted-foreground font-mono">
                      @{username}
                    </span>
                  )}
                  <Badge
                    variant={initialUser.role === "admin" ? "default" : "secondary"}
                    className="capitalize text-xs font-semibold rounded-full px-2.5 py-0.5"
                  >
                    {initialUser.role}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <Mail className="size-3.5" /> {initialUser.email}
                  {initialUser.email_verified ? (
                    <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                      <CheckCircle2 className="size-3 mr-0.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium ml-1">
                      <AlertCircle className="size-3 mr-0.5" /> Unverified
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center text-xs text-muted-foreground gap-3 self-start sm:self-end flex-wrap">
              {country && (
                <span className="flex items-center gap-1 font-semibold text-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                  <MapPin className="size-3.5 text-primary" /> {country}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Joined {new Date(initialUser.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card className="border shadow-xs rounded-2xl">
          <CardHeader className="py-4 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold">Profile Details & Bio</CardTitle>
            <CardDescription>
              Your public credentials, contact handles, and participant biography.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Display Name, Username & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground">
                  Display Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Satoshi Nakamoto"
                  disabled={isPending}
                  className="rounded-full text-xs h-9.5"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Unique Username</span>
                  {usernameChecking ? (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                      <Loader2 className="size-3 animate-spin" /> Checking...
                    </span>
                  ) : usernameAvailable === true ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-normal">
                      <Check className="size-3" /> Available
                    </span>
                  ) : usernameAvailable === false ? (
                    <span className="text-[10px] text-destructive flex items-center gap-1 font-normal">
                      <X className="size-3" /> Taken
                    </span>
                  ) : null}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs font-semibold">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    disabled={isPending}
                    maxLength={30}
                    className="rounded-full text-xs h-9.5 pl-8 font-mono"
                  />
                </div>
                {usernameError && (
                  <p className="text-[10px] text-destructive">{usernameError}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label htmlFor="country" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Country / Region
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isPending}
                  className="w-full h-9.5 rounded-full border border-input bg-background px-3.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label htmlFor="bio" className="text-xs font-semibold text-foreground">
                About & Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Full-stack AI developer passionate about open source and agentic workflows..."
                className="w-full rounded-2xl border border-input bg-transparent px-4 py-2.5 text-sm transition-all duration-200 outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 shadow-xs resize-none"
                disabled={isPending}
              />
            </div>

            {/* Social & Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="github" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Code2 className="size-3.5 text-muted-foreground" /> GitHub Username
                </label>
                <Input
                  id="github"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="octocat"
                  disabled={isPending}
                  className="rounded-full"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="website" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" /> Portfolio / Website
                </label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://myportfolio.dev"
                  disabled={isPending}
                  className="rounded-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Selection Section */}
        <Card className="border shadow-xs rounded-2xl">
          <CardHeader className="py-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> Technical Skills & Proficiencies
                </CardTitle>
                <CardDescription>
                  Select from platform skills or add custom skills to show on your participant card.
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full text-xs font-semibold">
                {skills.length} selected
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Active Skills (Pills) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Selected Skills
              </label>

              {skills.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                  No skills selected yet. Click skills from the catalog below or type custom ones to add.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 font-medium text-xs rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSkill(skill)}
                        className="hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                        title="Remove skill"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Add Custom Skill Row */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold text-foreground">
                Add Custom Skill
              </label>
              <div className="flex gap-2">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={handleAddCustomSkill}
                  placeholder="e.g. LangChain, Elixir, WebGL (press Enter)"
                  disabled={isPending}
                  className="rounded-full text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomSkill}
                  disabled={!customSkill.trim() || isPending}
                  className="rounded-full px-5 gap-1.5 shrink-0 cursor-pointer text-xs"
                >
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            </div>

            {/* Platform Skills Browser */}
            {availableSkills.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Select from Platform Skills
                  </label>

                  {/* Search Platform Skills */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter skills..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="pl-8 rounded-full h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Category Filter Pills */}
                {categories.length > 2 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Skill Badges Selector */}
                <div className="flex flex-wrap gap-2 pt-2 max-h-56 overflow-y-auto pr-1">
                  {filteredSkills.map((s) => {
                    const isSelected = skills.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSkill(s.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs scale-102"
                            : "bg-background text-foreground hover:bg-muted/50 border-input"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="size-3" />
                        ) : (
                          <Plus className="size-3 text-muted-foreground" />
                        )}
                        <span>{s.name}</span>
                        {s.category && (
                          <span
                            className={`text-[10px] ml-0.5 ${
                              isSelected ? "text-primary-foreground/75" : "text-muted-foreground"
                            }`}
                          >
                            ({s.category})
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {filteredSkills.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      No platform skills match &quot;{skillSearch}&quot;.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-5">
            <Button
              type="button"
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut || isPending}
              className="w-full sm:w-auto gap-2 rounded-full cursor-pointer"
            >
              {isSigningOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign Out
            </Button>

            <Button
              type="submit"
              disabled={isPending || isUploadingAvatar || isUploadingBanner}
              size="lg"
              className="w-full sm:w-auto gap-2 rounded-full cursor-pointer px-8"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
