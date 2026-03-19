/**
 * Pixel Ruler & Measurement Tool
 *
 * Provides click-and-drag measurement functionality with support for
 * horizontal, vertical, and element-to-element measurements.
 */

import { createOverlay, positionTooltip, createTooltip, getElementDimensions } from '@/utils/dom';

type MeasurementMode = 'horizontal' | 'vertical' | 'element';
type MeasurementType = 'drag' | 'element';

interface Measurement {
  id: string;
  type: MeasurementType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
  elements?: {
    start: Element;
    end: Element;
  };
}

interface MeasurementElements {
  line: HTMLElement;
  badge: HTMLElement;
  startArrow: HTMLElement;
  endArrow: HTMLElement;
}

const RULER_COLOR = '#00d2ff';
const RULER_Z_INDEX = '2147483646';
const BADGE_Z_INDEX = '2147483647';
const REM_BASE = 16;

export class PixelRuler {
  private isActive = false;
  private isDragging = false;
  private mode: MeasurementMode = 'horizontal';
  private measurements: Map<string, MeasurementElements> = new Map();
  private currentMeasurement: Measurement | null = null;
  private firstElement: Element | null = null;
  private overlayContainer: HTMLElement | null = null;
  private guideLine: HTMLElement | null = null;
  private modeIndicator: HTMLElement | null = null;

  /**
   * Initialize the pixel ruler
   */
  initialize(): void {
    this.createOverlayContainer();
    this.createModeIndicator();
    this.bindEvents();
  }

  /**
   * Enable the pixel ruler
   */
  enable(mode: MeasurementMode = 'horizontal'): void {
    this.isActive = true;
    this.mode = mode;
    this.updateCursor();
    this.showModeIndicator();
    document.body.style.cursor = 'crosshair';
  }

  /**
   * Disable the pixel ruler
   */
  disable(): void {
    this.isActive = false;
    this.cancelCurrentMeasurement();
    this.hideModeIndicator();
    document.body.style.cursor = '';
  }

