/**
 * FrontendDevHelper - Content Script Types
 *
 * Types for content script state and handlers.
 */

// ============================================
// Content Script Handler Types
// ============================================

/** Content script state interface - Unified naming convention */
export interface ContentScriptState {
  inspector: unknown;
  measureTool: unknown;
  gridOverlay: unknown;
  // Unified is{ToolName}Active naming
  isInspectorActive: boolean;
  isColorPickerActive: boolean;
  isMeasureToolActive: boolean;
  isGridVisible: boolean;
  isScreenshotStudioActive: boolean;
  isDomOutlinerActive: boolean;
  isSpacingVisualizerActive: boolean;
  isFontInspectorActive: boolean;
  isPixelRulerActive: boolean;
  isBreakpointOverlayActive: boolean;
  isResponsivePreviewActive: boolean;
  isCssInspectorActive: boolean;
  isCssEditorActive: boolean;
  isContrastCheckerActive: boolean;
  isLayoutVisualizerActive: boolean;
  isZIndexVisualizerActive: boolean;
  isTechDetectorActive: boolean;
  isAccessibilityAuditActive: boolean;
  isNetworkAnalyzerActive: boolean;
  isSiteReportActive: boolean;
  isAnimationInspectorActive: boolean;
  isDesignSystemValidatorActive: boolean;
  isFlameGraphActive: boolean;
  isFocusDebuggerActive: boolean;
  isFormDebuggerActive: boolean;
  isCommandPaletteActive: boolean;
  isStorageInspectorActive: boolean;
  isComponentTreeActive: boolean;
  isVisualRegressionActive: boolean;
  isSmartSuggestionsActive: boolean;
  // Advanced tools
  isCssVariableInspectorActive: boolean;
  isSmartElementPickerActive: boolean;
  isSessionRecorderActive: boolean;
  isPerformanceBudgetActive: boolean;
  isFrameworkDevtoolsActive: boolean;
  // Beast Mode: Next-Gen Features
  isContainerQueryInspectorActive: boolean;
  isViewTransitionsDebuggerActive: boolean;
  isScrollAnimationsDebuggerActive: boolean;
}

/**
 * Content handler function type
 * @returns true if async (to keep message channel open), undefined/false if sync
 */
export type ContentHandler = (
  payload: Record<string, unknown> | undefined,
  state: ContentScriptState,
  sendResponse: (response: Record<string, unknown>) => void
  // biome-ignore lint/suspicious/noConfusingVoidType: void needed for sync handlers
) => boolean | undefined | void;

/** Handler registry type */
export type HandlerRegistry = Record<string, ContentHandler>;
