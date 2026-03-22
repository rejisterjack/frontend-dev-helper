/**
 * Keyboard Navigation Audits
 */

import { logger } from '@/utils/logger';
import type { KeyboardNavIssue } from '../types';

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
 * Test keyboard navigation
 */
export function testKeyboardNav(): KeyboardNavIssue[] {
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

  logger.log(
    '[AccessibilityAudit] Keyboard navigation test complete:',
    issues.length,
    'issues found'
  );
  return issues;
}
