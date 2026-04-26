/**
 * FrontendDevHelper - Tool Metadata
 *
 * Metadata, categories, default settings, and message types for all tools.
 */

import type {
  AnimationInspectorSettings,
  ColorPickerSettings,
  CSSInspectorSettings,
  DOMOutlinerSettings,
  FontInspectorSettings,
  LayoutVisualizerSettings,
  PixelRulerSettings,
  ResponsiveBreakpointSettings,
  SpacingVisualizerSettings,
  ToolSettings,
  ZIndexVisualizerSettings,
} from '@/types';

import { TOOL_IDS } from './tool-ids';
import type { ToolId } from './tool-ids';

// ============================================
// Tool Metadata
// ============================================

export interface ToolMetadata {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  category: 'inspection' | 'css' | 'responsive' | 'performance' | 'utility' | 'ai';
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

  // New "Best of the Best" Tools
  [TOOL_IDS.COMMAND_PALETTE]: {
    id: TOOL_IDS.COMMAND_PALETTE,
    name: 'Command Palette',
    description: 'Quick access to all tools via keyboard',
    icon: 'command',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: true,
    shortcut: 'Ctrl+Shift+P',
  },
  [TOOL_IDS.STORAGE_INSPECTOR]: {
    id: TOOL_IDS.STORAGE_INSPECTOR,
    name: 'Storage Inspector',
    description: 'Inspect LocalStorage, IndexedDB, Cookies, and Cache',
    icon: 'database',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.FOCUS_DEBUGGER]: {
    id: TOOL_IDS.FOCUS_DEBUGGER,
    name: 'Focus Debugger',
    description: 'Visualize focus order and detect focus traps',
    icon: 'crosshair',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.FORM_DEBUGGER]: {
    id: TOOL_IDS.FORM_DEBUGGER,
    name: 'Form Debugger',
    description: 'Debug form validation, autofill, and accessibility',
    icon: 'file-text',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.SMART_SUGGESTIONS]: {
    id: TOOL_IDS.SMART_SUGGESTIONS,
    name: 'Smart Suggestions',
    description: 'Intelligent analysis with 50+ detection patterns & auto-fixes',
    icon: 'sparkles',
    category: 'ai',
    hasSettings: true,
    defaultEnabled: true,
  },
  [TOOL_IDS.COMPONENT_TREE]: {
    id: TOOL_IDS.COMPONENT_TREE,
    name: 'Component Tree',
    description: 'Visualize React, Vue, Angular, Svelte component hierarchy',
    icon: 'git-branch',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.FLAME_GRAPH]: {
    id: TOOL_IDS.FLAME_GRAPH,
    name: 'Performance Flame Graph',
    description: 'Visualize JavaScript execution and performance bottlenecks',
    icon: 'activity',
    category: 'performance',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.VISUAL_REGRESSION]: {
    id: TOOL_IDS.VISUAL_REGRESSION,
    name: 'Visual Regression',
    description: 'Capture baselines and compare screenshots for visual testing',
    icon: 'eye',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
  },


