/**
 * Sanitize URLs in markdown links against XSS vectors (e.g. javascript:, data:, quote breakout).
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().replace(/^(&lt;|<)|(&gt;|>)$/g, "").trim();
  if (/^(https?:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  return "#";
}

/**
 * Format inline markdown syntax: **bold**, *italic*, `code`, [link](url)
 */
export function formatInline(text: string): string {
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  // Italic *text*
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Inline code `code`
  escaped = escaped.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded-md bg-muted text-[0.8rem] font-mono text-primary break-all">$1</code>'
  );

  // Links [text](url) - strictly sanitize destination href
  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) =>
      `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80 break-all">${text}</a>`
  );

  return escaped;
}
