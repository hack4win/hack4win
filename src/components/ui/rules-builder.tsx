"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Eye,
} from "lucide-react";

export const DEFAULT_HACKATHON_RULES = [
  "Maximum 4 members per team (solo builders welcome).",
  "All code must be written within the official competition window.",
  "Use of open-source libraries and public AI models/APIs is fully allowed.",
  "Follow fair play and platform community code of conduct.",
];

export const SUGGESTED_RULE_PRESETS = [
  "Working demo video (under 3 minutes) required in final submission.",
  "Public GitHub / GitLab repository with clear installation instructions & README.",
  "Submissions must be deployed to a live URL (e.g. Vercel, Railway, Cloudflare).",
  "No pre-built commercial software or plagiarized submissions allowed.",
  "All team members must accept team invitation requests before the deadline.",
  "Projects must align with at least one designated challenge track.",
  "Generative AI tools (ChatGPT, Claude, Gemini, v0) are permitted with attribution.",
];

interface RulesBuilderProps {
  rules: string[];
  onRulesChange: (rules: string[]) => void;
  maxTeamSize?: number;
}

export function RulesBuilder({ rules, onRulesChange, maxTeamSize = 4 }: RulesBuilderProps) {
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleAddRule = (text?: string) => {
    const ruleText = (text !== undefined ? text : newRuleInput).trim();
    if (!ruleText) return;

    // Avoid exact duplicate
    if (!rules.includes(ruleText)) {
      onRulesChange([...rules, ruleText]);
    }
    setNewRuleInput("");
  };

  const handleUpdateRule = (index: number, updatedText: string) => {
    const updated = [...rules];
    updated[index] = updatedText;
    onRulesChange(updated);
  };

  const handleRemoveRule = (index: number) => {
    onRulesChange(rules.filter((_, idx) => idx !== index));
  };

  const handleMoveRule = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const updated = [...rules];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onRulesChange(updated);
  };

  const handleResetToDefaults = () => {
    const defaultRulesWithTeamSize = [
      `Maximum ${maxTeamSize} members per team (solo builders welcome).`,
      "All code must be written within the official competition window.",
      "Use of open-source libraries and public AI models/APIs is fully allowed.",
      "Follow fair play and platform community code of conduct.",
    ];
    onRulesChange(defaultRulesWithTeamSize);
  };

  return (
    <Card className="border rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary shrink-0" />
              Competition Rules & Eligibility Guidelines
            </CardTitle>
            <CardDescription className="text-xs">
              Configure official rules displayed to participants on the hackathon details page.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs h-8 gap-1.5 rounded-lg"
            >
              <Eye className="size-3.5" />
              {showPreview ? "Hide Preview" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="text-xs h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              title="Reset rules to platform standard defaults"
            >
              <RotateCcw className="size-3.5" />
              Reset Defaults
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Rules List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configured Rules ({rules.length})
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Drag, reorder, or edit in-place
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="p-6 border border-dashed rounded-xl text-center space-y-3 bg-muted/10">
              <AlertCircle className="size-8 mx-auto text-amber-500/80" />
              <div>
                <p className="text-sm font-semibold">No rules configured yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hackathon will fallback to standard default rules on the public page.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                className="gap-1.5 text-xs rounded-lg"
              >
                <Plus className="size-3.5" />
                Add Standard Rules
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2.5 p-2.5 bg-background border rounded-xl hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="size-6 rounded-md bg-muted text-[11px] font-bold text-muted-foreground flex items-center justify-center">
                      {index + 1}
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  </div>

                  <Input
                    type="text"
                    value={rule}
                    onChange={(e) => handleUpdateRule(index, e.target.value)}
                    placeholder="Enter rule statement..."
                    className="h-9 text-xs sm:text-sm font-medium border-transparent focus-visible:border-input bg-transparent shadow-none"
                  />

                  <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0}
                      onClick={() => handleMoveRule(index, "up")}
                      className="size-7 rounded-md"
                      title="Move Up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === rules.length - 1}
                      onClick={() => handleMoveRule(index, "down")}
                      className="size-7 rounded-md"
                      title="Move Down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveRule(index)}
                      className="size-7 rounded-md text-destructive hover:bg-destructive/10"
                      title="Delete Rule"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Rule Input */}
        <div className="pt-2 border-t space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Add Custom Rule
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={newRuleInput}
              onChange={(e) => setNewRuleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRule();
                }
              }}
              placeholder="e.g. Submissions must include live hosted demo URL..."
              className="h-10 text-xs sm:text-sm"
            />
            <Button
              type="button"
              onClick={() => handleAddRule()}
              disabled={!newRuleInput.trim()}
              className="h-10 px-4 text-xs font-semibold gap-1.5 shrink-0 rounded-lg"
            >
              <Plus className="size-4" />
              Add Rule
            </Button>
          </div>
        </div>

        {/* Suggested Presets */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Sparkles className="size-3.5 text-primary" />
            <span>Click to add suggested rules:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_RULE_PRESETS.map((preset, idx) => {
              const isAlreadyAdded = rules.includes(preset);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAlreadyAdded}
                  onClick={() => handleAddRule(preset)}
                  className={`text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isAlreadyAdded
                      ? "opacity-50 cursor-not-allowed bg-muted/40 border-muted text-muted-foreground"
                      : "bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-foreground cursor-pointer"
                  }`}
                >
                  <Plus className="size-3 shrink-0 text-primary" />
                  <span className="line-clamp-1">{preset}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="p-4 border rounded-xl bg-muted/15 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                Contestant View Preview
              </Badge>
              <span className="text-xs text-muted-foreground">
                How this will render in the hackathon sidebar
              </span>
            </div>

            <Card className="border rounded-2xl shadow-xs py-0 gap-0 overflow-hidden bg-card max-w-md">
              <CardHeader className="border-b bg-muted/20 py-3.5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary shrink-0" /> Rules & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2.5 text-xs text-muted-foreground">
                {(rules.length > 0 ? rules : DEFAULT_HACKATHON_RULES).map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
