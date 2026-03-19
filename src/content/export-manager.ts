/**
 * Export Manager Module
 *
 * Provides comprehensive export and sharing functionality:
 * - Export inspection results as JSON
 * - Export as formatted PDF (HTML-based)
 * - Capture screenshots with annotations
 * - Generate shareable links
 */

import type { MemoryInfo, PerformanceMetrics } from '../types';
import { formatBytes, generateId } from '../utils/index.js';

// ============================================
// Type Definitions
// ============================================

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

// ============================================
// Error Classes
// ============================================

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

// ============================================
// Export Manager Class
// ============================================

export class ExportManager {
  private static instance: ExportManager | null = null;
  private version = '1.0.0';
  private capturedElements: ElementData[] = [];

  /** Get singleton instance */
  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  /** Reset singleton instance (for testing) */
  static resetInstance(): void {
    ExportManager.instance = null;
  }

  // ============================================
  // Core Export Methods
  // ============================================

  /**
   * Export data as JSON file
   * @param data - Data to export
   * @param filename - Optional custom filename
   */
  exportAsJSON(data: object, filename?: string): void {
    try {
      const finalFilename = this.generateFilename(filename, 'json');
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      this.downloadBlob(blob, finalFilename);
    } catch (error) {
      this.handleError('Failed to export JSON', error);
    }
  }

  /**
   * Export data as PDF (HTML-based printable document)
   * @param data - Data to export
   * @param options - PDF generation options
   */
  exportAsPDF(data: object, options?: Partial<PDFOptions>): void {
    try {
      const finalOptions: PDFOptions = {
        title: options?.title ?? 'Frontend Dev Helper Report',
        subtitle: options?.subtitle,
        includeHeader: options?.includeHeader ?? true,
        includeFooter: options?.includeFooter ?? true,
        theme: options?.theme ?? 'light',
        pageSize: options?.pageSize ?? 'a4',
      };

      const html = this.generatePDFHtml(data, finalOptions);
      const blob = new Blob([html], { type: 'text/html' });
      const filename = this.generateFilename(options?.title, 'html');

      this.downloadBlob(blob, filename);
    } catch (error) {
      this.handleError('Failed to export PDF', error);
    }
  }

  /**
   * Export data as Markdown
   * @param data - Data to export
   * @param filename - Optional custom filename
   */
  exportAsMarkdown(data: object, filename?: string): void {
    try {
      const markdown = this.generateMarkdown(data);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const finalFilename = this.generateFilename(filename, 'md');

      this.downloadBlob(blob, finalFilename);
    } catch (error) {
      this.handleError('Failed to export Markdown', error);
    }
  }

  // ============================================
  // Screenshot Methods
  // ============================================

