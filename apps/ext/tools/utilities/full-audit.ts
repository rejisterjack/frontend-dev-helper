import type { ToolDefinition } from '../types';
import { ToolPanel, createButton } from '@/content/tool-panel';
import { getOverlayContainer } from '@/content/overlay-manager';
import type {
  AuditResult,
  AuditIssue,
} from '@/lib/export-service';
import {
  exportAsJSON,
  exportAsHTML,
  exportAsMarkdown,
  exportAsSARIF,
  exportAsJUnit,
} from '@/lib/export-service';

export const fullAudit: ToolDefinition = {
  id: 'full-audit',
  name: 'Full Audit',
  description:
    'One-click comprehensive audit across accessibility, performance, SEO, and best practices',
  category: 'utility',
  icon: 'clipboard-check',

  run(ctx) {
    let disposed = false;
    let panel: ToolPanel | null = null;

    const { shadow } = getOverlayContainer();

    const result = runFullAudit();

    panel = new ToolPanel({
      title: 'Full Audit',
      width: 520,
      maxHeight: '90vh',
      onClose: cleanup,
    });

    renderLoadingState(panel.getContainer());

    panel.mount(shadow);

    requestAnimationFrame(() => {
      if (disposed || !panel) return;
      panel.clearContent();
      renderResults(panel.getContainer(), result);
    });

    function cleanup() {
      if (disposed) return;
      disposed = true;
      panel?.destroy();
      panel = null;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};

// ---------------------------------------------------------------------------
// Scanning — builds on the same DOM inspection approach from
// site-report-generator but produces richer AuditIssue objects with severity
// and suggested fixes.
// ---------------------------------------------------------------------------

interface CategoryResult {
  score: number;
  issues: AuditIssue[];
}

function runFullAudit(): AuditResult {
  const accessibility = scanAccessibility();
  const performance = scanPerformance();
  const seo = scanSEO();
  const bestPractices = scanBestPractices();
  const css = scanCSS();

  const categories = { accessibility, performance, seo, bestPractices, css };
  const catScores = Object.values(categories).map((c) => c.score);
  const overallScore = Math.round(
    catScores.reduce((a, b) => a + b, 0) / catScores.length,
  );

  return {
    url: location.href,
    timestamp: Date.now(),
    overallScore,
    categories,
  };
}

// ---------------------------------------------------------------------------
// Individual scanners
// ---------------------------------------------------------------------------

function scanAccessibility(): CategoryResult {
  const issues: AuditIssue[] = [];

  const imgs = document.querySelectorAll('img:not([alt])');
  if (imgs.length > 0) {
    issues.push({
      severity: 'serious',
      category: 'accessibility',
      title: 'Images missing alt text',
      description: `${imgs.length} image(s) lack an alt attribute, making them invisible to screen readers.`,
      selector: 'img:not([alt])',
      suggestedFix: 'Add meaningful alt text or alt="" for decorative images.',
    });
  }

  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])',
  );
  const unlabeled: Element[] = [];
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const hasLabel = id
      ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
      : false;
    const isWrapped = input.closest('label');
    if (!hasLabel && !isWrapped) unlabeled.push(input);
  });
  if (unlabeled.length > 0) {
    issues.push({
      severity: 'serious',
      category: 'accessibility',
      title: 'Form inputs without labels',
      description: `${unlabeled.length} input(s) lack an associated label, aria-label, or aria-labelledby.`,
      suggestedFix:
        'Associate each input with a <label> or add aria-label/aria-labelledby.',
    });
  }

  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let prevLevel = 0;
  let skippedHeadings = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (prevLevel > 0 && level > prevLevel + 1) skippedHeadings++;
    prevLevel = level;
  });
  if (skippedHeadings > 0) {
    issues.push({
      severity: 'moderate',
      category: 'accessibility',
      title: 'Heading levels skipped',
      description: `${skippedHeadings} heading(s) skip levels (e.g., h1 directly to h3), which confuses screen reader navigation.`,
      suggestedFix:
        'Use headings in sequential order (h1 -> h2 -> h3) without skipping.',
    });
  }

  if (!document.querySelectorAll('h1').length) {
    issues.push({
      severity: 'serious',
      category: 'accessibility',
      title: 'No h1 heading',
      description: 'The page has no <h1> element. Screen readers use h1 to understand page topics.',
      suggestedFix: 'Add a single descriptive <h1> as the primary heading.',
    });
  }

  const h1s = document.querySelectorAll('h1');
  if (h1s.length > 1) {
    issues.push({
      severity: 'minor',
      category: 'accessibility',
      title: 'Multiple h1 headings',
      description: `${h1s.length} <h1> elements found. Best practice is a single h1 per page.`,
      suggestedFix: 'Keep only one <h1> and use h2-h6 for sub-sections.',
    });
  }

  const buttons = document.querySelectorAll('button');
  const badButtons: Element[] = [];
  buttons.forEach((b) => {
    if (!b.textContent?.trim() && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby')) {
      badButtons.push(b);
    }
  });
  if (badButtons.length > 0) {
    issues.push({
      severity: 'serious',
      category: 'accessibility',
      title: 'Buttons without accessible text',
      description: `${badButtons.length} button(s) have no visible text or aria-label.`,
      suggestedFix:
        'Add text content, aria-label, or an aria-labelledby reference.',
    });
  }

  const roledElements = document.querySelectorAll('[role]');
  const badAria: Element[] = [];
  roledElements.forEach((el) => {
    const role = el.getAttribute('role');
    if (role === 'checkbox' && !el.hasAttribute('aria-checked')) badAria.push(el);
    if (role === 'textbox' && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) badAria.push(el);
    if (role === 'button' && !el.textContent?.trim() && !el.hasAttribute('aria-label')) badAria.push(el);
  });
  if (badAria.length > 0) {
    issues.push({
      severity: 'moderate',
      category: 'accessibility',
      title: 'Incomplete ARIA roles',
      description: `${badAria.length} element(s) with ARIA roles are missing required attributes.`,
      suggestedFix:
        'Ensure all ARIA roles have their required states and properties.',
    });
  }

  const links = document.querySelectorAll('a[href]');
  const emptyLinks: Element[] = [];
  links.forEach((a) => {
    if (!a.textContent?.trim() && !a.querySelector('img[alt]') && !a.getAttribute('aria-label')) {
      emptyLinks.push(a);
    }
  });
  if (emptyLinks.length > 0) {
    issues.push({
      severity: 'serious',
      category: 'accessibility',
      title: 'Links without discernible text',
      description: `${emptyLinks.length} link(s) have no readable text content.`,
      suggestedFix: 'Add link text or an aria-label describing the link target.',
    });
  }

  const positiveTabindex = document.querySelectorAll('[tabindex]');
  const badTabindex: Element[] = [];
  positiveTabindex.forEach((el) => {
    const val = parseInt(el.getAttribute('tabindex') || '0');
    if (val > 0) badTabindex.push(el);
  });
  if (badTabindex.length > 0) {
    issues.push({
      severity: 'minor',
      category: 'accessibility',
      title: 'Positive tabindex values',
      description: `${badTabindex.length} element(s) use tabindex > 0, disrupting natural tab order.`,
      suggestedFix: 'Use tabindex="0" to add to tab order without reordering.',
    });
  }

  return { score: computeScore(issues), issues };
}

