/**
 * Core Accessibility Audit functionality
 * Manages state, UI, and coordinates all audit checks
 */

import { showContentErrorToast } from '@/utils/content-notify';
import { logger } from '@/utils/logger';
// Import audit functions
import { validateARIA } from './audits/aria';
import { analyzeContrast } from './audits/contrast';
import { validateFormLabels } from './audits/forms';
import { validateHeadings } from './audits/headings';
import { detectMissingAltText } from './audits/images';
import { testKeyboardNav } from './audits/keyboard';
import { validateLandmarks } from './audits/landmarks';
import { COLORS, FOCUSABLE_SELECTOR, Z_INDEX } from './constants';
import {
  buildReportContent,
  generateMarkdownReport,
  generateTextReport,
  setReportState,
} from './report';
import type {
  AccessibilityAuditState,
  AccessibilityReport,
  FocusOrderItem,
  IssueHighlightInfo,
} from './types';

// ============================================
// State
// ============================================

let isActive = false;
let showFocusOrder = true;
let highlightIssues = true;
let lastReport: AccessibilityReport | null = null;
let overlayPanel: HTMLElement | null = null;
let focusOverlays: HTMLElement[] = [];
let issueHighlights: HTMLElement[] = [];

// Event handlers
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

// ============================================
// Focus Order Visualization
// ============================================

/**
 * Get all focusable elements in tab order
 */
function getFocusableElements(): HTMLElement[] {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

  // Filter out hidden elements
  return elements
    .filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    })
    .sort((a, b) => {
      // Sort by tabindex first, then DOM order
      const tabA = parseInt(a.getAttribute('tabindex') || '0', 10);
      const tabB = parseInt(b.getAttribute('tabindex') || '0', 10);
      if (tabA !== tabB && (tabA > 0 || tabB > 0)) {
        return tabA - tabB;
      }
      return 0;
    });
}

/**
 * Analyze focus order and return items
 */
function analyzeFocusOrder(): FocusOrderItem[] {
  const focusable = getFocusableElements();
  return focusable.map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      index: index + 1,
      element: el.tagName.toLowerCase(),
      selector: getSelector(el),
      tabIndex: parseInt(el.getAttribute('tabindex') || '0', 10),
      visible: rect.width > 0 && rect.height > 0,
    };
  });
}

/**
 * Create focus order overlays
 */
function createFocusOrderOverlays(): void {
  removeFocusOrderOverlays();

  if (!showFocusOrder) return;

  const focusable = getFocusableElements();

  focusable.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'fdh-focus-overlay';
    overlay.setAttribute('data-fdh-overlay', 'true');
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${COLORS.primary};
      border-radius: 4px;
      z-index: ${Z_INDEX.overlay};
      pointer-events: none;
      box-sizing: border-box;
    `;

    // Number badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: -12px;
      left: -12px;
      width: 24px;
      height: 24px;
      background: ${COLORS.primary};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    badge.textContent = String(index + 1);

    overlay.appendChild(badge);
    document.body.appendChild(overlay);
    focusOverlays.push(overlay);
  });
}

/**
 * Remove focus order overlays
 */
function removeFocusOrderOverlays(): void {
  focusOverlays.forEach((el) => el.remove());
  focusOverlays = [];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get a CSS selector for an element
 */
function getSelector(el: Element): string {
  if (el.id) {
    return `#${el.id}`;
  }

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .map((c) => `.${c}`)
    .join('');

  if (classes) {
    return `${tag}${classes}`;
  }

  // Build path
  const path: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    const tagName = current.tagName.toLowerCase();
    const siblings = Array.from(current.parentElement?.children || []).filter(
      (s) => s.tagName === current?.tagName
    );

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      path.unshift(`${tagName}:nth-of-type(${index})`);
    } else {
      path.unshift(tagName);
    }

    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Create issue highlight overlay
 */