  /**
   * Capture screenshot of the current view
   * @param options - Screenshot options
   * @returns Promise resolving to data URL
   */
  async captureScreenshot(options: ScreenshotOptions = {}): Promise<string> {
    const { format = 'png', quality = 0.9, annotations = [] } = options;

    return new Promise((resolve, reject) => {
      try {
        // Check if we're in extension context
        if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) {
          // Fallback: use html2canvas-like approach
          this.captureWithCanvas(options).then(resolve).catch(reject);
          return;
        }

        // Use Chrome extension API
        chrome.tabs.captureVisibleTab({ format, quality }, (dataUrl: string) => {
          if (chrome.runtime.lastError) {
            reject(
              new ExportError(
                chrome.runtime.lastError.message ?? 'Screenshot failed',
                'SCREENSHOT_ERROR'
              )
            );
            return;
          }

          if (annotations.length > 0) {
            this.applyAnnotations(dataUrl, annotations).then(resolve).catch(reject);
          } else {
            resolve(dataUrl);
          }
        });
      } catch (error) {
        reject(new ExportError('Failed to capture screenshot', 'SCREENSHOT_ERROR', error));
      }
    });
  }

  /**
   * Capture visible area using canvas API
   * @param options - Screenshot options
   * @returns Promise resolving to data URL
   */
  private async captureWithCanvas(options: ScreenshotOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new ExportError('Canvas context not available', 'CANVAS_ERROR'));
          return;
        }

        // Set dimensions to viewport
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Use html2canvas approach - render DOM to canvas
        this.renderDOMToCanvas(canvas, ctx)
          .then(() => {
            if (options.annotations && options.annotations.length > 0) {
              this.drawAnnotations(ctx, options.annotations);
            }
            const dataUrl = canvas.toDataURL(
              `image/${options.format ?? 'png'}`,
              options.quality ?? 0.9
            );
            resolve(dataUrl);
          })
          .catch(reject);
      } catch (error) {
        reject(new ExportError('Canvas capture failed', 'CANVAS_ERROR', error));
      }
    });
  }

  /**
   * Render DOM content to canvas
   * @param canvas - Canvas element
   * @param ctx - Canvas context
   */
  private async renderDOMToCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): Promise<void> {
    // Simplified DOM-to-canvas rendering
    // In a real implementation, this would use html2canvas or similar

    return new Promise((resolve) => {
      // Get all visible elements
      const elements = Array.from(document.body.querySelectorAll('*'));
      const _scrollX = window.scrollX;
      const _scrollY = window.scrollY;

      // Draw a simplified representation
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw visible elements as rectangles
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const x = rect.left;
          const y = rect.top;
          const width = rect.width;
          const height = rect.height;

          // Only draw if within viewport
          if (x < canvas.width && y < canvas.height && x + width > 0 && y + height > 0) {
            ctx.fillStyle =
              style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : '#ffffff';
            ctx.fillRect(x, y, width, height);

            // Draw border if present
            if (parseFloat(style.borderWidth) > 0) {
              ctx.strokeStyle = style.borderColor;
              ctx.lineWidth = parseFloat(style.borderWidth);
              ctx.strokeRect(x, y, width, height);
            }
          }
        }
      }

      resolve();
    });
  }

  /**
   * Apply annotations to screenshot
   * @param dataUrl - Original screenshot data URL
   * @param annotations - Annotations to apply
   * @returns Promise resolving to annotated data URL
   */
  private async applyAnnotations(
    dataUrl: string,
    annotations: ScreenshotAnnotation[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new ExportError('Canvas context not available', 'CANVAS_ERROR'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw annotations
        this.drawAnnotations(ctx, annotations, canvas.width / window.innerWidth);

        // Export
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        reject(new ExportError('Failed to load screenshot', 'IMAGE_LOAD_ERROR'));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Draw annotations on canvas context
   * @param ctx - Canvas context
   * @param annotations - Annotations to draw
   * @param scale - Scale factor for annotations
   */
  private drawAnnotations(
    ctx: CanvasRenderingContext2D,
    annotations: ScreenshotAnnotation[],
    scale = 1
  ): void {
    annotations.forEach((annotation) => {
      const { type, x, y, width, height, color, text, rotation } = annotation;

      ctx.save();
      ctx.scale(scale, scale);

      if (rotation) {
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-x, -y);
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;

      switch (type) {
        case 'rectangle':
          if (width && height) {
            ctx.strokeRect(x, y, width, height);
          }
          break;

        case 'circle':
          if (width && height) {
            ctx.beginPath();
            ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (width && height) {
            this.drawArrow(ctx, x, y, x + width, y + height);
          }
          break;

        case 'highlight':
          if (width && height) {
            ctx.fillStyle = `${color}33`; // 20% opacity
            ctx.fillRect(x, y, width, height);
          }
          break;

        case 'text':
          if (text) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
          }
          break;
      }

      ctx.restore();
    });
  }

  /**
   * Draw arrow on canvas
   * @param ctx - Canvas context
   * @param fromX - Start X
   * @param fromY - Start Y
   * @param toX - End X
   * @param toY - End Y
   */
  private drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    const headLength = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

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
    ctx.lineTo(toX, toY);
    ctx.fill();
  }

  // ============================================
  // Report Generation Methods
  // ============================================

  /**
   * Generate comprehensive export report
   * @param scope - What data to include
   * @returns Promise resolving to ExportReport
   */
  async generateReport(scope: ExportScope = {}): Promise<ExportReport> {
    const reportId = generateId();
    const timestamp = Date.now();

    const report: ExportReport = {
      id: reportId,
      timestamp,
      pageInfo: this.getPageInfo(),
      elements: scope.elements !== false ? this.capturedElements : [],
      performance: scope.performance !== false ? this.getPerformanceMetrics() : null,
      memory: scope.memory !== false ? this.getMemoryInfo() : null,
      techStack: await this.detectTechStack(),
      screenshot: scope.screenshot ? await this.captureScreenshot() : null,
      version: this.version,
    };

    return report;
  }

  /**
   * Add element to captured elements list
   * @param element - HTMLElement to capture
   */
  captureElement(element: HTMLElement): ElementData {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const elementData: ElementData = {
      selector: this.generateSelector(element),
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      class: element.className || null,
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top + window.scrollY),
        left: Math.round(rect.left + window.scrollX),
      },
      styles: this.extractStyles(computedStyle),
      computedStyles: this.extractComputedStyles(computedStyle),
      accessibility: this.getAccessibilityInfo(element),
      children: element.children.length,
      text: element.textContent?.trim().slice(0, 500) || null,
    };

    this.capturedElements.push(elementData);
    return elementData;
  }

  /**
   * Clear captured elements
   */
  clearCapturedElements(): void {
    this.capturedElements = [];
  }

  /**
   * Get captured elements
   */
  getCapturedElements(): ElementData[] {
    return [...this.capturedElements];
  }

  // ============================================
  // Shareable Links Methods
  // ============================================

  /**
   * Generate a shareable link for the report
   * @param report - Report to share
   * @param expiresInDays - Link expiration in days (optional)
   * @returns Share link data
   */
  async generateShareableLink(
    report: ExportReport,
    expiresInDays?: number
  ): Promise<ShareLinkData> {
    try {
      // In a real implementation, this would upload to a service
      // For now, we'll create a data URL that can be shared
      const compressedData = this.compressReport(report);
      const shareId = generateId().slice(0, 8);

      // Store in extension storage (limited by quota)
      const shareData = {
        id: shareId,
        data: compressedData,
        createdAt: Date.now(),
        expiresAt: expiresInDays ? Date.now() + expiresInDays * 86400000 : undefined,
        accessCount: 0,
      };

      // Try to store in extension storage
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [`share_${shareId}`]: shareData });
      }

      return {
        id: shareId,
        url: `https://frontend-dev-helper.app/share/${shareId}`,
        expiresAt: shareData.expiresAt,
        accessCount: 0,
      };
    } catch (error) {
      throw new ExportError('Failed to generate shareable link', 'SHARE_ERROR', error);
    }
  }

  /**
   * Copy share link to clipboard
   * @param linkData - Link data to copy
   */
  async copyShareLink(linkData: ShareLinkData): Promise<void> {
    try {
      await navigator.clipboard.writeText(linkData.url);
    } catch (_error) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = linkData.url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get current page information
   */
  private getPageInfo(): PageInfo {
    return {
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): PerformanceMetrics | null {
    if (typeof performance === 'undefined') return null;

    const timing = performance.timing;
    const _navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;

    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      resourceCount: performance.getEntriesByType('resource').length,
      totalTransferSize: this.calculateTotalTransferSize(),
    };
  }

  /**
   * Get First Paint time
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * Get First Contentful Paint time
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  /**
   * Calculate total transfer size of resources
   */
  private calculateTotalTransferSize(): number {
    return performance
      .getEntriesByType('resource')
      .reduce(
        (total, resource) => total + ((resource as PerformanceResourceTiming).transferSize || 0),
        0
      );
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): MemoryInfo | null {
    const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
    if (!memory) return null;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  /**
   * Detect tech stack
   */
  private async detectTechStack(): Promise<TechStackInfo> {
    const detected: Record<string, string | boolean> = {};
    const frameworks: string[] = [];
    const libraries: string[] = [];

    // Type for window with framework globals
    type FrameworkWindow = Window &
      typeof globalThis & {
        React?: { version?: string };
        Vue?: unknown;
        angular?: unknown;
        __VUE__?: unknown;
        Next?: unknown;
        Svelte?: unknown;
        jQuery?: unknown;
        bootstrap?: unknown;
        tailwind?: unknown;
      };

    const win = window as FrameworkWindow;

    // Check for common frameworks/libraries
    if (win.React) {
      frameworks.push('React');
      detected.react = true;
      detected.reactVersion = win.React.version ?? 'unknown';
    }
    if (win.Vue) {
      frameworks.push('Vue');
      detected.vue = true;
    }
    if (win.angular) {
      frameworks.push('Angular');
      detected.angular = true;
    }
    if (win.__VUE__) {
      frameworks.push('Vue 3');
      detected.vue3 = true;
    }
    if (win.Next) {
      frameworks.push('Next.js');
      detected.nextjs = true;
    }
    if (document.querySelector('[data-nextjs-page]')) {
      frameworks.push('Next.js');
      detected.nextjs = true;
    }
    if (win.Svelte) {
      frameworks.push('Svelte');
      detected.svelte = true;
    }
    if (win.jQuery) {
      libraries.push('jQuery');
      detected.jquery = true;
    }
    if (win.bootstrap) {
      libraries.push('Bootstrap');
      detected.bootstrap = true;
    }
    if (win.tailwind) {
      libraries.push('Tailwind CSS');
      detected.tailwind = true;
    }

    // Check meta tags
    const generator = document.querySelector('meta[name="generator"]');
    if (generator) {
      const content = generator.getAttribute('content');
      if (content) {
        detected.generator = content;
      }
    }

    return { frameworks, libraries, detected };
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const classes = Array.from(element.classList)
      .filter((c) => !c.startsWith('fdh-'))
      .join('.');

    if (classes) {
      return `${element.tagName.toLowerCase()}.${classes}`;
    }

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      const parent: HTMLElement | null = current.parentElement;

      if (parent) {
        const currentTag = current.tagName;
        const siblings = Array.from(parent.children).filter(
          (child): child is Element => child.tagName === currentTag
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  /**
   * Extract relevant styles from computed styles
   */
  private extractStyles(computedStyle: CSSStyleDeclaration): Record<string, string> {
    const relevantProperties = [
      'color',
      'backgroundColor',
      'fontSize',
      'fontFamily',
      'fontWeight',
      'lineHeight',
      'textAlign',
      'display',
      'position',
      'margin',
      'padding',
      'border',
      'borderRadius',
      'width',
      'height',
    ];

    const styles: Record<string, string> = {};
    for (const prop of relevantProperties) {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'initial' && value !== 'none') {
        styles[prop] = value;
      }
    }

    return styles;
  }

  /**
   * Extract all computed styles
   */
  private extractComputedStyles(computedStyle: CSSStyleDeclaration): Record<string, string> {
    const styles: Record<string, string> = {};
    for (let i = 0; i < computedStyle.length; i++) {
      const property = computedStyle.item(i);
      styles[property] = computedStyle.getPropertyValue(property);
    }
    return styles;
  }

  /**
   * Get accessibility information for element
   */
  private getAccessibilityInfo(element: HTMLElement): ElementData['accessibility'] {
    return {
      role: element.getAttribute('role') || this.getImplicitRole(element),
      label:
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        (element as HTMLInputElement).placeholder ||
        null,
      level: this.getHeadingLevel(element),
    };
  }

  /**
   * Get implicit ARIA role for element
   */
  private getImplicitRole(element: HTMLElement): string | null {
    const tagRoles: Record<string, string> = {
      a: 'link',
      button: 'button',
      h1: 'heading',
      h2: 'heading',
      h3: 'heading',
      h4: 'heading',
      h5: 'heading',
      h6: 'heading',
      img: 'img',
      input: 'textbox',
      nav: 'navigation',
      main: 'main',
      article: 'article',
      aside: 'complementary',
      footer: 'contentinfo',
      header: 'banner',
    };

    return tagRoles[element.tagName.toLowerCase()] || null;
  }

  /**
   * Get heading level
   */
  private getHeadingLevel(element: HTMLElement): number | undefined {
    const match = element.tagName.match(/^H([1-6])$/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(base?: string, extension: string = 'json'): string {
    const name = base || 'frontend-dev-helper-export';
    const date = new Date().toISOString().split('T')[0];
    return `${name}-${date}.${extension}`;
  }

  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Generate PDF HTML template
   */
  private generatePDFHtml(data: object, options: PDFOptions): string {
    const { title, subtitle, includeHeader, includeFooter, theme } = options;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#f3f4f6' : '#1f2937';
    const borderColor = isDark ? '#374151' : '#e5e7eb';

    const formattedData = JSON.stringify(data, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    ${
      includeHeader
        ? `
    .header {
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header .subtitle { color: ${isDark ? '#9ca3af' : '#6b7280'}; font-size: 14px; }
    `
        : ''
    }
    .content { margin-bottom: 30px; }
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${borderColor};
    }
    pre {
      background: ${isDark ? '#111827' : '#f3f4f6'};
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
    }
    .meta-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .meta-item { display: flex; justify-content: space-between; }
    .meta-label { color: ${isDark ? '#9ca3af' : '#6b7280'}; }
    ${
      includeFooter
        ? `
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${borderColor};
      font-size: 12px;
      color: ${isDark ? '#9ca3af' : '#6b7280'};
      text-align: center;
    }
    `
        : ''
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
    @page { margin: 20mm; }
  </style>
</head>
<body>
  ${
    includeHeader
      ? `
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  </div>
  `
      : ''
  }
  
  <div class="content">
    <div class="section">
      <div class="section-title">Export Data</div>
      <pre><code>${formattedData}</code></pre>
    </div>
    
    <div class="section">
      <div class="section-title">Report Metadata</div>
      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Generated:</span>
          <span>${new Date().toLocaleString()}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">URL:</span>
          <span>${window.location.href}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Page Title:</span>
          <span>${document.title}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Viewport:</span>
          <span>${window.innerWidth}×${window.innerHeight}</span>
        </div>
      </div>
    </div>
  </div>
  
  ${
    includeFooter
      ? `
  <div class="footer">
    Generated by Frontend Dev Helper Extension
  </div>
  `
      : ''
  }
  
  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    ">Print / Save as PDF</button>
  </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown from data
   */
  private generateMarkdown(data: object): string {
    const report = data as ExportReport;
    const lines: string[] = [];

    lines.push('# Frontend Dev Helper Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`**Extension Version:** ${report.version}`);
    lines.push('');

    if (report.pageInfo) {
      lines.push('## Page Information');
      lines.push('');
      lines.push(`- **URL:** ${report.pageInfo.url}`);
      lines.push(`- **Title:** ${report.pageInfo.title}`);
      lines.push(
        `- **Viewport:** ${report.pageInfo.viewport.width}×${report.pageInfo.viewport.height}`
      );
      lines.push('');
    }

    if (report.techStack?.frameworks?.length) {
      lines.push('## Detected Frameworks');
      lines.push('');
      for (const framework of report.techStack.frameworks) {
        lines.push(`- ${framework}`);
      }
      lines.push('');
    }

    if (report.elements?.length) {
      lines.push('## Inspected Elements');
      lines.push('');
      for (const element of report.elements.slice(0, 10)) {
        lines.push(`### ${element.tag}${element.id ? `#${element.id}` : ''}`);
        lines.push('');
        lines.push(`- **Selector:** \`${element.selector}\``);
        lines.push(`- **Dimensions:** ${element.dimensions.width}×${element.dimensions.height}`);
        lines.push(`- **Children:** ${element.children}`);
        lines.push('');
      }
    }

    if (report.performance) {
      lines.push('## Performance Metrics');
      lines.push('');
      lines.push(`- **Load Time:** ${report.performance.loadTime}ms`);
      lines.push(`- **DOM Content Loaded:** ${report.performance.domContentLoaded}ms`);
      lines.push(`- **First Paint:** ${report.performance.firstPaint.toFixed(2)}ms`);
      lines.push(
        `- **First Contentful Paint:** ${report.performance.firstContentfulPaint.toFixed(2)}ms`
      );
      lines.push(`- **Resource Count:** ${report.performance.resourceCount}`);
      lines.push('');
    }

    if (report.memory) {
      lines.push('## Memory Usage');
      lines.push('');
      lines.push(`- **Used JS Heap:** ${formatBytes(report.memory.usedJSHeapSize)}`);
      lines.push(`- **Total JS Heap:** ${formatBytes(report.memory.totalJSHeapSize)}`);
      lines.push(`- **Heap Size Limit:** ${formatBytes(report.memory.jsHeapSizeLimit)}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by Frontend Dev Helper Browser Extension*');

    return lines.join('\n');
  }

  /**
   * Compress report for sharing
   */
  private compressReport(report: ExportReport): string {
    // Simple compression - convert to base64 JSON
    // In production, use proper compression library
    const json = JSON.stringify(report);
    return btoa(json);
  }

  /**
   * Handle errors
   */
  private handleError(message: string, error: unknown): never {
    console.error(`[ExportManager] ${message}:`, error);
    throw new ExportError(message, 'EXPORT_ERROR', error instanceof Error ? error.message : error);
  }
}

// ============================================
// Utility Functions
// ============================================

// ============================================
// Default Export
// ============================================

export default ExportManager;

// Create singleton instance
export const exportManager = ExportManager.getInstance();
