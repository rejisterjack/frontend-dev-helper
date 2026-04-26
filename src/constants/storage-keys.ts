/**
 * FrontendDevHelper - Storage Keys & Default Settings
 *
 * Storage keys used throughout the extension and top-level default settings.
 */

import { TOOL_METADATA } from './tool-metadata';
import { DEFAULT_TOOL_SETTINGS } from './tool-metadata';
import type { ToolId } from './tool-ids';

// ============================================
// Storage Keys
// ============================================

/**
 * Storage keys used throughout the extension
 */
export const STORAGE_KEYS = {
  // Main storage
  SETTINGS: 'fdh_settings',
  TOOL_STATES: 'fdh_tool_states',
  TAB_STATES: 'fdh_tab_states',
  /** Popup / UX preferences (advanced tool list, optional diagnostics). */
  UI_PREFS: 'fdh_ui_prefs',
  /** User-defined tool bundles (save/apply from popup). */
  USER_TOOL_PRESETS: 'fdh_user_tool_presets',

  // Tool-specific
  DOM_OUTLINER_STATE: 'fdh_dom_outliner',
  SPACING_VISUALIZER_STATE: 'fdh_spacing_visualizer',
  COLOR_PICKER_HISTORY: 'fdh_color_history',

  // Session
  SESSION_DATA: 'fdh_session',
  LAST_ACTIVE_TAB: 'fdh_last_active_tab',

  // Version for migrations
  STORAGE_VERSION: 'fdh_storage_version',
} as const;

// ============================================
// Default Settings
// ============================================

/**
 * Default extension settings
 */
export const DEFAULT_SETTINGS = {
  version: '1.2.0',
  theme: 'dark' as const,
  enabled: true,
  autoOpenDevTools: false,
  experimentalFeatures: false,
  lastActiveTab: 'inspector',
  shortcuts: {
    toggleInspector: 'Ctrl+Shift+I',
    openPopup: 'Ctrl+Shift+F',
    takeScreenshot: 'Ctrl+Shift+S',
    openCommandPalette: 'Ctrl+Shift+P',
  },
  tools: Object.fromEntries(
    Object.entries(TOOL_METADATA).map(([id, meta]) => [
      id,
      {
        enabled: meta.defaultEnabled,
        settings: DEFAULT_TOOL_SETTINGS[id as ToolId] || {},
      },
    ])
  ),
  // New feature settings
  ai: {
    enabled: true,
    autoAnalyze: false,
    categories: {
      accessibility: true,
      performance: true,
      seo: true,
      bestPractice: true,
      security: true,
    },
  },
  visualRegression: {
    threshold: 0.1,
    ignoreDynamicContent: true,
    ignoreRegions: [],
  },
  storageInspector: {
    autoRefresh: true,
    refreshInterval: 5000,
  },
};
