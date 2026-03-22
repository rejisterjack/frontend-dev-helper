/**
 * Design System Validator
 * Validates web pages against design system tokens for consistency
 *
 * @module design-system-validator
 * @example
 * ```typescript
 * import { enable, validate, PRESETS } from './design-system-validator';
 *
 * // Enable with default preset
 * enable();
 *
 * // Or with custom tokens
 * enable({
 *   name: 'My Design System',
 *   spacing: { scale: [0, 4, 8, 16], unit: 'px' },
 *   // ... rest of tokens
 * });
 *
 * // Validate the page
 * const report = validate();
 * console.log(report.violations);
 * ```
 */

// Constants/State (for advanced use cases)
export { state } from './constants';

// Core API
export {
  clear,
  disable,
  enable,
  getState,
  setCustomTokens,
  setPreset,
  toggle,
  validate,
} from './core';
// Default export with all main functions
export { default } from './default-export';
// Presets
export { PRESETS } from './presets';
// Types
export type {
  BorderRadiusConfig,
  ColorConfig,
  DesignSystemTokens,
  ShadowConfig,
  SpacingConfig,
  TypographyConfig,
  ValidationReport,
  ValidatorState,
  Violation,
} from './types';
// UI (exported for advanced use cases)
export {
  createUI,
  destroyUI,
  exportReport,
  highlightElement,
  updateHighlights,
  updateStats,
} from './ui';
// Validators
export {
  colorDistance,
  getAllColors,
  hexToRgb,
  isColorInPalette,
  normalizeColor,
  parseColor,
  rgbToHex,
} from './validators/colors';
export {
  isBorderRadiusValid,
  isBoxShadowValid,
  normalizeShadow,
  shadowMatches,
} from './validators/components';
export { convertToUnit, isValueInScale, parseValue } from './validators/spacing';
export {
  isFontSizeValid,
  isFontWeightValid,
  isLineHeightValid,
} from './validators/typography';