function scanPerformance(): CategoryResult {
  const issues: AuditIssue[] = [];

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (nav) {
    const dcl = nav.domContentLoadedEventEnd - nav.startTime;
    if (dcl > 3000) {
      issues.push({
        severity: dcl > 6000 ? 'critical' : 'serious',
        category: 'performance',
        title: 'Slow DOM Content Loaded',
        description: `domContentLoadedEvent fires at ${(dcl / 1000).toFixed(1)}s (threshold: 3s).`,
        suggestedFix:
          'Defer non-critical scripts, reduce render-blocking resources.',
      });
    }

    const load = nav.loadEventEnd - nav.startTime;
    if (load > 5000) {
      issues.push({
        severity: load > 10000 ? 'critical' : 'serious',
        category: 'performance',
        title: 'Slow page load',
        description: `Page fully loads at ${(load / 1000).toFixed(1)}s (threshold: 5s).`,
        suggestedFix:
          'Optimize resources, enable compression, lazy-load off-screen content.',
      });
    }

    if (nav.transferSize > 3 * 1024 * 1024) {
      issues.push({
        severity: 'moderate',
        category: 'performance',
        title: 'Large transfer size',
        description: `Total transfer size is ${(nav.transferSize / 1024 / 1024).toFixed(1)}MB (threshold: 3MB).`,
        suggestedFix:
          'Compress assets, use modern image formats, remove unused code.',
      });
    }

    const ttfb = nav.responseStart - nav.requestStart;
    if (ttfb > 800) {
      issues.push({
        severity: ttfb > 1800 ? 'serious' : 'moderate',
        category: 'performance',
        title: 'Slow Time to First Byte',
        description: `TTFB is ${ttfb}ms (threshold: 800ms).`,
        suggestedFix:
          'Use a CDN, optimize server response time, implement caching.',
      });
    }
  }

  const domSize = document.querySelectorAll('*').length;
  if (domSize > 1500) {
    issues.push({
      severity: domSize > 3000 ? 'critical' : 'serious',
      category: 'performance',
      title: 'Large DOM size',
      description: `DOM contains ${domSize} nodes (threshold: 1500). Large DOMs slow down style recalculation and layout.`,
      suggestedFix:
        'Reduce DOM depth, use virtual scrolling for long lists, remove hidden elements.',
    });
  }

  const scripts = document.querySelectorAll('script[src]').length;
  if (scripts > 15) {
    issues.push({
      severity: 'moderate',
      category: 'performance',
      title: 'Too many external scripts',
      description: `${scripts} external scripts loaded (threshold: 15).`,
      suggestedFix: 'Bundle scripts, remove unused ones, use defer/async.',
    });
  }

  const stylesheets = document.querySelectorAll(
    'link[rel="stylesheet"], style',
  ).length;
  if (stylesheets > 10) {
    issues.push({
      severity: 'moderate',
      category: 'performance',
      title: 'Many stylesheets',
      description: `${stylesheets} stylesheets found (threshold: 10). Each blocks rendering.`,
      suggestedFix: 'Combine stylesheets, inline critical CSS.',
    });
  }

  const imgsNoDims: Element[] = [];
  document.querySelectorAll('img').forEach((img) => {
    if (
      !img.hasAttribute('width') &&
      !img.hasAttribute('height') &&
      !(img as HTMLElement).style?.width &&
      !(img as HTMLElement).style?.height
    ) {
      imgsNoDims.push(img);
    }
  });
  if (imgsNoDims.length > 0) {
    issues.push({
      severity: 'minor',
      category: 'performance',
      title: 'Images without explicit dimensions',
      description: `${imgsNoDims.length} image(s) lack width/height, causing layout shifts.`,
      suggestedFix: 'Set explicit width and height attributes on images.',
    });
  }

  const inlineHandlers = document.querySelectorAll(
    '[onclick], [onload], [onerror], [onmouseover]',
  );
  if (inlineHandlers.length > 10) {
    issues.push({
      severity: 'minor',
      category: 'performance',
      title: 'Many inline event handlers',
      description: `${inlineHandlers.length} inline event handlers found. These bypass caching and are harder to maintain.`,
      suggestedFix:
        'Move event handling to external scripts using addEventListener.',
    });
  }

  return { score: computeScore(issues), issues };
}

