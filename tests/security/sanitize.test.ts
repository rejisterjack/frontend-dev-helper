/**
 * Security Sanitization Tests
 *
 * Tests for XSS prevention utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeColor,
  sanitizeUrl,
  sanitizeCssNumber,
  sanitizeClassName,
  sanitizeDimension,
  sanitizeId,
  createTextNode,
  setTextContent,
  html,
  css,
} from '@/utils/sanitize';

describe('Security Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      // escapeHtml also escapes / as &#x2F;
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape single quotes', () => {
      // escapeHtml also escapes = as &#x3D;
      expect(escapeHtml("'onclick='alert(1)")).toBe('&#x27;onclick&#x3D;&#x27;alert(1)');
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

    it('should reject colors with dangerous characters', () => {
      // isValidColor rejects strings with dangerous chars — sanitizeColor returns null
      expect(sanitizeColor('#ff0000";}')).toBeNull();
      expect(sanitizeColor('red<script>')).toBeNull();
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
      // escapeHtml escapes / as &#x2F; so </script> becomes &lt;&#x2F;script&gt;
      const userContent = '<script>alert(1)</script>';
      const result = html`<div>${userContent}</div>`;
      expect(result).toBe('<div>&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</div>');
    });

    it('should handle multiple interpolations', () => {
      const name = '<b>John</b>';
      const message = 'Hello <i>World</i>';
      const result = html`<p>${name} says: ${message}</p>`;
      // / is also escaped so </b> and </i> become &lt;&#x2F;b&gt; etc.
      expect(result).toContain('&lt;b&gt;John&lt;&#x2F;b&gt;');
      expect(result).toContain('Hello &lt;i&gt;World&lt;&#x2F;i&gt;');
    });

    it('should handle undefined and null', () => {
      const result = html`<div>${undefined} and ${null}</div>`;
      expect(result).toBe('<div> and </div>');
    });
  });

  describe('css template tag', () => {
    it('should strip dangerous characters from CSS values', () => {
      // The css tag strips ";{}<> from values that don't match the color: prefix check
      const maliciousValue = 'red"; background: url(evil)';
      const result = css`color: ${maliciousValue}`;
      // Semicolons and quotes are stripped by the general case
      expect(result).not.toContain('"');
      expect(result).not.toContain(';');
    });

    it('should handle numeric values', () => {
      const size = 100;
      const result = css`width: ${size}px`;
      expect(result).toBe('width: 100px');
    });
  });
});

describe('sanitizeClassName', () => {
  it('should allow valid class name characters', () => {
    expect(sanitizeClassName('my-class')).toBe('my-class');
    expect(sanitizeClassName('foo_bar123')).toBe('foo_bar123');
  });

  it('should strip dangerous characters', () => {
    expect(sanitizeClassName('class"><script>')).toBe('classscript');
    expect(sanitizeClassName('my class')).toBe('myclass');
  });

  it('should handle non-string input', () => {
    expect(sanitizeClassName(null as unknown as string)).toBe('');
    expect(sanitizeClassName(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeDimension', () => {
  it('should accept valid pixel dimensions', () => {
    expect(sanitizeDimension('100px')).toBe('100px');
    expect(sanitizeDimension('-50px')).toBe('-50px');
    expect(sanitizeDimension('1.5rem')).toBe('1.5rem');
  });

  it('should accept percentage values', () => {
    expect(sanitizeDimension('50%')).toBe('50%');
    expect(sanitizeDimension('100vh')).toBe('100vh');
  });

  it('should reject invalid dimensions', () => {
    expect(sanitizeDimension('invalid')).toBe('0px');
    expect(sanitizeDimension('"><script>')).toBe('0px');
    expect(sanitizeDimension('')).toBe('0px');
  });

  it('should handle non-string input', () => {
    expect(sanitizeDimension(null as unknown as string)).toBe('0px');
  });
});

describe('sanitizeId', () => {
  it('should allow valid ID characters', () => {
    expect(sanitizeId('my-id')).toBe('my-id');
    expect(sanitizeId('fdh_tool:123')).toBe('fdh_tool:123');
  });

  it('should strip dangerous characters', () => {
    expect(sanitizeId('id"><img')).toBe('idimg');
    expect(sanitizeId('id onload=x')).toBe('idonloadx');
  });

  it('should handle non-string input', () => {
    expect(sanitizeId(null as unknown as string)).toBe('');
  });
});

describe('createTextNode', () => {
  it('should create a text node with content', () => {
    const node = createTextNode('Hello World');
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.textContent).toBe('Hello World');
  });

  it('should not execute HTML when inserted', () => {
    const container = document.createElement('div');
    const node = createTextNode('<script>alert(1)</script>');
    container.appendChild(node);
    expect(container.innerHTML).toContain('&lt;script&gt;');
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('setTextContent', () => {
  it('should set text content safely', () => {
    const el = document.createElement('div');
    setTextContent(el, '<b>bold</b>');
    expect(el.innerHTML).toContain('&lt;b&gt;');
    expect(el.querySelector('b')).toBeNull();
  });

  it('should overwrite existing content', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>old</span>';
    setTextContent(el, 'new content');
    expect(el.textContent).toBe('new content');
    expect(el.querySelector('span')).toBeNull();
  });
});

describe('XSS Prevention Integration', () => {
  it('should prevent XSS in color values', () => {
    // sanitizeColor returns null for invalid/malicious colors — null itself is safe
    const maliciousColor = '#ff0000" onclick="alert(1)"';
    const sanitized = sanitizeColor(maliciousColor);
    expect(sanitized).toBeNull();
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
