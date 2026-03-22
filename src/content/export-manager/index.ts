/**
 * Export Manager Module
 *
 * Provides comprehensive export and sharing functionality:
 * - Export inspection results as JSON
 * - Export as formatted PDF (HTML-based)
 * - Capture screenshots with annotations
 * - Generate shareable links
 */

import { logger } from '@/utils/logger';
import { formatBytes, generateId } from '../../utils/index.js';
import {
  DEFAULT_FILENAME_BASE,
  DEFAULT_PDF_OPTIONS,
  EXTENSION_VERSION,
  RELEVANT_STYLE_PROPERTIES,
  TAG_IMPLICIT_ROLES,
} from './constants';
import { exportReportAsCSV } from './exporters/csv';
import { generatePDFHtml } from './exporters/html';
import { compressData, exportAsJSON } from './exporters/json';
import type {
  ElementData,
  ExportReport,
  ExportScope,
  PageInfo,
  PDFOptions,
  ScreenshotOptions,
  ShareLinkData,
  TechStackInfo,
} from './types';
import { ExportError } from './types';

export * from './constants';
export * from './exporters';
// Re-export all types
export * from './types';
export * from './ui';

/**
 * Export Manager Class
 */
export class ExportManager {
  private static instance: ExportManager | null = null;
  private version = EXTENSION_VERSION;
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
      const { blob } = exportAsJSON(data, filename);
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
        ...DEFAULT_PDF_OPTIONS,
        ...options,
      };

      const html = generatePDFHtml(data, finalOptions);
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

  /**
   * Export data as CSV
   * @param data - Export report
   * @param filename - Optional custom filename
   */
  exportAsCSV(data: ExportReport, filename?: string): void {
    try {
      const finalFilename = this.generateFilename(filename, 'csv');
      const { blob } = exportReportAsCSV(data, filename);
      this.downloadBlob(blob, finalFilename);
    } catch (error) {
      this.handleError('Failed to export CSV', error);
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
    annotations: import('./types').ScreenshotAnnotation[]
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
    annotations: import('./types').ScreenshotAnnotation[],
    scale = 1
  ): void {
    for (const annotation of annotations) {
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
    }
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
      const compressedData = compressData(report);
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
  private getPerformanceMetrics(): import('../../types').PerformanceMetrics | null {
    if (typeof performance === 'undefined') return null;

    const timing = performance.timing;

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
  private getMemoryInfo(): import('../../types').MemoryInfo | null {
    const memory = (performance as Performance & { memory?: import('../../types').MemoryInfo })
      .memory;
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
    const styles: Record<string, string> = {};
    for (const prop of RELEVANT_STYLE_PROPERTIES) {
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
    return TAG_IMPLICIT_ROLES[element.tagName.toLowerCase()] || null;
  }

  /**
   * Get heading level
   */
  private getHeadingLevel(element: HTMLElement): number | undefined {
    const match = element.tagName.match(/^H([1-6])$/i);
    return match ? Number.parseInt(match[1], 10) : undefined;
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(base?: string, extension = 'json'): string {
    const name = base || DEFAULT_FILENAME_BASE;
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
   * Handle errors
   */
  private handleError(message: string, error: unknown): never {
    logger.error(`[ExportManager] ${message}:`, error);
    throw new ExportError(message, 'EXPORT_ERROR', error instanceof Error ? error.message : error);
  }
}

// Default Export
export default ExportManager;

// Create singleton instance
export const exportManager = ExportManager.getInstance();
