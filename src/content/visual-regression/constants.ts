/**
 * Visual Regression Constants
 *
 * Constants and configuration for the visual regression module.
 */

/** CSS prefix for all visual regression elements */
export const PREFIX = 'fdh-visual-regression';

/** Default comparison threshold (percentage) */
export const DEFAULT_THRESHOLD = 0.1;

/** Status message timeout in milliseconds */
export const STATUS_TIMEOUT = 3000;

/** Panel dimensions */
export const PANEL_CONFIG = {
  width: 500,
  topOffset: 20,
  rightOffset: 20,
  maxHeight: '85vh',
  zIndex: 2147483646,
} as const;

/** Preview image dimensions */
export const PREVIEW_CONFIG = {
  height: 120,
} as const;

/** Threshold slider configuration */
export const THRESHOLD_CONFIG = {
  min: 0,
  max: 10,
  step: 0.1,
} as const;
