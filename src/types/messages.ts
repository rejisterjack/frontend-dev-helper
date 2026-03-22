/**
 * Message Types for FrontendDevHelper
 *
 * Defines all possible message types that can be sent between
 * background script, content script, and popup.
 */

// ============================================
// Message Type Enum
// ============================================

export enum MessageType {
  // Tool toggles
  TOGGLE_INSPECTOR = 'TOGGLE_INSPECTOR',
  TOGGLE_GRID = 'TOGGLE_GRID',
  PICK_COLOR = 'PICK_COLOR',
  MEASURE_DISTANCE = 'MEASURE_DISTANCE',

  // Element operations
  GET_ELEMENT_INFO = 'GET_ELEMENT_INFO',
  ELEMENT_SELECTED = 'ELEMENT_SELECTED',
  ELEMENT_HOVER = 'ELEMENT_HOVER',
  COPY_CSS = 'COPY_CSS',
  COPY_HTML = 'COPY_HTML',

  // Settings & storage
  GET_SETTINGS = 'GET_SETTINGS',
  SET_SETTINGS = 'SET_SETTINGS',

  // Tab operations
  GET_TAB_INFO = 'GET_TAB_INFO',
  TAB_CHANGED = 'TAB_CHANGED',
  INJECT_CONTENT_SCRIPT = 'INJECT_CONTENT_SCRIPT',

  // System
  PING = 'PING',
  COPY_TO_CLIPBOARD = 'COPY_TO_CLIPBOARD',
  CAPTURE_SCREENSHOT = 'CAPTURE_SCREENSHOT',
  UPDATE_BADGE = 'UPDATE_BADGE',

  // Command Palette
  OPEN_COMMAND_PALETTE = 'OPEN_COMMAND_PALETTE',
  CLOSE_COMMAND_PALETTE = 'CLOSE_COMMAND_PALETTE',
  EXECUTE_COMMAND = 'EXECUTE_COMMAND',

  // Storage Inspector
  GET_STORAGE_DATA = 'GET_STORAGE_DATA',
  SET_STORAGE_ITEM = 'SET_STORAGE_ITEM',
  DELETE_STORAGE_ITEM = 'DELETE_STORAGE_ITEM',
  CLEAR_STORAGE = 'CLEAR_STORAGE',

  // AI Suggestions
  RUN_AI_ANALYSIS = 'RUN_AI_ANALYSIS',
  GET_AI_SUGGESTIONS = 'GET_AI_SUGGESTIONS',
  APPLY_AI_FIX = 'APPLY_AI_FIX',

  // Component Tree
  GET_COMPONENT_TREE = 'GET_COMPONENT_TREE',
  SELECT_COMPONENT = 'SELECT_COMPONENT',
  HIGHLIGHT_COMPONENT = 'HIGHLIGHT_COMPONENT',

  // Performance
  START_PROFILING = 'START_PROFILING',
  STOP_PROFILING = 'STOP_PROFILING',
  GET_PERFORMANCE_DATA = 'GET_PERFORMANCE_DATA',

  // Focus Debugger
  GET_FOCUSABLE_ELEMENTS = 'GET_FOCUSABLE_ELEMENTS',
  TRACE_FOCUS = 'TRACE_FOCUS',

  // Form Debugger
  GET_FORM_DATA = 'GET_FORM_DATA',
  VALIDATE_FORM = 'VALIDATE_FORM',

  // Visual Regression
  CAPTURE_BASELINE = 'CAPTURE_BASELINE',
  COMPARE_SCREENSHOTS = 'COMPARE_SCREENSHOTS',
  GET_BASELINES = 'GET_BASELINES',
}

// ============================================
// Message Payload Interface
// ============================================

export interface MessagePayload {
  type: MessageType;
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
