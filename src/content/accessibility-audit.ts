/**
 * Accessibility Audit Tool
 *
 * Comprehensive accessibility checker providing:
 * - ARIA validation
 * - Focus order visualization
 * - Color contrast analysis
 * - Missing alt text detection
 * - Form label validation
 * - Keyboard navigation testing
 */

import { getContrastRatio, parseColor } from '../utils/color';
import { logger } from '../utils/logger';
import { escapeHtml } from '@/utils/sanitize';

// ============================================
// TypeScript Interfaces
// ============================================

/** Issue severity level */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** ARIA issue details */
export interface ARIAIssue {
  element: string;
  attribute?: string;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Focus order item */
export interface FocusOrderItem {
  index: number;
  element: string;
  selector: string;
  tabIndex: number;
  visible: boolean;
}

/** Color contrast issue */
export interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  severity: IssueSeverity;
  selector: string;
}

/** Missing alt text issue */
export interface AltTextIssue {
  src: string;
  element: string;
  severity: IssueSeverity;
  selector: string;
}

/** Form label issue */
export interface FormLabelIssue {
  inputType: string;
  inputId?: string;
  inputName?: string;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Keyboard navigation issue */
export interface KeyboardNavIssue {
  element: string;
  issue: string;
  severity: IssueSeverity;
  selector: string;
}

/** Complete accessibility report */
export interface AccessibilityReport {
  timestamp: number;
  url: string;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  aria: {
    issues: ARIAIssue[];
    count: number;
  };
  focusOrder: {
    items: FocusOrderItem[];
    issues: FocusOrderItem[];
    count: number;
  };
  contrast: {
    issues: ContrastIssue[];
    count: number;
  };
  altText: {
    issues: AltTextIssue[];
    count: number;
  };
  formLabels: {
    issues: FormLabelIssue[];
    count: number;
  };
  keyboardNav: {
    issues: KeyboardNavIssue[];
    count: number;
  };
}

/** Current state of the accessibility audit */
export interface AccessibilityAuditState {
  enabled: boolean;
  showFocusOrder: boolean;
  highlightIssues: boolean;
  lastReport: AccessibilityReport | null;
}

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
// ARIA Validation
// ============================================

const VALID_ARIA_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

const VALID_ARIA_STATES = new Set([
  'aria-atomic',
  'aria-autocomplete',
  'aria-busy',
  'aria-checked',
  'aria-colcount',
  'aria-colindex',
  'aria-colspan',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-expanded',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-level',
  'aria-live',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-orientation',
  'aria-owns',
  'aria-placeholder',
  'aria-posinset',
  'aria-pressed',
  'aria-readonly',
  'aria-relevant',
  'aria-required',
  'aria-roledescription',
  'aria-rowcount',
  'aria-rowindex',
  'aria-rowspan',
  'aria-selected',
  'aria-setsize',
  'aria-sort',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
  'aria-valuetext',
]);

/**
 * Validate ARIA attributes on elements
 */
function validateARIA(): ARIAIssue[] {
  const issues: ARIAIssue[] = [];
  const elements = document.querySelectorAll<HTMLElement>('[role], [aria-*]');

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const selector = getSelector(el);

    // Check role validity
    const role = el.getAttribute('role');
    if (role && !VALID_ARIA_ROLES.has(role)) {
      issues.push({
        element: tag,
        attribute: `role="${role}"`,
        message: `Invalid ARIA role: "${role}"`,
        severity: 'error',
        selector,
      });
    }

    // Check for deprecated roles
    if (role === 'directory') {
      issues.push({
        element: tag,
        attribute: `role="${role}"`,
        message: 'Deprecated role: "directory" is no longer recommended',
        severity: 'warning',
        selector,
      });
    }

    // Check aria-hidden on focusable elements
    if (el.getAttribute('aria-hidden') === 'true') {
      const isFocusable = el.matches(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (isFocusable) {
        issues.push({
          element: tag,
          attribute: 'aria-hidden="true"',
          message:
            'Focusable element has aria-hidden="true", which may cause keyboard navigation issues',
          severity: 'error',
          selector,
        });
      }
    }

    // Check for aria-label without accessible name on interactive elements
    const interactiveElements = ['a', 'button', 'input', 'select', 'textarea'];
    const hasAccessibleName =
      el.hasAttribute('aria-label') ||
      el.hasAttribute('aria-labelledby') ||
      (el as HTMLInputElement).placeholder ||
      (el.textContent?.trim() ?? '').length > 0;

    if (interactiveElements.includes(tag) && !hasAccessibleName) {
      issues.push({
        element: tag,
        message: `Interactive ${tag} element lacks accessible name (aria-label, aria-labelledby, or text content)`,
        severity: 'error',
        selector,
      });
    }

    // Check for invalid aria-* attributes
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('aria-') && !VALID_ARIA_STATES.has(attr.name)) {
        issues.push({
          element: tag,
          attribute: attr.name,
          message: `Invalid ARIA attribute: "${attr.name}"`,
          severity: 'warning',
          selector,
        });
      }
    }

