// ============================================
// FrontendDevHelper - TypeScript Types
// ============================================

/** Available tool types in the extension */
export enum ToolType {
  DOM_OUTLINER = 'domOutliner',
  SPACING_VISUALIZER = 'spacingVisualizer',
  FONT_INSPECTOR = 'fontInspector',
  COLOR_PICKER = 'colorPicker',
  PIXEL_RULER = 'pixelRuler',
  RESPONSIVE_BREAKPOINT = 'responsiveBreakpoint',
  CSS_INSPECTOR = 'cssInspector',
  CONTRAST_CHECKER = 'contrastChecker',
  LAYOUT_VISUALIZER = 'layoutVisualizer',
  ZINDEX_VISUALIZER = 'zIndexVisualizer',
  TECH_DETECTOR = 'techDetector',
}

/** Tool ID type - imported from constants to ensure consistency */
export type { ToolId } from '@/constants';

/** State of an individual tool */
export interface ToolState {
  /** Whether the tool is currently active */
  enabled: boolean;
  /** Tool-specific settings */
  settings?: Record<string, unknown>;
}

/** Map of all tool states */
export type ToolsState = Record<ToolId, ToolState>;

/** Tool metadata for display */
export interface ToolMeta {
  type: ToolType;
  name: string;
  description: string;
  icon: string;
  hasSettings: boolean;
  color: string;
}

// ============================================
// Message Types for Extension Communication
// ============================================

/** Base message interface */
export interface BaseMessage {
  type: string;
}

/** Message to toggle a tool on/off */
export interface ToggleToolMessage extends BaseMessage {
  type: 'TOGGLE_TOOL';
  tool: ToolType;
  enabled: boolean;
}

/** Message to get current state */
export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
}

/** Message with current state response */
export interface StateResponseMessage extends BaseMessage {
  type: 'STATE_RESPONSE';
  state: ToolsState;
}

/** Message to update tool settings */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  tool: ToolType;
  settings: Record<string, unknown>;
}

/** Message to open settings panel */
export interface OpenSettingsMessage extends BaseMessage {
  type: 'OPEN_SETTINGS';
  tool: ToolType;
}

/** Message to reset all tools */
export interface ResetToolsMessage extends BaseMessage {
  type: 'RESET_TOOLS';
}

/** Message to capture screenshot */
export interface CaptureScreenshotMessage extends BaseMessage {
  type: 'CAPTURE_SCREENSHOT';
}

/** Union type of all popup messages */
export type PopupMessage =
  | ToggleToolMessage
  | GetStateMessage
  | StateResponseMessage
  | UpdateSettingsMessage
  | OpenSettingsMessage
  | ResetToolsMessage
  | CaptureScreenshotMessage;

/** Message sent from content script */
export interface ContentScriptMessage extends BaseMessage {
  type: 'TOOL_STATE_CHANGED' | 'COLOR_PICKED' | 'MEASUREMENT_COMPLETE';
  data?: unknown;
}

/** Extension message type */
export interface ExtensionMessage {
  type: string;
  payload?: unknown;
}

/** Message response type */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Settings Types
// ============================================

/** DOM Outliner settings */
export interface DOMOutlinerSettings {
  showLabels: boolean;
  opacity: number;
  outlineWidth: number;
}

/** Spacing Visualizer settings */
export interface SpacingVisualizerSettings {
  showMargins: boolean;
  showPadding: boolean;
  showGaps: boolean;
  color: string;
}

/** Font Inspector settings */
export interface FontInspectorSettings {
  showComputed: boolean;
  showFallbacks: boolean;
  highlightIssues: boolean;
}

/** Color Picker settings */
export interface ColorPickerSettings {
  format: 'hex' | 'rgb' | 'hsl';
  showContrast: boolean;
  copyOnPick: boolean;
}

/** Pixel Ruler settings */
export interface PixelRulerSettings {
  showGuides: boolean;
  snapToElements: boolean;
  showCoordinates: boolean;
}

/** Responsive Breakpoint settings */
export interface ResponsiveBreakpointSettings {
  showOverlay: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  customBreakpoints: number[];
}

/** Element Inspector settings */
export interface ElementInspectorSettings {
  showTooltips: boolean;
  highlightStyles: boolean;
}

/** Union of all tool settings */
export type ToolSettings =
  | DOMOutlinerSettings
  | SpacingVisualizerSettings
  | FontInspectorSettings
  | ColorPickerSettings
  | PixelRulerSettings
  | ResponsiveBreakpointSettings
  | ElementInspectorSettings;

// ============================================
// Extension Settings
// ============================================

/** Feature toggles */
export interface FeatureToggles {
  domOutliner: boolean;
  spacingVisualizer: boolean;
  fontInspector: boolean;
  colorPicker: boolean;
  pixelRuler: boolean;
  breakpointOverlay: boolean;
  elementInspector: boolean;
  gridOverlay: boolean;
  measureTool: boolean;
}

/** Default feature toggles */
export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  domOutliner: true,
  spacingVisualizer: true,
  fontInspector: true,
  colorPicker: true,
  pixelRuler: true,
  breakpointOverlay: true,
  elementInspector: true,
  gridOverlay: true,
  measureTool: true,
};

/** Extension settings */
export interface ExtensionSettings {
  features: FeatureToggles;
  theme: 'light' | 'dark' | 'system';
  shortcuts: Record<string, string>;
  autoSave: boolean;
  autoOpenDevTools: boolean;
}

// ============================================
// Storage Types
// ============================================

/** Storage area type */
export type StorageArea = 'local' | 'session' | 'sync';

/** Storage item */
export interface StorageItem<T = unknown> {
  key: string;
  value: T;
  area: StorageArea;
  timestamp?: number;
}

/** Extension storage interface */
export interface ExtensionStorage {
  get<T>(key: string, area?: StorageArea): Promise<T | null>;
  set<T>(key: string, value: T, area?: StorageArea): Promise<void>;
  remove(key: string, area?: StorageArea): Promise<void>;
  clear(area?: StorageArea): Promise<void>;
}

// ============================================
// UI Types
// ============================================

/** UI Tab type */
export interface UITab {
  id: string;
  label: string;
  icon?: string;
}

/** Async state */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ============================================
// Element Types
// ============================================

/** Element info */
export interface ElementInfo {
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
  styles: Record<string, string>;
  text: string | null;
  children: number;
}

// ============================================
// Performance Types
// ============================================

/** Performance metrics */
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  resourceCount: number;
  totalTransferSize: number;
}

/** Memory info */
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// ============================================
// Context Menu Types
// ============================================

/** Context menu config */
export interface ContextMenuConfig {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  parentId?: string;
  onclick?: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void;
}
