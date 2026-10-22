"use client";

import React, { useState } from "react";
import type { Skill } from "@/lib/db/types";
import { useModalAlert } from "@/components/ui/modal-alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Code2,
} from "lucide-react";

interface SkillsClientProps {
  initialSkills: Skill[];
}

export function SkillsClient({ initialSkills }: SkillsClientProps) {
  const { showConfirm, showAlert } = useModalAlert();
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [search, setSearch] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Frontend");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = Array.from(new Set(skills.map((s) => s.category || "General"))).sort();

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSkillName.trim();
    if (!cleanName || cleanName.length < 2) {
      setMessage({ type: "error", text: "Skill name must be at least 2 characters long." });
      return;
    }

    setIsAdding(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          category: newSkillCategory.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create skill");
      }

      setSkills((prev) => {
        const exists = prev.some((s) => s.id === data.skill.id);
        if (exists) return prev;
        return [data.skill, ...prev].sort((a, b) => a.name.localeCompare(b.name));
      });

      setNewSkillName("");
      setMessage({
        type: "success",
        text: `Skill "${data.skill.name}" was successfully added to platform skills!`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error creating skill",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    const confirmed = await showConfirm({
      title: "Delete Platform Skill",
      message: `Are you sure you want to delete skill "${skill.name}"? It will be removed from available builder selections.`,
      confirmText: "Delete Skill",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(skill.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/skills?id=${skill.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete skill");
      }

      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      setMessage({
        type: "success",
        text: `Skill "${skill.name}" has been deleted.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting skill",
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

      {/* Add Skill Card */}
      <Card className="border shadow-xs rounded-2xl">
        <CardHeader className="py-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Add New Platform Skill
          </CardTitle>
          <CardDescription>
            Skills added here will be selectable by participants on their public developer profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="skill-name" className="text-xs font-semibold">
                Skill Name *
              </Label>
              <Input
                id="skill-name"
                placeholder="e.g. Next.js, PyTorch, GraphQL, Kubernetes"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="rounded-full"
                required
              />
            </div>

            <div className="w-full sm:w-48 space-y-1.5">
              <Label htmlFor="skill-cat" className="text-xs font-semibold">
                Category
              </Label>
              <select
                id="skill-cat"
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                className="w-full h-9 rounded-full border border-input bg-transparent px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Fullstack">Fullstack</option>
                <option value="AI & ML">AI & ML</option>
                <option value="Mobile">Mobile</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
                <option value="Database">Database</option>
                <option value="UI/UX & Design">UI/UX & Design</option>
                <option value="Web3 & Crypto">Web3 & Crypto</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isAdding || !newSkillName.trim()}
              className="rounded-full px-6 gap-2 shrink-0 cursor-pointer w-full sm:w-auto"
            >
              {isAdding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add Skill
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Skills Directory */}
      <Card className="border shadow-xs rounded-2xl">
        <CardHeader className="py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Platform Skills ({skills.length})
            </CardTitle>
            <CardDescription>
              Browse and curate technical proficiencies available for profile skill tags.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full h-8 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Code2 className="size-8 mx-auto opacity-40" />
              <p className="text-sm">No skills found matching &quot;{search}&quot;.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => {
                const catSkills = filtered.filter((s) => (s.category || "General") === cat);
                if (catSkills.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary/60 inline-block" />
                      {cat} ({catSkills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {catSkills.map((skill) => (
                        <div
                          key={skill.id}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card hover:bg-muted/40 transition-colors shadow-2xs text-xs font-medium"
                        >
                          <span className="font-semibold">{skill.name}</span>
                          <span className="text-[10px] text-muted-foreground">({skill.slug})</span>

                          <button
                            type="button"
                            onClick={() => handleDeleteSkill(skill)}
                            disabled={deletingId === skill.id}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full cursor-pointer ml-1"
                            title="Delete skill"
                          >
                            {deletingId === skill.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
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
