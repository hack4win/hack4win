"use client";

import React, { useState, useMemo } from "react";
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
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { UserMenu } from "@/components/navigation/user-menu";
import { SiteFooter } from "@/components/navigation/site-footer";
import type { AppNotification, GetNotificationsResult } from "@/lib/notifications/notification-service";
import type { SessionUser } from "@/lib/db/types";

interface NotificationsClientProps {
  initialData: GetNotificationsResult;
  currentUser: SessionUser;
}

export function NotificationsClient({ initialData, currentUser }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialData.notifications || []);
  const [unreadCount, setUnreadCount] = useState<number>(initialData.unreadCount || 0);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "action_required" | "verification" | "judging">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data: GetNotificationsResult = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
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
    }
  };

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (filterTab === "unread" && notif.isRead) return false;
      if (filterTab === "action_required" && notif.priority !== "urgent" && notif.priority !== "high") return false;
      if (filterTab === "verification" && notif.category !== "verification") return false;
      if (filterTab === "judging" && notif.category !== "judging") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = notif.title.toLowerCase().includes(q);
        const matchesMsg = notif.message.toLowerCase().includes(q);
        const matchesHackathon = (notif.hackathonTitle || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesHackathon) return false;
      }

      return true;
    });
  }, [notifications, filterTab, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "verification":
        return <CreditCard className="size-5 text-emerald-500" />;
      case "judging":
        return <Gavel className="size-5 text-purple-500" />;
      case "inquiry":
        return <Inbox className="size-5 text-blue-500" />;
      case "submission":
        return <Rocket className="size-5 text-amber-500" />;
      case "hackathon":
        return <Trophy className="size-5 text-amber-500" />;
      default:
        return <AlertCircle className="size-5 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-xs font-bold px-2.5 py-0.5 rounded-full">
            Urgent Action
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-xs font-bold px-2.5 py-0.5 rounded-full">
            Action Required
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full">
            Update
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs font-normal px-2 py-0.5 rounded-full">
            Info
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <BrandLogo size="md" />
          </Link>

          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex rounded-full text-xs">
            <Link href={currentUser.role === "admin" ? "/admin" : currentUser.role === "organizer" ? "/organizer" : "/judges"}>
              <ArrowLeft className="size-3.5 mr-1" /> Back to Console
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <UserMenu user={currentUser} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Hero Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                  <span>Action Notifications</span>
                  {unreadCount > 0 && (
                    <Badge className="bg-destructive text-white text-xs font-bold rounded-full px-2 py-0.5">
                      {unreadCount} unread
                    </Badge>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Real-time alerts, payment verifications, and pending tasks for your{" "}
                  <strong className="capitalize text-foreground">{currentUser.role}</strong> role.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="rounded-full text-xs gap-1.5 cursor-pointer font-bold"
              >
                <CheckCheck className="size-3.5 text-emerald-500" />
                <span>Mark All Read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-xs">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <Button
              variant={filterTab === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("all")}
              className="rounded-full text-xs h-8 px-3.5 font-bold"
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filterTab === "unread" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("unread")}
              className="rounded-full text-xs h-8 px-3.5 font-bold"
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filterTab === "action_required" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterTab("action_required")}
              className="rounded-full text-xs h-8 px-3.5 font-bold"
            >
              Action Required
            </Button>
            {(currentUser.role === "organizer" || currentUser.role === "admin") && (
              <Button
                variant={filterTab === "verification" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterTab("verification")}
                className="rounded-full text-xs h-8 px-3.5 font-bold"
              >
                Verifications
              </Button>
            )}
            {(currentUser.role === "judge" || currentUser.role === "admin") && (
              <Button
                variant={filterTab === "judging" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterTab("judging")}
                className="rounded-full text-xs h-8 px-3.5 font-bold"
              >
                Judging
              </Button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 h-8 rounded-full text-xs"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border bg-card space-y-3">
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Notifications Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? "No alerts matched your search query. Clear search or switch filter tabs."
                  : "All clear! There are no pending alerts or tasks requiring your attention at this moment."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="rounded-full text-xs font-semibold"
                >
                  Clear Search Filter
                </Button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-3xl border bg-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  !notif.isRead
                    ? "border-primary/40 shadow-sm ring-1 ring-primary/20 bg-gradient-to-r from-primary/[0.03] via-card to-card"
                    : "hover:border-border/80"
                }`}
              >
                {/* Left Side Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="size-10 sm:size-11 rounded-2xl bg-muted/70 flex items-center justify-center shrink-0 border mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        {notif.title}
                      </h3>
                      {getPriorityBadge(notif.priority)}
                      {!notif.isRead && (
                        <span className="size-2 rounded-full bg-primary shrink-0" title="Unread alert" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                      {notif.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground/80">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">
                        {notif.category}
                      </span>
                      {notif.hackathonTitle && (
                        <>
                          <span>&bull;</span>
                          <span className="truncate max-w-[200px] font-medium text-foreground">
                            {notif.hackathonTitle}
                          </span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="rounded-full text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
                      title="Mark as read"
                    >
                      <Check className="size-3.5 mr-1" /> Mark Read
                    </Button>
                  )}

                  <Button
                    asChild
                    size="sm"
                    className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 shadow-xs"
                  >
                    <Link
                      href={notif.actionUrl}
                      onClick={() => {
                        if (!notif.isRead) handleMarkAsRead(notif.id);
                      }}
                    >
                      <span>{notif.actionLabel}</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
