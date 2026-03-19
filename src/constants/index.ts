/**
 * FrontendDevHelper - Constants
 *
 * Central location for all application constants, tool IDs,
 * color mappings, breakpoints, and keyboard shortcuts.
 */

import type {
  ColorPickerSettings,
  DOMOutlinerSettings,
  FontInspectorSettings,
  PixelRulerSettings,
  ResponsiveBreakpointSettings,
  SpacingVisualizerSettings,
  ToolSettings,
} from '@/types';

// ============================================
// Tool IDs
// ============================================

/**
 * Unique identifiers for all extension tools
 */
export const TOOL_IDS = {
  // Core Inspection Tools (11 implemented tools)
  DOM_OUTLINER: 'domOutliner',
  SPACING_VISUALIZER: 'spacingVisualizer',
  FONT_INSPECTOR: 'fontInspector',
  COLOR_PICKER: 'colorPicker',
  PIXEL_RULER: 'pixelRuler',
  RESPONSIVE_BREAKPOINT: 'responsiveBreakpoint',
  CSS_INSPECTOR: 'cssInspector',
  CONTRAST_CHECKER: 'contrastChecker',
  LAYOUT_VISUALIZER: 'layoutVisualizer',
  ZINDEX_VISUALIZER: 'zIndexVisualizer',
  TECH_DETECTOR: 'techDetector',

  // Performance Tools
  NETWORK_ANALYZER: 'networkAnalyzer',

  // Additional Tools (internal/helpers)
  ELEMENT_INSPECTOR: 'elementInspector',
  MEASUREMENT_TOOL: 'measurementTool',
} as const;

/**
 * Type for tool IDs derived from TOOL_IDS constant
 */
export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];

// ============================================
// Tool Metadata
// ============================================

export interface ToolMetadata {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  category: 'inspection' | 'css' | 'responsive' | 'performance' | 'utility';
  hasSettings: boolean;
  defaultEnabled: boolean;
  shortcut?: string;
}

/**
 * Metadata for all tools
 */
export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  // Core 11 implemented tools
  [TOOL_IDS.DOM_OUTLINER]: {
    id: TOOL_IDS.DOM_OUTLINER,
    name: 'DOM Outliner',
    description: 'Visualize DOM structure with colored outlines',
    icon: 'box-select',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+P',
  },
  [TOOL_IDS.SPACING_VISUALIZER]: {
    id: TOOL_IDS.SPACING_VISUALIZER,
    name: 'Spacing Visualizer',
    description: 'Visualize margins, padding, and gaps',
    icon: 'move',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+S',
  },
  [TOOL_IDS.FONT_INSPECTOR]: {
    id: TOOL_IDS.FONT_INSPECTOR,
    name: 'Font Inspector',
    description: 'Inspect font properties and detect issues',
    icon: 'type',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+F',
  },
  [TOOL_IDS.COLOR_PICKER]: {
    id: TOOL_IDS.COLOR_PICKER,
    name: 'Color Picker',
    description: 'Pick colors from any element',
    icon: 'pipette',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+C',
  },
  [TOOL_IDS.PIXEL_RULER]: {
    id: TOOL_IDS.PIXEL_RULER,
    name: 'Pixel Ruler',
    description: 'Measure distances in pixels',
    icon: 'ruler',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+M',
  },
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: {
    id: TOOL_IDS.RESPONSIVE_BREAKPOINT,
    name: 'Breakpoint Overlay',
    description: 'Show responsive breakpoint indicators',
    icon: 'monitor',
    category: 'responsive',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+B',
  },
  [TOOL_IDS.CSS_INSPECTOR]: {
    id: TOOL_IDS.CSS_INSPECTOR,
    name: 'CSS Inspector',
    description: 'View all computed CSS properties by category',
    icon: 'scan',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.CONTRAST_CHECKER]: {
    id: TOOL_IDS.CONTRAST_CHECKER,
    name: 'Contrast Checker',
    description: 'Check WCAG AA/AAA color contrast compliance',
    icon: 'eye',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.LAYOUT_VISUALIZER]: {
    id: TOOL_IDS.LAYOUT_VISUALIZER,
    name: 'Flex/Grid Visualizer',
    description: 'Visualize flexbox and grid layouts',
    icon: 'grid',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.ZINDEX_VISUALIZER]: {
    id: TOOL_IDS.ZINDEX_VISUALIZER,
    name: 'Z-Index Visualizer',
    description: 'See stacking order and z-index hierarchy',
    icon: 'layers',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.TECH_DETECTOR]: {
    id: TOOL_IDS.TECH_DETECTOR,
    name: 'Tech Detector',
    description: 'Detect frameworks, libraries, and tools',
    icon: 'search',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.NETWORK_ANALYZER]: {
    id: TOOL_IDS.NETWORK_ANALYZER,
    name: 'Network Analyzer',
    description: 'Monitor network requests and analyze performance',
    icon: 'activity',
    category: 'performance',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+N',
  },
  // Helper/internal tools
  [TOOL_IDS.ELEMENT_INSPECTOR]: {
    id: TOOL_IDS.ELEMENT_INSPECTOR,
    name: 'Element Inspector',
    description: 'Hover to inspect elements',
    icon: 'mouse-pointer',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Ctrl+Shift+I',
  },
  [TOOL_IDS.MEASUREMENT_TOOL]: {
    id: TOOL_IDS.MEASUREMENT_TOOL,
    name: 'Measurement Tool',
    description: 'Measure element dimensions',
    icon: 'maximize',
    category: 'utility',
    hasSettings: false,
    defaultEnabled: false,
  },
};

