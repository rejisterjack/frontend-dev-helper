/**
 * FrontendDevHelper - Tool IDs
 *
 * Unique identifiers for all extension tools.
 */

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
  GRID_OVERLAY: 'gridOverlay',
  CSS_SCANNER: 'cssScanner',

  // New "Best of the Best" Tools
  COMMAND_PALETTE: 'commandPalette',
  STORAGE_INSPECTOR: 'storageInspector',
  FOCUS_DEBUGGER: 'focusDebugger',
  FORM_DEBUGGER: 'formDebugger',
  COMPONENT_TREE: 'componentTree',
  FLAME_GRAPH: 'flameGraph',
  VISUAL_REGRESSION: 'visualRegression',
  SMART_SUGGESTIONS: 'smartSuggestions',

  // Additional Tools (missing from TOOL_IDS)
  ACCESSIBILITY_AUDIT: 'accessibilityAudit',
  SITE_REPORT: 'siteReport',
  CSS_EDITOR: 'cssEditor',
  SCREENSHOT_STUDIO: 'screenshotStudio',
  ANIMATION_INSPECTOR: 'animationInspector',
  RESPONSIVE_PREVIEW: 'responsivePreview',
  DESIGN_SYSTEM_VALIDATOR: 'designSystemValidator',

  // Advanced Tools (implemented but not registered)
  CSS_VARIABLE_INSPECTOR: 'cssVariableInspector',
  SMART_ELEMENT_PICKER: 'smartElementPicker',
  SESSION_RECORDER: 'sessionRecorder',
  PERFORMANCE_BUDGET: 'performanceBudget',
  FRAMEWORK_DEVTOOLS: 'frameworkDevtools',

  // Beast Mode: Next-Gen Features
  CONTAINER_QUERY_INSPECTOR: 'containerQueryInspector',
  VIEW_TRANSITIONS_DEBUGGER: 'viewTransitionsDebugger',
  SCROLL_ANIMATIONS_DEBUGGER: 'scrollAnimationsDebugger',
} as const;

/**
 * Type for tool IDs derived from TOOL_IDS constant
 */
export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];
