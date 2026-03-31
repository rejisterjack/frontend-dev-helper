/**
 * FrontendDevHelper - Tool Types (Unified)
 *
 * This file provides a unified type system for tools.
 * The single source of truth is TOOL_IDS in src/constants/index.ts.
 */

import type { TOOL_IDS, ToolMetadata } from '@/constants';

// ============================================
// Tool ID Type (Unified with constants)
// ============================================

/**
 * Tool ID type - derived from TOOL_IDS constant
 * This is the canonical type for tool identifiers throughout the extension.
 */
export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];

/**
 * @deprecated Use ToolId instead. ToolType enum is being phased out.
 * This type alias maintains backward compatibility during migration.
 */
export type ToolType = ToolId;

// ============================================
// Tool State Types
// ============================================

/** State of an individual tool */
export interface ToolState {
  /** Whether the tool is currently active */
  enabled: boolean;
  /** Tool-specific settings */
  settings?: Record<string, unknown>;
}

/** Map of all tool states - strongly typed */
export type ToolsState = Record<ToolId, ToolState>;

/** Tool metadata for display in popup */
export interface ToolMeta extends ToolMetadata {
  /** Display color for the tool */
  color: string;
}

// ============================================
// Tool Category Types
// ============================================

/** Tool category for grouping */
export type ToolCategory =
  | 'inspection'
  | 'css'
  | 'responsive'
  | 'performance'
  | 'accessibility'
  | 'ai'
  | 'utility';

/** Category metadata for UI display */
export interface ToolCategoryMeta {
  id: ToolCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}

/** Tool with category information */
export interface CategorizedTool extends Omit<ToolMeta, 'category'> {
  category: ToolCategory;
}

// ============================================
// Tool Message Types
// ============================================

/** Tool toggle message payload */
export interface ToggleToolPayload {
  toolId: ToolId;
  enabled: boolean;
  tabId?: number;
}

/** Tool state change event */
export interface ToolStateChangeEvent {
  toolId: ToolId;
  enabled: boolean;
  timestamp: number;
}

// ============================================
// Tool Settings Types
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

/** Smart Suggestions settings */
export interface SmartSuggestionsSettings {
  enabled: boolean;
  autoAnalyze: boolean;
  categories: {
    accessibility: boolean;
    performance: boolean;
    seo: boolean;
    bestPractice: boolean;
    security: boolean;
  };
}

/** CSS Inspector settings */
export interface CSSInspectorSettings {
  showInherited: boolean;
  defaultCategory: 'all' | 'layout' | 'typography' | 'colors' | 'effects';
  showComputedValues: boolean;
}

/** Layout Visualizer settings */
export interface LayoutVisualizerSettings {
  flexColor: string;
  gridColor: string;
  showGapValues: boolean;
  showItemNumbers: boolean;
}

/** Z-Index Visualizer settings */
export interface ZIndexVisualizerSettings {
  defaultViewMode: 'list' | '3d';
  overlayOpacity: number;
  showStackingContext: boolean;
}

/** Animation Inspector settings */
export interface AnimationInspectorSettings {
  defaultSpeed: 0.25 | 0.5 | 1 | 2;
  autoHighlight: boolean;
  showTimeline: boolean;
}

/** Union of all tool settings */
export type ToolSettings =
  | DOMOutlinerSettings
  | SpacingVisualizerSettings
  | FontInspectorSettings
  | ColorPickerSettings
  | PixelRulerSettings
  | ResponsiveBreakpointSettings
  | ElementInspectorSettings
  | AISuggestionsSettings
  | CSSInspectorSettings
  | LayoutVisualizerSettings
  | ZIndexVisualizerSettings
  | AnimationInspectorSettings
  | Record<string, unknown>;

// ============================================
// Tool Registry Types
// ============================================

/** Tool handler function type */
export type ToolHandler = (
  enabled: boolean,
  settings?: Record<string, unknown>
) => void | Promise<void>;

/** Tool registration entry */
export interface ToolRegistration {
  id: ToolId;
  meta: ToolMeta;
  handler: ToolHandler;
  cleanup?: () => void;
}

/** Tool registry map */
export type ToolRegistry = Map<ToolId, ToolRegistration>;
