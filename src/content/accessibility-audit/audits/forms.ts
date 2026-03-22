/**
 * Form Accessibility Audits
 */

import { logger } from '@/utils/logger';
import type { FormLabelIssue } from '../types';

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
 * Validate form labels
 */
export function validateFormLabels(): FormLabelIssue[] {
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

  logger.log('[AccessibilityAudit] Form label validation complete:', issues.length, 'issues found');
  return issues;
}
