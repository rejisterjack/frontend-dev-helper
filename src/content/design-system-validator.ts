/**
 * Design System Validator
 * Validates web pages against design system tokens for consistency
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SpacingConfig {
  scale: number[];
  unit: 'px' | 'rem' | 'em';
  tolerance?: number;
}

export interface ColorConfig {
  primary: string[];
  secondary: string[];
  neutral: string[];
  semantic: {
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
  };
  custom?: Record<string, string[]>;
}

export interface TypographyConfig {
  fontSizes: number[];
  fontWeights: number[];
  lineHeights: number[];
  fontFamilies: string[];
  unit: 'px' | 'rem' | 'em';
}

export interface BorderRadiusConfig {
  values: number[];
  unit: 'px' | 'rem' | 'em' | '%';
}

export interface ShadowConfig {
  values: string[];
}

export interface DesignSystemTokens {
  name: string;
  spacing: SpacingConfig;
  colors: ColorConfig;
  typography: TypographyConfig;
  borderRadius: BorderRadiusConfig;
  shadows: ShadowConfig;
}

export interface Violation {
  id: string;
  type: 'spacing' | 'color' | 'typography' | 'borderRadius' | 'shadow';
  element: HTMLElement;
  property: string;
  actualValue: string;
  expectedValues: string[];
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  url: string;
  timestamp: number;
  totalElements: number;
  violations: Violation[];
  stats: {
    spacing: { valid: number; invalid: number };
    color: { valid: number; invalid: number };
    typography: { valid: number; invalid: number };
    borderRadius: { valid: number; invalid: number };
    shadow: { valid: number; invalid: number };
  };
  tokenUsage: {
    spacing: Record<string, number>;
    colors: Record<string, number>;
    fontSizes: Record<string, number>;
    fontWeights: Record<string, number>;
    borderRadius: Record<string, number>;
  };
}

export interface ValidatorState {
  enabled: boolean;
  highlightingEnabled: boolean;
  currentPreset: string;
  customTokens: DesignSystemTokens | null;
  violations: Violation[];
  report: ValidationReport | null;
}

// ============================================================================
// Presets
// ============================================================================

export const PRESETS: Record<string, DesignSystemTokens> = {
  material: {
    name: 'Material Design 3',
    spacing: {
      scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
      unit: 'px',
      tolerance: 1,
    },
    colors: {
      primary: ['#6750A4', '#7F67BE', '#9A82DB', '#B69DF8'],
      secondary: ['#625B71', '#7A7289', '#958DA5', '#B0A7C0'],
      neutral: [
        '#1C1B1F',
        '#313033',
        '#484649',
        '#605D62',
        '#787579',
        '#939094',
        '#AEAAAE',
        '#CAC4D0',
        '#E7E0EC',
        '#F5EFF7',
      ],
      semantic: {
        success: ['#4CAF50', '#81C784', '#A5D6A7'],
        warning: ['#FF9800', '#FFB74D', '#FFCC80'],
        error: ['#F44336', '#E57373', '#EF9A9A'],
        info: ['#2196F3', '#64B5F6', '#90CAF9'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 45, 57, 64],
      fontWeights: [400, 500, 600, 700],
      lineHeights: [1.2, 1.25, 1.33, 1.4, 1.5, 1.6],
      fontFamilies: ['Roboto', 'sans-serif'],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 4, 8, 12, 16, 20, 24, 28, 32],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0px 1px 3px rgba(0,0,0,0.12), 0px 1px 1px rgba(0,0,0,0.14)',
        '0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14)',
        '0px 1px 8px rgba(0,0,0,0.12), 0px 3px 4px rgba(0,0,0,0.14)',
        '0px 2px 4px rgba(0,0,0,0.12), 0px 4px 5px rgba(0,0,0,0.14)',
        '0px 3px 5px rgba(0,0,0,0.12), 0px 6px 10px rgba(0,0,0,0.14)',
        '0px 5px 5px rgba(0,0,0,0.12), 0px 8px 10px rgba(0,0,0,0.14)',
        '0px 5px 8px rgba(0,0,0,0.12), 0px 9px 12px rgba(0,0,0,0.14)',
        '0px 6px 10px rgba(0,0,0,0.12), 0px 12px 17px rgba(0,0,0,0.14)',
      ],
    },
  },
  tailwind: {
    name: 'Tailwind CSS',
    spacing: {
      scale: [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96],
      unit: 'px',
      tolerance: 0,
    },
    colors: {
      primary: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
      secondary: ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
      neutral: [
        '#0F172A',
        '#1E293B',
        '#334155',
        '#475569',
        '#64748B',
        '#94A3B8',
        '#CBD5E1',
        '#E2E8F0',
        '#F1F5F9',
        '#F8FAFC',
      ],
      semantic: {
        success: ['#22C55E', '#16A34A', '#15803D'],
        warning: ['#F59E0B', '#D97706', '#B45309'],
        error: ['#EF4444', '#DC2626', '#B91C1C'],
        info: ['#06B6D4', '#0891B2', '#0E7490'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128],
      fontWeights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
      lineHeights: [1, 1.25, 1.375, 1.5, 1.625, 2],
      fontFamilies: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 2, 4, 6, 8, 12, 16, 24, 9999],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0 1px 2px 0 rgba(0,0,0,0.05)',
        '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '0 25px 50px -12px rgba(0,0,0,0.25)',
        'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      ],
    },
  },
  bootstrap: {
    name: 'Bootstrap 5',
    spacing: {
      scale: [0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64],
      unit: 'px',
      tolerance: 0,
    },
    colors: {
      primary: ['#0D6EFD', '#0B5ED7', '#0A58CA', '#094DB1'],
      secondary: ['#6C757D', '#5C636A', '#565E64', '#4C5258'],
      neutral: [
        '#212529',
        '#343A40',
        '#495057',
        '#6C757D',
        '#ADB5BD',
        '#DEE2E6',
        '#E9ECEF',
        '#F8F9FA',
      ],
      semantic: {
        success: ['#198754', '#157347', '#146C43'],
        warning: ['#FFC107', '#FFCA2C', '#FFCD39'],
        error: ['#DC3545', '#BB2D3B', '#B02A37'],
        info: ['#0DCAF0', '#31D2F2', '#3DD5F3'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64],
      fontWeights: [300, 400, 500, 600, 700, 800, 900],
      lineHeights: [1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.75],
      fontFamilies: [
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 2, 4, 6, 8, 16, 160, 290],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0 0.125rem 0.25rem rgba(0,0,0,0.075)',
        '0 0.5rem 1rem rgba(0,0,0,0.15)',
        '0 1rem 3rem rgba(0,0,0,0.175)',
        'inset 0 1px 2px rgba(0,0,0,0.075)',
      ],
    },
  },
};

// ============================================================================
// State
// ============================================================================

const state: ValidatorState = {
  enabled: false,
  highlightingEnabled: true,
  currentPreset: 'tailwind',
  customTokens: null,
  violations: [],
  report: null,
};

let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let panelElement: HTMLElement | null = null;

// ============================================================================
// Color Utilities
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  const bigint = Number.parseInt(cleanHex, 16);
  if (cleanHex.length === 3) {
    const r = (bigint >> 8) & 0xf;
    const g = (bigint >> 4) & 0xf;
    const b = bigint & 0xf;
    return { r: r * 17, g: g * 17, b: b * 17 };
  }
  if (cleanHex.length === 6) {
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    if (rgb) return { ...rgb, a: 1 };
    return null;
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1], 10),
      g: Number.parseInt(rgbMatch[2], 10),
      b: Number.parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? Number.parseFloat(rgbMatch[4]) : 1,
    };
  }

  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
  if (hslMatch) {
    const h = Number.parseInt(hslMatch[1], 10) / 360;
    const s = Number.parseInt(hslMatch[2], 10) / 100;
    const l = Number.parseInt(hslMatch[3], 10) / 100;
    const a = hslMatch[4] ? Number.parseFloat(hslMatch[4]) : 1;

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a,
    };
  }

  return null;
}

function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function normalizeColor(color: string): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;
  if (parsed.a < 0.5) return 'transparent';
  return rgbToHex(parsed.r, parsed.g, parsed.b).toLowerCase();
}

function isColorInPalette(color: string, palette: string[], tolerance: number = 10): boolean {
  const parsedColor = parseColor(color);
  if (!parsedColor || parsedColor.a < 0.5) return true;

  for (const paletteColor of palette) {
    const parsedPalette = parseColor(paletteColor);
    if (parsedPalette) {
      const distance = colorDistance(parsedColor, parsedPalette);
      if (distance <= tolerance) return true;
    }
  }
  return false;
}

// ============================================================================
// Value Utilities
// ============================================================================

function parseValue(value: string): { num: number; unit: string } | null {
  if (value === '0' || value === '0px' || value === '0rem' || value === '0em') {
    return { num: 0, unit: 'px' };
  }
  const match = value.match(/^([\d.]+)(px|rem|em|%)?$/);
  if (!match) return null;
  return {
    num: Number.parseFloat(match[1]),
    unit: match[2] || 'px',
  };
}

function convertToUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const baseFontSize = 16;
  if (fromUnit === 'rem' && toUnit === 'px') return value * baseFontSize;
  if (fromUnit === 'em' && toUnit === 'px') return value * baseFontSize;
  if (fromUnit === 'px' && toUnit === 'rem') return value / baseFontSize;
  if (fromUnit === 'px' && toUnit === 'em') return value / baseFontSize;
  return value;
}

function isValueInScale(
  value: string,
  scale: number[],
  unit: string,
  tolerance: number = 1
): boolean {
  const parsed = parseValue(value);
  if (!parsed) return false;

  const valueInPx =
    parsed.unit === 'px' ? parsed.num : convertToUnit(parsed.num, parsed.unit, 'px');

  for (const scaleValue of scale) {
    const scaleInPx = unit === 'px' ? scaleValue : convertToUnit(scaleValue, unit, 'px');
    if (Math.abs(valueInPx - scaleInPx) <= tolerance) return true;
  }
  return false;
}

function normalizeShadow(shadow: string): string {
  return shadow.toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ',').trim();
}

function shadowMatches(value: string, shadows: string[]): boolean {
  const normalized = normalizeShadow(value);
  return shadows.some((s) => normalizeShadow(s) === normalized);
}

// ============================================================================
// Validation Logic
// ============================================================================

function getAllColors(tokens: DesignSystemTokens): string[] {
  const colors: string[] = [];
  colors.push(...tokens.colors.primary);
  colors.push(...tokens.colors.secondary);
  colors.push(...tokens.colors.neutral);
  colors.push(...tokens.colors.semantic.success);
  colors.push(...tokens.colors.semantic.warning);
  colors.push(...tokens.colors.semantic.error);
  colors.push(...tokens.colors.semantic.info);
  if (tokens.colors.custom) {
    for (const customColors of Object.values(tokens.colors.custom)) {
      colors.push(...customColors);
    }
  }
  return colors.map((c) => c.toLowerCase());
}

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
    if (!isValueInScale(fontSize, tokens.typography.fontSizes, tokens.typography.unit, 1)) {
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
    const weightNum = Number.parseInt(fontWeight, 10);
    if (!tokens.typography.fontWeights.includes(weightNum)) {
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
  if (lineHeight && lineHeight !== 'normal') {
    const lineHeightNum = Number.parseFloat(lineHeight);
    const hasMatch = tokens.typography.lineHeights.some(
      (lh) => Math.abs(lh - lineHeightNum) < 0.05
    );
    if (!hasMatch && !lineHeight.includes('px')) {
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
  }

  // Border radius validation
  const borderRadius = computed.getPropertyValue('border-radius');
  if (borderRadius && borderRadius !== '0px') {
    const radii = borderRadius.split(/\s+/);
    for (const r of radii) {
      if (!isValueInScale(r, tokens.borderRadius.values, tokens.borderRadius.unit, 1)) {
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
        break;
      }
    }
  }

  // Shadow validation
  const boxShadow = computed.getPropertyValue('box-shadow');
  if (boxShadow && boxShadow !== 'none') {
    if (!shadowMatches(boxShadow, tokens.shadows.values)) {
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

// ============================================================================
// UI Components
// ============================================================================

const STYLES = `
  :host {
    --dsv-bg: #0f172a;
    --dsv-bg-secondary: #1e293b;
    --dsv-bg-tertiary: #334155;
    --dsv-text: #f1f5f9;
    --dsv-text-secondary: #94a3b8;
    --dsv-border: #334155;
    --dsv-accent: #3b82f6;
    --dsv-accent-hover: #2563eb;
    --dsv-error: #ef4444;
    --dsv-warning: #f59e0b;
    --dsv-success: #22c55e;
    --dsv-radius: 8px;
    --dsv-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  #dsv-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 80vh;
    background: var(--dsv-bg);
    border: 1px solid var(--dsv-border);
    border-radius: var(--dsv-radius);
    box-shadow: var(--dsv-shadow);
    color: var(--dsv-text);
    font-size: 14px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dsv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--dsv-bg-secondary);
    border-bottom: 1px solid var(--dsv-border);
    cursor: move;
    user-select: none;
  }

  .dsv-title {
    font-weight: 600;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dsv-icon {
    width: 20px;
    height: 20px;
    color: var(--dsv-accent);
  }

  .dsv-close-btn {
    background: none;
    border: none;
    color: var(--dsv-text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .dsv-close-btn:hover {
    color: var(--dsv-text);
    background: var(--dsv-bg-tertiary);
  }

  .dsv-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .dsv-section {
    margin-bottom: 20px;
  }

  .dsv-section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--dsv-text-secondary);
    margin-bottom: 12px;
  }

  .dsv-select {
    width: 100%;
    padding: 10px 12px;
    background: var(--dsv-bg-secondary);
    border: 1px solid var(--dsv-border);
    border-radius: var(--dsv-radius);
    color: var(--dsv-text);
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .dsv-select:focus {
    outline: none;
    border-color: var(--dsv-accent);
  }

  .dsv-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    cursor: pointer;
    transition: background 0.2s;
  }

  .dsv-toggle:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dsv-switch {
    width: 44px;
    height: 24px;
    background: var(--dsv-bg-tertiary);
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
  }

  .dsv-switch.active {
    background: var(--dsv-accent);
  }

  .dsv-switch-thumb {
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  .dsv-switch.active .dsv-switch-thumb {
    transform: translateX(20px);
  }

  .dsv-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .dsv-stat {
    padding: 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    text-align: center;
  }

  .dsv-stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--dsv-accent);
  }

  .dsv-stat-value.error {
    color: var(--dsv-error);
  }

  .dsv-stat-value.warning {
    color: var(--dsv-warning);
  }

  .dsv-stat-label {
    font-size: 12px;
    color: var(--dsv-text-secondary);
    margin-top: 4px;
  }

  .dsv-violations {
    max-height: 200px;
    overflow-y: auto;
  }

  .dsv-violation {
    padding: 10px 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    margin-bottom: 8px;
    border-left: 3px solid var(--dsv-warning);
    cursor: pointer;
    transition: background 0.2s;
  }

  .dsv-violation:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-violation.error {
    border-left-color: var(--dsv-error);
  }

  .dsv-violation-type {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--dsv-text-secondary);
    margin-bottom: 4px;
  }

  .dsv-violation-message {
    font-size: 13px;
    line-height: 1.4;
  }

  .dsv-violation-value {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--dsv-warning);
    margin-top: 4px;
  }

  .dsv-btn {
    width: 100%;
    padding: 12px;
    background: var(--dsv-accent);
    border: none;
    border-radius: var(--dsv-radius);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dsv-btn:hover {
    background: var(--dsv-accent-hover);
  }

  .dsv-btn-secondary {
    background: var(--dsv-bg-secondary);
    border: 1px solid var(--dsv-border);
  }

  .dsv-btn-secondary:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-empty {
    text-align: center;
    padding: 32px;
    color: var(--dsv-text-secondary);
  }

  .dsv-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    color: var(--dsv-success);
  }

  .dsv-highlight {
    outline: 2px solid var(--dsv-warning) !important;
    outline-offset: 2px !important;
  }

  .dsv-highlight-error {
    outline: 2px solid var(--dsv-error) !important;
    outline-offset: 2px !important;
  }

  .dsv-actions {
    display: flex;
    gap: 8px;
  }

  .dsv-actions .dsv-btn {
    flex: 1;
  }
`;

function createPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'dsv-panel';
  panel.innerHTML = `
    <div class="dsv-header" id="dsv-header">
      <div class="dsv-title">
        <svg class="dsv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Design System Validator
      </div>
      <button class="dsv-close-btn" id="dsv-close" title="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="dsv-content">
      <div class="dsv-section">
        <div class="dsv-section-title">Design System</div>
        <select class="dsv-select" id="dsv-preset">
          <option value="tailwind">Tailwind CSS</option>
          <option value="material">Material Design 3</option>
          <option value="bootstrap">Bootstrap 5</option>
          <option value="custom">Custom Tokens</option>
        </select>
      </div>

      <div class="dsv-section">
        <div class="dsv-toggle" id="dsv-highlight-toggle">
          <span class="dsv-toggle-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Visual Highlighting
          </span>
          <div class="dsv-switch active" id="dsv-switch">
            <div class="dsv-switch-thumb"></div>
          </div>
        </div>
      </div>

      <div class="dsv-section">
        <div class="dsv-section-title">Validation Results</div>
        <div class="dsv-stats" id="dsv-stats">
          <div class="dsv-stat">
            <div class="dsv-stat-value" id="dsv-total-violations">-</div>
            <div class="dsv-stat-label">Violations</div>
          </div>
          <div class="dsv-stat">
            <div class="dsv-stat-value" id="dsv-total-elements">-</div>
            <div class="dsv-stat-label">Elements</div>
          </div>
        </div>
      </div>

      <div class="dsv-section">
        <div class="dsv-section-title">Issues Found</div>
        <div class="dsv-violations" id="dsv-violations">
          <div class="dsv-empty">
            <svg class="dsv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>Click "Validate Page" to check for inconsistencies</p>
          </div>
        </div>
      </div>

      <div class="dsv-actions">
        <button class="dsv-btn" id="dsv-validate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Validate Page
        </button>
        <button class="dsv-btn dsv-btn-secondary" id="dsv-export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export
        </button>
      </div>
    </div>
  `;
  return panel;
}

function makeDraggable(header: HTMLElement, panel: HTMLElement): void {
  let isDragging = false;
  let startX: number, startY: number;
  let initialLeft: number, initialTop: number;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.margin = '0';
    panel.style.top = `${initialTop}px`;
    panel.style.left = `${initialLeft}px`;
    panel.style.right = 'auto';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function updateStats(report: ValidationReport): void {
  if (!shadowRoot) return;
  const totalViolationsEl = shadowRoot.getElementById('dsv-total-violations');
  const totalElementsEl = shadowRoot.getElementById('dsv-total-elements');
  const violationsListEl = shadowRoot.getElementById('dsv-violations');

  if (totalViolationsEl) {
    totalViolationsEl.textContent = String(report.violations.length);
    totalViolationsEl.className = `dsv-stat-value ${report.violations.length > 0 ? 'error' : ''}`;
  }

  if (totalElementsEl) {
    totalElementsEl.textContent = String(report.totalElements);
  }

  if (violationsListEl) {
    if (report.violations.length === 0) {
      violationsListEl.innerHTML = `
        <div class="dsv-empty">
          <svg class="dsv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>No violations found! Your page follows the design system.</p>
        </div>
      `;
    } else {
      const grouped = report.violations.slice(0, 20).reduce(
        (acc, v) => {
          acc[v.type] = acc[v.type] || [];
          acc[v.type].push(v);
          return acc;
        },
        {} as Record<string, Violation[]>
      );

      violationsListEl.innerHTML = Object.entries(grouped)
        .map(([type, violations]) =>
          violations
            .map(
              (v) => `
            <div class="dsv-violation ${v.severity}" data-violation-id="${v.id}">
              <div class="dsv-violation-type">${type}</div>
              <div class="dsv-violation-message">${v.message}</div>
              ${v.actualValue ? `<div class="dsv-violation-value">${v.actualValue}</div>` : ''}
            </div>
          `
            )
            .join('')
        )
        .join('');

      // Add click handlers to highlight elements
      violationsListEl.querySelectorAll('.dsv-violation').forEach((el) => {
        el.addEventListener('click', () => {
          const violationId = el.getAttribute('data-violation-id');
          const violation = report.violations.find((v) => v.id === violationId);
          if (violation) {
            violation.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (state.highlightingEnabled) {
              highlightElement(violation.element, violation.severity);
            }
          }
        });
      });
    }
  }
}

function highlightElement(element: HTMLElement, severity: 'error' | 'warning'): void {
  const className = severity === 'error' ? 'dsv-highlight-error' : 'dsv-highlight';
  element.classList.add(className);
  setTimeout(() => {
    element.classList.remove(className);
  }, 2000);
}

function updateHighlights(): void {
  // Remove all existing highlights
  document.querySelectorAll('.dsv-highlight, .dsv-highlight-error').forEach((el) => {
    el.classList.remove('dsv-highlight', 'dsv-highlight-error');
  });

  if (!state.highlightingEnabled) return;

  // Add highlights to violations
  for (const violation of state.violations) {
    const className = violation.severity === 'error' ? 'dsv-highlight-error' : 'dsv-highlight';
    violation.element.classList.add(className);
  }
}

function exportReport(report: ValidationReport): void {
  const data = {
    ...report,
    violations: report.violations.map((v) => ({
      ...v,
      element: v.element.tagName,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `design-system-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function attachEventListeners(): void {
  if (!shadowRoot) return;

  const closeBtn = shadowRoot.getElementById('dsv-close');
  const presetSelect = shadowRoot.getElementById('dsv-preset') as HTMLSelectElement;
  const highlightToggle = shadowRoot.getElementById('dsv-highlight-toggle');
  const validateBtn = shadowRoot.getElementById('dsv-validate');
  const exportBtn = shadowRoot.getElementById('dsv-export');
  const header = shadowRoot.getElementById('dsv-header');

  if (closeBtn) {
    closeBtn.addEventListener('click', disable);
  }

  if (presetSelect) {
    presetSelect.value = state.currentPreset;
    presetSelect.addEventListener('change', (e) => {
      state.currentPreset = (e.target as HTMLSelectElement).value;
      if (state.report) {
        const report = validate();
        updateStats(report);
        updateHighlights();
      }
    });
  }

  if (highlightToggle) {
    highlightToggle.addEventListener('click', () => {
      state.highlightingEnabled = !state.highlightingEnabled;
      const switchEl = shadowRoot?.getElementById('dsv-switch');
      if (switchEl) {
        switchEl.classList.toggle('active', state.highlightingEnabled);
      }
      updateHighlights();
    });
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', () => {
      validateBtn.textContent = 'Validating...';
      (validateBtn as HTMLButtonElement).disabled = true;

      requestAnimationFrame(() => {
        const report = validate();
        updateStats(report);
        updateHighlights();
        validateBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Validate Page
        `;
        (validateBtn as HTMLButtonElement).disabled = false;
      });
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (state.report) {
        exportReport(state.report);
      } else {
        alert('Please validate the page first before exporting.');
      }
    });
  }

  if (header && panelElement) {
    makeDraggable(header, panelElement);
  }
}

function createUI(): void {
  if (shadowHost || shadowRoot) return;

  shadowHost = document.createElement('div');
  shadowHost.id = 'dsv-shadow-host';
  shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';

  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = STYLES;
  shadowRoot.appendChild(styleSheet);

  panelElement = createPanel();
  shadowRoot.appendChild(panelElement);

  document.body.appendChild(shadowHost);

  attachEventListeners();
}

function destroyUI(): void {
  // Remove all highlights
  document.querySelectorAll('.dsv-highlight, .dsv-highlight-error').forEach((el) => {
    el.classList.remove('dsv-highlight', 'dsv-highlight-error');
  });

  // Remove shadow host
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    shadowRoot = null;
    panelElement = null;
  }
}

// ============================================================================
// Public API
// ============================================================================

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

  createUI();

  // Auto-run validation if desired
  // const report = validate();
  // updateStats(report);
}

/**
 * Disable the Design System Validator
 */
export function disable(): void {
  if (!state.enabled) return;

  state.enabled = false;
  destroyUI();
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
export function getState(): ValidatorState {
  return { ...state };
}

/**
 * Set custom design system tokens
 */
export function setCustomTokens(tokens: DesignSystemTokens): void {
  state.customTokens = tokens;
  state.currentPreset = 'custom';

  if (shadowRoot) {
    const presetSelect = shadowRoot.getElementById('dsv-preset') as HTMLSelectElement;
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

  if (shadowRoot) {
    const presetSelect = shadowRoot.getElementById('dsv-preset') as HTMLSelectElement;
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

  if (shadowRoot) {
    const violationsListEl = shadowRoot.getElementById('dsv-violations');
    const totalViolationsEl = shadowRoot.getElementById('dsv-total-violations');
    const totalElementsEl = shadowRoot.getElementById('dsv-total-elements');

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

// ============================================================================
// Default Export
// ============================================================================

export default {
  enable,
  disable,
  toggle,
  getState,
  validate,
  setCustomTokens,
  setPreset,
  clear,
  PRESETS,
};
