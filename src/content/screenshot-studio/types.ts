/**
 * Screenshot Studio Types
 */

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
export interface Point {
  x: number;
  y: number;
}

/** Drag operation state */
export interface DragState {
  isDragging: boolean;
  annotationId: string | null;
  startPoint: Point;
  currentPoint: Point;
  isResizing: boolean;
  resizeHandle: string | null;
}

/** Text editing state */
export interface TextEditState {
  annotationId: string | null;
  input: HTMLInputElement | null;
}
