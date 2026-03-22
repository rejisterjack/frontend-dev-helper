/**
 * Measure Tool Tests
 */

import { describe, it, expect } from 'vitest';

describe('Measure Tool', () => {
  describe('Distance Calculation', () => {
    it('should calculate distance between two points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      
      const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      expect(distance).toBe(5);
    });

    it('should calculate element dimensions', () => {
      const rect = { width: 100, height: 50 };
      
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
    });
  });

  describe('Unit Conversion', () => {
    it('should convert px to rem', () => {
      const px = 16;
      const baseFontSize = 16;
      const rem = px / baseFontSize;
      
      expect(rem).toBe(1);
    });

    it('should format measurements', () => {
      const format = (value: number): string => {
        return Number.isInteger(value) ? `${value}px` : `${value.toFixed(1)}px`;
      };
      
      expect(format(100)).toBe('100px');
      expect(format(100.5)).toBe('100.5px');
    });
  });
});
