import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry initialization.
 *
 * Activates only when `NEXT_PUBLIC_SENTRY_DSN` is set, so dev and CI without
 * a DSN don't try to send events. The unconditional `@sentry/nextjs` import
 * is intentional — the package is now in `dependencies`, not optional.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "client") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Lower in production once we know the noise floor.
      tracesSampleRate: 0.1,
      // Don't record session replays by default — privacy-preserving. Capture
      // replays only when an error actually occurs.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
      // Suppress common noisy errors that aren't actionable.
      ignoreErrors: [
        // Browser extensions injected into user pages.
        "top.GLOBALS",
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        // Failed fetches from extensions / network blips.
        "Network request failed",
        "Load failed",
      ],
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
