/**
 * Content Script Handler Registry
 *
 * Central registry for all content script message handlers.
 * Each handler receives (payload, state, sendResponse) and returns
 * true if the response is async, false/void otherwise.
 *
 * Per-tool handlers live in sibling files; this module aggregates
 * them into a single `registry` export.
 */

import type { ContentHandler } from '@/types';
import { logger } from '@/utils/logger';

import { beastModeHandlers } from './beast-mode';
import { legacyHandlers } from './legacy';
import { accessibilityAuditHandlers } from './accessibility-audit';
import { animationInspectorHandlers } from './animation-inspector';
import { breakpointOverlayHandlers } from './breakpoint-overlay';
import { colorPickerHandlers } from './color-picker';
import { commandPaletteHandlers } from './command-palette';
import { componentTreeHandlers } from './component-tree';
import { contrastCheckerHandlers } from './contrast-checker';
import { cssEditorHandlers } from './css-editor';
import { cssInspectorHandlers } from './css-inspector';
import { cssVariableInspectorHandlers } from './css-variable-inspector';
import { designSystemValidatorHandlers } from './design-system-validator';
import { exportManagerHandlers } from './export-manager';
import { flameGraphHandlers } from './flame-graph';
import { focusDebuggerHandlers } from './focus-debugger';
import { fontInspectorHandlers } from './font-inspector';
import { formDebuggerHandlers } from './form-debugger';
import { frameworkDevtoolsHandlers } from './framework-devtools';
import { layoutVisualizerHandlers } from './layout-visualizer';
import { networkAnalyzerHandlers } from './network-analyzer';
import { performanceBudgetHandlers } from './performance-budget';
import { pesticideHandlers } from './pesticide';
import { pixelRulerHandlers } from './pixel-ruler';
import { responsivePreviewHandlers } from './responsive-preview';
import { responsiveTestingHandlers } from './responsive-testing';
import { screenshotStudioHandlers } from './screenshot-studio';
import { sessionRecorderHandlers } from './session-recorder';
import { siteReportHandlers } from './site-report';
import { smartElementPickerHandlers } from './smart-element-picker';
import { smartSuggestionsHandlers } from './smart-suggestions';
import { spacingHandlers } from './spacing';
import { storageInspectorHandlers } from './storage-inspector';
import { techDetectorHandlers } from './tech-detector';
import { visualRegressionHandlers } from './visual-regression';
import { zIndexVisualizerHandlers } from './zindex-visualizer';

/** Handler registry */
export const registry: Record<string, ContentHandler> = {
  ...pesticideHandlers,
  ...spacingHandlers,
  ...fontInspectorHandlers,
  ...colorPickerHandlers,
  ...pixelRulerHandlers,
  ...breakpointOverlayHandlers,
  ...responsivePreviewHandlers,
  ...flameGraphHandlers,
  ...cssInspectorHandlers,
  ...cssEditorHandlers,
  ...screenshotStudioHandlers,
  ...animationInspectorHandlers,
  ...designSystemValidatorHandlers,
  ...contrastCheckerHandlers,
  ...layoutVisualizerHandlers,
  ...zIndexVisualizerHandlers,
  ...techDetectorHandlers,
  ...accessibilityAuditHandlers,
  ...networkAnalyzerHandlers,
  ...siteReportHandlers,
  ...focusDebuggerHandlers,
  ...formDebuggerHandlers,
  ...exportManagerHandlers,
  ...commandPaletteHandlers,
  ...storageInspectorHandlers,
  ...componentTreeHandlers,
  ...visualRegressionHandlers,
  ...smartSuggestionsHandlers,
  ...sessionRecorderHandlers,
  ...responsiveTestingHandlers,
  ...cssVariableInspectorHandlers,
  ...smartElementPickerHandlers,
  ...performanceBudgetHandlers,
  ...frameworkDevtoolsHandlers,
  ...beastModeHandlers,
  ...legacyHandlers,
};

/** Log registered handlers count */
logger.log(`[ContentHandlers] Registered ${Object.keys(registry).length} message handlers`);
