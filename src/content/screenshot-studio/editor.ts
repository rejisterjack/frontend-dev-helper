/**
 * Editing State Management
 */

import type { Annotation, DragState, Point, TextEditState } from './types';

/**
 * Create initial drag state
 */
export function createDragState(): DragState {
  return {
    isDragging: false,
    annotationId: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    isResizing: false,
    resizeHandle: null,
  };
}

/**
 * Create initial text edit state
 */
export function createTextEditState(): TextEditState {
  return {
    annotationId: null,
    input: null,
  };
}

/**
 * Start dragging operation
 */
export function startDrag(
  state: DragState,
  point: Point,
  annotationId: string | null = null
): void {
  state.isDragging = true;
  state.startPoint = { ...point };
  state.currentPoint = { ...point };
  state.annotationId = annotationId;
}

/**
 * Update current point during drag
 */
export function updateDragPoint(state: DragState, point: Point): void {
  state.currentPoint = { ...point };
}

/**
 * End dragging operation
 */
export function endDrag(state: DragState): void {
  state.isDragging = false;
  state.annotationId = null;
  state.isResizing = false;
  state.resizeHandle = null;
}

/**
 * Calculate delta from start point
 */
export function getDragDelta(state: DragState, currentPoint: Point): { dx: number; dy: number } {
  return {
    dx: currentPoint.x - state.startPoint.x,
    dy: currentPoint.y - state.startPoint.y,
  };
}

/**
 * Update start point after move (for continuous dragging)
 */
export function updateDragStartPoint(state: DragState, point: Point): void {
  state.startPoint = { ...point };
}

// ============================================
// Text Editing
// ============================================

/**
 * Start text editing for an annotation
 */
export function startTextEdit(
  state: TextEditState,
  annotation: Annotation,
  canvasContainer: HTMLElement | null | undefined,
  onFinish: (text: string) => void,
  onCancel: () => void
): void {
  if (annotation.type !== 'text') return;

  state.annotationId = annotation.id;

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

  if (canvasContainer) {
    canvasContainer.appendChild(input);
    input.focus();
    input.select();
  }

  state.input = input;

  const finishEdit = () => {
    onFinish(input.value || 'Text');
  };

  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      finishEdit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  });
}

/**
 * Finish text editing
 */
export function finishTextEdit(state: TextEditState): void {
  if (state.input) {
    state.input.remove();
  }
  state.annotationId = null;
  state.input = null;
}

/**
 * Check if currently editing text
 */
export function isEditingText(state: TextEditState): boolean {
  return state.annotationId !== null;
}

/**
 * Get the text input value
 */
export function getTextInputValue(state: TextEditState): string {
  return state.input?.value || '';
}

/**
 * Update annotation text from input
 */
export function updateAnnotationText(annotation: Annotation, state: TextEditState): void {
  if (state.input) {
    annotation.text = state.input.value || 'Text';
    annotation.width = Math.max(100, state.input.value.length * 8);
  }
}
