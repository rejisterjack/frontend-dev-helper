/**
 * Image Accessibility Audits
 */

import { logger } from '@/utils/logger';
import type { AltTextIssue } from '../types';

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
 * Detect missing alt text on images
 */
export function detectMissingAltText(): AltTextIssue[] {
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

  logger.log('[AccessibilityAudit] Alt text detection complete:', issues.length, 'issues found');
  return issues;
}
