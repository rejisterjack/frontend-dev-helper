import * as Sentry from "@sentry/nextjs";

/**
 * Server-side (Node.js runtime) Sentry initialization.
 *
 * Activates only when `NEXT_PUBLIC_SENTRY_DSN` is set. The unconditional
 * `@sentry/nextjs` import is intentional — the package is now in
 * `dependencies`, not optional.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
      // Don't send PII. We never want emails/IPs in Sentry.
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
