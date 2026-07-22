import type { PopupMessage, BackgroundToContentMessage } from './types';

export async function sendToBackground<T extends PopupMessage>(msg: T): Promise<unknown> {
  return browser.runtime.sendMessage(msg);
}

export async function sendToContent(tabId: number, msg: BackgroundToContentMessage): Promise<unknown> {
  return browser.tabs.sendMessage(tabId, msg);
}

export async function broadcastToAllTabs(msg: BackgroundToContentMessage): Promise<void> {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url?.match(/^https?:\/\//)) {
      try {
        await browser.tabs.sendMessage(tab.id, msg);
      } catch {
        // Tab may not have content script
      }
    }
  }
}
