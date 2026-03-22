/**
 * ARIA Validation Audits
 */

import { logger } from '@/utils/logger';
import { INTERACTIVE_ELEMENTS, VALID_ARIA_ROLES, VALID_ARIA_STATES } from '../constants';
import type { ARIAIssue } from '../types';

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
 * Validate ARIA attributes on elements
 */
export function validateARIA(): ARIAIssue[] {
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
    const hasAccessibleName =
      el.hasAttribute('aria-label') ||
      el.hasAttribute('aria-labelledby') ||
      (el as HTMLInputElement).placeholder ||
      (el.textContent?.trim() ?? '').length > 0;

    if (INTERACTIVE_ELEMENTS.includes(tag) && !hasAccessibleName) {
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

  logger.log('[AccessibilityAudit] ARIA validation complete:', issues.length, 'issues found');
  return issues;
}
