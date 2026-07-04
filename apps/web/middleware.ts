import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

/**
 * NextAuth-powered middleware.
 *
 * IMPORTANT: middleware runs in the Edge runtime, which can't resolve Node
 * modules. We initialize NextAuth with the edge-safe `authConfig` from
 * `lib/auth.config.ts` — NEVER `lib/auth.ts`, which pulls Prisma (`node:*`)
 * and bcrypt into its graph. The `authorized` callback defined in
 * `authConfig` is what does the actual session gating; we add CSP nonce
 * generation here because that has to happen per-request.
 *
 * The auth-gating decision and the session lookup both happen in the Edge
 * runtime via this construction. The full Node-runtime auth setup
 * (`lib/auth.ts`) is responsible for issuing/stamping the JWT — the same JWT
 * is readable here without needing Prisma.
 */
const { auth } = NextAuth(authConfig);

/**
 * Generate a per-request CSP nonce.
 *
 * Returns a base64-encoded 18-byte random value. We use the Web Crypto
 * `crypto.getRandomValues` (available in the Edge runtime that Next.js
 * middleware runs in) — `crypto.randomBytes` from Node's `crypto` module
 * is NOT available in the Edge runtime.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  // Convert to base64 without Node Buffer (Edge-safe).
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Per-request nonce. It is forwarded to the React tree via the
  // `x-nonce` request header (which `headers()` reads in server components)
  // AND echoed on the response for diagnostics. Layout scripts read it via
  // `headers().get('x-nonce')` and pass it to `<Script nonce={...}>`.
  const nonce = generateNonce();

  // Sentry ingest endpoint. Once your Sentry org is provisioned, replace the
  // wildcard with your specific ingest host, e.g.
  //   https://o12345.ingest.sentry.io
  // to tighten the rule. Until then `*.sentry.io` is the accepted risk —
  // it only allows CONNECT to Sentry endpoints, not script execution.
  const sentryIngestHost = process.env.SENTRY_CSP_INGEST_HOST
    ? `https://${process.env.SENTRY_CSP_INGEST_HOST}`
    : "https://*.sentry.io";

  const isDev = process.env.NODE_ENV === "development";

  // Build the Content-Security-Policy.
  const csp = [
    `default-src 'self'`,
    // 'unsafe-inline' on style-src is required by Next.js (runtime-injected
    // style tags for styled-components / RSC styling). Tightening this to a
    // nonce-based policy is tracked as a follow-up.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    // The nonce is applied to <script> tags in app/layout.tsx via
    // `<Script nonce={nonce}>`. 'strict-dynamic' lets nonced scripts spawn
    // trust-bearing children without listing them explicitly.
    // In development, Next.js uses `eval()` for React Refresh / HMR, so we
    // must add 'unsafe-eval' to script-src or every page throws EvalError.
    // Production builds don't need it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://plausible.io${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://plausible.io`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://plausible.io ${sentryIngestHost}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Forward the nonce to the React tree by setting a request header on the
  // response that wraps the rewritten/forwarded request. Server components
  // then read it via `headers().get('x-nonce')`.
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-nonce", nonce);
  // Also stamp the nonce on a request header so downstream `headers()` reads
  // (which see request headers, not response headers) can find it.
  req.headers.set("x-nonce", nonce);

  // The NextAuth `auth()` wrapper runs `authConfig.callbacks.authorized`
  // against the resolved session. If `authorized` returned false, the wrapper
  // itself emits the redirect. As a belt-and-braces check, we also redirect
  // unauthenticated users hitting protected prefixes here.
  const protectedPrefixes = ["/dashboard", "/licenses", "/teams"];
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set("Content-Security-Policy", csp);
      return redirect;
    }
  }

  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
