"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Server,
  Zap,
} from "lucide-react";

interface EmailTestSectionProps {
  adminEmail: string;
}

interface TestResult {
  success: boolean;
  messageId?: string;
  engineUsed?: string;
  recipient?: string;
  sender?: string;
  sentAt?: string;
  warning?: string;
  error?: string;
  isIpRestricted?: boolean;
  detectedIp?: string;
  guidanceUrl?: string;
  guidanceMessage?: string;
}

interface VerifyResult {
  status: string;
  smtp?: { connected: boolean; error?: string };
  api?: { connected: boolean; error?: string };
  isIpRestricted?: boolean;
  detectedIp?: string;
  guidanceUrl?: string;
}

export function EmailTestSection({ adminEmail }: EmailTestSectionProps) {
  const [recipient, setRecipient] = useState(adminEmail);
  const [senderKey, setSenderKey] = useState<string>("NOTIFICATIONS");
  const [engine, setEngine] = useState<"auto" | "brevo_api" | "brevo_smtp">("auto");
  const [subject, setSubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;

    setIsSending(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipient.trim(),
          senderKey,
          engine,
          subject: subject.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestResult({
          success: false,
          error: data.error || `HTTP ${res.status} dispatch error`,
          isIpRestricted: data.isIpRestricted,
          detectedIp: data.detectedIp,
          guidanceUrl: data.guidanceUrl,
          guidanceMessage: data.guidanceMessage,
        });
      } else {
        setTestResult({
          success: true,
          messageId: data.messageId,
          engineUsed: data.engineUsed,
          recipient: data.recipient,
          sender: data.sender,
          sentAt: data.sentAt,
          warning: data.warning,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Network error while sending test email",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyHandshake = async () => {
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/email/verify");
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({
        status: "error",
        smtp: { connected: false, error: err instanceof Error ? err.message : "Verification request failed" },
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="border shadow-xs md:col-span-2">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Email Dispatch &amp; Delivery Diagnostics</CardTitle>
              <CardDescription>
                Transactional email relay (Brevo API v3 &amp; SMTP Relay) with DKIM/SPF alignment on{" "}
                <span className="font-semibold text-foreground">hack4win.online</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVerifyHandshake}
              disabled={isVerifying}
              className="text-xs rounded-xl h-8 gap-1.5 cursor-pointer"
            >
              {isVerifying ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              <span>Verify Relay</span>
            </Button>
            <Badge
              variant="outline"
              className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-xs gap-1 py-1"
            >
              <CheckCircle2 className="size-3" /> Ready
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 text-sm">
        {/* Handshake Verification Banner */}
        {verifyResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              verifyResult.status === "connected"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : verifyResult.isIpRestricted
                ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-1.5">
                {verifyResult.status === "connected" ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-600" />
                )}
                Handshake Status: {verifyResult.status.toUpperCase()}
              </span>
              <span className="font-mono text-[11px] opacity-80">
                SMTP: {verifyResult.smtp?.connected ? "OK (Port 587)" : "Blocked"} &bull; API:{" "}
                {verifyResult.api?.connected ? "OK (HTTPS)" : "Unreachable"}
              </span>
            </div>

            {verifyResult.isIpRestricted && (
              <div className="space-y-1.5 pt-1 text-[11px] leading-relaxed">
                <p>
                  <strong>Brevo IP Security Restriction Detected:</strong> Server IP{" "}
                  <code className="bg-background px-1.5 py-0.5 rounded font-mono font-bold">
                    {verifyResult.detectedIp || "Current Server"}
                  </code>{" "}
                  is not authorized in your Brevo account.
                </p>
                {verifyResult.guidanceUrl && (
                  <a
                    href={verifyResult.guidanceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                  >
                    Whitelist Server IP in Brevo Dashboard <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email Test Dispatch Form */}
        <form onSubmit={handleSendTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recipient Input */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="test-recipient" className="text-xs font-bold text-foreground">
                Target Recipient Email
              </Label>
              <Input
                id="test-recipient"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="admin@example.com"
                required
                className="rounded-xl h-9 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                Pre-filled with your admin address. You will receive an immediate diagnostic email.
              </span>
            </div>

            {/* Sender Key Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="test-sender" className="text-xs font-bold text-foreground">
                Sender Identity
              </Label>
              <select
                id="test-sender"
                value={senderKey}
                onChange={(e) => setSenderKey(e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="NOTIFICATIONS">Notifications (notifications@)</option>
                <option value="WELCOME">Welcome (welcome@)</option>
                <option value="SUPPORT">Support (support@)</option>
                <option value="NEWS">News (news@)</option>
                <option value="REQUESTS">Requests (request@)</option>
              </select>
              <span className="text-[11px] text-muted-foreground">Domain: hack4win.online</span>
            </div>

            {/* Engine Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="test-engine" className="text-xs font-bold text-foreground">
                Dispatch Protocol
              </Label>
              <select
                id="test-engine"
                value={engine}
                onChange={(e) => setEngine(e.target.value as "auto" | "brevo_api" | "brevo_smtp")}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="auto">Auto (API + SMTP Fallback)</option>
                <option value="brevo_api">Direct REST API v3</option>
                <option value="brevo_smtp">SMTP Relay (Port 587)</option>
              </select>
              <span className="text-[11px] text-muted-foreground">Automatic failover</span>
            </div>
          </div>

          {/* Optional Custom Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="test-subject" className="text-xs font-bold text-foreground">
              Custom Subject (Optional)
            </Label>
            <Input
              id="test-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="⚡ Hack4Win • Infrastructure Email Delivery Test"
              className="rounded-xl h-9 text-xs"
            />
          </div>

          {/* Dispatch Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="size-3.5 text-primary" />
              <span>Relay: smtp-relay.brevo.com:587 (STARTTLS)</span>
            </div>

            <Button
              type="submit"
              disabled={isSending || !recipient.trim()}
              className="rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-xs"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Dispatching Test Email...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Test Email to Admin</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Live Result Output */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : testResult.isIpRestricted
                ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                ) : testResult.isIpRestricted ? (
                  <ShieldAlert className="size-4.5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertTriangle className="size-4.5 text-rose-600 dark:text-rose-400" />
                )}
                {testResult.success
                  ? "Test Email Dispatched Successfully! 🎉"
                  : testResult.isIpRestricted
                  ? "Brevo IP Security Restriction Active"
                  : "Dispatch Failed"}
              </span>
              {testResult.sentAt && (
                <span className="font-mono text-[11px] opacity-75">
                  {new Date(testResult.sentAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {testResult.success ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans font-semibold">
                    Recipient
                  </span>
                  <span className="font-bold">{testResult.recipient}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans font-semibold">
                    Engine Used
                  </span>
                  <span className="font-bold uppercase text-primary">{testResult.engineUsed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-sans font-semibold">
                    Message ID
                  </span>
                  <span className="truncate block max-w-full" title={testResult.messageId}>
                    {testResult.messageId}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1 text-xs leading-relaxed">
                <p>
                  <strong>Error Details:</strong> {testResult.error}
                </p>
                {testResult.guidanceMessage && (
                  <p className="opacity-90">{testResult.guidanceMessage}</p>
                )}
                {testResult.guidanceUrl && (
                  <div className="pt-1">
                    <a
                      href={testResult.guidanceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold underline hover:opacity-80"
                    >
                      Authorize Server IP at {testResult.guidanceUrl} <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
