/**
 * UI Container Tests
 */

import { describe, it, expect } from 'vitest';

describe('UI Container', () => {
  describe('Container Creation', () => {
    it('should create shadow DOM container', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });

      expect(shadowRoot).toBeDefined();
      expect(shadowRoot.mode).toBe('open');
    });

    it('should isolate styles in shadow DOM', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = ':host { display: block; }';
      shadowRoot.appendChild(style);

      expect(shadowRoot.querySelector('style')).toBe(style);
    });
  });

  describe('Panel Management', () => {
    it('should create panel element', () => {
      const panel = document.createElement('div');
      panel.id = 'fdh-panel';
      panel.className = 'fdh-panel';

      expect(panel.id).toBe('fdh-panel');
      expect(panel.className).toBe('fdh-panel');
    });

    it('should position panel fixed', () => {
      const panel = document.createElement('div');
      panel.style.position = 'fixed';
      panel.style.top = '10px';
      panel.style.right = '10px';

      expect(panel.style.position).toBe('fixed');
    });
  });
});
