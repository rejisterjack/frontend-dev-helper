/**
 * Color Utilities for FrontendDevHelper
 * Provides conversion functions between color formats and analysis utilities
 */

export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Parse a CSS color string to RGBA object
 */
export function parseColor(color: string): RGBA | null {
  // Create a temporary element to compute the color
  const temp = document.createElement('div');
  temp.style.color = color;
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  document.body.appendChild(temp);

  const computedColor = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;

  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const cleanHex = hex.replace('#', '');
  
  // Handle shorthand (#RGB)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  
  // Handle standard (#RRGGBB)
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return { r, g, b };
  }
  
  return null;
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert RGB values to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/**
 * Convert RGB values to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL values to RGB
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

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
  };
}

/**
 * Convert HSL to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Calculate luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  if (!c1 || !c2) return 0;
  
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color meets WCAG AA standard
 */
export function meetsWCAGAA(foreground: string, background: string, largeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color meets WCAG AAA standard
 */
export function meetsWCAGAAA(foreground: string, background: string, largeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get WCAG compliance rating
 * Returns 'AAA' if meets AAA, 'AA' if meets AA, 'FAIL' otherwise
 */
export function getWCAGRating(ratio: number): 'AAA' | 'AA' | 'FAIL' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

/**
 * Format RGB object to CSS string
 */
export function formatRgb(r: number, g: number, b: number, a = 1): string {
  if (a < 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Format HSL object to CSS string
 */
export function formatHsl(h: number, s: number, l: number, a = 1): string {
  if (a < 1) {
    return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Normalize hex color (ensure 6 digits with #)
 */
export function normalizeHex(hex: string): string {
  const clean = hex.replace('#', '').toLowerCase();
  if (clean.length === 3) {
    return '#' + clean.split('').map(c => c + c).join('');
  }
  return '#' + clean;
}

/**
 * Calculate color distance using Euclidean distance in RGB space
 */
export function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Group similar colors using simple clustering
 */
export function groupSimilarColors(colors: string[], threshold = 30): string[][] {
  const rgbColors: { original: string; rgb: RGB }[] = [];
  
  for (const color of colors) {
    const parsed = parseColor(color);
    if (parsed) {
      rgbColors.push({ original: color, rgb: { r: parsed.r, g: parsed.g, b: parsed.b } });
    }
  }

  const groups: string[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < rgbColors.length; i++) {
    if (used.has(i)) continue;

    const group: string[] = [rgbColors[i].original];
    used.add(i);

    for (let j = i + 1; j < rgbColors.length; j++) {
      if (used.has(j)) continue;
      
      const distance = colorDistance(rgbColors[i].rgb, rgbColors[j].rgb);
      if (distance <= threshold) {
        group.push(rgbColors[j].original);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Extract dominant colors from a canvas image data
 */
export function extractDominantColors(
  imageData: ImageData,
  colorCount = 5
): { color: string; count: number }[] {
  const { data, width, height } = imageData;
  const colorMap = new Map<string, number>();
  const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 10000)));

  // Sample pixels
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      // Quantize colors to group similar ones
      const quantizedR = Math.round(r / 16) * 16;
      const quantizedG = Math.round(g / 16) * 16;
      const quantizedB = Math.round(b / 16) * 16;

      const hex = rgbToHex(quantizedR, quantizedG, quantizedB);
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }
  }

  // Sort by frequency and return top colors
  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, colorCount * 3);

  // Merge similar colors
  const result: { color: string; count: number }[] = [];
  const merged = new Set<string>();

  for (const [color, count] of sorted) {
    if (merged.has(color)) continue;

    let totalCount = count;
    const rgb1 = hexToRgb(color)!;

    for (const [otherColor, otherCount] of sorted) {
      if (color === otherColor || merged.has(otherColor)) continue;

      const rgb2 = hexToRgb(otherColor);
      if (rgb2 && colorDistance(rgb1, rgb2) < 40) {
        totalCount += otherCount;
        merged.add(otherColor);
      }
    }

    result.push({ color, count: totalCount });
    merged.add(color);

    if (result.length >= colorCount) break;
  }

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Copy color to clipboard in the specified format
 */
export async function copyColorToClipboard(
  color: string,
  format: ColorFormat = 'hex'
): Promise<boolean> {
  try {
    const parsed = parseColor(color);
    if (!parsed) return false;

    let formatted: string;

    switch (format) {
      case 'rgb':
        formatted = formatRgb(parsed.r, parsed.g, parsed.b);
        break;
      case 'rgba':
        formatted = formatRgb(parsed.r, parsed.g, parsed.b, parsed.a);
        break;
      case 'hsl': {
        const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
        formatted = formatHsl(hsl.h, hsl.s, hsl.l, parsed.a);
        break;
      }
      case 'hex':
      default:
        formatted = rgbToHex(parsed.r, parsed.g, parsed.b);
        break;
    }

    await navigator.clipboard.writeText(formatted);
    return true;
  } catch (error) {
    console.error('Failed to copy color:', error);
    return false;
  }
}

/**
 * Generate CSS variables from color palette
 */
export function generateCSSVariables(
  colors: { name: string; value: string }[],
  prefix = '--color'
): string {
  return colors
    .map(({ name, value }) => `${prefix}-${name}: ${value};`)
    .join('\n');
}

/**
 * Export palette as JSON
 */
export function exportPaletteAsJSON(
  colors: { name: string; value: string; rgb?: RGB; hsl?: HSL }[]
): string {
  const exportData = colors.map(({ name, value }) => {
    const parsed = parseColor(value);
    const rgb = parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : undefined;
    const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : undefined;
    
    return {
      name,
      hex: normalizeHex(value),
      rgb,
      hsl,
    };
  });

  return JSON.stringify(exportData, null, 2);
}
