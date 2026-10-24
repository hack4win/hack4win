"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { SessionUser } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  LayoutDashboard,
  Users,
  PlusCircle,
  ExternalLink,
  Menu,
  X,
  LogOut,
  Gavel,
  Shield,
  Layers,
} from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";

interface OrganizerSidebarProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function OrganizerSidebar({ user, children }: OrganizerSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      group: "Organizer Console",
      items: [
        { label: "Dashboard", href: "/organizer", icon: LayoutDashboard },
        { label: "My Hackathons", href: "/organizer/hackathons", icon: Trophy },
        { label: "Create Challenge", href: "/organizer/hackathons/new", icon: PlusCircle },
        { label: "Judges Management", href: "/organizer/judges", icon: Gavel },
      ],
    },
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) => {
    if (href === "/organizer") return pathname === "/organizer" || pathname === "/orgnizer";
    return pathname.startsWith(href);
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-card/70 backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center hover:opacity-85 transition-opacity"
        >
          <BrandLogo
            size="md"
            textClassName="font-extrabold text-base tracking-tight leading-none"
            domainClassName="text-muted-foreground text-xs font-normal"
            subtitle={
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="text-[0.65rem] px-2 py-0 uppercase font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Organizer Portal
                </Badge>
              </div>
            }
          />
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
        {navItems.map((section) => (
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
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-white" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {user.role === "admin" && (
          <div className="pt-2 px-1">
            <Button
              variant="outline"
              asChild
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-xs border-dashed"
            >
              <Link href="/admin">
                <Shield className="size-3.5 text-primary" />
                <span>Super Admin Console</span>
              </Link>
            </Button>
          </div>
        )}

        <div className="pt-1 px-1">
          <Button
            variant="outline"
            asChild
            size="sm"
            className="w-full justify-start gap-2 rounded-xl text-xs"
          >
            <Link href="/" target="_blank">
              <ExternalLink className="size-3.5" />
              <span>Public Hackathons</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* User Info & Footer */}
      <div className="p-4 border-t bg-muted/20 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
            {user.image ? (
              <img src={user.image} alt={user.name || "Avatar"} className="size-full rounded-full object-cover" />
            ) : (
              (user.name?.[0] || user.email[0]).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-foreground truncate">
              {user.name || "Organizer"}
            </div>
            <div className="text-[0.68rem] text-muted-foreground truncate">{user.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            title="Sign Out"
            className="rounded-full text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
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
          <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Trophy className="size-4" />
          </div>
          <span>Hack4Win <Badge variant="outline" className="text-[0.65rem] py-0 px-1 ml-1 border-blue-500/30 text-blue-600">Organizer</Badge></span>
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
          <span>Hack4Win Organizer Workspace &middot; Verified Host Console</span>
          <span>PostgreSQL &middot; RBAC Scoped</span>
        </footer>
      </div>
    </div>
  );
}
