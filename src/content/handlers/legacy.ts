/**
 * Legacy Handlers
 *
 * Older message types (TOGGLE_INSPECTOR, PICK_COLOR, etc.) kept for
 * backward compatibility, plus the global GET_ALL_STATES and
 * DISABLE_ALL_TOOLS batch operations.
 */

import type { ContentHandler, ContentScriptState } from '@/types';
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
import { pesticide } from '../pesticide';
import { pixelRuler } from '../pixel-ruler';
import { responsivePreview } from '../responsive-preview';
import * as screenshotStudio from '../screenshot-studio';
import { siteReportGenerator } from '../site-report-generator';
import * as smartElementPicker from '../smart-element-picker';
import { spacingVisualizer } from '../spacing';
import { storageInspector } from '../storage-inspector';
import { techDetector } from '../tech-detector';
import { visualRegression } from '../visual-regression';
import { zIndexVisualizer } from '../zindex-visualizer';

export const legacyHandlers: Record<string, ContentHandler> = {
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
        'link[rel="stylesheet"]:not([media]), script[src]:not([async]):not([defer])',
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