    // Check required attributes for specific roles
    if (role === 'checkbox' && !el.hasAttribute('aria-checked')) {
      issues.push({
        element: tag,
        attribute: 'role="checkbox"',
        message: 'Checkbox role requires aria-checked attribute',
        severity: 'error',
        selector,
      });
    }

    if (role === 'tab' && !el.hasAttribute('aria-selected')) {
      issues.push({
        element: tag,
        attribute: 'role="tab"',
        message: 'Tab role should have aria-selected attribute',
        severity: 'warning',
        selector,
      });
    }
  });

  return issues;
}

// ============================================
// Focus Order Visualization
// ============================================

/**
 * Get all focusable elements in tab order
 */
function getFocusableElements(): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
    'area[href]',
    'details > summary',
    'iframe',
    'object[usemap]',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]',
  ].join(', ');

  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

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
      border: 2px solid #6366f1;
      border-radius: 4px;
      z-index: 2147483646;
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
      background: #6366f1;
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
// Color Contrast Analysis
// ============================================

/**
 * Check if element is visible
 */
function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Get effective background color of element
 */
function getBackgroundColor(el: Element): string {
  let current: Element | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    current = current.parentElement;
  }
  return 'rgb(255, 255, 255)'; // Default to white
}

/**
 * Analyze color contrast issues
 */
function analyzeContrast(): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const textElements = document.querySelectorAll<HTMLElement>(
    'p, h1, h2, h3, h4, h5, h6, span, a, button, label, li, td, th, figcaption, blockquote'
  );

  textElements.forEach((el) => {
    if (!isVisible(el)) return;

    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = getBackgroundColor(el);

    // Parse colors
    const fgParsed = parseColor(color);
    const bgParsed = parseColor(bgColor);

    if (!fgParsed || !bgParsed) return;

    // Calculate contrast ratio
    const ratio = getContrastRatio(color, bgColor);

    // Determine required ratio based on text size
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight, 10) >= 700);
    const requiredRatio = isLargeText ? 3 : 4.5;

    if (ratio < requiredRatio) {
      issues.push({
        element: el.tagName.toLowerCase(),
        foreground: color,
        background: bgColor,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        severity: ratio < requiredRatio - 1 ? 'error' : 'warning',
        selector: getSelector(el),
      });
    }
  });

  return issues;
}

// ============================================
// Missing Alt Text Detection
// ============================================

/**
 * Detect missing alt text on images
 */
function detectMissingAltText(): AltTextIssue[] {
  const issues: AltTextIssue[] = [];

  // Check img elements
  const images = document.querySelectorAll<HTMLImageElement>('img');
  images.forEach((img) => {
    if (
      !img.hasAttribute('alt') &&
      !img.hasAttribute('aria-label') &&
      !img.hasAttribute('aria-labelledby')
    ) {
      // Check if it's decorative (has role="presentation" or aria-hidden)
      if (
        img.getAttribute('role') !== 'presentation' &&
        img.getAttribute('aria-hidden') !== 'true'
      ) {
        issues.push({
          src: img.src.substring(0, 50) + (img.src.length > 50 ? '...' : ''),
          element: 'img',
          severity: 'error',
          selector: getSelector(img),
        });
      }
    }
  });

  // Check area elements within maps
  const areas = document.querySelectorAll<HTMLAreaElement>('area:not([alt])');
  areas.forEach((area) => {
    issues.push({
      src: area.href || 'image-map-area',
      element: 'area',
      severity: 'error',
      selector: getSelector(area),
    });
  });

  // Check SVG elements without accessible names
  const svgs = document.querySelectorAll<SVGSVGElement>('svg');
  svgs.forEach((svg) => {
    const hasTitle = svg.querySelector('title') !== null;
    const hasAriaLabel = svg.hasAttribute('aria-label');
    const hasAriaLabelledBy = svg.hasAttribute('aria-labelledby');
    const isDecorative =
      svg.getAttribute('role') === 'presentation' || svg.getAttribute('aria-hidden') === 'true';

    if (!hasTitle && !hasAriaLabel && !hasAriaLabelledBy && !isDecorative) {
      issues.push({
        src: 'svg-icon',
        element: 'svg',
        severity: 'warning',
        selector: getSelector(svg),
      });
    }
  });

  return issues;
}

