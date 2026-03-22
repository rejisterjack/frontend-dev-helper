/**
 * Content Script Handler Registry
 *
 * Central registry for all content script message handlers.
 * Each handler receives (payload, state, sendResponse) and returns
 * true if the response is async, false/void otherwise.
 */

import type { ContentHandler, ContentScriptState } from '@/types';
import { logger } from '@/utils/logger';

// Import tool modules
import { pesticide } from '../pesticide';
import { spacingVisualizer } from '../spacing';
import { fontInspector } from '../font-inspector';
import { colorPicker } from '../color-picker';
import { pixelRuler } from '../pixel-ruler';
import { breakpointOverlay } from '../breakpoint-overlay';
import { responsivePreview } from '../responsive-preview';
import { flameGraph } from '../flame-graph';
import { cssInspector } from '../css-inspector';
import { cssEditor } from '../css-editor';
import * as screenshotStudio from '../screenshot-studio';
import { animationInspector } from '../animation-inspector';
import designSystemValidator from '../design-system-validator';
import { contrastChecker } from '../contrast-checker';
import { layoutVisualizer } from '../layout-visualizer';
import { zIndexVisualizer } from '../zindex-visualizer';
import { techDetector } from '../tech-detector';
import { accessibilityAudit } from '../accessibility-audit';
import { networkAnalyzer } from '../network-analyzer';
import { siteReportGenerator } from '../site-report-generator';
import { focusDebugger } from '../focus-debugger';
import { formDebugger } from '../form-debugger';
import { commandPalette } from '../command-palette';
import { storageInspector } from '../storage-inspector';
import { componentTree } from '../component-tree';
import { visualRegression } from '../visual-regression';
import { aiSuggestions } from '../ai-suggestions';

/** Helper to create standard tool handlers */
function createToolHandlers(
  toolName: string,
  tool: {
    enable: () => void;
    disable: () => void;
    toggle: () => void;
    getState: () => { enabled: boolean };
  },
  stateKey: keyof ContentScriptState
): Record<string, ContentHandler> {
  return {
    [`${toolName}_ENABLE`]: (_payload, state, sendResponse) => {
      tool.enable();
      (state as Record<string, boolean>)[stateKey] = true;
      sendResponse({ success: true, active: true });
    },
    [`${toolName}_DISABLE`]: (_payload, state, sendResponse) => {
      tool.disable();
      (state as Record<string, boolean>)[stateKey] = false;
      sendResponse({ success: true, active: false });
    },
    [`${toolName}_TOGGLE`]: (_payload, state, sendResponse) => {
      tool.toggle();
      const newState = tool.getState();
      (state as Record<string, boolean>)[stateKey] = newState.enabled;
      sendResponse({ success: true, active: newState.enabled });
    },
    [`${toolName}_GET_STATE`]: (_payload, _state, sendResponse) => {
      sendResponse({ success: true, state: tool.getState() });
    },
  };
}

