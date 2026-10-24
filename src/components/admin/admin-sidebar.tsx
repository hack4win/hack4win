"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  LayoutDashboard,
  Users,
  Settings,
  Tag,
  PlusCircle,
  ExternalLink,
  Menu,
  X,
  Shield,
  Layers,
  HardDrive,
  LogOut,
  Sparkles,
  Mail,
  Rocket,
  Gavel,
  Inbox,
} from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";

interface AdminSidebarProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AdminSidebar({ user, children }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Hackathons", href: "/admin/hackathons", icon: Trophy },
        { label: "Projects & Showcase", href: "/admin/projects", icon: Rocket },
        { label: "Judging & Scoring", href: "/admin/judging", icon: Gavel },
        { label: "Create Hackathon", href: "/admin/hackathons/new", icon: PlusCircle },
      ],
    },
    {
      group: "Platform Management",
      items: [
        { label: "Host Inquiries", href: "/admin/inquiries", icon: Inbox },
        { label: "Users & Access", href: "/admin/users", icon: Users },
        { label: "Tags & Tracks", href: "/admin/tags", icon: Tag },
        { label: "Skills & Proficiencies", href: "/admin/skills", icon: Sparkles },
        { label: "Email & Broadcasts", href: "/admin/mail", icon: Mail },
      ],
    },
    {
      group: "System & Cloud",
      items: [
        { label: "Infrastructure", href: "/admin/settings", icon: HardDrive },
      ],
    },
  ];

  const filteredNavItems = navItems
    .map((section) => {
      let items = section.items;

      if (user.role === "judge") {
        if (section.group !== "Overview") return null;
        items = items.filter((item) =>
          ["/admin/judging", "/admin/hackathons", "/admin/projects"].includes(item.href)
        );
      } else if (user.role === "organizer") {
        if (section.group === "System & Cloud") return null;
        if (section.group === "Platform Management") {
          items = items.filter((item) => item.href === "/admin/tags");
        }
      }

      if (items.length === 0) return null;
      return { ...section, items };
    })
    .filter(Boolean) as typeof navItems;

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-85 transition-opacity"
        >
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Trophy className="size-4.5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight">
              Hack4Win<span className="text-muted-foreground text-xs font-normal">.online</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="default" className="text-[0.65rem] px-1.5 py-0 uppercase font-semibold">
                {user.role}
              </Badge>
              <span className="text-[0.7rem] text-muted-foreground font-mono">
                {user.role === "judge" ? "Scoring" : user.role === "organizer" ? "Manage" : "Control"}
              </span>
            </div>
          </div>
        </Link>

        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-full"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {filteredNavItems.map((section) => (
          <div key={section.group} className="space-y-1.5">
            <div className="px-3 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground/80">
              {section.group}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 px-1">
          <Button
            variant="outline"
            asChild
            size="sm"
            className="w-full justify-start gap-2 rounded-xl text-xs"
          >
            <Link href="/" target="_blank">
              <ExternalLink className="size-3.5" />
              <span>Public Website</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* User Info & Footer */}
      <div className="p-4 border-t bg-muted/20 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {user.image ? (
              <img src={user.image} alt={user.name || "Avatar"} className="size-full rounded-full object-cover" />
            ) : (
              (user.name?.[0] || user.email[0]).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-foreground truncate">
              {user.name || "Admin"}
            </div>
            <div className="text-[0.68rem] text-muted-foreground truncate">{user.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            title="Sign Out"
            className="rounded-full text-muted-foreground hover:text-destructive shrink-0"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden border-b px-5 py-3.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-40">
        <Link href="/" className="flex items-center gap-2 font-bold text-base">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Trophy className="size-4" />
          </div>
          <span>Hack4Win <Badge variant="outline" className="text-[0.65rem] py-0 px-1 ml-1 capitalize">{user.role}</Badge></span>
        </Link>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setMobileOpen(true)}
          className="rounded-full"
        >
          <Menu className="size-4" />
        </Button>
      </header>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r sticky top-0 h-screen shrink-0">
        {renderNavContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1">
          {children}
        </div>

        <footer className="border-t py-4 px-8 text-center md:text-left text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Hack4Win {user.role === "judge" ? "Judging" : user.role === "organizer" ? "Organizer" : "Admin"} Platform &middot; Connected to Neon Postgres AWS</span>
          <span>S3 Cloud Storage &middot; Better Auth Engine</span>
        </footer>
      </div>
    </div>
  );
}
