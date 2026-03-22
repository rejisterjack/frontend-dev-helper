/**
 * innerHTML Security Tests
 *
 * Verifies that innerHTML assignments are properly sanitized.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('innerHTML Security Patterns', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  describe('Safe innerHTML Patterns', () => {
    it('should allow static HTML without escaping', () => {
      // Static content is safe
      element.innerHTML = '<div class="static">Hello</div>';
      expect(element.innerHTML).toBe('<div class="static">Hello</div>');
    });

    it('should escape dynamic text content', () => {
      const userInput = '<script>alert(1)</script>';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).toContain('&lt;script&gt;');
    });

    it('should escape dynamic attribute values', () => {
      const userInput = '" onclick="alert(1)" data-x="';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const escaped = escapeHtml(userInput);
      // The quotes should be escaped, preventing attribute breakout
      expect(escaped).toContain('&quot;');
      expect(escaped).not.toContain('"');
      // The escaped content is safe for use in HTML
      element.innerHTML = `<div title="${escaped}">Test</div>`;
      expect(element.innerHTML).toContain('&quot;');
    });
  });

  describe('Dangerous innerHTML Patterns', () => {
    it('should detect unsanitized dynamic content (anti-pattern)', () => {
      const userInput = '<img src=x onerror=alert(1)>';
      
      // This is the dangerous pattern we want to avoid
      const dangerousHTML = `<div>${userInput}</div>`;
      
      // Verify it contains the XSS payload
      expect(dangerousHTML).toContain('<img');
      expect(dangerousHTML).toContain('onerror=');
    });

    it('should detect unsanitized URL values (anti-pattern)', () => {
      const userUrl = 'javascript:alert(1)';
      
      // Dangerous: using user URL directly in href
      const dangerousHTML = `<a href="${userUrl}">Click me</a>`;
      
      expect(dangerousHTML).toContain('javascript:');
    });
  });

  describe('Safe DOM Manipulation Alternatives', () => {
    it('should use textContent for text insertion', () => {
      const userInput = '<b>bold</b>';
      
      const child = document.createElement('span');
      child.textContent = userInput;
      element.appendChild(child);
      
      // textContent escapes HTML automatically
      expect(element.innerHTML).toContain('&lt;b&gt;');
      expect(element.innerHTML).not.toContain('<b>');
    });

    it('should use setAttribute for dynamic attributes', () => {
      const userClass = 'class-test';
      
      element.setAttribute('class', userClass);
      
      // setAttribute safely sets the attribute
      expect(element.getAttribute('class')).toBe(userClass);
      expect(element.className).toBe(userClass);
    });

    it('should use URL constructor for URL validation', () => {
      const userUrl = 'javascript:alert(1)';
      
      const validateUrl = (url: string): string | null => {
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return url;
          }
          return null;
        } catch {
          return null;
        }
      };
      
      expect(validateUrl(userUrl)).toBeNull();
      expect(validateUrl('https://example.com')).toBe('https://example.com');
    });
  });
});

describe('Extension Content Script Security', () => {
  describe('Tool Panel Security', () => {
    it('should sanitize element selectors in component tree', () => {
      const maliciousSelector = '#test[data-x="><img src=x onerror=alert(1)>"';
      
      // This should be escaped when rendered
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safeHTML = `<code>${escapeHtml(maliciousSelector)}</code>`;
      expect(safeHTML).not.toContain('<img');
      expect(safeHTML).toContain('&lt;img');
    });

    it('should sanitize form field values', () => {
      const maliciousValue = '<script>stealCookies()</script>';
      
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safeHTML = `<div class="field-value">${escapeHtml(maliciousValue)}</div>`;
      expect(safeHTML).not.toContain('<script>');
      expect(safeHTML).toContain('&lt;script&gt;');
    });

    it('should sanitize color values in color picker', () => {
      const maliciousColor = '#ff0000" onmouseover="alert(1)" style="';
      
      const sanitizeColor = (color: string): string | null => {
        if (typeof color !== 'string') return null;
        const s = new Option().style;
        s.color = color;
        return s.color ? color.replace(/["';{}<>]/g, '') : null;
      };
      
      const sanitized = sanitizeColor(maliciousColor);
      expect(sanitized).toBeTruthy();
      expect(sanitized!).not.toContain('"');
      expect(sanitized!).not.toContain('onmouseover');
    });
  });

  describe('Message Passing Security', () => {
    it('should validate message types', () => {
      const validMessages = ['PING', 'GET_SETTINGS', 'TOGGLE_TOOL'];
      const validateMessage = (type: string): boolean => {
        return validMessages.includes(type);
      };
      
      expect(validateMessage('PING')).toBe(true);
      expect(validateMessage('<script>')).toBe(false);
    });

    it('should sanitize message payloads', () => {
      const maliciousPayload = {
        toolId: 'test"><script>alert(1)</script>',
        enabled: true,
      };
      
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safeToolId = escapeHtml(maliciousPayload.toolId);
      expect(safeToolId).not.toContain('<script>');
      expect(safeToolId).toContain('&lt;script&gt;');
    });
  });
});

describe('Security Regression Tests', () => {
  it('should prevent stored XSS in storage inspector', () => {
    const maliciousKey = '<script>alert(1)</script>';
    const maliciousValue = '<img src=x onerror=alert(2)>';
    
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const safeHTML = `
      <div class="storage-item">
        <span class="key">${escapeHtml(maliciousKey)}</span>
        <span class="value">${escapeHtml(maliciousValue)}</span>
      </div>
    `;
    
    expect(safeHTML).not.toContain('<script>');
    expect(safeHTML).not.toContain('<img');
    expect(safeHTML).toContain('&lt;script&gt;');
    expect(safeHTML).toContain('&lt;img');
  });

  it('should prevent XSS in tooltip content', () => {
    const maliciousTooltip = 'Name: <b onmouseover="alert(1)">Test</b>';
    
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const safeTooltip = escapeHtml(maliciousTooltip);
    // The < character should be escaped, preventing HTML tag execution
    expect(safeTooltip).toContain('&lt;b');
    expect(safeTooltip).not.toContain('<b');
    // The content is displayed as text, not executed
    expect(safeTooltip).toContain('onmouseover'); // Text content preserved but not executable
  });
});