/** Handler registry */
export const registry: Record<string, ContentHandler> = {
  // Pesticide (DOM Outliner)
  ...createToolHandlers('PESTICIDE', pesticide, 'domOutlinerEnabled'),
  PESTICIDE_SET_TAG_VISIBILITY: (payload, _state, sendResponse) => {
    if (payload?.tag !== undefined && payload?.visible !== undefined) {
      pesticide.toggleTag(String(payload.tag), Boolean(payload.visible));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing tag or visible parameter' });
    }
  },

  // Spacing Visualizer
  ...createToolHandlers('SPACING', spacingVisualizer, 'spacingVisualizerEnabled'),

  // Font Inspector
  ...createToolHandlers('FONT_INSPECTOR', fontInspector, 'fontInspectorEnabled'),

  // Color Picker
  ...createToolHandlers('COLOR_PICKER', colorPicker, 'isColorPickerActive'),
  COLOR_PICKER_SET_FORMAT: (payload, _state, sendResponse) => {
    if (payload?.format) {
      colorPicker.setFormat(payload.format as 'hex' | 'rgb' | 'hsl');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing format parameter' });
    }
  },
  COLOR_PICKER_EXTRACT_PALETTE: (_payload, _state, sendResponse) => {
    colorPicker.extractPalette();
    sendResponse({ success: true });
  },

  // Pixel Ruler
  ...createToolHandlers('PIXEL_RULER', pixelRuler, 'pixelRulerEnabled'),
  PIXEL_RULER_CLEAR: (_payload, _state, sendResponse) => {
    pixelRuler.clearAllMeasurements();
    sendResponse({ success: true });
  },

  // Breakpoint Overlay
  ...createToolHandlers('BREAKPOINT_OVERLAY', breakpointOverlay, 'breakpointOverlayEnabled'),
  BREAKPOINT_OVERLAY_SET_FRAMEWORK: (payload, _state, sendResponse) => {
    if (payload?.framework) {
      breakpointOverlay.setFramework(payload.framework as 'tailwind' | 'bootstrap');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing framework parameter' });
    }
  },

  // Responsive Preview
  ...createToolHandlers('RESPONSIVE_PREVIEW', responsivePreview, 'responsivePreviewEnabled'),
  RESPONSIVE_PREVIEW_SET_SYNC_SCROLL: (payload, _state, sendResponse) => {
    if (payload?.enabled !== undefined) {
      responsivePreview.setSyncScroll(Boolean(payload.enabled));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing enabled parameter' });
    }
  },
  RESPONSIVE_PREVIEW_SET_SCALE: (payload, _state, sendResponse) => {
    if (payload?.scale !== undefined) {
      responsivePreview.setGlobalScale(Number(payload.scale));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing scale parameter' });
    }
  },

  // Flame Graph
  ...createToolHandlers('FLAME_GRAPH', flameGraph, 'isFlameGraphActive'),
  FLAME_GRAPH_REFRESH: (_payload, _state, sendResponse) => {
    flameGraph.refresh();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_START_PROFILING: (_payload, _state, sendResponse) => {
    flameGraph.startProfiling();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_STOP_PROFILING: (_payload, _state, sendResponse) => {
    flameGraph.stopProfiling();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_SET_THRESHOLD: (payload, _state, sendResponse) => {
    if (payload?.threshold !== undefined) {
      flameGraph.setFilterThreshold(Number(payload.threshold));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing threshold parameter' });
    }
  },
  FLAME_GRAPH_EXPORT: (_payload, _state, sendResponse) => {
    flameGraph.exportProfile();
    sendResponse({ success: true });
  },

  // CSS Inspector
  ...createToolHandlers('CSS_INSPECTOR', cssInspector, 'isCssInspectorActive'),

  // CSS Editor
  ...createToolHandlers('CSS_EDITOR', cssEditor, 'isCssEditorActive'),
  CSS_EDITOR_GET_CSS: (_payload, _state, sendResponse) => {
    sendResponse({ success: true, css: cssEditor.getModifiedCSS() });
  },
  CSS_EDITOR_RESET: (_payload, _state, sendResponse) => {
    cssEditor.resetAll();
    sendResponse({ success: true });
  },

  // Screenshot Studio
  ...createToolHandlers('SCREENSHOT_STUDIO', screenshotStudio, 'isScreenshotStudioActive'),

  // Animation Inspector
  ...createToolHandlers('ANIMATION_INSPECTOR', animationInspector, 'isAnimationInspectorActive'),

  // Design System Validator
  ...createToolHandlers('DESIGN_SYSTEM_VALIDATOR', designSystemValidator, 'isDesignSystemValidatorActive'),
  DESIGN_SYSTEM_VALIDATOR_VALIDATE: (_payload, _state, sendResponse) => {
    const report = designSystemValidator.validate();
    sendResponse({ success: true, report });
  },

  // Contrast Checker
  ...createToolHandlers('CONTRAST_CHECKER', contrastChecker, 'isContrastCheckerActive'),

  // Layout Visualizer
  ...createToolHandlers('LAYOUT_VISUALIZER', layoutVisualizer, 'isLayoutVisualizerActive'),

  // Z-Index Visualizer
  ...createToolHandlers('ZINDEX_VISUALIZER', zIndexVisualizer, 'isZIndexVisualizerActive'),

  // Tech Detector
  ...createToolHandlers('TECH_DETECTOR', techDetector, 'isTechDetectorActive'),

  // Accessibility Audit
  ...createToolHandlers('ACCESSIBILITY_AUDIT', accessibilityAudit, 'isAccessibilityAuditActive'),
  ACCESSIBILITY_AUDIT_RUN: (_payload, _state, sendResponse) => {
    const report = accessibilityAudit.runAudit();
    sendResponse({ success: true, report });
  },

  // Network Analyzer
  ...createToolHandlers('NETWORK_ANALYZER', networkAnalyzer, 'isNetworkAnalyzerActive'),
  NETWORK_ANALYZER_CLEAR: (_payload, _state, sendResponse) => {
    networkAnalyzer.clear();
    sendResponse({ success: true });
  },

  // Site Report Generator
  ...createToolHandlers('SITE_REPORT', siteReportGenerator, 'isSiteReportActive'),
  SITE_REPORT_GENERATE: (payload, _state, sendResponse) => {
    siteReportGenerator.generateReport(payload || {})
      .then((report) => sendResponse({ success: true, report }))
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Async
  },

  // Focus Debugger
  ...createToolHandlers('FOCUS_DEBUGGER', focusDebugger, 'isFocusDebuggerActive'),
  FOCUS_DEBUGGER_REFRESH: (_payload, _state, sendResponse) => {
    focusDebugger.refresh();
    sendResponse({ success: true });
  },
  FOCUS_DEBUGGER_CLEAR_HISTORY: (_payload, _state, sendResponse) => {
    focusDebugger.clearHistory();
    sendResponse({ success: true });
  },

  // Form Debugger
  ...createToolHandlers('FORM_DEBUGGER', formDebugger, 'isFormDebuggerActive'),
  FORM_DEBUGGER_REFRESH: (_payload, _state, sendResponse) => {
    formDebugger.refresh();
    sendResponse({ success: true });
  },
  FORM_DEBUGGER_SET_HIGHLIGHT: (payload, _state, sendResponse) => {
    if (payload?.enabled !== undefined) {
      formDebugger.setHighlightIssues(Boolean(payload.enabled));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing enabled parameter' });
    }
  },

  // Export Manager
  EXPORT_GENERATE_REPORT: (payload, _state, sendResponse) => {
    // Dynamic import to avoid circular dependencies
    import('../export-manager').then(({ exportManager }) => {
      exportManager.generateReport((payload as { elements?: boolean; performance?: boolean; screenshot?: boolean }) || {})
        .then((report) => sendResponse({ success: true, report }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    });
    return true; // Async
  },

  // Command Palette
  ...createToolHandlers('COMMAND_PALETTE', commandPalette, 'isCommandPaletteActive'),

  // Storage Inspector
  ...createToolHandlers('STORAGE_INSPECTOR', storageInspector, 'isStorageInspectorActive'),
  STORAGE_INSPECTOR_REFRESH: (_payload, _state, sendResponse) => {
    storageInspector.refresh();
    sendResponse({ success: true });
  },

  // Component Tree
  ...createToolHandlers('COMPONENT_TREE', componentTree, 'isComponentTreeActive'),
  COMPONENT_TREE_REFRESH: (_payload, _state, sendResponse) => {
    componentTree.refresh();
    sendResponse({ success: true });
  },

  // Visual Regression
  ...createToolHandlers('VISUAL_REGRESSION', visualRegression, 'isVisualRegressionActive'),

  // AI Suggestions
  ...createToolHandlers('AI_SUGGESTIONS', aiSuggestions, 'isAiSuggestionsActive'),
  AI_SUGGESTIONS_RUN_ANALYSIS: (_payload, _state, sendResponse) => {
    aiSuggestions.runAnalysis();
    sendResponse({ success: true });
  },

  // Legacy message types
  TOGGLE_INSPECTOR: (_payload, state, sendResponse) => {
    state.isInspectorActive = !state.isInspectorActive;
    sendResponse({ success: true, active: state.isInspectorActive });
  },
  PICK_COLOR: (_payload, state, sendResponse) => {
    state.isColorPickerActive = !state.isColorPickerActive;
    colorPicker.toggle();
    sendResponse({ success: true, active: state.isColorPickerActive });
  },
  MEASURE_DISTANCE: (_payload, state, sendResponse) => {
    state.isMeasureToolActive = !state.isMeasureToolActive;
    sendResponse({ success: true, active: state.isMeasureToolActive });
  },
  TOGGLE_GRID: (_payload, state, sendResponse) => {
    state.isGridVisible = !state.isGridVisible;
    sendResponse({ success: true, visible: state.isGridVisible });
  },
  COPY_CSS: () => {
    // Legacy handler - no-op
  },
  COPY_HTML: () => {
    // Legacy handler - no-op
  },
  GET_ELEMENT_INFO: (payload, _state, sendResponse) => {
    if (payload?.selector) {
      // Simplified - just return success
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No selector provided' });
    }
  },
  PING: (_payload, _state, sendResponse) => {
    sendResponse({ success: true, data: 'pong' });
  },
  GET_ALL_STATES: (_payload, state, sendResponse) => {
    sendResponse({
      success: true,
      states: {
        pesticide: pesticide.getState(),
        spacing: spacingVisualizer.getState(),
        fontInspector: fontInspector.getState(),
        colorPicker: colorPicker.getState(),
        pixelRuler: pixelRuler.getState(),
        breakpointOverlay: breakpointOverlay.getState(),
        cssInspector: cssInspector.getState(),
        cssEditor: cssEditor.getState(),
        contrastChecker: contrastChecker.getState(),
        layoutVisualizer: layoutVisualizer.getState(),
        zIndexVisualizer: zIndexVisualizer.getState(),
        techDetector: techDetector.getState(),
        networkAnalyzer: networkAnalyzer.getState(),
        accessibilityAudit: accessibilityAudit.getState(),
        siteReportGenerator: siteReportGenerator.getState(),
        screenshotStudio: screenshotStudio.getState(),
        animationInspector: animationInspector.getState(),
        designSystemValidator: designSystemValidator.getState(),
        responsivePreview: responsivePreview.getState(),
        flameGraph: flameGraph.getState(),
        focusDebugger: focusDebugger.getState(),
        formDebugger: formDebugger.getState(),
        commandPalette: commandPalette.getState(),
        storageInspector: storageInspector.getState(),
        componentTree: componentTree.getState(),
        visualRegression: visualRegression.getState(),
        aiSuggestions: aiSuggestions.getState(),
        inspector: { enabled: state.isInspectorActive },
        measureTool: { enabled: state.isMeasureToolActive },
        gridOverlay: { visible: state.isGridVisible },
      },
    });
  },
};

/** Log registered handlers count */
logger.log(`[ContentHandlers] Registered ${Object.keys(registry).length} message handlers`);