// ============================================
// Form Label Validation
// ============================================

/**
 * Validate form labels
 */
function validateFormLabels(): FormLabelIssue[] {
  const issues: FormLabelIssue[] = [];

  // Find all form inputs that need labels
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]), select, textarea'
  );

  inputs.forEach((input) => {
    const type = input.type || input.tagName.toLowerCase();
    const id = input.id;
    const name = input.name;
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const placeholder = input.placeholder;
    const title = input.title;
    const selector = getSelector(input);

    // Check for associated label
    let hasLabel = false;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) hasLabel = true;
    }
    // Check if wrapped in label
    if (input.closest('label')) {
      hasLabel = true;
    }

    // Check for accessible name
    const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledBy || placeholder || title;

    if (!hasAccessibleName) {
      issues.push({
        inputType: type,
        inputId: id || undefined,
        inputName: name || undefined,
        message: `Form input lacks accessible label (use <label>, aria-label, or aria-labelledby)`,
        severity: 'error',
        selector,
      });
    }

    // Warn about placeholder-only labels
    if (placeholder && !hasLabel && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        inputType: type,
        inputId: id || undefined,
        inputName: name || undefined,
        message: 'Placeholder is not a suitable replacement for a label (disappears when typing)',
        severity: 'warning',
        selector,
      });
    }
  });

  // Check for orphaned labels (labels without associated input)
  const labels = document.querySelectorAll<HTMLLabelElement>('label');
  labels.forEach((label) => {
    const forAttr = label.getAttribute('for');
    if (forAttr && !document.getElementById(forAttr)) {
      issues.push({
        inputType: 'orphan-label',
        inputId: forAttr,
        message: `Label references non-existent element with id="${forAttr}"`,
        severity: 'error',
        selector: getSelector(label),
      });
    }
  });

  return issues;
}

// ============================================
// Keyboard Navigation Testing
// ============================================

/**
 * Test keyboard navigation
 */
