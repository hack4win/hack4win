"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Mail,
  MessageSquare,
  Loader2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { TeamInvitation, SessionUser } from "@/lib/db/types";

interface TeamInviteClientProps {
  invitation: TeamInvitation;
  currentUser: SessionUser | null;
}

export function TeamInviteClient({ invitation, currentUser }: TeamInviteClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");

  const [status, setStatus] = useState<string>(invitation.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isRecipient = currentUser?.id === invitation.receiver_id;

  const handleRespond = async (newStatus: "accepted" | "declined") => {
    if (!currentUser) {
      window.location.href = `/auth/signin?callbackUrl=/team-invites/${invitation.id}?action=${newStatus}`;
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/team-invites/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update invitation");
      }

      setStatus(newStatus);
      setFeedback(data.message || (newStatus === "accepted" ? "Invitation accepted!" : "Invitation declined."));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Error processing request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <Card className="border rounded-3xl shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border-b space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="rounded-full text-xs font-bold gap-1 bg-background">
              <Users className="size-3 text-primary" /> Team Teammate Invitation
            </Badge>

            <Badge
              variant={status === "accepted" ? "default" : status === "declined" ? "destructive" : "secondary"}
              className="rounded-full text-xs font-bold capitalize"
            >
              {status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 pt-2">
            {invitation.sender_image ? (
              <img
                src={invitation.sender_image}
                alt={invitation.sender_name || "Sender"}
                className="size-16 rounded-2xl object-cover border-2 border-background shadow-xs shrink-0"
              />
            ) : (
              <div className="size-16 rounded-2xl bg-primary/20 text-primary font-black text-2xl flex items-center justify-center border-2 border-background shadow-xs shrink-0">
                {invitation.sender_name ? invitation.sender_name[0].toUpperCase() : "B"}
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-xl font-black text-foreground truncate">
                {invitation.sender_name || "A Builder"}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Invited you to collaborate and build together for{" "}
                <strong className="text-foreground">{invitation.hackathon_title}</strong>.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5 text-xs">
          {/* Hackathon info */}
          <div className="p-4 rounded-2xl border bg-muted/20 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Hackathon Challenge
              </span>
              <h3 className="font-bold text-sm text-foreground truncate">
                {invitation.hackathon_title}
              </h3>
            </div>
            {invitation.hackathon_slug && (
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs shrink-0 h-8">
                <Link href={`/hackathons/${invitation.hackathon_slug}`}>
                  View Details <ExternalLink className="size-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>

          {/* Team name */}
          {invitation.team_name && (
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                Proposed Team Name
              </span>
              <div className="font-bold text-sm text-foreground p-3 rounded-xl border bg-background">
                {invitation.team_name}
              </div>
            </div>
          )}

          {/* Message */}
          {invitation.message && (
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="size-3" /> Personal Note:
              </span>
              <p className="p-3.5 rounded-xl border bg-background text-foreground text-xs leading-relaxed italic">
                &ldquo;{invitation.message}&rdquo;
              </p>
            </div>
          )}

          {/* Contact info */}
          {invitation.contact_info && (
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Mail className="size-3" /> Contact & Communication:
              </span>
              <div className="p-3 rounded-xl border bg-background text-foreground text-xs font-mono">
                {invitation.contact_info}
              </div>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
                status === "accepted"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : status === "declined"
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {status === "accepted" ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="size-4 shrink-0" />
              )}
              <span>{feedback}</span>
            </div>
          )}

          {/* Actions */}
          {status === "pending" ? (
            <div className="pt-3 border-t flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRespond("declined")}
                disabled={isProcessing}
                className="w-full sm:w-1/2 rounded-full text-xs font-semibold"
              >
                Decline Invitation
              </Button>
              <Button
                type="button"
                onClick={() => handleRespond("accepted")}
                disabled={isProcessing}
                className="w-full sm:w-1/2 rounded-full text-xs font-bold gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span>Accept & Join Team</span>
              </Button>
            </div>
          ) : (
            <div className="pt-3 border-t flex justify-end">
              {invitation.hackathon_slug && (
                <Button asChild className="rounded-full text-xs font-bold gap-1.5">
                  <Link href={`/hackathons/${invitation.hackathon_slug}?tab=projects`}>
                    Go to Hackathon Showcase <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
