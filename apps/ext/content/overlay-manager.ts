import { CanvasOverlay } from './canvas-overlay';

const CONTAINER_ID = 'fdh-overlay-container';
const SHADOW_HOST_ID = 'fdh-shadow-host';

let container: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let canvasOverlay: CanvasOverlay | null = null;

export function getOverlayContainer(): { container: HTMLDivElement; shadow: ShadowRoot } {
  if (container && shadowRoot) {
    return { container, shadow: shadowRoot };
  }

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483640;
  `;

  shadowRoot = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, -apple-system, sans-serif;
    }
    * {
      box-sizing: border-box;
    }
  `;
  shadowRoot.appendChild(style);

  document.documentElement.appendChild(container);
  return { container, shadow: shadowRoot };
}

export function addOverlayElement(el: HTMLElement): void {
  const { shadow } = getOverlayContainer();
  el.style.pointerEvents = 'none';
  shadow.appendChild(el);
}

export function removeOverlayElement(el: HTMLElement): void {
  el.remove();
}

export function clearAllOverlays(): void {
  if (shadowRoot) {
    const style = shadowRoot.querySelector('style');
    while (shadowRoot.childNodes.length > 1) {
      shadowRoot.removeChild(shadowRoot.lastChild!);
    }
  }
}

export function createHighlightBox(rect: DOMRect, color: string, label?: string): HTMLDivElement {
  const box = document.createElement('div');
  box.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid ${color};
    background: ${color}15;
    pointer-events: none;
    z-index: 2147483641;
  `;

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      padding: 1px 4px;
      background: ${color};
      color: white;
      font-size: 10px;
      line-height: 16px;
      border-radius: 2px;
      white-space: nowrap;
      pointer-events: none;
    `;
    labelEl.textContent = label;
    box.appendChild(labelEl);
  }

  return box;
}

export function destroyOverlayContainer(): void {
  if (canvasOverlay) {
    canvasOverlay.destroy();
    canvasOverlay = null;
  }
  if (container) {
    container.remove();
    container = null;
    shadowRoot = null;
  }
}

export function getCanvasOverlay(): CanvasOverlay | null {
  return canvasOverlay;
}

export function initCanvasOverlay(): CanvasOverlay {
  if (canvasOverlay) return canvasOverlay;
  const { shadow } = getOverlayContainer();
  canvasOverlay = new CanvasOverlay(shadow);
  return canvasOverlay;
}

export function destroyCanvasOverlay(): void {
  if (canvasOverlay) {
    canvasOverlay.destroy();
    canvasOverlay = null;
  }
}
