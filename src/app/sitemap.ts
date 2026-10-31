import type { MetadataRoute } from "next";
import { hackathonRepository } from "@/lib/db/hackathon-repository";
import { userRepository } from "@/lib/db/user-repository";
import { SITE_URL } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

/**
 * Next.js Dynamic Sitemap Generator
 * Target Domain: https://hack4win.online
 * 
 * Generates fresh sitemap.xml with canonical URLs for hackathons,
 * project showcases, and builder profiles.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // 1. Core Platform Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/hackathons`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/host`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];

  try {
    // 2. Dynamic Published Hackathons (excluding drafts and private campus hackathons)
    const hackathons = await hackathonRepository.listHackathons({ limit: 250, includeDrafts: false });
    const hackathonRoutes: MetadataRoute.Sitemap = hackathons
      .filter((h) => h.status !== "draft" && !h.is_private)
      .map((h) => ({
        url: `${baseUrl}/hackathons/${h.slug}`,
        lastModified: new Date(h.updated_at || h.created_at),
        changeFrequency: h.status === "ongoing" || h.status === "upcoming" ? "daily" : "weekly",
        priority: 0.85,
      }));

    // 3. Dynamic Public Projects (only approved from published public hackathons)
    const publicSubmissions = await hackathonRepository.getAllSubmissions({
      limit: 500,
      status: "approved",
      includeDraftHackathons: false,
      includePrivateHackathons: false,
    });
    const projectRoutes: MetadataRoute.Sitemap = publicSubmissions.map((sub) => ({
      url: `${baseUrl}/projects/${sub.id}`,
      lastModified: new Date(sub.updated_at || sub.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 4. Dynamic Builder Profiles with Usernames
    const users = await userRepository.listUsers({ limit: 500 });
    const userRoutes: MetadataRoute.Sitemap = users
      .filter((u) => u.username)
      .map((u) => ({
        url: `${baseUrl}/u/${u.username}`,
        lastModified: new Date(u.updated_at || u.created_at),
        changeFrequency: "weekly",
        priority: 0.75,
      }));

    return [...staticRoutes, ...hackathonRoutes, ...projectRoutes, ...userRoutes];
  } catch (error) {
    console.error("[Sitemap Generation Error]:", error);
    return staticRoutes;
  }
}
