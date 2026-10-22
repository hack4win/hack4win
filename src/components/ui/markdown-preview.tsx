import React from "react";
import { formatInline, sanitizeUrl } from "@/lib/markdown-sanitize";

export { sanitizeUrl, formatInline };

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Clean, lightweight Markdown parser and renderer component
 * Formats headings, bold, italic, code blocks, lists, blockquotes, and links
 */
export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  if (!content || !content.trim()) {
    return (
      <div className="text-muted-foreground text-xs italic py-4">
        Nothing to preview yet. Start typing markdown in the editor.
      </div>
    );
  }

  // Parse lines into structured blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0 && inList) {
      if (inList === "ol") {
        elements.push(
          <ol key={key} className="list-decimal pl-5 my-2 space-y-1.5 text-sm break-words">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={key} className="list-disc pl-5 my-2 space-y-1.5 text-sm break-words">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
      }
      listItems = [];
      inList = null;
    }
  };

  const flushCode = (key: string) => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre
          key={key}
          className="p-3.5 my-3 rounded-xl bg-muted/80 border text-xs font-mono overflow-x-auto text-foreground max-w-full"
        >
          <code>{codeBlockContent.join("\n")}</code>
        </pre>
      );
      codeBlockContent = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCode(`code-${i}`);
      } else {
        flushList(`list-before-code-${i}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Ordered list items (1. Item)
    const olMatch = line.trim().match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (inList === "ul") {
        flushList(`list-switch-${i}`);
      }
      inList = "ol";
      listItems.push(olMatch[1]);
      continue;
    }

    // Unordered list items (- Item or * Item)
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (inList === "ol") {
        flushList(`list-switch-${i}`);
      }
      inList = "ul";
      listItems.push(line.trim().substring(2));
      continue;
    }

    // Not a list item -> flush list
    flushList(`list-${i}`);

    // Blank line
    if (!line.trim()) {
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-border" />);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-xl sm:text-2xl font-extrabold tracking-tight mt-5 mb-2 text-foreground break-words"
          dangerouslySetInnerHTML={{ __html: formatInline(line.replace("# ", "")) }}
        />
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg sm:text-xl font-bold tracking-tight mt-4 mb-2 text-foreground border-b pb-1 break-words"
          dangerouslySetInnerHTML={{ __html: formatInline(line.replace("## ", "")) }}
        />
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-bold tracking-tight mt-3 mb-1.5 text-foreground break-words"
          dangerouslySetInnerHTML={{ __html: formatInline(line.replace("### ", "")) }}
        />
      );
    } else if (line.startsWith("> ")) {
      // Blockquote
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-primary/50 pl-3.5 italic my-2 text-muted-foreground text-sm break-words"
          dangerouslySetInnerHTML={{ __html: formatInline(line.replace("> ", "")) }}
        />
      );
    } else {
      // Regular paragraph
      elements.push(
        <p
          key={`p-${i}`}
          className="my-1.5 text-sm leading-relaxed text-foreground/90 break-words"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  }

  flushList("list-final");
  flushCode("code-final");

  return <div className={`prose-sm max-w-none space-y-1 ${className}`}>{elements}</div>;
}
