/**
 * Tests for Export Manager Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExportManager,
  ExportError,
  exportManager,
  type ExportScope,
  type ScreenshotAnnotation,
  type PDFOptions,
} from '../src/content/export-manager';

describe('ExportManager', () => {
  let manager: ExportManager;

  beforeEach(() => {
    ExportManager.resetInstance();
    manager = ExportManager.getInstance();

    // Mock DOM APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        createElement: vi.fn((tag: string) => ({
          tagName: tag.toUpperCase(),
          style: {},
          click: vi.fn(),
          setAttribute: vi.fn(),
          getContext: vi.fn(() => ({
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillText: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            scale: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            drawImage: vi.fn(),
          })),
          toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          querySelectorAll: vi.fn(() => []),
        },
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        title: 'Test Page',
      },
      writable: true,
    });

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'https://example.com' },
        innerWidth: 1920,
        innerHeight: 1080,
        scrollX: 0,
        scrollY: 0,
        getComputedStyle: vi.fn(() => ({
          getPropertyValue: vi.fn(),
          item: vi.fn(),
          length: 0,
          display: 'block',
          visibility: 'visible',
          backgroundColor: 'white',
          borderWidth: '0',
          borderColor: 'black',
        })),
        navigator: { userAgent: 'Test Agent' },
        matchMedia: vi.fn(),
      },
      writable: true,
    });

    // Mock performance
    Object.defineProperty(global, 'performance', {
      value: {
        timing: {
          loadEventEnd: 1000,
          navigationStart: 0,
          domContentLoadedEventEnd: 500,
        },
        getEntriesByType: vi.fn(() => []),
        memory: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ExportManager.getInstance();
      const instance2 = ExportManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = ExportManager.getInstance();
      ExportManager.resetInstance();
      const instance2 = ExportManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('exportAsJSON', () => {
    it('should export data as JSON', () => {
      const data = { test: 'data', number: 123 };
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      manager.exportAsJSON(data);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should use custom filename', () => {
      const data = { test: 'data' };
      const createElementSpy = vi.spyOn(document, 'createElement');

      manager.exportAsJSON(data, 'custom-report');

      const anchorElement = createElementSpy.mock.results.find(
        (r) => r.value.tagName === 'A'
      )?.value;
      expect(anchorElement?.download).toContain('custom-report');
    });
  });

  describe('exportAsPDF', () => {
    it('should export data as HTML (printable PDF)', () => {
      const data = { test: 'data' };
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      manager.exportAsPDF(data);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should accept PDF options', () => {
      const data = { test: 'data' };
      const options: Partial<PDFOptions> = {
        title: 'Custom Report',
        subtitle: 'Test Subtitle',
        theme: 'dark',
      };

      expect(() => manager.exportAsPDF(data, options)).not.toThrow();
    });
  });

  describe('exportAsMarkdown', () => {
    it('should export data as Markdown', () => {
      const data = {
        timestamp: Date.now(),
        version: '1.0.0',
        pageInfo: {
          url: 'https://example.com',
          title: 'Test',
          viewport: { width: 1920, height: 1080 },
        },
        techStack: { frameworks: ['React'], libraries: [], detected: {} },
        elements: [],
        performance: null,
        memory: null,
        screenshot: null,
        id: 'test-id',
      };
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      manager.exportAsMarkdown(data);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('captureScreenshot', () => {
    it('should capture screenshot using canvas fallback', async () => {
      const result = await manager.captureScreenshot();

      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should apply annotations when provided', async () => {
      const annotations: ScreenshotAnnotation[] = [
        {
          id: '1',
          type: 'rectangle',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          color: '#ff0000',
        },
      ];

      const result = await manager.captureScreenshot({ annotations });

      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should support different image formats', async () => {
      const result = await manager.captureScreenshot({
        format: 'jpeg',
        quality: 0.8,
      });

      expect(result).toBe('data:image/png;base64,mock');
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', async () => {
      const scope: ExportScope = {
        elements: true,
        performance: true,
        memory: true,
        pageInfo: true,
        screenshot: false,
      };

      const report = await manager.generateReport(scope);

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('pageInfo');
      expect(report).toHaveProperty('techStack');
      expect(report).toHaveProperty('version');
      expect(report.pageInfo.url).toBe('https://example.com');
    });

    it('should respect scope settings', async () => {
      const scope: ExportScope = {
        elements: false,
        performance: false,
        memory: false,
      };

      const report = await manager.generateReport(scope);

      expect(report.elements).toEqual([]);
      expect(report.performance).toBeNull();
      expect(report.memory).toBeNull();
    });
  });

  describe('captureElement', () => {
    it('should capture element data', () => {
      const mockElement = {
        tagName: 'DIV',
        id: 'test-id',
        className: 'test-class',
        getBoundingClientRect: () => ({
          width: 100,
          height: 100,
          top: 10,
          left: 10,
        }),
        children: { length: 2 },
        textContent: 'Test content',
        getAttribute: vi.fn((attr: string) => {
          if (attr === 'role') return 'button';
          if (attr === 'aria-label') return 'Test button';
          return null;
        }),
        parentElement: null,
      } as unknown as HTMLElement;

      const elementData = manager.captureElement(mockElement);

      expect(elementData.tag).toBe('div');
      expect(elementData.id).toBe('test-id');
      expect(elementData.class).toBe('test-class');
      expect(elementData.dimensions.width).toBe(100);
      expect(elementData.children).toBe(2);
    });

    it('should add element to captured elements list', () => {
      const mockElement = {
        tagName: 'SPAN',
        id: '',
        className: '',
        getBoundingClientRect: () => ({
          width: 50,
          height: 30,
          top: 0,
          left: 0,
        }),
        children: { length: 0 },
        textContent: 'Text',
        getAttribute: vi.fn(),
        parentElement: {
          tagName: 'DIV',
          children: [
            {
              tagName: 'SPAN',
              getBoundingClientRect: () => ({ width: 50, height: 30 }),
            },
          ],
        } as unknown as HTMLElement,
      } as unknown as HTMLElement;

      manager.clearCapturedElements();
      manager.captureElement(mockElement);

      expect(manager.getCapturedElements()).toHaveLength(1);
    });
  });

  describe('captured elements management', () => {
    it('should clear captured elements', () => {
      manager.clearCapturedElements();
      expect(manager.getCapturedElements()).toHaveLength(0);
    });

    it('should return copy of captured elements', () => {
      const elements = manager.getCapturedElements();
      elements.push({} as never);
      expect(manager.getCapturedElements()).toHaveLength(0);
    });
  });

  describe('generateShareableLink', () => {
    it('should generate share link data', async () => {
      const report = {
        id: 'test-id',
        timestamp: Date.now(),
        pageInfo: {
          url: 'https://example.com',
          title: 'Test',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Test',
        },
        elements: [],
        performance: null,
        memory: null,
        techStack: { frameworks: [], libraries: [], detected: {} },
        screenshot: null,
        version: '1.0.0',
      };

      const linkData = await manager.generateShareableLink(report);

      expect(linkData).toHaveProperty('id');
      expect(linkData).toHaveProperty('url');
      expect(linkData.accessCount).toBe(0);
    });

    it('should set expiration when provided', async () => {
      const report = {
        id: 'test-id',
        timestamp: Date.now(),
        pageInfo: {
          url: 'https://example.com',
          title: 'Test',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Test',
        },
        elements: [],
        performance: null,
        memory: null,
        techStack: { frameworks: [], libraries: [], detected: {} },
        screenshot: null,
        version: '1.0.0',
      };

      const linkData = await manager.generateShareableLink(report, 7);

      expect(linkData.expiresAt).toBeDefined();
      expect(linkData.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('copyShareLink', () => {
    it('should copy link to clipboard', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
        },
        writable: true,
      });

      const linkData = {
        id: 'test-id',
        url: 'https://example.com/share/test',
        accessCount: 0,
      };

      await manager.copyShareLink(linkData);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(linkData.url);
    });

    it('should use fallback when clipboard API fails', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
      });

      const execCommandSpy = vi.fn(() => true);
      Object.defineProperty(document, 'execCommand', {
        value: execCommandSpy,
      });

      const linkData = {
        id: 'test-id',
        url: 'https://example.com/share/test',
        accessCount: 0,
      };

      // Should not throw
      await expect(manager.copyShareLink(linkData)).resolves.not.toThrow();
    });
  });

  describe('ExportError', () => {
    it('should create error with code and details', () => {
      const error = new ExportError('Test error', 'TEST_CODE', { detail: 'info' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('ExportError');
    });
  });
});

describe('exportManager singleton export', () => {
  it('should export singleton instance', () => {
    expect(exportManager).toBeInstanceOf(ExportManager);
  });
});
