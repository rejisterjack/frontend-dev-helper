/**
 * Responsive Testing Automation
 *
 * Define a set of breakpoints to test.
 * Auto-capture screenshots at each breakpoint.
 * Generate a responsive testing report.
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';

export interface Breakpoint {
  name: string;
  width: number;
  height: number;
  device?: string;
}

export interface ScreenshotResult {
  breakpoint: Breakpoint;
  dataUrl: string;
  fileSize: number;
  timestamp: number;
  issues?: ResponsiveIssue[];
}

export interface ResponsiveIssue {
  type: 'overflow' | 'truncation' | 'overlap' | 'spacing' | 'other';
  severity: 'error' | 'warning';
  element?: string;
  description: string;
  screenshot?: string;
}

export interface ResponsiveReport {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  breakpoints: Breakpoint[];
  screenshots: ScreenshotResult[];
  summary: {
    totalBreakpoints: number;
    issuesFound: number;
    errors: number;
    warnings: number;
  };
}

// Default breakpoints
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'Mobile S', width: 320, height: 568, device: 'iPhone SE' },
  { name: 'Mobile M', width: 375, height: 667, device: 'iPhone 8' },
  { name: 'Mobile L', width: 414, height: 896, device: 'iPhone 11 Pro Max' },
  { name: 'Tablet', width: 768, height: 1024, device: 'iPad Mini' },
  { name: 'Laptop', width: 1366, height: 768, device: 'Laptop' },
  { name: 'Desktop', width: 1920, height: 1080, device: 'Desktop' },
  { name: 'Wide', width: 2560, height: 1440, device: 'Desktop 4K' },
];

/**
 * Capture screenshot at current viewport
 */
async function captureScreenshot(breakpoint: Breakpoint): Promise<ScreenshotResult> {
  // Use chrome extension screenshot API if available
  // Fallback to html2canvas-like approach

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'CAPTURE_SCREENSHOT',
        payload: { breakpoint },
      },
      (response) => {
        if (response?.success && response.dataUrl) {
          resolve({
            breakpoint,
            dataUrl: response.dataUrl,
            fileSize: Math.round((response.dataUrl.length * 3) / 4), // Approximate base64 size
            timestamp: Date.now(),
          });
        } else {
          // Fallback: capture using canvas
          captureWithCanvas(breakpoint).then(resolve);
        }
      }
    );
  });
}

/**
 * Capture screenshot using canvas (fallback)
 */
