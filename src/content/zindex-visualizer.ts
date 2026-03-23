import { escapeHtml } from '@/utils/sanitize';
import { logger } from '../utils/logger';

/**
 * Z-Index Visualizer
 *
 * Visualize the stacking order of positioned elements.
 * Shows z-index values and stacking context hierarchy.
 */

interface StackingElement {
  element: HTMLElement;
  zIndex: number;
  isAuto: boolean;
  isStackingContext: boolean;
  reason: string;
  level: number;
}

// State
let isActive = false;
let overlay: HTMLElement | null = null;
let stackingData: StackingElement[] = [];

// Event handlers
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Check if element creates a stacking context
 */
function createsStackingContext(element: HTMLElement): { isContext: boolean; reason: string } {
  const computed = window.getComputedStyle(element);

  // z-index other than auto
  if (computed.zIndex !== 'auto') {
    return { isContext: true, reason: `z-index: ${computed.zIndex}` };
  }

  // opacity < 1
  if (parseFloat(computed.opacity) < 1) {
    return { isContext: true, reason: `opacity: ${computed.opacity}` };
  }

  // transform
  if (computed.transform && computed.transform !== 'none') {
    return { isContext: true, reason: 'transform' };
  }

  // filter
  if (computed.filter && computed.filter !== 'none') {
    return { isContext: true, reason: 'filter' };
  }

  // perspective
  if (computed.perspective && computed.perspective !== 'none') {
    return { isContext: true, reason: 'perspective' };
  }

  // clip-path
  if (computed.clipPath && computed.clipPath !== 'none') {
    return { isContext: true, reason: 'clip-path' };
  }

  // mask
  if (computed.mask && computed.mask !== 'none') {
    return { isContext: true, reason: 'mask' };
  }

  // isolation: isolate
  if (computed.isolation === 'isolate') {
    return { isContext: true, reason: 'isolation' };
  }

  // mix-blend-mode
  if (computed.mixBlendMode && computed.mixBlendMode !== 'normal') {
    return { isContext: true, reason: 'mix-blend-mode' };
  }

  // will-change
  if (computed.willChange && computed.willChange !== 'auto') {
    return { isContext: true, reason: `will-change: ${computed.willChange}` };
  }

  // contain
  if (computed.contain && computed.contain !== 'none') {
    return { isContext: true, reason: 'contain' };
  }

  return { isContext: false, reason: '' };
}

/**
 * Collect all positioned elements with z-index
 */
function collectStackingElements(): StackingElement[] {
  const elements: StackingElement[] = [];
  const allElements = document.querySelectorAll('*');

  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      const computed = window.getComputedStyle(el);
      const position = computed.position;

      // Only include positioned elements or stacking contexts
      if (position !== 'static' || createsStackingContext(el).isContext) {
        const zIndex = computed.zIndex;
        const isAuto = zIndex === 'auto';
        const contextInfo = createsStackingContext(el);

        elements.push({
          element: el,
          zIndex: isAuto ? 0 : parseInt(zIndex, 10),
          isAuto,
          isStackingContext: contextInfo.isContext,
          reason: contextInfo.reason,
          level: 0,
        });
      }
    }
  });

  // Sort by z-index (descending)
  return elements.sort((a, b) => b.zIndex - a.zIndex);
}

/**
 * Create the overlay panel
 */
function createOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fdh-zindex-overlay';
  el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 20px;
    width: 340px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
  `;

  document.body.appendChild(el);
  return el;
}

/**
 * Build overlay content
 */
function buildOverlayContent(): string {
  stackingData = collectStackingElements();

  // Group by z-index
  const byZIndex = new Map<number, StackingElement[]>();
  stackingData.forEach((item) => {
    const key = item.zIndex;
    if (!byZIndex.has(key)) {
      byZIndex.set(key, []);
    }
    byZIndex.get(key)!.push(item);
  });

  // Sort z-index values
  const sortedZIndices = Array.from(byZIndex.keys()).sort((a, b) => b - a);

  return `
    <div class="fdh-zindex-header" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; color: #c084fc;">📚 Z-Index Stack</h3>
        <button
          type="button" class="fdh-close-btn" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        ">×</button>
      </div>
      <div style="font-size: 11px; color: #64748b;">
        Found ${stackingData.length} positioned/stacking elements
      </div>
    </div>
    
    <div class="fdh-zindex-list" style="display: flex; flex-direction: column; gap: 8px;">
      ${sortedZIndices
        .map((zIndex) => {
          const items = byZIndex.get(zIndex)!;
          return `
          <div class="fdh-zindex-group" style="
            background: rgba(30, 41, 59, 0.6);
            border-radius: 8px;
            overflow: hidden;
          ">
            <div class="fdh-zindex-header" style="
              background: ${zIndex === 0 && items[0]?.isAuto ? 'rgba(100, 116, 139, 0.3)' : 'rgba(99, 102, 241, 0.2)'};
              padding: 8px 12px;
              font-weight: 600;
              color: ${zIndex === 0 && items[0]?.isAuto ? '#94a3b8' : '#818cf8'};
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span>z-index: ${items[0]?.isAuto ? 'auto' : zIndex}</span>
              <span style="font-size: 11px; opacity: 0.7;">${items.length} element${items.length > 1 ? 's' : ''}</span>
            </div>
            <div style="padding: 8px;">
              ${items
                .slice(0, 5)
                .map((item) => {
                  const tag = item.element.tagName.toLowerCase();
                  const id = item.element.id ? `#${escapeHtml(item.element.id)}` : '';
                  const classes = Array.from(item.element.classList)
                    .filter((c) => !c.startsWith('fdh-'))
                    .slice(0, 2)
                    .map((c) => `.${escapeHtml(c)}`)
                    .join('');
                  const safeReason = item.reason ? escapeHtml(item.reason) : '';

                  return `
                  <div class="fdh-zindex-item" data-element-id="${escapeHtml(item.element.dataset.fdhId || '')}" style="
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    background: rgba(15, 23, 42, 0.4);
                    border-radius: 6px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: background 0.2s;
                  ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <code style="color: #c084fc;">${tag}${id}${classes}</code>
                      ${item.isStackingContext ? `<span style="font-size: 10px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 2px 6px; border-radius: 4px;">context</span>` : ''}
                    </div>
                    ${safeReason ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${safeReason}</div>` : ''}
                  </div>
                `;
                })
                .join('')}
              ${items.length > 5 ? `<div style="text-align: center; padding: 8px; color: #64748b; font-size: 11px;">...and ${items.length - 5} more</div>` : ''}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
    
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Legend:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px;">
        <span style="color: #818cf8;">● z-index value</span>
        <span style="color: #94a3b8;">● auto (0)</span>
        <span style="color: #fbbf24;">● stacking context</span>
      </div>
    </div>
    
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      <button
        type="button" class="fdh-refresh-btn" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
      ">🔄 Refresh</button>
      <button
        type="button" class="fdh-visualize-btn" style="
        flex: 1;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #4ade80;
        font-size: 11px;
        cursor: pointer;
      ">👁️ Visualize</button>
    </div>
    <div style="margin-top: 8px;">
      <button
        type="button" class="fdh-3d-btn" style="
        width: 100%;
        background: linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(99, 102, 241, 0.2));
        border: 1px solid rgba(192, 132, 252, 0.4);
        border-radius: 6px;
        padding: 10px;
        color: #c084fc;
        font-size: 11px;
        cursor: pointer;
        font-weight: 600;
      ">🥽 Open 3D Stack View</button>
    </div>
    
    <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #64748b;">
      Press <kbd style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
    </div>
  `;
}

/**
 * Visualize stacking order on the page
 */
function visualizeStackingOrder(): void {
  // Remove existing visualizations
  document.querySelectorAll('.fdh-zindex-viz').forEach((el) => el.remove());

  stackingData.forEach((item) => {
    const rect = item.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const viz = document.createElement('div');
    viz.className = 'fdh-zindex-viz';
    viz.style.cssText = `
      position: absolute;
      left: ${rect.left + window.scrollX}px;
      top: ${rect.top + window.scrollY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${item.isStackingContext ? '#fbbf24' : '#6366f1'};
      background: ${item.isStackingContext ? 'rgba(251, 191, 36, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
      pointer-events: none;
      z-index: 2147483646;
    `;

    // Add z-index label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background: ${item.isStackingContext ? '#fbbf24' : '#6366f1'};
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    `;
    label.textContent = item.isAuto ? 'auto' : String(item.zIndex);
    viz.appendChild(label);

    document.body.appendChild(viz);
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    document.querySelectorAll('.fdh-zindex-viz').forEach((el) => el.remove());
  }, 5000);
}

/**
 * Create 3D stacking visualization
 */
function create3DStackView(): void {
  // Remove existing 3D view
  const existing = document.getElementById('fdh-3d-stack-view');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'fdh-3d-stack-view';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483646;
    background: rgba(15, 23, 42, 0.95);
    perspective: 1000px;
    overflow: hidden;
    cursor: grab;
  `;

  const stage = document.createElement('div');
  stage.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80vw;
    height: 80vh;
    transform-style: preserve-3d;
    transform: translate(-50%, -50%) rotateX(60deg) rotateZ(-20deg);
    transition: transform 0.3s ease;
  `;

  // Group elements by z-index
  const byZIndex = new Map<number, StackingElement[]>();
  stackingData.forEach((item) => {
    const key = item.zIndex;
    if (!byZIndex.has(key)) {
      byZIndex.set(key, []);
    }
    byZIndex.get(key)!.push(item);
  });

  // Sort z-index values
  const sortedZIndices = Array.from(byZIndex.keys()).sort((a, b) => b - a);
  const maxZ = Math.max(...sortedZIndices, 1);
  const minZ = Math.min(...sortedZIndices, 0);
  const zRange = maxZ - minZ || 1;

  // Create layers
  sortedZIndices.forEach((zIndex, index) => {
    const items = byZIndex.get(zIndex)!;
    const normalizedZ = (zIndex - minZ) / zRange;
    const depth = normalizedZ * 200; // Scale to 0-200px depth

    const layer = document.createElement('div');
    layer.className = 'fdh-3d-layer';
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: translateZ(${depth}px);
      transform-style: preserve-3d;
      pointer-events: none;
    `;

    // Add layer info
    const layerInfo = document.createElement('div');
    layerInfo.style.cssText = `
      position: absolute;
      top: ${-30 - index * 5}px;
      left: 10px;
      background: ${zIndex === 0 ? 'rgba(100, 116, 139, 0.9)' : 'rgba(99, 102, 241, 0.9)'};
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      transform: rotateX(-90deg);
      transform-origin: bottom;
      pointer-events: auto;
      cursor: pointer;
    `;
    layerInfo.textContent = `z-index: ${zIndex === 0 && items[0]?.isAuto ? 'auto' : zIndex} (${items.length} items)`;
    layer.appendChild(layerInfo);

    // Add element representations
    items.slice(0, 10).forEach((item, _itemIndex) => {
      const rect = item.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Scale down for 3D view
      const scaleX = 0.15;
      const scaleY = 0.15;
      const scaledX = rect.left * scaleX;
      const scaledY = rect.top * scaleY;
      const scaledW = Math.max(rect.width * scaleX, 20);
      const scaledH = Math.max(rect.height * scaleY, 10);

      const box = document.createElement('div');
      box.style.cssText = `
        position: absolute;
        left: ${scaledX}px;
        top: ${scaledY}px;
        width: ${scaledW}px;
        height: ${scaledH}px;
        background: ${item.isStackingContext ? 'rgba(251, 191, 36, 0.7)' : 'rgba(99, 102, 241, 0.5)'};
        border: 1px solid ${item.isStackingContext ? '#fbbf24' : '#6366f1'};
        border-radius: 2px;
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.2s;
      `;
      box.title = `${item.element.tagName.toLowerCase()} - ${item.isAuto ? 'auto' : item.zIndex}`;

      // Hover effect
      box.addEventListener('mouseenter', () => {
        box.style.background = item.isStackingContext
          ? 'rgba(251, 191, 36, 0.9)'
          : 'rgba(99, 102, 241, 0.8)';
        box.style.transform = 'translateZ(5px)';
      });
      box.addEventListener('mouseleave', () => {
        box.style.background = item.isStackingContext
          ? 'rgba(251, 191, 36, 0.7)'
          : 'rgba(99, 102, 241, 0.5)';
        box.style.transform = 'translateZ(0)';
      });

      layer.appendChild(box);
    });

    stage.appendChild(layer);
  });

  // Add controls
  const controls = document.createElement('div');
  controls.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 16px;
    min-width: 200px;
  `;
  controls.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 14px; color: #c084fc;">🥽 3D Stack View</h3>
      <button
        type="button" id="fdh-close-3d" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
      ">×</button>
    </div>
    <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
      Drag to rotate • Scroll to zoom
    </div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <button
        type="button" id="fdh-reset-view" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
      ">Reset View</button>
      <button
        type="button" id="fdh-toggle-wireframe" style="
        flex: 1;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #4ade80;
        font-size: 11px;
        cursor: pointer;
      ">Wireframe</button>
    </div>
    <div style="font-size: 10px; color: #94a3b8;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <span style="width: 12px; height: 12px; background: #fbbf24; border-radius: 2px;"></span>
        <span>Stacking Context</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="width: 12px; height: 12px; background: #6366f1; border-radius: 2px;"></span>
        <span>Positioned Element</span>
      </div>
    </div>
  `;

  container.appendChild(stage);
  container.appendChild(controls);
  document.body.appendChild(container);

  // Mouse drag to rotate
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let rotateX = 60;
  let rotateZ = -20;

  container.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('#fdh-close-3d, #fdh-reset-view, #fdh-toggle-wireframe'))
      return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    rotateZ += deltaX * 0.5;
    rotateX = Math.max(0, Math.min(90, rotateX - deltaY * 0.5));
    stage.style.transform = `translate(-50%, -50%) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`;
    startX = e.clientX;
    startY = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  // Scroll to zoom
  let scale = 1;
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.max(0.5, Math.min(2, scale + (e.deltaY > 0 ? -0.1 : 0.1)));
    stage.style.scale = String(scale);
  });

  // Control buttons
  container.querySelector('#fdh-close-3d')?.addEventListener('click', () => container.remove());
  container.querySelector('#fdh-reset-view')?.addEventListener('click', () => {
    rotateX = 60;
    rotateZ = -20;
    scale = 1;
    stage.style.transform = `translate(-50%, -50%) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`;
    stage.style.scale = '1';
  });

  let wireframe = false;
  container.querySelector('#fdh-toggle-wireframe')?.addEventListener('click', () => {
    wireframe = !wireframe;
    container.querySelectorAll('.fdh-3d-layer > div:not(:first-child)').forEach((el) => {
      (el as HTMLElement).style.background = wireframe
        ? 'transparent'
        : (el as HTMLElement).title.includes('context')
          ? 'rgba(251, 191, 36, 0.7)'
          : 'rgba(99, 102, 241, 0.5)';
    });
  });

  // Escape to close
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      container.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Setup overlay controls
 */
