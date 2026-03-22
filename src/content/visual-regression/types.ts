/**
 * Visual Regression Types
 *
 * Type definitions for the visual regression module.
 */

import type { BaselineScreenshot, VisualRegressionState, VisualRegressionTest } from '@/types';

/** Module state interface */
export interface ModuleState {
  isEnabled: boolean;
  isPanelOpen: boolean;
  panelContainer: HTMLElement | null;
  shadowRoot: ShadowRoot | null;
  currentState: VisualRegressionState;
  selectedBaselineId: string | null;
  isCapturing: boolean;
}

/** Public state returned by getState() */
export interface PublicState {
  enabled: boolean;
  isPanelOpen: boolean;
  isCapturing: boolean;
  selectedBaseline: string | null;
  threshold: number;
}

/** Options for creating a baseline */
export interface CreateBaselineOptions {
  fullPage?: boolean;
  name?: string;
}

/** Ignore region coordinates */
export interface IgnoreRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** html2canvas options */
export interface Html2CanvasOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  useCORS: boolean;
  logging: boolean;
}

/** Capture area for Chrome extension API */
export interface CaptureArea {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/** Chrome runtime message response */
export interface CaptureResponse {
  dataUrl?: string;
}

/** Tab type for UI */
export type TabType = 'baselines' | 'tests';

/** Badge type for UI updates */
export type BadgeType = 'baseline' | 'test';

// Re-export types from @/types for convenience
export type { BaselineScreenshot, VisualRegressionState, VisualRegressionTest };
