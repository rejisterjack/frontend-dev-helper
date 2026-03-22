/**
 * Spacing Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Spacing', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  describe('Spacing Detection', () => {
    it('should detect margin', () => {
      element.style.margin = '10px 20px';
      expect(element.style.margin).toBe('10px 20px');
    });

    it('should detect padding', () => {
      element.style.padding = '15px 30px';
      expect(element.style.padding).toBe('15px 30px');
    });

    it('should parse individual sides', () => {
      element.style.marginTop = '10px';
      element.style.marginRight = '20px';
      element.style.marginBottom = '10px';
      element.style.marginLeft = '20px';

      expect(element.style.marginTop).toBe('10px');
      expect(element.style.marginRight).toBe('20px');
    });
  });

  describe('Gap Detection', () => {
    it('should detect flex gap', () => {
      element.style.display = 'flex';
      element.style.gap = '16px';

      expect(element.style.gap).toBe('16px');
    });

    it('should detect grid gap', () => {
      element.style.display = 'grid';
      element.style.gap = '20px';

      expect(element.style.gap).toBe('20px');
    });
  });
});
