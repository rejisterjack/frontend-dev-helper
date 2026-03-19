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

import { MessageType } from '../types/messages';
import { accessibilityAudit } from './accessibility-audit';
import { animationInspector } from './animation-inspector';
import { breakpointOverlay } from './breakpoint-overlay';
import { colorPicker } from './color-picker';
import { contrastChecker } from './contrast-checker';
import { cssEditor } from './css-editor';
import { cssInspector } from './css-inspector';
import designSystemValidator from './design-system-validator';
import { exportManager } from './export-manager';
import { fontInspector } from './font-inspector';
import { GridOverlay } from './grid-overlay';
import { Inspector } from './inspector';
import { layoutVisualizer } from './layout-visualizer';
import { MeasureTool } from './measure-tool';
import { networkAnalyzer } from './network-analyzer';
import { pesticide } from './pesticide';
import { pixelRuler } from './pixel-ruler';
import { responsivePreview } from './responsive-preview';
import * as screenshotStudio from './screenshot-studio';
import { siteReportGenerator } from './site-report-generator';
import { spacingVisualizer } from './spacing';
import { techDetector } from './tech-detector';
import { zIndexVisualizer } from './zindex-visualizer';

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
};

// ============================================
// Message Handler
// ============================================

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: Record<string, unknown> }, _sender, sendResponse) => {
    console.log('[Content] Received message:', message);

    try {
      switch (message.type) {
        // DOM Outliner
        case 'PESTICIDE_TOGGLE':
          pesticide.toggle();
          state.domOutlinerEnabled = pesticide.getState().enabled;
          sendResponse({ success: true, active: state.domOutlinerEnabled });
          break;
        case 'PESTICIDE_ENABLE':
          pesticide.enable();
          state.domOutlinerEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'PESTICIDE_DISABLE':
          pesticide.disable();
          state.domOutlinerEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'PESTICIDE_GET_STATE':
          sendResponse({ success: true, state: pesticide.getState() });
          break;
        case 'PESTICIDE_SET_TAG_VISIBILITY':
          if (message.payload?.tag !== undefined && message.payload?.visible !== undefined) {
            pesticide.toggleTag(String(message.payload.tag), Boolean(message.payload.visible));
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing tag or visible parameter' });
          }
          break;

        // Spacing Visualizer
        case 'SPACING_TOGGLE':
          spacingVisualizer.toggle();
          state.spacingVisualizerEnabled = spacingVisualizer.getState().enabled;
          sendResponse({ success: true, active: state.spacingVisualizerEnabled });
          break;
        case 'SPACING_ENABLE':
          spacingVisualizer.enable();
          state.spacingVisualizerEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'SPACING_DISABLE':
          spacingVisualizer.disable();
          state.spacingVisualizerEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'SPACING_GET_STATE':
          sendResponse({ success: true, state: spacingVisualizer.getState() });
          break;

        // Font Inspector
        case 'FONT_INSPECTOR_TOGGLE':
          fontInspector.toggle();
          state.fontInspectorEnabled = fontInspector.getState().enabled;
          sendResponse({ success: true, active: state.fontInspectorEnabled });
          break;
        case 'FONT_INSPECTOR_ENABLE':
          fontInspector.enable();
          state.fontInspectorEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'FONT_INSPECTOR_DISABLE':
          fontInspector.disable();
          state.fontInspectorEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'FONT_INSPECTOR_GET_STATE':
          sendResponse({ success: true, state: fontInspector.getState() });
          break;

        // Color Picker
        case 'COLOR_PICKER_TOGGLE':
          colorPicker.toggle();
          sendResponse({ success: true, active: colorPicker.getState().enabled });
          break;
        case 'COLOR_PICKER_ENABLE':
          colorPicker.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'COLOR_PICKER_DISABLE':
          colorPicker.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'COLOR_PICKER_GET_STATE':
          sendResponse({ success: true, state: colorPicker.getState() });
          break;
        case 'COLOR_PICKER_SET_FORMAT':
          if (message.payload?.format) {
            colorPicker.setFormat(message.payload.format as 'hex' | 'rgb' | 'hsl');
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing format parameter' });
          }
          break;
        case 'COLOR_PICKER_EXTRACT_PALETTE':
          colorPicker.extractPalette();
          sendResponse({ success: true });
          break;

        // Pixel Ruler
        case 'PIXEL_RULER_TOGGLE':
          pixelRuler.toggle();
          state.pixelRulerEnabled = pixelRuler.getState().enabled;
          sendResponse({ success: true, active: state.pixelRulerEnabled });
          break;
        case 'PIXEL_RULER_ENABLE':
          pixelRuler.enable();
          state.pixelRulerEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'PIXEL_RULER_DISABLE':
          pixelRuler.disable();
          state.pixelRulerEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'PIXEL_RULER_GET_STATE':
          sendResponse({ success: true, state: pixelRuler.getState() });
          break;
        case 'PIXEL_RULER_CLEAR':
          pixelRuler.clearAllMeasurements();
          sendResponse({ success: true });
          break;

        // Breakpoint Overlay
        case 'BREAKPOINT_OVERLAY_TOGGLE':
          breakpointOverlay.toggle();
          state.breakpointOverlayEnabled = breakpointOverlay.getState().enabled;
          sendResponse({ success: true, active: state.breakpointOverlayEnabled });
          break;
        case 'BREAKPOINT_OVERLAY_ENABLE':
          breakpointOverlay.enable();
          state.breakpointOverlayEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'BREAKPOINT_OVERLAY_DISABLE':
          breakpointOverlay.disable();
          state.breakpointOverlayEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'BREAKPOINT_OVERLAY_GET_STATE':
          sendResponse({ success: true, state: breakpointOverlay.getState() });
          break;
        case 'BREAKPOINT_OVERLAY_SET_FRAMEWORK':
          if (message.payload?.framework) {
            breakpointOverlay.setFramework(message.payload.framework as 'tailwind' | 'bootstrap');
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing framework parameter' });
          }
          break;

        // Responsive Preview
        case 'RESPONSIVE_PREVIEW_TOGGLE':
          responsivePreview.toggle();
          state.responsivePreviewEnabled = responsivePreview.getState().enabled;
          sendResponse({ success: true, active: state.responsivePreviewEnabled });
          break;
        case 'RESPONSIVE_PREVIEW_ENABLE':
          responsivePreview.enable();
          state.responsivePreviewEnabled = true;
          sendResponse({ success: true, active: true });
          break;
        case 'RESPONSIVE_PREVIEW_DISABLE':
          responsivePreview.disable();
          state.responsivePreviewEnabled = false;
          sendResponse({ success: true, active: false });
          break;
        case 'RESPONSIVE_PREVIEW_GET_STATE':
          sendResponse({ success: true, state: responsivePreview.getState() });
          break;
        case 'RESPONSIVE_PREVIEW_SET_SYNC_SCROLL':
          if (message.payload?.enabled !== undefined) {
            responsivePreview.setSyncScroll(Boolean(message.payload.enabled));
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing enabled parameter' });
          }
          break;
        case 'RESPONSIVE_PREVIEW_SET_SCALE':
          if (message.payload?.scale !== undefined) {
            responsivePreview.setGlobalScale(Number(message.payload.scale));
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Missing scale parameter' });
          }
          break;

        // CSS Inspector
        case 'CSS_INSPECTOR_TOGGLE':
          cssInspector.toggle();
          sendResponse({ success: true, active: cssInspector.getState().enabled });
          break;
        case 'CSS_INSPECTOR_ENABLE':
          cssInspector.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'CSS_INSPECTOR_DISABLE':
          cssInspector.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'CSS_INSPECTOR_GET_STATE':
          sendResponse({ success: true, state: cssInspector.getState() });
          break;

        // CSS Live Editor
        case 'CSS_EDITOR_TOGGLE':
          cssEditor.toggle();
          sendResponse({ success: true, active: cssEditor.getState().enabled });
          break;
        case 'CSS_EDITOR_ENABLE':
          cssEditor.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'CSS_EDITOR_DISABLE':
          cssEditor.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'CSS_EDITOR_GET_STATE':
          sendResponse({ success: true, state: cssEditor.getState() });
          break;
        case 'CSS_EDITOR_GET_CSS':
          sendResponse({ success: true, css: cssEditor.getModifiedCSS() });
          break;
        case 'CSS_EDITOR_RESET':
          cssEditor.resetAll();
          sendResponse({ success: true });
          break;

        // Screenshot Studio
        case 'SCREENSHOT_STUDIO_TOGGLE':
          screenshotStudio.toggle();
          sendResponse({ success: true, active: screenshotStudio.getState().enabled });
          break;
        case 'SCREENSHOT_STUDIO_ENABLE':
          screenshotStudio.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'SCREENSHOT_STUDIO_DISABLE':
          screenshotStudio.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'SCREENSHOT_STUDIO_GET_STATE':
          sendResponse({ success: true, state: screenshotStudio.getState() });
          break;

        // Animation Inspector
        case 'ANIMATION_INSPECTOR_TOGGLE':
          animationInspector.toggle();
          sendResponse({ success: true, active: animationInspector.getState().enabled });
          break;
        case 'ANIMATION_INSPECTOR_ENABLE':
          animationInspector.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'ANIMATION_INSPECTOR_DISABLE':
          animationInspector.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'ANIMATION_INSPECTOR_GET_STATE':
          sendResponse({ success: true, state: animationInspector.getState() });
          break;

        // Design System Validator
        case 'DESIGN_SYSTEM_VALIDATOR_TOGGLE':
          designSystemValidator.toggle();
          sendResponse({ success: true, active: designSystemValidator.getState().enabled });
          break;
        case 'DESIGN_SYSTEM_VALIDATOR_ENABLE':
          designSystemValidator.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'DESIGN_SYSTEM_VALIDATOR_DISABLE':
          designSystemValidator.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'DESIGN_SYSTEM_VALIDATOR_GET_STATE':
          sendResponse({ success: true, state: designSystemValidator.getState() });
          break;
        case 'DESIGN_SYSTEM_VALIDATOR_VALIDATE': {
          const report = designSystemValidator.validate();
          sendResponse({ success: true, report });
          break;
        }

        // Contrast Checker
        case 'CONTRAST_CHECKER_TOGGLE':
          contrastChecker.toggle();
          sendResponse({ success: true, active: contrastChecker.getState().enabled });
          break;
        case 'CONTRAST_CHECKER_ENABLE':
          contrastChecker.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'CONTRAST_CHECKER_DISABLE':
          contrastChecker.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'CONTRAST_CHECKER_GET_STATE':
          sendResponse({ success: true, state: contrastChecker.getState() });
          break;

        // Layout Visualizer (Flexbox/Grid)
        case 'LAYOUT_VISUALIZER_TOGGLE':
          layoutVisualizer.toggle();
          sendResponse({ success: true, active: layoutVisualizer.getState().enabled });
          break;
        case 'LAYOUT_VISUALIZER_ENABLE':
          layoutVisualizer.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'LAYOUT_VISUALIZER_DISABLE':
          layoutVisualizer.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'LAYOUT_VISUALIZER_GET_STATE':
          sendResponse({ success: true, state: layoutVisualizer.getState() });
          break;

        // Z-Index Visualizer
        case 'ZINDEX_VISUALIZER_TOGGLE':
          zIndexVisualizer.toggle();
          sendResponse({ success: true, active: zIndexVisualizer.getState().enabled });
          break;
        case 'ZINDEX_VISUALIZER_ENABLE':
          zIndexVisualizer.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'ZINDEX_VISUALIZER_DISABLE':
          zIndexVisualizer.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'ZINDEX_VISUALIZER_GET_STATE':
          sendResponse({ success: true, state: zIndexVisualizer.getState() });
          break;

        // Tech Detector
        case 'TECH_DETECTOR_TOGGLE':
          techDetector.toggle();
          sendResponse({ success: true, active: techDetector.getState().enabled });
          break;
        case 'TECH_DETECTOR_ENABLE':
          techDetector.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'TECH_DETECTOR_DISABLE':
          techDetector.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'TECH_DETECTOR_GET_STATE':
          sendResponse({ success: true, state: techDetector.getState() });
          break;

        // Accessibility Audit
        case 'ACCESSIBILITY_AUDIT_TOGGLE':
          accessibilityAudit.toggle();
          sendResponse({ success: true, active: accessibilityAudit.getState().enabled });
          break;
        case 'ACCESSIBILITY_AUDIT_ENABLE':
          accessibilityAudit.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'ACCESSIBILITY_AUDIT_DISABLE':
          accessibilityAudit.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'ACCESSIBILITY_AUDIT_GET_STATE':
          sendResponse({ success: true, state: accessibilityAudit.getState() });
          break;
        case 'ACCESSIBILITY_AUDIT_RUN': {
          const report = accessibilityAudit.runAudit();
          sendResponse({ success: true, report });
          break;
        }

        // Network Analyzer
        case 'NETWORK_ANALYZER_TOGGLE':
          networkAnalyzer.toggle();
          sendResponse({ success: true, active: networkAnalyzer.getState().enabled });
          break;
        case 'NETWORK_ANALYZER_ENABLE':
          networkAnalyzer.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'NETWORK_ANALYZER_DISABLE':
          networkAnalyzer.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'NETWORK_ANALYZER_GET_STATE':
          sendResponse({ success: true, state: networkAnalyzer.getState() });
          break;
        case 'NETWORK_ANALYZER_CLEAR':
          networkAnalyzer.clear();
          sendResponse({ success: true });
          break;

        // Site Report Generator
        case 'SITE_REPORT_TOGGLE':
          siteReportGenerator.toggle();
          sendResponse({ success: true, active: siteReportGenerator.getState().enabled });
          break;
        case 'SITE_REPORT_ENABLE':
          siteReportGenerator.enable();
          sendResponse({ success: true, active: true });
          break;
        case 'SITE_REPORT_DISABLE':
          siteReportGenerator.disable();
          sendResponse({ success: true, active: false });
          break;
        case 'SITE_REPORT_GET_STATE':
          sendResponse({ success: true, state: siteReportGenerator.getState() });
          break;
        case 'SITE_REPORT_GENERATE': {
          siteReportGenerator
            .generateReport(message.payload || {})
            .then((report) => sendResponse({ success: true, report }))
            .catch((error: Error) => sendResponse({ success: false, error: error.message }));
          return true;
        }

        // Export Manager
        case 'EXPORT_GENERATE_REPORT':
          exportManager
            .generateReport(
              (message.payload as {
                elements?: boolean;
                performance?: boolean;
                screenshot?: boolean;
              }) || {}
            )
            .then((exportReport) => sendResponse({ success: true, report: exportReport }))
            .catch((error: Error) => sendResponse({ success: false, error: error.message }));
          return true; // Async response
        case 'EXPORT_AS_JSON':
          try {
            exportManager.exportAsJSON(
              message.payload?.data || {},
              message.payload?.filename as string
            );
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;
        case 'EXPORT_AS_PDF':
          try {
            exportManager.exportAsPDF(
              message.payload?.data || {},
              message.payload?.options as object
            );
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;
        case 'EXPORT_CAPTURE_SCREENSHOT':
          exportManager
            .captureScreenshot(message.payload as object)
            .then((dataUrl) => sendResponse({ success: true, dataUrl }))
            .catch((error: Error) => sendResponse({ success: false, error: error.message }));
          return true; // Async response

        // Get all states
        case 'GET_ALL_STATES':
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
              inspector: { enabled: state.isInspectorActive },
              measureTool: { enabled: state.isMeasureToolActive },
              gridOverlay: { visible: state.isGridVisible },
            },
          });
          break;

        // Legacy message types
        case MessageType.TOGGLE_INSPECTOR:
          toggleInspector();
          sendResponse({ success: true, active: state.isInspectorActive });
          break;

        case MessageType.PICK_COLOR:
          toggleColorPicker();
          sendResponse({ success: true, active: state.isColorPickerActive });
          break;

        case MessageType.MEASURE_DISTANCE:
          toggleMeasureTool();
          sendResponse({ success: true, active: state.isMeasureToolActive });
          break;

        case MessageType.TOGGLE_GRID:
          toggleGridOverlay();
          sendResponse({ success: true, visible: state.isGridVisible });
          break;

        case MessageType.COPY_CSS:
          copyComputedCSS();
          sendResponse({ success: true });
          break;

        case MessageType.COPY_HTML:
          copyHTML();
          sendResponse({ success: true });
          break;

        case MessageType.GET_ELEMENT_INFO:
          if (message.payload?.selector) {
            const info = getElementInfo(message.payload.selector);
            sendResponse({ success: true, data: info });
          } else {
            sendResponse({ success: false, error: 'No selector provided' });
          }
          break;

        case MessageType.PING:
          sendResponse({ success: true, data: 'pong' });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Content] Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }

    return true; // Async response
  }
);

