/**
 * Message Types for FrontendDevHelper
 *
 * Single source of truth is MESSAGE_TYPES in src/constants/index.ts.
 * This file re-exports it and provides typed payload interfaces.
 */

import { MESSAGE_TYPES } from '@/constants';

// ============================================
// Re-export (single source of truth)
// ============================================

export { MESSAGE_TYPES };

/** Union of all valid message type string values */
export type MessageTypeValue = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// ============================================
// Message Payload Interface
// ============================================

export interface MessagePayload {
  type: MessageTypeValue;
  payload?: unknown;
}

// ============================================
// Specific Message Payloads
// ============================================

export interface ElementInfoPayload {
  tag: string;
  id: string | null;
  class: string | null;
  selector: string;
  dimensions: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontFamily: string;
    margin: string;
    padding: string;
    borderRadius: string;
    display: string;
    position: string;
  };
  text: string | null;
  children: number;
}

export interface SettingsPayload {
  darkMode: boolean;
  showGridLines: boolean;
  autoInspect: boolean;
  colorFormat: 'hex' | 'rgb' | 'hsl';
  gridSize: number;
  shortcuts: {
    toggleInspector: string;
    openPopup: string;
  };
}

export interface ColorInfoPayload {
  hex: string;
  rgb: string;
  hsl: string;
}

export interface MeasurementPayload {
  distance: number;
  unit: 'px' | 'rem' | 'em';
  start: { x: number; y: number };
  end: { x: number; y: number };
}

// ============================================
// Message Response Types
// ============================================

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Type Guards
// ============================================

export function isElementInfoPayload(payload: unknown): payload is ElementInfoPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'tag' in payload &&
    'selector' in payload &&
    'dimensions' in payload
  );
}

export function isSettingsPayload(payload: unknown): payload is SettingsPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'darkMode' in payload &&
    'colorFormat' in payload
  );
}

// ============================================
// Message Sender Helpers
// ============================================

export async function sendMessage<T = unknown>(
  message: MessagePayload
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        resolve(response);
      }
    });
  });
}

export async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: MessagePayload
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        resolve(response);
      }
    });
  });
}
