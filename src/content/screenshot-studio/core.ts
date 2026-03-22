/**
 * Screenshot Studio - Main Class
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

import { logger } from '@/utils/logger';
import {
  createAnnotation,
  createTextAnnotation,
  deleteAnnotation,
  drawPreview,
  getAnnotationAt,
  hideSelectionBox,
  moveAnnotation,
  render,
  resizeCanvas,
  updateSelectionBox,
} from './annotations';
import {
  captureScreenshot,
  clearSavedState,
  loadScreenshotImage,
  restoreStateFromStorage,
  saveStateToStorage,
} from './capture';
import { DEFAULT_COLOR, TOOL_SHORTCUTS } from './constants';
import {
  createDragState,
  createTextEditState,
  endDrag,
  finishTextEdit,
  getDragDelta,
  isEditingText,
  startDrag,
  startTextEdit,
  updateDragPoint,
  updateDragStartPoint,
} from './editor';
import { copyToClipboard, download } from './export';
import type {
  Annotation,
  AnnotationTool,
  CaptureOptions,
  DragState,
  ExportFormat,
  ScreenshotStudioState,
  TextEditState,
} from './types';
import {
  createActionBar,
  createCanvasElements,
  createColorPicker,
  createContainer,
  createInstructions,
  createToolbar,
  injectAnimations,
  showNotification,
  updateColorPickerUI,
  updateCursor,
  updateToolbarUI,
} from './ui';

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

    this.dragState = createDragState();
    this.textEditState = createTextEditState();

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);

    // Inject CSS animations
    injectAnimations();
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

    // Try to restore previous state
    const savedState = await restoreStateFromStorage();
    if (savedState?.screenshotDataUrl) {
      // Restore previous session
      this.state.annotations = (savedState.annotations as Annotation[]) || [];
      this.state.screenshotDataUrl = savedState.screenshotDataUrl;
      this.state.currentTool = (savedState.currentTool as AnnotationTool) || 'select';
      this.state.currentColor = savedState.currentColor || DEFAULT_COLOR;
      await this.startCaptureWithExistingScreenshot();
    } else {
      // Start fresh capture
      await this.startCapture();
    }
  }

  /**
   * Disable the screenshot studio
   */
  async disable(): Promise<void> {
    if (!this.state.enabled) return;

    this.state.enabled = false;

    // Save state before cleaning up
    await this.saveState();

    this.cleanup();
  }

  /**
   * Toggle the screenshot studio
   */
  async toggle(): Promise<void> {
    if (this.state.enabled) {
      await this.disable();
    } else {
      await this.enable();
    }
  }

  /**
   * Save current state to storage
   */
  private async saveState(): Promise<void> {
    await saveStateToStorage({
      annotations: this.state.annotations,
      screenshotDataUrl: this.state.screenshotDataUrl,
      currentTool: this.state.currentTool,
      currentColor: this.state.currentColor,
    });
  }

  /**
   * Capture a screenshot directly without entering edit mode
   */
  async capture(options: CaptureOptions = {}): Promise<string> {
    const { fullPage = false, format = 'png', quality = 0.92 } = options;

    try {
      const dataUrl = await captureScreenshot(fullPage);

      if (format === 'jpeg') {
        const { convertToFormat } = await import('./capture');
        return convertToFormat(dataUrl, format, quality);
      }

      return dataUrl;
    } catch (error) {
      logger.error('[ScreenshotStudio] Capture failed:', error);
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
    updateToolbarUI(this.toolbar, tool);
    updateCursor(this.canvas, tool);
  }

  /**
   * Set the current annotation color
   */
  setColor(color: string): void {
    this.state.currentColor = color;
    updateColorPickerUI(this.colorPicker, color);
  }

  // ============================================
  // Core Capture & Setup
  // ============================================

  private async startCapture(): Promise<void> {
    this.state.isCapturing = true;

    try {
      // Capture screenshot first
      const dataUrl = await captureScreenshot(true);
      this.state.screenshotDataUrl = dataUrl;

      // Setup the UI
      await this.setupUI(dataUrl);

      this.state.isCapturing = false;
      this.state.isEditing = true;
    } catch (error) {
      logger.error('[ScreenshotStudio] Failed to start capture:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Start capture with existing screenshot (restore from storage)
   */
  private async startCaptureWithExistingScreenshot(): Promise<void> {
    this.state.isCapturing = true;

    try {
      // Use existing screenshot
      const dataUrl = this.state.screenshotDataUrl;
      if (!dataUrl) {
        throw new Error('No screenshot data URL available');
      }

      // Setup the UI
      await this.setupUI(dataUrl);

      // Restore annotations
      this.render();

      this.state.isCapturing = false;
      this.state.isEditing = true;

      logger.log(
        '[ScreenshotStudio] Restored previous session with',
        this.state.annotations.length,
        'annotations'
      );
    } catch (error) {
      logger.error('[ScreenshotStudio] Failed to restore capture:', error);
      // Fall back to fresh capture
      await this.startCapture();
    }
  }

  /**
   * Setup all UI elements
   */
  private async setupUI(dataUrl: string): Promise<void> {
    this.container = createContainer();

    const canvasElements = createCanvasElements(this.container);
    this.canvas = canvasElements.canvas;
    this.ctx = canvasElements.ctx;
    this.selectionBox = canvasElements.selectionBox;
    this.resizeHandles = canvasElements.resizeHandles;

    // Load screenshot
    this.previewImage = await loadScreenshotImage(dataUrl);
    this.resizeCanvas();

    // Create UI components
    this.toolbar = createToolbar(
      this.container,
      {
        onSetTool: (tool) => this.setTool(tool),
        onDelete: () => this.deleteSelectedAnnotation(),
      },
      this.state.currentTool
    );

    this.colorPicker = createColorPicker(
      this.container,
      {
        onSetColor: (color) => this.setColor(color),
      },
      this.state.currentColor
    );

    this.actionBar = createActionBar(this.container, {
      onCopy: () => this.handleCopy(),
      onDownloadPng: () => this.handleDownload('png'),
      onDownloadJpg: () => this.handleDownload('jpeg'),
      onCancel: () => {
        clearSavedState();
        this.disable();
      },
    });

    this.instructions = createInstructions(this.container);

    // Attach event listeners
    this.attachEventListeners();

    // Initial render
    this.render();
  }

  private resizeCanvas(): void {
    if (this.canvas && this.previewImage) {
      resizeCanvas(this.canvas, this.previewImage);
    }
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
    if (!this.canvas || isEditingText(this.textEditState)) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an existing annotation (for select/move)
    if (this.state.currentTool === 'select') {
      const clickedAnnotation = getAnnotationAt(x, y, this.state.annotations);
      if (clickedAnnotation) {
        this.state.selectedAnnotationId = clickedAnnotation.id;
        startDrag(this.dragState, { x, y }, clickedAnnotation.id);
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
      startDrag(this.dragState, { x, y });

      // For text tool, create immediately
      if (this.state.currentTool === 'text') {
        this.createTextAnnotation(x, y);
        endDrag(this.dragState);
      }
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.canvas || !this.dragState.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateDragPoint(this.dragState, { x, y });

    if (this.state.currentTool === 'select' && this.dragState.annotationId) {
      // Move existing annotation
      const annotation = this.state.annotations.find((a) => a.id === this.dragState.annotationId);
      if (annotation) {
        const { dx, dy } = getDragDelta(this.dragState, { x, y });
        moveAnnotation(annotation, dx, dy);
        updateDragStartPoint(this.dragState, { x, y });
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

    endDrag(this.dragState);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Tool shortcuts
    const key = e.key.toLowerCase();

    if (key in TOOL_SHORTCUTS) {
      this.setTool(TOOL_SHORTCUTS[key] as AnnotationTool);
      return;
    }

    switch (key) {
      case 'delete':
      case 'backspace':
        if (this.state.selectedAnnotationId && !isEditingText(this.textEditState)) {
          e.preventDefault();
          this.deleteSelectedAnnotation();
        }
        break;
      case 'escape':
        if (isEditingText(this.textEditState)) {
          finishTextEdit(this.textEditState);
          this.render();
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
    const annotation = createAnnotation(
      this.state.currentTool,
      this.dragState.startPoint,
      this.dragState.currentPoint,
      this.state.currentColor
    );

    if (!annotation) return;

    this.state.annotations.push(annotation);
    this.state.selectedAnnotationId = annotation.id;
    this.updateSelectionBox();
    this.render();
  }

  private createTextAnnotation(x: number, y: number): void {
    const annotation = createTextAnnotation(x, y, this.state.currentColor);
    this.state.annotations.push(annotation);
    this.state.selectedAnnotationId = annotation.id;
    this.updateSelectionBox();
    this.render();

    // Start text editing
    startTextEdit(
      this.textEditState,
      annotation,
      this.canvas?.parentElement,
      (text) => {
        annotation.text = text;
        annotation.width = Math.max(100, text.length * 8);
        finishTextEdit(this.textEditState);
        this.render();
      },
      () => {
        finishTextEdit(this.textEditState);
        this.render();
      }
    );
  }

  private deleteSelectedAnnotation(): void {
    if (!this.state.selectedAnnotationId) return;

    this.state.annotations = deleteAnnotation(
      this.state.annotations,
      this.state.selectedAnnotationId
    );
    this.state.selectedAnnotationId = null;
    this.hideSelectionBox();
    this.render();
  }

  // ============================================
  // Selection Box
  // ============================================

  private updateSelectionBox(): void {
    if (!this.selectionBox) return;

    const annotation = this.state.selectedAnnotationId
      ? this.state.annotations.find((a) => a.id === this.state.selectedAnnotationId) || null
      : null;

    updateSelectionBox(this.selectionBox, this.resizeHandles, annotation);
  }

  private hideSelectionBox(): void {
    if (!this.selectionBox) return;
    hideSelectionBox(this.selectionBox, this.resizeHandles);
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    if (!this.ctx || !this.canvas || !this.previewImage) return;
    render(this.ctx, this.canvas, this.previewImage, this.state.annotations);
  }

  private drawPreview(): void {
    if (!this.ctx || !this.dragState.isDragging || this.state.currentTool === 'text') return;

    drawPreview(
      this.ctx,
      this.state.currentTool,
      this.dragState.startPoint,
      this.dragState.currentPoint,
      this.state.currentColor
    );
  }

  // ============================================
  // Export Functions
  // ============================================

  private async handleCopy(): Promise<void> {
    await copyToClipboard(this.canvas, (msg, type) => this.showNotification(msg, type));
  }

  private handleDownload(format: ExportFormat): void {
    download(this.canvas, format, (msg, type) => this.showNotification(msg, type));
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    showNotification(this.container, message, type);
  }

  // ============================================
  // Cleanup
  // ============================================

  private cleanup(): void {
    this.detachEventListeners();

    // Clean up text editing
    finishTextEdit(this.textEditState);

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

    this.dragState = createDragState();
    this.textEditState = createTextEditState();
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
export async function disable(): Promise<void> {
  await getInstance().disable();
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
