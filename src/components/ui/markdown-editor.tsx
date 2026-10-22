"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "./markdown-preview";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Eye,
  PenTool,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minRows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write description using markdown...",
  minRows = 10,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSyntax = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;

    const replacement = `${before}${selected}${after}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-card shadow-2xs">
      {/* Header Toolbar */}
      <div className="border-b bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Formatting Actions */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("**", "**", "bold text")}
            title="Bold"
            className="size-7 rounded-lg"
          >
            <Bold className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("*", "*", "italic text")}
            title="Italic"
            className="size-7 rounded-lg"
          >
            <Italic className="size-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("## ", "", "Heading 2")}
            title="Heading 2"
            className="size-7 rounded-lg"
          >
            <Heading2 className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("### ", "", "Heading 3")}
            title="Heading 3"
            className="size-7 rounded-lg"
          >
            <Heading3 className="size-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("- ", "", "List item")}
            title="Bullet List"
            className="size-7 rounded-lg"
          >
            <List className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("1. ", "", "First item")}
            title="Numbered List"
            className="size-7 rounded-lg"
          >
            <ListOrdered className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("> ", "", "Quote text")}
            title="Blockquote"
            className="size-7 rounded-lg"
          >
            <Quote className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("```\n", "\n```", "// code snippet")}
            title="Code Block"
            className="size-7 rounded-lg"
          >
            <Code className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => insertSyntax("[", "](https://example.com)", "link title")}
            title="Link"
            className="size-7 rounded-lg"
          >
            <LinkIcon className="size-3.5" />
          </Button>
        </div>

        {/* Write / Preview Tab Switcher */}
        <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "write"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="size-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="size-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-4">
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            rows={minRows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm outline-none resize-y leading-relaxed font-mono text-foreground"
          />
        ) : (
          <div className="min-h-[220px] p-2">
            <MarkdownPreview content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