function testKeyboardNav(): KeyboardNavIssue[] {
  const issues: KeyboardNavIssue[] = [];

  // Find interactive elements without keyboard support
  const clickableElements = document.querySelectorAll<HTMLElement>(
    '[onclick], [ondblclick], [onmousedown], [onmouseup]'
  );

  clickableElements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const isInteractive = ['a', 'button', 'input', 'select', 'textarea'].includes(tag);
    const hasKeyHandler =
      el.hasAttribute('onkeydown') || el.hasAttribute('onkeyup') || el.hasAttribute('onkeypress');
    const isFocusable = el.hasAttribute('tabindex') || isInteractive;

    if (!isInteractive && !hasKeyHandler) {
      issues.push({
        element: tag,
        issue:
          'Element has mouse events but no keyboard support (add tabindex and keyboard handlers)',
        severity: 'error',
        selector: getSelector(el),
      });
    }

    if (!isInteractive && !isFocusable) {
      issues.push({
        element: tag,
        issue: 'Clickable element is not focusable (add tabindex="0")',
        severity: 'error',
        selector: getSelector(el),
      });
    }
  });

  // Check for skip links
  const hasSkipLink = document.querySelector('a[href^="#"]');
  const mainContent = document.querySelector('main, [role="main"], #main, #content');
  if (mainContent && !hasSkipLink) {
    issues.push({
      element: 'document',
      issue: 'Consider adding a "skip to main content" link for keyboard users',
      severity: 'info',
      selector: 'body',
    });
  }

  // Check for focus traps
  const modals = document.querySelectorAll(
    '[role="dialog"], [role="alertdialog"], .modal, .dialog'
  );
  modals.forEach((modal) => {
    if (!modal.hasAttribute('aria-modal')) {
      issues.push({
        element: modal.tagName.toLowerCase(),
        issue: 'Modal dialog missing aria-modal attribute (may not trap focus properly)',
        severity: 'warning',
        selector: getSelector(modal),
      });
    }
  });

  // Check for elements with negative tabindex
  const negativeTabindex = document.querySelectorAll('[tabindex="-1"]');
  negativeTabindex.forEach((el) => {
    const isInteractive = el.matches('a, button, input, select, textarea');
    if (isInteractive) {
      issues.push({
        element: el.tagName.toLowerCase(),
        issue: 'Interactive element has tabindex="-1", making it unreachable via keyboard',
        severity: 'warning',
        selector: getSelector(el),
      });
    }
  });

  return issues;
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
function createIssueHighlight(selector: string, type: IssueSeverity, message: string): void {
  if (!highlightIssues) return;

  try {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const color = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';

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
        z-index: 2147483645;
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

  const focusIssues = focusItems.filter((item) => !item.visible || item.tabIndex > 0);

  const totalIssues =
    ariaIssues.length +
    focusIssues.length +
    contrastIssues.length +
    altTextIssues.length +
    formLabelIssues.length +
    keyboardIssues.length;

  const errors =
    ariaIssues.filter((i) => i.severity === 'error').length +
    focusIssues.length +
    contrastIssues.filter((i) => i.severity === 'error').length +
    altTextIssues.filter((i) => i.severity === 'error').length +
    formLabelIssues.filter((i) => i.severity === 'error').length +
    keyboardIssues.filter((i) => i.severity === 'error').length;

  const warnings =
    ariaIssues.filter((i) => i.severity === 'warning').length +
    contrastIssues.filter((i) => i.severity === 'warning').length +
    altTextIssues.filter((i) => i.severity === 'warning').length +
    formLabelIssues.filter((i) => i.severity === 'warning').length +
    keyboardIssues.filter((i) => i.severity === 'warning').length;

  const info =
    ariaIssues.filter((i) => i.severity === 'info').length +
    keyboardIssues.filter((i) => i.severity === 'info').length;

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
  };

  lastReport = report;

  // Update highlights
  removeIssueHighlights();

  // Highlight critical issues
  [
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
  ]
    .filter((i) => i.severity === 'error' || i.severity === 'warning')
    .forEach((issue) => {
      createIssueHighlight(issue.selector, issue.severity, issue.msg || 'Accessibility issue');
    });

  // Update overlay if active
  if (isActive && overlayPanel) {
    updateOverlayPanel(report);
  }

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
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 16px;
    padding: 20px;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    font-size: 13px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #6366f1 #1e293b;
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
      background: #6366f1;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(panel);
  return panel;
}

/**
 * Build report content HTML
 */