// ============================================
// Color Map for Pesticide-like DOM Outlining
// ============================================

/**
 * Color map for DOM outliner (Pesticide-inspired)
 * Each level gets a distinct color for easy visual hierarchy
 */
export const COLOR_MAP = {
  // Level colors (depth-based)
  levels: [
    { bg: 'rgba(255, 0, 0, 0.15)', border: '#ff0000' }, // Level 0: Red
    { bg: 'rgba(0, 255, 0, 0.15)', border: '#00ff00' }, // Level 1: Green
    { bg: 'rgba(0, 0, 255, 0.15)', border: '#0000ff' }, // Level 2: Blue
    { bg: 'rgba(255, 255, 0, 0.15)', border: '#ffff00' }, // Level 3: Yellow
    { bg: 'rgba(255, 0, 255, 0.15)', border: '#ff00ff' }, // Level 4: Magenta
    { bg: 'rgba(0, 255, 255, 0.15)', border: '#00ffff' }, // Level 5: Cyan
    { bg: 'rgba(255, 128, 0, 0.15)', border: '#ff8000' }, // Level 6: Orange
    { bg: 'rgba(128, 0, 255, 0.15)', border: '#8000ff' }, // Level 7: Purple
    { bg: 'rgba(0, 255, 128, 0.15)', border: '#00ff80' }, // Level 8: Spring Green
    { bg: 'rgba(255, 0, 128, 0.15)', border: '#ff0080' }, // Level 9: Rose
  ],

  // Semantic colors
  semantic: {
    div: { bg: 'rgba(255, 0, 0, 0.1)', border: '#ff0000' },
    span: { bg: 'rgba(0, 255, 0, 0.1)', border: '#00ff00' },
    p: { bg: 'rgba(0, 0, 255, 0.1)', border: '#0000ff' },
    a: { bg: 'rgba(255, 255, 0, 0.1)', border: '#ffff00' },
    img: { bg: 'rgba(255, 0, 255, 0.2)', border: '#ff00ff' },
    button: { bg: 'rgba(0, 255, 255, 0.15)', border: '#00ffff' },
    input: { bg: 'rgba(255, 128, 0, 0.15)', border: '#ff8000' },
    form: { bg: 'rgba(128, 0, 255, 0.1)', border: '#8000ff' },
    header: { bg: 'rgba(255, 100, 100, 0.1)', border: '#ff6464' },
    footer: { bg: 'rgba(100, 255, 100, 0.1)', border: '#64ff64' },
    nav: { bg: 'rgba(100, 100, 255, 0.1)', border: '#6464ff' },
    section: { bg: 'rgba(255, 200, 0, 0.1)', border: '#ffc800' },
    article: { bg: 'rgba(255, 100, 200, 0.1)', border: '#ff64c8' },
    aside: { bg: 'rgba(100, 255, 200, 0.1)', border: '#64ffc8' },
    main: { bg: 'rgba(200, 100, 255, 0.1)', border: '#c864ff' },
  },

  // Spacing visualizer colors
  spacing: {
    margin: 'rgba(255, 165, 0, 0.3)', // Orange
    padding: 'rgba(0, 128, 0, 0.3)', // Green
    gap: 'rgba(0, 0, 255, 0.3)', // Blue
    border: 'rgba(255, 0, 0, 0.5)', // Red
  },
} as const;

