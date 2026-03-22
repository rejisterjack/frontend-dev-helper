/**
 * Live CSS Editor - Live Preview and Visual Feedback
 */

let highlightOverlay: HTMLElement | null = null;
let highlightColor = '#8b5cf6';

export function setHighlightColor(color: string): void {
  highlightColor = color;
}

export function createHighlightOverlay(): void {
  if (highlightOverlay) return;

  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'fdh-css-editor-highlight';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px solid ${highlightColor};
    background-color: ${hexToRgba(highlightColor, 0.1)};
    border-radius: 2px;
    transition: all 0.15s ease-out;
    display: none;
    box-shadow: 0 0 0 4px ${hexToRgba(highlightColor, 0.1)};
  `;
  if (document.body) {
    document.body.appendChild(highlightOverlay);
  }
}

export function removeHighlightOverlay(): void {
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
}

export function updateHighlightOverlay(element: HTMLElement | null): void {
  if (!highlightOverlay || !element) {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
    return;
  }

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  highlightOverlay.style.display = 'block';
  highlightOverlay.style.left = `${rect.left + scrollX}px`;
  highlightOverlay.style.top = `${rect.top + scrollY}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.opacity = '1';
}

export function previewHighlight(element: HTMLElement | null): void {
  if (!highlightOverlay || !element) {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
    return;
  }

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  highlightOverlay.style.display = 'block';
  highlightOverlay.style.left = `${rect.left + scrollX}px`;
  highlightOverlay.style.top = `${rect.top + scrollY}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.opacity = '0.5';
}

export function hideHighlight(): void {
  if (highlightOverlay) {
    highlightOverlay.style.display = 'none';
  }
}

export function updateHighlightColor(color: string): void {
  highlightColor = color;
  if (highlightOverlay) {
    highlightOverlay.style.borderColor = color;
    highlightOverlay.style.backgroundColor = hexToRgba(color, 0.1);
    highlightOverlay.style.boxShadow = `0 0 0 4px ${hexToRgba(color, 0.1)}`;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function cleanup(): void {
  removeHighlightOverlay();
}