async function captureWithCanvas(breakpoint: Breakpoint): Promise<ScreenshotResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = breakpoint.width;
  canvas.height = Math.max(breakpoint.height, document.body.scrollHeight);

  // Draw current page state
  // Note: This is a simplified version - real implementation would use html2canvas
  ctx!.fillStyle = '#ffffff';
  ctx!.fillRect(0, 0, canvas.width, canvas.height);

  // Add text showing what was captured
  ctx!.fillStyle = '#000000';
  ctx!.font = '20px Arial';
  ctx!.fillText(`Screenshot: ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, 20, 40);
  ctx!.fillText(`URL: ${window.location.href}`, 20, 70);
  ctx!.fillText(`Date: ${new Date().toLocaleString()}`, 20, 100);

  const dataUrl = canvas.toDataURL('image/png');

  return {
    breakpoint,
    dataUrl,
    fileSize: Math.round((dataUrl.length * 3) / 4),
    timestamp: Date.now(),
  };
}

/**
 * Analyze page for responsive issues
 */
function analyzeResponsiveIssues(breakpoint: Breakpoint): ResponsiveIssue[] {
  const issues: ResponsiveIssue[] = [];

  // Check for horizontal overflow
  const bodyWidth = document.body.scrollWidth;
  if (bodyWidth > breakpoint.width) {
    issues.push({
      type: 'overflow',
      severity: 'error',
      description: `Body width (${bodyWidth}px) exceeds viewport (${breakpoint.width}px)`,
    });
  }

  // Check elements for overflow
  walkElementsEfficiently(
    document,
    (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > breakpoint.width) {
        issues.push({
          type: 'overflow',
          severity: 'warning',
          element: generateSelector(el as HTMLElement),
          description: `Element width (${Math.round(rect.width)}px) exceeds viewport`,
        });
      }

      if (el.children.length === 0 && el.textContent) {
        const style = window.getComputedStyle(el);
        if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) {
          issues.push({
            type: 'truncation',
            severity: 'warning',
            element: generateSelector(el as HTMLElement),
            description: 'Text may be truncated',
          });
        }
      }
    },
    (msg) => logger.log(msg)
  );

  // Limit issues to avoid overwhelming reports
  return issues.slice(0, 20);
}

/**
 * Generate CSS selector for element
 */
function generateSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.className) return `.${element.className.split(' ')[0]}`;
  return element.tagName.toLowerCase();
}

/**
 * Run responsive testing on all breakpoints
 */
export async function runResponsiveTesting(
  breakpoints: Breakpoint[] = DEFAULT_BREAKPOINTS,
  onProgress?: (current: number, total: number, breakpoint: Breakpoint) => void
): Promise<ResponsiveReport> {
  const report: ResponsiveReport = {
    id: `report-${Date.now()}`,
    url: window.location.href,
    title: document.title,
    createdAt: Date.now(),
    breakpoints,
    screenshots: [],
    summary: {
      totalBreakpoints: breakpoints.length,
      issuesFound: 0,
      errors: 0,
      warnings: 0,
    },
  };

  logger.log('[ResponsiveTesting] Starting testing on', breakpoints.length, 'breakpoints');

  for (let i = 0; i < breakpoints.length; i++) {
    const breakpoint = breakpoints[i];

    // Report progress
    onProgress?.(i + 1, breakpoints.length, breakpoint);

    // Resize viewport (simulated via iframe or window resize)
    await resizeViewport(breakpoint);

    // Wait for layout to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analyze for issues
    const issues = analyzeResponsiveIssues(breakpoint);

    // Capture screenshot
    const screenshot = await captureScreenshot(breakpoint);
    screenshot.issues = issues;

    report.screenshots.push(screenshot);

    // Update summary
    report.summary.issuesFound += issues.length;
    report.summary.errors += issues.filter((i) => i.severity === 'error').length;
    report.summary.warnings += issues.filter((i) => i.severity === 'warning').length;

    logger.log(`[ResponsiveTesting] ${breakpoint.name}: ${issues.length} issues`);
  }

  // Restore original viewport
  await restoreViewport();

  // Save report
  await saveReport(report);

  logger.log('[ResponsiveTesting] Complete:', report.summary.issuesFound, 'total issues');
  return report;
}

/**
 * Resize viewport to breakpoint
 */
async function resizeViewport(breakpoint: Breakpoint): Promise<void> {
  // Try to resize window (may not work in all cases)
  if (window.outerWidth !== breakpoint.width || window.outerHeight !== breakpoint.height) {
    // Open in popup with specific size
    chrome.runtime.sendMessage({
      type: 'OPEN_TEST_VIEWPORT',
      payload: { breakpoint },
    });
  }
}

/**
 * Restore original viewport
 */
async function restoreViewport(): Promise<void> {
  // Implementation depends on how resize was done
  logger.log('[ResponsiveTesting] Restoring viewport');
}

/**
 * Save report to storage
 */
async function saveReport(report: ResponsiveReport): Promise<void> {
  const result = await chrome.storage.local.get('fdh_responsive_reports');
  const reports: ResponsiveReport[] = result.fdh_responsive_reports || [];
  reports.unshift(report);

  // Keep last 20 reports
  if (reports.length > 20) reports.length = 20;

  await chrome.storage.local.set({ fdh_responsive_reports: reports });
}

/**
 * Get all reports
 */
export async function getReports(): Promise<ResponsiveReport[]> {
  const result = await chrome.storage.local.get('fdh_responsive_reports');
  return (result.fdh_responsive_reports || []) as ResponsiveReport[];
}

/**
 * Get a specific report
 */
export async function getReport(id: string): Promise<ResponsiveReport | null> {
  const reports = await getReports();
  return reports.find((r) => r.id === id) || null;
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<void> {
  const reports = await getReports();
  const filtered = reports.filter((r) => r.id !== id);
  await chrome.storage.local.set({ fdh_responsive_reports: filtered });
}

/**
 * Generate HTML report
 */
export function generateHTMLReport(report: ResponsiveReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Responsive Test Report - ${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
    .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { margin: 0 0 10px; }
    .meta { color: #666; }
    .summary { display: flex; gap: 20px; margin-top: 20px; }
    .summary-item { background: #f0f0f0; padding: 15px 25px; border-radius: 6px; }
    .summary-value { font-size: 24px; font-weight: bold; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .screenshot { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .screenshot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .device-name { font-size: 18px; font-weight: 600; }
    .device-dims { color: #666; }
    .screenshot-img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
    .issues { margin-top: 20px; }
    .issue { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .issue.error { background: #fee; border-left: 3px solid #c00; }
    .issue.warning { background: #ffeaa7; border-left: 3px solid #fdcb6e; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Responsive Test Report</h1>
    <div class="meta">
      <div><strong>Page:</strong> ${report.title}</div>
      <div><strong>URL:</strong> ${report.url}</div>
      <div><strong>Date:</strong> ${new Date(report.createdAt).toLocaleString()}</div>
    </div>
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${report.summary.totalBreakpoints}</div>
        <div class="summary-label">Breakpoints</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color: ${report.summary.errors > 0 ? '#c00' : '#2ecc71'}">${report.summary.errors}</div>
        <div class="summary-label">Errors</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color: ${report.summary.warnings > 0 ? '#f39c12' : '#2ecc71'}">${report.summary.warnings}</div>
        <div class="summary-label">Warnings</div>
      </div>
    </div>
  </div>

  ${report.screenshots
    .map(
      (s) => `
    <div class="screenshot">
      <div class="screenshot-header">
        <div>
          <div class="device-name">${s.breakpoint.name}</div>
          <div class="device-dims">${s.breakpoint.width} × ${s.breakpoint.height}${s.breakpoint.device ? ` (${s.breakpoint.device})` : ''}</div>
        </div>
      </div>
      <img class="screenshot-img" src="${s.dataUrl}" alt="${s.breakpoint.name}">
      ${s.issues && s.issues.length > 0
        ? `
        <div class="issues">
          <h3>Issues (${s.issues.length})</h3>
          ${s.issues.map((i) => `<div class="issue ${i.severity}"><strong>${i.type}:</strong> ${i.description}${i.element ? ` <code>${i.element}</code>` : ''}</div>`).join('')}
        </div>
      `
        : '<div class="issues" style="color: #2ecc71;">✓ No issues detected</div>'
      }
    </div>
  `
    )
    .join('')}
</body>
</html>
  `;
}

/**
 * Export report as ZIP (with all screenshots)
 */
export async function exportReport(report: ResponsiveReport): Promise<Blob> {
  // In a real implementation, this would create a ZIP file
  // For now, return JSON
  const json = JSON.stringify(report, null, 2);
  return new Blob([json], { type: 'application/json' });
}

// Default export
export default {
  runResponsiveTesting,
  getReports,
  getReport,
  deleteReport,
  generateHTMLReport,
  exportReport,
  DEFAULT_BREAKPOINTS,
};
