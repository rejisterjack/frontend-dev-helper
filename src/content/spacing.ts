/**
 * Spacing Visualizer
 * Shows margin and padding overlays when clicking on elements
 */

import { logger } from '@/utils/logger';

interface SpacingInfo {
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface OverlayElements {
  container: HTMLElement;
  marginTop: HTMLElement;
  marginRight: HTMLElement;
  marginBottom: HTMLElement;
  marginLeft: HTMLElement;
  paddingTop: HTMLElement;
  paddingRight: HTMLElement;
  paddingBottom: HTMLElement;
  paddingLeft: HTMLElement;
}

const PADDING_COLOR = 'rgba(53, 143, 243, 0.35)'; // Blue
const MARGIN_COLOR = 'rgba(247, 156, 66, 0.35)'; // Orange
const PADDING_BORDER = 'rgba(53, 143, 243, 0.6)';
const MARGIN_BORDER = 'rgba(247, 156, 66, 0.6)';
const LABEL_BG = 'rgba(0, 0, 0, 0.75)';
const LABEL_COLOR = '#fff';

class SpacingVisualizer {
  private isEnabled = false;
  private currentElement: Element | null = null;
  private overlay: OverlayElements | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private animationFrame: number | null = null;

  /**
   * Initialize the spacing visualizer
   */
  init(): void {
    logger.info('[SpacingVisualizer] Initialized');
  }

  /**
   * Get computed spacing (margin/padding) for an element
   */
  private getSpacingInfo(element: Element): SpacingInfo {
    const style = window.getComputedStyle(element);

    const parseValue = (value: string): number => {
      return parseFloat(value) || 0;
    };

    return {
      margin: {
        top: parseValue(style.marginTop),
        right: parseValue(style.marginRight),
        bottom: parseValue(style.marginBottom),
        left: parseValue(style.marginLeft),
      },
      padding: {
        top: parseValue(style.paddingTop),
        right: parseValue(style.paddingRight),
        bottom: parseValue(style.paddingBottom),
        left: parseValue(style.paddingLeft),
      },
    };
  }

  /**
   * Create a spacing overlay element
   */
  private createOverlayElement(
    className: string,
    backgroundColor: string,
    borderColor: string
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = `spacing-visualizer-${className}`;
    el.style.cssText = `
      position: absolute;
      pointer-events: none;
      background-color: ${backgroundColor};
      border: 1px dashed ${borderColor};
      box-sizing: border-box;
      z-index: 2147483646;
      transition: all 0.2s ease-out;
      opacity: 0;
    `;
    return el;
  }

  /**
   * Create label element for showing pixel values
   */
  private createLabel(value: number): HTMLElement {
    const label = document.createElement('span');
    label.textContent = `${Math.round(value)}px`;
    label.style.cssText = `
      position: absolute;
      background: ${LABEL_BG};
      color: ${LABEL_COLOR};
      font-family: monospace;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
    `;
    return label;
  }

