"use client";

import React, { useState } from "react";
import { Trophy } from "lucide-react";

interface HackathonThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function HackathonThumbnail({
  src,
  alt,
  className = "size-20 sm:size-24 md:size-28",
  fallbackText,
}: HackathonThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  const initial = (fallbackText || alt || "H").trim().charAt(0).toUpperCase();

  if (!src || hasError) {
    return (
      <div
        className={`relative ${className} rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-card bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex flex-col items-center justify-center shrink-0 shadow-lg text-primary select-none`}
        title={alt}
      >
        <span className="font-black text-2xl sm:text-3xl md:text-4xl tracking-tight text-primary leading-none">
          {initial}
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
          Hack
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${className} rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-card bg-muted shrink-0 shadow-lg`}
    >
      <img
        src={src}
        alt={alt}
        className="size-full object-cover"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
