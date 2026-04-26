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

import { MESSAGE_TYPES } from '../constants';
import type { ContentScriptState } from '../types';
import { showContentErrorToast } from '../utils/content-notify';
import { logger } from '../utils/logger';
import { recordDiagnosticEvent } from '../utils/storage';
import { initActiveToolsHudIfEnabled } from './active-tools-hud';
import { registry } from './handlers';

// ============================================
// State Management (Unified Naming Convention)
// ============================================

const state: ContentScriptState = {
  inspector: null,
  measureTool: null,
  gridOverlay: null,
  // Unified is{ToolName}Active naming convention
  isInspectorActive: false,
  isColorPickerActive: false,
  isMeasureToolActive: false,
  isGridVisible: false,
  isScreenshotStudioActive: false,
  isDomOutlinerActive: false,
  isSpacingVisualizerActive: false,
  isFontInspectorActive: false,
  isPixelRulerActive: false,
  isBreakpointOverlayActive: false,
  isResponsivePreviewActive: false,
  isCssInspectorActive: false,
  isCssEditorActive: false,
  isContrastCheckerActive: false,
  isLayoutVisualizerActive: false,
  isZIndexVisualizerActive: false,
  isTechDetectorActive: false,
  isAccessibilityAuditActive: false,
  isNetworkAnalyzerActive: false,
  isSiteReportActive: false,
  isAnimationInspectorActive: false,
  isDesignSystemValidatorActive: false,
  isFlameGraphActive: false,
  isFocusDebuggerActive: false,
  isFormDebuggerActive: false,
  isCommandPaletteActive: false,
  isStorageInspectorActive: false,
  isComponentTreeActive: false,
  isVisualRegressionActive: false,
  isSmartSuggestionsActive: false,
  // Advanced tools
  isCssVariableInspectorActive: false,
  isSmartElementPickerActive: false,
  isSessionRecorderActive: false,
  isPerformanceBudgetActive: false,
  isFrameworkDevtoolsActive: false,
  isContainerQueryInspectorActive: false,
  isViewTransitionsDebuggerActive: false,
  isScrollAnimationsDebuggerActive: false,
};

// ============================================
// Unified Message Handler
// ============================================

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: Record<string, unknown> }, _sender, sendResponse) => {
    // First: background tab lifecycle broadcasts (string literals = works even if constants mismatch)
    const mt =
      message && typeof message === 'object' && 'type' in message
        ? String((message as { type: unknown }).type)
        : '';
    if (mt === 'INIT' || mt === 'URL_CHANGED' || mt === 'TAB_CHANGED') {
      sendResponse({ success: true });
      return false;
    }

    logger.log('[Content] Received message:', message.type);

    if (message.type === MESSAGE_TYPES.FDH_INSPECTED_HINT) {
      const sel = message.payload?.selector as string | undefined;
      if (sel) {
        try {
          const el = document.querySelector(sel);
          if (el instanceof HTMLElement) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            const prev = el.style.outline;
            el.style.outline = '3px solid #6366f1';
            window.setTimeout(() => {
              el.style.outline = prev;
            }, 2000);
          }
        } catch {
          // Invalid selector
        }
      }
      sendResponse({ success: true });
      return false;
    }

    // Handle TOOL_STATE_CHANGED for real-time sync
    if (message.type === 'TOOL_STATE_CHANGED') {
      const { toolId, enabled } = message.payload || {};
      if (toolId && typeof enabled === 'boolean') {
        const stateKey = getStateKeyForTool(toolId as string);
        if (stateKey) {
          (state as unknown as Record<string, boolean>)[stateKey] = enabled;
          logger.log(`[Content] Tool state updated via broadcast: ${toolId} = ${enabled}`);
        }
      }
      sendResponse({ success: true });
      return false;
    }

    const handler = registry[message.type];
    if (!handler) {
      logger.warn(
        '[Content] Unhandled message type:',
        mt || (typeof message.type === 'string' ? message.type : JSON.stringify(message))
      );
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      return false;
    }

    try {
      const isAsync = handler(message.payload, state, sendResponse);
      return isAsync === true;
    } catch (error) {
      logger.error('[Content] Handler error for', message.type, error);
      void recordDiagnosticEvent('content_handler_error');
      showContentErrorToast(
        'FrontendDevHelper: something went wrong running that action. Details are in the page console.'
      );
      sendResponse({ success: false, error: String(error) });
      return false;
    }
  }
);

/**
 * Map toolId to the corresponding state key
 */
