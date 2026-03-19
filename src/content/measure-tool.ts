/**
 * Measure Tool Module
 * 
 * Provides distance measurement between two points on the page.
 */

export interface MeasureToolOptions {
  onMeasurementComplete?: (distance: number, unit: string, angle: number) => void;
  lineColor?: string;
}

interface Point {
  x: number;
  y: number;
}

export class MeasureTool {
  private options: Required<MeasureToolOptions>;
  private isActive = false;
  private isDragging = false;
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;
  private overlay: HTMLElement | null = null;
  private line: HTMLElement | null = null;
  private label: HTMLElement | null = null;

  constructor(options: MeasureToolOptions = {}) {
    this.options = {
      onMeasurementComplete: options.onMeasurementComplete ?? (() => {}),
      lineColor: options.lineColor ?? '#3b82f6',
    };
  }

  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createOverlay();
    this.attachEventListeners();
    document.body.style.cursor = 'crosshair';
  }

  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.isDragging = false;
    this.startPoint = null;
    this.endPoint = null;
    this.removeOverlay();
    this.detachEventListeners();
    document.body.style.cursor = '';
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'fdh-measure-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      cursor: crosshair;
    `;

    // Create line element
    this.line = document.createElement('div');
    this.line.className = 'fdh-measure-line';
    this.line.style.cssText = `
      position: absolute;
      height: 2px;
      background: ${this.options.lineColor};
      transform-origin: left center;
      display: none;
      pointer-events: none;
    `;
    this.overlay.appendChild(this.line);

    // Create label element
    this.label = document.createElement('div');
    this.label.className = 'fdh-measure-label';
    this.label.style.cssText = `
      position: absolute;
      background: ${this.options.lineColor};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      display: none;
    `;
    this.overlay.appendChild(this.label);

    document.body.appendChild(this.overlay);
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.line = null;
      this.label = null;
    }
  }

  private attachEventListeners(): void {
    if (!this.overlay) return;
    this.overlay.addEventListener('mousedown', this.handleMouseDown);
    this.overlay.addEventListener('mousemove', this.handleMouseMove);
    this.overlay.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    if (!this.overlay) return;
    this.overlay.removeEventListener('mousedown', this.handleMouseDown);
    this.overlay.removeEventListener('mousemove', this.handleMouseMove);
    this.overlay.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.isActive) return;

    this.isDragging = true;
    this.startPoint = { x: e.clientX, y: e.clientY };
    this.endPoint = { ...this.startPoint };

    if (this.line) {
      this.line.style.display = 'block';
      this.line.style.left = `${this.startPoint.x}px`;
      this.line.style.top = `${this.startPoint.y}px`;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isActive || !this.isDragging || !this.startPoint) return;

    this.endPoint = { x: e.clientX, y: e.clientY };
    this.updateLine();
  };

  private handleMouseUp = (): void => {
    if (!this.isActive || !this.isDragging) return;

    this.isDragging = false;

    if (this.startPoint && this.endPoint) {
      const distance = this.calculateDistance(this.startPoint, this.endPoint);
      const angle = this.calculateAngle(this.startPoint, this.endPoint);
      
      this.options.onMeasurementComplete(distance, 'px', angle);
    }

    // Reset after a short delay
    setTimeout(() => {
      if (this.line) this.line.style.display = 'none';
      if (this.label) this.label.style.display = 'none';
      this.startPoint = null;
      this.endPoint = null;
    }, 1000);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      this.deactivate();
    }
  };

  private updateLine(): void {
    if (!this.line || !this.label || !this.startPoint || !this.endPoint) return;

    const distance = this.calculateDistance(this.startPoint, this.endPoint);
    const angle = this.calculateAngle(this.startPoint, this.endPoint);

    // Update line
    this.line.style.width = `${distance}px`;
    this.line.style.transform = `rotate(${angle}deg)`;

    // Update label
    this.label.style.display = 'block';
    this.label.textContent = `${Math.round(distance)}px`;

    // Position label at midpoint
    const midX = (this.startPoint.x + this.endPoint.x) / 2;
    const midY = (this.startPoint.y + this.endPoint.y) / 2;
    
    const labelRect = this.label.getBoundingClientRect();
    this.label.style.left = `${midX - labelRect.width / 2}px`;
    this.label.style.top = `${midY - labelRect.height - 8}px`;
  }

  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  }
}
