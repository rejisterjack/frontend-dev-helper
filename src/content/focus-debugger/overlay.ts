/**
 * Focus Debugger Overlay
 *
 * Visual overlay functionality for the focus debugger module.
 */

import type { FocusableElement } from '@/types';
import { PREFIX } from './constants';

export class OverlayManager {
  private overlaysContainer: HTMLElement | null = null;
  private overlaysVisible = true;
  private prefix: string;

  constructor(prefix: string = PREFIX) {
    this.prefix = prefix;
  }

  toggleOverlays(): boolean {
    this.overlaysVisible = !this.overlaysVisible;
    return this.overlaysVisible;
  }

  showOverlays(): void {
    this.overlaysVisible = true;
  }

  hideOverlays(): void {
    this.overlaysVisible = false;
  }

  isVisible(): boolean {
    return this.overlaysVisible;
  }

  updateOverlays(
    focusableElements: FocusableElement[],
    currentFocusedElement: HTMLElement | null
  ): void {
    if (!this.overlaysVisible) {
      this.removeOverlays();
      return;
    }

    // Create or get overlays container
    if (!this.overlaysContainer) {
      this.overlaysContainer = document.createElement('div');
      this.overlaysContainer.id = `${this.prefix}-overlays-container`;
      document.body.appendChild(this.overlaysContainer);
    }

    const container = this.overlaysContainer;
    container.innerHTML = '';

    // Add number overlays for each focusable element
    focusableElements.forEach((el) => {
      const rect = el.element.getBoundingClientRect();

      // Skip elements outside viewport
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = `${this.prefix}-overlay`;

      const isCurrent = el.element === currentFocusedElement;

      overlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        pointer-events: none;
        z-index: 2147483645;
        border: ${isCurrent ? '3px solid #22c55e' : '2px solid #4f46e5'};
        border-radius: 3px;
        box-shadow: ${isCurrent ? '0 0 0 3px rgba(34, 197, 94, 0.3)' : '0 0 0 2px rgba(79, 70, 229, 0.2)'};
      `;

      // Add number badge
      const badge = document.createElement('div');
      badge.className = `${this.prefix}-overlay-badge`;
      badge.textContent = String(el.tabOrder);
      badge.style.cssText = `
        position: absolute;
        top: -10px;
        left: -10px;
        background: ${isCurrent ? '#22c55e' : '#4f46e5'};
        color: white;
        font-size: 11px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
        font-family: monospace;
      `;

      overlay.appendChild(badge);
      container.appendChild(overlay);
    });
  }

  removeOverlays(): void {
    this.overlaysContainer?.remove();
    this.overlaysContainer = null;
  }

  destroy(): void {
    this.removeOverlays();
  }
}