// ============================================
// Tool Functions
// ============================================

function toggleInspector(): void {
  if (!state.inspector) {
    state.inspector = new Inspector({
      onElementSelect: handleElementSelect,
      onElementHover: handleElementHover,
    });
  }

  state.isInspectorActive = !state.isInspectorActive;

  if (state.isInspectorActive) {
    state.inspector.activate();
    deactivateOtherTools('inspector');
    showNotification('Inspector activated - Click any element');
  } else {
    state.inspector.deactivate();
  }

  updateIconBadge();
}

function toggleColorPicker(): void {
  state.isColorPickerActive = !state.isColorPickerActive;

  if (state.isColorPickerActive) {
    colorPicker.enable();
    deactivateOtherTools('colorPicker');
    showNotification('Color picker activated - Click to pick color');
  } else {
    colorPicker.disable();
  }

  updateIconBadge();
}

function toggleMeasureTool(): void {
  if (!state.measureTool) {
    state.measureTool = new MeasureTool({
      onMeasurementComplete: handleMeasurementComplete,
    });
  }

  state.isMeasureToolActive = !state.isMeasureToolActive;

  if (state.isMeasureToolActive) {
    state.measureTool.activate();
    deactivateOtherTools('measureTool');
    showNotification('Measure tool activated - Drag to measure');
  } else {
    state.measureTool.deactivate();
  }

  updateIconBadge();
}

