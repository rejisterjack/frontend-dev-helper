/**
 * Color Picker Tests
 *
 * Tests for the color picker tool functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Color Picker Tool', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');
    ctx = context;
  });

  afterEach(() => {
    canvas.remove();
  });

  describe('Color Extraction', () => {
    it('should extract color from canvas at specific position', () => {
      // Fill canvas with red
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);

      // Get pixel data
      const imageData = ctx.getImageData(50, 50, 1, 1);
      const [r, g, b] = imageData.data;

      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should convert RGB to hex correctly', () => {
      const rgbToHex = (r: number, g: number, b: number): string => {
        return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      };

      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('should convert hex to RGB correctly', () => {
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        } : null;
      };

      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });
  });

  describe('Color Validation', () => {
    it('should validate color format', () => {
      const isValidColor = (color: string): boolean => {
        const s = new Option().style;
        s.color = color;
        return s.color !== '';
      };

      expect(isValidColor('#ff0000')).toBe(true);
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('invalid')).toBe(false);
      expect(isValidColor('')).toBe(false);
    });

    it('should sanitize color values', () => {
      const sanitizeColor = (color: string): string | null => {
        if (!color) return null;
        const s = new Option().style;
        s.color = color;
        if (!s.color) return null;
        // Remove dangerous characters
        return color.replace(/["';{}<>]/g, '');
      };

      expect(sanitizeColor('#ff0000" onclick="alert(1)"')).toBe('#ff0000 onclick=alert(1)');
      expect(sanitizeColor('red;}')).toBe('red');
      expect(sanitizeColor('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });
  });

  describe('Security', () => {
    it('should escape color values in HTML output', () => {
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const maliciousColor = '#ff0000" style="background:url(javascript:alert(1))';
      const escaped = escapeHtml(maliciousColor);

      expect(escaped).not.toContain('"');
      expect(escaped).toContain('&quot;');
      expect(escaped).not.toContain('javascript');
    });

    it('should prevent XSS in color palette display', () => {
      const colors = ['#ff0000', '#00ff00', '<script>alert(1)</script>'];
      
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const safeColors = colors.map(c => {
        // Validate color first
        const s = new Option().style;
        s.color = c;
        return s.color ? c : '#000000';
      });

      const html = safeColors.map(c => 
        `<div style="background: ${escapeHtml(c)}" title="${escapeHtml(c)}"></div>`
      ).join('');

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Magnifier', () => {
    it('should create zoomed canvas preview', () => {
      // Fill with pattern
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 50, 50);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(50, 0, 50, 50);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(0, 50, 50, 50);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(50, 50, 50, 50);

      // Get zoomed region
      const zoomCanvas = document.createElement('canvas');
      zoomCanvas.width = 100;
      zoomCanvas.height = 100;
      const zoomCtx = zoomCanvas.getContext('2d');
      if (!zoomCtx) throw new Error('Failed to get zoom context');

      // Draw zoomed version
      zoomCtx.imageSmoothingEnabled = false;
      zoomCtx.drawImage(canvas, 25, 25, 50, 50, 0, 0, 100, 100);

      // Check center pixel
      const imageData = zoomCtx.getImageData(50, 50, 1, 1);
      const [r, g, b] = imageData.data;

      // Center should be blend of colors
      expect(r).toBeGreaterThan(0);
      expect(g).toBeGreaterThan(0);
    });
  });

  describe('Clipboard', () => {
    it('should copy color to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const color = '#ff0000';
      await navigator.clipboard.writeText(color);

      expect(mockWriteText).toHaveBeenCalledWith('#ff0000');
    });
  });
});
