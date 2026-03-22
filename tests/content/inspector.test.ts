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
});