function toggleGridOverlay(): void {
  if (!state.gridOverlay) {
    state.gridOverlay = new GridOverlay();
  }

  state.isGridVisible = !state.isGridVisible;

  if (state.isGridVisible) {
    state.gridOverlay.show();
  } else {
    state.gridOverlay.hide();
  }
}

// ============================================
// Helper Functions
// ============================================

function deactivateOtherTools(except: string): void {
  // Deactivate instances
  if (except !== 'inspector' && state.inspector) {
    state.inspector.deactivate();
    state.isInspectorActive = false;
  }
  if (except !== 'colorPicker') {
    colorPicker.disable();
    state.isColorPickerActive = false;
  }
  if (except !== 'measureTool' && state.measureTool) {
    state.measureTool.deactivate();
    state.isMeasureToolActive = false;
  }
  if (except !== 'pesticide') {
    pesticide.disable();
    state.domOutlinerEnabled = false;
  }
  if (except !== 'spacing') {
    spacingVisualizer.disable();
    state.spacingVisualizerEnabled = false;
  }
  if (except !== 'fontInspector') {
    fontInspector.disable();
    state.fontInspectorEnabled = false;
  }
  if (except !== 'pixelRuler') {
    pixelRuler.disable();
    state.pixelRulerEnabled = false;
  }
}

