/**
 * Content Script for FrontendDevHelper
 *
 * This script runs in the context of web pages and provides:
 * - DOM Outliner (Pesticide Reborn)
 * - Spacing Visualizer
 * - Font Inspector
 * - Color Picker
 * - Pixel Ruler
 * - Responsive Breakpoint Overlay
 * - Element inspection functionality
 * - Distance measurement
 * - Grid overlay
 */

import { logger } from '../utils/logger';
import { registry } from './handlers';
import type { GridOverlay } from './grid-overlay';
import type { Inspector } from './inspector';
import type { MeasureTool } from './measure-tool';

// ============================================
// State Management
// ============================================

interface ContentScriptState {
  inspector: Inspector | null;
  measureTool: MeasureTool | null;
  gridOverlay: GridOverlay | null;
  isInspectorActive: boolean;
  isColorPickerActive: boolean;
  isMeasureToolActive: boolean;
  isGridVisible: boolean;
  isScreenshotStudioActive: boolean;
  // Tool states
  domOutlinerEnabled: boolean;
  spacingVisualizerEnabled: boolean;
  fontInspectorEnabled: boolean;
  pixelRulerEnabled: boolean;
  breakpointOverlayEnabled: boolean;
  responsivePreviewEnabled: boolean;
  // Additional tool states for handler registry
  isCssInspectorActive: boolean;
  isCssEditorActive: boolean;
  isContrastCheckerActive: boolean;
  isLayoutVisualizerActive: boolean;
  isZIndexVisualizerActive: boolean;
  isTechDetectorActive: boolean;
  isAccessibilityAuditActive: boolean;
  isNetworkAnalyzerActive: boolean;
  isSiteReportActive: boolean;
  isScreenshotStudioHandlerActive: boolean;
  isAnimationInspectorActive: boolean;
  isResponsivePreviewActive: boolean;
  isDesignSystemValidatorActive: boolean;
  isFlameGraphActive: boolean;
  isFocusDebuggerActive: boolean;
  isFormDebuggerActive: boolean;
  isCommandPaletteActive: boolean;
  isStorageInspectorActive: boolean;
  isComponentTreeActive: boolean;
  isVisualRegressionActive: boolean;
  isAiSuggestionsActive: boolean;
}

const state: ContentScriptState = {
  inspector: null,
  measureTool: null,
  gridOverlay: null,
  isInspectorActive: false,
  isColorPickerActive: false,
  isMeasureToolActive: false,
  isGridVisible: false,
  isScreenshotStudioActive: false,
  domOutlinerEnabled: false,
  spacingVisualizerEnabled: false,
  fontInspectorEnabled: false,
  pixelRulerEnabled: false,
  breakpointOverlayEnabled: false,
  responsivePreviewEnabled: false,
  isCssInspectorActive: false,
  isCssEditorActive: false,
  isContrastCheckerActive: false,
  isLayoutVisualizerActive: false,
  isZIndexVisualizerActive: false,
  isTechDetectorActive: false,
  isAccessibilityAuditActive: false,
  isNetworkAnalyzerActive: false,
  isSiteReportActive: false,
  isScreenshotStudioHandlerActive: false,
  isAnimationInspectorActive: false,
  isResponsivePreviewActive: false,
  isDesignSystemValidatorActive: false,
  isFlameGraphActive: false,
  isFocusDebuggerActive: false,
  isFormDebuggerActive: false,
  isCommandPaletteActive: false,
  isStorageInspectorActive: false,
  isComponentTreeActive: false,
  isVisualRegressionActive: false,
  isAiSuggestionsActive: false,
};

// ============================================
// Message Handler
// ============================================

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: Record<string, unknown> }, _sender, sendResponse) => {
    logger.log('[Content] Received message:', message.type);

    const handler = registry[message.type];
    if (!handler) {
      logger.warn('[Content] Unhandled message type:', message.type);
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      return false;
    }

    try {
      const isAsync = handler(message.payload, state, sendResponse);
      return isAsync === true;
    } catch (error) {
      logger.error('[Content] Handler error for', message.type, error);
      sendResponse({ success: false, error: String(error) });
      return false;
    }
  }
);

// ============================================
// Initialization
// ============================================

logger.log('[Content] FrontendDevHelper content script initialized');
