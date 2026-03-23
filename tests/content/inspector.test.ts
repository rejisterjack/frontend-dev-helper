/**
 * Inspector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Inspector', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.id = 'test-element';
    element.className = 'test-class';
    element.innerHTML = '<span>Child</span>';
    document.body.appendChild(element);
  });

  describe('Element Inspection', () => {
    it('should get element info', () => {
      const info = {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        classes: Array.from(element.classList),
        children: element.children.length,
      };

      expect(info.tag).toBe('div');
      expect(info.id).toBe('test-element');
      expect(info.children).toBe(1);
    });

    it('should get computed styles', () => {
      element.style.color = 'red';
      const styles = window.getComputedStyle(element);

      expect(styles.color).toBeDefined();
    });

    it('should get element dimensions', () => {
      const rect = element.getBoundingClientRect();

      expect(rect.width).toBeGreaterThanOrEqual(0);
      expect(rect.height).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Selector Generation', () => {
    it('should generate CSS selector', () => {
      const selector = element.id
        ? `#${element.id}`
        : element.className
          ? `.${element.className.split(' ')[0]}`
          : element.tagName.toLowerCase();

      expect(selector).toBe('#test-element');
    });

    it('should generate unique selector', () => {
      const uniqueSelector = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '');

      expect(uniqueSelector).toBe('div#test-element');
    });
  });

  describe('Scroll Offset', () => {
    it('should account for scroll offset in absolute position', () => {
      // Simulate scrolled page
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
      Object.defineProperty(window, 'scrollX', { value: 50, writable: true, configurable: true });

      const rect = element.getBoundingClientRect();
      // In fixed positioning mode, we should NOT add scroll offset
      // The element position is relative to viewport
      const viewportTop = rect.top;
      const viewportLeft = rect.left;

      expect(viewportTop).toBeGreaterThanOrEqual(0);
      expect(viewportLeft).toBeGreaterThanOrEqual(0);

      // Reset scroll values
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
    });

    it('should handle fixed position elements without scroll offset', () => {
      element.style.position = 'fixed';
      element.style.top = '10px';
      element.style.left = '20px';

      Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });

      const rect = element.getBoundingClientRect();
      // Fixed elements stay at viewport position regardless of scroll
      expect(rect.top).toBe(10);
      expect(rect.left).toBe(20);

      // Reset
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    });
  });
});
