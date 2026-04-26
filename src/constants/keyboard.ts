/**
 * FrontendDevHelper - Keyboard Shortcuts
 *
 * Keyboard shortcut definitions and helper functions.
 */

import { TOOL_METADATA } from './tool-metadata';
import type { ToolId } from './tool-ids';

// ============================================
// Keyboard Shortcuts
// ============================================

/**
 * Keyboard shortcuts configuration
 * Matches manifest.json command names
 */
export const KEYBOARD_SHORTCUTS = {
  // Tool toggles
  TOGGLE_DOM_OUTLINER: {
    key: 'Alt+P',
    command: 'toggle-pesticide',
    description: 'Toggle DOM Outliner',
  },
  TOGGLE_SPACING_VISUALIZER: {
    key: 'Alt+S',
    command: 'toggle-spacing',
    description: 'Toggle Spacing Visualizer',
  },
  TOGGLE_FONT_INSPECTOR: {
    key: 'Alt+F',
    command: 'toggle-font-inspector',
    description: 'Toggle Font Inspector',
  },
  TOGGLE_COLOR_PICKER: {
    key: 'Alt+C',
    command: 'toggle-color-picker',
    description: 'Toggle Color Picker',
  },
  TOGGLE_PIXEL_RULER: {
    key: 'Alt+M',
    command: 'toggle-pixel-ruler',
    description: 'Toggle Pixel Ruler',
  },
  TOGGLE_BREAKPOINT_OVERLAY: {
    key: 'Alt+B',
    command: 'toggle-breakpoint',
    description: 'Toggle Breakpoint Overlay',
  },

  // Global shortcuts
  OPEN_POPUP: {
    key: 'Ctrl+Shift+F',
    macKey: 'Command+Shift+F',
    command: '_execute_action',
    description: 'Open Extension Popup',
  },
  TOGGLE_INSPECTOR: {
    key: 'Ctrl+Shift+I',
    macKey: 'Command+Shift+I',
    command: 'toggle_inspector',
    description: 'Toggle Element Inspector',
  },

  // Context menu
  INSPECT_ELEMENT: {
    key: '',
    command: 'context_inspect_element',
    description: 'Inspect Element with FrontendDevHelper',
  },
  MEASURE_DISTANCE: {
    key: '',
    command: 'context_measure_distance',
    description: 'Measure Distance',
  },
  PICK_COLOR: {
    key: '',
    command: 'context_pick_color',
    description: 'Pick Color',
  },

  // New "Best of the Best" Shortcuts
  OPEN_COMMAND_PALETTE: {
    key: 'Ctrl+Shift+P',
    macKey: 'Command+Shift+P',
    command: 'open_command_palette',
    description: 'Open Command Palette',
  },
  TOGGLE_STORAGE_INSPECTOR: {
    key: '',
    command: 'toggle_storage_inspector',
    description: 'Toggle Storage Inspector',
  },
  TOGGLE_FOCUS_DEBUGGER: {
    key: '',
    command: 'toggle_focus_debugger',
    description: 'Toggle Focus Debugger',
  },
  TOGGLE_FORM_DEBUGGER: {
    key: '',
    command: 'toggle_form_debugger',
    description: 'Toggle Form Debugger',
  },
  TOGGLE_COMPONENT_TREE: {
    key: '',
    command: 'toggle_component_tree',
    description: 'Toggle Component Tree',
  },
  TOGGLE_FLAME_GRAPH: {
    key: '',
    command: 'toggle_flame_graph',
    description: 'Toggle Performance Flame Graph',
  },
  TOGGLE_VISUAL_REGRESSION: {
    key: '',
    command: 'toggle_visual_regression',
    description: 'Toggle Visual Regression',
  },
  TOGGLE_SMART_SUGGESTIONS: {
    key: '',
    command: 'toggle_smart_suggestions',
    description: 'Toggle Smart Suggestions',
  },
} as const;

/**
 * Get keyboard shortcut by command name
 */
export function getShortcutByCommand(
  command: string
): (typeof KEYBOARD_SHORTCUTS)[keyof typeof KEYBOARD_SHORTCUTS] | undefined {
  return Object.values(KEYBOARD_SHORTCUTS).find((shortcut) => shortcut.command === command);
}

/**
 * Get keyboard shortcut for a tool
 */
export function getToolShortcut(toolId: ToolId): string | undefined {
  const meta = TOOL_METADATA[toolId];
  return meta?.shortcut;
}
