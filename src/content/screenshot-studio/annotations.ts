/**
 * Annotation Creation, Manipulation, and Rendering
 */

import { BLUR_RADIUS, HANDLE_SIZE, STROKE_WIDTH } from './constants';
import type { Annotation, AnnotationTool, Point } from './types';

/**
 * Generate a unique ID for annotations
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new annotation
 */
export function createAnnotation(
  type: AnnotationTool,
  startPoint: Point,
  currentPoint: Point,
  color: string
): Annotation | null {
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);

  if (width < 5 && height < 5) return null; // Too small

  return {
    id: generateId(),
    type,
    x: Math.min(startPoint.x, currentPoint.x),
    y: Math.min(startPoint.y, currentPoint.y),
    width,
    height,
    color,
    strokeWidth: STROKE_WIDTH,
    rotation: 0,
    createdAt: Date.now(),
  };
}

/**
 * Create a text annotation
 */
export function createTextAnnotation(x: number, y: number, color: string): Annotation {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 100,
    height: 30,
    color,
    text: 'Double-click to edit',
    strokeWidth: STROKE_WIDTH,
    rotation: 0,
    createdAt: Date.now(),
  };
}

/**
 * Find annotation at a specific point
 */
export function getAnnotationAt(
  x: number,
  y: number,
  annotations: Annotation[]
): Annotation | null {
  // Check in reverse order (top to bottom)
  for (let i = annotations.length - 1; i >= 0; i--) {
    const annotation = annotations[i];
    if (isPointInAnnotation(x, y, annotation)) {
      return annotation;
    }
  }
  return null;
}

/**
 * Check if a point is within an annotation
 */
export function isPointInAnnotation(x: number, y: number, annotation: Annotation): boolean {
  const padding = 5;
  return (
    x >= annotation.x - padding &&
    x <= annotation.x + annotation.width + padding &&
    y >= annotation.y - padding &&
    y <= annotation.y + annotation.height + padding
  );
}

/**
 * Move an annotation by delta
 */
export function moveAnnotation(annotation: Annotation, dx: number, dy: number): void {
  annotation.x += dx;
  annotation.y += dy;
}

/**
 * Delete an annotation by ID
 */
export function deleteAnnotation(annotations: Annotation[], id: string): Annotation[] {
  return annotations.filter((a) => a.id !== id);
}

// ============================================
// Canvas Rendering
// ============================================

/**
 * Resize canvas to fit image with scaling
 */
export function resizeCanvas(canvas: HTMLCanvasElement, previewImage: HTMLImageElement): void {
  const container = canvas.parentElement;
  if (!container) return;

  const maxWidth = container.clientWidth;
  const maxHeight = window.innerHeight * 0.85;

  const scale = Math.min(maxWidth / previewImage.width, maxHeight / previewImage.height, 1);

  canvas.width = previewImage.width;
  canvas.height = previewImage.height;
  canvas.style.width = `${previewImage.width * scale}px`;
  canvas.style.height = `${previewImage.height * scale}px`;
}

/**
 * Render all annotations to canvas
 */
export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  previewImage: HTMLImageElement,
  annotations: Annotation[]
): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw screenshot
  ctx.drawImage(previewImage, 0, 0);

  // Draw annotations
  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation);
  }
}

/**
 * Draw a single annotation
 */
export function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  ctx.save();
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = annotation.strokeWidth;

  switch (annotation.type) {
    case 'rectangle':
      drawRectangle(ctx, annotation);
      break;
    case 'circle':
      drawCircle(ctx, annotation);
      break;
    case 'arrow':
      drawArrow(ctx, annotation);
      break;
    case 'text':
      drawText(ctx, annotation);
      break;
    case 'blur':
      drawBlur(ctx, annotation);
      break;
  }

  ctx.restore();
}

/**
 * Draw rectangle annotation
 */
function drawRectangle(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
}

/**
 * Draw circle annotation
 */
function drawCircle(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  ctx.beginPath();
  ctx.ellipse(
    annotation.x + annotation.width / 2,
    annotation.y + annotation.height / 2,
    annotation.width / 2,
    annotation.height / 2,
    0,
    0,
    2 * Math.PI
  );
  ctx.stroke();
}

/**
 * Draw arrow annotation
 */
function drawArrow(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  const fromX = annotation.x;
  const fromY = annotation.y;
  const toX = annotation.x + annotation.width;
  const toY = annotation.y + annotation.height;

  const headLength = 15;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw text annotation
 */
function drawText(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillStyle = annotation.color;
  ctx.textBaseline = 'top';

  const text = annotation.text || 'Text';
  const padding = 6;

  // Draw background
  const metrics = ctx.measureText(text);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(
    annotation.x - padding,
    annotation.y - padding,
    metrics.width + padding * 2,
    24 + padding * 2
  );

  // Draw text
  ctx.fillStyle = annotation.color;
  ctx.fillText(text, annotation.x, annotation.y);
}

/**
 * Draw blur annotation
 */
function drawBlur(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  // Save the area to blur
  const imageData = ctx.getImageData(
    annotation.x,
    annotation.y,
    annotation.width,
    annotation.height
  );

  // Apply simple box blur
  const blurredData = applyBlur(imageData, BLUR_RADIUS);
  ctx.putImageData(blurredData, annotation.x, annotation.y);

  // Draw border to indicate blurred area
  ctx.strokeStyle = annotation.color;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
  ctx.setLineDash([]);
}

/**
 * Apply box blur to image data
 */
function applyBlur(imageData: ImageData, radius: number): ImageData {
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

/**
 * Draw a preview annotation (while dragging)
 */
export function drawPreview(
  ctx: CanvasRenderingContext2D,
  tool: AnnotationTool,
  startPoint: Point,
  currentPoint: Point,
  color: string
): void {
  if (tool === 'text') return;

  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);

  if (width < 2 && height < 2) return;

  const previewAnnotation: Annotation = {
    id: 'preview',
    type: tool,
    x: Math.min(startPoint.x, currentPoint.x),
    y: Math.min(startPoint.y, currentPoint.y),
    width,
    height,
    color,
    strokeWidth: STROKE_WIDTH,
    rotation: 0,
    createdAt: Date.now(),
  };

  ctx.save();
  ctx.globalAlpha = 0.7;
  drawAnnotation(ctx, previewAnnotation);
  ctx.restore();
}

// ============================================
// Selection Box
// ============================================

/**
 * Update selection box position
 */
export function updateSelectionBox(
  selectionBox: HTMLElement,
  resizeHandles: HTMLElement[],
  annotation: Annotation | null
): void {
  if (!annotation) {
    hideSelectionBox(selectionBox, resizeHandles);
    return;
  }

  selectionBox.style.display = 'block';
  selectionBox.style.left = `${annotation.x - 4}px`;
  selectionBox.style.top = `${annotation.y - 4}px`;
  selectionBox.style.width = `${annotation.width + 8}px`;
  selectionBox.style.height = `${annotation.height + 8}px`;

  // Position resize handles
  positionResizeHandles(resizeHandles);
}

/**
 * Hide selection box
 */
export function hideSelectionBox(selectionBox: HTMLElement, resizeHandles: HTMLElement[]): void {
  selectionBox.style.display = 'none';
  for (const handle of resizeHandles) {
    handle.style.display = 'none';
  }
}

/**
 * Position resize handles around selection box
 */
function positionResizeHandles(resizeHandles: HTMLElement[]): void {
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

  for (const handle of resizeHandles) {
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
