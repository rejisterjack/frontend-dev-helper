/**
 * Messaging Utilities
 *
 * Type-safe messaging wrappers for communication between
 * background service worker, content scripts, and popup.
 */

import { MESSAGE_TYPES } from '@/constants';

// ============================================
// Type Definitions
// ============================================

/**
 * Base message interface
 */
export interface BaseMessage {
  /** Message type */
  type: string;
  /** Unique message ID */
  id?: string;
  /** Message timestamp */
  timestamp?: number;
  /** Optional payload */
  payload?: unknown;
}

/**
 * Message response interface
 */
export interface MessageResponse<T = unknown> {
  /** Success flag */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Original message ID */
  id?: string;
}

/**
 * Tool toggle message
 */
export interface ToggleToolMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TOGGLE_TOOL;
  payload: {
    toolId: string;
    enabled: boolean;
    tabId?: number;
  };
}

/**
 * Get tool state message
 */
export interface GetToolStateMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.GET_TOOL_STATE;
  payload: {
    toolId: string;
    tabId?: number;
  };
}

/**
 * Set tool state message
 */
export interface SetToolStateMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SET_TOOL_STATE;
  payload: {
    toolId: string;
    state: {
      enabled: boolean;
      settings?: Record<string, unknown>;
    };
    tabId?: number;
  };
}

/**
 * Get all tool states message
 */
export interface GetAllToolStatesMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.GET_ALL_TOOL_STATES;
  payload?: {
    tabId?: number;
  };
}

/**
 * Tool state changed notification
 */
export interface ToolStateChangedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TOOL_STATE_CHANGED;
  payload: {
    toolId: string;
    state: {
      enabled: boolean;
      settings?: Record<string, unknown>;
    };
    tabId?: number;
  };
}

/**
 * Tab changed message
 */
export interface TabChangedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TAB_CHANGED;
  payload: {
    active: boolean;
    tabId?: number;
    url?: string;
  };
}

/**
 * URL changed message
 */
export interface UrlChangedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.URL_CHANGED;
  payload: {
    url: string;
    tabId?: number;
  };
}

/**
 * Init message
 */
export interface InitMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.INIT;
  payload?: {
    url?: string;
  };
}

/**
 * Toggle feature message
 */
export interface ToggleFeatureMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TOGGLE_FEATURE;
  payload: {
    feature: string;
    enabled: boolean;
  };
}

/**
 * Ping message
 */
export interface PingMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.PING;
}

/**
 * Pong response message
 */
export interface PongMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.PONG;
  payload: {
    timestamp: number;
  };
}

/**
 * Context menu clicked message
 */
export interface ContextMenuClickedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.CONTEXT_MENU_CLICKED;
  payload: {
    menuItemId: string | number;
    info: chrome.contextMenus.OnClickData;
  };
}

/**
 * Color picked message
 */
export interface ColorPickedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.COLOR_PICKED;
  payload: {
    color: string;
    format: 'hex' | 'rgb' | 'hsl';
    element?: string;
  };
}

/**
 * Measurement complete message
 */
export interface MeasurementCompleteMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.MEASUREMENT_COMPLETE;
  payload: {
    width: number;
    height: number;
    distance?: number;
  };
}

/**
 * Union type of all messages
 */
export type ExtensionMessage =
  | ToggleToolMessage
  | GetToolStateMessage
  | SetToolStateMessage
  | GetAllToolStatesMessage
  | ToolStateChangedMessage
  | TabChangedMessage
  | UrlChangedMessage
  | InitMessage
  | ToggleFeatureMessage
  | PingMessage
  | PongMessage
  | ContextMenuClickedMessage
  | ColorPickedMessage
  | MeasurementCompleteMessage
  | BaseMessage;

// ============================================
// Message Sending Functions
// ============================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a base message with common fields
 */
export function createMessage<T extends BaseMessage>(
  type: T['type'],
  payload?: T['payload']
): T {
  return {
    type,
    id: generateMessageId(),
    timestamp: Date.now(),
    ...(payload !== undefined && { payload }),
  } as T;
}

/**
 * Send a message to a specific tab
 * @param tabId - Target tab ID
 * @param message - Message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: ExtensionMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as MessageResponse<T>);
        }
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Send a message to the active tab
 * @param message - Message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToActiveTab<T = unknown>(
  message: ExtensionMessage
): Promise<MessageResponse<T>> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  return sendMessageToTab(activeTab.id, message);
}

/**
 * Send a message to all tabs
 * @param message - Message to send
 * @param filter - Optional filter function for tabs
 * @returns Promise resolving when all messages are sent
 */
