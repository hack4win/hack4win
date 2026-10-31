import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

/**
 * Next.js Robots Exclusion Standard Handler
 * 
 * Tells search engine crawlers (Googlebot, Bingbot, etc.) which paths
 * are indexable and which private endpoints should not be crawled.
 * Target Domain: https://hack4win.online
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/hackathons",
          "/hackathons/*",
          "/projects",
          "/projects/*",
          "/host",
          "/u/*",
          "/users/*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/organizer",
          "/organizer/*",
          "/orgnizer",
          "/orgnizer/*",
          "/judge",
          "/judge/*",
          "/judges",
          "/judges/*",
          "/notifications",
          "/notifications/*",
          "/api/*",
          "/auth/*",
          "/profile",
          "/profile/*",
          "/team-invites/*",
          "/*/submit",
          "/*/register",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: "hack4win.online",
  };
}