function handleElementSelect(element: HTMLElement): void {
  const info = extractElementInfo(element);

  // Send to background/popup
  chrome.runtime.sendMessage({
    type: MessageType.ELEMENT_SELECTED,
    payload: info,
  });

  // Copy to clipboard
  copyToClipboard(JSON.stringify(info, null, 2));
  showNotification('Element info copied to clipboard');

  // Auto-deactivate if not in sticky mode
  // toggleInspector();
}

function handleElementHover(element: HTMLElement): void {
  // Optional: Send hover info to popup for real-time display
  chrome.runtime.sendMessage({
    type: MessageType.ELEMENT_HOVER,
    payload: { tagName: element.tagName, className: element.className },
  });
}

// Note: handleColorSelect can be used when color picker is implemented
// function handleColorSelect(color: string): void {
//   copyToClipboard(color);
//   showNotification(`Color ${color} copied to clipboard`);
// }

function handleMeasurementComplete(distance: number, unit: string): void {
  copyToClipboard(`${distance}${unit}`);
  showNotification(`Measured: ${distance}${unit}`);
}

function extractElementInfo(element: HTMLElement): Record<string, unknown> {
  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    class: element.className || null,
    selector: generateSelector(element),
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX),
    },
    styles: {
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily.split(',')[0].replace(/["']/g, ''),
      margin: computedStyle.margin,
      padding: computedStyle.padding,
      borderRadius: computedStyle.borderRadius,
      display: computedStyle.display,
      position: computedStyle.position,
    },
    text: element.textContent?.trim().slice(0, 100) || null,
    children: element.children.length,
  };
}

