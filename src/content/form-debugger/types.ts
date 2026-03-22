/**
 * Form Debugger Types
 *
 * Type definitions for the form debugger module.
 */

import type { FormDebuggerState, FormField, FormInfo } from '@/types';

// Re-export types from main types file
export type { FormDebuggerState, FormField, FormInfo };

/** Tab types for the debugger panel */
export type TabType = 'overview' | 'fields' | 'validation' | 'accessibility';

/** Label information for a form field */
export interface LabelInfo {
  hasLabel: boolean;
  text?: string;
}

/** Overlay highlight types */
export type OverlayType = 'error' | 'warning' | 'info';

/** Event listener handle for cleanup */
export interface EventListeners {
  input: (event: Event) => void;
  change: (event: Event) => void;
  invalid: (event: Event) => void;
  submit: (event: SubmitEvent) => void;
}
