interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory sliding window store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic garbage collection every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}

/**
 * Extracts client IP address defensively from request headers.
 */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

/**
 * Fixed / sliding window rate limiter.
 * 
 * @param key Unique key for the rate limit subject (e.g. `ip:endpoint` or `userId:endpoint`)
 * @param limit Maximum number of allowed requests in the time window
 * @param windowMs Time window in milliseconds
 * @returns `{ success: boolean, remaining: number, resetAt: number }`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): {
  success: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newEntry);
    return { success: true, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Utility to reset a rate limit key (useful for automated testing)
 */
export function resetRateLimitKey(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Utility to clear the entire rate limiter store (useful for test suites)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
