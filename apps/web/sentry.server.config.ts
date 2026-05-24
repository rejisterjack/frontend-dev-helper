export function register() {
  // Sentry is optional — only active when @sentry/nextjs is installed
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        debug: false,
      });
    } catch {}
  }
}
