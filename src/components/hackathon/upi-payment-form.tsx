"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useModalAlert } from "@/components/ui/modal-alert";
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";
import { buildUpiPaymentUri, generateUpiQrCodeDataUrl } from "@/lib/payment/upi";

export interface UpiPaymentFormProps {
  hackathon: {
    id: string;
    slug: string;
    title: string;
    is_paid?: boolean;
    registration_fee?: number | null;
    fee_currency?: string;
    upi_id?: string | null;
    upi_qr_code_url?: string | null;
    payment_instructions?: string | null;
    is_private?: boolean;
    access_code?: string | null;
    allowed_email_domains?: string[];
  };
  currentUser: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
  existingRegistration?: {
    registered: boolean;
    status: "approved" | "pending" | "rejected";
    participation_type?: string;
    payment_status?: "unpaid" | "pending_verification" | "verified" | "rejected" | null;
    payment_reference?: string | null;
    payment_screenshot_url?: string | null;
    payment_amount?: number | null;
    payment_submitted_at?: string | null;
    payment_rejection_reason?: string | null;
  } | null;
  onSuccess?: () => void;
  compact?: boolean;
}

export function UpiPaymentForm({
  hackathon,
  currentUser,
  existingRegistration,
  onSuccess,
  compact = false,
}: UpiPaymentFormProps) {
  const router = useRouter();
  const { showAlert } = useModalAlert();

  const fee = hackathon.registration_fee || 0;
  const currency = hackathon.fee_currency || "₹";
  const upiId = hackathon.upi_id || "payment@hack4win.online";

  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  const [upiIntentUri, setUpiIntentUri] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Form inputs
  const [utrNumber, setUtrNumber] = useState(existingRegistration?.payment_reference || "");
  const [screenshotUrl, setScreenshotUrl] = useState<string>(
    existingRegistration?.payment_screenshot_url || ""
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [participationType, setParticipationType] = useState<"solo" | "looking_for_team">(
    (existingRegistration?.participation_type as "solo" | "looking_for_team") || "looking_for_team"
  );
  const [studentId, setStudentId] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [accessCodeInput, setAccessCodeInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Generate dynamic QR code if custom QR not provided
  useEffect(() => {
    const uri = buildUpiPaymentUri({
      upiId,
      payeeName: "Hack4Win " + hackathon.title.slice(0, 20),
      amount: fee,
      currency: "INR",
      transactionNote: `Reg ${hackathon.title.slice(0, 15)}`,
    });
    setUpiIntentUri(uri);

    if (!hackathon.upi_qr_code_url) {
      generateUpiQrCodeDataUrl({
        upiId,
        payeeName: "Hack4Win " + hackathon.title.slice(0, 20),
        amount: fee,
      })
        .then(setGeneratedQr)
        .catch((err) => console.warn("[UPI QR Generation Error]:", err));
    }
  }, [upiId, fee, hackathon.title, hackathon.upi_qr_code_url]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Handle direct screenshot upload to /api/upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image exceeds 10MB limit. Please choose a smaller image.");
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "payments");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload payment screenshot");
      }

      setScreenshotUrl(data.url);
    } catch (err) {
      console.error("[Screenshot upload error]:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      window.location.href = `/auth/signin?callbackUrl=/hackathons/${hackathon.slug}/register`;
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      await showAlert({
        title: "Missing UTR / Reference ID",
        message: "Please enter the 12-digit UPI UTR number or Transaction Reference ID from your payment app.",
        type: "warning",
      });
      return;
    }

    if (!screenshotUrl) {
      await showAlert({
        title: "Missing Screenshot",
        message: "Please upload a clear screenshot of your completed UPI payment receipt.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/hackathons/${hackathon.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participation_type: participationType,
          payment_reference: cleanUtr,
          payment_screenshot_url: screenshotUrl,
          payment_amount: fee,
          student_id: studentId.trim() || undefined,
          college_name: collegeName.trim() || undefined,
          access_code: accessCodeInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration payment");
      }

      await showAlert({
        title: "Payment Proof Submitted! 🧾",
        message:
          "Your payment details have been submitted. The organizer will verify the UTR and screenshot. Once verified, your hackathon entry will be officially confirmed!",
        type: "info",
      });

      setIsResubmitting(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("[Submit proof error]:", err);
      await showAlert({
        title: "Submission Failed",
        message: err instanceof Error ? err.message : "Failed to submit payment proof",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Case 1: Participant payment is already verified!
  if (existingRegistration?.payment_status === "verified" && existingRegistration?.status === "approved") {
    return (
      <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 mb-2">
            Payment Verified &amp; Confirmed ✓
          </Badge>
          <h3 className="text-lg font-bold text-foreground">You are officially registered!</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Your registration fee of {currency}{existingRegistration.payment_amount || fee} has been verified by the organizer. You have full access to workspace, team invites, and project submissions.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href={`/hackathons/${hackathon.slug}`}>
              <span>Open Hackathon Workspace &rarr;</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-semibold">
            <Link href={`/hackathons/${hackathon.slug}/submit`}>
              <span>Submit Project</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Case 2: Payment proof is pending review
  if (
    existingRegistration?.payment_status === "pending_verification" &&
    !isResubmitting
  ) {
    return (
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="size-8 animate-pulse" />
        </div>
        <div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold px-3 py-1 mb-2">
            ⏳ Payment Verification Pending
          </Badge>
          <h3 className="text-lg font-bold text-foreground">Payment Proof Received!</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            We received your payment proof for <strong>{hackathon.title}</strong>. The organizer will match your UTR number with their bank statement and approve your entry.
          </p>
        </div>

        {/* Verification Summary Card */}
        <div className="bg-background/80 border rounded-2xl p-4 max-w-sm mx-auto text-left space-y-2 text-xs">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="font-bold text-foreground">{currency}{existingRegistration.payment_amount || fee}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">UTR / Reference:</span>
            <span className="font-mono font-bold text-primary">{existingRegistration.payment_reference || "N/A"}</span>
          </div>
          {existingRegistration.payment_screenshot_url && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Screenshot:</span>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(existingRegistration.payment_screenshot_url || null)}
                className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="size-3" /> View Uploaded Receipt
              </button>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsResubmitting(true)}
            className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className="size-3" /> Re-Submit Proof
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
            <Link href={`/hackathons/${hackathon.slug}`}>Back to Challenge</Link>
          </Button>
        </div>

        {/* Modal lightbox for receipt */}
        {previewScreenshot && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setPreviewScreenshot(null)}
          >
            <div className="relative max-w-lg w-full bg-card rounded-2xl overflow-hidden p-3 border shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 border-b mb-3">
                <span className="text-xs font-bold">Uploaded Payment Screenshot</span>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshot(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="relative aspect-4/3 w-full bg-muted rounded-xl overflow-hidden">
                <Image
                  src={previewScreenshot}
                  alt="Payment receipt proof"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const qrImageUrl = hackathon.upi_qr_code_url || generatedQr;

  return (
    <div className={`space-y-6 ${compact ? "max-w-xl mx-auto" : ""}`}>
      {/* Rejection Notice if applicable */}
      {existingRegistration?.payment_status === "rejected" && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-300 space-y-1 animate-in fade-in">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <AlertTriangle className="size-4 text-red-600" /> Payment Proof Rejected
          </div>
          <p>
            {existingRegistration.payment_rejection_reason ||
              "The organizer could not locate the transaction in their bank statement. Please verify your 12-digit UTR and upload a valid screenshot."}
          </p>
        </div>
      )}

      {/* Header Info */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-1">
          <CreditCard className="size-3.5" /> Paid Hackathon Entry Fee
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          Complete Registration for {hackathon.title}
        </h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Scan the UPI QR code below to pay the registration fee of{" "}
          <strong className="text-foreground font-black text-sm">{currency}{fee}</strong>. Enter your transaction UTR and upload proof to confirm your entry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: QR Code & UPI Details */}
        <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card/60 backdrop-blur-xs">
          <CardContent className="p-6 space-y-5 text-center">
            <div className="inline-flex items-center gap-1 text-[0.7rem] uppercase font-bold tracking-wider text-muted-foreground">
              <QrCode className="size-3.5 text-primary" /> Step 1: Scan &amp; Pay
            </div>

            {/* QR Code Container */}
            <div className="relative mx-auto w-56 h-56 rounded-2xl p-3 bg-white shadow-md border flex items-center justify-center">
              {qrImageUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={qrImageUrl}
                    alt={`UPI QR code for ${hackathon.title}`}
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">Generating UPI QR...</span>
                </div>
              )}
            </div>

            {/* Registration Fee Pill */}
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl py-2 px-4 max-w-xs mx-auto">
              <span className="text-xs font-medium text-muted-foreground">Amount to Pay: </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {currency}{fee}
              </span>
            </div>

            {/* UPI ID Copy Field */}
            <div className="space-y-1 text-left">
              <Label className="text-[0.7rem] text-muted-foreground uppercase font-semibold">
                Pay Directly to UPI ID
              </Label>
              <div className="flex items-center gap-2 bg-muted/50 border rounded-xl p-2 px-3">
                <span className="font-mono text-xs font-bold text-foreground truncate flex-1 select-all">
                  {upiId}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyUpi}
                  className="h-7 px-2 text-xs font-bold gap-1 shrink-0 text-primary cursor-pointer hover:bg-primary/10"
                >
                  {copiedUpi ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copiedUpi ? "Copied!" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {/* Mobile UPI Deep Link */}
            {upiIntentUri && (
              <div className="pt-1">
                <a
                  href={upiIntentUri}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                >
                  <Smartphone className="size-4" /> Pay with UPI App (GPay / PhonePe / Paytm)
                </a>
              </div>
            )}

            {/* Supported payment badges */}
            <div className="text-[0.7rem] text-muted-foreground flex items-center justify-center gap-2 pt-2 border-t">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Accepted: GPay, PhonePe, Paytm, BHIM, Cred, Any UPI App</span>
            </div>

            {hackathon.payment_instructions && (
              <p className="text-[0.7rem] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border italic">
                &ldquo;{hackathon.payment_instructions}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Transaction Proof Form */}
        <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card/60 backdrop-blur-xs">
          <CardContent className="p-6">
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div className="inline-flex items-center gap-1 text-[0.7rem] uppercase font-bold tracking-wider text-muted-foreground">
                <Check className="size-3.5 text-primary" /> Step 2: Attach Payment Proof
              </div>

              {/* UTR / Transaction Reference Number */}
              <div className="space-y-1.5">
                <Label htmlFor="utrNumber" className="text-xs font-bold flex items-center justify-between">
                  <span>12-Digit UPI Reference / UTR Number *</span>
                  <span className="text-[0.65rem] text-muted-foreground font-normal">Found in UPI app receipt</span>
                </Label>
                <Input
                  id="utrNumber"
                  type="text"
                  placeholder="e.g. 428901234567 or TXN98721"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  maxLength={40}
                  className="rounded-xl font-mono text-sm uppercase"
                  required
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  The organizer matches this 12-digit UTR with their bank statement to approve your entry.
                </p>
              </div>

              {/* Payment Screenshot Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span>Payment Screenshot Receipt *</span>
                  <span className="text-[0.65rem] text-muted-foreground font-normal">JPG, PNG, WEBP (Max 10MB)</span>
                </Label>

                {screenshotUrl ? (
                  <div className="relative rounded-2xl border bg-muted/30 p-3 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted border shrink-0">
                      <Image
                        src={screenshotUrl}
                        alt="Screenshot preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Screenshot Attached
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewScreenshot(screenshotUrl)}
                        className="text-[0.7rem] text-primary hover:underline font-semibold mt-0.5 block truncate cursor-pointer"
                      >
                        Click to preview full image
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScreenshotUrl("")}
                      className="text-muted-foreground hover:text-destructive h-8 px-2 cursor-pointer"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleScreenshotUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground">Uploading screenshot...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <UploadCloud className="size-5" />
                        </div>
                        <div className="text-xs font-bold text-foreground">Click to upload payment screenshot</div>
                        <div className="text-[0.7rem] text-muted-foreground">
                          Attach GPay, PhonePe, or Paytm success screen showing amount and UTR
                        </div>
                      </div>
                    )}
                  </label>
                )}

                {uploadError && (
                  <p className="text-[0.7rem] text-destructive font-medium">{uploadError}</p>
                )}
              </div>

              {/* Participation Preference */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold">Participation Preference</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipationType("looking_for_team")}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer ${
                      participationType === "looking_for_team"
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    🤝 Looking for Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipationType("solo")}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs cursor-pointer ${
                      participationType === "solo"
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    ⚡ Compete Solo
                  </button>
                </div>
              </div>

              {/* Campus access code if private */}
              {hackathon.is_private && hackathon.access_code && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="accessCode" className="text-xs font-bold">
                    Campus Access Passcode (Optional)
                  </Label>
                  <Input
                    id="accessCode"
                    type="text"
                    placeholder="Enter campus access code if provided"
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                    className="rounded-xl uppercase font-mono text-xs"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Submitting Verification...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 mr-2" />
                      Submit Payment Proof &amp; Register ({currency}{fee})
                    </>
                  )}
                </Button>
                <p className="text-[0.65rem] text-center text-muted-foreground mt-2">
                  🔒 By submitting, you confirm you have completed the payment of {currency}{fee} to the organizer.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Lightbox for uploaded image */}
      {previewScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewScreenshot(null)}
        >
          <div className="relative max-w-lg w-full bg-card rounded-2xl overflow-hidden p-3 border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b mb-3">
              <span className="text-xs font-bold">Payment Screenshot</span>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative aspect-4/3 w-full bg-muted rounded-xl overflow-hidden">
              <Image
                src={previewScreenshot}
                alt="Payment receipt proof"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
