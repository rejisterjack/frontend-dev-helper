/**
 * Tab Manager
 *
 * Manages tab lifecycle events and communication with content scripts.
 */

import { generateMessageId } from '@/utils/messaging';
import { logger } from '../utils/logger';

export class TabManager {
  private activeTabs: Set<number> = new Set();

  /**
   * Initialize tab management
   */
  initialize(): void {
    this.setupTabListeners();
    this.initializeActiveTabs();
  }

  /**
   * Set up tab event listeners
   */
  private setupTabListeners(): void {
    // Tab activated
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId);
    });

    // Tab updated (URL changed, loading complete)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    // Tab removed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // Window focus changed
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.handleWindowFocusChanged(windowId);
    });
  }

  /**
   * Initialize tracking of existing tabs
   */
  private async initializeActiveTabs(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.id) {
        this.activeTabs.add(tab.id);
      }
    });
  }

  /**
   * Handle tab activation
   */
  private async handleTabActivated(tabId: number): Promise<void> {
    logger.log('[TabManager] Tab activated:', tabId);

    // Notify the tab it's now active
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'TAB_CHANGED',
        payload: { active: true },
        timestamp: Date.now(),
        id: generateMessageId(),
      });
    } catch {
      // Tab may not have content script
    }
  }

  /**
   * Handle tab updates
   */
  private handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      logger.log('[TabManager] Tab loaded:', tabId, tab.url);

      // Notify content script that page has loaded
      this.notifyTabLoaded(tabId, tab.url);
    }

    if (changeInfo.url) {
      logger.log('[TabManager] URL changed:', tabId, changeInfo.url);

      // Notify of URL change
      this.notifyUrlChanged(tabId, changeInfo.url);
    }
  }

  /**
   * Handle tab removal
   */
  private handleTabRemoved(tabId: number): void {
    logger.log('[TabManager] Tab removed:', tabId);
    this.activeTabs.delete(tabId);
  }

  /**
   * Handle window focus change
   */
  private async handleWindowFocusChanged(windowId: number): Promise<void> {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;

    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab?.id) {
      this.handleTabActivated(activeTab.id);
    }
  }

  /**
   * Notify tab that page has loaded
   */
  private async notifyTabLoaded(tabId: number, url: string): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'INIT',
        payload: { url },
        timestamp: Date.now(),
        id: generateMessageId(),
      });
    } catch {
      // Content script may not be injected yet
    }
  }

  /**
   * Notify tab of URL change
   */
  private async notifyUrlChanged(tabId: number, url: string): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'URL_CHANGED',
        payload: { url },
        timestamp: Date.now(),
        id: generateMessageId(),
      });
    } catch {
      // Content script may not be available
    }
  }

  /**
   * Send a message to all tabs
   */
  async broadcast(message: unknown): Promise<void> {
    for (const tabId of this.activeTabs) {
      try {
        await chrome.tabs.sendMessage(tabId, message);
      } catch {
        // Tab may not have content script
      }
    }
  }

  /**
   * Get all active tabs
   */
  getActiveTabs(): number[] {
    return Array.from(this.activeTabs);
  }

  /**
   * Check if a tab is active
   */
  isTabActive(tabId: number): boolean {
    return this.activeTabs.has(tabId);
  }
}
