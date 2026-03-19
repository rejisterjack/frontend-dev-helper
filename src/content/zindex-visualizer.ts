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
        <button class="fdh-close-btn" style="
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
                  const id = item.element.id ? `#${item.element.id}` : '';
                  const classes = Array.from(item.element.classList)
                    .filter((c) => !c.startsWith('fdh-'))
                    .slice(0, 2)
                    .map((c) => `.${c}`)
                    .join('');

                  return `
                  <div class="fdh-zindex-item" data-element-id="${item.element.dataset.fdhId || ''}" style="
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
                    ${item.reason ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${item.reason}</div>` : ''}
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
      <button class="fdh-refresh-btn" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
      ">🔄 Refresh</button>
      <button class="fdh-visualize-btn" style="
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

  console.log('[ZIndexVisualizer] Enabled');
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

  console.log('[ZIndexVisualizer] Disabled');
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
