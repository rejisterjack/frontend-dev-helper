import { describe, it, expect, vi, beforeEach } from 'vitest';

// The highlight-engine module is mocked in setup.ts
import { HighlightEngine, generateSelector, getComputedStyles } from '@/content/highlight-engine';

describe('highlight-engine (mocked)', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  describe('generateSelector', () => {
    it('should generate ID selector for elements with id', () => {
      const el = document.createElement('div');
      el.id = 'test-element';
      document.body.appendChild(el);
      const selector = generateSelector(el);
      expect(selector).toBe('#test-element');
    });

    it('should generate tag selector for plain elements', () => {
      const el = document.createElement('p');
      document.body.appendChild(el);
      const selector = generateSelector(el);
      expect(selector).toContain('p');
    });
  });

  describe('getComputedStyles', () => {
    it('should return style properties', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const styles = getComputedStyles(el);
      expect(styles).toBeDefined();
      expect(typeof styles).toBe('object');
    });
  });

  describe('HighlightEngine', () => {
    it('should create a HighlightEngine instance', () => {
      const engine = new HighlightEngine({
        color: '#3b82f6',
        showLabel: true,
        getLabel: (el) => el.tagName.toLowerCase(),
      });
      expect(engine).toBeDefined();
    });

    it('should start and stop without error', () => {
      const engine = new HighlightEngine({
        color: '#3b82f6',
      });
      expect(() => engine.start()).not.toThrow();
      expect(() => engine.stop()).not.toThrow();
    });

    it('should handle click callback', () => {
      const onClick = vi.fn();
      const engine = new HighlightEngine({
        color: '#3b82f6',
        onClick,
      });
      engine.start();
      engine.stop();
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
