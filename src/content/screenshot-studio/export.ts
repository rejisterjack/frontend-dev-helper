/**
 * Export/Download Functionality
 */

import { logger } from '@/utils/logger';
import { convertToFormat, dataUrlToBlob, getAnnotatedImage } from './capture';
import type { ExportFormat } from './types';

/**
 * Copy screenshot to clipboard
 */
export async function copyToClipboard(
  canvas: HTMLCanvasElement | null,
  showNotification: (message: string, type?: 'success' | 'error') => void
): Promise<void> {
  try {
    const dataUrl = getAnnotatedImage(canvas, 'png');
    const blob = await dataUrlToBlob(dataUrl);

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    showNotification('Screenshot copied to clipboard!');
  } catch (error) {
    logger.error('[ScreenshotStudio] Failed to copy:', error);
    showNotification('Failed to copy to clipboard', 'error');
  }
}

/**
 * Download screenshot as file
 */
export function download(
  canvas: HTMLCanvasElement | null,
  format: ExportFormat,
  showNotification: (message: string, type?: 'success' | 'error') => void
): void {
  const dataUrl = getAnnotatedImage(canvas, format);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${timestamp}.${format}`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification(`Screenshot downloaded as ${format.toUpperCase()}!`);
}

/**
 * Export options interface
 */
export interface ExportOptions {
  format?: ExportFormat;
  quality?: number;
  filename?: string;
}

/**
 * Export screenshot with options
 */
export async function exportScreenshot(
  canvas: HTMLCanvasElement | null,
  options: ExportOptions = {}
): Promise<string> {
  const { format = 'png', quality = 0.92 } = options;

  if (format === 'jpeg') {
    const dataUrl = getAnnotatedImage(canvas, 'png');
    return convertToFormat(dataUrl, format, quality);
  }

  return getAnnotatedImage(canvas, format);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `screenshot-${timestamp}.${format}`;
}
