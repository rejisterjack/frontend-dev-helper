/**
 * Quick Fixes System
 *
 * One-click automated fixes for common issues detected by the AI analyzer.
 */

import type { AISuggestion } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Apply a quick fix for a suggestion
 */
export async function applyFix(suggestion: AISuggestion): Promise<boolean> {
  if (!suggestion.autoFixable || !suggestion.fix) {
    logger.warn('[QuickFix] Cannot apply fix - not auto-fixable');
    return false;
  }

  try {
    const result = await suggestion.fix();
    logger.log(`[QuickFix] Applied fix for: ${suggestion.title}`);
    return result;
  } catch (error) {
    logger.error('[QuickFix] Failed to apply fix:', error);
    return false;
  }
}

/**
 * Batch apply multiple fixes
 */
export async function applyMultipleFixes(suggestions: AISuggestion[]): Promise<{
  applied: number;
  failed: number;
  results: { suggestion: AISuggestion; success: boolean }[];
}> {
  const results: { suggestion: AISuggestion; success: boolean }[] = [];

  for (const suggestion of suggestions) {
    const success = await applyFix(suggestion);
    results.push({ suggestion, success });
  }

  return {
    applied: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Apply all auto-fixable suggestions
 */
export async function applyAllFixes(suggestions: AISuggestion[]): Promise<{
  applied: number;
  failed: number;
}> {
  const autoFixable = suggestions.filter((s) => s.autoFixable);
  const result = await applyMultipleFixes(autoFixable);

  return {
    applied: result.applied,
    failed: result.failed,
  };
}

/**
 * Generate CSS for fixing common issues
 */
export function generateFixCSS(): string {
  return `
    /* Focus styles for elements missing them */
    a:focus-visible,
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 2px solid #4f46e5 !important;
      outline-offset: 2px !important;
    }

    /* Ensure images have alt text display */
    img:not([alt]) {
      border: 2px dashed #ef4444 !important;
      position: relative;
    }

    img:not([alt])::after {
      content: "Missing alt" !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      background: #ef4444 !important;
      color: white !important;
      font-size: 10px !important;
      padding: 2px 4px !important;
    }

    /* Highlight form inputs without labels */
    input:not([aria-label]):not([aria-labelledby]):not([placeholder]):not([id]),
    select:not([aria-label]):not([aria-labelledby]),
    textarea:not([aria-label]):not([aria-labelledby]):not([placeholder]) {
      border-color: #f59e0b !important;
    }
  `;
}

/**
 * Apply focus styles fix globally
 */
export function applyFocusStylesFix(): void {
  const styleId = 'fdh-focus-styles-fix';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    :focus-visible {
      outline: 2px solid #4f46e5 !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Apply lang attribute fix
 */
export function applyLangFix(): void {
  if (!document.documentElement.lang) {
    document.documentElement.lang = navigator.language || 'en';
  }
}

/**
 * Apply viewport meta tag fix
 */
export function applyViewportFix(): void {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1';
    document.head.appendChild(meta);
  }
}

/**
 * Apply charset fix
 */
export function applyCharsetFix(): void {
  if (!document.querySelector('meta[charset]')) {
    const meta = document.createElement('meta');
    meta.setAttribute('charset', 'utf-8');
    document.head.insertBefore(meta, document.head.firstChild);
  }
}

/**
 * Apply lazy loading to all off-screen images
 */
export function applyLazyLoadingFix(): number {
  let count = 0;
  document.querySelectorAll('img:not([loading])').forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.top > window.innerHeight) {
      (img as HTMLImageElement).loading = 'lazy';
      count++;
    }
  });
  return count;
}

/**
 * Apply noopener to all external links
 */
export function applyNoopenerFix(): number {
  let count = 0;
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const rel = link.getAttribute('rel') || '';
    if (!rel.includes('noopener')) {
      link.setAttribute('rel', `${rel} noopener noreferrer`.trim());
      count++;
    }
  });
  return count;
}

/**
 * Apply all common fixes at once
 */
export function applyAllCommonFixes(): {
  focusStyles: undefined;
  lang: undefined;
  viewport: undefined;
  charset: undefined;
  lazyLoading: number;
  noopener: number;
} {
  return {
    focusStyles: applyFocusStylesFix(),
    lang: applyLangFix(),
    viewport: applyViewportFix(),
    charset: applyCharsetFix(),
    lazyLoading: applyLazyLoadingFix(),
    noopener: applyNoopenerFix(),
  };
}

/**
 * Export quick fixes API
 */
export const quickFixes = {
  applyFix,
  applyMultipleFixes,
  applyAllFixes,
  generateFixCSS,
  applyFocusStylesFix,
  applyLangFix,
  applyViewportFix,
  applyCharsetFix,
  applyLazyLoadingFix,
  applyNoopenerFix,
  applyAllCommonFixes,
};
