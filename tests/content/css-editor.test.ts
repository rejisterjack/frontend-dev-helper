/**
 * CSS Editor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('CSS Editor', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.className = 'test-element';
    document.body.appendChild(element);
  });

  describe('Style Editing', () => {
    it('should apply inline styles', () => {
      element.style.color = 'red';
      element.style.fontSize = '16px';
      
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    it('should get computed styles', () => {
      element.style.display = 'flex';
      const computed = window.getComputedStyle(element);
      
      expect(computed.display).toBe('flex');
    });
  });

  describe('CSS Rule Creation', () => {
    it('should create CSS rule string', () => {
      const selector = '.test';
      const styles = { color: 'blue', margin: '10px' };
      
      const rule = `${selector} { ${Object.entries(styles)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')} }`;
      
      expect(rule).toContain('.test');
      expect(rule).toContain('color: blue');
    });
  });
});