// ============================================
// Breakpoints
// ============================================

/**
 * Tailwind CSS breakpoints
 */
export const TAILWIND_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Bootstrap breakpoints
 */
export const BOOTSTRAP_BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
} as const;

/**
 * Material Design breakpoints
 */
export const MATERIAL_BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Common device breakpoints
 */
export const DEVICE_BREAKPOINTS = {
  mobile: { min: 0, max: 767, name: 'Mobile' },
  tablet: { min: 768, max: 1023, name: 'Tablet' },
  desktop: { min: 1024, max: 1439, name: 'Desktop' },
  wide: { min: 1440, max: Infinity, name: 'Wide Desktop' },
} as const;

/**
 * Combined breakpoints for responsive design
 */
export const BREAKPOINTS = {
  tailwind: TAILWIND_BREAKPOINTS,
  bootstrap: BOOTSTRAP_BREAKPOINTS,
  material: MATERIAL_BREAKPOINTS,
  devices: DEVICE_BREAKPOINTS,
} as const;

/**
 * Get all breakpoint values as an array for overlay display
 */
export const ALL_BREAKPOINTS = [
  { name: 'xs', width: 0, label: 'Extra Small' },
  { name: 'sm', width: 640, label: 'Small (Tailwind)' },
  { name: 'sm-bs', width: 576, label: 'Small (Bootstrap)' },
  { name: 'md', width: 768, label: 'Medium' },
  { name: 'lg', width: 992, label: 'Large (Bootstrap)' },
  { name: 'lg-tw', width: 1024, label: 'Large (Tailwind)' },
  { name: 'xl', width: 1200, label: 'Extra Large (Bootstrap)' },
  { name: 'xl-tw', width: 1280, label: 'Extra Large (Tailwind)' },
  { name: 'xxl', width: 1400, label: '2XL (Bootstrap)' },
  { name: '2xl', width: 1536, label: '2XL (Tailwind)' },
];

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

// ============================================
// Default Settings
// ============================================

/**
 * Default settings for DOM Outliner
 */
export const DEFAULT_DOM_OUTLINER_SETTINGS: DOMOutlinerSettings = {
  showLabels: true,
  opacity: 0.15,
  outlineWidth: 2,
};

/**
 * Default settings for Spacing Visualizer
 */
export const DEFAULT_SPACING_VISUALIZER_SETTINGS: SpacingVisualizerSettings = {
  showMargins: true,
  showPadding: true,
  showGaps: true,
  color: '#ff9500',
};

/**
 * Default settings for Font Inspector
 */
export const DEFAULT_FONT_INSPECTOR_SETTINGS: FontInspectorSettings = {
  showComputed: true,
  showFallbacks: false,
  highlightIssues: true,
};

/**
 * Default settings for Color Picker
 */
export const DEFAULT_COLOR_PICKER_SETTINGS: ColorPickerSettings = {
  format: 'hex',
  showContrast: true,
  copyOnPick: true,
};

/**
 * Default settings for Pixel Ruler
 */
export const DEFAULT_PIXEL_RULER_SETTINGS: PixelRulerSettings = {
  showGuides: true,
  snapToElements: true,
  showCoordinates: true,
};

/**
 * Default settings for Responsive Breakpoint
 */
export const DEFAULT_RESPONSIVE_BREAKPOINT_SETTINGS: ResponsiveBreakpointSettings = {
  showOverlay: true,
  position: 'bottom-right',
  customBreakpoints: [],
};

/**
 * Default settings for all tools
 */
