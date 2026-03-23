/**
 * Site Report Generator
 * Main entry point - re-exports from modular files
 */

export * from './formatters';
export * from './types';
export * from './utils';

import { escapeHtml } from '@/utils/sanitize';
import { logger } from '../../utils/logger';
import { exportReportAsHTML, exportReportAsJSON, printReport } from './formatters';
import type { Recommendation, SiteReport } from './types';
import { createMetricScore, generateReportId } from './utils';

// State
let isEnabled = false;
let currentReport: SiteReport | null = null;
let overlayContainer: HTMLElement | null = null;

const PREFIX = 'fdh-site-report';

/**
 * Generate comprehensive site report
 */
export async function generateReport(
  options: {
    includePerformance?: boolean;
    includeAccessibility?: boolean;
    includeSeo?: boolean;
    includeSecurity?: boolean;
  } = {}
): Promise<SiteReport> {
  logger.log('[SiteReport] Generating report...');

  const report: SiteReport = {
    id: generateReportId(),
    timestamp: Date.now(),
    url: window.location.href,
    title: document.title,
    scores: {
      performance: 0,
      accessibility: 0,
      seo: 0,
      bestPractices: 0,
      overall: 0,
    },
    performance: null,
    accessibility: null,
    colors: null,
    seo: null,
    techStack: null,
    bestPractices: null,
    recommendations: [],
  };

  // Run analyses
  if (options.includePerformance !== false) {
    report.performance = await analyzePerformance();
  }
  if (options.includeAccessibility !== false) {
    // Import from accessibility module
  }
  if (options.includeSeo !== false) {
    report.seo = analyzeSEO();
  }
  if (options.includeSecurity !== false) {
    report.bestPractices = analyzeBestPractices();
  }

  report.scores = calculateScores(report);
  report.recommendations = generateRecommendations(report);

  currentReport = report;
  logger.log('[SiteReport] Report generated:', report.id);

  return report;
}

/**
 * Show report overlay
 */
export function showReportOverlay(report: SiteReport): void {
  if (overlayContainer) {
    overlayContainer.remove();
  }

  overlayContainer = document.createElement('div');
  overlayContainer.id = `${PREFIX}-overlay`;
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    backdrop-filter: blur(12px);
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    color: #e2e8f0;
  `;

  overlayContainer.innerHTML = generateOverlayHTML(report);
  document.body.appendChild(overlayContainer);

  setupOverlayListeners(overlayContainer, report);
}

function generateOverlayHTML(report: SiteReport): string {
  return `
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
        <div>
          <h1 style="margin: 0 0 8px; font-size: 32px; background: linear-gradient(135deg, #6366f1, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            📊 Site Report
          </h1>
          <p style="margin: 0; color: #64748b;">${escapeHtml(report.title)}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">${escapeHtml(report.url)}</p>
        </div>
        <button
          type="button" id="${PREFIX}-close" style="background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 12px 20px; border-radius: 8px; cursor: pointer;">
          ✕ Close
        </button>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px;">
        ${renderScoreCard('Performance', report.scores.performance, '⚡')}
        ${renderScoreCard('Accessibility', report.scores.accessibility, '♿')}
        ${renderScoreCard('SEO', report.scores.seo, '🔍')}
        ${renderScoreCard('Best Practices', report.scores.bestPractices, '✓')}
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 18px; color: #c084fc;">Overall Score: ${report.scores.overall}/100</h3>
        <div style="height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${report.scores.overall}%; background: linear-gradient(90deg, #6366f1, #c084fc); border-radius: 4px;"></div>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 40px;">
        <button
          type="button" id="${PREFIX}-export-json" style="flex: 1; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; padding: 12px; border-radius: 8px; cursor: pointer;">
          📥 Export JSON
        </button>
        <button
          type="button" id="${PREFIX}-export-html" style="flex: 1; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; padding: 12px; border-radius: 8px; cursor: pointer;">
          🌐 Export HTML
        </button>
        <button
          type="button" id="${PREFIX}-print" style="flex: 1; background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.4); color: #eab308; padding: 12px; border-radius: 8px; cursor: pointer;">
          🖨️ Print
        </button>
      </div>

      <div id="${PREFIX}-recommendations">
        <h3 style="margin: 0 0 16px; font-size: 18px; color: #c084fc;">Recommendations (${report.recommendations.length})</h3>
        ${report.recommendations
          .map(
            (rec, _i) => `
          <div style="background: rgba(30, 41, 59, 0.6); border-left: 4px solid ${getPriorityColor(rec.priority)}; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">${escapeHtml(rec.title)}</span>
              <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">${rec.category}</span>
            </div>
            <p style="margin: 0 0 8px; color: #94a3b8;">${escapeHtml(rec.description)}</p>
            <div style="font-size: 12px; color: #64748b;">
              Impact: ${rec.impact} | Effort: ${rec.effort}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderScoreCard(title: string, score: number, icon: string): string {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
  return `
    <div style="background: rgba(30, 41, 59, 0.8); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
      <div style="font-size: 36px; font-weight: bold; color: ${color};">${score}</div>
      <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase;">${escapeHtml(title)}</div>
    </div>
  `;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#6366f1';
  }
}

function setupOverlayListeners(container: HTMLElement, report: SiteReport): void {
  container.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => {
    container.remove();
    overlayContainer = null;
  });

  container.querySelector(`#${PREFIX}-export-json`)?.addEventListener('click', () => {
    exportReportAsJSON(report);
  });

  container.querySelector(`#${PREFIX}-export-html`)?.addEventListener('click', () => {
    exportReportAsHTML(report);
  });

  container.querySelector(`#${PREFIX}-print`)?.addEventListener('click', () => {
    printReport(report);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      container.remove();
      overlayContainer = null;
    }
  });
}

