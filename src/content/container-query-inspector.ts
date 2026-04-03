/**
 * Container Query Inspector
 *
 * Visualizes CSS Container Queries:
 * - Shows container-type and container-name properties
 * - Displays container query thresholds
 * - Highlights which elements use @container rules
 * - Visual overlay showing container boundaries
 */

import { logger } from '@/utils/logger';
import { walkElementsEfficiently } from '@/utils/dom-performance';

interface ContainerInfo {
  element: HTMLElement;
  name: string | null;
  type: 'size' | 'inline-size' | 'normal';
  width: number;
  height: number;
  queries: ContainerQueryInfo[];
}

interface ContainerQueryInfo {
  condition: string;
  rule: CSSContainerRule;
}

// State
let isActive = false;
const containerOverlays: Map<HTMLElement, HTMLElement> = new Map();
let resizeObserver: ResizeObserver | null = null;

/**
 * Detect all containers on the page
 */
function detectContainers(): ContainerInfo[] {
  const containers: ContainerInfo[] = [];

  walkElementsEfficiently(
    document,
    (el) => {
    const element = el as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const containerType = computedStyle.containerType;

    if (containerType && containerType !== 'normal') {
      const rect = element.getBoundingClientRect();
      const containerName = computedStyle.containerName;
      const queries = getContainerQueriesForElement(element);

      containers.push({
        element,
        name: containerName || null,
        type: containerType as 'size' | 'inline-size' | 'normal',
        width: rect.width,
        height: rect.height,
        queries,
      });
    }
    },
    (msg) => logger.log(msg)
  );

  return containers;
}

/**
 * Get all @container rules that apply to an element
 */
function getContainerQueriesForElement(element: HTMLElement): ContainerQueryInfo[] {
  const queries: ContainerQueryInfo[] = [];
  const sheets = document.styleSheets;

  for (const sheet of sheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSContainerRule) {
          // Check if this element is a child of the container
          const containerName = rule.containerName;
          const parentContainer = findParentContainer(element, containerName);

          if (parentContainer) {
            queries.push({
              condition: rule.containerQuery,
              rule,
            });
          }
        }
      }
    } catch {
      // Cross-origin stylesheet - skip
    }
  }

  return queries;
}

/**
 * Find parent container by name
 */
function findParentContainer(element: HTMLElement, name?: string): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const computedStyle = window.getComputedStyle(current);
    const containerName = computedStyle.containerName;
    const containerType = computedStyle.containerType;

    if (containerType && containerType !== 'normal') {
      if (!name || containerName === name) {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Create overlay for a container
 */
function createContainerOverlay(info: ContainerInfo): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'fdh-cq-overlay';

  const rect = info.element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  overlay.style.cssText = `
    position: absolute;
    left: ${rect.left + scrollX}px;
    top: ${rect.top + scrollY}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px dashed #a855f7;
    background: rgba(168, 85, 247, 0.05);
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
  `;

  // Add label
  const label = document.createElement('div');
  label.className = 'fdh-cq-label';

  const nameText = info.name ? ` (${info.name})` : '';
  const typeText = info.type === 'size' ? 'size' : 'inline-size';
  const queryCount = info.queries.length;

  label.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #a855f7;
    color: white;
    padding: 4px 8px;
    font-size: 11px;
    font-family: monospace;
    border-radius: 4px 4px 0 0;
    white-space: nowrap;
    font-weight: 600;
  `;
  label.textContent = `@container${nameText} [${typeText}]${queryCount > 0 ? ` • ${queryCount} queries` : ''}`;

  overlay.appendChild(label);

  // Add dimensions label
  const dimsLabel = document.createElement('div');
  dimsLabel.style.cssText = `
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(168, 85, 247, 0.9);
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    font-family: monospace;
    border-radius: 3px;
  `;
  dimsLabel.textContent = `${Math.round(info.width)}×${Math.round(info.height)}`;
  overlay.appendChild(dimsLabel);

  // Add query info if any
  if (info.queries.length > 0) {
    const queriesPanel = document.createElement('div');
    queriesPanel.style.cssText = `
      position: absolute;
      top: 4px;
      left: 4px;
      max-width: 200px;
      background: rgba(30, 30, 46, 0.95);
      border: 1px solid #a855f7;
      border-radius: 6px;
      padding: 8px;
      font-size: 11px;
      color: #cdd6f4;
    `;

    info.queries.slice(0, 3).forEach((query) => {
      const queryItem = document.createElement('div');
      queryItem.style.cssText = `
        font-family: monospace;
        margin-bottom: 4px;
        padding: 2px 4px;
        background: rgba(168, 85, 247, 0.2);
        border-radius: 3px;
      `;
      queryItem.textContent = `@container ${query.condition}`;
      queriesPanel.appendChild(queryItem);
    });

    if (info.queries.length > 3) {
      const more = document.createElement('div');
      more.style.cssText = `
        font-size: 10px;
        color: #6c7086;
        text-align: center;
      `;
      more.textContent = `+${info.queries.length - 3} more`;
      queriesPanel.appendChild(more);
    }

    overlay.appendChild(queriesPanel);
  }

  return overlay;
}

/**
 * Update all container overlays
 */
function updateOverlays(): void {
  if (!isActive) return;

  // Remove existing overlays
  containerOverlays.forEach((overlay) => overlay.remove());
  containerOverlays.clear();

  // Detect and create new overlays
  const containers = detectContainers();

  for (const info of containers) {
    const overlay = createContainerOverlay(info);
    document.body.appendChild(overlay);
    containerOverlays.set(info.element, overlay);
  }

  logger.log(`[ContainerQueryInspector] Updated ${containers.length} container overlays`);
}

/**
 * Setup resize observer to update overlays
 */
function setupResizeObserver(): void {
  resizeObserver = new ResizeObserver(() => {
    if (isActive) {
      updateOverlays();
    }
  });

  // Observe body for layout changes
  resizeObserver.observe(document.body);
}

/**
 * Enable Container Query Inspector
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  updateOverlays();
  setupResizeObserver();

  logger.log('[ContainerQueryInspector] Enabled');
}

/**
 * Disable Container Query Inspector
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Remove all overlays
  containerOverlays.forEach((overlay) => overlay.remove());
  containerOverlays.clear();

  // Disconnect resize observer
  resizeObserver?.disconnect();
  resizeObserver = null;

  logger.log('[ContainerQueryInspector] Disabled');
}

/**
 * Toggle Container Query Inspector
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; containerCount: number } {
  return { enabled: isActive, containerCount: containerOverlays.size };
}

/**
 * Get container summary for display
 */
export function getContainerSummary(): {
  total: number;
  sizeContainers: number;
  inlineSizeContainers: number;
  namedContainers: number;
} {
  const containers = detectContainers();
  return {
    total: containers.length,
    sizeContainers: containers.filter((c) => c.type === 'size').length,
    inlineSizeContainers: containers.filter((c) => c.type === 'inline-size').length,
    namedContainers: containers.filter((c) => c.name !== null).length,
  };
}

// Default export
export default {
  enable,
  disable,
  toggle,
  getState,
  getContainerSummary,
};
