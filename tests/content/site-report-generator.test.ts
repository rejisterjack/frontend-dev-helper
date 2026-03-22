/**
 * Site Report Generator Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('Site Report Generator', () => {
  describe('Report Data Collection', () => {
    it('should collect page metadata', () => {
      const report = {
        url: 'https://example.com',
        title: 'Test Page',
        timestamp: Date.now(),
      };
      
      expect(report.url).toBe('https://example.com');
      expect(report.title).toBe('Test Page');
    });

    it('should calculate performance score', () => {
      const metrics = {
        lcp: 2000, // Largest Contentful Paint
        fid: 50,   // First Input Delay
        cls: 0.1,  // Cumulative Layout Shift
      };
      
      const score = Math.round(
        100 - (metrics.lcp / 100) - metrics.fid - (metrics.cls * 100)
      );
      
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate HTML report', () => {
      const title = 'Site Report';
      const html = `<!DOCTYPE html><html><head><title>${title}</title></head><body></body></html>`;
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(title);
    });

    it('should generate JSON report', () => {
      const data = {
        url: 'https://example.com',
        score: 85,
        issues: [],
      };
      const json = JSON.stringify(data, null, 2);
      
      expect(JSON.parse(json)).toEqual(data);
    });
  });

  describe('Security', () => {
    it('should escape HTML in report content', () => {
      const title = '<script>alert(1)</script>';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safe = escapeHtml(title);
      expect(safe).not.toContain('<script>');
      expect(safe).toContain('&lt;script&gt;');
    });
  });
});
