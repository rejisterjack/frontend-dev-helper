/**
 * Lightweight page signals for "recommended tools" in the popup.
 * pageHintsCollector is injected via chrome.scripting — keep it self-contained (no closures).
 */

import type { ToolId } from '@/constants';
import { TOOL_IDS } from '@/constants';

export interface PageHints {
  paragraphCount: number;
  imageCount: number;
  formFieldCount: number;
  linkCount: number;
}

export function pageHintsCollector(): PageHints {
  return {
    paragraphCount: document.querySelectorAll('p').length,
    imageCount: document.querySelectorAll('img').length,
    formFieldCount: document.querySelectorAll('input, textarea, select, button').length,
    linkCount: document.querySelectorAll('a[href]').length,
  };
}

export function recommendedToolsFromHints(h: PageHints | null): ToolId[] {
  if (!h) return [];
  const out: ToolId[] = [];
  if (h.paragraphCount >= 8 || h.linkCount >= 20) {
    out.push(TOOL_IDS.CONTRAST_CHECKER, TOOL_IDS.LAYOUT_VISUALIZER);
  }
  if (h.imageCount >= 5) {
    out.push(TOOL_IDS.SITE_REPORT, TOOL_IDS.NETWORK_ANALYZER);
  }
  if (h.formFieldCount >= 4) {
    out.push(TOOL_IDS.FORM_DEBUGGER, TOOL_IDS.ACCESSIBILITY_AUDIT);
  }
  if (out.length === 0) {
    out.push(TOOL_IDS.DOM_OUTLINER, TOOL_IDS.CSS_INSPECTOR);
  }
  return [...new Set(out)];
}

export async function collectPageHints(tabId: number): Promise<PageHints | null> {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: pageHintsCollector,
    });
    return res?.result ?? null;
  } catch {
    return null;
  }
}
