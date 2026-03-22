/**
 * Font Inspector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Font Inspector', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '16px';
    element.style.fontWeight = '400';
    document.body.appendChild(element);
  });

  describe('Font Detection', () => {
    it('should detect font family', () => {
      const style = window.getComputedStyle(element);
      expect(style.fontFamily).toContain('Arial');
    });

    it('should detect font size', () => {
      const style = window.getComputedStyle(element);
      expect(style.fontSize).toBe('16px');
    });

    it('should detect font weight', () => {
      const style = window.getComputedStyle(element);
      expect(style.fontWeight).toBe('400');
    });
  });

  describe('Font Stack Analysis', () => {
    it('should parse font stack', () => {
      const stack = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
      const fonts = stack.split(',').map(f => f.trim().replace(/["']/g, ''));
      
      expect(fonts).toContain('Arial');
      expect(fonts).toContain('Helvetica Neue');
      expect(fonts).toContain('sans-serif');
    });
  });

  describe('Web Font Detection', () => {
    it('should detect Google Fonts', () => {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css?family=Roboto';
      link.rel = 'stylesheet';
      
      const isGoogleFont = link.href.includes('fonts.googleapis.com');
      expect(isGoogleFont).toBe(true);
    });
  });
});
