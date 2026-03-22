/**
 * Message Router
 *
 * Routes messages between different extension contexts
 * (popup, content script, devtools panel, background).
 */

import { STORAGE_KEYS } from '@/constants';
import type { ExtensionMessage, MessageResponse } from '@/types';
import { generateMessageId } from '@/utils/messaging';
import { logger } from '../utils/logger';

export class MessageRouter {
  private handlers: Map<string, (message: ExtensionMessage) => Promise<unknown>> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Initialize the message router
   */
  initialize(): void {
    logger.log('[MessageRouter] Initialized');
  }

  /**
   * Handle incoming messages
   */
  handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean {
    // Async handling requires returning true
    (async () => {
      try {
        logger.log(
          '[MessageRouter] Received message:',
          message.type,
          'from',
          sender.tab?.id ?? 'popup/devtools'
        );

        const handler = this.handlers.get(message.type);

        if (!handler) {
          sendResponse({
            success: false,
            error: `No handler registered for message type: ${message.type}`,
            id: message.id,
          });
          return;
        }

        const result = await handler(message);

        sendResponse({
          success: true,
          data: result,
          id: message.id,
        });
      } catch (error) {
        logger.error('[MessageRouter] Error handling message:', error);

        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          id: message.id,
        });
      }
    })();

    return true; // Keep channel open for async response
  }

  /**
   * Register a message handler
   */
  registerHandler(type: string, handler: (message: ExtensionMessage) => Promise<unknown>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * Register default message handlers
   */
  private registerDefaultHandlers(): void {
    // Ping handler for connectivity checks
    this.registerHandler('PING', async () => {
      return { pong: true, timestamp: Date.now() };
    });

    // Get settings handler
    this.registerHandler('GET_SETTINGS', async () => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return result[STORAGE_KEYS.SETTINGS] ?? null;
    });

    // Update settings handler
    this.registerHandler('UPDATE_SETTINGS', async (message) => {
      const { payload } = message;
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: payload,
      });
      return { success: true };
    });

    // Get features handler (deprecated - use GET_SETTINGS)
    this.registerHandler('GET_FEATURES', async () => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.TOOL_STATES);
      return result[STORAGE_KEYS.TOOL_STATES] ?? {};
    });

    // Toggle feature handler
    this.registerHandler('TOGGLE_FEATURE', async (message) => {
      const { payload } = message;
      const { feature, enabled } = payload as { feature: string; enabled: boolean };

      // Broadcast to content scripts
      const tabs = await chrome.tabs.query({});

      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'TOGGLE_FEATURE',
              payload: { feature, enabled },
              timestamp: Date.now(),
              id: generateMessageId(),
            });
          } catch {
            // Tab may not have content script injected
          }
        }
      }

      return { success: true, feature, enabled };
    });

    // Copy to clipboard handler
    this.registerHandler('COPY_TO_CLIPBOARD', async (message) => {
      const { text } = message.payload as { text: string };

      // Use offscreen document for clipboard operations in MV3
      // For now, return the text - actual copying happens in content/popup context
      return { text, copied: true };
    });
  }
}
