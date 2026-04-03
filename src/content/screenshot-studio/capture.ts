/**
 * Screenshot Capture Logic
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import { STORAGE_KEY } from './constants';
import type { ExportFormat } from './types';

/**
 * Capture a screenshot using chrome.tabs.captureVisibleTab or canvas fallback
 */
export async function captureScreenshot(fullPage: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if we're in extension context and can use chrome.tabs API
    if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
      chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl: string) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (fullPage) {
          captureFullPage(dataUrl).then(resolve).catch(reject);
        } else {
          resolve(dataUrl);
        }
      });
    } else {
      // Fallback: capture using canvas
      captureWithCanvas(fullPage).then(resolve).catch(reject);
    }
  });
}

/**
 * Capture full page by stitching screenshots together
 */
export async function captureFullPage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
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

/**
 * Capture screenshot using canvas (fallback method)
 */
export async function captureWithCanvas(fullPage: boolean): Promise<string> {
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
    renderDOMToCanvas(canvas, ctx, fullPage)
      .then(() => resolve(canvas.toDataURL('image/png')))
      .catch(reject);
  });
}

/**
 * Render DOM elements to canvas
 */
async function renderDOMToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fullPage: boolean
): Promise<void> {
  return new Promise((resolve) => {
    const offsetX = fullPage ? 0 : -window.scrollX;
    const offsetY = fullPage ? 0 : -window.scrollY;

    walkElementsEfficiently(
      document.body,
      (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const x = rect.left + offsetX + window.scrollX;
          const y = rect.top + offsetY + window.scrollY;
          const width = rect.width;
          const height = rect.height;

          if (x < canvas.width && y < canvas.height && x + width > 0 && y + height > 0) {
            const bgColor = style.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              ctx.fillStyle = bgColor;
              ctx.fillRect(x, y, width, height);
            }

            const borderWidth = parseFloat(style.borderWidth);
            if (borderWidth > 0) {
              ctx.strokeStyle = style.borderColor;
              ctx.lineWidth = borderWidth;
              ctx.strokeRect(x, y, width, height);
            }
          }
        }
      },
      (msg) => logger.log(msg)
    );

    resolve();
  });
}

/**
 * Convert image data URL to Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
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

/**
 * Convert image to different format
 */
export async function convertToFormat(
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

/**
 * Get annotated image as data URL
 */
export function getAnnotatedImage(
  canvas: HTMLCanvasElement | null,
  format: ExportFormat = 'png'
): string {
  if (!canvas) return '';

  if (format === 'jpeg') {
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Load screenshot image from data URL
 */
export async function loadScreenshotImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load screenshot'));
    img.src = dataUrl;
  });
}

/**
 * Save state to chrome.storage.local
 */
export async function saveStateToStorage(state: {
  annotations: unknown[];
  screenshotDataUrl: string | null;
  currentTool: string;
  currentColor: string;
}): Promise<void> {
  try {
    const stateToSave = {
      ...state,
      timestamp: Date.now(),
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: stateToSave });
    logger.log('[ScreenshotStudio] State saved to storage');
  } catch (error) {
    logger.error('[ScreenshotStudio] Failed to save state:', error);
  }
}

/**
 * Restore state from chrome.storage.local
 */
export async function restoreStateFromStorage(): Promise<{
  annotations: unknown[];
  screenshotDataUrl: string | null;
  currentTool: string;
  currentColor: string;
} | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const savedState = result[STORAGE_KEY];

    if (!savedState) {
      return null;
    }

    // Check if state is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - savedState.timestamp > maxAge) {
      logger.log('[ScreenshotStudio] Saved state expired, clearing');
      await chrome.storage.local.remove(STORAGE_KEY);
      return null;
    }

    logger.log('[ScreenshotStudio] State restored from storage');
    return savedState;
  } catch (error) {
    logger.error('[ScreenshotStudio] Failed to restore state:', error);
    return null;
  }
}

/**
 * Clear saved state from storage
 */
export async function clearSavedState(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
    logger.log('[ScreenshotStudio] Saved state cleared');
  } catch (error) {
    logger.error('[ScreenshotStudio] Failed to clear saved state:', error);
  }
}