function setupOverlayControls(): void {
  if (!overlay) return;

  // Close button
  const closeBtn = overlay.querySelector('.fdh-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', disable);
  }

  // Refresh button
  const refreshBtn = overlay.querySelector('.fdh-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      overlay!.innerHTML = buildOverlayContent();
      setupOverlayControls();
    });
  }

  // Visualize button
  const visualizeBtn = overlay.querySelector('.fdh-visualize-btn');
  if (visualizeBtn) {
    visualizeBtn.addEventListener('click', visualizeStackingOrder);
  }

  // 3D View button
  const view3DBtn = overlay.querySelector('.fdh-3d-btn');
  if (view3DBtn) {
    view3DBtn.addEventListener('click', create3DStackView);
  }

  // Item hover
  overlay.querySelectorAll('.fdh-zindex-item').forEach((item) => {
    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = 'rgba(99, 102, 241, 0.2)';
    });
    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'rgba(15, 23, 42, 0.4)';
    });
  });
}

/**
 * Handle key down
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    disable();
  }
}

/**
 * Enable Z-Index Visualizer
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  if (!overlay) {
    overlay = createOverlay();
  }

  overlay.innerHTML = buildOverlayContent();
  setupOverlayControls();

  keyHandler = handleKeyDown;
  document.addEventListener('keydown', keyHandler);

  logger.log('[ZIndexVisualizer] Enabled');
}

/**
 * Disable Z-Index Visualizer
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
  }

  // Remove visualizations
  document.querySelectorAll('.fdh-zindex-viz').forEach((el) => el.remove());

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  logger.log('[ZIndexVisualizer] Disabled');
}

/**
 * Toggle Z-Index Visualizer
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
export function getState(): { enabled: boolean; elementCount: number } {
  return {
    enabled: isActive,
    elementCount: stackingData.length,
  };
}

/**
 * Cleanup
 */
export function destroy(): void {
  disable();
}

// Export singleton API
export const zIndexVisualizer = {
  enable,
  disable,
  toggle,
  getState,
  destroy,
};

export default zIndexVisualizer;
