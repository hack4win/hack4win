import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION, BRAND_ASSETS } from "@/lib/seo/config";

/**
 * Web App Manifest Handler for hack4win.online
 * Provides PWA metadata, improves mobile app-like capability, and boosts SEO authority.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} | Global Hackathon Platform`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: BRAND_ASSETS.iconPng,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: BRAND_ASSETS.logoPng,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
