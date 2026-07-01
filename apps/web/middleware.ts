import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  // Per-request nonce, used by the CSP header and (eventually) `<Script nonce>`.
  const nonce = generateNonce();

  // Build the Content-Security-Policy. The nonce is interpolated into the
  // script-src and style-src directives so Next.js's inline runtime scripts
  // (which it tags with the same nonce via the `x-forwarded-nonce` mechanism
  // in production) are allowed to execute.
  const csp = [
    `default-src 'self'`,
    // 'unsafe-inline' on style-src is required by Next.js + styled-components
    // even with nonces (style tags injected at runtime). Tightening this is
    // a Phase 2 task.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://plausible.io`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://plausible.io https://*.sentry.io`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Allow auth routes, API routes, and static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/tools/") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname === "/"
  ) {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", csp);
    // Expose the nonce to the server component layer so layout scripts can
    // pick it up via `headers()`.
    res.headers.set("x-nonce", nonce);
    return res;
  }

  // Protect dashboard routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/licenses") ||
    pathname.startsWith("/teams")
  ) {
    if (!req.auth) {
      const redirect = NextResponse.redirect(new URL("/login", req.url));
      redirect.headers.set("Content-Security-Policy", csp);
      return redirect;
    }
  }

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("x-nonce", nonce);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
