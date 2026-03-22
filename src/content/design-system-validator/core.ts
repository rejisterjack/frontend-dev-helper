/**
 * Core Validation Logic
 * Main validation functions and public API
 */

import { logger } from '@/utils/logger';
import { getShadowRoot, state } from './constants';
import { PRESETS } from './presets';
import type { DesignSystemTokens, ValidationReport, Violation } from './types';
import { createUI, destroyUI, updateHighlights, updateStats } from './ui';
import { getAllColors, isColorInPalette, normalizeColor } from './validators/colors';
import { isBorderRadiusValid, isBoxShadowValid } from './validators/components';
import { isValueInScale } from './validators/spacing';
import { isFontSizeValid, isFontWeightValid, isLineHeightValid } from './validators/typography';

function validateElement(element: HTMLElement, tokens: DesignSystemTokens): Violation[] {
  const violations: Violation[] = [];
  const computed = window.getComputedStyle(element);
  const id = `${element.tagName}-${Math.random().toString(36).substr(2, 9)}`;

  // Spacing validation
  const spacingProps = ['margin', 'padding', 'gap', 'row-gap', 'column-gap'];
  const directions = ['top', 'right', 'bottom', 'left'];

  for (const prop of spacingProps) {
    if (prop === 'margin' || prop === 'padding') {
      for (const dir of directions) {
        const fullProp = `${prop}-${dir}`;
        const value = computed.getPropertyValue(fullProp);
        if (value && value !== '0px' && value !== 'auto') {
          if (
            !isValueInScale(
              value,
              tokens.spacing.scale,
              tokens.spacing.unit,
              tokens.spacing.tolerance
            )
          ) {
            violations.push({
              id: `${id}-${fullProp}`,
              type: 'spacing',
              element,
              property: fullProp,
              actualValue: value,
              expectedValues: tokens.spacing.scale.map((v) => `${v}${tokens.spacing.unit}`),
              message: `Invalid ${fullProp}: ${value}. Expected design system spacing scale.`,
              severity: 'warning',
            });
          }
        }
      }
    } else {
      const value = computed.getPropertyValue(prop);
      if (value && value !== '0px' && value !== 'normal') {
        if (
          !isValueInScale(
            value,
            tokens.spacing.scale,
            tokens.spacing.unit,
            tokens.spacing.tolerance
          )
        ) {
          violations.push({
            id: `${id}-${prop}`,
            type: 'spacing',
            element,
            property: prop,
            actualValue: value,
            expectedValues: tokens.spacing.scale.map((v) => `${v}${tokens.spacing.unit}`),
            message: `Invalid ${prop}: ${value}. Expected design system spacing scale.`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Color validation
  const colorProps = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ];
  const allColors = getAllColors(tokens);

  for (const prop of colorProps) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
      const normalized = normalizeColor(value);
      if (normalized && normalized !== 'transparent') {
        if (!isColorInPalette(value, allColors, 15)) {
          violations.push({
            id: `${id}-${prop}`,
            type: 'color',
            element,
            property: prop,
            actualValue: value,
            expectedValues: allColors.slice(0, 10),
            message: `Non-design system ${prop}: ${value}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Typography validation
  const fontSize = computed.getPropertyValue('font-size');
  if (fontSize) {
    if (!isFontSizeValid(fontSize, tokens.typography, 1)) {
      violations.push({
        id: `${id}-font-size`,
        type: 'typography',
        element,
        property: 'font-size',
        actualValue: fontSize,
        expectedValues: tokens.typography.fontSizes.map((v) => `${v}${tokens.typography.unit}`),
        message: `Non-standard font size: ${fontSize}`,
        severity: 'warning',
      });
    }
  }

  const fontWeight = computed.getPropertyValue('font-weight');
  if (fontWeight) {
    if (!isFontWeightValid(fontWeight, tokens.typography)) {
      violations.push({
        id: `${id}-font-weight`,
        type: 'typography',
        element,
        property: 'font-weight',
        actualValue: fontWeight,
        expectedValues: tokens.typography.fontWeights.map(String),
        message: `Non-standard font weight: ${fontWeight}`,
        severity: 'warning',
      });
    }
  }

  const lineHeight = computed.getPropertyValue('line-height');
  if (lineHeight && !isLineHeightValid(lineHeight, tokens.typography)) {
    violations.push({
      id: `${id}-line-height`,
      type: 'typography',
      element,
      property: 'line-height',
      actualValue: lineHeight,
      expectedValues: tokens.typography.lineHeights.map(String),
      message: `Non-standard line height: ${lineHeight}`,
      severity: 'warning',
    });
  }

  // Border radius validation
  const borderRadius = computed.getPropertyValue('border-radius');
  if (borderRadius && !isBorderRadiusValid(borderRadius, tokens.borderRadius, 1)) {
    violations.push({
      id: `${id}-border-radius`,
      type: 'borderRadius',
      element,
      property: 'border-radius',
      actualValue: borderRadius,
      expectedValues: tokens.borderRadius.values.map((v) => `${v}${tokens.borderRadius.unit}`),
      message: `Non-standard border radius: ${borderRadius}`,
      severity: 'warning',
    });
  }

  // Shadow validation
  const boxShadow = computed.getPropertyValue('box-shadow');
  if (boxShadow && !isBoxShadowValid(boxShadow, tokens.shadows)) {
    violations.push({
      id: `${id}-box-shadow`,
      type: 'shadow',
      element,
      property: 'box-shadow',
      actualValue: boxShadow,
      expectedValues: tokens.shadows.values.slice(0, 5),
      message: `Non-standard box shadow`,
      severity: 'warning',
    });
  }

  return violations;
}

function calculateStats(violations: Violation[], totalElements: number): ValidationReport['stats'] {
  const stats = {
    spacing: { valid: 0, invalid: 0 },
    color: { valid: 0, invalid: 0 },
    typography: { valid: 0, invalid: 0 },
    borderRadius: { valid: 0, invalid: 0 },
    shadow: { valid: 0, invalid: 0 },
  };

  const typeCount: Record<string, number> = {};
  for (const v of violations) {
    typeCount[v.type] = (typeCount[v.type] || 0) + 1;
  }

  const estimatedChecksPerElement = 15;
  const totalChecks = totalElements * estimatedChecksPerElement;
  const totalViolations = violations.length;
  const estimatedValid = Math.max(0, totalChecks - totalViolations);

  const perTypeValid = Math.floor(estimatedValid / 5);

  for (const type of Object.keys(stats) as Array<keyof typeof stats>) {
    stats[type].invalid = typeCount[type] || 0;
    stats[type].valid = Math.max(0, perTypeValid - (typeCount[type] || 0));
  }

  return stats;
}

function calculateTokenUsage(_violations: Violation[]): ValidationReport['tokenUsage'] {
  const usage: ValidationReport['tokenUsage'] = {
    spacing: {},
    colors: {},
    fontSizes: {},
    fontWeights: {},
    borderRadius: {},
  };

  // Collect actual values from the page
  const elements = document.querySelectorAll<HTMLElement>('*');
  for (const el of Array.from(elements)) {
    if (el.offsetParent === null) continue;

    const computed = window.getComputedStyle(el);

    // Spacing
    const margin = computed.margin;
    if (margin && margin !== '0px') {
      usage.spacing[margin] = (usage.spacing[margin] || 0) + 1;
    }

    // Colors
    const bg = computed.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const normalized = normalizeColor(bg);
      if (normalized && normalized !== 'transparent') {
        usage.colors[normalized] = (usage.colors[normalized] || 0) + 1;
      }
    }

    // Typography
    const fontSize = computed.fontSize;
    if (fontSize) {
      usage.fontSizes[fontSize] = (usage.fontSizes[fontSize] || 0) + 1;
    }

    const fontWeight = computed.fontWeight;
    if (fontWeight) {
      usage.fontWeights[fontWeight] = (usage.fontWeights[fontWeight] || 0) + 1;
    }

    // Border radius
    const borderRadius = computed.borderRadius;
    if (borderRadius && borderRadius !== '0px') {
      usage.borderRadius[borderRadius] = (usage.borderRadius[borderRadius] || 0) + 1;
    }
  }

  return usage;
}

export function validate(tokens?: DesignSystemTokens): ValidationReport {
  const tokensToUse = tokens || state.customTokens || PRESETS[state.currentPreset];
  const violations: Violation[] = [];
  const elements = document.querySelectorAll<HTMLElement>('body *');

  for (const element of Array.from(elements)) {
    if (element.offsetParent === null) continue;
    if (element.closest('#dsv-panel, #dsv-shadow-host')) continue;

    const elementViolations = validateElement(element, tokensToUse);
    violations.push(...elementViolations);
  }

  state.violations = violations;

  const report: ValidationReport = {
    url: window.location.href,
    timestamp: Date.now(),
    totalElements: elements.length,
    violations,
    stats: calculateStats(violations, elements.length),
    tokenUsage: calculateTokenUsage(violations),
  };

  state.report = report;
  return report;
}

/**
 * Enable the Design System Validator
 */
export function enable(tokens?: DesignSystemTokens): void {
  if (state.enabled) return;

  state.enabled = true;
  if (tokens) {
    state.customTokens = tokens;
    state.currentPreset = 'custom';
  }

  createUI(disable);
  logger.log('Design System Validator enabled');
}

/**
 * Disable the Design System Validator
 */
export function disable(): void {
  if (!state.enabled) return;

  state.enabled = false;
  destroyUI();
  logger.log('Design System Validator disabled');
}

/**
 * Toggle the Design System Validator
 */
export function toggle(tokens?: DesignSystemTokens): boolean {
  if (state.enabled) {
    disable();
    return false;
  }
  enable(tokens);
  return true;
}

/**
 * Get current validator state
 */
export function getState(): typeof state {
  return { ...state };
}

/**
 * Set custom design system tokens
 */
export function setCustomTokens(tokens: DesignSystemTokens): void {
  state.customTokens = tokens;
  state.currentPreset = 'custom';

  const root = getShadowRoot();
  if (root) {
    const presetSelect = root.getElementById('dsv-preset') as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.value = 'custom';
    }
  }

  if (state.report) {
    const report = validate();
    updateStats(report);
    updateHighlights();
  }
}

/**
 * Set preset design system
 */
export function setPreset(presetName: keyof typeof PRESETS): void {
  if (!PRESETS[presetName]) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  state.currentPreset = presetName;
  state.customTokens = null;

  const root = getShadowRoot();
  if (root) {
    const presetSelect = root.getElementById('dsv-preset') as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.value = presetName;
    }
  }

  if (state.report) {
    const report = validate();
    updateStats(report);
    updateHighlights();
  }
}

/**
 * Clear all violations and highlights
 */
export function clear(): void {
  state.violations = [];
  state.report = null;
  updateHighlights();

  const root = getShadowRoot();
  if (root) {
    const violationsListEl = root.getElementById('dsv-violations');
    const totalViolationsEl = root.getElementById('dsv-total-violations');
    const totalElementsEl = root.getElementById('dsv-total-elements');

    if (violationsListEl) {
      violationsListEl.innerHTML = `
        <div class="dsv-empty">
          <svg class="dsv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>Click "Validate Page" to check for inconsistencies</p>
        </div>
      `;
    }

    if (totalViolationsEl) {
      totalViolationsEl.textContent = '-';
      totalViolationsEl.className = 'dsv-stat-value';
    }

    if (totalElementsEl) {
      totalElementsEl.textContent = '-';
    }
  }
}