function createIssueHighlight(
  selector: string,
  type: 'error' | 'warning' | 'info',
  message: string
): void {
  if (!highlightIssues) return;

  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const color =
        type === 'error' ? COLORS.error : type === 'warning' ? COLORS.warning : COLORS.info;

      const overlay = document.createElement('div');
      overlay.className = `fdh-issue-highlight fdh-issue-${type}`;
      overlay.setAttribute('data-fdh-overlay', 'true');
      overlay.setAttribute('title', message);
      overlay.style.cssText = `
        position: fixed;
        top: ${rect.top - 2}px;
        left: ${rect.left - 2}px;
        width: ${rect.width + 4}px;
        height: ${rect.height + 4}px;
        border: 3px solid ${color};
        border-radius: 4px;
        z-index: ${Z_INDEX.highlight};
        pointer-events: none;
        box-sizing: border-box;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2);
      `;

      document.body.appendChild(overlay);
      issueHighlights.push(overlay);
    });
  } catch {
    // Invalid selector, skip
  }
}

/**
 * Remove all issue highlights
 */
function removeIssueHighlights(): void {
  issueHighlights.forEach((el) => el.remove());
  issueHighlights = [];
}

// ============================================
// Report Generation
// ============================================

/**
 * Run all accessibility checks and generate report
 */
export function runAudit(): AccessibilityReport {
  const ariaIssues = validateARIA();
  const focusItems = analyzeFocusOrder();
  const contrastIssues = analyzeContrast();
  const altTextIssues = detectMissingAltText();
  const formLabelIssues = validateFormLabels();
  const keyboardIssues = testKeyboardNav();
  const headingIssues = validateHeadings();
  const landmarkIssues = validateLandmarks();

  const focusIssues = focusItems.filter((item) => !item.visible || item.tabIndex > 0);

  const totalIssues =
    ariaIssues.length +
    focusIssues.length +
    contrastIssues.length +
    altTextIssues.length +
    formLabelIssues.length +
    keyboardIssues.length +
    headingIssues.length +
    landmarkIssues.length;

  const errors =
    ariaIssues.filter((i) => i.severity === 'error').length +
    focusIssues.length +
    contrastIssues.filter((i) => i.severity === 'error').length +
    altTextIssues.filter((i) => i.severity === 'error').length +
    formLabelIssues.filter((i) => i.severity === 'error').length +
    keyboardIssues.filter((i) => i.severity === 'error').length +
    headingIssues.filter((i) => i.severity === 'error').length +
    landmarkIssues.filter((i) => i.severity === 'error').length;

  const warnings =
    ariaIssues.filter((i) => i.severity === 'warning').length +
    contrastIssues.filter((i) => i.severity === 'warning').length +
    altTextIssues.filter((i) => i.severity === 'warning').length +
    formLabelIssues.filter((i) => i.severity === 'warning').length +
    keyboardIssues.filter((i) => i.severity === 'warning').length +
    headingIssues.filter((i) => i.severity === 'warning').length +
    landmarkIssues.filter((i) => i.severity === 'warning').length;

  const info =
    ariaIssues.filter((i) => i.severity === 'info').length +
    keyboardIssues.filter((i) => i.severity === 'info').length +
    headingIssues.filter((i) => i.severity === 'info').length +
    landmarkIssues.filter((i) => i.severity === 'info').length;

  const report: AccessibilityReport = {
    timestamp: Date.now(),
    url: window.location.href,
    summary: {
      totalIssues,
      errors,
      warnings,
      info,
    },
    aria: {
      issues: ariaIssues,
      count: ariaIssues.length,
    },
    focusOrder: {
      items: focusItems,
      issues: focusIssues,
      count: focusIssues.length,
    },
    contrast: {
      issues: contrastIssues,
      count: contrastIssues.length,
    },
    altText: {
      issues: altTextIssues,
      count: altTextIssues.length,
    },
    formLabels: {
      issues: formLabelIssues,
      count: formLabelIssues.length,
    },
    keyboardNav: {
      issues: keyboardIssues,
      count: keyboardIssues.length,
    },
    headings: {
      issues: headingIssues,
      count: headingIssues.length,
    },
    landmarks: {
      issues: landmarkIssues,
      count: landmarkIssues.length,
    },
  };

  lastReport = report;

  // Update highlights
  removeIssueHighlights();

  // Build issue highlights
  const issueHighlightsData: IssueHighlightInfo[] = [
    ...ariaIssues.map((i) => ({ selector: i.selector, severity: i.severity, msg: i.message })),
    ...contrastIssues.map((i) => ({
      selector: i.selector,
      severity: i.severity,
      msg: `Contrast ${i.ratio}:1 (needs ${i.requiredRatio}:1)`,
    })),
    ...altTextIssues.map((i) => ({
      selector: i.selector,
      severity: i.severity,
      msg: `Missing alt text: ${i.src}`,
    })),
    ...formLabelIssues.map((i) => ({ selector: i.selector, severity: i.severity, msg: i.message })),
    ...keyboardIssues.map((i) => ({ selector: i.selector, severity: i.severity, msg: i.issue })),
    ...headingIssues.map((i) => ({ selector: i.selector, severity: i.severity, msg: i.message })),
    ...landmarkIssues.map((i) => ({ selector: i.selector, severity: i.severity, msg: i.message })),
  ];

  // Highlight critical issues
  issueHighlightsData
    .filter((i) => i.severity === 'error' || i.severity === 'warning')
    .forEach((issue) => {
      createIssueHighlight(issue.selector, issue.severity, issue.msg || 'Accessibility issue');
    });

  // Update overlay if active
  if (isActive && overlayPanel) {
    updateOverlayPanel(report);
  }

  logger.log('[AccessibilityAudit] Report generated:', totalIssues, 'total issues');
  return report;
}