// Stub functions - full implementations would be in separate analyzer files
async function analyzePerformance() {
  return {
    webVitals: {
      lcp: createMetricScore(2.5, 's', { good: 2.5, poor: 4.0 }, true),
      fid: createMetricScore(100, 'ms', { good: 100, poor: 300 }, true),
      cls: createMetricScore(0.1, '', { good: 0.1, poor: 0.25 }, true),
      fcp: createMetricScore(1.8, 's', { good: 1.8, poor: 3.0 }, true),
      ttfb: createMetricScore(800, 'ms', { good: 800, poor: 1800 }, true),
      inp: createMetricScore(200, 'ms', { good: 200, poor: 500 }, true),
    },
    navigation: {
      dnsLookup: 0,
      tcpConnection: 0,
      tlsHandshake: 0,
      serverResponse: 0,
      domProcessing: 0,
      resourceLoading: 0,
      totalLoad: 0,
    },
    resources: {
      totalRequests: 0,
      totalSize: 0,
      transferSize: 0,
      byType: {},
      slowestResources: [],
      renderBlocking: [],
    },
    memory: null,
    imageOptimizations: [],
  };
}

function analyzeSEO() {
  return {
    score: 85,
    meta: {
      hasTitle: !!document.title,
      titleLength: document.title.length,
      titleQuality: (document.title.length > 30 && document.title.length < 60
        ? 'good'
        : document.title.length < 30
          ? 'too-short'
          : 'too-long') as 'good' | 'too-short' | 'too-long',
      hasDescription: false,
      descriptionLength: 0,
      hasViewport: !!document.querySelector('meta[name="viewport"]'),
      hasCharset: !!document.querySelector('meta[charset]'),
      hasCanonical: !!document.querySelector('link[rel="canonical"]'),
      hasRobots: !!document.querySelector('meta[name="robots"]'),
      hasOGTags: !!document.querySelector('meta[property^="og:"]'),
      hasTwitterCards: !!document.querySelector('meta[name^="twitter:"]'),
      openGraph: {},
      twitter: {},
      issues: [],
    },
    headings: {
      h1: {
        count: document.querySelectorAll('h1').length,
        texts: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent || ''),
      },
      h2: {
        count: document.querySelectorAll('h2').length,
        texts: Array.from(document.querySelectorAll('h2')).map((h) => h.textContent || ''),
      },
      h3: {
        count: document.querySelectorAll('h3').length,
        texts: Array.from(document.querySelectorAll('h3')).map((h) => h.textContent || ''),
      },
      h4: {
        count: document.querySelectorAll('h4').length,
        texts: Array.from(document.querySelectorAll('h4')).map((h) => h.textContent || ''),
      },
      h5: {
        count: document.querySelectorAll('h5').length,
        texts: Array.from(document.querySelectorAll('h5')).map((h) => h.textContent || ''),
      },
      h6: {
        count: document.querySelectorAll('h6').length,
        texts: Array.from(document.querySelectorAll('h6')).map((h) => h.textContent || ''),
      },
      structure: (document.querySelectorAll('h1').length === 1
        ? 'good'
        : document.querySelectorAll('h1').length === 0
          ? 'missing-h1'
          : 'multiple-h1') as 'good' | 'multiple-h1' | 'missing-h1' | 'skipped-levels',
      issues: [],
    },
    links: {
      total: document.querySelectorAll('a').length,
      internal: 0,
      external: 0,
      broken: 0,
      nofollow: document.querySelectorAll('a[rel*="nofollow"]').length,
      newWindow: document.querySelectorAll('a[target="_blank"]').length,
      withoutAriaLabel: document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])')
        .length,
      issues: [],
    },
    images: {
      total: document.querySelectorAll('img').length,
      withoutAlt: document.querySelectorAll('img:not([alt])').length,
      oversized: 0,
      lazyLoaded: document.querySelectorAll('img[loading="lazy"]').length,
      issues: [],
    },
    mobile: {
      hasViewport: !!document.querySelector('meta[name="viewport"]'),
      viewportContent:
        document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
      hasTouchTargets: true,
      smallTouchTargets: 0,
      usesFixedPosition: !!document.querySelector('[style*="fixed"]'),
      fontSizeReadable: true,
      issues: [],
    },
    structuredData: {
      hasJsonLd: !!document.querySelector('script[type="application/ld+json"]'),
      hasMicrodata: !!document.querySelector('[itemscope]'),
      hasRdfa: !!document.querySelector('[typeof]'),
      types: [],
      count: document.querySelectorAll('script[type="application/ld+json"]').length,
      issues: [],
    },
    content: {
      wordCount: document.body.innerText.split(/\s+/).length,
      paragraphCount: document.querySelectorAll('p').length,
      avgWordsPerParagraph: 0,
      hasDuplicateContent: false,
      readabilityScore: 0,
      issues: [],
    },
  };
}