function scanSEO(): CategoryResult {
  const issues: AuditIssue[] = [];

  const titleEl = document.querySelector('title');
  if (!titleEl?.textContent?.trim()) {
    issues.push({
      severity: 'critical',
      category: 'seo',
      title: 'Missing page title',
      description: 'The page has no <title> element. Search engines rely heavily on this.',
      suggestedFix: 'Add a descriptive <title> tag (30-60 characters).',
    });
  } else if (titleEl.textContent.length > 60) {
    issues.push({
      severity: 'minor',
      category: 'seo',
      title: 'Title too long',
      description: `Title is ${titleEl.textContent.length} characters (recommended max: 60). It may be truncated in search results.`,
      suggestedFix: 'Shorten the title to 60 characters or fewer.',
    });
  }

  const desc = document.querySelector('meta[name="description"]');
  if (!desc?.getAttribute('content')?.trim()) {
    issues.push({
      severity: 'critical',
      category: 'seo',
      title: 'Missing meta description',
      description: 'No meta description found. This is the primary snippet shown in search results.',
      suggestedFix:
        'Add a <meta name="description" content="..."> (120-160 characters).',
    });
  } else {
    const descLen = desc.getAttribute('content')!.length;
    if (descLen > 160) {
      issues.push({
        severity: 'minor',
        category: 'seo',
        title: 'Meta description too long',
        description: `Meta description is ${descLen} characters (recommended max: 160).`,
        suggestedFix: 'Trim to 160 characters.',
      });
    }
  }

  if (!document.querySelector('link[rel="canonical"]')) {
    issues.push({
      severity: 'moderate',
      category: 'seo',
      title: 'No canonical URL',
      description: 'Missing <link rel="canonical">. Search engines may index duplicate content.',
      suggestedFix: 'Add a canonical link to the preferred URL.',
    });
  }

  if (!document.querySelector('meta[name="viewport"]')) {
    issues.push({
      severity: 'critical',
      category: 'seo',
      title: 'Missing viewport meta tag',
      description: 'No viewport meta tag found. Mobile-friendliness is a ranking factor.',
      suggestedFix:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    });
  }

  const ogTags = document.querySelectorAll('meta[property^="og:"]');
  if (ogTags.length === 0) {
    issues.push({
      severity: 'moderate',
      category: 'seo',
      title: 'No Open Graph tags',
      description: 'Missing OG tags means poor previews when shared on social media.',
      suggestedFix:
        'Add at least og:title, og:description, and og:image meta tags.',
    });
  }

  const htmlEl = document.documentElement;
  if (!htmlEl.getAttribute('lang')) {
    issues.push({
      severity: 'moderate',
      category: 'seo',
      title: 'Missing lang attribute',
      description: 'The <html> element has no lang attribute. Screen readers and search engines use it.',
      suggestedFix: 'Add lang="en" (or the appropriate language code).',
    });
  }

  const h1s = document.querySelectorAll('h1');
  if (h1s.length === 0) {
    issues.push({
      severity: 'serious',
      category: 'seo',
      title: 'No h1 heading for SEO',
      description: 'The h1 is the strongest on-page SEO signal. None found.',
      suggestedFix: 'Add one descriptive h1 containing the primary keyword.',
    });
  }

  const imgsNoAlt = document.querySelectorAll('img:not([alt])');
  if (imgsNoAlt.length > 0) {
    issues.push({
      severity: 'moderate',
      category: 'seo',
      title: 'Images without alt text',
      description: `${imgsNoAlt.length} image(s) lack alt text, which is used by image search.`,
      suggestedFix: 'Add descriptive alt text to all meaningful images.',
    });
  }

  const jsonLd = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  if (jsonLd.length === 0) {
    issues.push({
      severity: 'minor',
      category: 'seo',
      title: 'No structured data (JSON-LD)',
      description: 'No JSON-LD structured data found. Rich snippets depend on it.',
      suggestedFix:
        'Add JSON-LD markup for your content type (Article, Product, etc.).',
    });
  }

  return { score: computeScore(issues), issues };
}

