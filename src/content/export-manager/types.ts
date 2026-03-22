/**
 * Export Manager Types
 *
 * Type definitions for the export manager module
 */

import type { MemoryInfo, PerformanceMetrics } from '../../types';

/** Export format options */
export type ExportFormat = 'json' | 'pdf' | 'html' | 'markdown';

/** Export scope - what data to include */
export interface ExportScope {
  /** Include element information */
  elements?: boolean;
  /** Include computed styles */
  styles?: boolean;
  /** Include performance metrics */
  performance?: boolean;
  /** Include memory info */
  memory?: boolean;
  /** Include screenshot */
  screenshot?: boolean;
  /** Include page metadata */
  pageInfo?: boolean;
}

/** Annotation for screenshots */
export interface ScreenshotAnnotation {
  id: string;
  type: 'arrow' | 'rectangle' | 'circle' | 'text' | 'highlight';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  text?: string;
  rotation?: number;
}

/** Export options configuration */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** What data to include */
  scope: ExportScope;
  /** Filename (without extension) */
  filename?: string;
  /** Screenshot annotations */
  annotations?: ScreenshotAnnotation[];
  /** Whether to include timestamp in filename */
  includeTimestamp?: boolean;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Page information */
export interface PageInfo {
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  timestamp: number;
}

/** Element data with styles */
export interface ElementData {
  selector: string;
  tag: string;
  id: string | null;
  class: string | null;
  dimensions: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: Record<string, string>;
  computedStyles: Record<string, string>;
  accessibility: {
    role: string | null;
    label: string | null;
    level?: number;
  };
  children: number;
  text: string | null;
}

/** Tech stack information */
export interface TechStackInfo {
  frameworks: string[];
  libraries: string[];
  detected: Record<string, string | boolean>;
}

/** Comprehensive export report */
export interface ExportReport {
  /** Unique report ID */
  id: string;
  /** Report generation timestamp */
  timestamp: number;
  /** Page information */
  pageInfo: PageInfo;
  /** Inspected elements data */
  elements: ElementData[];
  /** Performance metrics */
  performance: PerformanceMetrics | null;
  /** Memory information */
  memory: MemoryInfo | null;
  /** Tech stack detection results */
  techStack: TechStackInfo;
  /** Screenshot data URL (if captured) */
  screenshot: string | null;
  /** Extension version */
  version: string;
}

/** Screenshot options */
export interface ScreenshotOptions {
  /** Capture full page or visible area */
  fullPage?: boolean;
  /** Image format */
  format?: 'png' | 'jpeg';
  /** Image quality (0-1 for jpeg) */
  quality?: number;
  /** Annotations to overlay */
  annotations?: ScreenshotAnnotation[];
}

/** Share link data */
export interface ShareLinkData {
  id: string;
  url: string;
  expiresAt?: number;
  accessCount: number;
}

/** Export result */
export interface ExportResult {
  success: boolean;
  filename?: string;
  dataUrl?: string;
  size?: number;
  error?: string;
  report?: ExportReport;
}

/** PDF generation options */
export interface PDFOptions {
  title: string;
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  theme?: 'light' | 'dark';
  pageSize?: 'a4' | 'letter' | 'legal';
}

/** Error class for export operations */
export class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ExportError';
  }
}