  /**
   * Create the full overlay structure
   */
  private createOverlay(): OverlayElements {
    const container = document.createElement('div');
    container.id = 'spacing-visualizer-overlay';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483646;
    `;

    // Create margin overlays
    const marginTop = this.createOverlayElement('margin-top', MARGIN_COLOR, MARGIN_BORDER);
    const marginRight = this.createOverlayElement('margin-right', MARGIN_COLOR, MARGIN_BORDER);
    const marginBottom = this.createOverlayElement('margin-bottom', MARGIN_COLOR, MARGIN_BORDER);
    const marginLeft = this.createOverlayElement('margin-left', MARGIN_COLOR, MARGIN_BORDER);

    // Create padding overlays
    const paddingTop = this.createOverlayElement('padding-top', PADDING_COLOR, PADDING_BORDER);
    const paddingRight = this.createOverlayElement('padding-right', PADDING_COLOR, PADDING_BORDER);
    const paddingBottom = this.createOverlayElement(
      'padding-bottom',
      PADDING_COLOR,
      PADDING_BORDER
    );
    const paddingLeft = this.createOverlayElement('padding-left', PADDING_COLOR, PADDING_BORDER);

    // Append all to container
    container.appendChild(marginTop);
    container.appendChild(marginRight);
    container.appendChild(marginBottom);
    container.appendChild(marginLeft);
    container.appendChild(paddingTop);
    container.appendChild(paddingRight);
    container.appendChild(paddingBottom);
    container.appendChild(paddingLeft);

    document.body.appendChild(container);

    return {
      container,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
    };
  }

  /**
   * Remove the overlay from DOM
   */
  private removeOverlay(): void {
    if (this.overlay) {
      // Fade out animation
      this.overlay.container.style.opacity = '0';

      setTimeout(() => {
        if (this.overlay) {
          this.overlay.container.remove();
          this.overlay = null;
        }
      }, 200);
    }
    this.currentElement = null;
  }

  /**
   * Position and size the overlays based on element and spacing
   */
  private positionOverlays(element: Element, spacing: SpacingInfo): void {
    if (!this.overlay) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const {
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
    } = this.overlay;

    const { margin, padding } = spacing;

    // Position margin overlays
    if (margin.top > 0) {
      marginTop.style.top = `${rect.top + scrollY - margin.top}px`;
      marginTop.style.left = `${rect.left + scrollX}px`;
      marginTop.style.width = `${rect.width}px`;
      marginTop.style.height = `${margin.top}px`;
      marginTop.style.opacity = '1';
      this.addOrUpdateLabel(marginTop, margin.top, 'top');
    } else {
      marginTop.style.opacity = '0';
    }

    if (margin.right > 0) {
      marginRight.style.top = `${rect.top + scrollY}px`;
      marginRight.style.left = `${rect.right + scrollX}px`;
      marginRight.style.width = `${margin.right}px`;
      marginRight.style.height = `${rect.height}px`;
      marginRight.style.opacity = '1';
      this.addOrUpdateLabel(marginRight, margin.right, 'right');
    } else {
      marginRight.style.opacity = '0';
    }

    if (margin.bottom > 0) {
      marginBottom.style.top = `${rect.bottom + scrollY}px`;
      marginBottom.style.left = `${rect.left + scrollX}px`;
      marginBottom.style.width = `${rect.width}px`;
      marginBottom.style.height = `${margin.bottom}px`;
      marginBottom.style.opacity = '1';
      this.addOrUpdateLabel(marginBottom, margin.bottom, 'bottom');
    } else {
      marginBottom.style.opacity = '0';
    }

    if (margin.left > 0) {
      marginLeft.style.top = `${rect.top + scrollY}px`;
      marginLeft.style.left = `${rect.left + scrollX - margin.left}px`;
      marginLeft.style.width = `${margin.left}px`;
      marginLeft.style.height = `${rect.height}px`;
      marginLeft.style.opacity = '1';
      this.addOrUpdateLabel(marginLeft, margin.left, 'left');
    } else {
      marginLeft.style.opacity = '0';
    }

    // Position padding overlays
    if (padding.top > 0) {
      paddingTop.style.top = `${rect.top + scrollY}px`;
      paddingTop.style.left = `${rect.left + scrollX}px`;
      paddingTop.style.width = `${rect.width}px`;
      paddingTop.style.height = `${padding.top}px`;
      paddingTop.style.opacity = '1';
      this.addOrUpdateLabel(paddingTop, padding.top, 'top');
    } else {
      paddingTop.style.opacity = '0';
    }

    if (padding.right > 0) {
      paddingRight.style.top = `${rect.top + scrollY}px`;
      paddingRight.style.left = `${rect.right + scrollX - padding.right}px`;
      paddingRight.style.width = `${padding.right}px`;
      paddingRight.style.height = `${rect.height}px`;
      paddingRight.style.opacity = '1';
      this.addOrUpdateLabel(paddingRight, padding.right, 'right');
    } else {
      paddingRight.style.opacity = '0';
    }

    if (padding.bottom > 0) {
      paddingBottom.style.top = `${rect.bottom + scrollY - padding.bottom}px`;
      paddingBottom.style.left = `${rect.left + scrollX}px`;
      paddingBottom.style.width = `${rect.width}px`;
      paddingBottom.style.height = `${padding.bottom}px`;
      paddingBottom.style.opacity = '1';
      this.addOrUpdateLabel(paddingBottom, padding.bottom, 'bottom');
    } else {
      paddingBottom.style.opacity = '0';
    }

    if (padding.left > 0) {
      paddingLeft.style.top = `${rect.top + scrollY}px`;
      paddingLeft.style.left = `${rect.left + scrollX}px`;
      paddingLeft.style.width = `${padding.left}px`;
      paddingLeft.style.height = `${rect.height}px`;
      paddingLeft.style.opacity = '1';
      this.addOrUpdateLabel(paddingLeft, padding.left, 'left');
    } else {
      paddingLeft.style.opacity = '0';
    }
  }

  /**
   * Add or update label on overlay element
   */
  private addOrUpdateLabel(
    overlayEl: HTMLElement,
    value: number,
    position: 'top' | 'right' | 'bottom' | 'left'
  ): void {
    // Remove existing label
    const existingLabel = overlayEl.querySelector('.spacing-label');
    if (existingLabel) {
      existingLabel.remove();
    }

    // Only show label if value is significant
    if (value < 2) return;

    const label = this.createLabel(value);
    label.className = 'spacing-label';

    // Position label based on overlay position
    switch (position) {
      case 'top':
        label.style.bottom = '2px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        break;
      case 'right':
        label.style.left = '2px';
        label.style.top = '50%';
        label.style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        label.style.top = '2px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        break;
      case 'left':
        label.style.right = '2px';
        label.style.top = '50%';
        label.style.transform = 'translateY(-50%)';
        break;
    }

    overlayEl.appendChild(label);
  }

  /**
   * Show spacing overlay for an element
   */
  private showOverlay(element: Element): void {
    // Remove existing overlay
    if (this.overlay) {
      this.removeOverlay();
    }

    this.currentElement = element;
    const spacing = this.getSpacingInfo(element);

    // Create and position new overlay
    this.overlay = this.createOverlay();
    this.positionOverlays(element, spacing);

    logger.info('[SpacingVisualizer] Showing overlay for', element.tagName);
  }

  /**
   * Update overlay position (for scroll/resize events)
   */
  private updateOverlay(): void {
    if (this.currentElement && this.overlay) {
      const spacing = this.getSpacingInfo(this.currentElement);
      this.positionOverlays(this.currentElement, spacing);
    }
  }

  /**
   * Handle element click
   */
  private handleClick(e: MouseEvent): void {
    // Don't show overlay for the overlay itself or body/html
    const target = e.target as Element;
    if (
      !target ||
      target === document.body ||
      target === document.documentElement ||
      target.id === 'spacing-visualizer-overlay' ||
      target.closest('#spacing-visualizer-overlay')
    ) {
      this.removeOverlay();
      return;
    }

    // Stop propagation to prevent triggering parent clicks
    e.stopPropagation();
    this.showOverlay(target);
  }

  /**
   * Handle keyboard events (ESC to dismiss)
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.removeOverlay();
    }
  }

  /**
   * Setup click and keyboard listeners
   */
  private setupListeners(): void {
    // Use capture phase to get clicks before they're handled by page
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    document.addEventListener('click', this.clickHandler, true);

    // ESC to dismiss
    this.keyHandler = (e: KeyboardEvent) => this.handleKeydown(e);
    document.addEventListener('keydown', this.keyHandler);

    // Update on resize
    this.resizeHandler = () => {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.animationFrame = requestAnimationFrame(() => this.updateOverlay());
    };
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('scroll', this.resizeHandler, true);
  }

  /**
   * Remove all event listeners
   */
  private removeListeners(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('scroll', this.resizeHandler, true);
      this.resizeHandler = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Enable the spacing visualizer
   */
  enable(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.setupListeners();
    logger.info('[SpacingVisualizer] Enabled');
  }

  /**
   * Disable the spacing visualizer
   */
  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.removeListeners();
    this.removeOverlay();
    logger.info('[SpacingVisualizer] Disabled');
  }

  /**
   * Toggle on/off
   */
  toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current state
   */
  getState(): { enabled: boolean } {
    return {
      enabled: this.isEnabled,
    };
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.disable();
  }
}

// Export singleton instance
export const spacingVisualizer = new SpacingVisualizer();
export default spacingVisualizer;
