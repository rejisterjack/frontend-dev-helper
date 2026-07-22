/**
 * Optional host permissions — tools only run on origins the user enables.
 */

export function originPatternFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.origin}/*`;
  } catch {
    return null;
  }
}

export async function hasHostAccess(url: string): Promise<boolean> {
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  return browser.permissions.contains({ origins: [pattern] });
}

/**
 * Request host access for the given tab URL. Must be called from a user gesture.
 */
export async function requestHostAccess(url: string): Promise<boolean> {
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  const already = await browser.permissions.contains({ origins: [pattern] });
  if (already) return true;
  return browser.permissions.request({ origins: [pattern] });
}

export async function ensureActiveTabHostAccess(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    return { ok: false, reason: "No active tab" };
  }
  const granted = await requestHostAccess(tab.url);
  if (!granted) {
    return {
      ok: false,
      reason: "Host permission denied. Enable this site to use tools.",
    };
  }
  // Nudge content script injection after grant.
  try {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/content-scripts/content.js"],
    });
  } catch {
    // Content script may already be registered via manifest matches once
    // optional host permission is granted; ignore injection failures.
  }
  return { ok: true };
}
