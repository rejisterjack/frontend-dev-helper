/**
 * Color Validation Utilities
 * Functions for parsing, normalizing, and validating colors
 */

import type { DesignSystemTokens } from '../types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
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

export function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function normalizeColor(color: string): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;
  if (parsed.a < 0.5) return 'transparent';
  return rgbToHex(parsed.r, parsed.g, parsed.b).toLowerCase();
}

export function isColorInPalette(color: string, palette: string[], tolerance = 10): boolean {
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

export function getAllColors(tokens: DesignSystemTokens): string[] {
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
