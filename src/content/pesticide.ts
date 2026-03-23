import { logger } from '../utils/logger';

/**
 * Pesticide Reborn - DOM Outliner
 * Injects color-coded CSS outlines on all elements for visual debugging
 */

// Element type to color mapping
const ELEMENT_COLORS: Record<string, string> = {
  div: '#ff6b6b',
  section: '#4ecdc4',
  article: '#45b7d1',
  header: '#96ceb4',
  footer: '#88d8b0',
  nav: '#dda0dd',
  aside: '#f7dc6f',
  main: '#bb8fce',
  p: '#f8b500',
  h1: '#ff6b9d',
  h2: '#ff6b9d',
  h3: '#ff6b9d',
  h4: '#ff6b9d',
  h5: '#ff6b9d',
  h6: '#ff6b9d',
  img: '#c7ecee',
  button: '#dfe6e9',
  a: '#74b9ff',
  span: '#a29bfe',
  ul: '#fd79a8',
  ol: '#fd79a8',
  li: '#fdcb6e',
  form: '#6c5ce7',
  input: '#00b894',
};

const DEFAULT_COLOR = '#b2bec3';
const STORAGE_KEY = 'pesticideState';

interface PesticideState {
  enabled: boolean;
  visibleTags: Record<string, boolean>;
}

