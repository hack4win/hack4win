"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  Gavel,
  Inbox,
  Rocket,
  Shield,
  Trophy,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppNotification, GetNotificationsResult } from "@/lib/notifications/notification-service";
import type { SessionUser } from "@/lib/db/types";

interface NotificationBellProps {
  user: SessionUser;
  className?: string;
}

export function NotificationBell({ user, className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isPrivileged =
    user.role === "admin" || user.role === "organizer" || user.role === "judge";

  const fetchNotifications = async () => {
    if (!isPrivileged) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data: GetNotificationsResult = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user.id, user.role]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isPrivileged) {
    return null;
  }

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "verification":
        return <CreditCard className="size-4 text-emerald-500" />;
      case "judging":
        return <Gavel className="size-4 text-purple-500" />;
      case "inquiry":
        return <Inbox className="size-4 text-blue-500" />;
      case "submission":
        return <Rocket className="size-4 text-amber-500" />;
      case "hackathon":
        return <Trophy className="size-4 text-amber-500" />;
      default:
        return <AlertCircle className="size-4 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-[10px] font-bold px-1.5 py-0 rounded-full">
            Urgent Action
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-[10px] font-bold px-1.5 py-0 rounded-full">
            Action Req.
          </Badge>
        );
      default:
        return null;
    }
  };

  const previewList = notifications.slice(0, 5);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Platform Notifications"
        className="relative size-9 rounded-full border bg-card hover:bg-muted transition-all flex items-center justify-center text-foreground outline-none cursor-pointer group"
      >
        <Bell className="size-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-white shadow-md animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[380px] rounded-3xl border bg-card shadow-2xl z-50 overflow-hidden flex flex-col text-sm animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b flex items-center justify-between gap-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="size-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-destructive text-white">
                      {unreadCount}
                    </span>
                  )}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider capitalize">
                {user.role}
              </Badge>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  title="Mark all as read"
                  className="rounded-full text-muted-foreground hover:text-foreground size-7"
                >
                  <CheckCheck className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Check className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  No pending verifications, evaluations, or urgent alerts for your role right now.
                </p>
              </div>
            ) : (
              previewList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) handleMarkAsRead(notif.id);
                    setIsOpen(false);
                    router.push(notif.actionUrl);
                  }}
                  className={`p-3.5 hover:bg-muted/50 transition-colors cursor-pointer space-y-1.5 relative ${
                    !notif.isRead ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        {getCategoryIcon(notif.category)}
                      </div>
                      <span className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                        {notif.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {getPriorityBadge(notif.priority)}
                      {!notif.isRead && (
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-9">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pl-9 pt-0.5">
                    <span className="text-[10px] text-muted-foreground/80 font-medium">
                      {notif.category.toUpperCase()}
                    </span>

                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:underline">
                      <span>{notif.actionLabel}</span>
                      <ChevronRight className="size-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - "See More Notifications" */}
          <div className="p-2 border-t bg-muted/20">
            <Button
              asChild
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full text-xs font-bold rounded-2xl justify-between h-9 px-3 hover:bg-muted"
            >
              <Link href="/notifications">
                <span>See All Notifications ({notifications.length})</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