// ============================================
// UI Panel
// ============================================

/**
 * Create the audit panel overlay
 */
function createOverlayPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'fdh-accessibility-audit';
  panel.className = 'fdh-accessibility-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 420px;
    max-height: 80vh;
    z-index: ${Z_INDEX.panel};
    background: ${COLORS.bgDark};
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 16px;
    padding: 20px;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    font-size: 13px;
    color: ${COLORS.textPrimary};
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: ${COLORS.primary} #1e293b;
  `;

  // Add scrollbar styles
  const style = document.createElement('style');
  style.textContent = `
    #fdh-accessibility-audit::-webkit-scrollbar {
      width: 8px;
    }
    #fdh-accessibility-audit::-webkit-scrollbar-track {
      background: #1e293b;
      border-radius: 4px;
    }
    #fdh-accessibility-audit::-webkit-scrollbar-thumb {
      background: ${COLORS.primary};
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  const root = document.body ?? document.documentElement;
  if (!root) {
    throw new DOMException('No document root to mount accessibility panel', 'NotSupportedError');
  }
  root.appendChild(panel);
  return panel;
}

/**
 * Update overlay panel content
 */
function updateOverlayPanel(report: AccessibilityReport): void {
  if (!overlayPanel) return;

  // Update state references for report
  setReportState(showFocusOrder, highlightIssues);
  overlayPanel.innerHTML = buildReportContent(report);
  setupOverlayControls();
}

/**
 * Setup overlay control event listeners
 */
