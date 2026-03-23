/**
 * Message Router
 *
 * Central message routing system for the FrontendDevHelper extension.
 * Handles communication between popup, content scripts, devtools panel, and background service worker.
 *
 * Features:
 * - Type-safe message routing with Zod validation
 * - Automatic message validation and sanitization
 * - Handler registration and lifecycle management
 * - Error handling with detailed logging
 *
 * @module message-router
 * @example
 * ```typescript
 * const router = new MessageRouter();
 * router.initialize();
 *
 * // Register custom handler
 * router.registerHandler('CUSTOM_MESSAGE', async (message) => {
 *   return { success: true, data: 'processed' };
 * });
 * ```
 */

import { z } from 'zod';
import { STORAGE_KEYS } from '@/constants';
import type { ExtensionMessage, MessageResponse } from '@/types';
import { generateMessageId } from '@/utils/messaging';
import { logger } from '../utils/logger';

// ============================================
// Zod Validation Schemas
// ============================================

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

/**
 * MessageRouter class for handling extension message routing.
 *
 * Provides a centralized message handling system with:
 * - Automatic message validation using Zod schemas
 * - Handler registration and management
 * - Error handling and logging
 * - Type-safe message processing
 */
export class MessageRouter {
  private handlers: Map<string, (message: ExtensionMessage) => Promise<unknown>> = new Map();

  /**
   * Creates a new MessageRouter instance.
   * Automatically registers default handlers for built-in message types.
   */
  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Initializes the message router.
   * Logs initialization status for debugging purposes.
   */
  initialize(): void {
    logger.log('[MessageRouter] Initialized');
  }

  /**
   * Handles incoming messages from any extension context.
   *
   * Validates the message format, routes to the appropriate handler,
   * and manages the response lifecycle.
   *
   * @param message - The incoming message object
   * @param sender - Information about the message sender
   * @param sendResponse - Callback function to send response back
   * @returns true to indicate async response handling
   *
   * @example
   * ```typescript
   * chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
   *   return router.handleMessage(msg, sender, sendResponse);
   * });
   * ```
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
   * Registers a message handler for a specific message type.
   *
   * @param type - The message type to handle
   * @param handler - Async function to process messages of this type
   *
   * @example
   * ```typescript
   * router.registerHandler('CUSTOM_MESSAGE', async (message) => {
   *   const data = await processData(message.payload);
   *   return { success: true, data };
   * });
   * ```
   */
  registerHandler(type: string, handler: (message: ExtensionMessage) => Promise<unknown>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Unregisters a message handler.
   *
   * @param type - The message type to remove handler for
   */
  unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * Gets a registered message handler.
   *
   * @param type - The message type to get handler for
   * @returns The handler function, or undefined if not found
   */
  getHandler(type: string): ((message: ExtensionMessage) => Promise<unknown>) | undefined {
    return this.handlers.get(type);
  }

  /**
   * Validates incoming message structure against Zod schema.
   *
   * Checks that the message has the required structure:
   * - type: string (required)
   * - id: string (optional)
   * - timestamp: number (optional)
   * - payload: unknown (optional)
   *
   * @param message - The message to validate
   * @returns True if message is valid ExtensionMessage
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
   * Validates message payload against a Zod schema.
   *
   * @typeParam T - The expected type of the payload
   * @param schema - Zod schema to validate against
   * @param payload - The payload to validate
   * @returns Validated payload, or null if validation fails
   *
   * @example
   * ```typescript
   * const schema = z.object({ name: z.string() });
   * const payload = this.validatePayload(schema, message.payload);
   * if (!payload) throw new Error('Invalid payload');
   * ```
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
