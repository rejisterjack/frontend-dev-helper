/**
 * Next.js instrumentation hook.
 *
 * Required for Sentry to actually initialize: Next.js invokes `register()` from
 * this file on server cold start. Without this hook, the `register()` function
 * exported by `sentry.server.config.ts` is never called, so `Sentry.init` never
 * runs and every `Sentry.captureException` call is a silent no-op.
 *
 * The client runtime is initialized separately via the Sentry webpack plugin
 * (see `next.config.ts` `withSentryConfig`), which injects a bootstrap call
 * into the client bundle; we don't import the client config here.
 *
 * Runtime scope: Node.js only. The only Edge-runtime route in this app is
 * `app/opengraph-image.tsx` (dynamic OG image generation), which does not need
 * Sentry error reporting. `sentry.server.config.ts` is intentionally not
 * imported in the Edge runtime because (a) there is no Edge-compatible init
 * here and (b) its inner `NEXT_RUNTIME === "nodejs"` guard would make any
 * `Sentry.init()` call a no-op in Edge anyway, so importing it would only
 * risk bundling Node-only modules into the Edge bundle for no benefit.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}
