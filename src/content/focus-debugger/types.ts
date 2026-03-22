/**
 * Focus Debugger Types
 *
 * Type definitions for the focus debugger module.
 */

import type { FocusableElement, FocusHistoryEntry } from '@/types';

export interface FocusDebuggerState {
  enabled: boolean;
  showOverlay: boolean;
  focusableElements: FocusableElement[];
  focusHistory: FocusHistoryEntry[];
  trapDetected: boolean;
  trapElements: HTMLElement[];
}

export interface FocusTrackerState {
  isEnabled: boolean;
  focusableElements: FocusableElement[];
  focusHistory: FocusHistoryEntry[];
  currentFocusedElement: HTMLElement | null;
  trapElements: HTMLElement[];
  lastKeyboardFocusTime: number;
}

export interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

export type CurrentTab = 'elements' | 'history' | 'issues';

export type FocusTrigger = 'keyboard' | 'mouse' | 'script';

export interface PanelElements {
  panelContainer: HTMLElement | null;
  shadowRoot: ShadowRoot | null;
  overlaysContainer: HTMLElement | null;
}