class Pesticide {
  private styleElement: HTMLStyleElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private isEnabled = false;
  private visibleTags: Record<string, boolean> = {};
  private hoverHandler: ((e: MouseEvent) => void) | null = null;
  private mouseOutHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    // Initialize all tags as visible by default
    Object.keys(ELEMENT_COLORS).forEach((tag) => {
      this.visibleTags[tag] = true;
    });
  }

  /**
   * Initialize pesticide from stored state
   */
  async init(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(STORAGE_KEY);
      const state: PesticideState = result[STORAGE_KEY] || {
        enabled: false,
        visibleTags: this.visibleTags,
      };

      this.visibleTags = { ...this.visibleTags, ...state.visibleTags };

      if (state.enabled) {
        this.enable();
      }
    } catch (error) {
      logger.error('[Pesticide] Failed to initialize:', error);
    }
  }

  /**
   * Generate CSS for all element outlines
   */
  private generateCSS(): string {
    const rules: string[] = [];

    // Generate outline rules for each element type
    Object.entries(ELEMENT_COLORS).forEach(([tag, color]) => {
      if (this.visibleTags[tag] !== false) {
        rules.push(`
          ${tag} {
            outline: 2px solid ${color} !important;
            outline-offset: -1px !important;
          }
        `);
      }
    });

    // Add default outline for unspecified elements
    rules.push(`
      *:not(${Object.keys(ELEMENT_COLORS).join(', ')}) {
        outline: 1px solid ${DEFAULT_COLOR} !important;
        outline-offset: -1px !important;
      }
    `);

    // Ensure outlines don't affect layout
    rules.push(`
      * {
        outline-style: solid !important;
      }
    `);

    return rules.join('\n');
  }

  /**
   * Create and inject the stylesheet
   */
  private injectStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'pesticide-outlines';
    this.styleElement.textContent = this.generateCSS();
    document.head.appendChild(this.styleElement);
  }

  /**
   * Remove the injected stylesheet
   */
  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * Update existing styles (for toggling visibility)
   */
  private updateStyles(): void {
    if (this.styleElement) {
      this.styleElement.textContent = this.generateCSS();
    }
  }

  /**
   * Create tooltip element for hover labels
   */
  private createTooltip(): void {
    if (this.tooltipElement) return;

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.id = 'pesticide-tooltip';
    this.tooltipElement.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 6px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 2147483647;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: opacity 0.15s ease;
      opacity: 0;
    `;
    document.body.appendChild(this.tooltipElement);
  }

  /**
   * Remove tooltip element
   */
  private removeTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  /**
   * Format element info for tooltip
   */
  private formatElementInfo(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const classNames = element.className;
    const id = element.id;

    let info = `<span style="color: #ff6b6b; font-weight: bold;">&lt;${tagName}&gt;</span>`;

    if (id) {
      info += ` <span style="color: #4ecdc4;">#${id}</span>`;
    }

    if (classNames && typeof classNames === 'string' && classNames.trim()) {
      const classes = classNames.trim().split(/\s+/).join('.');
      info += ` <span style="color: #f7dc6f;">.${classes}</span>`;
    }

    return info;
  }

  /**
   * Show tooltip for hovered element
   */
  private showTooltip(element: Element, x: number, y: number): void {
    if (!this.tooltipElement) return;

    this.tooltipElement.innerHTML = this.formatElementInfo(element);
    this.tooltipElement.style.opacity = '1';

    // Position tooltip above cursor with offset
    const offset = 10;
    const rect = this.tooltipElement.getBoundingClientRect();
    let top = y - rect.height - offset;
    let left = x;

    // Keep within viewport
    if (top < 0) top = y + offset;
    if (left + rect.width > window.innerWidth) {
      left = window.innerWidth - rect.width - offset;
    }

    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.opacity = '0';
    }
  }

  /**
   * Setup hover event listeners
   */
  private setupHoverListeners(): void {
    this.hoverHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && target !== this.tooltipElement) {
        this.showTooltip(target, e.clientX, e.clientY);
      }
    };

    this.mouseOutHandler = () => {
      this.hideTooltip();
    };

    document.addEventListener('mousemove', this.hoverHandler, { passive: true });
    document.addEventListener('mouseout', this.mouseOutHandler, { passive: true });
  }

  /**
   * Remove hover event listeners
   */
  private removeHoverListeners(): void {
    if (this.hoverHandler) {
      document.removeEventListener('mousemove', this.hoverHandler);
      this.hoverHandler = null;
    }
    if (this.mouseOutHandler) {
      document.removeEventListener('mouseout', this.mouseOutHandler);
      this.mouseOutHandler = null;
    }
  }

  /**
   * Save current state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const state: PesticideState = {
        enabled: this.isEnabled,
        visibleTags: this.visibleTags,
      };
      await chrome.storage.session.set({ [STORAGE_KEY]: state });
    } catch (error) {
      logger.error('[Pesticide] Failed to save state:', error);
    }
  }

  /**
   * Enable pesticide outlines
   */
  enable(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.injectStyles();
    this.createTooltip();
    this.setupHoverListeners();
    this.saveState();

    logger.log('[Pesticide] Enabled');
  }

  /**
   * Disable pesticide outlines
   */
  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.removeStyles();
    this.removeHoverListeners();
    this.removeTooltip();
    this.saveState();

    logger.log('[Pesticide] Disabled');
  }

  /**
   * Toggle pesticide on/off
   */
  toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if pesticide is currently enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current state
   */
  getState(): { enabled: boolean; visibleTags: Record<string, boolean> } {
    return {
      enabled: this.isEnabled,
      visibleTags: { ...this.visibleTags },
    };
  }

  /**
   * Toggle visibility for a specific tag type
   */
  toggleTag(tag: string, visible: boolean): void {
    if (ELEMENT_COLORS[tag] !== undefined) {
      this.visibleTags[tag] = visible;
      if (this.isEnabled) {
        this.updateStyles();
      }
      this.saveState();
    }
  }

  /**
   * Get visibility state for all tags
   */
  getTagVisibility(): Record<string, boolean> {
    return { ...this.visibleTags };
  }

  /**
   * Get color mapping for all tags
   */
  getTagColors(): Record<string, string> {
    return { ...ELEMENT_COLORS };
  }

  /**
   * Get list of all supported tags
   */
  getSupportedTags(): string[] {
    return Object.keys(ELEMENT_COLORS);
  }

  /**
   * Cleanup and remove all pesticide artifacts
   */
  destroy(): void {
    this.disable();
  }
}

// Export singleton instance
export const pesticide = new Pesticide();
export default pesticide;
