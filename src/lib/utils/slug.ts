/**
 * Utility to generate a URL-friendly slug from a title
 * Client and server safe (pure string transformation)
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "hackathon-" + Math.random().toString(36).substring(2, 7);
}