export const DEFAULT_TOOL_SETTINGS: Record<ToolId, ToolSettings | Record<string, never>> = {
  [TOOL_IDS.DOM_OUTLINER]: DEFAULT_DOM_OUTLINER_SETTINGS,
  [TOOL_IDS.SPACING_VISUALIZER]: DEFAULT_SPACING_VISUALIZER_SETTINGS,
  [TOOL_IDS.FONT_INSPECTOR]: DEFAULT_FONT_INSPECTOR_SETTINGS,
  [TOOL_IDS.COLOR_PICKER]: DEFAULT_COLOR_PICKER_SETTINGS,
  [TOOL_IDS.PIXEL_RULER]: DEFAULT_PIXEL_RULER_SETTINGS,
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: DEFAULT_RESPONSIVE_BREAKPOINT_SETTINGS,
  [TOOL_IDS.CSS_INSPECTOR]: {},
  [TOOL_IDS.CONTRAST_CHECKER]: {},
  [TOOL_IDS.LAYOUT_VISUALIZER]: {},
  [TOOL_IDS.ZINDEX_VISUALIZER]: {},
  [TOOL_IDS.TECH_DETECTOR]: {},
  [TOOL_IDS.NETWORK_ANALYZER]: {},
  [TOOL_IDS.ELEMENT_INSPECTOR]: { showTooltips: true, highlightStyles: true },
  [TOOL_IDS.MEASUREMENT_TOOL]: {},
};

/**
 * Default extension settings
 */
export const DEFAULT_SETTINGS = {
  version: '1.0.0',
  theme: 'dark' as const,
  enabled: true,
  autoOpenDevTools: false,
  experimentalFeatures: false,
  lastActiveTab: 'inspector',
  shortcuts: {
    toggleInspector: 'Ctrl+Shift+I',
    openPopup: 'Ctrl+Shift+F',
    takeScreenshot: 'Ctrl+Shift+S',
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
};

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
// Message Types
// ============================================

/**
 * Message types for extension communication
 */
export const MESSAGE_TYPES = {
  // Tool management
  TOGGLE_TOOL: 'TOGGLE_TOOL',
  GET_TOOL_STATE: 'GET_TOOL_STATE',
  SET_TOOL_STATE: 'SET_TOOL_STATE',
  GET_ALL_TOOL_STATES: 'GET_ALL_TOOL_STATES',

  // Tab management
  TAB_CHANGED: 'TAB_CHANGED',
  URL_CHANGED: 'URL_CHANGED',
  INIT: 'INIT',

  // Feature toggles
  TOGGLE_FEATURE: 'TOGGLE_FEATURE',
  GET_FEATURES: 'GET_FEATURES',

  // Settings
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',

  // Ping/Connectivity
  PING: 'PING',
  PONG: 'PONG',

  // Context menu
  CONTEXT_MENU_CLICKED: 'CONTEXT_MENU_CLICKED',
  INSPECT_ELEMENT: 'INSPECT_ELEMENT',
  MEASURE_DISTANCE: 'MEASURE_DISTANCE',
  PICK_COLOR: 'PICK_COLOR',

  // Tool-specific
  COLOR_PICKED: 'COLOR_PICKED',
  MEASUREMENT_COMPLETE: 'MEASUREMENT_COMPLETE',
  TOOL_STATE_CHANGED: 'TOOL_STATE_CHANGED',
} as const;

// ============================================
// UI Constants
// ============================================

/**
 * Z-index values for extension overlays
 */
export const Z_INDEX = {
  base: 2147483600,
  tooltip: 2147483601,
  overlay: 2147483602,
  modal: 2147483603,
  notification: 2147483604,
} as const;

/**
 * Animation durations
 */
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Debounce delays
 */
export const DEBOUNCE = {
  fast: 50,
  normal: 150,
  slow: 300,
  resize: 100,
  scroll: 16, // ~60fps
} as const;

// ============================================
// Error Messages
// ============================================

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  STORAGE_GET_FAILED: 'Failed to retrieve data from storage',
  STORAGE_SET_FAILED: 'Failed to save data to storage',
  STORAGE_CLEAR_FAILED: 'Failed to clear storage',
  TAB_NOT_FOUND: 'Tab not found',
  MESSAGE_SEND_FAILED: 'Failed to send message',
  TOOL_NOT_FOUND: 'Tool not found',
  INVALID_STATE: 'Invalid tool state',
} as const;
