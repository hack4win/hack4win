/**
 * Canonical SEO & Metadata Configuration for Hack4Win
 * Domain: https://hack4win.online
 */

export const SITE_URL = "https://hack4win.online";
export const SITE_NAME = "Hack4Win";
export const SITE_LEGAL_NAME = "Hack4Win Platform";
export const SITE_TAGLINE = "Global Hackathon Platform - Build, Showcase & Win Online";
export const SITE_DESCRIPTION =
  "Discover premier coding challenges on Hack4Win. Assemble developer squads, build AI & Web3 apps, showcase open-source projects, and win cash bounties on hack4win.online.";

export const TWITTER_HANDLE = "@hack4win";

export const BRAND_ASSETS = {
  logoPng: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo-v4.png",
  iconPng: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-icon-v4.png",
  ogImageFallback: "https://br-polished-unit-b3lk45ku.storage.c-4.ap-southeast-1.aws.neon.tech/do4win/branding/hack4win-logo-v4.png",
};

/**
 * Returns canonical absolute URL for search engines and social scrapers
 */
export function getCanonicalUrl(path: string = ""): string {
  if (!path || path === "/") return SITE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * High-value keyword targets for Google Search
 */
export const PRIMARY_KEYWORDS = [
  "hack4win",
  "hack4win online",
  "hack4win.online",
  "hackathon platform",
  "hackathons online",
  "developer hackathons",
  "coding competitions",
  "ai hackathons 2026",
  "web3 hackathons",
  "college hackathons india",
  "global software competitions",
  "hackathon bounties",
  "host a hackathon",
  "devpost alternative",
  "find hackathon team",
  "project showcase",
];