function setupOverlayControls(): void {
  if (!overlayPanel) return;

  // Close button
  const closeBtn = overlayPanel.querySelector('.fdh-audit-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', disable);
  }

  // Toggle focus order
  const toggleFocus = overlayPanel.querySelector('.fdh-toggle-focus');
  if (toggleFocus) {
    toggleFocus.addEventListener('click', () => {
      showFocusOrder = !showFocusOrder;
      createFocusOrderOverlays();
      if (lastReport) updateOverlayPanel(lastReport);
    });
  }

  // Toggle highlights
  const toggleHighlights = overlayPanel.querySelector('.fdh-toggle-highlights');
  if (toggleHighlights) {
    toggleHighlights.addEventListener('click', () => {
      highlightIssues = !highlightIssues;
      if (highlightIssues && lastReport) {
        removeIssueHighlights();
        const highlights: IssueHighlightInfo[] = [
          ...lastReport.aria.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: i.message,
          })),
          ...lastReport.contrast.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: `Contrast ${i.ratio}:1 (needs ${i.requiredRatio}:1)`,
          })),
          ...lastReport.altText.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: `Missing alt text: ${i.src}`,
          })),
          ...lastReport.formLabels.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: i.message,
          })),
          ...lastReport.keyboardNav.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: i.issue,
          })),
          ...(lastReport.headings?.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: i.message,
          })) || []),
          ...(lastReport.landmarks?.issues.map((i) => ({
            selector: i.selector,
            severity: i.severity,
            msg: i.message,
          })) || []),
        ];
        highlights
          .filter((i) => i.severity === 'error' || i.severity === 'warning')
          .forEach((issue) =>
            createIssueHighlight(issue.selector, issue.severity, issue.msg || 'Accessibility issue')
          );
      } else {
        removeIssueHighlights();
      }
      if (lastReport) updateOverlayPanel(lastReport);
    });
  }

  // Rerun audit
  const rerunBtn = overlayPanel.querySelector('.fdh-rerun-audit');
  if (rerunBtn) {
    rerunBtn.addEventListener('click', () => {
      runAudit();
    });
  }

  // Section headers (collapsible)
  const sectionHeaders = overlayPanel.querySelectorAll('.fdh-section-header');
  sectionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.getAttribute('data-section');
      const content = overlayPanel?.querySelector(`.fdh-section-${section}`);
      if (content) {
        const isVisible = (content as HTMLElement).style.display !== 'none';
        (content as HTMLElement).style.display = isVisible ? 'none' : 'block';
        const arrow = header.querySelector('span:last-child');
        if (arrow) arrow.textContent = isVisible ? '▶' : '▼';
      }
    });
  });

  // Export report
  const exportBtn = overlayPanel.querySelector('.fdh-export-report');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!lastReport) return;

      const reportText = generateTextReport(lastReport);

      navigator.clipboard.writeText(reportText).then(() => {
        const btn = exportBtn as HTMLButtonElement;
        btn.textContent = '✓ Copied!';
        setTimeout(() => (btn.textContent = '📋 Copy Report'), 1500);
      });
    });
  }

  const exportJsonBtn = overlayPanel.querySelector('.fdh-export-json-report');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      if (!lastReport) return;
      const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fdh-a11y-audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const btn = exportJsonBtn as HTMLButtonElement;
      const prev = btn.textContent;
      btn.textContent = '✓ Saved';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    });
  }

  const exportMdBtn = overlayPanel.querySelector('.fdh-export-md-report');
  if (exportMdBtn) {
    exportMdBtn.addEventListener('click', () => {
      if (!lastReport) return;
      const md = generateMarkdownReport(lastReport);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fdh-a11y-audit-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      const btn = exportMdBtn as HTMLButtonElement;
      const prev = btn.textContent;
      btn.textContent = '✓ Saved';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    });
  }
}

/**
 * Handle keyboard events
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    disable();
  }
}

// ============================================
// Public API
// ============================================

/**
 * Enable Accessibility Audit
 */
export function enable(): void {
  if (isActive) return;

  try {
    isActive = true;

    // Create overlay panel
    overlayPanel = createOverlayPanel();

    // Run initial audit
    const report = runAudit();
    updateOverlayPanel(report);

    // Create focus order overlays
    createFocusOrderOverlays();

    // Setup keyboard handler
    keyHandler = handleKeyDown;
    document.addEventListener('keydown', keyHandler);

    logger.log('[AccessibilityAudit] Enabled');
  } catch (err) {
    isActive = false;
    if (keyHandler) {
      try {
        document.removeEventListener('keydown', keyHandler);
      } catch {
        // ignore
      }
      keyHandler = null;
    }
    removeFocusOrderOverlays();
    removeIssueHighlights();
    if (overlayPanel) {
      try {
        overlayPanel.remove();
      } catch {
        // ignore
      }
      overlayPanel = null;
    }
    logger.error('[AccessibilityAudit] enable failed:', err);
    showContentErrorToast(
      'Accessibility audit could not start on this page. Try a normal HTML page (not a restricted or embedded viewer).'
    );
  }
}

/**
 * Disable Accessibility Audit
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Remove event listeners
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  // Remove overlays
  removeFocusOrderOverlays();
  removeIssueHighlights();

  if (overlayPanel) {
    overlayPanel.remove();
    overlayPanel = null;
  }

  logger.log('[AccessibilityAudit] Disabled');
}

/**
 * Toggle Accessibility Audit
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): AccessibilityAuditState {
  return {
    enabled: isActive,
    showFocusOrder,
    highlightIssues,
    lastReport,
  };
}

/**
 * Cleanup and destroy
 */
export function destroy(): void {
  disable();
}

// ============================================
// Export Singleton API
// ============================================

export const accessibilityAudit = {
  enable,
  disable,
  toggle,
  runAudit,
  getState,
  destroy,
};

export default accessibilityAudit;
