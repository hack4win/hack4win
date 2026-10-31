"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Users,
  User as UserIcon,
  Check,
  Share2,
  Copy,
  CheckCircle2,
  Loader2,
  Rocket,
  ArrowRight,
  RefreshCw,
  Clock,
  Lock,
  Key,
  School,
  Shield,
  CreditCard,
  IndianRupee,
} from "lucide-react";

interface HackathonActionCardProps {
  hackathonId: string;
  slug: string;
  title: string;
  prizePool: string;
  maxTeamSize: number;
  initialIsRegistered: boolean;
  initialParticipationType?: "solo" | "looking_for_team";
  initialParticipantCount: number;
  isLoggedIn: boolean;
  status: string;
  isSubmissionsClosed?: boolean;
  maxParticipants?: number | null;
  isPrivate?: boolean;
  allowedEmailDomains?: string[];
  hasAccessCode?: boolean;
  initialRegistrationStatus?: "approved" | "pending" | "rejected";
  isPaid?: boolean;
  registrationFee?: number | null;
  feeCurrency?: string;
  initialPaymentStatus?: "unpaid" | "pending_verification" | "verified" | "rejected" | null;
  initialPaymentReference?: string | null;
}

export function HackathonActionCard({
  hackathonId,
  slug,
  title,
  prizePool,
  maxTeamSize,
  initialIsRegistered,
  initialParticipationType = "looking_for_team",
  initialParticipantCount,
  isLoggedIn,
  status,
  isSubmissionsClosed = false,
  maxParticipants = null,
  isPrivate = false,
  allowedEmailDomains = [],
  hasAccessCode = false,
  initialRegistrationStatus = "approved",
  isPaid = false,
  registrationFee = 0,
  feeCurrency = "₹",
  initialPaymentStatus = null,
  initialPaymentReference = null,
}: HackathonActionCardProps) {
  const router = useRouter();
  const { showAlert } = useModalAlert();

  const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
  const [registrationStatus, setRegistrationStatus] = useState<"approved" | "pending" | "rejected">(
    initialRegistrationStatus
  );
  const [participationType, setParticipationType] = useState<"solo" | "looking_for_team">(
    initialParticipationType
  );
  const [count, setCount] = useState(initialParticipantCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchingType, setIsSwitchingType] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "unpaid" | "pending_verification" | "verified" | "rejected" | null
  >(initialPaymentStatus);
  const [paymentReference, setPaymentReference] = useState<string | null>(initialPaymentReference);

  // Modal choice state for registration
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedJoinType, setSelectedJoinType] = useState<"solo" | "looking_for_team">(
    "looking_for_team"
  );
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [collegeNameInput, setCollegeNameInput] = useState("");
  const [academicYearInput, setAcademicYearInput] = useState("");
  const [branchInput, setBranchInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("register") === "true" || params.get("register_required") === "true") {
        if (!isRegistered) {
          if (!isLoggedIn) {
            window.location.href = isPaid
              ? `/auth/signin?callbackUrl=/hackathons/${slug}/register`
              : `/auth/signin?callbackUrl=/hackathons/${slug}`;
          } else if (isPaid) {
            router.push(`/hackathons/${slug}/register`);
          } else {
            setSelectedJoinType("looking_for_team");
            setIsJoinModalOpen(true);
          }
        }
      }
    }
  }, [isRegistered, isLoggedIn, isPaid, slug, router]);

  const handleOpenJoinFlow = () => {
    if (!isLoggedIn) {
      window.location.href = isPaid
        ? `/auth/signin?callbackUrl=/hackathons/${slug}/register`
        : `/auth/signin?callbackUrl=/hackathons/${slug}`;
      return;
    }
    if (isPaid) {
      router.push(`/hackathons/${slug}/register`);
      return;
    }
    // Open choice modal
    setSelectedJoinType("looking_for_team");
    setIsJoinModalOpen(true);
  };

  const handleConfirmRegistration = async () => {
    setIsLoading(true);

    try {
      const queryToken = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("invite") ||
          new URLSearchParams(window.location.search).get("token")
        : undefined;

      const res = await fetch(`/api/hackathons/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participation_type: selectedJoinType,
          access_code: accessCodeInput.trim() || undefined,
          invite_token: queryToken || undefined,
          student_id: studentIdInput.trim() || undefined,
          college_name: collegeNameInput.trim() || undefined,
          academic_year: academicYearInput.trim() || undefined,
          branch: branchInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      setIsRegistered(true);
      if (data.status) {
        setRegistrationStatus(data.status);
      }
      setParticipationType(selectedJoinType);
      if (typeof data.count === "number") {
        setCount(data.count);
      }
      setIsJoinModalOpen(false);

      if (data.requires_verification || data.status === "pending") {
        await showAlert({
          title: "Registration Received ⏳",
          message:
            "Your registration is pending campus verification by the organizer. Once approved, project submissions will be unlocked.",
          type: "info",
        });
      }

      router.refresh();
    } catch (err) {
      console.error("Registration error:", err);
      await showAlert({
        title: "Registration Failed",
        message: err instanceof Error ? err.message : "Failed to join hackathon",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleParticipationType = async () => {
    const nextType: "solo" | "looking_for_team" =
      participationType === "solo" ? "looking_for_team" : "solo";
    setIsSwitchingType(true);

    try {
      const res = await fetch(`/api/hackathons/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participation_type: nextType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update participation preference");
      }

      setParticipationType(nextType);
      router.refresh();
    } catch (err) {
      console.error("Update participation preference error:", err);
      await showAlert({
        title: "Update Failed",
        message: err instanceof Error ? err.message : "Failed to update preference",
        type: "error",
      });
    } finally {
      setIsSwitchingType(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Excited to build at ${title} on Hack4Win! Join the challenge:`);
    const url = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const cleanPrize = (prizePool || "").replace(/^\$+\s*/, "$").replace(/^₹+\s*/, "₹");

  return (
    <>
      <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl flex flex-col gap-4 w-full lg:w-[340px] lg:shrink-0 max-w-full h-fit transition-all duration-300">
        {/* Hackathon Status Highlight Banner */}
        {status === "ongoing" ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="leading-tight flex-1">Hacking Live Now &middot; Submissions Open</span>
          </div>
        ) : status === "upcoming" ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-800 dark:text-blue-200 text-xs font-semibold">
            <Clock className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="leading-tight flex-1">Upcoming Challenge &middot; Register Now</span>
          </div>
        ) : status === "ended" ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60 border border-border text-muted-foreground text-xs font-semibold">
            <CheckCircle2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="leading-tight flex-1">Challenge Ended &middot; Submissions Closed</span>
          </div>
        ) : null}

        {/* Prize Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Total Prize Pool</span>
          <span
            className="text-xl sm:text-2xl font-black text-primary tracking-tight text-right break-words"
            title={cleanPrize}
          >
            {cleanPrize}
          </span>
        </div>

        {/* Private / Campus Hackathon Badge */}
        {isPrivate && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 flex items-start gap-2.5 text-xs">
            <Lock className="size-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Private / Campus Challenge</span>
              <span className="text-[11px] text-muted-foreground block">
                Restricted to invited students, specific college email domains, or passcode holders.
              </span>
            </div>
          </div>
        )}

        {/* Paid Registration Badge */}
        {isPaid && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 text-xs">
            <CreditCard className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <span className="font-bold block">
                Registration Fee: {feeCurrency}{registrationFee || 0}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Payable via UPI QR code. Submit your transaction UTR and screenshot for verification.
              </span>
            </div>
          </div>
        )}

        {/* Stats summary & Participant progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              {maxParticipants && maxParticipants > 0 ? (
                <>
                  <strong className="text-foreground">{count} / {maxParticipants}</strong> spots filled
                </>
              ) : (
                <>
                  <strong className="text-foreground">{count}</strong> {count === 1 ? "participant" : "participants"} joined
                </>
              )}
            </span>
            <span>Max {maxTeamSize} per team</span>
          </div>

          {/* Progress Bar for limited hackathons */}
          {maxParticipants && maxParticipants > 0 && (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    count >= maxParticipants
                      ? "bg-rose-500"
                      : count / maxParticipants > 0.8
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((count / maxParticipants) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span>{Math.round((count / maxParticipants) * 100)}% capacity</span>
                <span>
                  {count >= maxParticipants
                    ? "Full"
                    : `${Math.max(0, maxParticipants - count)} spots left`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Action Area */}
        {status === "ended" ? (
          <Button disabled variant="outline" className="w-full rounded-full font-semibold">
            Challenge Ended
          </Button>
        ) : status === "draft" ? (
          <Button disabled variant="outline" className="w-full rounded-full font-semibold">
            Registration Opens Soon
          </Button>
        ) : isRegistered ? (
          <div className="space-y-3">
            {/* Registered Banner: Approved vs Pending vs Rejected */}
            {paymentStatus === "pending_verification" || (isPaid && registrationStatus === "pending") ? (
              <div className="space-y-2">
                <div className="w-full p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 text-xs font-bold px-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Payment Verification Pending ⏳</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full"
                  >
                    UTR Submitted
                  </Badge>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5">
                  <p className="text-muted-foreground leading-relaxed">
                    Your payment of {feeCurrency}{registrationFee || 0} is awaiting organizer verification.
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold h-7 gap-1">
                    <Link href={`/hackathons/${slug}/register`}>
                      <span>View Receipt &amp; Status &rarr;</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ) : paymentStatus === "rejected" ? (
              <div className="space-y-2">
                <div className="w-full p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 text-xs font-bold px-3">
                  <div className="flex items-center gap-1.5">
                    <Shield className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Payment Proof Rejected ❌</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-full"
                  >
                    Action Needed
                  </Badge>
                </div>
                <Button asChild variant="destructive" size="sm" className="w-full rounded-xl text-xs font-bold h-8">
                  <Link href={`/hackathons/${slug}/register`}>
                    Re-Submit Payment Proof &rarr;
                  </Link>
                </Button>
              </div>
            ) : registrationStatus === "pending" ? (
              <div className="w-full p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 text-xs font-bold px-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Pending Verification ⏳</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full"
                >
                  Under Review
                </Badge>
              </div>
            ) : registrationStatus === "rejected" ? (
              <div className="w-full p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 text-xs font-bold px-3">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>Registration Not Approved ❌</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-full"
                >
                  Rejected
                </Badge>
              </div>
            ) : (
              <div className="w-full p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-2 text-xs font-bold px-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Registered! 🎉</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full"
                >
                  {participationType === "solo" ? "Solo Participant" : "Team Search"}
                </Badge>
              </div>
            )}

            {/* Pending Notice Explainer */}
            {registrationStatus === "pending" && (
              <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Shield className="size-3.5 text-amber-600 shrink-0" /> Campus Organizer Review
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  Your campus access registration is being verified by the host organizer. Once approved, project submissions will unlock automatically.
                </p>
              </div>
            )}

            {/* Participation Mode Switcher */}
            <div className="p-3 rounded-2xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Team Status:</span>
                <span className="font-bold text-foreground">
                  {participationType === "solo" ? "👤 Solo Participant" : "🤝 Looking for Team"}
                </span>
              </div>

              {!isSubmissionsClosed && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSwitchingType}
                  onClick={handleToggleParticipationType}
                  className="w-full text-xs font-semibold rounded-xl h-8 gap-1.5 cursor-pointer bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  {isSwitchingType ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3 text-primary" />
                  )}
                  {participationType === "solo"
                    ? "Change to Looking for Team"
                    : "Change to Competing Solo"}
                </Button>
              )}
            </div>

            {/* Submit Project CTA */}
            {isSubmissionsClosed ? (
              <Button
                disabled
                variant="outline"
                size="default"
                className="w-full rounded-full font-semibold text-xs gap-1.5 opacity-70"
              >
                <Clock className="size-3.5" />
                Submissions Closed
              </Button>
            ) : registrationStatus === "pending" || (isPaid && paymentStatus === "pending_verification") ? (
              <Button
                disabled
                variant="outline"
                size="default"
                className="w-full rounded-full font-semibold text-xs gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 cursor-not-allowed"
              >
                <Clock className="size-3.5" />
                {isPaid && paymentStatus === "pending_verification"
                  ? "Payment Verification Pending"
                  : "Awaiting Organizer Approval"}
              </Button>
            ) : registrationStatus === "rejected" || (isPaid && paymentStatus === "rejected") ? (
              <Button
                disabled
                variant="outline"
                size="default"
                className="w-full rounded-full font-semibold text-xs gap-1.5 bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 cursor-not-allowed"
              >
                {isPaid && paymentStatus === "rejected" ? "Payment Proof Rejected" : "Registration Not Approved"}
              </Button>
            ) : isPaid && (!paymentStatus || paymentStatus === "unpaid") ? (
              <Button
                asChild
                size="default"
                className="w-full rounded-full font-bold text-xs gap-1.5 shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link href={`/hackathons/${slug}/register`}>
                  <CreditCard className="size-3.5" />
                  Complete Payment to Submit ({feeCurrency}{registrationFee || 0})
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="default"
                className="w-full rounded-full font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                <Link href={`/hackathons/${slug}/submit`}>
                  <Rocket className="size-3.5" />
                  Submit Project
                </Link>
              </Button>
            )}
          </div>
        ) : isSubmissionsClosed ? (
          <Button disabled variant="outline" className="w-full rounded-full font-semibold">
            Submissions Closed
          </Button>
        ) : maxParticipants && maxParticipants > 0 && count >= maxParticipants ? (
          <Button
            disabled
            variant="outline"
            className="w-full rounded-full font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 cursor-not-allowed"
          >
            Capacity Reached (Registration Full)
          </Button>
        ) : (
          <Button
            onClick={handleOpenJoinFlow}
            disabled={isLoading}
            size="lg"
            className={`w-full rounded-full gap-2 shadow-sm font-bold text-sm cursor-pointer ${
              isPaid ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPaid ? (
              <CreditCard className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isLoggedIn
              ? isPaid
                ? `Register & Pay (${feeCurrency}${registrationFee || 0})`
                : "Register / Join Hackathon"
              : isPaid
              ? `Sign In to Register (${feeCurrency}${registrationFee || 0})`
              : "Sign In to Join"}
          </Button>
        )}

        {/* Action Buttons: Share & Copy Link */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 rounded-full text-xs gap-1.5 cursor-pointer h-8"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareTwitter}
            className="rounded-full text-xs gap-1.5 cursor-pointer h-8 px-3"
            title="Share to X / Twitter"
          >
            <Share2 className="size-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      {/* Choice Modal: Join as Solo vs Looking for Team */}
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[10px] font-bold text-primary border-primary/20 bg-primary/5">
                Join Challenge
              </Badge>
              {isPrivate && (
                <Badge className="rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                  <Lock className="size-3 mr-1 inline" /> Private
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {title}
              </span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground pt-1">
              Select Your Participation Mode
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you planning to team up with other builders or compete solo? You can switch this anytime in your registration card.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {isPrivate && (
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-950 dark:text-purple-100 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300">
                  <School className="size-4 shrink-0" />
                  <span>Campus / Institutional Access Restriction</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This hackathon is private. To join, your account must have an eligible college domain, be on the invited student roster, or enter the organizer&apos;s secret passcode below.
                </p>
                {allowedEmailDomains.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Allowed domains:</span>
                    {allowedEmailDomains.map((dom) => (
                      <Badge key={dom} variant="outline" className="text-[10px] py-0 px-1.5 bg-background font-mono text-purple-700 dark:text-purple-300 border-purple-500/30">
                        @{dom.replace(/^@/, "")}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                  <Label htmlFor="access-code" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Key className="size-3.5 text-purple-600" />
                    Access Passcode (if required by host)
                  </Label>
                  <Input
                    id="access-code"
                    type="text"
                    placeholder="e.g. CAMPUS-2026"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    className="font-mono text-xs uppercase bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave empty if you registered with an allowed college email or accessed via an authorized invite link.
                  </p>
                </div>

                {/* Campus Student Credentials */}
                <div className="pt-2.5 border-t border-purple-500/20 space-y-2">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <School className="size-3.5" /> Student & College Information (for Organizer Roster)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="student-id" className="text-[10px] font-bold text-muted-foreground">
                        Roll No. / Student ID
                      </Label>
                      <Input
                        id="student-id"
                        placeholder="e.g. 2024CS101"
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value)}
                        className="text-xs h-8 bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="academic-year" className="text-[10px] font-bold text-muted-foreground">
                        Academic Year
                      </Label>
                      <select
                        id="academic-year"
                        value={academicYearInput}
                        onChange={(e) => setAcademicYearInput(e.target.value)}
                        className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 font-medium cursor-pointer"
                      >
                        <option value="">Select Year / Degree</option>
                        <option value="1st Year">1st Year / Freshman</option>
                        <option value="2nd Year">2nd Year / Sophomore</option>
                        <option value="3rd Year">3rd Year / Junior</option>
                        <option value="Final Year">Final Year / Senior</option>
                        <option value="Postgraduate / Masters">Postgraduate / Masters</option>
                        <option value="PhD / Researcher">PhD / Researcher</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="branch" className="text-[10px] font-bold text-muted-foreground">
                        Major / Branch
                      </Label>
                      <Input
                        id="branch"
                        placeholder="e.g. Computer Science"
                        value={branchInput}
                        onChange={(e) => setBranchInput(e.target.value)}
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="college-name" className="text-[10px] font-bold text-muted-foreground">
                        College / University
                      </Label>
                      <Input
                        id="college-name"
                        placeholder="e.g. Stanford University"
                        value={collegeNameInput}
                        onChange={(e) => setCollegeNameInput(e.target.value)}
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Option 1: Looking for Team */}
            <div
              onClick={() => setSelectedJoinType("looking_for_team")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedJoinType === "looking_for_team"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:border-border/80 bg-card"
              }`}
            >
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Users className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground">
                    🤝 Looking for a Team
                  </span>
                  <Badge className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border-0 font-bold">
                    Popular
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Show on the participant directory that you are looking for teammates or open to team invites from other builders.
                </p>
              </div>
            </div>

            {/* Option 2: Solo Participant */}
            <div
              onClick={() => setSelectedJoinType("solo")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedJoinType === "solo"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:border-border/80 bg-card"
              }`}
            >
              <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-foreground">
                  👤 Competing Solo
                </span>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Build and submit your project individually without teaming up. You can still switch later if your plans change.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsJoinModalOpen(false)}
              disabled={isLoading}
              className="rounded-full text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRegistration}
              disabled={isLoading}
              className="rounded-full text-xs font-bold gap-2 px-5 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowRight className="size-3.5" />
              )}
              Confirm & Join
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
