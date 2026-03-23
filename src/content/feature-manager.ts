/**
 * Feature Manager
 *
 * Manages feature toggles and their lifecycle in the content script.
 */

import type { FeatureToggles } from '@/types';
import { DEFAULT_FEATURE_TOGGLES } from '@/types';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';

type FeatureHandler = {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
};

export class FeatureManager {
  private features: Map<keyof FeatureToggles, FeatureHandler> = new Map();
  private state: FeatureToggles = { ...DEFAULT_FEATURE_TOGGLES };

  /**
   * Initialize the feature manager
   */
  async initialize(): Promise<void> {
    // Load saved feature states
    const saved = await this.loadFeatureStates();
    this.state = { ...this.state, ...saved };

    // Register feature handlers
    this.registerFeatureHandlers();

    logger.info('[FeatureManager] Initialized with features:', this.state);
  }

  /**
   * Get current feature states
   */
  getFeatures(): FeatureToggles {
    return { ...this.state };
  }

  /**
   * Enable a specific feature
   */
  enableFeature(feature: keyof FeatureToggles): void {
    if (this.state[feature]) return;

    const handler = this.features.get(feature);
    if (handler) {
      handler.enable();
      this.state[feature] = true;
      this.saveFeatureStates();
    }
  }

  /**
   * Disable a specific feature
   */
  disableFeature(feature: keyof FeatureToggles): void {
    if (!this.state[feature]) return;

    const handler = this.features.get(feature);
    if (handler) {
      handler.disable();
      this.state[feature] = false;
      this.saveFeatureStates();
    }
  }

  /**
   * Toggle a feature on/off
   */
  toggleFeature(feature: keyof FeatureToggles): void {
    if (this.state[feature]) {
      this.disableFeature(feature);
    } else {
      this.enableFeature(feature);
    }
  }

