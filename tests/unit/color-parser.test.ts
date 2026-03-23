/**
 * Color Parser Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  checkContrastCompliance,
  extractCssVariableName,
  getContrastRatio,
  getContrastRatioFromStrings,
  getLuminance,
  hexToRgb,
  hslToRgb,
  isCssVariable,
  isLightColor,
  namedColorToRgb,
  parseColor,
  parseHsl,
  parseRgb,
  rgbToHex,
  rgbToString,
} from '../../src/utils/color-parser';

describe('Color Parser', () => {
  describe('hexToRgb', () => {
    it('parses 3-digit hex', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('parses 6-digit hex', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#3a86ff')).toEqual({ r: 58, g: 134, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 4-digit hex (with alpha)', () => {
      expect(hexToRgb('#ffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#f00f')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 8-digit hex (with alpha)', () => {
      expect(hexToRgb('#ffffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ff0000ff')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('returns null for invalid hex', () => {
      expect(hexToRgb('#gggggg')).toBeNull();
      expect(hexToRgb('#ff')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('parseRgb', () => {
    it('parses rgb() with commas', () => {
      expect(parseRgb('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseRgb('rgb(0, 255, 0)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(parseRgb('rgb(0, 0, 255)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    });

    it('parses rgb() with spaces', () => {
      expect(parseRgb('rgb(255 0 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseRgb('rgb( 128 , 64 , 32 )')).toEqual({ r: 128, g: 64, b: 32, a: 1 });
    });

    it('parses rgba() with alpha', () => {
      expect(parseRgb('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseRgb('rgba(255, 0, 0, 1)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseRgb('rgba(255, 0, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 0 });
    });

    it('parses rgba() with percentage alpha', () => {
      expect(parseRgb('rgba(255, 0, 0, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseRgb('rgba(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('handles modern space-separated syntax with slash', () => {
      expect(parseRgb('rgb(255 0 0 / 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('clamps values to valid range', () => {
      expect(parseRgb('rgb(300, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseRgb('rgb(-50, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('returns null for invalid rgb', () => {
      expect(parseRgb('rgb(255, 0)')).toBeNull();
      expect(parseRgb('rgb()')).toBeNull();
      expect(parseRgb('invalid')).toBeNull();
    });
  });

  describe('parseHsl', () => {
    it('parses hsl() with commas', () => {
      expect(parseHsl('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHsl('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(parseHsl('hsl(240, 100%, 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    });

    it('parses hsl() with spaces', () => {
      expect(parseHsl('hsl(0 100% 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('parses hsla() with alpha', () => {
      expect(parseHsl('hsla(0, 100%, 50%, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('parses hsl with modern slash syntax', () => {
      expect(parseHsl('hsl(0 100% 50% / 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });

    it('returns null for invalid hsl', () => {
      expect(parseHsl('hsl(0, 50%)')).toBeNull();
      expect(parseHsl('hsl()')).toBeNull();
    });
  });

  describe('namedColorToRgb', () => {
    it('parses basic named colors', () => {
      expect(namedColorToRgb('red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(namedColorToRgb('green')).toEqual({ r: 0, g: 128, b: 0 });
      expect(namedColorToRgb('blue')).toEqual({ r: 0, g: 0, b: 255 });
      expect(namedColorToRgb('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(namedColorToRgb('black')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('handles case-insensitive matching', () => {
      expect(namedColorToRgb('RED')).toEqual({ r: 255, g: 0, b: 0 });
      expect(namedColorToRgb('White')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles transparent', () => {
      expect(namedColorToRgb('transparent')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('parses extended named colors', () => {
      expect(namedColorToRgb('rebeccapurple')).toEqual({ r: 102, g: 51, b: 153 });
      expect(namedColorToRgb('coral')).toEqual({ r: 255, g: 127, b: 80 });
      expect(namedColorToRgb('cornflowerblue')).toEqual({ r: 100, g: 149, b: 237 });
    });

    it('returns null for unknown colors', () => {
      expect(namedColorToRgb('unknowncolor')).toBeNull();
      expect(namedColorToRgb('')).toBeNull();
    });
  });

  describe('parseColor', () => {
    it('parses all supported formats', () => {
      // Hex
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });

      // RGB
      expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });

      // HSL
      expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });

      // Named colors
      expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('handles transparent', () => {
      expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('handles invalid colors', () => {
      expect(parseColor('')).toBeNull();
      expect(parseColor('invalid')).toBeNull();
      expect(parseColor(null as unknown as string)).toBeNull();
      expect(parseColor(undefined as unknown as string)).toBeNull();
    });

    it('handles whitespace', () => {
      expect(parseColor('  red  ')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('  #ff0000  ')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('CSS Variable Functions', () => {
    it('detects CSS variables', () => {
      expect(isCssVariable('var(--primary)')).toBe(true);
      expect(isCssVariable('var(--color-primary, #ff0000)')).toBe(true);
      expect(isCssVariable('red')).toBe(false);
      expect(isCssVariable('#ff0000')).toBe(false);
    });

    it('extracts variable names', () => {
      expect(extractCssVariableName('var(--primary)')).toBe('--primary');
      expect(extractCssVariableName('var(--color-primary, #ff0000)')).toBe('--color-primary');
      expect(extractCssVariableName('red')).toBeNull();
    });
  });

  describe('Luminance and Contrast', () => {
    it('calculates luminance correctly', () => {
      // White has highest luminance
      expect(getLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 2);
      // Black has lowest luminance
      expect(getLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 2);
      // Mid gray
      expect(getLuminance({ r: 128, g: 128, b: 128 })).toBeGreaterThan(0.2);
    });

    it('calculates contrast ratio correctly', () => {
      // Black vs white = 21:1
      expect(getContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);

      // Same color = 1:1
      expect(getContrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 })).toBeCloseTo(
        1,
        1
      );

      // Black vs gray should be less than 21
      expect(
        getContrastRatio({ r: 0, g: 0, b: 0 }, { r: 128, g: 128, b: 128 })
      ).toBeLessThan(21);
    });

    it('calculates contrast from strings', () => {
      const ratio = getContrastRatioFromStrings('black', 'white');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns null for invalid colors in contrast calculation', () => {
      expect(getContrastRatioFromStrings('invalid', 'white')).toBeNull();
      expect(getContrastRatioFromStrings('black', 'invalid')).toBeNull();
    });
  });

  describe('WCAG Contrast Compliance', () => {
    it('checks AA compliance for normal text', () => {
      // Black on white passes
      const result = checkContrastCompliance('black', 'white', 'AA', false);
      expect(result.pass).toBe(true);
      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.required).toBe(4.5);

      // Light gray on white fails for normal text
      const failResult = checkContrastCompliance('#cccccc', 'white', 'AA', false);
      expect(failResult.pass).toBe(false);
    });

    it('checks AA compliance for large text (lower threshold)', () => {
      // Light gray that fails for normal text might pass for large text
      const normalResult = checkContrastCompliance('#999999', 'white', 'AA', false);
      const largeResult = checkContrastCompliance('#999999', 'white', 'AA', true);

      expect(normalResult.required).toBe(4.5);
      expect(largeResult.required).toBe(3);
    });

    it('checks AAA compliance (stricter)', () => {
      const aaResult = checkContrastCompliance('#666666', 'white', 'AA', false);
      const aaaResult = checkContrastCompliance('#666666', 'white', 'AAA', false);

      expect(aaResult.required).toBe(4.5);
      expect(aaaResult.required).toBe(7);
    });
  });

  describe('Color Conversion', () => {
    it('converts RGB to hex', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(rgbToHex({ r: 58, g: 134, b: 255 })).toBe('#3a86ff');
    });

    it('pads hex values correctly', () => {
      expect(rgbToHex({ r: 0, g: 15, b: 255 })).toBe('#000fff');
    });

    it('converts RGB to string', () => {
      expect(rgbToString({ r: 255, g: 0, b: 0 })).toBe('rgb(255, 0, 0)');
      expect(rgbToString({ r: 128, g: 64, b: 32 })).toBe('rgb(128, 64, 32)');
    });

    it('rounds RGB values', () => {
      expect(rgbToString({ r: 128.5, g: 64.2, b: 32.8 })).toBe('rgb(129, 64, 33)');
    });
  });

  describe('Light/Dark Detection', () => {
    it('detects light colors', () => {
      expect(isLightColor('white')).toBe(true);
      expect(isLightColor('#ffffff')).toBe(true);
      expect(isLightColor('yellow')).toBe(true);
    });

    it('detects dark colors', () => {
      expect(isLightColor('black')).toBe(false);
      expect(isLightColor('#000000')).toBe(false);
      expect(isLightColor('navy')).toBe(false);
    });

    it('works with RGB objects', () => {
      expect(isLightColor({ r: 255, g: 255, b: 255 })).toBe(true);
      expect(isLightColor({ r: 0, g: 0, b: 0 })).toBe(false);
    });
  });

  describe('HSL to RGB Conversion', () => {
    it('converts primary HSL colors to RGB', () => {
      // Red
      expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });

      // Green
      expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 });

      // Blue
      expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('handles grayscale (0% saturation)', () => {
      expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
      expect(hslToRgb({ h: 0, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 });
      expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles lightness variations', () => {
      // Dark red
      expect(hslToRgb({ h: 0, s: 100, l: 25 })).toEqual({ r: 128, g: 0, b: 0 });

      // Light red
      expect(hslToRgb({ h: 0, s: 100, l: 75 })).toEqual({ r: 255, g: 128, b: 128 });
    });
  });
});