export async function sendMessageToAllTabs(
  message: ExtensionMessage,
  filter?: (tab: chrome.tabs.Tab) => boolean
): Promise<void> {
  const tabs = await chrome.tabs.query({});

  const sendPromises = tabs
    .filter((tab) => {
      // Only send to http/https URLs
      if (!tab.url?.match(/^https?:\/\//)) return false;
      // Apply custom filter if provided
      if (filter && !filter(tab)) return false;
      return true;
    })
    .map(async (tab) => {
      if (tab.id) {
        try {
          await sendMessageToTab(tab.id, message);
        } catch {
          // Tab may not have content script - ignore errors
        }
      }
    });

  await Promise.all(sendPromises);
}

/**
 * Broadcast a message to all extension contexts
 * @param message - Message to broadcast
 * @returns Promise resolving when message is sent
 */
export async function broadcastMessage(
  message: ExtensionMessage
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) {
          // Ignore "receiving end does not exist" errors
          if (chrome.runtime.lastError.message?.includes('receiving end does not exist')) {
            resolve();
          } else {
            reject(new Error(chrome.runtime.lastError.message));
          }
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Send a message to the background service worker
 * @param message - Message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToBackground<T = unknown>(
  message: ExtensionMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as MessageResponse<T>);
        }
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

// ============================================
// Message Handlers
// ============================================

/**
 * Type for message handler functions
 */
export type MessageHandler<T = unknown> = (
  message: ExtensionMessage,
  sender?: chrome.runtime.MessageSender
) => Promise<T> | T;

/**
 * Message router for handling incoming messages
 */
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  /**
   * Register a handler for a specific message type
   * @param type - Message type to handle
   * @param handler - Handler function
   */
  on<T>(type: string, handler: MessageHandler<T>): void {
    this.handlers.set(type, handler as MessageHandler);
  }

  /**
   * Remove a handler for a specific message type
   * @param type - Message type to remove
   */
  off(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * Handle an incoming message
   * @param message - Received message
   * @param sender - Message sender info
   * @param sendResponse - Response callback
   * @returns True if handled asynchronously
   */
  handle(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean {
    const handler = this.handlers.get(message.type);

    if (!handler) {
      sendResponse({
        success: false,
        error: `No handler registered for message type: ${message.type}`,
        id: message.id,
      });
      return false;
    }

    // Handle asynchronously
    Promise.resolve()
      .then(() => handler(message, sender))
      .then((data) => {
        sendResponse({
          success: true,
          data,
          id: message.id,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          id: message.id,
        });
      });

    return true; // Keep message channel open for async
  }

  /**
   * Set up the message listener
   */
  listen(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handle(message as ExtensionMessage, sender, sendResponse);
    });
  }
}

// ============================================
// Pre-built Message Creators
// ============================================

/**
 * Create a toggle tool message
 */
export function createToggleToolMessage(
  toolId: string,
  enabled: boolean,
  tabId?: number
): ToggleToolMessage {
  return createMessage<ToggleToolMessage>(MESSAGE_TYPES.TOGGLE_TOOL, {
    toolId,
    enabled,
    tabId,
  });
}

/**
 * Create a get tool state message
 */
export function createGetToolStateMessage(
  toolId: string,
  tabId?: number
): GetToolStateMessage {
  return createMessage<GetToolStateMessage>(MESSAGE_TYPES.GET_TOOL_STATE, {
    toolId,
    tabId,
  });
}

/**
 * Create a set tool state message
 */
export function createSetToolStateMessage(
  toolId: string,
  enabled: boolean,
  settings?: Record<string, unknown>,
  tabId?: number
): SetToolStateMessage {
  return createMessage<SetToolStateMessage>(MESSAGE_TYPES.SET_TOOL_STATE, {
    toolId,
    state: { enabled, settings },
    tabId,
  });
}

/**
 * Create a get all tool states message
 */
export function createGetAllToolStatesMessage(tabId?: number): GetAllToolStatesMessage {
  return createMessage<GetAllToolStatesMessage>(MESSAGE_TYPES.GET_ALL_TOOL_STATES, {
    tabId,
  });
}

/**
 * Create a toggle feature message
 */
export function createToggleFeatureMessage(
  feature: string,
  enabled: boolean
): ToggleFeatureMessage {
  return createMessage<ToggleFeatureMessage>(MESSAGE_TYPES.TOGGLE_FEATURE, {
    feature,
    enabled,
  });
}

/**
 * Create a ping message
 */
export function createPingMessage(): PingMessage {
  return createMessage<PingMessage>(MESSAGE_TYPES.PING);
}

/**
 * Create a pong response message
 */
export function createPongMessage(): PongMessage {
  return createMessage<PongMessage>(MESSAGE_TYPES.PONG, {
    timestamp: Date.now(),
  });
}

// ============================================
// Connection/Port Utilities
// ============================================

/**
 * Check if background script is reachable
 * @param timeout - Timeout in milliseconds
 * @returns Promise resolving to true if reachable
 */
export async function isBackgroundReachable(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);

    sendMessageToBackground(createPingMessage())
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response.success);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        resolve(false);
      });
  });
}

/**
 * Create a persistent port connection
 * @param name - Port name
 * @returns Port object
 */
export function createPort(name: string): chrome.runtime.Port {
  return chrome.runtime.connect({ name });
}

/**
 * Listen for port connections
 * @param callback - Callback for new connections
 */
export function onPortConnect(
  callback: (port: chrome.runtime.Port) => void
): void {
  chrome.runtime.onConnect.addListener(callback);
}
