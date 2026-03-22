/**
 * Focus Debugger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Focus Debugger', () => {
  let container: HTMLElement;
  let input: HTMLInputElement;

  beforeEach(() => {
    container = document.createElement('div');
    input = document.createElement('input');
    input.type = 'text';
    container.appendChild(input);
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('Focus Tracking', () => {
    it('should track focus events', () => {
      const focusEvents: Event[] = [];
      input.addEventListener('focus', (e) => focusEvents.push(e));
      
      input.focus();
      expect(focusEvents.length).toBe(1);
    });

    it('should track blur events', () => {
      const blurEvents: Event[] = [];
      input.addEventListener('blur', (e) => blurEvents.push(e));
      
      input.focus();
      input.blur();
      expect(blurEvents.length).toBe(1);
    });

    it('should identify focusable elements', () => {
      const focusable = ['input', 'button', 'select', 'textarea', 'a[href]'];
      const isFocusable = (tag: string): boolean => 
        focusable.some(f => tag.toLowerCase().includes(f.replace(/\[.*\]/, '')));
      
      expect(isFocusable('input')).toBe(true);
      expect(isFocusable('div')).toBe(false);
    });
  });

  describe('Focus Order', () => {
    it('should calculate tab order', () => {
      const elements = [
        { tabIndex: 1 },
        { tabIndex: 0 },
        { tabIndex: 2 },
      ];

      const sorted = [...elements].sort((a, b) => a.tabIndex - b.tabIndex);
      expect(sorted[0].tabIndex).toBe(0);
      expect(sorted[2].tabIndex).toBe(2);
    });
  });
});
