/**
 * Screenshot Studio - Modular Export
 *
 * A comprehensive screenshot capture and annotation tool.
 *
 * @example
 * ```typescript
 * import { enable, disable, capture } from './screenshot-studio';
 *
 * // Enable the screenshot studio UI
 * await enable();
 *
 * // Or capture directly
 * const dataUrl = await capture({ fullPage: true, format: 'png' });
 * ```
 */

// Annotation utilities
export {
  createAnnotation,
  createTextAnnotation,
  deleteAnnotation,
  drawAnnotation,
  drawPreview,
  generateId,
  getAnnotationAt,
  hideSelectionBox,
  isPointInAnnotation,
  moveAnnotation,
  render,
  resizeCanvas,
  updateSelectionBox,
} from './annotations';
// Capture utilities
export {
  captureFullPage,
  captureScreenshot,
  captureWithCanvas,
  clearSavedState,
  convertToFormat,
  dataUrlToBlob,
  getAnnotatedImage,
  loadScreenshotImage,
  restoreStateFromStorage,
  saveStateToStorage,
} from './capture';
// Constants
export {
  BLUR_RADIUS,
  COLORS,
  DEFAULT_COLOR,
  HANDLE_SIZE,
  PREFIX,
  RESIZE_CURSORS,
  STORAGE_KEY,
  STROKE_WIDTH,
  TOOL_CURSORS,
  TOOL_ICONS,
  TOOL_NAMES,
  TOOL_SHORTCUTS,
} from './constants';
// Main class and singleton functions
// Default export for convenience
export {
  capture,
  disable,
  enable,
  getState,
  ScreenshotStudio,
  ScreenshotStudio as default,
  setColor,
  setTool,
  toggle,
} from './core';

// Editor utilities
export {
  createDragState,
  createTextEditState,
  endDrag,
  finishTextEdit,
  getDragDelta,
  getTextInputValue,
  isEditingText,
  startDrag,
  startTextEdit,
  updateAnnotationText,
  updateDragPoint,
  updateDragStartPoint,
} from './editor';

// Export utilities
export {
  copyToClipboard,
  download,
  exportScreenshot,
  generateFilename,
} from './export';
// Types
export type {
  Annotation,
  AnnotationTool,
  CaptureOptions,
  DragState,
  ExportFormat,
  Point,
  ScreenshotStudioState,
  TextEditState,
} from './types';
// UI utilities
export {
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
