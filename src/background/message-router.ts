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
import { z } from 'zod';

// Message validation schemas
const messageTypeSchema = z.enum([
  'PING', 'GET_SETTINGS', 'UPDATE_SETTINGS', 'GET_FEATURES', 'TOGGLE_FEATURE',
  'GET_TOOL_STATE', 'SET_TOOL_STATE', 'TOGGLE_TOOL', 'GET_ALL_TOOL_STATES',
  'SITE_REPORT_GENERATE', 'EXPORT_GENERATE_REPORT', 'PESTICIDE_ENABLE',
  'PESTICIDE_DISABLE', 'PESTICIDE_TOGGLE', 'COLOR_PICKER_ENABLE',
  'COLOR_PICKER_DISABLE', 'MEASURE_TOOL_ENABLE', 'MEASURE_TOOL_DISABLE',
  'GRID_OVERLAY_ENABLE', 'GRID_OVERLAY_DISABLE', 'BREAKPOINT_ANALYZER_ENABLE',
  'CONSOLE_PLUS_ENABLE', 'CONSOLE_PLUS_DISABLE', 'STORAGE_INSPECTOR_ENABLE',
  'STORAGE_INSPECTOR_DISABLE', 'API_TESTER_ENABLE', 'API_TESTER_DISABLE',
  'FORM_VALIDATOR_ENABLE', 'FORM_VALIDATOR_DISABLE', 'ACCESSIBILITY_CHECKER_ENABLE',
  'ACCESSIBILITY_CHECKER_DISABLE', 'SEO_ANALYZER_ENABLE', 'SEO_ANALYZER_DISABLE',
  'SCREENSHOT_TOOL_ENABLE', 'SCREENSHOT_TOOL_DISABLE', 'DESIGN_MODE_ENABLE',
  'DESIGN_MODE_DISABLE', 'VISUAL_REGRESSION_ENABLE', 'VISUAL_REGRESSION_DISABLE',
  'AI_SUGGESTIONS_ENABLE', 'AI_SUGGESTIONS_DISABLE'
]);

const baseMessageSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  timestamp: z.number().optional(),
  payload: z.unknown().optional(),
});

const toggleFeaturePayloadSchema = z.object({
  feature: z.string().min(1).max(100),
  enabled: z.boolean(),
});

const toolStatePayloadSchema = z.object({
  toolId: z.string().min(1).max(100),
  enabled: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

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
    // Validate message format
    if (!this.validateMessage(message)) {
      sendResponse({
        success: false,
        error: 'Invalid message format',
      });
      return true;
    }

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
   * Get a registered handler
   */
  getHandler(type: string): ((message: ExtensionMessage) => Promise<unknown>) | undefined {
    return this.handlers.get(type);
  }

  /**
   * Validate incoming message structure
   */
  private validateMessage(message: unknown): message is ExtensionMessage {
    const result = baseMessageSchema.safeParse(message);
    if (!result.success) {
      logger.error('[MessageRouter] Invalid message format:', result.error);
      return false;
    }
    return true;
  }

  /**
   * Validate message payload against schema
   */
  private validatePayload<T>(schema: z.ZodSchema<T>, payload: unknown): T | null {
    const result = schema.safeParse(payload);
    if (!result.success) {
      logger.error('[MessageRouter] Invalid payload:', result.error);
      return null;
    }
    return result.data;
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
      const settingsSchema = z.record(z.unknown());
      const validatedPayload = this.validatePayload(settingsSchema, message.payload);
      if (!validatedPayload) {
        throw new Error('Invalid UPDATE_SETTINGS payload');
      }
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: validatedPayload,
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
      const validatedPayload = this.validatePayload(toggleFeaturePayloadSchema, message.payload);
      if (!validatedPayload) {
        throw new Error('Invalid TOGGLE_FEATURE payload');
      }
      const { feature, enabled } = validatedPayload;

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
    const copyToClipboardSchema = z.object({ text: z.string() });
    this.registerHandler('COPY_TO_CLIPBOARD', async (message) => {
      const validatedPayload = this.validatePayload(copyToClipboardSchema, message.payload);
      if (!validatedPayload) {
        throw new Error('Invalid COPY_TO_CLIPBOARD payload');
      }
      const { text } = validatedPayload;

      // Use offscreen document for clipboard operations in MV3
      // For now, return the text - actual copying happens in content/popup context
      return { text, copied: true };
    });
  }
}
