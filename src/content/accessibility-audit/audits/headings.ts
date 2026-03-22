/**
 * Heading Structure Audits
 */

import { logger } from '@/utils/logger';
import type { HeadingIssue } from '../types';

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
 * Validate heading structure
 * Checks for:
 * - Skipped heading levels (e.g., h1 -> h3)
 * - Missing h1
 * - Multiple h1 elements
 */
export function validateHeadings(): HeadingIssue[] {
  const issues: HeadingIssue[] = [];
  const headings = document.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6');

  let previousLevel = 0;
  let h1Count = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1], 10);
    const selector = getSelector(heading);

    // Check for h1
    if (level === 1) {
      h1Count++;
    }

    // Check for skipped levels
    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        element: heading.tagName.toLowerCase(),
        level,
        previousLevel,
        message: `Heading level skipped: h${previousLevel} is followed by h${level}`,
        severity: 'warning',
        selector,
      });
    }

    previousLevel = level;
  });

  // Check for missing h1
  if (h1Count === 0) {
    issues.push({
      element: 'body',
      level: 0,
      previousLevel: 0,
      message: 'No h1 element found on page',
      severity: 'error',
      selector: 'body',
    });
  }

  // Check for multiple h1s
  if (h1Count > 1) {
    issues.push({
      element: 'body',
      level: 1,
      previousLevel: 0,
      message: `Multiple h1 elements found (${h1Count}). Consider using only one h1 per page`,
      severity: 'info',
      selector: 'body',
    });
  }

  logger.log('[AccessibilityAudit] Heading validation complete:', issues.length, 'issues found');
  return issues;
}