function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .join('.');

  if (classes) {
    return `${element.tagName.toLowerCase()}.${classes}`;
  }

  // Generate path
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    const parent = current.parentElement;

    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

function getElementInfo(selector: string): Record<string, unknown> | null {
  try {
    const element = document.querySelector(selector) as HTMLElement;
    return element ? extractElementInfo(element) : null;
  } catch {
    return null;
  }
}

function copyComputedCSS(): void {
  const selection = window.getSelection();
  const element = selection?.anchorNode?.parentElement;

  if (element) {
    const info = extractElementInfo(element);
    const cssText = generateCSSText(info.styles as Record<string, string>);
    copyToClipboard(cssText);
    showNotification('CSS copied to clipboard');
  }
}

function copyHTML(): void {
  const selection = window.getSelection();
  const element = selection?.anchorNode?.parentElement;

  if (element) {
    copyToClipboard(element.outerHTML);
    showNotification('HTML copied to clipboard');
  }
}

function generateCSSText(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('[Content] Failed to copy:', error);
    // Fallback: create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function showNotification(message: string): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'fdh-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateIconBadge(): void {
  const activeTools = [
    state.isInspectorActive,
    state.isColorPickerActive,
    state.isMeasureToolActive,
    state.domOutlinerEnabled,
    state.spacingVisualizerEnabled,
    state.fontInspectorEnabled,
    state.pixelRulerEnabled,
    state.breakpointOverlayEnabled,
  ].filter(Boolean).length;

  chrome.runtime.sendMessage({
    type: MessageType.UPDATE_BADGE,
    payload: { count: activeTools },
  });
}

// ============================================
// Global Escape Handler - Disable All Tools
// ============================================

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    // Disable all tools
    pesticide.disable();
    spacingVisualizer.disable();
    fontInspector.disable();
    colorPicker.disable();
    pixelRuler.disable();
    breakpointOverlay.disable();
    cssEditor.disable();
    cssInspector.disable();
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

    // Update state
    state.domOutlinerEnabled = false;
    state.spacingVisualizerEnabled = false;
    state.fontInspectorEnabled = false;
    state.pixelRulerEnabled = false;
    state.breakpointOverlayEnabled = false;
    state.isColorPickerActive = false;
    state.isScreenshotStudioActive = false;

    // Notify background script
    updateIconBadge();

    showNotification('All tools disabled');
  }
});

// ============================================
// Initialization
// ============================================

console.log('[FrontendDevHelper] Content script loaded');

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);
