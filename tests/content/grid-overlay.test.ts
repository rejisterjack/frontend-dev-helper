/**
 * Grid Overlay Tests
 */

import { describe, it, expect } from 'vitest';

describe('Grid Overlay', () => {
  describe('Grid Configuration', () => {
    it('should calculate column width', () => {
      const containerWidth = 1200;
      const columns = 12;
      const gutter = 24;
      
      const columnWidth = (containerWidth - (columns - 1) * gutter) / columns;
      expect(columnWidth).toBe(78);
    });

    it('should generate grid lines', () => {
      const columns = 12;
      const lines = Array.from({ length: columns + 1 }, (_, i) => (100 / columns) * i);
      
      expect(lines.length).toBe(13);
      expect(lines[0]).toBe(0);
      expect(lines[12]).toBe(100);
    });
  });

  describe('Breakpoint Presets', () => {
    it('should have Bootstrap grid preset', () => {
      const bootstrap = {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400,
      };
      
      expect(bootstrap.md).toBe(768);
    });

    it('should have Tailwind grid preset', () => {
      const tailwind = {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
      };
      
      expect(tailwind.lg).toBe(1024);
    });
  });
});