function buildReportContent(report: AccessibilityReport): string {
  const { summary } = report;

  const getSeverityIcon = (s: IssueSeverity) => {
    if (s === 'error') return '🔴';
    if (s === 'warning') return '🟡';
    return '🔵';
  };

  const getSeverityColor = (s: IssueSeverity) => {
    if (s === 'error') return '#ef4444';
    if (s === 'warning') return '#f59e0b';
    return '#3b82f6';
  };

  const formatIssueList = (
    issues: Array<{ severity: IssueSeverity; message?: string; element?: string }>,
    emptyMsg: string
  ) => {
    if (issues.length === 0) {
      return `<div style="color: #22c55e; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">✓ ${emptyMsg}</div>`;
    }
    return issues
      .map(
        (i) => `
      <div style="
        padding: 10px 12px;
        margin-bottom: 8px;
        background: rgba(30, 41, 59, 0.5);
        border-left: 3px solid ${getSeverityColor(i.severity)};
        border-radius: 0 8px 8px 0;
        font-size: 12px;
      ">
        <span style="color: ${getSeverityColor(i.severity)}; margin-right: 6px;">${getSeverityIcon(i.severity)}</span>
        <span style="color: #94a3b8;">${i.element || 'element'}:</span> ${i.message || 'Issue detected'}
      </div>
    `
      )
      .join('');
  };

  return `
    <!-- Header -->
    <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(99, 102, 241, 0.3); padding-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 18px; color: #c084fc; display: flex; align-items: center; gap: 8px;">
          ♿ Accessibility Audit
        </h3>
        <button class="fdh-audit-close" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: color 0.2s;
        ">×</button>
      </div>
      
      <!-- Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <div style="
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1));
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(99, 102, 241, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: #818cf8;">${summary.totalIssues}</div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Total</div>
        </div>
        <div style="
          background: rgba(239, 68, 68, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(239, 68, 68, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${summary.errors}</div>
          <div style="font-size: 10px; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px;">Errors</div>
        </div>
        <div style="
          background: rgba(245, 158, 11, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(245, 158, 11, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${summary.warnings}</div>
          <div style="font-size: 10px; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">Warnings</div>
        </div>
        <div style="
          background: rgba(59, 130, 246, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(59, 130, 246, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${summary.info}</div>
          <div style="font-size: 10px; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px;">Info</div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <button class="fdh-toggle-focus" style="
        flex: 1;
        background: ${showFocusOrder ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">${showFocusOrder ? '🔢 Hide' : '🔢 Show'} Focus Order</button>
      <button class="fdh-toggle-highlights" style="
        flex: 1;
        background: ${highlightIssues ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">${highlightIssues ? '🎯 Hide' : '🎯 Show'} Highlights</button>
      <button class="fdh-rerun-audit" style="
        flex: 1;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: #4ade80;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">🔄 Rerun</button>
    </div>

    <!-- ARIA Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="aria">
        <span style="font-weight: 600; color: #c084fc;">🏷️ ARIA (${report.aria.count})</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-aria" style="display: block;">
        ${formatIssueList(report.aria.issues, 'No ARIA issues found')}
      </div>
    </div>

    <!-- Focus Order Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="focus">
        <span style="font-weight: 600; color: #c084fc;">🎯 Focus Order (${report.focusOrder.items.length} elements)</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-focus" style="display: ${report.focusOrder.issues.length > 0 ? 'block' : 'none'};">
        ${
          report.focusOrder.issues.length > 0
            ? report.focusOrder.issues
                .map(
                  (i) => `
            <div style="padding: 8px 12px; margin-bottom: 6px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 11px;">
              <span style="color: #ef4444;">⚠</span> #${i.index} ${i.element} - ${i.visible ? 'custom tabindex' : 'not visible'}
            </div>
          `
                )
                .join('')
            : '<div style="color: #22c55e; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; font-size: 12px;">✓ Focus order looks good</div>'
        }
      </div>
    </div>

    <!-- Color Contrast Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="contrast">
        <span style="font-weight: 600; color: #c084fc;">🎨 Color Contrast (${report.contrast.count})</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-contrast" style="display: block;">
        ${
          report.contrast.issues.length === 0
            ? '<div style="color: #22c55e; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">✓ All text meets contrast requirements</div>'
            : report.contrast.issues
                .slice(0, 10)
                .map(
                  (i) => `
            <div style="
              padding: 10px 12px;
              margin-bottom: 8px;
              background: rgba(30, 41, 59, 0.5);
              border-left: 3px solid ${getSeverityColor(i.severity)};
              border-radius: 0 8px 8px 0;
              font-size: 11px;
            ">
              <div style="margin-bottom: 4px;">
                <span style="color: ${getSeverityColor(i.severity)};">${getSeverityIcon(i.severity)}</span>
                <span style="color: #94a3b8;">${i.element}:</span> ${i.ratio}:1 (needs ${i.requiredRatio}:1)
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="padding: 2px 8px; background: ${i.foreground}; color: ${i.background}; border-radius: 4px; font-size: 10px;">Aa</span>
                <span style="color: #64748b; font-size: 10px;">${i.foreground} on ${i.background}</span>
              </div>
            </div>
          `
                )
                .join('') +
              (
                report.contrast.issues.length > 10
                  ? `<div style="text-align: center; color: #64748b; font-size: 11px;">...and ${report.contrast.issues.length - 10} more</div>`
                  : ''
              )
        }
      </div>
    </div>

    <!-- Alt Text Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="alt">
        <span style="font-weight: 600; color: #c084fc;">🖼️ Alt Text (${report.altText.count})</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-alt" style="display: block;">
        ${formatIssueList(
          report.altText.issues.map((i) => ({ ...i, message: `Missing alt: ${i.src}` })),
          'All images have alt text'
        )}
      </div>
    </div>

    <!-- Form Labels Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="labels">
        <span style="font-weight: 600; color: #c084fc;">📝 Form Labels (${report.formLabels.count})</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-labels" style="display: block;">
        ${formatIssueList(
          report.formLabels.issues.map((i) => ({ ...i, element: i.inputType })),
          'All form inputs are properly labeled'
        )}
      </div>
    </div>

    <!-- Keyboard Navigation Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="keyboard">
        <span style="font-weight: 600; color: #c084fc;">⌨️ Keyboard Nav (${report.keyboardNav.count})</span>
        <span style="color: #64748b;">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-keyboard" style="display: block;">
        ${formatIssueList(
          report.keyboardNav.issues.map((i) => ({ ...i, element: i.element })),
          'No keyboard navigation issues'
        )}
      </div>
    </div>

    <!-- Footer -->
    <div style="
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(99, 102, 241, 0.3);
      text-align: center;
      font-size: 11px;
      color: #64748b;
    ">
      <div>Audited: ${new Date(report.timestamp).toLocaleString()}</div>
      <div style="margin-top: 8px;">
        <button class="fdh-export-report" style="
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 6px;
          padding: 8px 16px;
          color: #818cf8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        ">📋 Copy Report</button>
      </div>
      <div style="margin-top: 12px;">
        Press <kbd style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
      </div>
    </div>
  `;
}

