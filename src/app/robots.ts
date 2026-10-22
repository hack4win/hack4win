import type { MetadataRoute } from "next";

/**
 * Next.js Robots Exclusion Standard Handler
 * 
 * Tells search engine crawlers (Googlebot, Bingbot, etc.) which paths
 * are indexable and which private endpoints should not be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hack4win.online";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/hackathons",
          "/hackathons/*",
          "/projects/*",
          "/users/*",
          "/u/*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/auth/*",
          "/profile",
          "/profile/*",
          "/team-invites/*",
          "/*/submit",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
