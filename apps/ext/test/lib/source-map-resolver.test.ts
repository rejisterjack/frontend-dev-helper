import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findSourceMapUrls,
  clearCache,
  resolvePosition,
} from '@/lib/source-map-resolver';

const mockOriginalPositionFor = vi.fn();
const mockDestroy = vi.fn();
const mockSourceContentFor = vi.fn();

// Mock the source-map module - SourceMapConsumer is used as a constructor
vi.mock('source-map', () => {
  return {
    SourceMapConsumer: class MockSourceMapConsumer {
      sources = ['webpack:///src/index.ts'];
      originalPositionFor = mockOriginalPositionFor;
      sourceContentFor = mockSourceContentFor;
      destroy = mockDestroy;
    },
  };
});

describe('source-map-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear DOM using textContent instead of innerHTML
    const head = document.head;
    while (head.firstChild) {
      head.removeChild(head.firstChild);
    }
    clearCache();
  });

  describe('findSourceMapUrls', () => {
    it('finds script source maps', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/bundle.js';
      document.head.appendChild(script);

      const results = findSourceMapUrls();

      expect(results.length).toBeGreaterThanOrEqual(1);
      const scriptResult = results.find((r) => r.url === 'https://example.com/bundle.js');
      expect(scriptResult).toBeDefined();
      expect(scriptResult!.sourceMapUrl).toContain('.map');
    });

    it('finds inline script source maps', () => {
      const script = document.createElement('script');
      script.textContent = 'console.log("test");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9u';
      document.head.appendChild(script);

      const results = findSourceMapUrls();

      const inlineResult = results.find((r) => r.url === '(inline script)');
      expect(inlineResult).toBeDefined();
      expect(inlineResult!.sourceMapUrl).toContain('data:application/json;base64,');
    });

    it('finds stylesheet source maps', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://example.com/styles.css';
      document.head.appendChild(link);

      const results = findSourceMapUrls();

      const cssResult = results.find((r) => r.url === 'https://example.com/styles.css');
      expect(cssResult).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('clears consumer cache without error', () => {
      expect(() => clearCache()).not.toThrow();
    });
  });

  describe('resolvePosition', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('returns null for invalid source map', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await resolvePosition('https://example.com/nonexistent.map', 1, 0);
      expect(result).toBeNull();
    });

    it('handles inline source maps (data: URL)', async () => {
      // Create a minimal valid source map as base64
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        mappings: 'AAAA',
        names: [],
      });
      const base64 = btoa(sourceMap);
      const dataUrl = `data:application/json;base64,${base64}`;

      mockOriginalPositionFor.mockReturnValue({
        source: 'index.ts',
        line: 10,
        column: 5,
        name: 'myFunction',
      });

      const result = await resolvePosition(dataUrl, 1, 0);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('index.ts');
      expect(result!.line).toBe(10);
      expect(result!.column).toBe(5);
      expect(result!.name).toBe('myFunction');
    });

    it('returns null when position has no source', async () => {
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        mappings: 'AAAA',
        names: [],
      });
      const base64 = btoa(sourceMap);
      const dataUrl = `data:application/json;base64,${base64}`;

      mockOriginalPositionFor.mockReturnValue({ source: null, line: null, column: null });

      const result = await resolvePosition(dataUrl, 1, 0);
      expect(result).toBeNull();
    });
  });
});
