/**
 * Color Parser Utility
 *
 * Comprehensive CSS color parser supporting all standard color formats:
 * - Hex: #fff, #ffffff, #fff0, #ffffff00
 * - RGB/RGBA: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
 * - HSL/HSLA: hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.5)
 * - Named colors: red, white, transparent, etc.
 * - CSS variables: var(--color-primary) with resolution
 */

import { logger } from './logger';

/** RGB color tuple */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** RGBA color tuple */
export interface RGBA extends RGB {
  a: number;
}

/** HSL color tuple */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

// ============================================
// CSS Named Colors Map
// ============================================

const NAMED_COLORS: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

// ============================================
// Color Parsing Functions
// ============================================

/**
 * Parse a hex color string to RGB
 * Supports: #fff, #ffffff, #fff0, #ffffff00
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # prefix
  const cleanHex = hex.replace('#', '');

  // Handle 3-digit hex (#fff)
  if (cleanHex.length === 3) {
    const r = Number.parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = Number.parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = Number.parseInt(cleanHex[2] + cleanHex[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  // Handle 4-digit hex (#fff0 with alpha)
  if (cleanHex.length === 4) {
    const r = Number.parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = Number.parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = Number.parseInt(cleanHex[2] + cleanHex[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  // Handle 6-digit hex (#ffffff)
  if (cleanHex.length === 6) {
    const r = Number.parseInt(cleanHex.substring(0, 2), 16);
    const g = Number.parseInt(cleanHex.substring(2, 4), 16);
    const b = Number.parseInt(cleanHex.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  // Handle 8-digit hex (#ffffff00 with alpha)
  if (cleanHex.length === 8) {
    const r = Number.parseInt(cleanHex.substring(0, 2), 16);
    const g = Number.parseInt(cleanHex.substring(2, 4), 16);
    const b = Number.parseInt(cleanHex.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  return null;
}

/**
 * Parse RGB/RGBA color string
 * Supports: rgb(255, 0, 0), rgba(255, 0, 0, 0.5), rgb(255 0 0), rgb(255 0 0 / 50%)
 */
export function parseRgb(rgbStr: string): RGBA | null {
  const trimmed = rgbStr.trim();

  // Check for comma-separated format: rgb(r, g, b) or rgba(r, g, b, a)
  const commaMatch = trimmed.match(
    /^rgba?\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*(?:,\s*(-?\d+\.?\d*%?))?\s*\)$/i
  );

  if (commaMatch) {
    const r = Math.min(255, Math.max(0, Number.parseFloat(commaMatch[1])));
    const g = Math.min(255, Math.max(0, Number.parseFloat(commaMatch[2])));
    const b = Math.min(255, Math.max(0, Number.parseFloat(commaMatch[3])));
    let a = 1;

    if (commaMatch[4]) {
      if (commaMatch[4].endsWith('%')) {
        a = Number.parseFloat(commaMatch[4]) / 100;
      } else {
        a = Number.parseFloat(commaMatch[4]);
      }
      a = Math.min(1, Math.max(0, a));
    }

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
      return null;
    }

    return { r, g, b, a };
  }

  // Check for space-separated format: rgb(r g b) or rgb(r g b / a)
  const spaceMatch = trimmed.match(
    /^rgba?\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*(?:\/\s*(-?\d+\.?\d*%?))?\s*\)$/i
  );

  if (spaceMatch) {
    const r = Math.min(255, Math.max(0, Number.parseFloat(spaceMatch[1])));
    const g = Math.min(255, Math.max(0, Number.parseFloat(spaceMatch[2])));
    const b = Math.min(255, Math.max(0, Number.parseFloat(spaceMatch[3])));
    let a = 1;

    if (spaceMatch[4]) {
      if (spaceMatch[4].endsWith('%')) {
        a = Number.parseFloat(spaceMatch[4]) / 100;
      } else {
        a = Number.parseFloat(spaceMatch[4]);
      }
      a = Math.min(1, Math.max(0, a));
    }

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
      return null;
    }

    return { r, g, b, a };
  }

  return null;
}

/**
 * Parse HSL/HSLA color string to RGB
 * Supports: hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.5)
 */
