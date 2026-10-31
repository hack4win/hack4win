/**
 * Hack4Win Official Brand Assets & Logo URLs
 * Hosted securely on AWS Neon S3 (bucket: do4win) with local web-optimized fallbacks
 */
export const BRAND_LOGO = {
  s3UrlWebp:
    "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo-v2.webp",
  s3UrlPng:
    "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo-v2.png",
  s3UrlIcon:
    "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-icon-v2.png",
  localLogoWebp: "/logo.webp",
  localLogoPng: "/logo.png",
  localIconPng: "/icon.png",
  faviconIco: "/favicon.ico",
  alt: "Hack4Win Logo",
  siteName: "Hack4Win",
  domainSuffix: ".online",
} as const;
