/**
 * Responsive Testing Tests
 *
 * Tests the report generation, storage operations, and breakpoint configuration
 * for the responsive-testing content script tool.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import responsiveTesting, {
  DEFAULT_BREAKPOINTS,
  getReports,
  getReport,
  deleteReport,
  generateHTMLReport,
  exportReport,
} from '@/content/responsive-testing';
import type { ResponsiveReport, Breakpoint, ScreenshotResult } from '@/content/responsive-testing';

describe('ResponsiveTesting', () => {
  // --- Default breakpoints ---

  it('should provide default breakpoints', () => {
    expect(DEFAULT_BREAKPOINTS.length).toBeGreaterThan(0);

    const names = DEFAULT_BREAKPOINTS.map((b) => b.name);
    expect(names).toContain('Mobile S');
    expect(names).toContain('Tablet');
    expect(names).toContain('Desktop');
  });

  it('should have valid breakpoint structure', () => {
    for (const bp of DEFAULT_BREAKPOINTS) {
      expect(bp.name).toBeTruthy();
      expect(bp.width).toBeGreaterThan(0);
      expect(bp.height).toBeGreaterThan(0);
    }
  });

  it('should have breakpoints in ascending width order', () => {
    for (let i = 1; i < DEFAULT_BREAKPOINTS.length; i++) {
      expect(DEFAULT_BREAKPOINTS[i].width).toBeGreaterThanOrEqual(
        DEFAULT_BREAKPOINTS[i - 1].width
      );
    }
  });

  // --- Report generation ---

  it('should generate HTML report from a report object', () => {
    const mockScreenshot: ScreenshotResult = {
      breakpoint: { name: 'Mobile', width: 375, height: 667, device: 'iPhone 8' },
      dataUrl: 'data:image/png;base64,test',
      fileSize: 1024,
      timestamp: Date.now(),
      issues: [
        {
          type: 'overflow',
          severity: 'warning',
          description: 'Element exceeds viewport',
        },
      ],
    };

    const report: ResponsiveReport = {
      id: 'test-report',
      url: 'https://example.com',
      title: 'Test Page',
      createdAt: Date.now(),
      breakpoints: [mockScreenshot.breakpoint],
      screenshots: [mockScreenshot],
      summary: {
        totalBreakpoints: 1,
        issuesFound: 1,
        errors: 0,
        warnings: 1,
      },
    };

    const html = generateHTMLReport(report);
    expect(html).toContain('Responsive Test Report');
    expect(html).toContain('Test Page');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Mobile');
    expect(html).toContain('375');
    expect(html).toContain('667');
    expect(html).toContain('overflow');
  });

  it('should include issue counts in HTML report', () => {
    const report: ResponsiveReport = {
      id: 'test-report',
      url: 'https://example.com',
      title: 'Test',
      createdAt: Date.now(),
      breakpoints: [],
      screenshots: [],
      summary: {
        totalBreakpoints: 3,
        issuesFound: 5,
        errors: 2,
        warnings: 3,
      },
    };

    const html = generateHTMLReport(report);
    expect(html).toContain('3'); // totalBreakpoints
    expect(html).toContain('2'); // errors
    expect(html).toContain('3'); // warnings
  });

  // --- Report storage ---

  it('should get empty reports list initially', async () => {
    const reports = await getReports();
    expect(Array.isArray(reports)).toBe(true);
  });

  it('should return null for non-existent report', async () => {
    const report = await getReport('non-existent-id');
    expect(report).toBeNull();
  });

  it('should delete a report without error', async () => {
    // Deleting non-existent report should not throw
    await expect(deleteReport('non-existent-id')).resolves.toBeUndefined();
  });

  // --- Export ---

  it('should export report as Blob', async () => {
    const report: ResponsiveReport = {
      id: 'export-test',
      url: 'https://example.com',
      title: 'Export Test',
      createdAt: Date.now(),
      breakpoints: [],
      screenshots: [],
      summary: {
        totalBreakpoints: 0,
        issuesFound: 0,
        errors: 0,
        warnings: 0,
      },
    };

    const blob = await exportReport(report);
    expect(blob).toBeInstanceOf(Blob);

    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe('export-test');
  });

  // --- Default export ---

  it('should have expected methods on default export', () => {
    expect(responsiveTesting.runResponsiveTesting).toBeTypeOf('function');
    expect(responsiveTesting.getReports).toBeTypeOf('function');
    expect(responsiveTesting.getReport).toBeTypeOf('function');
    expect(responsiveTesting.deleteReport).toBeTypeOf('function');
    expect(responsiveTesting.generateHTMLReport).toBeTypeOf('function');
    expect(responsiveTesting.exportReport).toBeTypeOf('function');
    expect(responsiveTesting.DEFAULT_BREAKPOINTS).toBeDefined();
  });
});
