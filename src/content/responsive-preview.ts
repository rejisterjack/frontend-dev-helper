/**
 * Responsive Preview Tool
 *
 * Shows multiple device previews side-by-side with synced scrolling,
 * rotation, scaling, and custom size support.
 */

import { createOverlay } from '@/utils/dom';

// Device preset definitions
interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: string;
  type: 'mobile' | 'tablet' | 'laptop' | 'desktop';
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'mobile', name: 'Mobile', width: 375, height: 667, icon: '📱', type: 'mobile' },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: '📱', type: 'tablet' },
  { id: 'laptop', name: 'Laptop', width: 1440, height: 900, icon: '💻', type: 'laptop' },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: '🖥️', type: 'desktop' },
];

// View state for each device preview
interface PreviewView {
  id: string;
  presetId: string | null;
  width: number;
  height: number;
  isLandscape: boolean;
  scale: number;
  iframe: HTMLIFrameElement | null;
  container: HTMLElement | null;
  frame: HTMLElement | null;
}

// Tool options
interface ResponsivePreviewOptions {
  initialDevices?: string[];
  syncScroll?: boolean;
  globalScale?: number;
}

// State interface
interface ResponsivePreviewState {
  enabled: boolean;
  views: Array<{
    id: string;
    presetId: string | null;
    width: number;
    height: number;
    isLandscape: boolean;
    scale: number;
  }>;
  syncScroll: boolean;
  globalScale: number;
}

const OVERLAY_ID = 'fdh-responsive-preview-overlay';
const CONTAINER_ID = 'fdh-responsive-preview-container';
const Z_INDEX_BASE = 2147483600;

class ResponsivePreview {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private viewsContainer: HTMLElement | null = null;
  private isActive = false;
  private syncScroll = true;
  private globalScale = 0.5;
  private views: PreviewView[] = [];
  private scrollSyncHandlers: Map<string, (e: Event) => void> = new Map();
  private originalOverflow: string = '';

  constructor(options: ResponsivePreviewOptions = {}) {
    this.syncScroll = options.syncScroll ?? true;
    this.globalScale = options.globalScale ?? 0.5;

    // Initialize with default views
    const initialDevices = options.initialDevices ?? ['mobile', 'tablet', 'desktop'];
    this.views = initialDevices.map((presetId, index) => {
      const preset = DEVICE_PRESETS.find((p) => p.id === presetId) ?? DEVICE_PRESETS[0];
      return {
        id: `view-${index}`,
        presetId: preset.id,
        width: preset.width,
        height: preset.height,
        isLandscape: false,
        scale: this.globalScale,
        iframe: null,
        container: null,
        frame: null,
      };
    });
  }

