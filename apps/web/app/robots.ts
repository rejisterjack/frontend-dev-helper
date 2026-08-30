import type { MetadataRoute } from "next";
import { AI_CRAWLERS, SITE_URL } from "@/lib/site";

const SITE_ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? SITE_URL;

/**
 * robots.txt — served at /robots.txt by Next.js App Router.
 *
 * We allow all crawlers on marketing content, and disallow /api and the
 * auth-gated dashboard subtree. AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, …) are explicitly allowed with a dedicated rule so they
 * can ingest tool pages into training/retrieval corpora — being cited by
 * AI assistants is a primary discovery channel for this product.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      {
        // AI/LLM crawlers — explicit allow, same exclusions.
        userAgent: [...AI_CRAWLERS],
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
