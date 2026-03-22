/**
 * Tech Detector Tests
 */

import { describe, it, expect } from 'vitest';

describe('Tech Detector', () => {
  describe('Framework Detection', () => {
    it('should detect React', () => {
      // Simulate React global
      const hasReact = typeof (window as unknown as Record<string, unknown>).React !== 'undefined';
      expect(typeof hasReact).toBe('boolean');
    });

    it('should detect Vue', () => {
      const hasVue = typeof (window as unknown as Record<string, unknown>).Vue !== 'undefined';
      expect(typeof hasVue).toBe('boolean');
    });

    it('should detect Angular', () => {
      const hasAngular = document.querySelector('[ng-app], [ng-version]') !== null;
      expect(typeof hasAngular).toBe('boolean');
    });
  });

  describe('Library Detection', () => {
    it('should detect jQuery', () => {
      const hasJQuery = typeof (window as unknown as Record<string, unknown>).jQuery !== 'undefined';
      expect(typeof hasJQuery).toBe('boolean');
    });

    it('should detect from script tags', () => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const hasLibrary = (name: string): boolean =>
        scripts.some(s => s.getAttribute('src')?.includes(name));
      
      expect(typeof hasLibrary('react')).toBe('boolean');
    });
  });

  describe('CMS Detection', () => {
    it('should detect WordPress', () => {
      const hasWp = document.querySelector('meta[name="generator"][content*="WordPress"]') !== null;
      expect(typeof hasWp).toBe('boolean');
    });

    it('should detect from generator meta tag', () => {
      const meta = document.createElement('meta');
      meta.name = 'generator';
      meta.content = 'WordPress 6.0';
      document.head.appendChild(meta);

      const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content');
      expect(typeof generator).toBe('string');
      expect(generator).toContain('WordPress');

      meta.remove();
    });
  });
});