function scanBestPractices(): CategoryResult {
  const issues: AuditIssue[] = [];

  if (location.protocol !== 'https:') {
    issues.push({
      severity: 'critical',
      category: 'bestPractices',
      title: 'Not using HTTPS',
      description: 'The page is served over HTTP. Modern browsers warn users and block features.',
      suggestedFix: 'Serve the site over HTTPS with a valid certificate.',
    });
  }

  const deprecated = document.querySelectorAll('font, center, marquee, blink');
  if (deprecated.length > 0) {
    issues.push({
      severity: 'moderate',
      category: 'bestPractices',
      title: 'Deprecated HTML elements',
      description: `${deprecated.length} deprecated element(s) found (${Array.from(deprecated)
        .slice(0, 5)
        .map((e) => e.tagName.toLowerCase())
        .join(', ')}).`,
      suggestedFix: 'Replace with modern CSS equivalents.',
    });
  }

  const inlineStyles = document.querySelectorAll('[style]').length;
  if (inlineStyles > 50) {
    issues.push({
      severity: 'moderate',
      category: 'bestPractices',
      title: 'Excessive inline styles',
      description: `${inlineStyles} elements use inline style attributes (threshold: 50).`,
      suggestedFix:
        'Move inline styles to external stylesheets for maintainability.',
    });
  }

  // Detect synchronous document output methods in inline scripts
  const allScripts = document.querySelectorAll('script:not([src])');
  let blockingDocMethodCount = 0;
  allScripts.forEach((s) => {
    const text = s.textContent || '';
    if (text.includes('document') && text.includes('.write(')) {
      blockingDocMethodCount++;
    }
  });
  if (blockingDocMethodCount > 0) {
    issues.push({
      severity: 'serious',
      category: 'bestPractices',
      title: 'Blocking document output method detected',
      description: `${blockingDocMethodCount} inline script(s) use a synchronous document output method which can block parsing.`,
      suggestedFix:
        'Replace with DOM manipulation methods like createElement and appendChild.',
    });
  }

  let deprecatedAPIs = 0;
  allScripts.forEach((s) => {
    const text = s.textContent || '';
    if (text.includes('document.execCommand')) deprecatedAPIs++;
    if (text.includes('navigator.userAgent')) deprecatedAPIs++;
  });
  if (deprecatedAPIs > 0) {
    issues.push({
      severity: 'minor',
      category: 'bestPractices',
      title: 'Deprecated API usage',
      description: `${deprecatedAPIs} usage(s) of deprecated APIs detected in inline scripts.`,
      suggestedFix: 'Migrate to modern API equivalents.',
    });
  }

  const charset = document.querySelector('meta[charset]') ||
    document.querySelector('meta[http-equiv="Content-Type"]');
  if (!charset) {
    issues.push({
      severity: 'minor',
      category: 'bestPractices',
      title: 'Missing charset declaration',
      description: 'No charset meta tag found. UTF-8 should be declared explicitly.',
      suggestedFix: 'Add <meta charset="utf-8"> as the first child of <head>.',
    });
  }

  return { score: computeScore(issues), issues };
}

