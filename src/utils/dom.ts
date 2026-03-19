/**
 * DOM Utilities
 *
 * Helper functions for DOM manipulation, element inspection,
 * and overlay creation.
 */

/**
 * Get computed style of an element
 */
export function getElementComputedStyle(element: Element): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

/**
 * Get element dimensions including position
 */
export function getElementDimensions(element: Element): {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
} {
  const rect = element.getBoundingClientRect();
  const style = getElementComputedStyle(element);

  const parseValue = (value: string): number => {
    const num = parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  };

  return {
    width: rect.width,
    height: rect.height,
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    right: rect.right + window.scrollX,
    bottom: rect.bottom + window.scrollY,
    margin: {
      top: parseValue(style.marginTop),
      right: parseValue(style.marginRight),
      bottom: parseValue(style.marginBottom),
      left: parseValue(style.marginLeft),
    },
    padding: {
      top: parseValue(style.paddingTop),
      right: parseValue(style.paddingRight),
      bottom: parseValue(style.paddingBottom),
      left: parseValue(style.paddingLeft),
    },
    border: {
      top: parseValue(style.borderTopWidth),
      right: parseValue(style.borderRightWidth),
      bottom: parseValue(style.borderBottomWidth),
      left: parseValue(style.borderLeftWidth),
    },
  };
}

/**
 * Get element at a specific point, filtering out overlay elements
 */
export function getElementAtPoint(
  x: number,
  y: number,
  excludeSelectors: string[] = []
): Element | null {
  // Temporarily hide overlay elements
  const overlays = document.querySelectorAll('[data-fdh-overlay]');
  const originalPointers: { element: HTMLElement; value: string }[] = [];

  overlays.forEach((overlay) => {
    if (overlay instanceof HTMLElement) {
      originalPointers.push({ element: overlay, value: overlay.style.pointerEvents });
      overlay.style.pointerEvents = 'none';
    }
  });

  // Also hide excluded elements
  excludeSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el instanceof HTMLElement) {
        originalPointers.push({ element: el, value: el.style.pointerEvents });
        el.style.pointerEvents = 'none';
      }
    });
  });

  // Get element at point
  const element = document.elementFromPoint(x, y);

  // Restore pointer events
  originalPointers.forEach(({ element, value }) => {
    element.style.pointerEvents = value;
  });

  return element;
}

/**
 * Create an overlay element with standard FDH styling
 */
export function createOverlay(options: {
  id?: string;
  className?: string;
  styles?: Partial<CSSStyleDeclaration>;
  parent?: HTMLElement;
}): HTMLElement {
  const { id, className, styles = {}, parent = document.body } = options;

  const overlay = document.createElement('div');

  if (id) {
    overlay.id = id;
  }

  if (className) {
    overlay.className = className;
  }

  // Standard FDH overlay attributes
  overlay.setAttribute('data-fdh-overlay', 'true');

  // Default styles
  const defaultStyles: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
  };

  Object.assign(overlay.style, defaultStyles, styles);

  parent.appendChild(overlay);

  return overlay;
}

/**
 * Position a tooltip near a target element or point
 */
export function positionTooltip(options: {
  tooltip: HTMLElement;
  x: number;
  y: number;
  offset?: { x: number; y: number };
  bounds?: { width: number; height: number };
}): void {
  const { tooltip, x, y, offset = { x: 12, y: -12 }, bounds } = options;

  let left = x + offset.x;
  let top = y + offset.y;

  // Get viewport dimensions if bounds not provided
  const viewportWidth = bounds?.width ?? window.innerWidth;
  const viewportHeight = bounds?.height ?? window.innerHeight;

  // Get tooltip dimensions
  const tooltipRect = tooltip.getBoundingClientRect();

  // Adjust if tooltip would go off-screen
  if (left + tooltipRect.width > viewportWidth) {
    left = x - tooltipRect.width - offset.x;
  }
  if (top + tooltipRect.height > viewportHeight) {
    top = y - tooltipRect.height - offset.y;
  }
  if (left < 0) {
    left = 8;
  }
  if (top < 0) {
    top = 8;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Create a tooltip element
 */
export function createTooltip(options?: {
  content?: string;
  className?: string;
  parent?: HTMLElement;
}): HTMLElement {
  const { content = '', className = '', parent = document.body } = options ?? {};

  const tooltip = document.createElement('div');
  tooltip.className = `fdh-tooltip ${className}`;
  tooltip.setAttribute('data-fdh-overlay', 'true');
  tooltip.innerHTML = content;

  tooltip.style.cssText = `
    position: fixed;
    background: #1e293b;
    color: #f8fafc;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    pointer-events: none;
    z-index: 2147483647;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    border: 1px solid #334155;
    max-width: 300px;
    word-break: break-all;
  `;

  parent.appendChild(tooltip);

  return tooltip;
}

/**
 * Remove all FDH overlay elements
 */
export function removeAllOverlays(): void {
  document.querySelectorAll('[data-fdh-overlay]').forEach((el) => el.remove());
}

/**
 * Throttle function - limits execution to once per limit period
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Debounce function - delays execution until after wait period
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = getElementComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0'
  );
}

/**
 * Get scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x: window.scrollX || window.pageXOffset,
    y: window.scrollY || window.pageYOffset,
  };
}

/**
 * Scroll element into view with smooth behavior
 */
export function scrollIntoView(element: Element, behavior: ScrollBehavior = 'smooth'): void {
  element.scrollIntoView({ behavior, block: 'center', inline: 'center' });
}

/**
 * Generate unique ID for DOM elements
 */
export function generateDomId(prefix = 'fdh'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
