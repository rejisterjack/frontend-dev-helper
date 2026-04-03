/**
 * Visual Regression Capture
 *
 * Screenshot capture logic for the visual regression module.
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import type { CaptureResponse, Html2CanvasOptions } from './types';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `vr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load an image from a source URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * html2canvas - Simplified version for screenshots
 */
export async function html2canvas(
  element: HTMLElement,
  options: Html2CanvasOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(options.width * options.scale);
  canvas.height = Math.floor(options.height * options.scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.scale(options.scale, options.scale);

  // Try to use native capture if available (Chrome extension API)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'CAPTURE_TAB',
        area: {
          x: Math.floor(options.x),
          y: Math.floor(options.y),
          width: Math.floor(options.width),
          height: Math.floor(options.height),
          scale: options.scale,
        },
      })) as CaptureResponse | undefined;

      if (response?.dataUrl) {
        const img = await loadImage(response.dataUrl);
        ctx.drawImage(img, 0, 0, options.width, options.height);
        return canvas;
      }
    } catch {
      // Fall back to DOM-based capture
    }
  }

  // DOM-based capture (simplified)
  ctx.fillStyle = getComputedStyle(element).backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, options.width, options.height);

  const promises: Promise<void>[] = [];

  walkElementsEfficiently(
    element,
    (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const htmlEl = el as HTMLElement;
        const computed = getComputedStyle(htmlEl);

        if (computed.display === 'none' || computed.visibility === 'hidden') {
          return;
        }

        if (
          rect.right > options.x &&
          rect.bottom > options.y &&
          rect.left < options.x + options.width &&
          rect.top < options.y + options.height
        ) {
          const drawX = rect.left - options.x;
          const drawY = rect.top - options.y;

          if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            ctx.fillStyle = computed.backgroundColor;
            ctx.fillRect(drawX, drawY, rect.width, rect.height);
          }

          if (el.tagName === 'IMG') {
            const img = el as HTMLImageElement;
            if (img.complete) {
              promises.push(
                new Promise<void>((resolve) => {
                  ctx.drawImage(img, drawX, drawY, rect.width, rect.height);
                  resolve();
                })
              );
            }
          }

          if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
            const text = el.textContent || '';
            if (text.trim()) {
              ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
              ctx.fillStyle = computed.color;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(
                text,
                drawX + Number.parseInt(computed.paddingLeft || '0', 10),
                drawY + Number.parseInt(computed.paddingTop || '0', 10)
              );
            }
          }
        }
      }
    },
    (msg) => logger.log(msg)
  );

  await Promise.all(promises);
  return canvas;
}

/**
 * Capture a screenshot of the current viewport
 */
export async function captureViewportScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Capture a full page screenshot
 */
export async function captureFullPageScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.documentElement, {
    x: 0,
    y: 0,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    scale: window.devicePixelRatio,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}
