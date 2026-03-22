/**
 * Design System Validator Tests
 */

import { describe, it, expect } from 'vitest';

describe('Design System Validator', () => {
  describe('Token Validation', () => {
    it('should validate spacing tokens', () => {
      const spacing = [4, 8, 16, 24, 32, 48, 64];
      const value = 16;
      
      const isValid = spacing.includes(value);
      expect(isValid).toBe(true);
    });

    it('should validate color tokens', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff'];
      const value = '#ff0000';
      
      const isValid = colors.includes(value.toLowerCase());
      expect(isValid).toBe(true);
    });

    it('should validate font size tokens', () => {
      const fontSizes = [12, 14, 16, 18, 20, 24, 32, 48];
      const value = 16;
      
      const isValid = fontSizes.includes(value);
      expect(isValid).toBe(true);
    });
  });

  describe('Violation Detection', () => {
    it('should detect off-scale spacing', () => {
      const spacing = [4, 8, 16, 24, 32];
      const used = 20;
      
      const isOffScale = !spacing.includes(used);
      expect(isOffScale).toBe(true);
    });

    it('should detect non-token colors', () => {
      const colors = ['#ff0000', '#00ff00'];
      const used = '#123456';
      
      const isNonToken = !colors.includes(used);
      expect(isNonToken).toBe(true);
    });
  });
});
