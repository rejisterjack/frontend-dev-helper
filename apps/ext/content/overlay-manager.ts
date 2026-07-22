import { CanvasOverlay } from "./canvas-overlay";

const CONTAINER_ID = "fdh-overlay-container";
const _SHADOW_HOST_ID = "fdh-shadow-host";

let container: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let canvasOverlay: CanvasOverlay | null = null;

export function getOverlayContainer(): {
  container: HTMLDivElement;
  shadow: ShadowRoot;
} {
  if (container && shadowRoot) {
    return { container, shadow: shadowRoot };
  }

  container = document.createElement("div");
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

  shadowRoot = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
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
  // Only default to pointer-events:none if the caller hasn't explicitly opted
  // into interactivity (e.g. a panel with clickable buttons). Setting this
  // unconditionally used to silently overwrite cssText-authored
  // `pointer-events:auto`, leaving close buttons dead across ~11 tools.
  if (el.style.pointerEvents === "") {
    el.style.pointerEvents = "none";
  }
  shadow.appendChild(el);
}

export function removeOverlayElement(el: HTMLElement): void {
  el.remove();
}

/**
 * Tracks a set of overlays that need to follow host-page elements across
 * scroll and resize. Multiple tools register their reposition callbacks here
 * so we can debounce onto a single rAF-coalesced passive listener pair,
 * instead of every tool registering its own scroll handler.
 *
 * Usage:
 *   const detach = attachViewportTracker(() => {
 *     box.style.top = `${target.getBoundingClientRect().top}px`;
 *   });
 *   // ... in cleanup: detach();
 */
type Tracker = () => void;
const viewportTrackers = new Set<Tracker>();
let viewportListenersBound = false;
let pendingRaf = 0;

function runTrackers(): void {
  if (pendingRaf) return;
  pendingRaf = requestAnimationFrame(() => {
    pendingRaf = 0;
    for (const t of viewportTrackers) {
      try {
        t();
      } catch {
        // A single broken tracker must not poison the rest.
      }
    }
  });
}

export function attachViewportTracker(tracker: Tracker): () => void {
  viewportTrackers.add(tracker);
  if (!viewportListenersBound) {
    window.addEventListener("scroll", runTrackers, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", runTrackers, { passive: true });
    viewportListenersBound = true;
  }
  // Run once immediately so the overlay is correctly positioned before the
  // first user interaction.
  tracker();
  return () => {
    viewportTrackers.delete(tracker);
    if (viewportTrackers.size === 0 && viewportListenersBound) {
      window.removeEventListener("scroll", runTrackers, { capture: true });
      window.removeEventListener("resize", runTrackers);
      viewportListenersBound = false;
    }
  };
}

export function clearAllOverlays(): void {
  if (shadowRoot) {
    const _style = shadowRoot.querySelector("style");
    while (shadowRoot.childNodes.length > 1) {
      shadowRoot.removeChild(shadowRoot.lastChild!);
    }
  }
}

export function createHighlightBox(
  rect: DOMRect,
  color: string,
  label?: string,
): HTMLDivElement {
  const box = document.createElement("div");
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
    const labelEl = document.createElement("div");
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
