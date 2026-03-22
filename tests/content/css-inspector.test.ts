/**
 * CSS Inspector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('CSS Inspector', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  describe('Style Inspection', () => {
    it('should retrieve all computed styles', () => {
      element.style.cssText = 'color: red; font-size: 14px; padding: 10px;';
      
      const styles = window.getComputedStyle(element);
      expect(styles.color).toBeDefined();
      expect(styles.fontSize).toBeDefined();
    });

    it('should identify inline styles vs computed styles', () => {
      element.style.color = 'blue';
      
      const isInline = element.style.cssText.includes('color');
      expect(isInline).toBe(true);
    });
  });

  describe('Specificity Calculation', () => {
    it('should calculate selector specificity', () => {
      const calculateSpecificity = (selector: string): number => {
        const ids = (selector.match(/#/g) || []).length * 100;
        const classes = (selector.match(/\./g) || []).length * 10;
        const elements = (selector.match(/[a-z]/gi) || []).length;
        return ids + classes + elements;
      };

      expect(calculateSpecificity('#id')).toBeGreaterThan(calculateSpecificity('.class'));
    });
  });
});