  /**
   * Toggle the pixel ruler
   */
  toggle(mode?: MeasurementMode): void {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable(mode);
    }
  }

  /**
   * Get current state
   */
  getState(): { enabled: boolean; mode: MeasurementMode } {
    return {
      enabled: this.isActive,
      mode: this.currentMode,
    };
  }

  /**
   * Clear all measurements (alias for clearMeasurements)
   */
  clearAllMeasurements(): void {
    this.clearMeasurements();
  }

  /**
   * Set measurement mode
   */
  setMode(mode: MeasurementMode): void {
    this.mode = mode;
    this.cancelCurrentMeasurement();
    this.firstElement = null;
    this.updateCursor();
    this.showModeIndicator();
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    this.measurements.forEach((elements) => {
      elements.line.remove();
      elements.badge.remove();
      elements.startArrow.remove();
      elements.endArrow.remove();
    });
    this.measurements.clear();
    this.currentMeasurement = null;
    this.firstElement = null;
  }

  /**
   * Get count of active measurements
   */
  getMeasurementCount(): number {
    return this.measurements.size;
  }

  /**
   * Check if ruler is active
   */
  isEnabled(): boolean {
    return this.isActive;
  }

  /**
   * Get current mode
   */
  getCurrentMode(): MeasurementMode {
    return this.mode;
  }

  private createOverlayContainer(): void {
    this.overlayContainer = createOverlay({
      id: 'fdh-pixel-ruler-container',
      styles: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: RULER_Z_INDEX,
      },
    });
  }

  private createModeIndicator(): void {
    this.modeIndicator = document.createElement('div');
    this.modeIndicator.id = 'fdh-ruler-mode';
    this.modeIndicator.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      background: #1e293b;
      color: ${RULER_COLOR};
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      z-index: ${BADGE_Z_INDEX};
      border: 1px solid ${RULER_COLOR};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(this.modeIndicator);
  }

  private showModeIndicator(): void {
    if (!this.modeIndicator) return;

    const modeLabels: Record<MeasurementMode, string> = {
      horizontal: 'Horizontal Measure',
      vertical: 'Vertical Measure',
      element: 'Element-to-Element',
    };

    this.modeIndicator.textContent = `${modeLabels[this.mode]} | ESC to cancel | Double-click to clear`;
    this.modeIndicator.style.display = 'block';
  }

  private hideModeIndicator(): void {
    if (this.modeIndicator) {
      this.modeIndicator.style.display = 'none';
    }
  }

  private updateCursor(): void {
    const cursors: Record<MeasurementMode, string> = {
      horizontal: 'ew-resize',
      vertical: 'ns-resize',
      element: 'crosshair',
    };
    document.body.style.cursor = cursors[this.mode];
  }

  private bindEvents(): void {
    // Mouse down - start measurement
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));

    // Mouse move - update measurement
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // Mouse up - end measurement
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Double click - clear all
    document.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    // Escape - cancel current
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Scroll - update measurements position
    window.addEventListener('scroll', this.handleScroll.bind(this));

    // Resize - update measurements
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.isActive || event.button !== 0) return;

    // Prevent text selection
    event.preventDefault();

    if (this.mode === 'element') {
      this.handleElementMeasurementClick(event);
      return;
    }

    this.isDragging = true;
    this.startDragMeasurement(event);
  }

  private handleElementMeasurementClick(event: MouseEvent): void {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element === document.body || element === document.documentElement) {
      return;
    }

    if (!this.firstElement) {
      // First element selected
      this.firstElement = element;
      this.highlightElement(element, 'start');
      this.showElementSelectionTooltip(element, 'Click second element to measure');
    } else {
      // Second element selected - create measurement
      if (this.firstElement !== element) {
        this.createElementToElementMeasurement(this.firstElement, element);
      }
      this.clearElementHighlights();
      this.firstElement = null;
      this.hideSelectionTooltip();
    }
  }

  private highlightElement(element: Element, type: 'start' | 'end'): void {
    const highlight = document.createElement('div');
    highlight.className = `fdh-ruler-highlight-${type}`;
    highlight.setAttribute('data-fdh-overlay', 'true');

    const rect = element.getBoundingClientRect();
    const color = type === 'start' ? RULER_COLOR : '#ff6b6b';

    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${color};
      background: ${color}20;
      pointer-events: none;
      z-index: ${RULER_Z_INDEX};
      box-sizing: border-box;
    `;

    document.body.appendChild(highlight);
  }

  private clearElementHighlights(): void {
    document.querySelectorAll('[class^="fdh-ruler-highlight-"]').forEach((el) => el.remove());
  }

  private showElementSelectionTooltip(element: Element, message: string): void {
    this.hideSelectionTooltip();

    const rect = element.getBoundingClientRect();
    const tooltip = createTooltip({
      content: message,
      className: 'fdh-ruler-selection-tooltip',
    });

    tooltip.id = 'fdh-ruler-selection-tooltip';
    positionTooltip({
      tooltip,
      x: rect.left + rect.width / 2,
      y: rect.top,
      offset: { x: 0, y: -40 },
    });
  }

  private hideSelectionTooltip(): void {
    document.getElementById('fdh-ruler-selection-tooltip')?.remove();
  }

  private startDragMeasurement(event: MouseEvent): void {
    const startX = event.clientX;
    const startY = event.clientY;

    this.currentMeasurement = {
      id: `measure-${Date.now()}`,
      type: 'drag',
      startX,
      startY,
      endX: startX,
      endY: startY,
      distance: 0,
    };

    this.createGuideLine();
  }

  private createGuideLine(): void {
    if (!this.guideLine) {
      this.guideLine = document.createElement('div');
      this.guideLine.setAttribute('data-fdh-overlay', 'true');
      document.body.appendChild(this.guideLine);
    }

    this.guideLine.style.cssText = `
      position: fixed;
      background: ${RULER_COLOR};
      pointer-events: none;
      z-index: ${RULER_Z_INDEX};
      opacity: 0.8;
    `;
  }

  private updateGuideLine(): void {
    if (!this.guideLine || !this.currentMeasurement) return;

    const { startX, startY, endX, endY } = this.currentMeasurement;

    if (this.mode === 'horizontal') {
      const left = Math.min(startX, endX);
      const width = Math.abs(endX - startX);
      this.guideLine.style.cssText += `
        top: ${startY}px;
        left: ${left}px;
        width: ${width}px;
        height: 2px;
      `;
    } else {
      const top = Math.min(startY, endY);
      const height = Math.abs(endY - startY);
      this.guideLine.style.cssText += `
        top: ${top}px;
        left: ${startX}px;
        width: 2px;
        height: ${height}px;
      `;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isActive || !this.isDragging || !this.currentMeasurement) return;

    this.currentMeasurement.endX = event.clientX;
    this.currentMeasurement.endY = event.clientY;

    // Constrain to axis based on mode
    if (this.mode === 'horizontal') {
      this.currentMeasurement.endY = this.currentMeasurement.startY;
    } else if (this.mode === 'vertical') {
      this.currentMeasurement.endX = this.currentMeasurement.startX;
    }

    this.updateGuideLine();
    this.showLiveMeasurement();
  }

  private showLiveMeasurement(): void {
    if (!this.currentMeasurement) return;

    const distance = this.calculateDistance(this.currentMeasurement);
    const centerX = (this.currentMeasurement.startX + this.currentMeasurement.endX) / 2;
    const centerY = (this.currentMeasurement.startY + this.currentMeasurement.endY) / 2;

    // Remove existing live tooltip
    document.getElementById('fdh-ruler-live-tooltip')?.remove();

    const tooltip = createTooltip({
      content: this.formatMeasurement(distance),
      className: 'fdh-ruler-live-tooltip',
    });

    tooltip.id = 'fdh-ruler-live-tooltip';
    tooltip.style.background = RULER_COLOR;
    tooltip.style.color = '#000';
    tooltip.style.fontWeight = '600';

    positionTooltip({
      tooltip,
      x: centerX,
      y: centerY,
      offset: { x: 0, y: -30 },
    });
  }

  private handleMouseUp(): void {
    if (!this.isActive || !this.isDragging || !this.currentMeasurement) return;

    this.isDragging = false;

    const distance = this.calculateDistance(this.currentMeasurement);

    // Only create measurement if distance is significant
    if (distance > 5) {
      this.currentMeasurement.distance = distance;
      this.createMeasurementVisuals(this.currentMeasurement);
    }

    this.cleanupDragMeasurement();
  }

  private cleanupDragMeasurement(): void {
    this.currentMeasurement = null;
    this.guideLine?.remove();
    this.guideLine = null;
    document.getElementById('fdh-ruler-live-tooltip')?.remove();
  }

  private createMeasurementVisuals(measurement: Measurement): void {
    const { id, startX, startY, endX, endY } = measurement;

    // Create line
    const line = this.createMeasurementLine(startX, startY, endX, endY);

    // Create arrows
    const startArrow = this.createArrow(startX, startY, this.getAngle(startX, startY, endX, endY) + 180);
    const endArrow = this.createArrow(endX, endY, this.getAngle(startX, startY, endX, endY));

    // Create badge
    const badge = this.createMeasurementBadge(measurement);

    this.measurements.set(id, {
      line,
      badge,
      startArrow,
      endArrow,
    });
  }

  private createMeasurementLine(x1: number, y1: number, x2: number, y2: number): HTMLElement {
    const line = document.createElement('div');
    line.setAttribute('data-fdh-overlay', 'true');
    line.setAttribute('data-fdh-measurement', 'true');

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = this.getAngle(x1, y1, x2, y2);
    const centerX = (x1 + x2) / 2 - length / 2;
    const centerY = (y1 + y2) / 2;

    line.style.cssText = `
      position: fixed;
      top: ${centerY}px;
      left: ${centerX + length / 2}px;
      width: ${length}px;
      height: 2px;
      background: ${RULER_COLOR};
      transform: rotate(${angle}deg);
      transform-origin: left center;
      pointer-events: none;
      z-index: ${RULER_Z_INDEX};
    `;

    document.body.appendChild(line);
    return line;
  }

  private createArrow(x: number, y: number, angle: number): HTMLElement {
    const arrow = document.createElement('div');
    arrow.setAttribute('data-fdh-overlay', 'true');
    arrow.setAttribute('data-fdh-measurement', 'true');

    arrow.style.cssText = `
      position: fixed;
      top: ${y - 4}px;
      left: ${x - 4}px;
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 8px solid ${RULER_COLOR};
      transform: rotate(${angle}deg);
      transform-origin: center center;
      pointer-events: none;
      z-index: ${RULER_Z_INDEX};
    `;

    document.body.appendChild(arrow);
    return arrow;
  }

  private createMeasurementBadge(measurement: Measurement): HTMLElement {
    const badge = document.createElement('div');
    badge.setAttribute('data-fdh-overlay', 'true');
    badge.setAttribute('data-fdh-measurement', 'true');

    const { startX, startY, endX, endY, distance } = measurement;
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;

    badge.style.cssText = `
      position: fixed;
      background: #1e293b;
      color: ${RULER_COLOR};
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid ${RULER_COLOR};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: ${BADGE_Z_INDEX};
      white-space: nowrap;
    `;

    badge.innerHTML = this.formatMeasurement(distance);

    // Position badge
    const badgeRect = { width: 80, height: 24 }; // Approximate
    let left = centerX - badgeRect.width / 2;
    let top = centerY - badgeRect.height - 8;

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - badgeRect.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - badgeRect.height - 8));

    badge.style.left = `${left}px`;
    badge.style.top = `${top}px`;

    document.body.appendChild(badge);
    return badge;
  }

  private createElementToElementMeasurement(startEl: Element, endEl: Element): void {
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // Calculate center points
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    // Calculate distance
    const distanceX = Math.abs(endX - startX);
    const distanceY = Math.abs(endY - startY);
    const distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));

    const measurement: Measurement = {
      id: `measure-el-${Date.now()}`,
      type: 'element',
      startX,
      startY,
      endX,
      endY,
      distance,
      elements: { start: startEl, end: endEl },
    };

    this.createMeasurementVisuals(measurement);

    // Add element labels to badge
    const elements = this.measurements.get(measurement.id);
    if (elements) {
      elements.badge.innerHTML += `
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
          ${this.getElementLabel(startEl)} → ${this.getElementLabel(endEl)}
        </div>
      `;
    }
  }

  private getElementLabel(element: Element): string {
    if (element.id) return `#${element.id}`;
    const className = element.className;
    if (typeof className === 'string' && className.trim()) {
      return `.${className.trim().split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  private getAngle(x1: number, y1: number, x2: number, y2: number): number {
    return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  }

  private calculateDistance(measurement: Measurement): number {
    const { startX, startY, endX, endY } = measurement;
    return Math.round(Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)));
  }

  private formatMeasurement(px: number): string {
    const rem = (px / REM_BASE).toFixed(2);
    return `${px}px <span style="color: #94a3b8">(${rem}rem)</span>`;
  }

  private handleDoubleClick(event: MouseEvent): void {
    if (!this.isActive) return;

    // Check if clicking on a measurement element
    const target = event.target as HTMLElement;
    if (target.hasAttribute('data-fdh-measurement')) {
      // Remove specific measurement
      this.removeMeasurementAt(event.clientX, event.clientY);
    } else {
      // Clear all measurements
      this.clearMeasurements();
    }
  }

  private removeMeasurementAt(x: number, y: number): void {
    // Find measurement closest to click point
    let closestId: string | null = null;
    let closestDistance = Infinity;

    for (const [id, measurement] of this.measurements) {
      const badgeRect = measurement.badge.getBoundingClientRect();
      const centerX = badgeRect.left + badgeRect.width / 2;
      const centerY = badgeRect.top + badgeRect.height / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

      if (distance < closestDistance && distance < 50) {
        closestDistance = distance;
        closestId = id;
      }
    }

    if (closestId) {
      const elements = this.measurements.get(closestId);
      if (elements) {
        elements.line.remove();
        elements.badge.remove();
        elements.startArrow.remove();
        elements.endArrow.remove();
        this.measurements.delete(closestId);
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      this.cancelCurrentMeasurement();
    }
  }

  private cancelCurrentMeasurement(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.cleanupDragMeasurement();
    }
    this.firstElement = null;
    this.clearElementHighlights();
    this.hideSelectionTooltip();
  }

  private handleScroll(): void {
    // Measurements are fixed positioned, so they stay in place
    // Element-based measurements might need recalculation if elements moved
  }

  private handleResize(): void {
    // Optionally clear measurements on resize since coordinates may be invalid
  }

  /**
   * Destroy the pixel ruler
   */
  destroy(): void {
    this.disable();
    this.clearMeasurements();
    this.overlayContainer?.remove();
    this.modeIndicator?.remove();
    this.hideSelectionTooltip();
  }
}

// Export singleton instance
export const pixelRuler = new PixelRuler();
