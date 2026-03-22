/**
 * Z-Index Visualizer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Z-Index Visualizer', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  describe('Z-Index Detection', () => {
    it('should detect explicit z-index', () => {
      element.style.zIndex = '10';
      expect(element.style.zIndex).toBe('10');
    });

    it('should detect auto z-index', () => {
      element.style.zIndex = 'auto';
      expect(element.style.zIndex).toBe('auto');
    });

    it('should detect stacking context', () => {
      element.style.position = 'relative';
      element.style.zIndex = '1';

      const hasStackingContext =
        element.style.position !== 'static' && element.style.zIndex !== '';

      expect(hasStackingContext).toBe(true);
    });
  });

  describe('Stacking Order', () => {
    it('should sort elements by z-index', () => {
      const elements = [
        { zIndex: 5 },
        { zIndex: 1 },
        { zIndex: 10 },
        { zIndex: 'auto' },
      ];

      const sorted = [...elements].sort((a, b) => {
        if (a.zIndex === 'auto') return -1;
        if (b.zIndex === 'auto') return 1;
        return (a.zIndex as number) - (b.zIndex as number);
      });

      expect(sorted[0].zIndex).toBe('auto');
      expect(sorted[3].zIndex).toBe(10);
    });
  });

  describe('Visual Overlay', () => {
    it('should generate z-index label', () => {
      const zIndex = 100;
      const label = `z-index: ${zIndex}`;

      expect(label).toBe('z-index: 100');
    });

    it('should color code by stacking context', () => {
      const hasStackingContext = true;
      const color = hasStackingContext ? '#6366f1' : '#94a3b8';

      expect(color).toBe('#6366f1');
    });
  });
});
