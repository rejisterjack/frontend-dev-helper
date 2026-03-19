/**
 * Screenshot Studio Module
 *
 * A comprehensive screenshot capture and annotation tool that allows users to:
 * - Capture visible viewport or full page screenshots
 * - Add annotations: arrows, rectangles, circles, text, blur (for sensitive info)
 * - Edit annotations (move, resize, delete)
 * - Change annotation colors
 * - Copy screenshot to clipboard
 * - Download screenshot as PNG/JPG
 * - Cancel/discard screenshot
 */

// ============================================
// Type Definitions
// ============================================

/** Available annotation tool types */
export type AnnotationTool = 'arrow' | 'rectangle' | 'circle' | 'text' | 'blur' | 'select';

/** Supported export formats */
export type ExportFormat = 'png' | 'jpeg';

/** Annotation data structure */
export interface Annotation {
  id: string;
  type: AnnotationTool;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  strokeWidth: number;
  rotation: number;
  createdAt: number;
}

/** Screenshot capture options */
export interface CaptureOptions {
  /** Capture full page or just visible viewport */
  fullPage?: boolean;
  /** Export format */
  format?: ExportFormat;
  /** Image quality (0-1 for jpeg) */
  quality?: number;
  /** File name for download */
  filename?: string;
}

/** Screenshot Studio state */
export interface ScreenshotStudioState {
  enabled: boolean;
  isCapturing: boolean;
  isEditing: boolean;
  currentTool: AnnotationTool;
  currentColor: string;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  screenshotDataUrl: string | null;
}

/** Point coordinates */
interface Point {
  x: number;
  y: number;
}

/** Drag operation state */
interface DragState {
  isDragging: boolean;
  annotationId: string | null;
  startPoint: Point;
  currentPoint: Point;
  isResizing: boolean;
  resizeHandle: string | null;
}

/** Text editing state */
interface TextEditState {
  annotationId: string | null;
  input: HTMLInputElement | null;
}

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-screenshot-studio';

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ffffff', // white
  '#000000', // black
];

const DEFAULT_COLOR = '#ef4444';
const STROKE_WIDTH = 3;
const BLUR_RADIUS = 8;
const HANDLE_SIZE = 8;

// ============================================
// Screenshot Studio Class
// ============================================

export class ScreenshotStudio {
  private state: ScreenshotStudioState;
  private dragState: DragState;
  private textEditState: TextEditState;

  // DOM Elements
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private toolbar: HTMLElement | null = null;
  private colorPicker: HTMLElement | null = null;
  private instructions: HTMLElement | null = null;
  private actionBar: HTMLElement | null = null;
  private previewImage: HTMLImageElement | null = null;
  private selectionBox: HTMLElement | null = null;
  private resizeHandles: HTMLElement[] = [];

