import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withMDX = createMDX();

const securityHeaders = [
  {
    // Block the page from being framed (anti-clickjacking). Reinforces the
    // CSP `frame-ancestors 'none'` directive for older browsers.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME-type sniffing on responses declared as text/html etc.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Only send the origin (not full URL) for cross-origin requests, full
    // origin for same-origin. Balances privacy with debugging usefulness.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Lock down powerful APIs. We're not using camera/mic/geo/etc.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // Force HTTPS for 2 years, including all subdomains. Vercel sets HSTS
    // itself, but stating it explicitly is defense-in-depth.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Disable cross-origin fetch of the page via fetch/XHR — mitigates
    // Spectre-style info leaks. Pages can still be linked/redirected to.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    // Same-origin resource policy: prevent other origins from embedding our
    // resources via img/script/etc. Conservative default.
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  // Suppress the X-Powered-By: Next.js response header (minor info disclosure).
  poweredByHeader: false,
  // Prisma v7 + driver adapter must run server-side only. Marking it as a
  // server external package keeps webpack from trying to bundle Node-only
  // modules like `node:path`, `node:os`, and the generated client's internal
  // ESM runtime — which would otherwise fail the client bundle build.
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry is now a hard dependency — source maps are uploaded in CI when
// SENTRY_AUTH_TOKEN is present.
const withSentry = withSentryConfig(withMDX(nextConfig), {
  silent: true,
  hideSourceMaps: true,
  // Only upload source maps when building with an auth token (CI/prod).
  // Local `next build` without a token skips upload automatically.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});

export default withBundleAnalyzer(withSentry);
