"use client";

import React, { useState } from "react";
import type { Tag } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
} from "lucide-react";

interface TagsClientProps {
  initialTags: Tag[];
}

export function TagsClient({ initialTags }: TagsClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("technology");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTagName.trim();
    if (!cleanName || cleanName.length < 2) {
      setMessage({ type: "error", text: "Tag name must be at least 2 characters long." });
      return;
    }

    setIsAdding(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          category: newTagCategory.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create tag");
      }

      setTags((prev) => {
        const exists = prev.some((t) => t.id === data.tag.id);
        if (exists) return prev;
        return [data.tag, ...prev].sort((a, b) => a.name.localeCompare(b.name));
      });

      setNewTagName("");
      setMessage({
        type: "success",
        text: `Tag "${data.tag.name}" was successfully added to database!`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error creating tag",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    const confirmed = await showConfirm({
      title: "Delete Platform Tag",
      message: `Are you sure you want to delete tag "${tag.name}"? It will be removed from future selection chips.`,
      confirmText: "Delete Tag",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(tag.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/tags?id=${tag.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete tag");
      }

      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      setMessage({
        type: "success",
        text: `Tag "${tag.name}" has been deleted.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting tag",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add Tag Card */}
      <Card className="border shadow-xs rounded-2xl">
        <CardHeader className="py-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Add New Platform Tag
          </CardTitle>
          <CardDescription>
            Created tags are immediately saved to database and available across all hackathon challenges.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="tag-name" className="text-xs font-semibold">
                Tag Name *
              </Label>
              <Input
                id="tag-name"
                placeholder="e.g. Agentic Workflows, Rust, Zero Knowledge"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="rounded-full"
                required
              />
            </div>

            <div className="w-full sm:w-48 space-y-1.5">
              <Label htmlFor="tag-cat" className="text-xs font-semibold">
                Category
              </Label>
              <select
                id="tag-cat"
                value={newTagCategory}
                onChange={(e) => setNewTagCategory(e.target.value)}
                className="w-full h-10 rounded-full border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="technology">Technology</option>
                <option value="domain">Domain / Track</option>
                <option value="industry">Industry</option>
                <option value="platform">Platform</option>
                <option value="general">General</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isAdding || !newTagName.trim()}
              className="rounded-full gap-2 shrink-0 h-10 px-6 cursor-pointer"
            >
              {isAdding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isAdding ? "Adding..." : "Add Tag"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Bar & Tag List */}
      <Card className="border shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TagIcon className="size-4 text-primary" /> Active Tags ({tags.length})
            </CardTitle>
            <CardDescription>
              Showing {filtered.length} matching tags
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="pl-9 h-9 rounded-full text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No tags found. Add your first tag above.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {filtered.map((tag) => {
                const isDeleting = deletingId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-card hover:bg-muted/40 transition-colors shadow-2xs group text-xs font-medium"
                  >
                    <Hash className="size-3 text-muted-foreground" />
                    <span>{tag.name}</span>
                    <Badge variant="outline" className="text-[0.65rem] py-0 px-1.5 capitalize text-muted-foreground">
                      {tag.category || "general"}
                    </Badge>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      disabled={isDeleting}
                      title={`Delete tag ${tag.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