function analyzeBestPractices() {
  return {
    https: window.location.protocol === 'https:',
    http2: false,
    hsts: false,
    xFrameOptions: false,
    xContentTypeOptions: false,
    csp: false,
    features: {
      serviceWorker: 'serviceWorker' in navigator,
      manifest: !!document.querySelector('link[rel="manifest"]'),
      https: window.location.protocol === 'https:',
      http2: false,
    },
    issues: [],
  };
}

function calculateScores(report: SiteReport): SiteReport['scores'] {
  const scores = {
    performance: report.performance
      ? Math.round(
          Object.values(report.performance.webVitals).reduce((sum, v) => sum + v.score, 0) / 6
        )
      : 0,
    accessibility: report.accessibility ? 85 : 0,
    seo: report.seo ? report.seo.score : 0,
    bestPractices: report.bestPractices ? 90 : 0,
    overall: 0,
  };
  scores.overall = Math.round(
    (scores.performance + scores.accessibility + scores.seo + scores.bestPractices) / 4
  );
  return scores;
}

function generateRecommendations(report: SiteReport): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (report.seo != null && report.seo.meta.titleLength < 30) {
    recommendations.push({
      id: 'seo-title-short',
      category: 'seo',
      priority: 'medium',
      title: 'Page title is too short',
      description:
        'The page title should be between 30-60 characters for optimal display in search results.',
      impact: 'Better click-through rates from search results',
      effort: 'easy',
    });
  }

  if (report.seo != null && report.seo.images.withoutAlt > 0) {
    recommendations.push({
      id: 'accessibility-img-alt',
      category: 'accessibility',
      priority: 'high',
      title: 'Images missing alt text',
      description: `${report.seo.images.withoutAlt} images are missing alt text, making them inaccessible to screen readers.`,
      impact: 'Improved accessibility and SEO',
      effort: 'easy',
    });
  }

  return recommendations;
}

/**
 * Enable the site report generator
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;
  logger.log('[SiteReport] Enabled');
}

/**
 * Disable the site report generator
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
  logger.log('[SiteReport] Disabled');
}

/**
 * Toggle the site report generator
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; hasReport: boolean } {
  return { enabled: isEnabled, hasReport: currentReport !== null };
}

/**
 * Get current report
 */
export function getCurrentReport(): SiteReport | null {
  return currentReport;
}

// Export as namespace for handler compatibility
export const siteReportGenerator = {
  enable,
  disable,
  toggle,
  getState,
  generateReport,
  showReportOverlay,
  getCurrentReport,
};
