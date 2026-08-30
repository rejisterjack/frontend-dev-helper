import type { MetadataRoute } from "next";
import { allTools } from "@/data/tools";
import { allComparisons } from "@/data/comparisons";
import { allPosts, getLatestPostDate } from "@/lib/blog";

const SITE_ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://frontenddevhelper.com";

/**
 * Dynamic sitemap. Next.js App Router exposes /sitemap.xml from this file.
 *
 * Includes:
 *  - The landing page and legal pages (high priority, weekly refresh).
 *  - All tool detail pages (each gets its own entry).
 *  - Comparison ("X alternative") pages.
 *  - Blog index + posts.
 *  - Auth pages (low priority — search engines shouldn't really send traffic
 *    here, but including them costs nothing and lets crawlers learn the
 *    site structure).
 *
 * Excludes /dashboard and /api/* (auth-gated or non-HTML).
 */

/** Fallback when a tool or post has no explicit updatedAt. */
const SITE_CONTENT_UPDATED = process.env.NEXT_PUBLIC_SITEMAP_DATE
  ? new Date(process.env.NEXT_PUBLIC_SITEMAP_DATE)
  : new Date("2026-08-30");

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/compare", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" },
  { path: "/signup", priority: 0.3, changeFrequency: "yearly" },
  { path: "/forgot-password", priority: 0.1, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_ORIGIN}${r.path}`,
    lastModified: r.path === "/blog" ? getLatestPostDate() : SITE_CONTENT_UPDATED,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const toolEntries: MetadataRoute.Sitemap = allTools.map((tool) => ({
    url: `${SITE_ORIGIN}/tools/${tool.slug}`,
    lastModified: tool.updatedAt
      ? new Date(tool.updatedAt)
      : SITE_CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const comparisonEntries: MetadataRoute.Sitemap = allComparisons.map((c) => ({
    url: `${SITE_ORIGIN}/compare/${c.slug}`,
    lastModified: SITE_CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${SITE_ORIGIN}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...toolEntries,
    ...comparisonEntries,
    ...blogEntries,
  ];
}
