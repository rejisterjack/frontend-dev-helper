export function register() {
  // Sentry is optional — only active when @sentry/nextjs is installed
  if (process.env.NEXT_RUNTIME === 'client') {
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        debug: false,
      });
    } catch {}
  }
}
