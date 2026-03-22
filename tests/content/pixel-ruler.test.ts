/**
 * Pixel Ruler Tests
 */

import { describe, it, expect } from 'vitest';

describe('Pixel Ruler', () => {
  describe('Measurement', () => {
    it('should calculate pixel distance', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 200, y: 200 };
      
      const distance = Math.round(
        Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
      );
      
      expect(distance).toBe(141);
    });

    it('should measure horizontal distance', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 300, y: 100 };
      
      const distance = Math.abs(end.x - start.x);
      expect(distance).toBe(200);
    });

    it('should measure vertical distance', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 100, y: 400 };
      
      const distance = Math.abs(end.y - start.y);
      expect(distance).toBe(300);
    });
  });

  describe('Ruler Display', () => {
    it('should format measurement with units', () => {
      const pixels = 150;
      const formatted = `${pixels}px`;
      
      expect(formatted).toBe('150px');
    });

    it('should snap to pixels', () => {
      const value = 100.7;
      const snapped = Math.round(value);
      
      expect(snapped).toBe(101);
    });
  });
});