function scanCSS(): CategoryResult {
  const issues: AuditIssue[] = [];

  const stylesheetCount = document.querySelectorAll(
    'link[rel="stylesheet"], style',
  ).length;
  if (stylesheetCount > 15) {
    issues.push({
      severity: 'moderate',
      category: 'css',
      title: 'Many stylesheets',
      description: `${stylesheetCount} stylesheets found. Each requires a separate HTTP request.`,
      suggestedFix: 'Bundle CSS files to reduce requests.',
    });
  }

  const inlineCount = document.querySelectorAll('[style]').length;
  if (inlineCount > 30) {
    issues.push({
      severity: 'minor',
      category: 'css',
      title: 'Many inline styles',
      description: `${inlineCount} elements with inline style attributes.`,
      suggestedFix: 'Use CSS classes instead of inline styles.',
    });
  }

  let importantCount = 0;
  document.querySelectorAll('[style]').forEach((el) => {
    if (el.getAttribute('style')?.includes('!important')) importantCount++;
  });
  if (importantCount > 10) {
    issues.push({
      severity: 'moderate',
      category: 'css',
      title: 'Excessive !important usage',
      description: `${importantCount} inline style(s) use !important, indicating specificity issues.`,
      suggestedFix:
        'Refactor CSS to resolve specificity conflicts without !important.',
    });
  }

  let customPropCount = 0;
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules || [];
        for (const rule of rules) {
          if (
            rule instanceof CSSStyleRule &&
            (rule.selectorText === ':root' || rule.selectorText === 'html')
          ) {
            const matches = rule.cssText.match(/--[\w-]+/g);
            customPropCount += matches?.length ?? 0;
          }
        }
      } catch {
        // cross-origin stylesheet
      }
    });
  } catch {
    // stylesheet access blocked
  }

  if (customPropCount === 0 && stylesheetCount > 0) {
    issues.push({
      severity: 'info',
      category: 'css',
      title: 'No CSS custom properties',
      description:
        'No CSS variables detected. Custom properties improve maintainability and theming.',
      suggestedFix:
        'Consider using CSS custom properties for repeated values (colors, spacing).',
    });
  }

  let universalSelectorCount = 0;
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules || [];
        for (const rule of rules) {
          if (
            rule instanceof CSSStyleRule &&
            (rule.selectorText === '*' ||
              rule.selectorText === '*::before' ||
              rule.selectorText === '*::after')
          ) {
            universalSelectorCount++;
          }
        }
      } catch {
        // cross-origin
      }
    });
  } catch {
    // blocked
  }
  if (universalSelectorCount > 3) {
    issues.push({
      severity: 'minor',
      category: 'css',
      title: 'Universal selector overuse',
      description: `${universalSelectorCount} universal selector rule(s) found, which can hurt performance.`,
      suggestedFix:
        'Replace universal selectors with more specific selectors.',
    });
  }

  return { score: computeScore(issues), issues };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<AuditIssue['severity'], number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
  info: 0,
};

