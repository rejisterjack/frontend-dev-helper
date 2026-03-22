/**
 * Typography Validation Utilities
 * Functions for validating typography properties
 */

import type { TypographyConfig } from '../types';

export function isFontSizeValid(
  fontSize: string,
  config: TypographyConfig,
  tolerance = 1
): boolean {
  const match = fontSize.match(/^([\d.]+)(px|rem|em)?$/);
  if (!match) return false;

  const num = Number.parseFloat(match[1]);
  const unit = match[2] || 'px';

  // Convert to px for comparison
  const baseFontSize = 16;
  let valueInPx: number;
  if (unit === 'px') {
    valueInPx = num;
  } else if (unit === 'rem' || unit === 'em') {
    valueInPx = num * baseFontSize;
  } else {
    return false;
  }

  // Check against config
  for (const scaleValue of config.fontSizes) {
    const scaleInPx = config.unit === 'px' ? scaleValue : scaleValue * baseFontSize;
    if (Math.abs(valueInPx - scaleInPx) <= tolerance) return true;
  }
  return false;
}

export function isFontWeightValid(fontWeight: string, config: TypographyConfig): boolean {
  const weightNum = Number.parseInt(fontWeight, 10);
  return config.fontWeights.includes(weightNum);
}

export function isLineHeightValid(lineHeight: string, config: TypographyConfig): boolean {
  if (lineHeight === 'normal') return true;

  const lineHeightNum = Number.parseFloat(lineHeight);
  if (Number.isNaN(lineHeightNum)) return false;

  // Allow px values
  if (lineHeight.includes('px')) return true;

  // Check against config
  return config.lineHeights.some((lh) => Math.abs(lh - lineHeightNum) < 0.05);
}
