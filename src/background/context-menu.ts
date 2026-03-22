/**
 * Context Menu Manager
 *
 * Manages right-click context menus in the browser.
 */

import type { ContextMenuConfig } from '@/types';
import { generateMessageId } from '@/utils/messaging';
import { logger } from '../utils/logger';

export class ContextMenuManager {
  private menuItems: ContextMenuConfig[] = [
    {
      id: 'inspect-element',
      title: 'Inspect with FrontendDevHelper',
      contexts: ['page', 'selection', 'link', 'image'],
    },
    {
      id: 'copy-selector',
      title: 'Copy CSS Selector',
      contexts: ['page', 'selection'],
    },
    {
      id: 'separator-1',
      title: 'separator',
      contexts: ['page', 'selection', 'link', 'image'],
    },
    {
      id: 'toggle-features',
      title: 'Toggle Features',
      contexts: ['page'],
    },
    {
      id: 'toggle-element-inspector',
      title: 'Element Inspector',
      contexts: ['page'],
      parentId: 'toggle-features',
    },
    {
      id: 'toggle-css-scanner',
      title: 'CSS Scanner',
      contexts: ['page'],
      parentId: 'toggle-features',
    },
  ];

  /**
   * Initialize context menus
   */
  initialize(): void {
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
      this.createMenus();
    });

    // Set up click handler
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleClick(info, tab);
    });
  }

  /**
   * Create context menu items
   */
  private createMenus(): void {
    for (const item of this.menuItems) {
      if (item.title === 'separator') {
        chrome.contextMenus.create({
          id: item.id,
          type: 'separator',
          contexts: item.contexts,
          parentId: item.parentId,
        });
      } else {
        chrome.contextMenus.create({
          id: item.id,
          title: item.title,
          contexts: item.contexts,
          parentId: item.parentId,
          enabled: item.enabled ?? true,
        });
      }
    }

    logger.log('[ContextMenuManager] Context menus created');
  }

  /**
   * Handle context menu clicks
   */
  private async handleClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (!tab?.id) return;

    logger.log('[ContextMenuManager] Menu clicked:', info.menuItemId);

    switch (info.menuItemId) {
      case 'inspect-element':
        await this.sendMessageToTab(tab.id, {
          type: 'INIT',
          timestamp: Date.now(),
          id: generateMessageId(),
        });
        break;

      case 'copy-selector':
        await this.sendMessageToTab(tab.id, {
          type: 'COPY_CSS',
          timestamp: Date.now(),
          id: generateMessageId(),
        });
        break;

      case 'toggle-element-inspector':
        await this.sendMessageToTab(tab.id, {
          type: 'TOGGLE_FEATURE',
          payload: { feature: 'elementInspector', enabled: true },
          timestamp: Date.now(),
          id: generateMessageId(),
        });
        break;

      case 'toggle-css-scanner':
        await this.sendMessageToTab(tab.id, {
          type: 'TOGGLE_FEATURE',
          payload: { feature: 'cssScanner', enabled: true },
          timestamp: Date.now(),
          id: generateMessageId(),
        });
        break;
    }
  }

  /**
   * Send a message to a tab
   */
  private async sendMessageToTab(tabId: number, message: unknown): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      logger.error('[ContextMenuManager] Failed to send message to tab:', error);
    }
  }

  /**
   * Update a menu item
   */
  updateMenuItem(id: string, updates: Partial<ContextMenuConfig>): void {
    chrome.contextMenus.update(id, {
      title: updates.title,
      enabled: updates.enabled,
    });
  }

  /**
   * Remove a menu item
   */
  removeMenuItem(id: string): void {
    chrome.contextMenus.remove(id);
  }
}
