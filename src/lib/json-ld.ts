/**
 * Safely serializes JSON-LD structured data for inclusion inside <script> tags.
 * Escapes `<` to unicode `\u003c` to prevent stored/DOM script breakout attacks
 * (e.g., payloads containing `</script><script>alert(1)</script>`).
 */
export function safeJsonLdReplacer(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
