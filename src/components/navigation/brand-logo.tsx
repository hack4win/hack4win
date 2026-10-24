"use client";

import React, { useState } from "react";
import { BRAND_LOGO } from "@/lib/constants/branding";

interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
  domainClassName?: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: { img: 24, class: "size-6" },
  sm: { img: 30, class: "size-7.5" },
  md: { img: 38, class: "size-9.5" },
  lg: { img: 44, class: "size-11" },
  xl: { img: 56, class: "size-14" },
};

export function BrandLogo({
  size = "md",
  className = "",
  imageClassName = "",
  showText = true,
  textClassName = "font-extrabold text-xl tracking-tight leading-none",
  domainClassName = "text-muted-foreground text-sm font-normal",
  badge,
  subtitle,
  priority = false,
}: BrandLogoProps) {
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;
  const [imgSrc, setImgSrc] = useState<string>(BRAND_LOGO.s3UrlWebp);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative ${currentSize.class} shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-xs bg-black/95 flex items-center justify-center p-0.5`}
      >
        <img
          src={imgSrc}
          alt={BRAND_LOGO.alt}
          width={currentSize.img}
          height={currentSize.img}
          className={`size-full object-contain rounded-lg ${imageClassName}`}
          loading={priority ? "eager" : "lazy"}
          onError={() => setImgSrc(BRAND_LOGO.localLogoWebp)}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={textClassName}>
              {BRAND_LOGO.siteName}
              <span className={domainClassName}>{BRAND_LOGO.domainSuffix}</span>
            </span>
            {badge}
          </div>
          {subtitle}
        </div>
      )}
    </div>
  );
}