  /**
   * Disable all features
   */
  disableAll(): void {
    for (const [feature, enabled] of Object.entries(this.state)) {
      if (enabled) {
        this.disableFeature(feature as keyof FeatureToggles);
      }
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureToggles): boolean {
    return this.state[feature];
  }

  /**
   * Register feature handlers
   */
  private registerFeatureHandlers(): void {
    // Element Inspector
    this.features.set('elementInspector', {
      enable: () => this.enableElementInspector(),
      disable: () => this.disableElementInspector(),
      isEnabled: () => this.state.elementInspector,
    });

    // CSS Scanner
    this.features.set('cssScanner', {
      enable: () => this.enableCSSScanner(),
      disable: () => this.disableCSSScanner(),
      isEnabled: () => this.state.cssScanner,
    });

    // Breakpoint Visualizer
    this.features.set('breakpointVisualizer', {
      enable: () => this.enableBreakpointVisualizer(),
      disable: () => this.disableBreakpointVisualizer(),
      isEnabled: () => this.state.breakpointVisualizer,
    });

    // Color Picker
    this.features.set('colorPicker', {
      enable: () => this.enableColorPicker(),
      disable: () => this.disableColorPicker(),
      isEnabled: () => this.state.colorPicker,
    });

    // Font Inspector
    this.features.set('fontInspector', {
      enable: () => this.enableFontInspector(),
      disable: () => this.disableFontInspector(),
      isEnabled: () => this.state.fontInspector,
    });
  }

  /**
   * Load saved feature states
   */
  private async loadFeatureStates(): Promise<Partial<FeatureToggles>> {
    try {
      const result = await chrome.storage.local.get('features');
      return result.features?.value ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Save feature states to storage
   */
  private async saveFeatureStates(): Promise<void> {
    try {
      await chrome.storage.local.set({
        features: {
          value: this.state,
          timestamp: Date.now(),
          version: 1,
        },
      });
    } catch (error) {
      logger.error('[FeatureManager] Failed to save feature states:', error);
    }
  }

  // Feature Implementation Methods

  private enableElementInspector(): void {
    logger.info('[FeatureManager] Element inspector enabled');
    // Implementation handled by ElementInspector class
  }

  private disableElementInspector(): void {
    logger.info('[FeatureManager] Element inspector disabled');
  }

  private enableCSSScanner(): void {
    logger.info('[FeatureManager] CSS scanner enabled');
    // Implementation
  }

  private disableCSSScanner(): void {
    logger.info('[FeatureManager] CSS scanner disabled');
  }

  private enableBreakpointVisualizer(): void {
    logger.info('[FeatureManager] Breakpoint visualizer enabled');
    this.showBreakpointOverlay();
  }

  private disableBreakpointVisualizer(): void {
    logger.info('[FeatureManager] Breakpoint visualizer disabled');
    this.hideBreakpointOverlay();
  }

  private enableColorPicker(): void {
    logger.info('[FeatureManager] Color picker enabled');
    // Implementation
  }

  private disableColorPicker(): void {
    logger.info('[FeatureManager] Color picker disabled');
  }

  private enableFontInspector(): void {
    logger.info('[FeatureManager] Font inspector enabled');
    this.highlightFonts();
  }

  private disableFontInspector(): void {
    logger.info('[FeatureManager] Font inspector disabled');
    this.removeFontHighlights();
  }

  // Visual Feature Implementations

  private showBreakpointOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'fdh-breakpoint-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: #1e293b;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      z-index: 2147483647;
      border: 1px solid #334155;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Debounce resize updates to avoid performance issues
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      overlay.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${width}px × ${height}px</div>
        <div style="color: #94a3b8;">${this.getBreakpointLabel(width)}</div>
      `;
    };

    const debouncedUpdate = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(updateBreakpoint, 100);
    };

    updateBreakpoint();
    window.addEventListener('resize', debouncedUpdate);

    // Store cleanup function on the overlay element for removal
    (overlay as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedUpdate);
    };
    document.body.appendChild(overlay);
  }

  private hideBreakpointOverlay(): void {
    const overlay = document.getElementById('fdh-breakpoint-overlay') as HTMLElement & {
      __cleanup?: () => void;
    };
    if (overlay) {
      // Call cleanup function to remove event listeners
      overlay.__cleanup?.();
      overlay.remove();
    }
  }

  private getBreakpointLabel(width: number): string {
    if (width < 640) return 'xs (< 640px)';
    if (width < 768) return 'sm (640px)';
    if (width < 1024) return 'md (768px)';
    if (width < 1280) return 'lg (1024px)';
    if (width < 1536) return 'xl (1280px)';
    return '2xl (1536px)';
  }

  private highlightFonts(): void {
    const elements = document.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, span, div');
    const fonts = new Map<string, HTMLElement[]>();

    elements.forEach((el) => {
      const font = window.getComputedStyle(el).fontFamily;
      if (!fonts.has(font)) {
        fonts.set(font, []);
      }
      fonts.get(font)!.push(el);
    });

    // Create font info panel
    const panel = document.createElement('div');
    panel.id = 'fdh-font-panel';
    panel.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 280px;
      max-height: 400px;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      z-index: 2147483647;
      font-family: 'Inter', sans-serif;
      padding: 16px;
    `;

    const fontList = Array.from(fonts.entries())
      .map(
        ([font, els]) => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155;">
          <div style="font-family: ${escapeHtml(font)}; font-size: 16px; margin-bottom: 4px;">Aa</div>
          <div style="font-size: 11px; color: #94a3b8; word-break: break-all;">${escapeHtml(font)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${els.length} elements</div>
        </div>
      `
      )
      .join('');

    panel.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 12px; color: #f8fafc;">Fonts (${fonts.size})</div>
      ${fontList}
    `;

    document.body.appendChild(panel);
  }

  private removeFontHighlights(): void {
    const panel = document.getElementById('fdh-font-panel');
    if (panel) {
      panel.remove();
    }
  }
}
