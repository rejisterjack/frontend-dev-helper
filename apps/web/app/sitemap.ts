import type { MetadataRoute } from "next";
import { allTools } from "@/data/tools";

/**
 * Dynamic sitemap. Next.js App Router exposes /sitemap.xml from this file.
 *
 * Includes:
 *  - The landing page and legal pages (high priority, weekly refresh).
 *  - All 30 tool detail pages (each gets its own entry).
 *  - Auth pages (low priority — search engines shouldn't really send traffic
 *    here, but including them costs nothing and lets crawlers learn the
 *    site structure).
 *
 * Excludes /dashboard and /api/* (auth-gated or non-HTML).
 */
const SITE_ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://frontenddevhelper.com";

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" },
  { path: "/signup", priority: 0.3, changeFrequency: "yearly" },
  { path: "/forgot-password", priority: 0.1, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_ORIGIN}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const toolEntries: MetadataRoute.Sitemap = allTools.map((tool) => ({
    url: `${SITE_ORIGIN}/tools/${tool.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...toolEntries];
}