  constructor() {
    this.state = {
      enabled: false,
      isCapturing: false,
      isEditing: false,
      currentTool: 'select',
      currentColor: DEFAULT_COLOR,
      annotations: [],
      selectedAnnotationId: null,
      screenshotDataUrl: null,
    };

    this.dragState = {
      isDragging: false,
      annotationId: null,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      isResizing: false,
      resizeHandle: null,
    };

    this.textEditState = {
      annotationId: null,
      input: null,
    };

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Enable the screenshot studio
   */
  async enable(): Promise<void> {
    if (this.state.enabled) return;

    this.state.enabled = true;
    await this.startCapture();
  }

  /**
   * Disable the screenshot studio
   */
  disable(): void {
    if (!this.state.enabled) return;

    this.state.enabled = false;
    this.cleanup();
  }

  /**
   * Toggle the screenshot studio
   */
  async toggle(): Promise<void> {
    if (this.state.enabled) {
      this.disable();
    } else {
      await this.enable();
    }
  }

  /**
   * Capture a screenshot directly without entering edit mode
   */
  async capture(options: CaptureOptions = {}): Promise<string> {
    const { fullPage = false, format = 'png', quality = 0.92 } = options;

    try {
      const dataUrl = await this.captureScreenshot(fullPage);

      if (format === 'jpeg') {
        return this.convertToFormat(dataUrl, format, quality);
      }

      return dataUrl;
    } catch (error) {
      console.error('[ScreenshotStudio] Capture failed:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): ScreenshotStudioState {
    return { ...this.state };
  }

  /**
   * Set the current annotation tool
   */
  setTool(tool: AnnotationTool): void {
    this.state.currentTool = tool;
    this.updateToolbarUI();
    this.updateCursor();
  }

  /**
   * Set the current annotation color
   */
  setColor(color: string): void {
    this.state.currentColor = color;
    this.updateColorPickerUI();
  }

  // ============================================
  // Core Capture & Setup
  // ============================================

  private async startCapture(): Promise<void> {
    this.state.isCapturing = true;

    try {
      // Capture screenshot first
      const dataUrl = await this.captureScreenshot(true);
      this.state.screenshotDataUrl = dataUrl;

      // Setup the UI
      this.createContainer();
      this.createCanvas();
      await this.loadScreenshot(dataUrl);
      this.createToolbar();
      this.createColorPicker();
      this.createActionBar();
      this.createInstructions();
      this.attachEventListeners();

      this.state.isCapturing = false;
      this.state.isEditing = true;
    } catch (error) {
      console.error('[ScreenshotStudio] Failed to start capture:', error);
      this.cleanup();
      throw error;
    }
  }

  private async captureScreenshot(fullPage: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if we're in extension context and can use chrome.tabs API
      if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl: string) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (fullPage) {
            this.captureFullPage(dataUrl).then(resolve).catch(reject);
          } else {
            resolve(dataUrl);
          }
        });
      } else {
        // Fallback: capture using canvas
        this.captureWithCanvas(fullPage).then(resolve).catch(reject);
      }
    });
  }

  private async captureFullPage(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scrollWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth
        );
        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );

        canvas.width = scrollWidth;
        canvas.height = scrollHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw captured image at current scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        ctx.drawImage(img, scrollX, scrollY);

        // Fill remaining areas with white
        ctx.fillStyle = '#ffffff';
        if (scrollX > 0) {
          ctx.fillRect(0, 0, scrollX, canvas.height);
        }
        if (scrollY > 0) {
          ctx.fillRect(0, 0, canvas.width, scrollY);
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load screenshot'));
      img.src = dataUrl;
    });
  }

  private async captureWithCanvas(fullPage: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      if (fullPage) {
        canvas.width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        canvas.height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render DOM to canvas
      this.renderDOMToCanvas(canvas, ctx, fullPage)
        .then(() => resolve(canvas.toDataURL('image/png')))
        .catch(reject);
    });
  }

  private async renderDOMToCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    fullPage: boolean
  ): Promise<void> {
    return new Promise((resolve) => {
      const elements = Array.from(document.body.querySelectorAll('*'));
      const offsetX = fullPage ? 0 : -window.scrollX;
      const offsetY = fullPage ? 0 : -window.scrollY;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const x = rect.left + offsetX + window.scrollX;
          const y = rect.top + offsetY + window.scrollY;
          const width = rect.width;
          const height = rect.height;

          // Only draw if within canvas bounds
          if (x < canvas.width && y < canvas.height && x + width > 0 && y + height > 0) {
            // Draw background
            const bgColor = style.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              ctx.fillStyle = bgColor;
              ctx.fillRect(x, y, width, height);
            }

            // Draw border
            const borderWidth = parseFloat(style.borderWidth);
            if (borderWidth > 0) {
              ctx.strokeStyle = style.borderColor;
              ctx.lineWidth = borderWidth;
              ctx.strokeRect(x, y, width, height);
            }
          }
        }
      }

      resolve();
    });
  }

  private async loadScreenshot(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.previewImage = new Image();
      this.previewImage.onload = () => {
        this.resizeCanvas();
        this.render();
        resolve();
      };
      this.previewImage.onerror = () => reject(new Error('Failed to load screenshot'));
      this.previewImage.src = dataUrl;
    });
  }

  // ============================================
  // UI Creation
  // ============================================

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = `${PREFIX}-container`;
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    document.body.appendChild(this.container);
  }

  private createCanvas(): void {
    if (!this.container) return;

    const canvasContainer = document.createElement('div');
    canvasContainer.className = `${PREFIX}-canvas-container`;
    canvasContainer.style.cssText = `
      position: relative;
      max-width: 95vw;
      max-height: 85vh;
      overflow: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border-radius: 8px;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.className = `${PREFIX}-canvas`;
    this.canvas.style.cssText = `
      display: block;
      cursor: crosshair;
      background: white;
    `;

    this.ctx = this.canvas.getContext('2d');
    canvasContainer.appendChild(this.canvas);
    this.container.appendChild(canvasContainer);

    // Create selection box for move/resize
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = `${PREFIX}-selection-box`;
    this.selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      display: none;
      z-index: 10;
    `;
    canvasContainer.appendChild(this.selectionBox);

    // Create resize handles
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const pos of handlePositions) {
      const handle = document.createElement('div');
      handle.className = `${PREFIX}-resize-handle ${PREFIX}-resize-handle-${pos}`;
      handle.dataset.position = pos;
      handle.style.cssText = `
        position: absolute;
        width: ${HANDLE_SIZE}px;
        height: ${HANDLE_SIZE}px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        pointer-events: auto;
        cursor: ${this.getResizeCursor(pos)};
        display: none;
        z-index: 11;
      `;
      this.selectionBox.appendChild(handle);
      this.resizeHandles.push(handle);
    }
  }

  private getResizeCursor(position: string): string {
    const cursors: Record<string, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
    };
    return cursors[position] || 'pointer';
  }

  private createToolbar(): void {
    if (!this.container) return;

    this.toolbar = document.createElement('div');
    this.toolbar.className = `${PREFIX}-toolbar`;
    this.toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      padding: 8px;
      background: #1f2937;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      z-index: 2147483648;
    `;

    const tools: { type: AnnotationTool; icon: string; tooltip: string }[] = [
      { type: 'select', icon: '↖', tooltip: 'Select (V)' },
      { type: 'rectangle', icon: '□', tooltip: 'Rectangle (R)' },
      { type: 'circle', icon: '○', tooltip: 'Circle (C)' },
      { type: 'arrow', icon: '→', tooltip: 'Arrow (A)' },
      { type: 'text', icon: 'T', tooltip: 'Text (T)' },
      { type: 'blur', icon: '◐', tooltip: 'Blur (B)' },
    ];

    for (const tool of tools) {
      const btn = this.createToolButton(tool.type, tool.icon, tool.tooltip);
      this.toolbar.appendChild(btn);
    }

    // Add divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 1px;
      background: #374151;
      margin: 4px 8px;
    `;
    this.toolbar.appendChild(divider);

    // Add delete button
    const deleteBtn = this.createToolButton('delete', '🗑', 'Delete Selected (Del)', () => {
      this.deleteSelectedAnnotation();
    });
    this.toolbar.appendChild(deleteBtn);

    this.container.appendChild(this.toolbar);
  }

  private createToolButton(
    type: AnnotationTool | 'delete',
    icon: string,
    tooltip: string,
    onClick?: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${PREFIX}-tool-btn ${PREFIX}-tool-${type}`;
    btn.innerHTML = icon;
    btn.title = tooltip;
    btn.style.cssText = `
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${type === 'select' ? '#374151' : 'transparent'};
      border: none;
      border-radius: 8px;
      color: #f3f4f6;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = '#4b5563';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = type === 'select' ? '#374151' : 'transparent';
      }
    });

    btn.addEventListener('click', () => {
      if (onClick) {
        onClick();
      } else if (type !== 'delete') {
        this.setTool(type as AnnotationTool);
      }
    });

    return btn;
  }

  private createColorPicker(): void {
    if (!this.container) return;

    this.colorPicker = document.createElement('div');
    this.colorPicker.className = `${PREFIX}-color-picker`;
    this.colorPicker.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
      padding: 10px;
      background: #1f2937;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      z-index: 2147483648;
      flex-wrap: wrap;
      max-width: 280px;
      justify-content: center;
    `;

    for (const color of COLORS) {
      const colorBtn = document.createElement('button');
      colorBtn.className = `${PREFIX}-color-btn`;
      colorBtn.dataset.color = color;
      colorBtn.title = color;
      colorBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid ${color === this.state.currentColor ? '#f3f4f6' : 'transparent'};
        background: ${color};
        cursor: pointer;
        transition: transform 0.2s ease;
        padding: 0;
      `;

      colorBtn.addEventListener('mouseenter', () => {
        colorBtn.style.transform = 'scale(1.2)';
      });

      colorBtn.addEventListener('mouseleave', () => {
        colorBtn.style.transform = 'scale(1)';
      });

      colorBtn.addEventListener('click', () => {
        this.setColor(color);
      });

      this.colorPicker.appendChild(colorBtn);
    }

    this.container.appendChild(this.colorPicker);
  }

  private createActionBar(): void {
    if (!this.container) return;

    this.actionBar = document.createElement('div');
    this.actionBar.className = `${PREFIX}-action-bar`;
    this.actionBar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 12px 20px;
      background: #1f2937;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      z-index: 2147483648;
    `;

    // Copy button
    const copyBtn = this.createActionButton('Copy', '📋', () => this.copyToClipboard());
    this.actionBar.appendChild(copyBtn);

    // Download PNG button
    const downloadPngBtn = this.createActionButton('PNG', '💾', () => this.download('png'));
    this.actionBar.appendChild(downloadPngBtn);

    // Download JPG button
    const downloadJpgBtn = this.createActionButton('JPG', '🖼️', () => this.download('jpeg'));
    this.actionBar.appendChild(downloadJpgBtn);

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 1px;
      background: #374151;
      margin: 0 4px;
    `;
    this.actionBar.appendChild(divider);

    // Cancel button
    const cancelBtn = this.createActionButton('Cancel', '✕', () => this.disable(), true);
    this.actionBar.appendChild(cancelBtn);

    this.container.appendChild(this.actionBar);
  }

  private createActionButton(
    label: string,
    icon: string,
    onClick: () => void,
    isDanger = false
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${PREFIX}-action-btn ${PREFIX}-action-${label.toLowerCase()}`;
    btn.innerHTML = `<span style="margin-right: 6px;">${icon}</span>${label}`;
    btn.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px 16px;
      background: ${isDanger ? '#dc2626' : '#3b82f6'};
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = isDanger ? '#b91c1c' : '#2563eb';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = isDanger ? '#dc2626' : '#3b82f6';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  private createInstructions(): void {
    if (!this.container) return;

    this.instructions = document.createElement('div');
    this.instructions.className = `${PREFIX}-instructions`;
    this.instructions.style.cssText = `
      position: fixed;
      top: 140px;
      right: 20px;
      padding: 16px 20px;
      background: rgba(31, 41, 55, 0.95);
      border-radius: 12px;
      color: #f3f4f6;
      font-size: 13px;
      line-height: 1.6;
      z-index: 2147483648;
      max-width: 240px;
      backdrop-filter: blur(8px);
    `;

    this.instructions.innerHTML = `
      <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #60a5fa;">Keyboard Shortcuts</h4>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px;">
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">V</kbd>
        <span>Select tool</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">R</kbd>
        <span>Rectangle</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">C</kbd>
        <span>Circle</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">A</kbd>
        <span>Arrow</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">T</kbd>
        <span>Text</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">B</kbd>
        <span>Blur</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Del</kbd>
        <span>Delete</span>
        <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Esc</kbd>
        <span>Cancel</span>
      </div>
    `;

    this.container.appendChild(this.instructions);
  }

  // ============================================
  // Event Handling
  // ============================================

  private attachEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleWindowResize);
  }

  private detachEventListeners(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.canvas || this.textEditState.annotationId) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an existing annotation (for select/move)
    if (this.state.currentTool === 'select') {
      const clickedAnnotation = this.getAnnotationAt(x, y);
      if (clickedAnnotation) {
        this.state.selectedAnnotationId = clickedAnnotation.id;
        this.dragState.isDragging = true;
        this.dragState.annotationId = clickedAnnotation.id;
        this.dragState.startPoint = { x, y };
        this.updateSelectionBox();
        this.render();
        return;
      } else {
        this.state.selectedAnnotationId = null;
        this.hideSelectionBox();
        this.render();
      }
    }

    // Start creating new annotation
    if (this.state.currentTool !== 'select') {
      this.dragState.isDragging = true;
      this.dragState.startPoint = { x, y };
      this.dragState.currentPoint = { x, y };

      // For text tool, create immediately
      if (this.state.currentTool === 'text') {
        this.createTextAnnotation(x, y);
        this.dragState.isDragging = false;
      }
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.canvas || !this.dragState.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.dragState.currentPoint = { x, y };

    if (this.state.currentTool === 'select' && this.dragState.annotationId) {
      // Move existing annotation
      const annotation = this.state.annotations.find((a) => a.id === this.dragState.annotationId);
      if (annotation) {
        const dx = x - this.dragState.startPoint.x;
        const dy = y - this.dragState.startPoint.y;
        annotation.x += dx;
        annotation.y += dy;
        this.dragState.startPoint = { x, y };
        this.updateSelectionBox();
        this.render();
      }
    } else {
      // Preview new annotation
      this.render();
      this.drawPreview();
    }
  };

  private handleMouseUp = (): void => {
    if (!this.dragState.isDragging) return;

    if (this.state.currentTool !== 'select' && this.state.currentTool !== 'text') {
      this.createAnnotation();
    }

    this.dragState.isDragging = false;
    this.dragState.annotationId = null;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Tool shortcuts
    switch (e.key.toLowerCase()) {
      case 'v':
        this.setTool('select');
        break;
      case 'r':
        this.setTool('rectangle');
        break;
      case 'c':
        this.setTool('circle');
        break;
      case 'a':
        this.setTool('arrow');
        break;
      case 't':
        this.setTool('text');
        break;
      case 'b':
        this.setTool('blur');
        break;
      case 'delete':
      case 'backspace':
        if (this.state.selectedAnnotationId) {
          e.preventDefault();
          this.deleteSelectedAnnotation();
        }
        break;
      case 'escape':
        if (this.textEditState.annotationId) {
          this.finishTextEdit();
        } else {
          this.disable();
        }
        break;
    }
  };

  private handleWindowResize = (): void => {
    this.resizeCanvas();
    this.render();
  };

  // ============================================
  // Annotation Creation & Management
  // ============================================

  private createAnnotation(): void {
    const { startPoint, currentPoint } = this.dragState;
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    if (width < 5 && height < 5) return; // Too small

    const annotation: Annotation = {
      id: this.generateId(),
      type: this.state.currentTool,
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width,
      height,
      color: this.state.currentColor,
      strokeWidth: STROKE_WIDTH,
      rotation: 0,
      createdAt: Date.now(),
    };

    this.state.annotations.push(annotation);
    this.state.selectedAnnotationId = annotation.id;
    this.updateSelectionBox();
    this.render();
  }

  private createTextAnnotation(x: number, y: number): void {
    const id = this.generateId();
    const annotation: Annotation = {
      id,
      type: 'text',
      x,
      y,
      width: 100,
      height: 30,
      color: this.state.currentColor,
      text: 'Double-click to edit',
      strokeWidth: STROKE_WIDTH,
      rotation: 0,
      createdAt: Date.now(),
    };

    this.state.annotations.push(annotation);
    this.state.selectedAnnotationId = id;
    this.updateSelectionBox();
    this.render();
    this.startTextEdit(id);
  }

  private getAnnotationAt(x: number, y: number): Annotation | null {
    // Check in reverse order (top to bottom)
    for (let i = this.state.annotations.length - 1; i >= 0; i--) {
      const annotation = this.state.annotations[i];
      if (this.isPointInAnnotation(x, y, annotation)) {
        return annotation;
      }
    }
    return null;
  }

  private isPointInAnnotation(x: number, y: number, annotation: Annotation): boolean {
    const padding = 5;
    return (
      x >= annotation.x - padding &&
      x <= annotation.x + annotation.width + padding &&
      y >= annotation.y - padding &&
      y <= annotation.y + annotation.height + padding
    );
  }

  private deleteSelectedAnnotation(): void {
    if (!this.state.selectedAnnotationId) return;

    this.state.annotations = this.state.annotations.filter(
      (a) => a.id !== this.state.selectedAnnotationId
    );
    this.state.selectedAnnotationId = null;
    this.hideSelectionBox();
    this.render();
  }

  // ============================================
  // Text Editing
  // ============================================

  private startTextEdit(annotationId: string): void {
    const annotation = this.state.annotations.find((a) => a.id === annotationId);
    if (!annotation || annotation.type !== 'text') return;

    this.textEditState.annotationId = annotationId;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = annotation.text || '';
    input.style.cssText = `
      position: absolute;
      left: ${annotation.x}px;
      top: ${annotation.y - 20}px;
      min-width: 100px;
      padding: 4px 8px;
      background: #1f2937;
      border: 2px solid #3b82f6;
      border-radius: 4px;
      color: ${annotation.color};
      font-size: 14px;
      outline: none;
      z-index: 2147483649;
    `;

    const canvasContainer = this.canvas?.parentElement;
    if (canvasContainer) {
      canvasContainer.appendChild(input);
      input.focus();
      input.select();
    }

    this.textEditState.input = input;

    const finishEdit = () => {
      annotation.text = input.value || 'Text';
      annotation.width = Math.max(100, input.value.length * 8);
      this.finishTextEdit();
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEdit();
      } else if (e.key === 'Escape') {
        this.finishTextEdit();
      }
    });
  }

  private finishTextEdit(): void {
    if (this.textEditState.input) {
      this.textEditState.input.remove();
    }
    this.textEditState = { annotationId: null, input: null };
    this.render();
  }

  // ============================================
  // Selection Box
  // ============================================

  private updateSelectionBox(): void {
    if (!this.selectionBox || !this.state.selectedAnnotationId) return;

    const annotation = this.state.annotations.find((a) => a.id === this.state.selectedAnnotationId);
    if (!annotation) {
      this.hideSelectionBox();
      return;
    }

    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${annotation.x - 4}px`;
    this.selectionBox.style.top = `${annotation.y - 4}px`;
    this.selectionBox.style.width = `${annotation.width + 8}px`;
    this.selectionBox.style.height = `${annotation.height + 8}px`;

    // Position resize handles
    this.positionResizeHandles(annotation);
  }

  private hideSelectionBox(): void {
    if (this.selectionBox) {
      this.selectionBox.style.display = 'none';
    }
    for (const handle of this.resizeHandles) {
      handle.style.display = 'none';
    }
  }

  private positionResizeHandles(_annotation: Annotation): void {
    const handles: Record<string, { x: string; y: string }> = {
      nw: { x: '-4px', y: '-4px' },
      n: { x: '50%', y: '-4px' },
      ne: { x: `calc(100% - ${HANDLE_SIZE - 4}px)`, y: '-4px' },
      e: { x: `calc(100% - ${HANDLE_SIZE - 4}px)`, y: '50%' },
      se: { x: `calc(100% - ${HANDLE_SIZE - 4}px)`, y: `calc(100% - ${HANDLE_SIZE - 4}px)` },
      s: { x: '50%', y: `calc(100% - ${HANDLE_SIZE - 4}px)` },
      sw: { x: '-4px', y: `calc(100% - ${HANDLE_SIZE - 4}px)` },
      w: { x: '-4px', y: '50%' },
    };

    for (const handle of this.resizeHandles) {
      const pos = handle.dataset.position || '';
      const posData = handles[pos];
      if (posData) {
        handle.style.display = 'block';
        handle.style.left = posData.x;
        handle.style.top = posData.y;
        handle.style.transform =
          pos.includes('n') && pos !== 'n' && pos !== 'nw' && pos !== 'ne'
            ? 'translate(-50%, 0)'
            : pos === 'w' || pos === 'e'
              ? 'translate(0, -50%)'
              : 'none';
      }
    }
  }

  // ============================================
  // Rendering
  // ============================================

  private resizeCanvas(): void {
    if (!this.canvas || !this.previewImage) return;

    const container = this.canvas.parentElement;
    if (!container) return;

    const maxWidth = container.clientWidth;
    const maxHeight = window.innerHeight * 0.85;

    const scale = Math.min(
      maxWidth / this.previewImage.width,
      maxHeight / this.previewImage.height,
      1
    );

    this.canvas.width = this.previewImage.width;
    this.canvas.height = this.previewImage.height;
    this.canvas.style.width = `${this.previewImage.width * scale}px`;
    this.canvas.style.height = `${this.previewImage.height * scale}px`;
  }

  private render(): void {
    if (!this.ctx || !this.canvas || !this.previewImage) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw screenshot
    this.ctx.drawImage(this.previewImage, 0, 0);

    // Draw annotations
    for (const annotation of this.state.annotations) {
      this.drawAnnotation(annotation);
    }
  }

  private drawAnnotation(annotation: Annotation): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.strokeStyle = annotation.color;
    this.ctx.fillStyle = annotation.color;
    this.ctx.lineWidth = annotation.strokeWidth;

    switch (annotation.type) {
      case 'rectangle':
        this.drawRectangle(annotation);
        break;
      case 'circle':
        this.drawCircle(annotation);
        break;
      case 'arrow':
        this.drawArrow(annotation);
        break;
      case 'text':
        this.drawText(annotation);
        break;
      case 'blur':
        this.drawBlur(annotation);
        break;
    }

    this.ctx.restore();
  }

  private drawRectangle(annotation: Annotation): void {
    if (!this.ctx) return;
    this.ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
  }

  private drawCircle(annotation: Annotation): void {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.ellipse(
      annotation.x + annotation.width / 2,
      annotation.y + annotation.height / 2,
      annotation.width / 2,
      annotation.height / 2,
      0,
      0,
      2 * Math.PI
    );
    this.ctx.stroke();
  }

  private drawArrow(annotation: Annotation): void {
    if (!this.ctx) return;

    const fromX = annotation.x;
    const fromY = annotation.y;
    const toX = annotation.x + annotation.width;
    const toY = annotation.y + annotation.height;

    const headLength = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawText(annotation: Annotation): void {
    if (!this.ctx) return;

    this.ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    this.ctx.fillStyle = annotation.color;
    this.ctx.textBaseline = 'top';

    const text = annotation.text || 'Text';
    const padding = 6;

    // Draw background
    const metrics = this.ctx.measureText(text);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(
      annotation.x - padding,
      annotation.y - padding,
      metrics.width + padding * 2,
      24 + padding * 2
    );

    // Draw text
    this.ctx.fillStyle = annotation.color;
    this.ctx.fillText(text, annotation.x, annotation.y);
  }

  private drawBlur(annotation: Annotation): void {
    if (!this.ctx || !this.canvas) return;

    // Save the area to blur
    const imageData = this.ctx.getImageData(
      annotation.x,
      annotation.y,
      annotation.width,
      annotation.height
    );

    // Apply simple box blur
    const blurredData = this.applyBlur(imageData, BLUR_RADIUS);
    this.ctx.putImageData(blurredData, annotation.x, annotation.y);

    // Draw border to indicate blurred area
    this.ctx.strokeStyle = annotation.color;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
    this.ctx.setLineDash([]);
  }

  private applyBlur(imageData: ImageData, radius: number): ImageData {
    const { data, width, height } = imageData;
    const output = new ImageData(width, height);
    const outputData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = y + ky;
            const nx = x + kx;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const idx = (ny * width + nx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        outputData[idx] = r / count;
        outputData[idx + 1] = g / count;
        outputData[idx + 2] = b / count;
        outputData[idx + 3] = a / count;
      }
    }

    return output;
  }

  private drawPreview(): void {
    if (!this.ctx || !this.dragState.isDragging || this.state.currentTool === 'text') return;

    const { startPoint, currentPoint } = this.dragState;
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    if (width < 2 && height < 2) return;

    const previewAnnotation: Annotation = {
      id: 'preview',
      type: this.state.currentTool,
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width,
      height,
      color: this.state.currentColor,
      strokeWidth: STROKE_WIDTH,
      rotation: 0,
      createdAt: Date.now(),
    };

    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.drawAnnotation(previewAnnotation);
    this.ctx.restore();
  }

  // ============================================
  // Export Functions
  // ============================================

  private async copyToClipboard(): Promise<void> {
    try {
      const dataUrl = this.getAnnotatedImage();
      const blob = await this.dataUrlToBlob(dataUrl);

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

      this.showNotification('Screenshot copied to clipboard!');
    } catch (error) {
      console.error('[ScreenshotStudio] Failed to copy:', error);
      this.showNotification('Failed to copy to clipboard', 'error');
    }
  }

  private download(format: ExportFormat): void {
    const dataUrl = this.getAnnotatedImage(format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.${format}`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotification(`Screenshot downloaded as ${format.toUpperCase()}!`);
  }

  private getAnnotatedImage(format: ExportFormat = 'png'): string {
    if (!this.canvas) return '';

    if (format === 'jpeg') {
      return this.canvas.toDataURL('image/jpeg', 0.92);
    }

    return this.canvas.toDataURL('image/png');
  }

  private async convertToFormat(
    dataUrl: string,
    format: ExportFormat,
    quality: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill white background for jpeg
        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(`image/${format}`, quality));
      };
      img.onerror = () => reject(new Error('Failed to convert image'));
      img.src = dataUrl;
    });
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const arr = dataUrl.split(',');
      if (arr.length < 2) {
        reject(new Error('Invalid data URL'));
        return;
      }

      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      resolve(new Blob([u8arr], { type: mime }));
    });
  }

  // ============================================
  // UI Updates
  // ============================================

  private updateToolbarUI(): void {
    if (!this.toolbar) return;

    const buttons = Array.from(
      this.toolbar.querySelectorAll<HTMLButtonElement>(`.${PREFIX}-tool-btn`)
    );
    for (const btn of buttons) {
      let toolType: AnnotationTool | 'delete' | null = null;
      if (btn.className.includes('select')) toolType = 'select';
      else if (btn.className.includes('rectangle')) toolType = 'rectangle';
      else if (btn.className.includes('circle')) toolType = 'circle';
      else if (btn.className.includes('arrow')) toolType = 'arrow';
      else if (btn.className.includes('text')) toolType = 'text';
      else if (btn.className.includes('blur')) toolType = 'blur';
      else if (btn.className.includes('delete')) toolType = 'delete';

      if (toolType && toolType !== 'delete') {
        btn.classList.toggle('active', toolType === this.state.currentTool);
        btn.style.background = toolType === this.state.currentTool ? '#374151' : 'transparent';
      }
    }
  }

  private updateColorPickerUI(): void {
    if (!this.colorPicker) return;

    const buttons = Array.from(
      this.colorPicker.querySelectorAll<HTMLButtonElement>(`.${PREFIX}-color-btn`)
    );
    for (const btn of buttons) {
      const color = btn.dataset.color;
      btn.style.borderColor = color === this.state.currentColor ? '#f3f4f6' : 'transparent';
    }
  }

  private updateCursor(): void {
    if (!this.canvas) return;

    const cursors: Record<AnnotationTool, string> = {
      select: 'default',
      rectangle: 'crosshair',
      circle: 'crosshair',
      arrow: 'crosshair',
      text: 'text',
      blur: 'crosshair',
    };

    this.canvas.style.cursor = cursors[this.state.currentTool];
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${type === 'error' ? '#dc2626' : '#10b981'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483649;
      animation: ${PREFIX}-slideUp 0.3s ease-out;
    `;
    notification.textContent = message;

    this.container?.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = `${PREFIX}-fadeOut 0.3s ease-out`;
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // ============================================
  // Cleanup
  // ============================================

  private cleanup(): void {
    this.detachEventListeners();

    // Clean up text editing
    if (this.textEditState.input) {
      this.textEditState.input.remove();
    }

    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    // Reset state
    this.canvas = null;
    this.ctx = null;
    this.toolbar = null;
    this.colorPicker = null;
    this.instructions = null;
    this.actionBar = null;
    this.previewImage = null;
    this.selectionBox = null;
    this.resizeHandles = [];

    this.state = {
      enabled: false,
      isCapturing: false,
      isEditing: false,
      currentTool: 'select',
      currentColor: DEFAULT_COLOR,
      annotations: [],
      selectedAnnotationId: null,
      screenshotDataUrl: null,
    };

    this.dragState = {
      isDragging: false,
      annotationId: null,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      isResizing: false,
      resizeHandle: null,
    };

    this.textEditState = {
      annotationId: null,
      input: null,
    };
  }

  // ============================================
  // Utilities
  // ============================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================
// Singleton Instance
// ============================================

let screenshotStudio: ScreenshotStudio | null = null;

function getInstance(): ScreenshotStudio {
  if (!screenshotStudio) {
    screenshotStudio = new ScreenshotStudio();
  }
  return screenshotStudio;
}

// ============================================
// Public API Functions
// ============================================

/**
 * Enable the screenshot studio
 */
export async function enable(): Promise<void> {
  await getInstance().enable();
}

/**
 * Disable the screenshot studio
 */
export function disable(): void {
  getInstance().disable();
}

/**
 * Toggle the screenshot studio
 */
export async function toggle(): Promise<void> {
  await getInstance().toggle();
}

/**
 * Capture a screenshot directly
 */
export async function capture(options: CaptureOptions = {}): Promise<string> {
  return getInstance().capture(options);
}

/**
 * Get current state
 */
export function getState(): ScreenshotStudioState {
  return getInstance().getState();
}

/**
 * Set the current annotation tool
 */
export function setTool(tool: AnnotationTool): void {
  getInstance().setTool(tool);
}

/**
 * Set the current annotation color
 */
export function setColor(color: string): void {
  getInstance().setColor(color);
}

// ============================================
// CSS Animations
// ============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes ${PREFIX}-slideUp {
    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes ${PREFIX}-fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// ============================================
// Default Export
// ============================================

export default {
  enable,
  disable,
  toggle,
  capture,
  getState,
  setTool,
  setColor,
  ScreenshotStudio,
};
