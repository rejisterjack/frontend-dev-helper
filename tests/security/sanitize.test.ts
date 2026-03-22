/**
 * Security Sanitization Tests
 *
 * Tests for XSS prevention utilities.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeColor, sanitizeUrl, sanitizeCssNumber, html, css } from '@/utils/sanitize';

describe('Security Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("'onclick='alert(1)")).toBe('&#x27;onclick=&#x27;alert(1)');
    });

    it('should escape backticks', () => {
      expect(escapeHtml('`javascript:alert(1)`')).toBe('&#x60;javascript:alert(1)&#x60;');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string values', () => {
      expect(escapeHtml(123 as unknown as string)).toBe('123');
      expect(escapeHtml(null as unknown as string)).toBe('null');
      expect(escapeHtml(undefined as unknown as string)).toBe('undefined');
    });

    it('should not modify safe strings', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('Safe text 123')).toBe('Safe text 123');
    });
  });

  describe('sanitizeColor', () => {
    it('should accept valid hex colors', () => {
      expect(sanitizeColor('#ff0000')).toBe('#ff0000');
      expect(sanitizeColor('#FFF')).toBe('#FFF');
    });

    it('should accept valid rgb colors', () => {
      expect(sanitizeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
      expect(sanitizeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should accept valid named colors', () => {
      expect(sanitizeColor('red')).toBe('red');
      expect(sanitizeColor('transparent')).toBe('transparent');
    });

    it('should reject invalid colors', () => {
      expect(sanitizeColor('invalid')).toBeNull();
      expect(sanitizeColor('')).toBeNull();
    });

    it('should strip dangerous characters from colors', () => {
      expect(sanitizeColor('#ff0000";}')).toBe('#ff0000');
      expect(sanitizeColor('red<script>')).toBe('redscript');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should accept valid http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should accept relative URLs', () => {
      expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource');
    });

    it('should reject javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    });

    it('should reject data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should reject vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull();
    });
  });

  describe('sanitizeCssNumber', () => {
    it('should return valid numbers as strings', () => {
      expect(sanitizeCssNumber(100)).toBe('100');
      expect(sanitizeCssNumber(3.14)).toBe('3.14');
    });

    it('should return 0 for NaN', () => {
      expect(sanitizeCssNumber(NaN)).toBe('0');
    });

    it('should return 0 for Infinity', () => {
      expect(sanitizeCssNumber(Infinity)).toBe('0');
      expect(sanitizeCssNumber(-Infinity)).toBe('0');
    });

    it('should cap extremely large values', () => {
      expect(sanitizeCssNumber(10000000)).toBe('1000000');
      expect(sanitizeCssNumber(-10000000)).toBe('-1000000');
    });
  });

  describe('html template tag', () => {
    it('should escape interpolated values', () => {
      const userContent = '<script>alert(1)</script>';
      const result = html`<div>${userContent}</div>`;
      expect(result).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
    });

    it('should handle multiple interpolations', () => {
      const name = '<b>John</b>';
      const message = 'Hello <i>World</i>';
      const result = html`<p>${name} says: ${message}</p>`;
      expect(result).toContain('&lt;b&gt;John&lt;/b&gt;');
      expect(result).toContain('&lt;i&gt;World&lt;/i&gt;');
    });

    it('should handle undefined and null', () => {
      const result = html`<div>${undefined} and ${null}</div>`;
      expect(result).toBe('<div> and </div>');
    });
  });

  describe('css template tag', () => {
    it('should sanitize color values', () => {
      const maliciousColor = '#ff0000"; background: url(javascript:alert(1))';
      const result = css`color: ${maliciousColor}`;
      expect(result).not.toContain('javascript');
      expect(result).not toContain('"');
    });

    it('should handle numeric values', () => {
      const size = 100;
      const result = css`width: ${size}px`;
      expect(result).toBe('width: 100px');
    });
  });
});

describe('XSS Prevention Integration', () => {
  it('should prevent XSS in color values', () => {
    const maliciousColor = '#ff0000" onclick="alert(1)"';
    const sanitized = sanitizeColor(maliciousColor);
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('"');
  });

  it('should prevent XSS in URLs', () => {
    const maliciousUrl = 'javascript:alert(document.cookie)';
    expect(sanitizeUrl(maliciousUrl)).toBeNull();
  });

  it('should prevent XSS in element IDs', () => {
    const maliciousId = 'test" onclick="alert(1)"';
    const escaped = escapeHtml(maliciousId);
    expect(escaped).toContain('&quot;');
    expect(escaped).not.toContain('"');
  });
});