  /**
   * Enable/show the responsive preview overlay
   */
  enable(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createOverlay();
    this.renderViews();
    this.attachEventListeners();

    // Prevent body scroll when overlay is open
    this.originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Disable/hide the responsive preview overlay
   */
  disable(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.detachEventListeners();
    this.overlay?.remove();
    this.overlay = null;
    this.container = null;
    this.toolbar = null;
    this.viewsContainer = null;

    // Reset iframe references
    this.views.forEach((view) => {
      view.iframe = null;
      view.container = null;
      view.frame = null;
    });

    // Restore body scroll
    document.body.style.overflow = this.originalOverflow;
  }

  /**
   * Toggle the responsive preview overlay
   */
  toggle(): void {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Get current state
   */
  getState(): ResponsivePreviewState {
    return {
      enabled: this.isActive,
      views: this.views.map((view) => ({
        id: view.id,
        presetId: view.presetId,
        width: view.isLandscape ? view.height : view.width,
        height: view.isLandscape ? view.width : view.height,
        isLandscape: view.isLandscape,
        scale: view.scale,
      })),
      syncScroll: this.syncScroll,
      globalScale: this.globalScale,
    };
  }

  /**
   * Add a new device view
   */
  addView(presetId: string = 'mobile'): void {
    const preset = DEVICE_PRESETS.find((p) => p.id === presetId) ?? DEVICE_PRESETS[0];
    const newView: PreviewView = {
      id: `view-${Date.now()}`,
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      isLandscape: false,
      scale: this.globalScale,
      iframe: null,
      container: null,
      frame: null,
    };

    this.views.push(newView);
    this.renderView(newView);
    this.updateLayout();
  }

  /**
   * Remove a device view
   */
  removeView(viewId: string): void {
    const index = this.views.findIndex((v) => v.id === viewId);
    if (index === -1 || this.views.length <= 1) return;

    const view = this.views[index];
    this.removeScrollSync(view);
    view.container?.remove();
    this.views.splice(index, 1);
    this.updateLayout();
  }

  /**
   * Set device preset for a view
   */
  setDevicePreset(viewId: string, presetId: string): void {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;

    const preset = DEVICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    view.presetId = preset.id;
    view.width = preset.width;
    view.height = preset.height;
    view.isLandscape = false;

    this.updateViewDimensions(view);
  }

  /**
   * Set custom dimensions for a view
   */
  setCustomDimensions(viewId: string, width: number, height: number): void {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;

    view.presetId = null;
    view.width = width;
    view.height = height;

    this.updateViewDimensions(view);
  }

  /**
   * Toggle landscape/portrait orientation
   */
  toggleOrientation(viewId: string): void {
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;

    view.isLandscape = !view.isLandscape;
    this.updateViewDimensions(view);
  }

  /**
   * Set sync scroll enabled/disabled
   */
  setSyncScroll(enabled: boolean): void {
    this.syncScroll = enabled;

    if (enabled) {
      this.attachScrollSync();
    } else {
      this.detachScrollSync();
    }

    // Update toggle UI
    const toggle = this.toolbar?.querySelector('[data-sync-toggle]') as HTMLInputElement | null;
    if (toggle) {
      toggle.checked = enabled;
    }
  }

  /**
   * Set global scale for all views
   */
  setGlobalScale(scale: number): void {
    this.globalScale = Math.max(0.1, Math.min(1, scale));

    this.views.forEach((view) => {
      view.scale = this.globalScale;
      this.updateViewScale(view);
    });

    // Update slider UI
    const slider = this.toolbar?.querySelector('[data-scale-slider]') as HTMLInputElement | null;
    const value = this.toolbar?.querySelector('[data-scale-value]') as HTMLElement | null;
    if (slider) {
      slider.value = String(Math.round(this.globalScale * 100));
    }
    if (value) {
      value.textContent = `${Math.round(this.globalScale * 100)}%`;
    }
  }

  private createOverlay(): void {
    this.overlay = createOverlay({
      id: OVERLAY_ID,
      styles: {
        position: 'fixed',
        inset: '0',
        zIndex: String(Z_INDEX_BASE),
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        overflow: 'hidden',
      },
    });

    this.overlay.innerHTML = this.getOverlayHTML();
    this.container = this.overlay.querySelector(`#${CONTAINER_ID}`);
    this.toolbar = this.overlay.querySelector('[data-toolbar]');
    this.viewsContainer = this.overlay.querySelector('[data-views-container]');
  }

  private getOverlayHTML(): string {
    return `
      <div id="${CONTAINER_ID}" style="${this.getContainerStyles()}">
        ${this.getToolbarHTML()}
        <div data-views-container style="${this.getViewsContainerStyles()}">
        </div>
      </div>
    `;
  }

  private getToolbarHTML(): string {
    return `
      <div data-toolbar style="${this.getToolbarStyles()}">
        <div style="${this.getToolbarLeftStyles()}">
          <span style="${this.getTitleStyles()}">📱 Responsive Preview</span>
          <div style="${this.getDeviceButtonsStyles()}">
            ${DEVICE_PRESETS.map(
              (preset) => `
              <button 
                data-add-device="${preset.id}"
                style="${this.getDeviceButtonStyles()}"
                title="Add ${preset.name} (${preset.width}×${preset.height})"
              >
                <span>${preset.icon}</span>
                <span style="font-size: 10px;">${preset.name}</span>
              </button>
            `
            ).join('')}
          </div>
        </div>
        
        <div style="${this.getToolbarCenterStyles()}">
          <label style="${this.getToggleLabelStyles()}">
            <input 
              type="checkbox" 
              data-sync-toggle 
              ${this.syncScroll ? 'checked' : ''}
              style="${this.getCheckboxStyles()}"
            />
            <span>Sync Scroll</span>
          </label>
          
          <div style="${this.getScaleControlStyles()}">
            <span style="font-size: 12px; color: #94a3b8;">Scale:</span>
            <input 
              type="range" 
              data-scale-slider
              min="10" 
              max="100" 
              value="${Math.round(this.globalScale * 100)}"
              style="${this.getSliderStyles()}"
            />
            <span data-scale-value style="${this.getScaleValueStyles()}">${Math.round(this.globalScale * 100)}%</span>
          </div>
        </div>
        
        <div style="${this.getToolbarRightStyles()}">
          <button data-close-btn style="${this.getCloseButtonStyles()}">
            <span style="font-size: 18px;">×</span>
            <span>Close</span>
          </button>
        </div>
      </div>
    `;
  }

  private getContainerStyles(): string {
    return `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
  }

  private getToolbarStyles(): string {
    return `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      gap: 16px;
      flex-shrink: 0;
    `;
  }

  private getToolbarLeftStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 16px;
    `;
  }

  private getTitleStyles(): string {
    return `
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
    `;
  }

  private getDeviceButtonsStyles(): string {
    return `
      display: flex;
      gap: 6px;
    `;
  }

  private getDeviceButtonStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      transition: all 0.15s ease;
    `;
  }

  private getToolbarCenterStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
      justify-content: center;
    `;
  }

  private getToggleLabelStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 6px;
      color: #cbd5e1;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
    `;
  }

  private getCheckboxStyles(): string {
    return `
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #3b82f6;
    `;
  }

  private getScaleControlStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
  }

  private getSliderStyles(): string {
    return `
      width: 100px;
      cursor: pointer;
      accent-color: #3b82f6;
    `;
  }

  private getScaleValueStyles(): string {
    return `
      font-size: 12px;
      color: #94a3b8;
      min-width: 36px;
      text-align: right;
    `;
  }

  private getToolbarRightStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
  }

  private getCloseButtonStyles(): string {
    return `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 14px;
      background: #ef4444;
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s ease;
    `;
  }

  private getViewsContainerStyles(): string {
    return `
      flex: 1;
      display: flex;
      gap: 24px;
      padding: 24px;
      overflow-x: auto;
      overflow-y: hidden;
      align-items: flex-start;
      justify-content: center;
    `;
  }

  private renderViews(): void {
    if (!this.viewsContainer) return;
    this.viewsContainer.innerHTML = '';

    this.views.forEach((view) => {
      this.renderView(view);
    });

    this.attachScrollSync();
  }

  private renderView(view: PreviewView): void {
    if (!this.viewsContainer) return;

    const viewEl = document.createElement('div');
    viewEl.setAttribute('data-view-id', view.id);
    viewEl.style.cssText = this.getViewWrapperStyles(view);

    const frameEl = document.createElement('div');
    frameEl.style.cssText = this.getDeviceFrameStyles(view);

    const headerEl = document.createElement('div');
    headerEl.style.cssText = this.getDeviceHeaderStyles();
    headerEl.innerHTML = this.getDeviceHeaderHTML(view);

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = this.getIframeContainerStyles(view);

    const iframe = document.createElement('iframe');
    iframe.src = window.location.href;
    iframe.style.cssText = this.getIframeStyles();
    iframe.sandbox.add('allow-same-origin', 'allow-scripts', 'allow-forms');

    iframeContainer.appendChild(iframe);
    frameEl.appendChild(headerEl);
    frameEl.appendChild(iframeContainer);
    viewEl.appendChild(frameEl);

    this.viewsContainer?.appendChild(viewEl);

    // Store references
    view.iframe = iframe;
    view.container = viewEl;
    view.frame = frameEl;

    // Attach view-specific event listeners
    this.attachViewEventListeners(view, headerEl);

    // Apply initial scale
    this.updateViewScale(view);
  }

  private getViewWrapperStyles(view: PreviewView): string {
    const width = view.isLandscape ? view.height : view.width;
    const scaledWidth = width * view.scale;

    return `
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.3s ease;
      width: ${scaledWidth + 40}px;
    `;
  }

  private getDeviceFrameStyles(view: PreviewView): string {
    const width = view.isLandscape ? view.height : view.width;

    return `
      position: relative;
      background: #1e293b;
      border: 2px solid #475569;
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      transition: all 0.3s ease;
      width: ${width + 16}px;
    `;
  }

  private getDeviceHeaderStyles(): string {
    return `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #334155;
      border-radius: 8px 8px 0 0;
      margin: -8px -8px 8px -8px;
      border-bottom: 1px solid #475569;
    `;
  }

  private getDeviceHeaderHTML(view: PreviewView): string {
    const width = view.isLandscape ? view.height : view.width;
    const height = view.isLandscape ? view.width : view.height;
    const preset = view.presetId ? DEVICE_PRESETS.find((p) => p.id === view.presetId) : null;
    const name = preset?.name ?? 'Custom';
    const icon = preset?.icon ?? '📐';

    return `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px;">${icon}</span>
        <span style="font-size: 12px; font-weight: 500; color: #f8fafc;">${name}</span>
        <span style="font-size: 11px; color: #94a3b8;">${width}×${height}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <button 
          data-rotate="${view.id}" 
          title="Rotate"
          style="${this.getHeaderButtonStyles()}"
        >
          🔄
        </button>
        <button 
          data-remove="${view.id}" 
          title="Remove"
          style="${this.getHeaderButtonStyles()}"
        >
          ✕
        </button>
      </div>
    `;
  }

  private getHeaderButtonStyles(): string {
    return `
      padding: 4px 8px;
      background: #475569;
      border: none;
      border-radius: 4px;
      color: #cbd5e1;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;
    `;
  }

  private getIframeContainerStyles(view: PreviewView): string {
    const width = view.isLandscape ? view.height : view.width;
    const height = view.isLandscape ? view.width : view.height;

    return `
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: white;
      border-radius: 4px;
    `;
  }

  private getIframeStyles(): string {
    return `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `;
  }

  private attachViewEventListeners(view: PreviewView, headerEl: HTMLElement): void {
    // Rotate button
    headerEl.querySelector(`[data-rotate="${view.id}"]`)?.addEventListener('click', () => {
      this.toggleOrientation(view.id);
    });

    // Remove button
    headerEl.querySelector(`[data-remove="${view.id}"]`)?.addEventListener('click', () => {
      this.removeView(view.id);
    });

    // Hover effects for buttons
    headerEl.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#64748b';
        btn.style.color = '#f8fafc';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#475569';
        btn.style.color = '#cbd5e1';
      });
    });
  }

  private attachEventListeners(): void {
    if (!this.toolbar) return;

    // Add device buttons
    this.toolbar.querySelectorAll('[data-add-device]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const presetId = target.dataset.addDevice ?? 'mobile';
        this.addView(presetId);
      });

      // Hover effects
      btn.addEventListener('mouseenter', (e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.background = '#1e293b';
        target.style.borderColor = '#475569';
        target.style.color = '#f8fafc';
      });
      btn.addEventListener('mouseleave', (e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.background = '#0f172a';
        target.style.borderColor = '#334155';
        target.style.color = '#94a3b8';
      });
    });

    // Sync scroll toggle
    const syncToggle = this.toolbar.querySelector('[data-sync-toggle]');
    syncToggle?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.setSyncScroll(target.checked);
    });

    // Scale slider
    const scaleSlider = this.toolbar.querySelector('[data-scale-slider]');
    scaleSlider?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const scale = parseInt(target.value, 10) / 100;
      this.setGlobalScale(scale);
    });

    // Close button
    const closeBtn = this.toolbar.querySelector('[data-close-btn]');
    closeBtn?.addEventListener('click', () => {
      this.disable();
    });

    // Close button hover
    closeBtn?.addEventListener('mouseenter', () => {
      const btn = closeBtn as HTMLElement;
      btn.style.background = '#dc2626';
      btn.style.transform = 'scale(1.02)';
    });
    closeBtn?.addEventListener('mouseleave', () => {
      const btn = closeBtn as HTMLElement;
      btn.style.background = '#ef4444';
      btn.style.transform = 'scale(1)';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private detachEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.detachScrollSync();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.disable();
    }
  };

  private attachScrollSync(): void {
    if (!this.syncScroll) return;

    this.detachScrollSync();

    this.views.forEach((view) => {
      if (!view.iframe?.contentWindow) return;

      const handler = (e: Event) => {
        const target = e.target as Document;
        const scrollX = target.documentElement.scrollLeft || target.body.scrollLeft;
        const scrollY = target.documentElement.scrollTop || target.body.scrollTop;

        // Sync to other views
        this.views.forEach((otherView) => {
          if (otherView.id === view.id || !otherView.iframe?.contentWindow) return;

          const otherDoc = otherView.iframe.contentWindow.document;
          if (otherDoc.documentElement.scrollLeft !== scrollX) {
            otherDoc.documentElement.scrollLeft = scrollX;
          }
          if (otherDoc.documentElement.scrollTop !== scrollY) {
            otherDoc.documentElement.scrollTop = scrollY;
          }
          if (otherDoc.body.scrollLeft !== scrollX) {
            otherDoc.body.scrollLeft = scrollX;
          }
          if (otherDoc.body.scrollTop !== scrollY) {
            otherDoc.body.scrollTop = scrollY;
          }
        });
      };

      this.scrollSyncHandlers.set(view.id, handler);

      // Wait for iframe to load
      view.iframe.addEventListener('load', () => {
        const doc = view.iframe?.contentWindow?.document;
        if (doc) {
          doc.addEventListener('scroll', handler, true);
        }
      });
    });
  }

  private detachScrollSync(): void {
    this.views.forEach((view) => {
      this.removeScrollSync(view);
    });
    this.scrollSyncHandlers.clear();
  }

  private removeScrollSync(view: PreviewView): void {
    const handler = this.scrollSyncHandlers.get(view.id);
    if (handler && view.iframe?.contentWindow) {
      const doc = view.iframe.contentWindow.document;
      doc.removeEventListener('scroll', handler, true);
      this.scrollSyncHandlers.delete(view.id);
    }
  }

  private updateViewDimensions(view: PreviewView): void {
    if (!view.frame || !view.iframe?.parentElement) return;

    const width = view.isLandscape ? view.height : view.width;
    const height = view.isLandscape ? view.width : view.height;

    // Update frame dimensions
    view.frame.style.width = `${width + 16}px`;

    // Update iframe container
    const container = view.iframe.parentElement;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    // Update header
    const header =
      (view.frame.querySelector('[data-view-id]') as HTMLElement | null) ||
      (view.frame.firstElementChild as HTMLElement | null);
    if (header) {
      header.innerHTML = this.getDeviceHeaderHTML(view);
      this.attachViewEventListeners(view, header);
    }

    // Update wrapper width
    if (view.container) {
      const scaledWidth = width * view.scale;
      view.container.style.width = `${scaledWidth + 40}px`;
    }

    this.updateViewScale(view);
  }

  private updateViewScale(view: PreviewView): void {
    if (!view.frame) return;

    const width = view.isLandscape ? view.height : view.width;
    const scale = view.scale;

    view.frame.style.transform = `scale(${scale})`;
    view.frame.style.transformOrigin = 'top center';

    // Update container width to account for scaled size
    if (view.container) {
      const scaledWidth = width * scale;
      view.container.style.width = `${scaledWidth + 40}px`;
    }
  }

  private updateLayout(): void {
    // Re-attach scroll sync after layout changes
    if (this.syncScroll) {
      setTimeout(() => this.attachScrollSync(), 100);
    }
  }
}

// Export singleton instance
export const responsivePreview = new ResponsivePreview();

// Export functions for external use
export function enable(): void {
  responsivePreview.enable();
}

export function disable(): void {
  responsivePreview.disable();
}

export function toggle(): void {
  responsivePreview.toggle();
}

export function getState(): ResponsivePreviewState {
  return responsivePreview.getState();
}

export function addView(presetId?: string): void {
  responsivePreview.addView(presetId);
}

export function removeView(viewId: string): void {
  responsivePreview.removeView(viewId);
}

export function setDevicePreset(viewId: string, presetId: string): void {
  responsivePreview.setDevicePreset(viewId, presetId);
}

export function setCustomDimensions(viewId: string, width: number, height: number): void {
  responsivePreview.setCustomDimensions(viewId, width, height);
}

export function toggleOrientation(viewId: string): void {
  responsivePreview.toggleOrientation(viewId);
}

export function setSyncScroll(enabled: boolean): void {
  responsivePreview.setSyncScroll(enabled);
}

export function setGlobalScale(scale: number): void {
  responsivePreview.setGlobalScale(scale);
}

export type { DevicePreset, PreviewView, ResponsivePreviewOptions, ResponsivePreviewState };
// Re-export the class for advanced usage
export { ResponsivePreview };
