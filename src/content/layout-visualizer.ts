import { logger } from '../utils/logger';

/**
 * Flexbox & Grid Visualizer
 *
 * Visualize flexbox and CSS grid layouts with overlays showing
 * tracks, gaps, alignment, and item properties.
 */

interface LayoutInfo {
  type: 'flex' | 'grid';
  element: HTMLElement;
  children: HTMLElement[];
  properties: Record<string, string>;
}

// State
let isActive = false;
const overlays: Map<HTMLElement, HTMLElement> = new Map();
const highlightedContainers: Set<HTMLElement> = new Set();

// Event handlers
let mouseOverHandler: ((e: MouseEvent) => void) | null = null;
let mouseOutHandler: ((e: MouseEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

/**
 * Check if element is a flex or grid container
 */
function isLayoutContainer(element: HTMLElement): boolean {
  const display = window.getComputedStyle(element).display;
  return (
    display === 'flex' ||
    display === 'inline-flex' ||
    display === 'grid' ||
    display === 'inline-grid'
  );
}

/**
 * Get layout information for an element
 */
function getLayoutInfo(element: HTMLElement): LayoutInfo | null {
  const computed = window.getComputedStyle(element);
  const display = computed.display;

  if (!display.includes('flex') && !display.includes('grid')) {
    return null;
  }

  const type = display.includes('flex') ? 'flex' : 'grid';
  const children = Array.from(element.children).filter(
    (child) => child instanceof HTMLElement
  ) as HTMLElement[];

  // Get relevant properties
  const properties: Record<string, string> = {};

  if (type === 'flex') {
    const flexProps = [
      'flex-direction',
      'flex-wrap',
      'justify-content',
      'align-items',
      'align-content',
      'gap',
      'row-gap',
      'column-gap',
    ];
    flexProps.forEach((prop) => {
      properties[prop] = computed.getPropertyValue(prop);
    });
  } else {
    const gridProps = [
      'grid-template-columns',
      'grid-template-rows',
      'grid-template-areas',
      'grid-auto-columns',
      'grid-auto-rows',
      'grid-auto-flow',
      'justify-items',
      'align-items',
      'justify-content',
      'align-content',
      'gap',
      'row-gap',
      'column-gap',
    ];
    gridProps.forEach((prop) => {
      properties[prop] = computed.getPropertyValue(prop);
    });
  }

  return { type, element, children, properties };
}

/**
 * Create overlay for flexbox container
 */
function createFlexOverlay(info: LayoutInfo): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'fdh-layout-overlay fdh-flex-overlay';
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px dashed #8b5cf6;
    background: rgba(139, 92, 246, 0.05);
  `;

  const rect = info.element.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  // Add label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #8b5cf6;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  `;
  label.textContent = `Flex: ${info.properties['flex-direction']} | ${info.properties['justify-content']}`;
  overlay.appendChild(label);

  // Draw main axis line
  const isHorizontal = info.properties['flex-direction']?.includes('row') ?? true;
  const axisLine = document.createElement('div');
  axisLine.style.cssText = `
    position: absolute;
    ${isHorizontal ? 'top: 50%; left: 0; width: 100%; height: 2px;' : 'top: 0; left: 50%; width: 2px; height: 100%;'}
    background: rgba(139, 92, 246, 0.3);
    pointer-events: none;
  `;
  overlay.appendChild(axisLine);

  // Draw cross axis line
  const crossAxisLine = document.createElement('div');
  crossAxisLine.style.cssText = `
    position: absolute;
    ${isHorizontal ? 'top: 0; left: 50%; width: 2px; height: 100%;' : 'top: 50%; left: 0; width: 100%; height: 2px;'}
    background: rgba(236, 72, 153, 0.3);
    pointer-events: none;
  `;
  overlay.appendChild(crossAxisLine);

  // Add gap indicators
  const gap = parseInt(info.properties.gap || '0', 10);
  if (gap > 0 && info.children.length > 1) {
    info.children.forEach((child, index) => {
      if (index === info.children.length - 1) return;

      const childRect = child.getBoundingClientRect();
      const containerRect = info.element.getBoundingClientRect();

      const gapIndicator = document.createElement('div');
      gapIndicator.style.cssText = `
        position: absolute;
        background: rgba(34, 197, 94, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #22c55e;
        font-weight: 600;
      `;

      if (isHorizontal) {
        gapIndicator.style.left = `${childRect.right - containerRect.left + window.scrollX}px`;
        gapIndicator.style.top = `${childRect.top - containerRect.top + window.scrollY}px`;
        gapIndicator.style.width = `${gap}px`;
        gapIndicator.style.height = `${childRect.height}px`;
      } else {
        gapIndicator.style.left = `${childRect.left - containerRect.left + window.scrollX}px`;
        gapIndicator.style.top = `${childRect.bottom - containerRect.top + window.scrollY}px`;
        gapIndicator.style.width = `${childRect.width}px`;
        gapIndicator.style.height = `${gap}px`;
      }

      gapIndicator.textContent = `${gap}px`;
      overlay.appendChild(gapIndicator);
    });
  }

  // Highlight children with flex properties
  info.children.forEach((child, index) => {
    const childComputed = window.getComputedStyle(child);
    const flexGrow = childComputed.flexGrow;
    const flexShrink = childComputed.flexShrink;
    const alignSelf = childComputed.alignSelf;

    const childRect = child.getBoundingClientRect();
    const containerRect = info.element.getBoundingClientRect();

    const childOverlay = document.createElement('div');
    childOverlay.style.cssText = `
      position: absolute;
      left: ${childRect.left - containerRect.left + window.scrollX}px;
      top: ${childRect.top - containerRect.top + window.scrollY}px;
      width: ${childRect.width}px;
      height: ${childRect.height}px;
      border: 1px solid rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.1);
      pointer-events: none;
    `;

    // Add flex item info
    if (flexGrow !== '0' || flexShrink !== '1' || alignSelf !== 'auto') {
      const infoLabel = document.createElement('div');
      infoLabel.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        background: rgba(139, 92, 246, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 9px;
        white-space: nowrap;
      `;
      const parts: string[] = [];
      if (flexGrow !== '0') parts.push(`grow:${flexGrow}`);
      if (flexShrink !== '1') parts.push(`shrink:${flexShrink}`);
      if (alignSelf !== 'auto') parts.push(`align:${alignSelf}`);
      infoLabel.textContent = parts.join(' | ');
      childOverlay.appendChild(infoLabel);
    }

    // Add item number
    const numLabel = document.createElement('div');
    numLabel.style.cssText = `
      position: absolute;
      top: -14px;
      left: 0;
      background: rgba(139, 92, 246, 0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
    `;
    numLabel.textContent = String(index + 1);
    childOverlay.appendChild(numLabel);

    overlay.appendChild(childOverlay);
  });

  return overlay;
}

/**
 * Create overlay for grid container
 */
function createGridOverlay(info: LayoutInfo): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'fdh-layout-overlay fdh-grid-overlay';
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px dashed #ec4899;
    background: rgba(236, 72, 153, 0.05);
  `;

  const rect = info.element.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  // Add label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #ec4899;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  `;
  const cols = info.properties['grid-template-columns']?.split(' ').length || 'auto';
  const rows = info.properties['grid-template-rows']?.split(' ').length || 'auto';
  label.textContent = `Grid: ${cols}×${rows}`;
  overlay.appendChild(label);

  // Draw grid lines
  const columns = info.properties['grid-template-columns'];
  const gridRows = info.properties['grid-template-rows'];

  // Parse and draw column lines
  if (columns && columns !== 'none') {
    const colSizes = columns.split(' ');
    const leftOffset = 0;

    colSizes.forEach((_size, index) => {
      if (index === 0) return;

      const colLine = document.createElement('div');
      colLine.style.cssText = `
        position: absolute;
        top: 0;
        left: ${leftOffset}px;
        width: 1px;
        height: 100%;
        background: rgba(236, 72, 153, 0.4);
        pointer-events: none;
      `;
      overlay.appendChild(colLine);

      // Add column number
      const colNum = document.createElement('div');
      colNum.style.cssText = `
        position: absolute;
        top: -16px;
        left: ${leftOffset + 4}px;
        color: #ec4899;
        font-size: 10px;
        font-weight: 600;
      `;
      colNum.textContent = String(index + 1);
      overlay.appendChild(colNum);
    });
  }

  // Parse and draw row lines
  if (gridRows && gridRows !== 'none') {
    const rowSizes = gridRows.split(' ');
    const topOffset = 0;

    rowSizes.forEach((_size, index) => {
      if (index === 0) return;

      const rowLine = document.createElement('div');
      rowLine.style.cssText = `
        position: absolute;
        top: ${topOffset}px;
        left: 0;
        width: 100%;
        height: 1px;
        background: rgba(236, 72, 153, 0.4);
        pointer-events: none;
      `;
      overlay.appendChild(rowLine);

      // Add row number
      const rowNum = document.createElement('div');
      rowNum.style.cssText = `
        position: absolute;
        left: -16px;
        top: ${topOffset + 4}px;
        color: #ec4899;
        font-size: 10px;
        font-weight: 600;
      `;
      rowNum.textContent = String(index + 1);
      overlay.appendChild(rowNum);
    });
  }

  // Draw gap indicators
  const gap = info.properties.gap;
  // rowGap and colGap can be used for future gap visualization
  const _rowGap = info.properties['row-gap'] || gap;
  const _colGap = info.properties['column-gap'] || gap;
  void _rowGap;
  void _colGap;

  // Highlight grid items
  info.children.forEach((child, index) => {
    const childRect = child.getBoundingClientRect();
    const containerRect = info.element.getBoundingClientRect();

    const childOverlay = document.createElement('div');
    childOverlay.style.cssText = `
      position: absolute;
      left: ${childRect.left - containerRect.left + window.scrollX}px;
      top: ${childRect.top - containerRect.top + window.scrollY}px;
      width: ${childRect.width}px;
      height: ${childRect.height}px;
      border: 1px solid rgba(236, 72, 153, 0.5);
      background: rgba(236, 72, 153, 0.1);
      pointer-events: none;
    `;

    // Add grid area info
    const gridColumn = window.getComputedStyle(child).gridColumn;
    const gridRow = window.getComputedStyle(child).gridRow;

    if (gridColumn !== 'auto' || gridRow !== 'auto') {
      const areaLabel = document.createElement('div');
      areaLabel.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(236, 72, 153, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 9px;
        white-space: nowrap;
      `;
      areaLabel.textContent = `${gridRow} / ${gridColumn}`;
      childOverlay.appendChild(areaLabel);
    }

    // Add item number
    const numLabel = document.createElement('div');
    numLabel.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      background: rgba(236, 72, 153, 0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
    `;
    numLabel.textContent = String(index + 1);
    childOverlay.appendChild(numLabel);

    overlay.appendChild(childOverlay);
  });

  return overlay;
}

/**
 * Create layout overlay for an element
 */
function createOverlay(element: HTMLElement): void {
  // Remove existing overlay for this element
  removeOverlay(element);

  const info = getLayoutInfo(element);
  if (!info) return;

  const overlay = info.type === 'flex' ? createFlexOverlay(info) : createGridOverlay(info);

  document.body.appendChild(overlay);
  overlays.set(element, overlay);
  highlightedContainers.add(element);
}

/**
 * Remove overlay for an element
 */
function removeOverlay(element: HTMLElement): void {
  const overlay = overlays.get(element);
  if (overlay) {
    overlay.remove();
    overlays.delete(element);
  }
  highlightedContainers.delete(element);
}

/**
 * Update all overlays (on resize/scroll)
 */
function updateAllOverlays(): void {
  // Clear existing overlays
  overlays.forEach((overlay) => overlay.remove());
  overlays.clear();

  // Recreate for highlighted containers
  highlightedContainers.forEach((element) => {
    if (document.contains(element)) {
      createOverlay(element);
    }
  });
}

/**
 * Handle mouse over
 */
function handleMouseOver(e: MouseEvent): void {
  if (!isActive) return;

  const target = e.target as HTMLElement;
  if (!target || target.closest('.fdh-layout-overlay')) return;

  // Find nearest layout container
  let element: HTMLElement | null = target;
  while (element && element !== document.body) {
    if (isLayoutContainer(element)) {
      createOverlay(element);
      return;
    }
    element = element.parentElement;
  }
}

/**
 * Handle mouse out
 */
function handleMouseOut(_event: MouseEvent): void {
  if (!isActive) return;

  // Optional: remove overlay on mouse out
  // For now, keep overlays visible for better UX
}

/**
 * Handle resize
 */
function handleResize(): void {
  if (!isActive) return;
  updateAllOverlays();
}

/**
 * Enable Layout Visualizer
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  mouseOverHandler = handleMouseOver;
  mouseOutHandler = handleMouseOut;
  resizeHandler = handleResize;

  document.addEventListener('mouseover', mouseOverHandler, { passive: true });
  document.addEventListener('mouseout', mouseOutHandler, { passive: true });
  window.addEventListener('resize', resizeHandler, { passive: true });

  // Add CSS animation for overlays
  const style = document.createElement('style');
  style.id = 'fdh-layout-styles';
  style.textContent = `
    @keyframes fdh-layout-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .fdh-layout-overlay {
      animation: fdh-layout-pulse 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);

  logger.log('[LayoutVisualizer] Enabled');
}

/**
 * Disable Layout Visualizer
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  if (mouseOverHandler) {
    document.removeEventListener('mouseover', mouseOverHandler);
  }
  if (mouseOutHandler) {
    document.removeEventListener('mouseout', mouseOutHandler);
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  // Remove all overlays
  overlays.forEach((overlay) => overlay.remove());
  overlays.clear();
  highlightedContainers.clear();

  // Remove styles
  const style = document.getElementById('fdh-layout-styles');
  if (style) style.remove();

  logger.log('[LayoutVisualizer] Disabled');
}

/**
 * Toggle Layout Visualizer
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
  return {
    enabled: isActive,
    containerCount: highlightedContainers.size,
  };
}

/**
 * Clear all overlays
 */
export function clear(): void {
  overlays.forEach((overlay) => overlay.remove());
  overlays.clear();
  highlightedContainers.clear();
}

/**
 * Cleanup
 */
export function destroy(): void {
  disable();
}

// Export singleton API
export const layoutVisualizer = {
  enable,
  disable,
  toggle,
  getState,
  clear,
  destroy,
};

export default layoutVisualizer;
