/**
 * URL validation and sanitization helpers for defense against XSS via javascript: / data: URI schemes.
 */

export function isValidHttpUrl(string?: string | null): boolean {
  if (!string) return true;
  const trimmed = string.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns the URL if it is a valid HTTP or HTTPS URL, otherwise undefined.
 * Guarantees that <a href={...}> never renders javascript:, data:, or other dangerous schemes.
 */
export function getSafeExternalUrl(string?: string | null): string | undefined {
  if (!string) return undefined;
  const trimmed = string.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return trimmed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
