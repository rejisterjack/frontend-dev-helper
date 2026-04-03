import type { BrowserContext } from '@playwright/test';

/** Resolve extension id from a loaded MV3 service worker (requires `FDH_EXTENSION_PATH` in Playwright config). */
export async function getChromeExtensionId(context: BrowserContext): Promise<string> {
  const pick = () =>
    context.serviceWorkers().find((sw) => sw.url().startsWith('chrome-extension://'));
  const found = pick();
  if (found) {
    return new URL(found.url()).hostname;
  }
  const sw = await context.waitForEvent('serviceworker', {
    predicate: (worker) => worker.url().startsWith('chrome-extension://'),
    timeout: 20000,
  });
  return new URL(sw.url()).hostname;
}
