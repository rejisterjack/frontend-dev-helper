/**
 * Landmark Region Audits
 */

import { logger } from '@/utils/logger';
import type { LandmarkIssue } from '../types';

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
 * Validate landmark regions
 * Checks for:
 * - Main landmark presence
 * - Navigation landmark presence
 * - Duplicate main landmarks
 * - Regions without labels
 */
export function validateLandmarks(): LandmarkIssue[] {
  const issues: LandmarkIssue[] = [];

  // Check for main landmark
  const mainElement = document.querySelector('main, [role="main"]');
  if (!mainElement) {
    issues.push({
      element: 'body',
      message: 'No main landmark found (use <main> or role="main")',
      severity: 'warning',
      selector: 'body',
    });
  }

  // Check for duplicate main landmarks
  const mainElements = document.querySelectorAll('main, [role="main"]');
  if (mainElements.length > 1) {
    issues.push({
      element: 'main',
      role: 'main',
      message: `Multiple main landmarks found (${mainElements.length}). Only one main landmark is recommended`,
      severity: 'warning',
      selector: 'body',
    });
  }

  // Check for navigation
  const navElements = document.querySelectorAll('nav, [role="navigation"]');
  if (navElements.length === 0) {
    issues.push({
      element: 'body',
      message: 'No navigation landmark found (use <nav> or role="navigation")',
      severity: 'info',
      selector: 'body',
    });
  }

  // Check regions without labels
  const regions = document.querySelectorAll('[role="region"], section');
  regions.forEach((region) => {
    const hasLabel =
      region.hasAttribute('aria-label') ||
      region.hasAttribute('aria-labelledby') ||
      region.hasAttribute('title');

    if (!hasLabel) {
      issues.push({
        element: region.tagName.toLowerCase(),
        role: region.getAttribute('role') || undefined,
        message: 'Region/section without accessible label (add aria-label or aria-labelledby)',
        severity: 'info',
        selector: getSelector(region),
      });
    }
  });

  // Check for banner (header should not be inside main)
  const banners = document.querySelectorAll('header, [role="banner"]');
  banners.forEach((banner) => {
    const insideMain = banner.closest('main, [role="main"]');
    if (insideMain) {
      issues.push({
        element: banner.tagName.toLowerCase(),
        role: banner.getAttribute('role') || 'banner',
        message: 'Banner landmark should not be inside main content',
        severity: 'warning',
        selector: getSelector(banner),
      });
    }
  });

  // Check for contentinfo (footer should not be inside main)
  const contentInfos = document.querySelectorAll('footer, [role="contentinfo"]');
  contentInfos.forEach((contentInfo) => {
    const insideMain = contentInfo.closest('main, [role="main"]');
    if (insideMain) {
      issues.push({
        element: contentInfo.tagName.toLowerCase(),
        role: contentInfo.getAttribute('role') || 'contentinfo',
        message: 'Contentinfo landmark should not be inside main content',
        severity: 'warning',
        selector: getSelector(contentInfo),
      });
    }
  });

  logger.log('[AccessibilityAudit] Landmark validation complete:', issues.length, 'issues found');
  return issues;
}