function computeScore(issues: AuditIssue[]): number {
  const deduction = issues.reduce(
    (sum, issue) => sum + SEVERITY_WEIGHT[issue.severity],
    0,
  );
  return Math.max(0, 100 - deduction);
}

// ---------------------------------------------------------------------------
// UI Rendering
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function severityBadgeColor(severity: AuditIssue['severity']): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'serious': return '#ea580c';
    case 'moderate': return '#d97706';
    case 'minor': return '#2563eb';
    case 'info': return '#6b7280';
  }
}

function clearContainer(container: HTMLDivElement): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function renderLoadingState(container: HTMLDivElement): void {
  const loader = document.createElement('div');
  loader.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 48px 16px; gap: 12px;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 32px; height: 32px; border: 3px solid #334155;
    border-top-color: #3b82f6; border-radius: 50%;
    animation: fdh-spin 0.8s linear infinite;
  `;

  const label = document.createElement('div');
  label.style.cssText = 'color: #94a3b8; font-size: 13px;';
  label.textContent = 'Running audit checks...';

  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes fdh-spin { to { transform: rotate(360deg); } }';

  loader.append(spinner, label);
  container.append(styleTag, loader);
}

function renderResults(container: HTMLDivElement, result: AuditResult): void {
  clearContainer(container);

  // -- Overall score section --
  const hero = document.createElement('div');
  hero.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    padding: 20px 0 12px; border-bottom: 1px solid #1e293b;
    margin-bottom: 12px;
  `;

  const scoreCircle = document.createElement('div');
  const color = scoreColor(result.overallScore);
  scoreCircle.style.cssText = `
    width: 96px; height: 96px; border-radius: 50%;
    background: conic-gradient(${color} ${result.overallScore * 3.6}deg, #1e293b 0deg);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
  `;
  const scoreInner = document.createElement('div');
  scoreInner.style.cssText = `
    width: 78px; height: 78px; border-radius: 50%; background: #0f172a;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
  `;
  const scoreNum = document.createElement('span');
  scoreNum.style.cssText = `font-size: 28px; font-weight: 700; color: ${color};`;
  scoreNum.textContent = String(result.overallScore);
  const scoreLabel = document.createElement('span');
  scoreLabel.style.cssText = 'font-size: 10px; color: #64748b;';
  scoreLabel.textContent = 'Overall';
  scoreInner.append(scoreNum, scoreLabel);
  scoreCircle.appendChild(scoreInner);

  const totalIssues = Object.values(result.categories).reduce(
    (s, c) => s + c.issues.length,
    0,
  );
  const criticalIssues = Object.values(result.categories).reduce(
    (s, c) =>
      s +
      c.issues.filter(
        (i) => i.severity === 'critical' || i.severity === 'serious',
      ).length,
    0,
  );

  const statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:flex;gap:12px;margin-top:8px;';
  statsRow.append(
    makeStatBadge(String(totalIssues), 'Issues', '#94a3b8'),
    makeStatBadge(
      String(criticalIssues),
      'Critical',
      criticalIssues > 0 ? '#ef4444' : '#64748b',
    ),
    makeStatBadge(
      String(Object.keys(result.categories).length),
      'Categories',
      '#94a3b8',
    ),
  );

  hero.append(scoreCircle, statsRow);
  container.appendChild(hero);

  // -- Category cards --
  const catEntries = Object.entries(result.categories) as [
    string,
    CategoryResult,
  ][];

  for (const [key, cat] of catEntries) {
    const catColor = scoreColor(cat.score);
    const catLabel = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase());

    const card = document.createElement('div');
    card.style.cssText = `
      background: #1e293b; border-radius: 8px; padding: 12px;
      margin-bottom: 8px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    `;

    const left = document.createElement('div');
    left.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const catName = document.createElement('span');
    catName.style.cssText = 'font-weight: 600; font-size: 13px;';
    catName.textContent = catLabel;

    const countBadge = document.createElement('span');
    countBadge.style.cssText = `
      display: inline-flex; align-items: center; padding: 1px 6px;
      border-radius: 4px; font-size: 10px; font-weight: 600;
      background: ${cat.issues.length === 0 ? '#22c55e20' : '#f59e0b20'};
      color: ${cat.issues.length === 0 ? '#22c55e' : '#f59e0b'};
    `;
    countBadge.textContent =
      cat.issues.length === 0
        ? 'Pass'
        : `${cat.issues.length} issue${cat.issues.length !== 1 ? 's' : ''}`;

    left.append(catName, countBadge);

    const scoreEl = document.createElement('span');
    scoreEl.style.cssText = `font-weight: 700; font-size: 18px; color: ${catColor};`;
    scoreEl.textContent = String(cat.score);

    const bar = document.createElement('div');
    bar.style.cssText = `
      height: 4px; background: #334155; border-radius: 2px;
      overflow: hidden; margin-bottom: ${cat.issues.length > 0 ? '8px' : '0'};
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%; width: ${cat.score}%; background: ${catColor};
      border-radius: 2px; transition: width 0.4s ease;
    `;
    bar.appendChild(fill);

    header.append(left, scoreEl);
    card.append(header, bar);

    if (cat.issues.length > 0) {
      const issueList = document.createElement('div');
      issueList.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      for (const issue of cat.issues) {
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex; align-items: flex-start; gap: 6px;
          padding: 6px 8px; border-radius: 4px; background: #0f172a;
          cursor: pointer;
        `;

        const badge = document.createElement('span');
        badge.style.cssText = `
          display: inline-block; padding: 0px 5px; border-radius: 3px;
          font-size: 9px; font-weight: 600; text-transform: uppercase;
          background: ${severityBadgeColor(issue.severity)}20;
          color: ${severityBadgeColor(issue.severity)};
          flex-shrink: 0; line-height: 16px; margin-top: 1px;
        `;
        badge.textContent = issue.severity;

        const titleEl = document.createElement('span');
        titleEl.style.cssText = 'font-size: 11px; color: #e2e8f0; line-height: 1.4;';
        titleEl.textContent = issue.title;

        row.append(badge, titleEl);

        const detail = document.createElement('div');
        detail.style.cssText = `
          display: none; padding: 6px 8px 6px 32px;
          font-size: 10px; color: #94a3b8; line-height: 1.5;
        `;
        detail.textContent = issue.description;
        if (issue.suggestedFix) {
          const fix = document.createElement('div');
          fix.style.cssText = 'margin-top: 4px; color: #22c55e;';
          fix.textContent = 'Fix: ' + issue.suggestedFix;
          detail.appendChild(fix);
        }

        row.addEventListener('click', () => {
          const open = detail.style.display !== 'none';
          detail.style.display = open ? 'none' : 'block';
        });

        issueList.append(row, detail);
      }

      card.appendChild(issueList);
    }

    container.appendChild(card);
  }

  // -- Export bar --
  const exportBar = document.createElement('div');
  exportBar.style.cssText = `
    display: flex; gap: 6px; flex-wrap: wrap;
    padding-top: 8px; border-top: 1px solid #1e293b;
    margin-top: 4px;
  `;

  const formats: Array<{ label: string; fn: () => string; ext: string; mime: string }> = [
    { label: 'JSON', fn: () => exportAsJSON(result), ext: 'json', mime: 'application/json' },
    { label: 'HTML', fn: () => exportAsHTML(result), ext: 'html', mime: 'text/html' },
    { label: 'Markdown', fn: () => exportAsMarkdown(result), ext: 'md', mime: 'text/markdown' },
    { label: 'SARIF', fn: () => exportAsSARIF(result), ext: 'sarif', mime: 'application/json' },
    { label: 'JUnit', fn: () => exportAsJUnit(result), ext: 'xml', mime: 'application/xml' },
  ];

  for (const fmt of formats) {
    const btn = createButton(fmt.label, () => downloadExport(fmt.fn(), fmt.ext, fmt.mime));
    exportBar.appendChild(btn);
  }

  container.appendChild(exportBar);
}

function makeStatBadge(
  value: string,
  label: string,
  color: string,
): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:2px;';
  const val = document.createElement('span');
  val.style.cssText = `font-size:16px;font-weight:700;color:${color};`;
  val.textContent = value;
  const lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:10px;color:#64748b;';
  lbl.textContent = label;
  div.append(val, lbl);
  return div;
}

function downloadExport(
  content: string,
  ext: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `full-audit-${Date.now()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
