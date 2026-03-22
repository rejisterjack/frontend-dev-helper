/**
 * Focus Debugger Constants
 *
 * Constants and configuration for the focus debugger module.
 */

export const PREFIX = 'fdh-focus-debugger';
export const REFRESH_INTERVAL = 2000;
export const FOCUS_HISTORY_LIMIT = 50;

// Selectors for focusable elements
export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'details',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'embed',
  'object',
].join(', ');