export function parseHsl(hslStr: string): RGBA | null {
  // Match hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const match = hslStr.match(
    /hsla?\(\s*(\d+\.?\d*)\s*,?\s*(\d+\.?\d*)%\s*,?\s*(\d+\.?\d*)%\s*(?:[,/]?\s*(\d+\.?\d*%?))?\s*\)/i
  );

  if (!match) return null;

  const h = Number.parseFloat(match[1]) / 360;
  const s = Number.parseFloat(match[2]) / 100;
  const l = Number.parseFloat(match[3]) / 100;
  let a = 1;

  if (match[4]) {
    if (match[4].endsWith('%')) {
      a = Number.parseFloat(match[4]) / 100;
    } else {
      a = Number.parseFloat(match[4]);
    }
    a = Math.min(1, Math.max(0, a));
  }

  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l) || Number.isNaN(a)) {
    return null;
  }

  // HSL to RGB conversion
  const rgb = hslToRgb({ h: h * 360, s: s * 100, l: l * 100 });
  return { ...rgb, a };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const sNormalized = s / 100;
  const lNormalized = l / 100;

  const c = (1 - Math.abs(2 * lNormalized - 1)) * sNormalized;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNormalized - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Parse a named color to RGB
 */
export function namedColorToRgb(name: string): RGB | null {
  const lowerName = name.toLowerCase().trim();
  const hexValue = NAMED_COLORS[lowerName];

  if (!hexValue) return null;

  // Handle transparent specially
  if (lowerName === 'transparent') {
    return { r: 0, g: 0, b: 0 };
  }

  return hexToRgb(hexValue);
}

/**
 * Check if a string is a CSS variable reference
 */
export function isCssVariable(color: string): boolean {
  return color.trim().startsWith('var(');
}

/**
 * Extract CSS variable name from var() expression
 */
export function extractCssVariableName(color: string): string | null {
  const match = color.match(/var\(\s*(--[^,)]+)/);
  return match ? match[1] : null;
}

/**
 * Resolve a CSS variable to its actual color value
 * Requires a DOM element context to resolve computed styles
 */
export function resolveCssVariable(
  varExpression: string,
  element?: Element
): string | null {
  const varName = extractCssVariableName(varExpression);
  if (!varName) return null;

  // If element provided, try to get computed style
  if (element) {
    const computedStyle = window.getComputedStyle(element);
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value) return value;
  }

  // Try document root as fallback
  const rootValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (rootValue) return rootValue;

  // Try to extract fallback from var() expression
  const fallbackMatch = varExpression.match(/var\([^,]+,\s*([^)]+)\)/);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }

  return null;
}

// ============================================
// Main Parse Function
// ============================================

/**
 * Parse any CSS color string to RGB values
 * Supports all standard CSS color formats including variables
 *
 * @param color - The CSS color string to parse
 * @param element - Optional element context for resolving CSS variables
 * @returns RGB values or null if parsing fails
 *
 * @example
 * parseColor('#ff0000') // { r: 255, g: 0, b: 0 }
 * parseColor('rgb(255, 0, 0)') // { r: 255, g: 0, b: 0 }
 * parseColor('red') // { r: 255, g: 0, b: 0 }
 * parseColor('var(--primary)', element) // resolves CSS variable
 */
export function parseColor(color: string, element?: Element): RGB | null {
  if (!color || typeof color !== 'string') return null;

  const trimmedColor = color.trim().toLowerCase();

  // Handle transparent
  if (trimmedColor === 'transparent') {
    return { r: 0, g: 0, b: 0 };
  }

  // Handle CSS variables
  if (isCssVariable(trimmedColor)) {
    const resolved = resolveCssVariable(trimmedColor, element);
    if (resolved && resolved !== trimmedColor) {
      // Prevent infinite recursion
      return parseColor(resolved, element);
    }
    return null;
  }

  // Handle hex colors
  if (trimmedColor.startsWith('#')) {
    return hexToRgb(trimmedColor);
  }

  // Handle RGB/RGBA
  if (trimmedColor.startsWith('rgb')) {
    const rgba = parseRgb(trimmedColor);
    if (!rgba) return null;
    return { r: rgba.r, g: rgba.g, b: rgba.b };
  }

  // Handle HSL/HSLA
  if (trimmedColor.startsWith('hsl')) {
    const hsla = parseHsl(trimmedColor);
    if (!hsla) return null;
    return { r: hsla.r, g: hsla.g, b: hsla.b };
  }

  // Handle named colors
  const namedColor = namedColorToRgb(trimmedColor);
  if (namedColor) return namedColor;

  // Try browser's built-in color parser as last resort for unknown formats
  // But only if it looks like it might be a color (contains numbers or specific patterns)
  if (/\d/.test(trimmedColor) || trimmedColor.includes('color(')) {
    return parseWithBrowser(trimmedColor);
  }

  return null;
}

