import type { MetadataRoute } from "next";

/**
 * Web App Manifest Handler
 * Provides PWA metadata, improves mobile app-like capability, and boosts SEO authority.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hack4Win | Global Hackathon Platform",
    short_name: "Hack4Win",
    description: "Build, showcase, and win world-class hackathons with top engineering squads.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3b82f6",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
