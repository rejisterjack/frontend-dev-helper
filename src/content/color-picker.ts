/**
 * Color Picker Module
 *
 * Provides color picking functionality from the page.
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import { escapeHtml, sanitizeColor } from '@/utils/sanitize';

export interface ColorPickerOptions {
  onColorSelect?: (color: string, format: 'hex' | 'rgb' | 'hsl') => void;
  defaultFormat?: 'hex' | 'rgb' | 'hsl';
  showMagnifier?: boolean;
}

export class ColorPicker {
  private options: Required<ColorPickerOptions>;
  private isActive = false;
  private magnifier: HTMLElement | null = null;
  private previewElement: HTMLElement | null = null;

  constructor(options: ColorPickerOptions = {}) {
    this.options = {
      onColorSelect: options.onColorSelect ?? (() => {}),
      defaultFormat: options.defaultFormat ?? 'hex',
      showMagnifier: options.showMagnifier ?? true,
    };
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

  private handleClick = async (e: MouseEvent): Promise<void> => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (target.closest('.fdh-color-magnifier')) return;

    e.preventDefault();
    e.stopPropagation();

    // Use EyeDropper API if available (Chrome 95+)
    const eyeDropper = (
      window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }
    ).EyeDropper;
    if (eyeDropper) {
      try {
        const picker = new eyeDropper();
        const result = await picker.open();
        this.options.onColorSelect(result.sRGBHex, this.options.defaultFormat);
      } catch {
        // User cancelled or error - do nothing
      }
    } else {
      // Fallback to computed style
      const color = this.getColorAtPoint(e.clientX, e.clientY);
      this.options.onColorSelect(color, this.options.defaultFormat);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      this.deactivate();
    }
  };

  private getColorAtPoint(x: number, y: number): string {
    // Get color at point using elementFromPoint and computed styles
    // This is the fallback method since HTMLElement is not a valid CanvasImageSource
    const element = document.elementFromPoint(x, y) as HTMLElement;
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle.backgroundColor || computedStyle.color || '#000000';
    }
    return '#000000';
  }

  private updatePreview(color: string): void {
    if (!this.previewElement) return;

    this.previewElement.style.display = 'flex';
    const cssColor = sanitizeColor(color) || '#000000';
    const safeColor = escapeHtml(color);
    this.previewElement.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 4px;
        background: ${cssColor};
        border: 2px solid white;
      "></div>
      <div>
        <div>${safeColor}</div>
        <div style="color: #9ca3af; font-size: 10px;">${escapeHtml(this.hexToRgb(color))}</div>
      </div>
    `;
  }

  private updateMagnifier(x: number, y: number, color: string): void {
    if (!this.magnifier) return;

    const magnifierSize = 100;
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

    // Update magnifier background to show current color
    const canvas = this.magnifier.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 100, 100);

      // Draw checkerboard pattern background
      const squareSize = 10;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ccc' : '#fff';
          ctx.fillRect(i * squareSize, j * squareSize, squareSize, squareSize);
        }
      }

      // Draw current color overlay
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 100, 100);

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
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? `0${hex}` : hex;
        })
        .join('')
    );
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

  extractPalette(): PaletteResult {
    const colors = this.extractPageColors();
    const palette = this.generatePalette(colors);

    // Show palette overlay
    this.showPaletteOverlay(palette);

    return palette;
  }

  private extractPageColors(): Map<string, number> {
    const colors = new Map<string, number>();

    walkElementsEfficiently(
      document,
      (el) => {
        if (!(el instanceof HTMLElement)) return;
        const computed = window.getComputedStyle(el);

        const colorProps = [
          'color',
          'backgroundColor',
          'borderColor',
          'borderTopColor',
          'borderRightColor',
          'borderBottomColor',
          'borderLeftColor',
          'outlineColor',
        ];

        colorProps.forEach((prop) => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
            const hex = this.colorToHex(value);
            if (hex) {
              colors.set(hex, (colors.get(hex) || 0) + 1);
            }
          }
        });
      },
      (msg) => logger.log(msg)
    );

    return colors;
  }

  private colorToHex(color: string): string | null {
    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const [r, g, b] = rgbMatch[1].split(',').map((n) => parseInt(n.trim(), 10));
      return this.rgbToHex(r, g, b);
    }

    // Handle hex
    if (color.startsWith('#')) {
      // Normalize short hex
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      }
      return color.toLowerCase();
    }

    // Handle hsl
    const hslMatch = color.match(/hsla?\(([^)]+)\)/);
    if (hslMatch) {
      const [h, s, l] = hslMatch[1].split(',').map((n) => parseFloat(n.trim()));
      const rgb = this.hslToRgb(h, s, l);
      return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    return null;
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    };
  }

  private generatePalette(colors: Map<string, number>): PaletteResult {
    // Sort by frequency
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);

    // Extract dominant colors (top 10)
    const dominant = sortedColors.slice(0, 10);

    // Generate harmonious palette
    const baseColor = dominant[0] || '#3b82f6';
    const harmonies = this.generateColorHarmonies(baseColor);

    // Categorize colors
    const categorized = this.categorizeColors(dominant);

    return {
      dominant,
      harmonies,
      categorized,
      totalColors: colors.size,
      allColors: sortedColors.slice(0, 50),
    };
  }

  private generateColorHarmonies(baseColor: string): ColorHarmonies {
    const rgb = this.hexToRgbObj(baseColor);
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);

    return {
      complementary: [this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)],
      analogous: [
        this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
        this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
      ],
      triadic: [
        this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
        this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
      ],
      splitComplementary: [
        this.hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
        this.hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
      ],
      tetradic: [
        this.hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
        this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
        this.hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l),
      ],
      monochromatic: [
        this.hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 30)),
        this.hslToHex(hsl.h, hsl.s, Math.max(20, hsl.l - 15)),
        this.hslToHex(hsl.h, hsl.s, Math.min(90, hsl.l + 15)),
        this.hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 30)),
      ],
    };
  }

  private hexToRgbObj(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  private hslToHex(h: number, s: number, l: number): string {
    const rgb = this.hslToRgb(h, s, l);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  private categorizeColors(colors: string[]): CategorizedColors {
    const result: CategorizedColors = {
      primary: [],
      secondary: [],
      accent: [],
      neutral: [],
      semantic: { success: [], warning: [], error: [], info: [] },
    };

    colors.forEach((color) => {
      const hsl = this.rgbToHslObj(this.hexToRgbObj(color));

      // Detect neutrals (low saturation)
      if (hsl.s < 10) {
        result.neutral.push(color);
        return;
      }

      // Detect semantic colors based on hue
      if (hsl.h >= 100 && hsl.h <= 150) {
        result.semantic.success.push(color);
      } else if (hsl.h >= 40 && hsl.h <= 70) {
        result.semantic.warning.push(color);
      } else if (hsl.h >= 340 || hsl.h <= 20) {
        result.semantic.error.push(color);
      } else if (hsl.h >= 190 && hsl.h <= 240) {
        result.semantic.info.push(color);
      } else if (result.primary.length < 2) {
        result.primary.push(color);
      } else {
        result.secondary.push(color);
      }
    });

    return result;
  }

  private rgbToHslObj(rgb: { r: number; g: number; b: number }): {
    h: number;
    s: number;
    l: number;
  } {
    return this.rgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  private showPaletteOverlay(palette: PaletteResult): void {
    // Remove existing overlay
    const existing = document.getElementById('fdh-palette-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fdh-palette-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'FrontendDevHelper Color Picker');
    overlay.setAttribute('aria-modal', 'false');
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 16px;
      padding: 24px;
      width: 480px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
      color: #e2e8f0;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
    `;

    overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; color: #c084fc;">🎨 Page Color Palette</h3>
        <button
          type="button" id="fdh-close-palette" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        ">×</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          Found ${palette.totalColors} unique colors
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;" class="color-palette-grid" data-palette-type="dominant">
          ${palette.dominant
            .map((color) => {
              const cssColor = sanitizeColor(color) || '#000000';
              const safeColor = escapeHtml(color);
              return `
            <div style="
              width: 40px;
              height: 40px;
              background: ${cssColor};
              border-radius: 8px;
              border: 2px solid rgba(255,255,255,0.1);
              cursor: pointer;
              position: relative;
            " title="${safeColor}" data-color="${safeColor}" class="color-swatch">
              <span style="
                position: absolute;
                bottom: -18px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 9px;
                color: #94a3b8;
                white-space: nowrap;
              ">${safeColor}</span>
            </div>
          `;
            })
            .join('')}
        </div>
      </div>

      ${this.renderHarmonySection('Complementary', palette.harmonies.complementary)}
      ${this.renderHarmonySection('Analogous', palette.harmonies.analogous)}
      ${this.renderHarmonySection('Triadic', palette.harmonies.triadic)}
      ${this.renderHarmonySection('Monochromatic', palette.harmonies.monochromatic)}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Semantic Colors</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${Object.entries(palette.categorized.semantic)
            .filter(([, colors]) => colors.length > 0)
            .map(
              ([type, colors]) => `
              <div style="
                background: rgba(30, 41, 59, 0.6);
                border-radius: 8px;
                padding: 10px;
              ">
                <div style="font-size: 10px; color: #64748b; text-transform: capitalize; margin-bottom: 6px;">${escapeHtml(type)}</div>
                <div style="display: flex; gap: 4px;">
                  ${colors
                    .slice(0, 3)
                    .map((color) => {
                      const cssClr = sanitizeColor(color) || '#000000';
                      const safeClr = escapeHtml(color);
                      return `
                    <div style="
                      width: 24px;
                      height: 24px;
                      background: ${cssClr};
                      border-radius: 4px;
                      border: 1px solid rgba(255,255,255,0.1);
                    " title="${safeClr}"></div>
                  `;
                    })
                    .join('')}
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button
          type="button" id="fdh-copy-palette" style="
          flex: 1;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 8px;
          padding: 10px;
          color: #818cf8;
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
        ">📋 Copy Palette</button>
        <button
          type="button" id="fdh-export-palette" style="
          flex: 1;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          padding: 10px;
          color: #4ade80;
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
        ">💾 Export JSON</button>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #64748b;">
        Click any color to copy to clipboard
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('#fdh-close-palette')?.addEventListener('click', () => overlay.remove());

    // Event delegation for color swatches (security: prevents XSS via inline onclick)
    overlay.addEventListener('click', (e) => {
      const swatch = (e.target as HTMLElement).closest('.color-swatch');
      if (swatch) {
        const color = swatch.getAttribute('data-color');
        if (color) {
          navigator.clipboard.writeText(color);
          this.showNotification(`Copied ${color} to clipboard!`);
        }
      }
    });
    overlay.querySelector('#fdh-copy-palette')?.addEventListener('click', () => {
      const colors = palette.dominant.join('\n');
      navigator.clipboard.writeText(colors);
      this.showNotification('Palette copied to clipboard!');
    });
    overlay.querySelector('#fdh-export-palette')?.addEventListener('click', () => {
      const json = JSON.stringify(palette, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `color-palette-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Close on escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private renderHarmonySection(title: string, colors: string[]): string {
    if (colors.length === 0) return '';
    const safeTitle = escapeHtml(title);
    return `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${safeTitle}</div>
        <div style="display: flex; gap: 6px;" class="color-harmony-row">
          ${colors
            .map((color) => {
              const cssColor = sanitizeColor(color) || '#000000';
              const safeColor = escapeHtml(color);
              return `
            <div style="
              width: 32px;
              height: 32px;
              background: ${cssColor};
              border-radius: 6px;
              border: 2px solid rgba(255,255,255,0.1);
              cursor: pointer;
            " title="${safeColor}" data-color="${safeColor}" class="color-swatch"></div>
          `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #22c55e;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }
}

// Palette result types
export interface PaletteResult {
  dominant: string[];
  harmonies: ColorHarmonies;
  categorized: CategorizedColors;
  totalColors: number;
  allColors: string[];
}

export interface ColorHarmonies {
  complementary: string[];
  analogous: string[];
  triadic: string[];
  splitComplementary: string[];
  tetradic: string[];
  monochromatic: string[];
}

export interface CategorizedColors {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  semantic: {
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
  };
}

// Export singleton instance
export const colorPicker = new ColorPicker();
export default colorPicker;
