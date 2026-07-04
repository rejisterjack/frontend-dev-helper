/**
 * Ambient type declarations for browser globals injected by third-party
 * scripts (Plausible analytics, etc.).
 */

interface Window {
  /**
   * Plausible Analytics event tracker. Injected by the Plausible script tag
   * in `app/layout.tsx`. Defined as optional because the script may be
   * blocked by an ad blocker or fail to load.
   *
   * Reference: https://plausible.io/docs/custom-event-goals
   */
  plausible?: (
    eventName: string,
    options?: { props?: Record<string, string | number | boolean> },
    // Plausible supports a third "options" arg for callback/url; omitted here
    // since we don't use it.
  ) => void;
}
