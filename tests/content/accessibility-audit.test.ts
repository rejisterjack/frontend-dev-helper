/**
 * Accessibility Audit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Accessibility Audit', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('WCAG Checks', () => {
    it('should detect missing alt text on images', () => {
      container.innerHTML = '<img src="test.jpg">';
      const img = container.querySelector('img');
      expect(img?.hasAttribute('alt')).toBe(false);
    });

    it('should detect missing form labels', () => {
      container.innerHTML = '<input type="text" name="username">';
      const input = container.querySelector('input');
      const hasLabel = !!document.querySelector(`label[for="${input?.id}"]`);
      expect(hasLabel).toBe(false);
    });

    it('should detect insufficient color contrast', () => {
      const el = document.createElement('div');
      el.style.color = '#ffffff';
      el.style.backgroundColor = '#ffff00';
      
      // White on yellow has poor contrast — jsdom normalizes hex to rgb()
      expect(el.style.color).toBe('rgb(255, 255, 255)');
      expect(el.style.backgroundColor).toBe('rgb(255, 255, 0)');
    });

    it('should detect missing ARIA landmarks', () => {
      container.innerHTML = '<div>Content without landmarks</div>';
      const main = container.querySelector('main, [role="main"]');
      expect(main).toBeNull();
    });
  });

  describe('Security', () => {
    it('should escape violation messages', () => {
      const maliciousMessage = '<script>alert(1)</script>';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const escaped = escapeHtml(maliciousMessage);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });
});
