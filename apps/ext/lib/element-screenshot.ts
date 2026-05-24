// ---------------------------------------------------------------------------
// Element screenshot capture utility
// Captures a DOM element as a base64 PNG for vision model context
// ---------------------------------------------------------------------------

/**
 * Capture an element as a base64 PNG using the browser's rendering.
 * Uses a canvas-based approach: clones the element, renders to SVG, then to canvas.
 */
export async function captureElementScreenshot(
  element: HTMLElement,
  maxWidth = 512,
  maxHeight = 512,
): Promise<string | null> {
  try {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    // Scale to fit within maxWidth/maxHeight while preserving aspect ratio
    const scale = Math.min(maxWidth / rect.width, maxHeight / rect.height, 2);
    const width = Math.round(rect.width * scale);
    const height = Math.round(rect.height * scale);

    // Try using the Page Visibility API with canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw a placeholder with element info
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, width, height);

    // Try to use foreignObject SVG rendering
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            transform: scale(${scale});
            transform-origin: top left;
            width: ${rect.width}px;
            height: ${rect.height}px;
          ">
            ${serializeElement(element)}
          </div>
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: draw element outline and text info
        drawElementPlaceholder(ctx, element, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

function serializeElement(el: HTMLElement): string {
  // Basic serialization with computed styles for visual accuracy
  const clone = el.cloneNode(true) as HTMLElement;

  // Remove FDH overlay elements
  clone.querySelectorAll('[class*="fdh-"]').forEach((child) => child.remove());

  // Copy computed styles for the element
  const computed = window.getComputedStyle(el);
  clone.style.cssText = Array.from(computed).reduce((css, prop) => {
    return css + `${prop}:${computed.getPropertyValue(prop)};`;
  }, '');

  return clone.outerHTML;
}

function drawElementPlaceholder(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, width, height);

  // Draw element outline
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Draw tag name
  ctx.fillStyle = '#89b4fa';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`<${element.tagName.toLowerCase()}>`, 12, 24);

  // Draw classes
  const classes = element.className && typeof element.className === 'string'
    ? element.className.trim().split(/\s+/).slice(0, 3).join('.')
    : '';
  if (classes) {
    ctx.fillStyle = '#a6e3a1';
    ctx.font = '12px monospace';
    ctx.fillText(`.${classes}`, 12, 44);
  }

  // Draw key computed styles
  const computed = window.getComputedStyle(element);
  ctx.fillStyle = '#6c7086';
  ctx.font = '11px monospace';

  const styles = [
    `display: ${computed.display}`,
    `width: ${Math.round(element.getBoundingClientRect().width)}px`,
    `height: ${Math.round(element.getBoundingClientRect().height)}px`,
    `color: ${computed.color}`,
    `bg: ${computed.backgroundColor}`,
    `font: ${computed.fontSize} ${computed.fontWeight}`,
  ];

  styles.forEach((style, i) => {
    ctx.fillText(style, 12, 64 + i * 16);
  });

  // Draw text content preview
  const text = element.textContent?.trim().slice(0, 50) || '';
  if (text) {
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '12px sans-serif';
    ctx.fillText(`"${text}${text.length >= 50 ? '...' : ''}"`, 12, height - 16);
  }
}

/**
 * Build a multimodal message content array for an element with visual context
 */
export async function buildVisualContextMessage(
  element: HTMLElement,
  textPrompt: string,
): Promise<LLMMessage['content']> {
  const screenshot = await captureElementScreenshot(element);

  const parts: LLMMessage['content'] = [];

  // Element info
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className && typeof element.className === 'string'
    ? element.className.trim().split(/\s+/).slice(0, 5).join('.')
    : '';
  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);

  const elementInfo = [
    `Element: <${tag}>${id}${classes ? '.' + classes : ''}`,
    `Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
    `Position: ${Math.round(rect.x)},${Math.round(rect.y)}`,
    `Display: ${computed.display}, Position: ${computed.position}`,
    `Color: ${computed.color}, Background: ${computed.backgroundColor}`,
    `Font: ${computed.fontSize}/${computed.lineHeight} ${computed.fontWeight}`,
  ].join('\n');

  parts.push({ type: 'text', text: textPrompt });
  parts.push({ type: 'text', text: `\nElement context:\n${elementInfo}` });

  if (screenshot) {
    parts.push({ type: 'image_url', image_url: { url: screenshot } });
  }

  return parts;
}

// Import LLMMessage type
import type { LLMMessage } from './types';
