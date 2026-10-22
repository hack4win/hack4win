"use client";

import React, { useState } from "react";
import {
  Users,
  Mail,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User } from "@/lib/db/types";

interface InviteToTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: User | null;
  hackathonId?: string;
  hackathonTitle?: string;
}

export function InviteToTeamDialog({
  isOpen,
  onOpenChange,
  targetUser,
  hackathonId,
  hackathonTitle,
}: InviteToTeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [message, setMessage] = useState(
    targetUser
      ? `Hey ${targetUser.name || "there"}, saw your profile and skills in ${
          targetUser.skills?.slice(0, 3).join(", ") || "development"
        }. Let's team up and build an awesome project together!`
      : ""
  );
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dispatched notification record state
  const [dispatchedEmail, setDispatchedEmail] = useState<{
    to: string;
    recipient_name: string;
    subject: string;
    accept_url: string;
    service: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathonId || !targetUser) {
      setError("Please specify a valid hackathon and recipient to send a team invitation for.");
      return;
    }

    if (teamName.trim().length > 100) {
      setError("Team name must not exceed 100 characters.");
      return;
    }
    if (message.trim().length > 1000) {
      setError("Message must not exceed 1000 characters.");
      return;
    }
    if (contactInfo.trim().length > 200) {
      setError("Contact information must not exceed 200 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/team-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          receiver_id: targetUser.id,
          team_name: teamName.trim() || undefined,
          message: message.trim() || undefined,
          contact_info: contactInfo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setDispatchedEmail(data.dispatchedEmail || data.dummyEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAcceptLink = async () => {
    if (!dispatchedEmail?.accept_url) return;
    try {
      await navigator.clipboard.writeText(dispatchedEmail.accept_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleClose = () => {
    setDispatchedEmail(null);
    setError(null);
    onOpenChange(false);
  };

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full text-[10px] font-bold gap-1 text-primary border-primary/20 bg-primary/5">
              <Users className="size-3" /> Team Up
            </Badge>
            {hackathonTitle && (
              <span className="text-xs text-muted-foreground truncate">
                for {hackathonTitle}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-black text-foreground pt-1 flex items-center gap-2">
            <span>Invite {targetUser.name || "Builder"} to Your Team</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Send an invitation to collaborate. An official notification with an acceptance link will be dispatched.
          </DialogDescription>
        </DialogHeader>

        {dispatchedEmail ? (
          /* Dispatched Email Success Screen */
          <div className="py-4 space-y-4 animate-in fade-in-50 duration-200">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Invitation Dispatched Successfully! 🎉</span>
              </div>
              <p className="text-xs opacity-90">
                An invitation email with a direct acceptance link has been dispatched to {dispatchedEmail.recipient_name}.
              </p>
            </div>

            {/* Email Dispatch Card */}
            <div className="p-4 rounded-2xl border bg-muted/20 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> Invitation Dispatch Record
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background border text-emerald-600 font-semibold">
                  Dispatched
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">
                  <strong className="text-foreground">To:</strong> {dispatchedEmail.to}
                </div>
                <div className="text-muted-foreground">
                  <strong className="text-foreground">Subject:</strong> {dispatchedEmail.subject}
                </div>
              </div>

              {/* Acceptance Link */}
              <div className="pt-2 border-t space-y-1.5">
                <span className="font-semibold text-foreground text-[11px] block">
                  Generated Acceptance Link:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={dispatchedEmail.accept_url}
                    className="h-8 text-xs font-mono bg-background rounded-full select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAcceptLink}
                    className="rounded-full text-xs shrink-0 h-8 gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" onClick={handleClose} className="rounded-full text-xs font-bold px-6">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Invitation Form */
          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target user quick pill */}
            <div className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20">
              {targetUser.image ? (
                <img
                  src={targetUser.image}
                  alt={targetUser.name || "Builder"}
                  className="size-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                  {targetUser.name ? targetUser.name[0].toUpperCase() : "B"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-foreground truncate">{targetUser.name}</h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  {targetUser.country || "Global"} &middot; {targetUser.skills?.slice(0, 3).join(", ") || "Participant"}
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full text-[10px] font-semibold shrink-0">
                {targetUser.participation_type === "solo"
                  ? "Solo Participant"
                  : targetUser.participation_type === "has_team"
                  ? "In a Team"
                  : "Looking for Team"}
              </Badge>
            </div>

            {/* Team Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Team Name (Optional)</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Neural Builders, Pixel Crafters"
                className="h-9 rounded-full text-xs bg-background"
              />
            </div>

            {/* Personal Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message & Project Pitch *</Label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what kind of project you want to build and why you'd make a great team..."
                className="w-full rounded-2xl border border-input bg-background p-3 text-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
                required
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Your Contact / Discord / Telegram (Optional)</Label>
              <Input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. Discord: alex_dev#1234 or email@example.com"
                className="h-9 rounded-full text-xs bg-background"
              />
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !message.trim()}
                className="rounded-full text-xs font-bold gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                <span>Send Invitation & Email</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