function getStateKeyForTool(toolId: string): keyof ContentScriptState | null {
  const keyMap: Record<string, keyof ContentScriptState> = {
    domOutliner: 'isDomOutlinerActive',
    spacingVisualizer: 'isSpacingVisualizerActive',
    fontInspector: 'isFontInspectorActive',
    colorPicker: 'isColorPickerActive',
    pixelRuler: 'isPixelRulerActive',
    responsiveBreakpoint: 'isBreakpointOverlayActive',
    responsivePreview: 'isResponsivePreviewActive',
    cssInspector: 'isCssInspectorActive',
    cssEditor: 'isCssEditorActive',
    cssScanner: 'isCssEditorActive',
    contrastChecker: 'isContrastCheckerActive',
    layoutVisualizer: 'isLayoutVisualizerActive',
    zIndexVisualizer: 'isZIndexVisualizerActive',
    techDetector: 'isTechDetectorActive',
    accessibilityAudit: 'isAccessibilityAuditActive',
    networkAnalyzer: 'isNetworkAnalyzerActive',
    siteReport: 'isSiteReportActive',
    screenshotStudio: 'isScreenshotStudioActive',
    animationInspector: 'isAnimationInspectorActive',
    designSystemValidator: 'isDesignSystemValidatorActive',
    flameGraph: 'isFlameGraphActive',
    focusDebugger: 'isFocusDebuggerActive',
    formDebugger: 'isFormDebuggerActive',
    commandPalette: 'isCommandPaletteActive',
    storageInspector: 'isStorageInspectorActive',
    componentTree: 'isComponentTreeActive',
    visualRegression: 'isVisualRegressionActive',
    smartSuggestions: 'isSmartSuggestionsActive',
    elementInspector: 'isInspectorActive',
    measurementTool: 'isMeasureToolActive',
    gridOverlay: 'isGridVisible',
    // Advanced tools
    cssVariableInspector: 'isCssVariableInspectorActive',
    smartElementPicker: 'isSmartElementPickerActive',
    sessionRecorder: 'isSessionRecorderActive',
    performanceBudget: 'isPerformanceBudgetActive',
    frameworkDevtools: 'isFrameworkDevtoolsActive',
    // Beast Mode: Next-Gen Features
    containerQueryInspector: 'isContainerQueryInspectorActive',
    viewTransitionsDebugger: 'isViewTransitionsDebuggerActive',
    scrollAnimationsDebugger: 'isScrollAnimationsDebuggerActive',
  };
  return keyMap[toolId] || null;
}

// ============================================
// In-App Hotkeys
// ============================================

/**
 * Setup in-app hotkey listeners
 * These are custom shortcuts configured in Options > In-App Hotkeys
 */
function setupInAppHotkeys(): void {
  let inAppShortcuts: Record<string, string> = {};

  // Load shortcuts from storage
  chrome.storage.local.get('fdh_settings').then((result) => {
    const settings = result.fdh_settings;
    if (settings?.shortcuts) {
      inAppShortcuts = settings.shortcuts;
    }
  });

  // Listen for storage changes to update shortcuts
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.fdh_settings?.newValue?.shortcuts) {
      inAppShortcuts = changes.fdh_settings.newValue.shortcuts;
    }
  });

  // Global keydown listener for in-app hotkeys
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Command');
    if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      keys.push(e.key.toUpperCase());
    }

    const pressedCombo = keys.join('+');

    // Check against configured shortcuts
    for (const [action, shortcut] of Object.entries(inAppShortcuts)) {
      if (shortcut === pressedCombo) {
        e.preventDefault();
        e.stopPropagation();
        handleInAppHotkey(action);
        break;
      }
    }
  });
}

/**
 * Handle in-app hotkey actions
 */
function handleInAppHotkey(action: string): void {
  logger.log('[Content] In-app hotkey triggered:', action);

  switch (action) {
    case 'openPopup':
      // Send message to background to open popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      break;

    case 'toggleInspector':
      // Toggle element inspector
      chrome.runtime.sendMessage({
        type: 'TOGGLE_TOOL',
        payload: { toolId: 'elementInspector' },
      });
      break;

    case 'takeScreenshot':
      // Trigger screenshot
      chrome.runtime.sendMessage({
        type: 'SCREENSHOT_STUDIO_ENABLE',
      });
      break;

    case 'openCommandPalette':
      // Open command palette
      chrome.runtime.sendMessage({
        type: 'COMMAND_PALETTE_ENABLE',
      });
      break;

    default:
      logger.warn('[Content] Unknown in-app hotkey action:', action);
  }
}

// ============================================
// Initialization
// ============================================

setupInAppHotkeys();
void initActiveToolsHudIfEnabled();
logger.log('[Content] FrontendDevHelper content script initialized');
