export interface OverlayRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor: string;
  fillColor: string;
  label?: string;
  labelColor?: string;
  labelBg?: string;
  borderWidth?: number;
  borderRadius?: number;
  dashArray?: number[];
}

export interface OverlayText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  bgColor?: string;
  fontSize?: number;
  padding?: number;
}

export class CanvasOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rects: Map<string, OverlayRect> = new Map();
  private texts: Map<string, OverlayText> = new Map();
  private rafId: number | null = null;
  private scrollHandler: () => void;
  private resizeHandler: () => void;

  constructor(private shadowRoot: ShadowRoot) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483640;
    `;
    // Set canvas pixel dimensions to match display
    this.updateCanvasSize();

    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;

    this.scrollHandler = () => this.scheduleRender();
    this.resizeHandler = () => {
      this.updateCanvasSize();
      this.scheduleRender();
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', this.resizeHandler, { passive: true });

    this.shadowRoot.appendChild(this.canvas);
  }

  private updateCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addRect(rect: OverlayRect): void {
    this.rects.set(rect.id, rect);
    this.scheduleRender();
  }

  addText(text: OverlayText): void {
    this.texts.set(text.id, text);
    this.scheduleRender();
  }

  removeRect(id: string): void {
    this.rects.delete(id);
    this.scheduleRender();
  }

  removeText(id: string): void {
    this.texts.delete(id);
    this.scheduleRender();
  }

  clearRects(): void {
    this.rects.clear();
    this.scheduleRender();
  }

  clearTexts(): void {
    this.texts.clear();
    this.scheduleRender();
  }

  clearAll(): void {
    this.rects.clear();
    this.texts.clear();
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render(): void {
    const { ctx } = this;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw rectangles
    for (const rect of this.rects.values()) {
      const x = rect.x - scrollX;
      const y = rect.y - scrollY;

      // Skip if outside viewport
      if (x + rect.width < 0 || x > window.innerWidth ||
          y + rect.height < 0 || y > window.innerHeight) {
        continue;
      }

      ctx.save();

      if (rect.dashArray) {
        ctx.setLineDash(rect.dashArray);
      }

      // Fill
      ctx.fillStyle = rect.fillColor;
      if (rect.borderRadius) {
        this.roundRect(ctx, x, y, rect.width, rect.height, rect.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, rect.width, rect.height);
      }

      // Border
      ctx.strokeStyle = rect.borderColor;
      ctx.lineWidth = rect.borderWidth || 2;
      if (rect.borderRadius) {
        this.roundRect(ctx, x, y, rect.width, rect.height, rect.borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, rect.width, rect.height);
      }

      ctx.restore();

      // Label
      if (rect.label) {
        ctx.save();
        ctx.font = '10px system-ui, sans-serif';
        const metrics = ctx.measureText(rect.label);
        const labelW = metrics.width + 8;
        const labelH = 16;
        const labelX = x;
        const labelY = y - labelH - 2;

        ctx.fillStyle = rect.labelBg || rect.borderColor;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, labelH, 2);
        ctx.fill();

        ctx.fillStyle = rect.labelColor || '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(rect.label, labelX + 4, labelY + labelH / 2);
        ctx.restore();
      }
    }

    // Draw texts
    for (const text of this.texts.values()) {
      const x = text.x - scrollX;
      const y = text.y - scrollY;

      if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
        continue;
      }

      ctx.save();
      const fontSize = text.fontSize || 12;
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      ctx.textBaseline = 'top';

      if (text.bgColor) {
        const metrics = ctx.measureText(text.text);
        const padding = text.padding || 4;
        ctx.fillStyle = text.bgColor;
        ctx.fillRect(
          x - padding,
          y - padding,
          metrics.width + padding * 2,
          fontSize + padding * 2,
        );
      }

      ctx.fillStyle = text.color;
      ctx.fillText(text.text, x, y);
      ctx.restore();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  updateRect(id: string, updates: Partial<OverlayRect>): void {
    const existing = this.rects.get(id);
    if (existing) {
      this.rects.set(id, { ...existing, ...updates });
      this.scheduleRender();
    }
  }

  batchUpdate(rects: OverlayRect[]): void {
    for (const rect of rects) {
      this.rects.set(rect.id, rect);
    }
    this.scheduleRender();
  }

  getVisibleRectCount(): number {
    let count = 0;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    for (const rect of this.rects.values()) {
      const x = rect.x - scrollX;
      const y = rect.y - scrollY;
      if (x + rect.width >= 0 && x <= window.innerWidth &&
          y + rect.height >= 0 && y <= window.innerHeight) {
        count++;
      }
    }
    return count;
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('resize', this.resizeHandler);
    this.canvas.remove();
    this.rects.clear();
    this.texts.clear();
  }
}
