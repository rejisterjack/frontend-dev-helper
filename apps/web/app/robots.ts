import type { MetadataRoute } from "next";

const SITE_ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://frontenddevhelper.com";

/**
 * robots.txt — served at /robots.txt by Next.js App Router.
 *
 * We allow all crawlers on marketing content, and disallow /api and the
 * auth-gated dashboard subtree. Auth pages are allowed so crawlers can
 * discover them but most search engines deprioritize them anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