  // Additional Tools (missing from TOOL_METADATA)
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: {
    id: TOOL_IDS.ACCESSIBILITY_AUDIT,
    name: 'Accessibility Audit',
    description: 'WCAG compliance checker with ARIA validation',
    icon: 'accessibility',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.SITE_REPORT]: {
    id: TOOL_IDS.SITE_REPORT,
    name: 'Site Report Generator',
    description: 'Comprehensive site analysis with scores & recommendations',
    icon: 'file-bar-chart',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.CSS_EDITOR]: {
    id: TOOL_IDS.CSS_EDITOR,
    name: 'Live CSS Editor',
    description: 'Edit CSS in real-time with live preview',
    icon: 'code',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.SCREENSHOT_STUDIO]: {
    id: TOOL_IDS.SCREENSHOT_STUDIO,
    name: 'Screenshot Studio',
    description: 'Capture and annotate screenshots',
    icon: 'camera',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.ANIMATION_INSPECTOR]: {
    id: TOOL_IDS.ANIMATION_INSPECTOR,
    name: 'Animation Inspector',
    description: 'Debug CSS animations and transitions',
    icon: 'play-circle',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.RESPONSIVE_PREVIEW]: {
    id: TOOL_IDS.RESPONSIVE_PREVIEW,
    name: 'Responsive Preview',
    description: 'Multi-device preview side-by-side',
    icon: 'smartphone',
    category: 'responsive',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: {
    id: TOOL_IDS.DESIGN_SYSTEM_VALIDATOR,
    name: 'Design System Validator',
    description: 'Check consistency with design tokens',
    icon: 'check-circle',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.GRID_OVERLAY]: {
    id: TOOL_IDS.GRID_OVERLAY,
    name: 'Grid Overlay',
    description: 'Visualize grid and box model',
    icon: 'grid',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.CSS_SCANNER]: {
    id: TOOL_IDS.CSS_SCANNER,
    name: 'CSS Scanner',
    description: 'Scan and analyze CSS issues',
    icon: 'scan',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },

  // Advanced Tools (newly added)
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: {
    id: TOOL_IDS.CSS_VARIABLE_INSPECTOR,
    name: 'CSS Variable Inspector',
    description: 'Detect, edit, and export CSS custom properties',
    icon: 'palette',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+V',
  },
  [TOOL_IDS.SMART_ELEMENT_PICKER]: {
    id: TOOL_IDS.SMART_ELEMENT_PICKER,
    name: 'Smart Element Picker',
    description: 'Unified inspection panel for CSS, spacing, fonts, and more',
    icon: 'mouse-pointer-click',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+I',
  },
  [TOOL_IDS.SESSION_RECORDER]: {
    id: TOOL_IDS.SESSION_RECORDER,
    name: 'Session Recorder',
    description: 'Record and replay debugging sessions',
    icon: 'video',
    category: 'utility',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.PERFORMANCE_BUDGET]: {
    id: TOOL_IDS.PERFORMANCE_BUDGET,
    name: 'Performance Budget',
    description: 'Set and monitor performance budgets with alerts',
    icon: 'gauge',
    category: 'performance',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: {
    id: TOOL_IDS.FRAMEWORK_DEVTOOLS,
    name: 'Framework DevTools',
    description: 'React, Vue, Angular, Svelte detection and debugging',
    icon: 'framework',
    category: 'inspection',
    hasSettings: true,
    defaultEnabled: false,
  },

  // Beast Mode: Next-Gen Features
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: {
    id: TOOL_IDS.CONTAINER_QUERY_INSPECTOR,
    name: 'Container Query Inspector',
    description: 'Visualize CSS container queries and @container rules',
    icon: 'containers',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
    shortcut: 'Alt+Q',
  },
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: {
    id: TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER,
    name: 'View Transitions Debugger',
    description: 'Debug the View Transitions API',
    icon: 'transition',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: {
    id: TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER,
    name: 'Scroll Animations Debugger',
    description: 'Debug scroll-driven and view-driven animations',
    icon: 'scroll',
    category: 'css',
    hasSettings: true,
    defaultEnabled: false,
  },
};

// ============================================
// Default Tool Settings
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
 * Default settings for CSS Inspector
 */
export const DEFAULT_CSS_INSPECTOR_SETTINGS: CSSInspectorSettings = {
  showInherited: false,
  defaultCategory: 'all',
  showComputedValues: true,
};

/**
 * Default settings for Layout Visualizer
 */
export const DEFAULT_LAYOUT_VISUALIZER_SETTINGS: LayoutVisualizerSettings = {
  flexColor: '#a855f7',
  gridColor: '#06b6d4',
  showGapValues: true,
  showItemNumbers: true,
};

/**
 * Default settings for Z-Index Visualizer
 */
export const DEFAULT_ZINDEX_VISUALIZER_SETTINGS: ZIndexVisualizerSettings = {
  defaultViewMode: 'list',
  overlayOpacity: 0.7,
  showStackingContext: true,
};

/**
 * Default settings for Animation Inspector
 */
export const DEFAULT_ANIMATION_INSPECTOR_SETTINGS: AnimationInspectorSettings = {
  defaultSpeed: 1,
  autoHighlight: true,
  showTimeline: true,
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
  [TOOL_IDS.CSS_INSPECTOR]: DEFAULT_CSS_INSPECTOR_SETTINGS,
  [TOOL_IDS.CONTRAST_CHECKER]: {},
  [TOOL_IDS.LAYOUT_VISUALIZER]: DEFAULT_LAYOUT_VISUALIZER_SETTINGS,
  [TOOL_IDS.ZINDEX_VISUALIZER]: DEFAULT_ZINDEX_VISUALIZER_SETTINGS,
  [TOOL_IDS.TECH_DETECTOR]: {},
  [TOOL_IDS.NETWORK_ANALYZER]: {},
  [TOOL_IDS.ELEMENT_INSPECTOR]: { showTooltips: true, highlightStyles: true },
  [TOOL_IDS.MEASUREMENT_TOOL]: {},
  // New "Best of the Best" Tools
  [TOOL_IDS.COMMAND_PALETTE]: {},
  [TOOL_IDS.STORAGE_INSPECTOR]: {},
  [TOOL_IDS.FOCUS_DEBUGGER]: {},
  [TOOL_IDS.FORM_DEBUGGER]: {},
  [TOOL_IDS.COMPONENT_TREE]: {},
  [TOOL_IDS.FLAME_GRAPH]: {},
  [TOOL_IDS.VISUAL_REGRESSION]: {},
  [TOOL_IDS.SMART_SUGGESTIONS]: {},
  // Additional Tools
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: {},
  [TOOL_IDS.SITE_REPORT]: {},
  [TOOL_IDS.CSS_EDITOR]: {},
  [TOOL_IDS.SCREENSHOT_STUDIO]: {},
  [TOOL_IDS.ANIMATION_INSPECTOR]: DEFAULT_ANIMATION_INSPECTOR_SETTINGS,
  [TOOL_IDS.RESPONSIVE_PREVIEW]: {},
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: {},
  [TOOL_IDS.GRID_OVERLAY]: {},
  [TOOL_IDS.CSS_SCANNER]: {},
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: {},
  [TOOL_IDS.SMART_ELEMENT_PICKER]: {},
  [TOOL_IDS.SESSION_RECORDER]: {},
  [TOOL_IDS.PERFORMANCE_BUDGET]: {},
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: {},
  // Beast Mode: Next-Gen Features
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: {},
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: {},
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: {},
};

// ============================================
// Message Types
// ============================================

/**
 * Message types for extension communication
 * This is the single source of truth for all message types in the extension.
 *
 * NOTE: Legacy MessageType enum in src/types/messages.ts is deprecated.
 * Use MESSAGE_TYPES from this file instead.
 */
export const MESSAGE_TYPES = {
  // Tool management
  TOGGLE_TOOL: 'TOGGLE_TOOL',
  GET_TOOL_STATE: 'GET_TOOL_STATE',
  SET_TOOL_STATE: 'SET_TOOL_STATE',
  GET_ALL_TOOL_STATES: 'GET_ALL_TOOL_STATES',
  /** Content asks background to disable all tools on the sender tab (sync storage). */
  DISABLE_ALL_ON_ACTIVE_TAB: 'DISABLE_ALL_ON_ACTIVE_TAB',
  /** DevTools → background → content: hint for inspected element (optional highlight). */
  FDH_INSPECTED_HINT: 'FDH_INSPECTED_HINT',

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

  // Legacy tool toggles (deprecated, use TOGGLE_TOOL with toolId instead)
  TOGGLE_INSPECTOR: 'TOGGLE_INSPECTOR',
  TOGGLE_GRID: 'TOGGLE_GRID',
  COPY_CSS: 'COPY_CSS',
  COPY_HTML: 'COPY_HTML',
  GET_ELEMENT_INFO: 'GET_ELEMENT_INFO',
  ELEMENT_SELECTED: 'ELEMENT_SELECTED',
  ELEMENT_HOVER: 'ELEMENT_HOVER',
  GET_TAB_INFO: 'GET_TAB_INFO',
  INJECT_CONTENT_SCRIPT: 'INJECT_CONTENT_SCRIPT',
  COPY_TO_CLIPBOARD: 'COPY_TO_CLIPBOARD',
  CAPTURE_SCREENSHOT: 'CAPTURE_SCREENSHOT',
  UPDATE_BADGE: 'UPDATE_BADGE',

  // Command Palette
  OPEN_COMMAND_PALETTE: 'OPEN_COMMAND_PALETTE',
  CLOSE_COMMAND_PALETTE: 'CLOSE_COMMAND_PALETTE',
  EXECUTE_COMMAND: 'EXECUTE_COMMAND',

  // Storage Inspector
  GET_STORAGE_DATA: 'GET_STORAGE_DATA',
  SET_STORAGE_ITEM: 'SET_STORAGE_ITEM',
  DELETE_STORAGE_ITEM: 'DELETE_STORAGE_ITEM',
  CLEAR_STORAGE: 'CLEAR_STORAGE',

  // Smart Suggestions
  RUN_SMART_ANALYSIS: 'RUN_SMART_ANALYSIS',
  GET_SMART_SUGGESTIONS: 'GET_SMART_SUGGESTIONS',
  APPLY_SMART_FIX: 'APPLY_SMART_FIX',

  // Component Tree
  GET_COMPONENT_TREE: 'GET_COMPONENT_TREE',
  SELECT_COMPONENT: 'SELECT_COMPONENT',
  HIGHLIGHT_COMPONENT: 'HIGHLIGHT_COMPONENT',

  // Performance
  START_PROFILING: 'START_PROFILING',
  STOP_PROFILING: 'STOP_PROFILING',
  GET_PERFORMANCE_DATA: 'GET_PERFORMANCE_DATA',

  // Focus Debugger
  GET_FOCUSABLE_ELEMENTS: 'GET_FOCUSABLE_ELEMENTS',
  TRACE_FOCUS: 'TRACE_FOCUS',

  // Form Debugger
  GET_FORM_DATA: 'GET_FORM_DATA',
  VALIDATE_FORM: 'VALIDATE_FORM',

  // Visual Regression
  CAPTURE_BASELINE: 'CAPTURE_BASELINE',
  COMPARE_SCREENSHOTS: 'COMPARE_SCREENSHOTS',
  GET_BASELINES: 'GET_BASELINES',

  // Content Script Tool Messages (legacy format compatibility)
  PESTICIDE_TOGGLE: 'PESTICIDE_TOGGLE',
  SPACING_TOGGLE: 'SPACING_TOGGLE',
  FONT_INSPECTOR_TOGGLE: 'FONT_INSPECTOR_TOGGLE',
  COLOR_PICKER_TOGGLE: 'COLOR_PICKER_TOGGLE',
  PIXEL_RULER_TOGGLE: 'PIXEL_RULER_TOGGLE',
  BREAKPOINT_OVERLAY_TOGGLE: 'BREAKPOINT_OVERLAY_TOGGLE',

  // Get all states
  GET_ALL_STATES: 'GET_ALL_STATES',

  // Batch operations
  DISABLE_ALL_TOOLS: 'DISABLE_ALL_TOOLS',
} as const;

/**
 * Type for message type values
 * @deprecated Use string literal types or typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES]
 */
export type MessageTypeValue = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