/**
 * Parse color using the browser's built-in CSS parser
 * This handles edge cases and proprietary color formats
 */
function parseWithBrowser(color: string): RGB | null {
  try {
    // Create a temporary element to use the browser's parser
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);

    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    // Parse the computed rgb() value
    const rgba = parseRgb(computedColor);
    if (rgba) {
      return { r: rgba.r, g: rgba.g, b: rgba.b };
    }

    return null;
  } catch (error) {
    logger.warn('[ColorParser] Browser parsing failed:', error);
    return null;
  }
}

// ============================================
// Contrast and Luminance Utilities
// ============================================

/**
 * Calculate relative luminance of an RGB color
 * Based on WCAG 2.0 formula
 */
export function getLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;

  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two RGB colors
 * Returns ratio from 1 (same color) to 21 (black vs white)
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate contrast ratio from color strings
 * Convenience wrapper that parses colors and calculates ratio
 */
export function getContrastRatioFromStrings(
  foreground: string,
  background: string,
  element?: Element
): number | null {
  const fg = parseColor(foreground, element);
  const bg = parseColor(background, element);

  if (!fg || !bg) return null;

  return getContrastRatio(fg, bg);
}

/**
 * Check if two colors have very low contrast (effectively the same)
 */
export function hasVeryLowContrast(color1: string, color2: string, element?: Element): boolean {
  // Direct string comparison for exact matches
  if (color1.toLowerCase().trim() === color2.toLowerCase().trim()) return true;

  // Check contrast ratio
  const ratio = getContrastRatioFromStrings(color1, color2, element);
  if (ratio === null) return false;

  // Ratio of 1.05 or less means essentially same color
  return ratio <= 1.05;
}

/**
 * Check if a color meets WCAG contrast requirements
 *
 * @param foreground - Foreground color
 * @param background - Background color
 * @param level - WCAG level: 'AA' or 'AAA'
 * @param largeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Object with pass/fail status and actual ratio
 */
export function checkContrastCompliance(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  largeText = false
): { pass: boolean; ratio: number | null; required: number } {
  const ratio = getContrastRatioFromStrings(foreground, background);

  if (ratio === null) {
    return { pass: false, ratio: null, required: 0 };
  }

  const required = level === 'AAA' ? (largeText ? 4.5 : 7) : largeText ? 3 : 4.5;

  return {
    pass: ratio >= required,
    ratio,
    required,
  };
}

// ============================================
// Color Conversion Utilities
// ============================================

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to RGB string
 */
export function rgbToString(rgb: RGB): string {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

/**
 * Determine if a color is light or dark
 * Useful for choosing text color (black/white) for contrast
 */
export function isLightColor(color: string | RGB, element?: Element): boolean {
  const rgb = typeof color === 'string' ? parseColor(color, element) : color;
  if (!rgb) return false;

  // Calculate perceived brightness using YIQ formula
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128;
}

/**
 * Get suggested text color (black or white) for maximum contrast
 */
export function getContrastTextColor(backgroundColor: string, element?: Element): '#000000' | '#ffffff' {
  return isLightColor(backgroundColor, element) ? '#000000' : '#ffffff';
}

// ============================================
// Legacy Compatibility
// ============================================

/**
 * @deprecated Use parseColor() instead
 * Legacy RGB parser for backwards compatibility
 */
export function parseRGB(color: string): { r: number; g: number; b: number } | null {
  return parseColor(color);
}
