/**
 * Live CSS Editor - Element Inspection Logic
 */

import { logger } from '@/utils/logger';
import { CSS_CATEGORIES } from './constants';
import type { ElementStyles } from './types';

// State
let selectedElement: HTMLElement | null = null;
const modifiedElements = new Map<HTMLElement, ElementStyles>();

// Callbacks
let onElementSelectCallback: ((element: HTMLElement) => void) | null = null;

export function setSelectCallback(callback: (element: HTMLElement) => void): void {
  onElementSelectCallback = callback;
}

export function getSelectedElement(): HTMLElement | null {
  return selectedElement;
}

export function getModifiedElements(): Map<HTMLElement, ElementStyles> {
  return modifiedElements;
}

export function generateSelector(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tagName}${id}${classes}`;
}

export function isExtensionElement(element: HTMLElement): boolean {
  return (
    element.id === 'fdh-css-editor-panel' ||
    element.closest('#fdh-css-editor-panel') !== null ||
    element.classList.contains('fdh-css-editor-highlight') ||
    element.classList.contains('fdh-notification')
  );
}

export function selectElement(element: HTMLElement): void {
  // Don't select our own UI elements
  if (isExtensionElement(element)) return;

  // Deselect previous element
  deselectElement();

  selectedElement = element;
  const selector = generateSelector(element);

  // Store original styles if not already stored
  if (!modifiedElements.has(element)) {
    const computed = window.getComputedStyle(element);
    const originalStyles = new Map<string, string>();

    // Store common properties that might be modified
    CSS_CATEGORIES.forEach((cat) => {
      cat.properties.forEach((prop) => {
        originalStyles.set(prop.name, computed.getPropertyValue(prop.name));
      });
    });

    modifiedElements.set(element, {
      element,
      selector,
      originalStyles,
      modifiedStyles: new Map(),
      edits: [],
    });
  }

  logger.log('[CSS Editor] Element selected:', selector);

  // Notify callback
  if (onElementSelectCallback) {
    onElementSelectCallback(element);
  }
}

export function deselectElement(): void {
  if (selectedElement) {
    logger.log('[CSS Editor] Element deselected');
  }
  selectedElement = null;
}

export function getElementStyles(element: HTMLElement): ElementStyles | undefined {
  return modifiedElements.get(element);
}

export function updateElementModifiedStyle(
  element: HTMLElement,
  property: string,
  value: string
): void {
  const elementData = modifiedElements.get(element);
  if (elementData) {
    elementData.modifiedStyles.set(property, value);
  }
}

export function resetElementStyles(element: HTMLElement): void {
  const elementData = modifiedElements.get(element);
  if (elementData) {
    // Restore original styles
    elementData.modifiedStyles.forEach((_, property) => {
      const originalValue = elementData.originalStyles.get(property) || '';
      element.style.setProperty(property, originalValue);
    });

    // Clear modifications
    elementData.modifiedStyles.clear();
    elementData.edits = [];
  }
}

export function resetAllElements(): void {
  modifiedElements.forEach((data, element) => {
    data.modifiedStyles.forEach((_, property) => {
      const originalValue = data.originalStyles.get(property) || '';
      element.style.setProperty(property, originalValue);
    });
    data.modifiedStyles.clear();
    data.edits = [];
  });
}

export function cleanup(): void {
  selectedElement = null;
  modifiedElements.clear();
}

export function clearModifiedElements(): void {
  modifiedElements.clear();
}
