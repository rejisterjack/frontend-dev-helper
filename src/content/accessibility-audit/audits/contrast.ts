/**
 * Color Contrast Audits
 */

import { getContrastRatio, parseColor } from '@/utils/color';
import { logger } from '@/utils/logger';
import { TEXT_CONTRAST_SELECTOR } from '../constants';
import type { ContrastIssue } from '../types';

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
export function analyzeContrast(): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const textElements = document.querySelectorAll<HTMLElement>(TEXT_CONTRAST_SELECTOR);

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

  logger.log('[AccessibilityAudit] Contrast analysis complete:', issues.length, 'issues found');
  return issues;
}
