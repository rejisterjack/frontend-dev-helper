/**
 * Component Validation Utilities
 * Functions for validating border radius and shadow properties
 */

import type { BorderRadiusConfig, ShadowConfig } from '../types';
import { isValueInScale } from './spacing';

export function normalizeShadow(shadow: string): string {
  return shadow.toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ',').trim();
}

export function shadowMatches(value: string, shadows: string[]): boolean {
  const normalized = normalizeShadow(value);
  return shadows.some((s) => normalizeShadow(s) === normalized);
}

export function isBorderRadiusValid(
  borderRadius: string,
  config: BorderRadiusConfig,
  tolerance = 1
): boolean {
  if (!borderRadius || borderRadius === '0px') return true;

  const radii = borderRadius.split(/\s+/);
  for (const r of radii) {
    if (!isValueInScale(r, config.values, config.unit, tolerance)) {
      return false;
    }
  }
  return true;
}

export function isBoxShadowValid(boxShadow: string, config: ShadowConfig): boolean {
  if (!boxShadow || boxShadow === 'none') return true;
  return shadowMatches(boxShadow, config.values);
}
