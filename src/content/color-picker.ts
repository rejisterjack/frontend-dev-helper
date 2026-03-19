/**
 * Color Picker Module
 * 
 * Provides color picking functionality from the page.
 */

export interface ColorPickerOptions {
  onColorSelect?: (color: string, format: 'hex' | 'rgb' | 'hsl') => void;
  defaultFormat?: 'hex' | 'rgb' | 'hsl';
  showMagnifier?: boolean;
}

export class ColorPicker {
  private options: Required<ColorPickerOptions>;
  private isActive = false;
  private magnifier: HTMLElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewElement: HTMLElement | null = null;

  constructor(options: ColorPickerOptions = {}) {
    this.options = {
      onColorSelect: options.onColorSelect ?? (() => {}),
      defaultFormat: options.defaultFormat ?? 'hex',
      showMagnifier: options.showMagnifier ?? true,
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
  }

  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createPreviewElement();
    if (this.options.showMagnifier) {
      this.createMagnifier();
    }
    this.attachEventListeners();
    document.body.style.cursor = 'crosshair';
  }

  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.removePreviewElement();
    this.removeMagnifier();
    this.detachEventListeners();
    document.body.style.cursor = '';
  }

  private createMagnifier(): void {
    this.magnifier = document.createElement('div');
    this.magnifier.className = 'fdh-color-magnifier';
    this.magnifier.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #3b82f6;
      background: white;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    `;

    // Create the zoomed canvas inside magnifier
    const zoomCanvas = document.createElement('canvas');
    zoomCanvas.width = 100;
    zoomCanvas.height = 100;
    zoomCanvas.style.cssText = 'width: 100%; height: 100%;';
    this.magnifier.appendChild(zoomCanvas);

    // Add color preview
    const colorPreview = document.createElement('div');
    colorPreview.className = 'fdh-color-preview';
    colorPreview.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      white-space: nowrap;
    `;
    this.magnifier.appendChild(colorPreview);

    document.body.appendChild(this.magnifier);
  }

  private removeMagnifier(): void {
    if (this.magnifier) {
      this.magnifier.remove();
      this.magnifier = null;
    }
  }

  private createPreviewElement(): void {
    this.previewElement = document.createElement('div');
    this.previewElement.className = 'fdh-color-preview-bar';
    this.previewElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: #1f2937;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: white;
      display: none;
    `;
    document.body.appendChild(this.previewElement);
  }

  private removePreviewElement(): void {
    if (this.previewElement) {
      this.previewElement.remove();
      this.previewElement = null;
    }
  }

  private attachEventListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const color = this.getColorAtPoint(e.clientX, e.clientY);
    this.updatePreview(color);
    
    if (this.magnifier) {
      this.updateMagnifier(e.clientX, e.clientY, color);
    }
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (target.closest('.fdh-color-magnifier')) return;

    e.preventDefault();
    e.stopPropagation();

    const color = this.getColorAtPoint(e.clientX, e.clientY);
    this.options.onColorSelect(color, this.options.defaultFormat);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      this.deactivate();
    }
  };

  private getColorAtPoint(x: number, y: number): string {
    try {
      this.ctx.drawImage(
        document.documentElement as unknown as CanvasImageSource,
        x, y, 1, 1, 0, 0, 1, 1
      );
    } catch {
      // Fallback: try to get element color
      const element = document.elementFromPoint(x, y) as HTMLElement;
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        return computedStyle.backgroundColor || computedStyle.color || '#000000';
      }
    }

    const pixel = this.ctx.getImageData(0, 0, 1, 1).data;
    return this.rgbToHex(pixel[0], pixel[1], pixel[2]);
  }

  private updatePreview(color: string): void {
    if (!this.previewElement) return;

    this.previewElement.style.display = 'flex';
    this.previewElement.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 4px;
        background: ${color};
        border: 2px solid white;
      "></div>
      <div>
        <div>${color}</div>
        <div style="color: #9ca3af; font-size: 10px;">${this.hexToRgb(color)}</div>
      </div>
    `;
  }

  private updateMagnifier(x: number, y: number, color: string): void {
    if (!this.magnifier) return;

    const magnifierSize = 100;
    const zoomLevel = 5;
    const offset = magnifierSize / 2;

    // Position magnifier near cursor but not covering it
    let left = x + 20;
    let top = y - offset;

    // Keep within viewport
    if (left + magnifierSize > window.innerWidth) {
      left = x - magnifierSize - 20;
    }
    if (top < 0) {
      top = 10;
    }
    if (top + magnifierSize > window.innerHeight) {
      top = window.innerHeight - magnifierSize - 10;
    }

    this.magnifier.style.display = 'block';
    this.magnifier.style.left = `${left}px`;
    this.magnifier.style.top = `${top}px`;

    // Update zoom canvas
    const canvas = this.magnifier.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 100, 100);
      ctx.imageSmoothingEnabled = false;
      
      try {
        ctx.drawImage(
          document.documentElement as unknown as CanvasImageSource,
          x - 10, y - 10, 20, 20,
          0, 0, 100, 100
        );
      } catch {
        // Fallback
      }

      // Draw center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 45);
      ctx.lineTo(50, 55);
      ctx.moveTo(45, 50);
      ctx.lineTo(55, 50);
      ctx.stroke();
    }

    // Update color preview in magnifier
    const preview = this.magnifier.querySelector('.fdh-color-preview') as HTMLElement;
    if (preview) {
      preview.textContent = color;
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '';
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
  }

  // Public API methods for consistency
  enable(): void {
    this.activate();
  }

  disable(): void {
    this.deactivate();
  }

  toggle(): void {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable();
    }
  }

  getState(): { enabled: boolean; format: 'hex' | 'rgb' | 'hsl' } {
    return {
      enabled: this.isActive,
      format: this.options.defaultFormat,
    };
  }

  setFormat(format: 'hex' | 'rgb' | 'hsl'): void {
    this.options.defaultFormat = format;
  }

  extractPalette(): void {
    // Placeholder for palette extraction feature
    console.log('[ColorPicker] Palette extraction not implemented yet');
  }
}

// Export singleton instance
export const colorPicker = new ColorPicker();
export default colorPicker;
