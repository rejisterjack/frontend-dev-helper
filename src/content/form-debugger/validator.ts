/**
 * Form Validator
 *
 * Form validation logic including overlay rendering for highlighting issues.
 */

import type { FormField, FormInfo } from '@/types';
import { PREFIX } from './constants';
import type { OverlayType } from './types';

/** Container element for validation overlays */
let validationOverlays: HTMLElement | null = null;

/**
 * Initialize validation overlay container
 */
export function initializeOverlays(): HTMLElement {
  if (!validationOverlays) {
    validationOverlays = document.createElement('div');
    validationOverlays.id = `${PREFIX}-validation-overlays`;
    document.body.appendChild(validationOverlays);
  }
  return validationOverlays;
}

/**
 * Update validation overlays based on current form state
 */
export function updateValidationOverlays(forms: FormInfo[], highlightIssuesEnabled: boolean): void {
  if (!highlightIssuesEnabled) {
    removeValidationOverlays();
    return;
  }

  const container = initializeOverlays();
  container.innerHTML = '';

  forms.forEach((form) => {
    // Highlight form container
    if (form.accessibilityIssues.length > 0) {
      highlightElement(form.element, 'warning', `${form.accessibilityIssues.length} issues`);
    }

    // Highlight fields
    form.fields.forEach((field) => {
      if (field.hasError) {
        highlightElement(field.element, 'error', field.validationMessage || 'Invalid');
      } else if (!field.hasLabel) {
        highlightElement(field.element, 'warning', 'No label');
      } else if (field.autofill) {
        highlightElement(field.element, 'info', '🔄');
      }
    });
  });
}

/**
 * Highlight a single element with an overlay
 */
export function highlightElement(element: HTMLElement, type: OverlayType, label: string): void {
  const rect = element.getBoundingClientRect();

  // Skip elements outside viewport
  if (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth ||
    rect.width === 0 ||
    rect.height === 0
  ) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = `${PREFIX}-validation-overlay ${PREFIX}-validation-${type}`;
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 2147483645;
    border: 2px solid ${getOverlayColor(type)};
    border-radius: 3px;
    background: ${getOverlayColor(type, 0.1)};
  `;

  if (label) {
    const badge = document.createElement('div');
    badge.className = `${PREFIX}-validation-badge`;
    badge.textContent = label;
    badge.style.cssText = `
      position: absolute;
      top: -12px;
      left: 0;
      background: ${getOverlayColor(type)};
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    overlay.appendChild(badge);
  }

  validationOverlays?.appendChild(overlay);
}

/**
 * Get overlay color based on type
 */
export function getOverlayColor(type: OverlayType, alpha = 1): string {
  switch (type) {
    case 'error':
      return alpha === 1 ? '#dc2626' : `rgba(220, 38, 38, ${alpha})`;
    case 'warning':
      return alpha === 1 ? '#f59e0b' : `rgba(245, 158, 11, ${alpha})`;
    case 'info':
      return alpha === 1 ? '#3b82f6' : `rgba(59, 130, 246, ${alpha})`;
  }
}

/**
 * Remove all validation overlays
 */
export function removeValidationOverlays(): void {
  validationOverlays?.remove();
  validationOverlays = null;
}

/**
 * Get invalid fields from a form
 */
export function getInvalidFields(form: FormInfo): FormField[] {
  return form.fields.filter((f) => !f.isValid || f.hasError);
}

/**
 * Count total validation issues across all forms
 */
export function countValidationIssues(forms: FormInfo[]): number {
  return forms.reduce((sum, f) => sum + f.fields.filter((field) => !field.isValid).length, 0);
}

/**
 * Count total accessibility issues across all forms
 */
export function countAccessibilityIssues(forms: FormInfo[]): number {
  return forms.reduce((sum, f) => sum + f.accessibilityIssues.length, 0);
}
