/**
 * Grid Overlay Module
 * 
 * Provides a customizable grid overlay for layout debugging.
 */

export interface GridOverlayOptions {
  color?: string;
  opacity?: number;
  size?: number;
  showRulers?: boolean;
}

export class GridOverlay {
  private options: Required<GridOverlayOptions>;
  private container: HTMLElement | null = null;
  private gridElement: HTMLElement | null = null;
  private rulersElement: HTMLElement | null = null;
  private isVisible = false;

  constructor(options: GridOverlayOptions = {}) {
    this.options = {
      color: options.color ?? '#3b82f6',
      opacity: options.opacity ?? 0.1,
      size: options.size ?? 20,
      showRulers: options.showRulers ?? true,
    };
  }

  show(): void {
    if (this.isVisible) return;

    this.createElements();
    this.isVisible = true;
  }

  hide(): void {
    if (!this.isVisible) return;

    this.removeElements();
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateOptions(options: Partial<GridOverlayOptions>): void {
    this.options = { ...this.options, ...options };
    if (this.isVisible) {
      this.removeElements();
      this.createElements();
    }
  }

  private createElements(): void {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'fdh-grid-overlay';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483645;
      pointer-events: none;
    `;

    // Create grid
    this.createGrid();

    // Create rulers if enabled
    if (this.options.showRulers) {
      this.createRulers();
    }

    document.body.appendChild(this.container);
  }

  private createGrid(): void {
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'fdh-grid-lines';
    
    const rgba = this.hexToRgba(this.options.color, this.options.opacity);
    
    this.gridElement.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, ${rgba} 1px, transparent 1px),
        linear-gradient(to bottom, ${rgba} 1px, transparent 1px);
      background-size: ${this.options.size}px ${this.options.size}px;
    `;

    this.container?.appendChild(this.gridElement);
  }

  private createRulers(): void {
    this.rulersElement = document.createElement('div');
    this.rulersElement.className = 'fdh-grid-rulers';
    this.rulersElement.style.cssText = `
      position: absolute;
      inset: 0;
    `;

    // Top ruler
    const topRuler = document.createElement('div');
    topRuler.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 20px;
      background: rgba(31, 41, 55, 0.9);
      border-bottom: 1px solid ${this.options.color};
      pointer-events: auto;
    `;

    // Left ruler
    const leftRuler = document.createElement('div');
    leftRuler.style.cssText = `
      position: fixed;
      top: 20px;
      left: 0;
      bottom: 0;
      width: 20px;
      background: rgba(31, 41, 55, 0.9);
      border-right: 1px solid ${this.options.color};
      pointer-events: auto;
    `;

    // Add ticks to rulers
    this.addRulerTicks(topRuler, 'horizontal');
    this.addRulerTicks(leftRuler, 'vertical');

    this.rulersElement.appendChild(topRuler);
    this.rulersElement.appendChild(leftRuler);
    this.container?.appendChild(this.rulersElement);
  }

  private addRulerTicks(ruler: HTMLElement, orientation: 'horizontal' | 'vertical'): void {
    const tickSize = this.options.size;
    const isHorizontal = orientation === 'horizontal';
    const size = isHorizontal ? window.innerWidth : window.innerHeight;
    
    for (let i = 0; i < size; i += tickSize) {
      const tick = document.createElement('div');
      const isMajor = i % (tickSize * 5) === 0;
      const tickLength = isMajor ? 12 : 6;
      
      if (isHorizontal) {
        tick.style.cssText = `
          position: absolute;
          left: ${i}px;
          bottom: 0;
          width: 1px;
          height: ${tickLength}px;
          background: ${isMajor ? this.options.color : 'rgba(156, 163, 175, 0.5)'};
        `;
        
        if (isMajor) {
          const label = document.createElement('span');
          label.textContent = `${i}`;
          label.style.cssText = `
            position: absolute;
            left: ${i + 2}px;
            top: 2px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: #9ca3af;
          `;
          ruler.appendChild(label);
        }
      } else {
        tick.style.cssText = `
          position: absolute;
          top: ${i}px;
          right: 0;
          width: ${tickLength}px;
          height: 1px;
          background: ${isMajor ? this.options.color : 'rgba(156, 163, 175, 0.5)'};
        `;
        
        if (isMajor) {
          const label = document.createElement('span');
          label.textContent = `${i}`;
          label.style.cssText = `
            position: absolute;
            top: ${i + 2}px;
            left: 2px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: #9ca3af;
          `;
          ruler.appendChild(label);
        }
      }
      
      ruler.appendChild(tick);
    }
  }

  private removeElements(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.gridElement = null;
      this.rulersElement = null;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
