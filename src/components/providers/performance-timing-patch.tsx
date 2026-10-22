"use client";

import { useEffect } from "react";

// Guard against Next.js Turbopack dev-overlay error:
// "Failed to execute 'measure' on 'Performance': '<Component>' cannot have a negative time stamp."
// Caused by clock skew / microsecond timestamp rounding during React Server Components streaming.

if (typeof window !== "undefined" && window.Performance && !(window as unknown as { __hack4win_perf_patched?: boolean }).__hack4win_perf_patched) {
  (window as unknown as { __hack4win_perf_patched?: boolean }).__hack4win_perf_patched = true;

  try {
    const originalMeasure = window.Performance.prototype.measure;

    window.Performance.prototype.measure = function (
      name: string,
      startOrMeasureOptions?: string | PerformanceMeasureOptions,
      endMark?: string
    ) {
      try {
        if (startOrMeasureOptions && typeof startOrMeasureOptions === "object") {
          const opts: PerformanceMeasureOptions = { ...startOrMeasureOptions };

          // Clamp negative start and end values to avoid browser DOMException
          if (typeof opts.start === "number" && opts.start < 0) {
            opts.start = 0;
          }
          if (typeof opts.end === "number" && opts.end < 0) {
            opts.end = 0;
          }
          if (
            typeof opts.start === "number" &&
            typeof opts.end === "number" &&
            opts.end < opts.start
          ) {
            opts.end = opts.start;
          }
          if (typeof opts.duration === "number" && opts.duration < 0) {
            opts.duration = 0;
          }

          return originalMeasure.call(this, name, opts, endMark);
        }

        return originalMeasure.call(this, name, startOrMeasureOptions, endMark);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message.includes("negative") ||
            err.message.includes("time stamp") ||
            err.name === "DOMException" ||
            err.name === "TypeError")
        ) {
          // Gracefully suppress development runtime timing errors caused by Next.js RSC clock skew
          return undefined as unknown as PerformanceMeasure;
        }
        throw err;
      }
    };
  } catch {
    // Graceful fallback if prototype cannot be modified in strict sandboxes
  }
}

export function PerformanceTimingPatch() {
  useEffect(() => {
    // Ensure patch flag remains active on hot reloads
    if (typeof window !== "undefined") {
      (window as unknown as { __hack4win_perf_patched?: boolean }).__hack4win_perf_patched = true;
    }
  }, []);

  return null;
}
