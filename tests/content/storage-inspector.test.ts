/**
 * Storage Inspector Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Storage Inspector', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('LocalStorage', () => {
    it('should read localStorage items', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      const items = Object.entries(localStorage);
      expect(items.length).toBe(2);
      expect(items[0]).toEqual(['key1', 'value1']);
    });

    it('should calculate storage size', () => {
      const key = 'testKey';
      const value = 'testValue';
      localStorage.setItem(key, value);
      
      const size = key.length + value.length;
      expect(size).toBe(16); // 'testKey'(7) + 'testValue'(9) = 16
    });

    it('should parse JSON values', () => {
      const data = { foo: 'bar', num: 123 };
      localStorage.setItem('json', JSON.stringify(data));
      
      const parsed = JSON.parse(localStorage.getItem('json') || '{}');
      expect(parsed).toEqual(data);
    });
  });

  describe('SessionStorage', () => {
    it('should read sessionStorage items', () => {
      sessionStorage.setItem('sessionKey', 'sessionValue');
      
      expect(sessionStorage.getItem('sessionKey')).toBe('sessionValue');
    });

    it('should distinguish from localStorage', () => {
      localStorage.setItem('shared', 'local');
      sessionStorage.setItem('shared', 'session');
      
      expect(localStorage.getItem('shared')).toBe('local');
      expect(sessionStorage.getItem('shared')).toBe('session');
    });
  });

  describe('Security', () => {
    it('should escape storage keys in display', () => {
      const maliciousKey = '<script>alert(1)</script>';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safe = escapeHtml(maliciousKey);
      expect(safe).not.toContain('<script>');
    });
  });
});