/**
 * Update overlay panel content
 */
function updateOverlayPanel(report: AccessibilityReport): void {
  if (!overlayPanel) return;
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
        [
          ...lastReport.aria.issues.map((i) => ({ ...i, msg: i.message })),
          ...lastReport.contrast.issues.map((i) => ({
            ...i,
            msg: `Contrast ${i.ratio}:1 (needs ${i.requiredRatio}:1)`,
          })),
          ...lastReport.altText.issues.map((i) => ({ ...i, msg: `Missing alt text: ${i.src}` })),
          ...lastReport.formLabels.issues.map((i) => ({ ...i, msg: i.message })),
          ...lastReport.keyboardNav.issues.map((i) => ({ ...i, msg: i.issue })),
        ]
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

      const reportText = `
Accessibility Audit Report
==========================
URL: ${lastReport.url}
Date: ${new Date(lastReport.timestamp).toLocaleString()}

Summary
-------
Total Issues: ${lastReport.summary.totalIssues}
Errors: ${lastReport.summary.errors}
Warnings: ${lastReport.summary.warnings}
Info: ${lastReport.summary.info}

ARIA Issues (${lastReport.aria.count})
-------------------
${lastReport.aria.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.message}`).join('\n') || 'None'}

Focus Order (${lastReport.focusOrder.items.length} elements, ${lastReport.focusOrder.issues.length} issues)
-----------
${lastReport.focusOrder.issues.map((i) => `#${i.index} ${i.element} - ${i.visible ? 'custom tabindex' : 'not visible'}`).join('\n') || 'No issues'}

Color Contrast Issues (${lastReport.contrast.count})
---------------------
${lastReport.contrast.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.ratio}:1 (needs ${i.requiredRatio}:1)`).join('\n') || 'None'}

Missing Alt Text (${lastReport.altText.count})
-----------------
${lastReport.altText.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.src}`).join('\n') || 'None'}

Form Label Issues (${lastReport.formLabels.count})
------------------
${lastReport.formLabels.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.inputType}: ${i.message}`).join('\n') || 'None'}

Keyboard Navigation Issues (${lastReport.keyboardNav.count})
---------------------------
${lastReport.keyboardNav.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.issue}`).join('\n') || 'None'}
      `.trim();

      navigator.clipboard.writeText(reportText).then(() => {
        const btn = exportBtn as HTMLButtonElement;
        btn.textContent = '✓ Copied!';
        setTimeout(() => (btn.textContent = '📋 Copy Report'), 1500);
      });
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
