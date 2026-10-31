"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import type { User, UserRole, SessionUser } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Shield,
  Loader2,
  UserCheck,
  User as UserIcon,
  UserPlus,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UsersClientProps {
  initialUsers: User[];
  initialTotal?: number;
  currentUser?: SessionUser | null;
}

export function UsersClient({ initialUsers, initialTotal, currentUser }: UsersClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [totalCount, setTotalCount] = useState<number>(initialTotal ?? initialUsers.length);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [hideTestAccounts, setHideTestAccounts] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Create User modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "user" as UserRole,
    bio: "",
    github_username: "",
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users from server on search, role, test accounts filter, or page change
  useEffect(() => {
    let isCancelled = false;

    async function fetchUsers() {
      setIsLoading(true);
      try {
        const offset = (page - 1) * pageSize;
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedRole && selectedRole !== "all") params.set("role", selectedRole);
        if (hideTestAccounts) params.set("hideTestAccounts", "true");
        params.set("limit", String(pageSize));
        params.set("offset", String(offset));

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();

        if (!isCancelled) {
          setUsers(data.users || []);
          if (typeof data.total === "number") {
            setTotalCount(data.total);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Users query error:", err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    // Only fetch if filters have changed from initial state
    fetchUsers();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, selectedRole, hideTestAccounts, page]);

  /**
   * Handle Create User submit
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = createForm.email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setCreateError("Please enter a valid email address (e.g., developer@example.com).");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUsers((prev) => [data.user, ...prev]);
      setTotalCount((prev) => prev + 1);
      setStatusMessage({
        type: "success",
        text: `User "${data.user.email}" successfully created with role "${data.user.role}".`,
      });
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        role: "user",
        bio: "",
        github_username: "",
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Delete user
   */
  const handleDeleteUser = async (user: User) => {
    if (currentUser && user.id === currentUser.id) {
      await showAlert({
        title: "Action Prohibited",
        message: "Cannot delete your own administrative account.",
        type: "error",
      });
      return;
    }

    const confirmDelete = await showConfirm({
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete user "${user.email}"? This action cannot be undone.`,
      confirmText: "Delete User",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmDelete) return;

    setDeletingUserId(user.id);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setStatusMessage({
        type: "success",
        text: `User "${user.email}" has been deleted.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete user",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  /**
   * Change user role via PATCH /api/admin/users
   */
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (currentUser && userId === currentUser.id && newRole !== "admin") {
      setStatusMessage({
        type: "error",
        text: "You cannot revoke your own administrative privileges.",
      });
      return;
    }

    setUpdatingUserId(userId);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      setStatusMessage({
        type: "success",
        text: `Role successfully updated to "${newRole}".`,
      });
    } catch (err) {
      console.error("Role update failed:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update role",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6">
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

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          {isLoading ? (
            <Loader2 className="size-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          ) : (
            <Search className="size-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search all users by name, email, or @username..."
            className="pl-10 pr-9 rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider shrink-0 mr-1">
            <Filter className="size-3.5" /> Role:
          </span>
          {["all", "user", "organizer", "judge", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setSelectedRole(r);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize shrink-0 cursor-pointer ${
                selectedRole === r
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Hide test accounts toggle */}
        <button
          type="button"
          onClick={() => {
            setHideTestAccounts(!hideTestAccounts);
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
            hideTestAccounts
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-muted/50 text-muted-foreground border-border/80 hover:text-foreground"
          }`}
        >
          {hideTestAccounts ? "✓ Hiding Test Bots" : "Hide Test Bots"}
        </button>
      </div>

      {/* USERS TABLE CARD */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Platform Accounts</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {totalCount} Total
                </Badge>
              </CardTitle>
              <CardDescription>
                Showing {startIndex} to {endIndex} of {totalCount} members
              </CardDescription>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="gap-2 rounded-full shadow-xs cursor-pointer"
            >
              <UserPlus className="size-4" />
              Create User
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogContent className="sm:max-w-lg md:max-w-xl rounded-3xl p-6 sm:p-8">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Create Platform User</DialogTitle>
                  <DialogDescription>
                    Add a new member directly. Account is instantly verified and ready for login.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
                  {createError && (
                    <div className="p-3 rounded-xl text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="create-name" className="text-xs font-semibold">Full Name</Label>
                    <Input
                      id="create-name"
                      placeholder="e.g. Alex Morgan"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="rounded-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-email" className="text-xs font-semibold">Email Address *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="rounded-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-role" className="text-xs font-semibold">Platform Role</Label>
                    <select
                      id="create-role"
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                      className="w-full h-10 rounded-full border border-input bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="user">User (Participant)</option>
                      <option value="organizer">Organizer (Host / Sponsor)</option>
                      <option value="judge">Judge (Evaluator)</option>
                      <option value="admin">Admin (Administrator)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-bio" className="text-xs font-semibold">Bio (Optional)</Label>
                    <Input
                      id="create-bio"
                      placeholder="Full-stack engineer, AI enthusiast..."
                      value={createForm.bio}
                      onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                      className="rounded-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-github" className="text-xs font-semibold">GitHub Username (Optional)</Label>
                    <Input
                      id="create-github"
                      placeholder="e.g. alexmorgan"
                      value={createForm.github_username}
                      onChange={(e) => setCreateForm({ ...createForm, github_username: e.target.value })}
                      className="rounded-full"
                    />
                  </div>

                  <DialogFooter className="pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={isCreating}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || !createForm.email}
                      className="rounded-full gap-2 cursor-pointer"
                    >
                      {isCreating && <Loader2 className="size-4 animate-spin" />}
                      {isCreating ? "Creating User..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground space-y-2">
              <UserIcon className="size-8 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground">No users found</p>
              <p className="text-xs">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3.5">User Profile</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Joined</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const isUpdating = updatingUserId === u.id;
                    const isDeleting = deletingUserId === u.id;
                    const isSelf = Boolean(currentUser && u.id === currentUser.id);

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              src={u.image}
                              name={u.name || "Anonymous"}
                              alt={u.name || "Avatar"}
                              className="size-10 rounded-full bg-primary/10 text-primary border"
                              iconClassName="size-5 text-primary"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground truncate">
                                  {u.name || "Anonymous"}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                              {u.username && (
                                <Link
                                  href={`/u/${u.username}`}
                                  target="_blank"
                                  className="text-[0.7rem] text-primary/80 hover:text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  <span>@{u.username}</span>
                                  <ExternalLink className="size-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.email_verified ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-xs gap-1 font-medium"
                            >
                              <CheckCircle2 className="size-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 bg-amber-500/10 border-amber-500/20 text-xs font-medium"
                            >
                              Unverified
                            </Badge>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              u.role === "admin"
                                ? "default"
                                : u.role === "organizer"
                                ? "outline"
                                : "secondary"
                            }
                            className={`capitalize text-xs font-semibold ${
                              u.role === "organizer"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : u.role === "judge"
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : ""
                            }`}
                          >
                            {u.role}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            {isUpdating ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                disabled={isUpdating || isSelf}
                                title={
                                  isSelf
                                    ? "You cannot revoke your own administrative privileges"
                                    : "Change user role"
                                }
                                className="h-8 rounded-full border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="user">User</option>
                                <option value="organizer">Organizer</option>
                                <option value="judge">Judge</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}

                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isDeleting || isSelf}
                              title={
                                isSelf
                                  ? "Cannot delete your own administrative account"
                                  : "Delete user"
                              }
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({totalCount} total members)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-8 px-2.5 rounded-lg gap-1 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-8 px-2.5 rounded-lg gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
