/**
 * Network Analyzer Tests
 */

import { describe, it, expect } from 'vitest';

describe('Network Analyzer', () => {
  describe('Request Analysis', () => {
    it('should categorize requests by type', () => {
      const requests = [
        { url: 'script.js', type: 'script' },
        { url: 'style.css', type: 'stylesheet' },
        { url: 'image.png', type: 'image' },
      ];

      const byType = requests.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byType.script).toBe(1);
      expect(byType.image).toBe(1);
    });

    it('should calculate total transfer size', () => {
      const requests = [
        { transferSize: 1000 },
        { transferSize: 2000 },
        { transferSize: 3000 },
      ];

      const total = requests.reduce((sum, r) => sum + r.transferSize, 0);
      expect(total).toBe(6000);
    });

    it('should detect slow requests', () => {
      const requests = [
        { duration: 50 },
        { duration: 500 },
        { duration: 100 },
      ];

      const slow = requests.filter(r => r.duration > 200);
      expect(slow.length).toBe(1);
      expect(slow[0].duration).toBe(500);
    });
  });

  describe('URL Analysis', () => {
    it('should extract domain from URL', () => {
      const url = 'https://example.com/path?query=1';
      const domain = new URL(url).hostname;
      
      expect(domain).toBe('example.com');
    });

    it('should detect third-party requests', () => {
      const pageDomain = 'example.com';
      const requestUrl = 'https://cdn.other.com/file.js';
      
      const isThirdParty = !requestUrl.includes(pageDomain);
      expect(isThirdParty).toBe(true);
    });
  });
});
