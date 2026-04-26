/**
 * Content Script Handler Registry
 *
 * Central registry for all content script message handlers.
 * Each handler receives (payload, state, sendResponse) and returns
 * true if the response is async, false/void otherwise.
 */

import type { ContentHandler, ContentScriptState } from '@/types';
import { logger } from '@/utils/logger';
import { accessibilityAudit } from '../accessibility-audit';
import { aiSuggestions } from '../ai-suggestions';
import { animationInspector } from '../animation-inspector';
import {
  getContainerQueryInspector,
  getScrollAnimationsDebugger,
  getViewTransitionsDebugger,
} from '../beast-mode-loader';
import { breakpointOverlay } from '../breakpoint-overlay';
import { colorPicker } from '../color-picker';
import { commandPalette } from '../command-palette';
import { componentTree } from '../component-tree';
import { contrastChecker } from '../contrast-checker';
import { cssEditor } from '../css-editor';
import { cssInspector } from '../css-inspector';
import * as cssVariableInspector from '../css-variable-inspector';
import designSystemValidator from '../design-system-validator';
import { flameGraph } from '../flame-graph';
import { focusDebugger } from '../focus-debugger';
import { fontInspector } from '../font-inspector';
import { formDebugger } from '../form-debugger';
import * as frameworkDevtools from '../framework-devtools';
import { layoutVisualizer } from '../layout-visualizer';
import { networkAnalyzer } from '../network-analyzer';
import * as performanceBudget from '../performance-budget';
// Import tool modules
import { pesticide } from '../pesticide';
import { pixelRuler } from '../pixel-ruler';
import { responsivePreview } from '../responsive-preview';
import * as responsiveTesting from '../responsive-testing';
import * as screenshotStudio from '../screenshot-studio';
import * as sessionRecorder from '../session-recorder';
import { siteReportGenerator } from '../site-report-generator';
import * as smartElementPicker from '../smart-element-picker';
import { spacingVisualizer } from '../spacing';
import { storageInspector } from '../storage-inspector';
import { techDetector } from '../tech-detector';
import { visualRegression } from '../visual-regression';
import { zIndexVisualizer } from '../zindex-visualizer';

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
  // Type-safe state mutator helper
  const setState = (
    state: ContentScriptState,
    key: keyof ContentScriptState,
    value: boolean
  ): void => {
    (state as Record<keyof ContentScriptState, boolean>)[key] = value;
  };

  return {
    [`${toolName}_ENABLE`]: (_payload, state, sendResponse) => {
      tool.enable();
      setState(state, stateKey, true);
      sendResponse({ success: true, active: true });
    },
    [`${toolName}_DISABLE`]: (_payload, state, sendResponse) => {
      tool.disable();
      setState(state, stateKey, false);
      sendResponse({ success: true, active: false });
    },
    [`${toolName}_TOGGLE`]: (_payload, state, sendResponse) => {
      tool.toggle();
      const newState = tool.getState();
      setState(state, stateKey, newState.enabled);
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
  ...createToolHandlers('PESTICIDE', pesticide, 'isDomOutlinerActive'),
  PESTICIDE_SET_TAG_VISIBILITY: (payload, _state, sendResponse) => {
    if (payload?.tag !== undefined && payload?.visible !== undefined) {
      pesticide.toggleTag(String(payload.tag), Boolean(payload.visible));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing tag or visible parameter' });
    }
  },

  // Spacing Visualizer
  ...createToolHandlers('SPACING', spacingVisualizer, 'isSpacingVisualizerActive'),

  // Font Inspector
  ...createToolHandlers('FONT_INSPECTOR', fontInspector, 'isFontInspectorActive'),

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
  ...createToolHandlers('PIXEL_RULER', pixelRuler, 'isPixelRulerActive'),
  PIXEL_RULER_CLEAR: (_payload, _state, sendResponse) => {
    pixelRuler.clearAllMeasurements();
    sendResponse({ success: true });
  },

  // Breakpoint Overlay
  ...createToolHandlers('BREAKPOINT_OVERLAY', breakpointOverlay, 'isBreakpointOverlayActive'),
  BREAKPOINT_OVERLAY_SET_FRAMEWORK: (payload, _state, sendResponse) => {
    if (payload?.framework) {
      breakpointOverlay.setFramework(payload.framework as 'tailwind' | 'bootstrap');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing framework parameter' });
    }
  },

  // Responsive Preview
  ...createToolHandlers('RESPONSIVE_PREVIEW', responsivePreview, 'isResponsivePreviewActive'),
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
  ...createToolHandlers(
    'DESIGN_SYSTEM_VALIDATOR',
    designSystemValidator,
    'isDesignSystemValidatorActive'
  ),
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
    siteReportGenerator
      .generateReport(payload || {})
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
      exportManager
        .generateReport(
          (payload as { elements?: boolean; performance?: boolean; screenshot?: boolean }) || {}
        )
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

  // Smart Suggestions
  ...createToolHandlers('SMART_SUGGESTIONS', aiSuggestions, 'isSmartSuggestionsActive'),
  SMART_SUGGESTIONS_RUN_ANALYSIS: (_payload, _state, sendResponse) => {
    aiSuggestions.runAnalysis();
    sendResponse({ success: true });
  },

  // Session Recorder
  SESSION_RECORDER_START: (payload, _state, sendResponse) => {
    const { name, description } = (payload as { name?: string; description?: string }) || {};
    try {
      const session = sessionRecorder.startRecording(name || 'Session', description);
      sendResponse({ success: true, session });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  },
  SESSION_RECORDER_STOP: (_payload, _state, sendResponse) => {
    const session = sessionRecorder.stopRecording();
    sendResponse({ success: true, session });
  },
  SESSION_RECORDER_GET_STATE: (_payload, _state, sendResponse) => {
    sendResponse({ success: true, state: sessionRecorder.getState() });
  },
  SESSION_RECORDER_GET_SESSIONS: (_payload, _state, sendResponse) => {
    sessionRecorder.getSessions().then((sessions) => {
      sendResponse({ success: true, sessions });
    });
    return true;
  },
  SESSION_RECORDER_DELETE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.deleteSession(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  SESSION_RECORDER_REPLAY: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.replaySession(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  SESSION_RECORDER_EXPORT: (payload, _state, sendResponse) => {
    const { session } = payload as { session: sessionRecorder.DebuggingSession };
    const json = sessionRecorder.exportSession(session);
    sendResponse({ success: true, json });
  },
  SESSION_RECORDER_IMPORT: (payload, _state, sendResponse) => {
    const { json } = payload as { json: string };
    try {
      const session = sessionRecorder.importSession(json);
      sendResponse({ success: true, session });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  },
  SESSION_RECORDER_SHARE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    sessionRecorder.shareSession(id).then((url) => {
      sendResponse({ success: true, url });
    });
    return true;
  },
  SESSION_RECORDER_ADD_ANNOTATION: (payload, _state, sendResponse) => {
    const { text, selector } = payload as { text: string; selector?: string };
    sessionRecorder.addAnnotation(text, selector);
    sendResponse({ success: true });
  },

  // Responsive Testing
  RESPONSIVE_TESTING_RUN: (payload, _state, sendResponse) => {
    const { breakpoints } = payload as { breakpoints?: responsiveTesting.Breakpoint[] };
    responsiveTesting.runResponsiveTesting(breakpoints).then((report) => {
      sendResponse({ success: true, report });
    });
    return true;
  },
  RESPONSIVE_TESTING_GET_REPORTS: (_payload, _state, sendResponse) => {
    responsiveTesting.getReports().then((reports) => {
      sendResponse({ success: true, reports });
    });
    return true;
  },
  RESPONSIVE_TESTING_GET_REPORT: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    responsiveTesting.getReport(id).then((report) => {
      sendResponse({ success: true, report });
    });
    return true;
  },
  RESPONSIVE_TESTING_DELETE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    responsiveTesting.deleteReport(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  RESPONSIVE_TESTING_EXPORT_HTML: (payload, _state, sendResponse) => {
    const { report } = payload as { report: responsiveTesting.ResponsiveReport };
    const html = responsiveTesting.generateHTMLReport(report);
    sendResponse({ success: true, html });
  },

  // CSS Variable Inspector
  ...createToolHandlers(
    'CSS_VARIABLE_INSPECTOR',
    cssVariableInspector,
    'isCssVariableInspectorActive'
  ),
  CSS_VARIABLE_INSPECTOR_SCAN: (_payload, _state, sendResponse) => {
    const variables = cssVariableInspector.detectCSSVariables();
    sendResponse({ success: true, variables });
  },
  CSS_VARIABLE_INSPECTOR_EXPORT: (payload, _state, sendResponse) => {
    const { format } = payload as { format: 'json' | 'css' | 'figma' };
    const data = cssVariableInspector.exportVariables(format);
    sendResponse({ success: true, data });
  },

  // Smart Element Picker
  ...createToolHandlers('SMART_ELEMENT_PICKER', smartElementPicker, 'isSmartElementPickerActive'),
  SMART_ELEMENT_PICKER_INSPECT: (payload, _state, sendResponse) => {
    const { selector } = payload as { selector: string };
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      const info = smartElementPicker.inspectElement(element);
      sendResponse({ success: true, info });
    } else {
      sendResponse({ success: false, error: 'Element not found' });
    }
  },

  // Performance Budget
  ...createToolHandlers('PERFORMANCE_BUDGET', performanceBudget, 'isPerformanceBudgetActive'),
  PERFORMANCE_BUDGET_CHECK: (_payload, _state, sendResponse) => {
    const metrics = performanceBudget.collectMetrics();
    const violations = performanceBudget.checkBudgets();
    sendResponse({ success: true, metrics, violations });
  },
  PERFORMANCE_BUDGET_SET_BUDGET: (payload, _state, sendResponse) => {
    const { metric, value } = payload as { metric: string; value: number };
    performanceBudget.setBudget(metric, value);
    sendResponse({ success: true });
  },

  // Framework DevTools
  ...createToolHandlers('FRAMEWORK_DEVTOOLS', frameworkDevtools, 'isFrameworkDevtoolsActive'),
  FRAMEWORK_DEVTOOLS_DETECT: (_payload, _state, sendResponse) => {
    const frameworks = frameworkDevtools.detectAll();
    sendResponse({ success: true, frameworks });
  },
  FRAMEWORK_DEVTOOLS_GET_COMPONENT_TREE: (_payload, _state, sendResponse) => {
    const tree = frameworkDevtools.getReactComponentTree();
    sendResponse({ success: true, tree });
  },

  // Beast Mode: lazy-loaded chunks (see beast-mode-loader.ts)
  CONTAINER_QUERY_INSPECTOR_ENABLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.enable();
        state.isContainerQueryInspectorActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_DISABLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.disable();
        state.isContainerQueryInspectorActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_TOGGLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isContainerQueryInspectorActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_GET_STATE: (_payload, _state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_GET_SUMMARY: (_payload, _state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        const summary = m.getContainerSummary();
        sendResponse({ success: true, summary });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },

  VIEW_TRANSITIONS_DEBUGGER_ENABLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.enable();
        state.isViewTransitionsDebuggerActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_DISABLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.disable();
        state.isViewTransitionsDebuggerActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_TOGGLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isViewTransitionsDebuggerActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_GET_STATE: (_payload, _state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },

  SCROLL_ANIMATIONS_DEBUGGER_ENABLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.enable();
        state.isScrollAnimationsDebuggerActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_DISABLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.disable();
        state.isScrollAnimationsDebuggerActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_TOGGLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isScrollAnimationsDebuggerActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_GET_STATE: (_payload, _state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_GET_SUMMARY: (_payload, _state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        const summary = m.getAnimationSummary();
        sendResponse({ success: true, summary });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
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

  // Disable all tools in one batch operation
  DISABLE_ALL_TOOLS: (_payload, state, sendResponse) => {
    // Disable all tools
    pesticide.disable();
    spacingVisualizer.disable();
    fontInspector.disable();
    colorPicker.disable();
    pixelRuler.disable();
    breakpointOverlay.disable();
    cssInspector.disable();
    cssEditor.disable();
    contrastChecker.disable();
    layoutVisualizer.disable();
    zIndexVisualizer.disable();
    techDetector.disable();
    networkAnalyzer.disable();
    accessibilityAudit.disable();
    siteReportGenerator.disable();
    screenshotStudio.disable();
    animationInspector.disable();
    designSystemValidator.disable();
    responsivePreview.disable();
    flameGraph.disable();
    focusDebugger.disable();
    formDebugger.disable();
    commandPalette.disable();
    storageInspector.disable();
    componentTree.disable();
    visualRegression.disable();
    aiSuggestions.disable();
    cssVariableInspector.disable();
    smartElementPicker.disable();
    performanceBudget.disable();
    frameworkDevtools.disable();
    if (state.isContainerQueryInspectorActive) {
      void getContainerQueryInspector().then((m) => m.disable());
    }
    if (state.isViewTransitionsDebuggerActive) {
      void getViewTransitionsDebugger().then((m) => m.disable());
    }
    if (state.isScrollAnimationsDebuggerActive) {
      void getScrollAnimationsDebugger().then((m) => m.disable());
    }

    // Update state flags (unified naming convention)
    state.isDomOutlinerActive = false;
    state.isSpacingVisualizerActive = false;
    state.isFontInspectorActive = false;
    state.isColorPickerActive = false;
    state.isPixelRulerActive = false;
    state.isBreakpointOverlayActive = false;
    state.isCssInspectorActive = false;
    state.isCssEditorActive = false;
    state.isContrastCheckerActive = false;
    state.isLayoutVisualizerActive = false;
    state.isZIndexVisualizerActive = false;
    state.isTechDetectorActive = false;
    state.isNetworkAnalyzerActive = false;
    state.isAccessibilityAuditActive = false;
    state.isSiteReportActive = false;
    state.isScreenshotStudioActive = false;
    state.isAnimationInspectorActive = false;
    state.isDesignSystemValidatorActive = false;
    state.isResponsivePreviewActive = false;
    state.isFlameGraphActive = false;
    state.isFocusDebuggerActive = false;
    state.isFormDebuggerActive = false;
    state.isCommandPaletteActive = false;
    state.isStorageInspectorActive = false;
    state.isComponentTreeActive = false;
    state.isVisualRegressionActive = false;
    state.isSmartSuggestionsActive = false;
    state.isCssVariableInspectorActive = false;
    state.isSmartElementPickerActive = false;
    state.isSessionRecorderActive = false;
    state.isPerformanceBudgetActive = false;
    state.isFrameworkDevtoolsActive = false;
    state.isContainerQueryInspectorActive = false;
    state.isViewTransitionsDebuggerActive = false;
    state.isScrollAnimationsDebuggerActive = false;
    state.isInspectorActive = false;
    state.isMeasureToolActive = false;
    state.isGridVisible = false;

    sendResponse({ success: true });
  },

  // Performance DOM data collection
  GET_PERFORMANCE_DOM_DATA: (_payload, _state, sendResponse) => {
    const imageOptimizations: Array<{
      element: string;
      src: string;
      currentSize: number;
      currentFormat: string;
      recommendations: string[];
      potentialSavings: number;
    }> = [];

    document.querySelectorAll('img').forEach((img) => {
      const rect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = rect.width;
      const displayHeight = rect.height;

      if (naturalWidth > displayWidth * 1.5 || naturalHeight > displayHeight * 1.5) {
        const src = img.src;
        const currentFormat = src.split('.').pop()?.toLowerCase() || 'unknown';
        const recommendations: string[] = [];

        if (naturalWidth > displayWidth * 2) {
          recommendations.push('Resize to display size');
        }
        if (currentFormat === 'png' && !src.includes('data:')) {
          recommendations.push('Use WebP/AVIF');
        }
        if (!img.loading || img.loading !== 'lazy') {
          recommendations.push('Add lazy loading');
        }

        if (recommendations.length > 0) {
          imageOptimizations.push({
            element: img.tagName.toLowerCase(),
            src: src.substring(0, 100),
            currentSize: naturalWidth * naturalHeight * 4,
            currentFormat,
            recommendations,
            potentialSavings: Math.round(naturalWidth * naturalHeight * 4 * 0.6),
          });
        }
      }
    });

    const renderBlocking: Array<{
      url: string;
      type: 'stylesheet' | 'script';
    }> = [];

    document
      .querySelectorAll(
        'link[rel="stylesheet"]:not([media]), script[src]:not([async]):not([defer])'
      )
      .forEach((el) => {
        const url = el.getAttribute('href') || el.getAttribute('src') || '';
        renderBlocking.push({
          url: url.substring(0, 100),
          type: el.tagName.toLowerCase() === 'link' ? 'stylesheet' : 'script',
        });
      });

    sendResponse({
      success: true,
      imageOptimizations: imageOptimizations.slice(0, 10),
      renderBlocking: renderBlocking.slice(0, 5),
    });
  },
};

/** Log registered handlers count */
logger.log(`[ContentHandlers] Registered ${Object.keys(registry).length} message handlers`);
