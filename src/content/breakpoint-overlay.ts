/**
 * Responsive Breakpoint Overlay
 *
 * Displays a persistent badge showing current viewport width,
 * active breakpoint name (Tailwind & Bootstrap), and quick resize buttons.
 */

import { createOverlay, throttle } from '@/utils/dom';
import { logger } from '../utils/logger';

// Tailwind CSS breakpoints
const TAILWIND_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Bootstrap breakpoints
const BOOTSTRAP_BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
} as const;

type BreakpointFramework = 'tailwind' | 'bootstrap';
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface BreakpointOverlayOptions {
  framework?: BreakpointFramework;
  position?: Position;
  showResizeButtons?: boolean;
  customBreakpoints?: Record<string, number>;
}

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  icon: string;
}

const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'Mobile', width: 375, height: 667, icon: '📱' },
  { name: 'Tablet', width: 768, height: 1024, icon: '📱' },
  { name: 'Laptop', width: 1440, height: 900, icon: '💻' },
  { name: 'Desktop', width: 1920, height: 1080, icon: '🖥️' },
];

const OVERLAY_Z_INDEX = '2147483647';
const OVERLAY_ID = 'fdh-breakpoint-overlay';

export class BreakpointOverlay {
  private overlay: HTMLElement | null = null;
  private isActive = false;
  private options: Required<BreakpointOverlayOptions>;
  private resizeHandler: () => void;
  private currentWidth = window.innerWidth;
  private currentHeight = window.innerHeight;

  constructor(options: BreakpointOverlayOptions = {}) {
    this.options = {
      framework: options.framework ?? 'tailwind',
      position: options.position ?? 'bottom-right',
      showResizeButtons: options.showResizeButtons ?? true,
      customBreakpoints: options.customBreakpoints ?? {},
    };

    // Throttled resize handler for performance
    this.resizeHandler = throttle(this.updateDisplay.bind(this), 100);
  }

  /**
   * Initialize the breakpoint overlay
   */
  initialize(): void {
    if (this.overlay) return;

    this.createOverlay();
    this.bindEvents();
    this.updateDisplay();
  }

  /**
   * Enable/show the overlay
   */
  enable(): void {
    if (!this.overlay) {
      this.initialize();
    }
    this.isActive = true;
    if (this.overlay) {
      this.overlay.style.display = 'block';
    }
    this.updateDisplay();
  }

  /**
   * Disable/hide the overlay
   */
  disable(): void {
    this.isActive = false;
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  /**
   * Toggle the overlay
   */
  toggle(): void {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if overlay is active
   */
  isEnabled(): boolean {
    return this.isActive;
  }

  /**
   * Get current state
   */
  getState(): { enabled: boolean; framework: BreakpointFramework; position: Position } {
    return {
      enabled: this.isActive,
      framework: this.options.framework,
      position: this.options.position,
    };
  }

  /**
   * Update options
   */
  setOptions(options: BreakpointOverlayOptions): void {
    this.options = { ...this.options, ...options };
    this.updatePosition();
    this.updateDisplay();
  }

  /**
   * Set framework (tailwind or bootstrap)
   */
  setFramework(framework: BreakpointFramework): void {
    this.options.framework = framework;
    this.updateDisplay();
  }

  /**
   * Set position
   */
  setPosition(position: Position): void {
    this.options.position = position;
    this.updatePosition();
  }

  /**
   * Get current breakpoint info
   */
  getCurrentBreakpoint(): {
    width: number;
    height: number;
    framework: BreakpointFramework;
    breakpoint: string;
    nextBreakpoint?: string;
  } {
    return {
      width: this.currentWidth,
      height: this.currentHeight,
      framework: this.options.framework,
      breakpoint: this.getBreakpointName(this.currentWidth),
      nextBreakpoint: this.getNextBreakpointName(this.currentWidth),
    };
  }

  private createOverlay(): void {
    this.overlay = createOverlay({
      id: OVERLAY_ID,
      styles: {
        position: 'fixed',
        zIndex: OVERLAY_Z_INDEX,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '12px',
        userSelect: 'none',
      },
    });

    this.overlay.innerHTML = this.getOverlayHTML();
    this.applyPositionStyles();
    this.attachEventListeners();
  }

  private getOverlayHTML(): string {
    const { showResizeButtons } = this.options;

    return `
      <div class="fdh-breakpoint-card" style="${this.getCardStyles()}">
        <!-- Main Info -->
        <div class="fdh-breakpoint-main" style="${this.getMainStyles()}">
          <div class="fdh-breakpoint-size" style="${this.getSizeStyles()}">
            <span id="fdh-breakpoint-width">${this.currentWidth}px</span>
            <span style="color: #64748b; margin: 0 4px;">×</span>
            <span id="fdh-breakpoint-height">${this.currentHeight}px</span>
          </div>
          <div class="fdh-breakpoint-name" style="${this.getNameStyles()}">
            <span id="fdh-breakpoint-label">${this.getBreakpointName(this.currentWidth)}</span>
          </div>
        </div>
        
        <!-- Resize Buttons -->
        ${showResizeButtons ? this.getResizeButtonsHTML() : ''}
        
        <!-- Framework Toggle -->
        <div class="fdh-breakpoint-footer" style="${this.getFooterStyles()}">
          <button
            type="button" class="fdh-framework-toggle" data-framework="tailwind" style="${this.getFrameworkButtonStyles('tailwind')}">
            Tailwind
          </button>
          <button
            type="button" class="fdh-framework-toggle" data-framework="bootstrap" style="${this.getFrameworkButtonStyles('bootstrap')}">
            Bootstrap
          </button>
        </div>
      </div>
    `;
  }

  private getResizeButtonsHTML(): string {
    return `
      <div class="fdh-resize-buttons" style="${this.getResizeButtonsStyles()}">
        ${DEVICE_PRESETS.map(
          (device) => `
          <button
            type="button" 
            class="fdh-resize-btn" 
            data-width="${device.width}" 
            data-height="${device.height}"
            title="${device.name}: ${device.width}×${device.height}"
            style="${this.getResizeButtonStyles()}"
          >
            <span style="font-size: 14px;">${device.icon}</span>
            <span style="${this.getResizeButtonLabelStyles()}">${device.width}px</span>
          </button>
        `
        ).join('')}
      </div>
    `;
  }

  private getCardStyles(): string {
    return `
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      min-width: 140px;
    `;
  }

  private getMainStyles(): string {
    return `
      padding: 12px 16px;
      text-align: center;
      border-bottom: 1px solid #334155;
    `;
  }

  private getSizeStyles(): string {
    return `
      color: #f8fafc;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    `;
  }

  private getNameStyles(): string {
    const breakpointColor = this.getBreakpointColor();
    return `
      color: ${breakpointColor};
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    `;
  }

  private getResizeButtonsStyles(): string {
    return `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      padding: 8px;
      border-bottom: 1px solid #334155;
    `;
  }

  private getResizeButtonStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      font-size: 10px;
    `;
  }

  private getResizeButtonLabelStyles(): string {
    return `
      font-size: 9px;
    `;
  }

  private getFooterStyles(): string {
    return `
      display: flex;
      padding: 4px;
      background: #0f172a;
      gap: 2px;
    `;
  }

  private getFrameworkButtonStyles(framework: BreakpointFramework): string {
    const isActive = this.options.framework === framework;
    return `
      flex: 1;
      padding: 4px 8px;
      background: ${isActive ? '#334155' : 'transparent'};
      border: none;
      border-radius: 3px;
      color: ${isActive ? '#f8fafc' : '#64748b'};
      cursor: pointer;
      font-family: inherit;
      font-size: 10px;
      font-weight: ${isActive ? '600' : '400'};
      transition: all 0.15s ease;
    `;
  }

  private applyPositionStyles(): void {
    if (!this.overlay) return;

    const positions: Record<
      Position,
      { top?: string; bottom?: string; left?: string; right?: string }
    > = {
      'top-left': { top: '16px', left: '16px' },
      'top-right': { top: '16px', right: '16px' },
      'bottom-left': { bottom: '16px', left: '16px' },
      'bottom-right': { bottom: '16px', right: '16px' },
    };

    const pos = positions[this.options.position];
    Object.assign(this.overlay.style, pos);
  }

  private updatePosition(): void {
    this.applyPositionStyles();
  }

  private attachEventListeners(): void {
    if (!this.overlay) return;

    // Framework toggle buttons
    this.overlay.querySelectorAll('.fdh-framework-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const framework = target.dataset.framework as BreakpointFramework;
        this.setFramework(framework);
      });
    });

    // Resize buttons
    this.overlay.querySelectorAll('.fdh-resize-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const width = parseInt(target.dataset.width || '0', 10);
        const height = parseInt(target.dataset.height || '0', 10);
        this.resizeWindow(width, height);
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
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  private updateDisplay(): void {
    this.currentWidth = window.innerWidth;
    this.currentHeight = window.innerHeight;

    if (!this.overlay) return;

    // Update dimensions
    const widthEl = this.overlay.querySelector('#fdh-breakpoint-width');
    const heightEl = this.overlay.querySelector('#fdh-breakpoint-height');
    const labelEl = this.overlay.querySelector('#fdh-breakpoint-label');

    if (widthEl) widthEl.textContent = `${this.currentWidth}px`;
    if (heightEl) heightEl.textContent = `${this.currentHeight}px`;
    if (labelEl) {
      const breakpointName = this.getBreakpointName(this.currentWidth);
      const nextBreakpoint = this.getNextBreakpointName(this.currentWidth);
      labelEl.textContent = nextBreakpoint
        ? `${breakpointName} (< ${this.getBreakpointValue(nextBreakpoint)}px)`
        : breakpointName;
    }

    // Update framework button styles
    this.overlay.querySelectorAll('.fdh-framework-toggle').forEach((btn) => {
      const target = btn as HTMLElement;
      const framework = target.dataset.framework as BreakpointFramework;
      const isActive = this.options.framework === framework;
      target.style.background = isActive ? '#334155' : 'transparent';
      target.style.color = isActive ? '#f8fafc' : '#64748b';
      target.style.fontWeight = isActive ? '600' : '400';
    });

    // Update breakpoint name color
    const nameEl = this.overlay.querySelector('.fdh-breakpoint-name') as HTMLElement;
    if (nameEl) {
      nameEl.style.color = this.getBreakpointColor();
    }
  }

  private getBreakpointName(width: number): string {
    if (this.options.framework === 'tailwind') {
      if (width >= TAILWIND_BREAKPOINTS['2xl']) return '2xl';
      if (width >= TAILWIND_BREAKPOINTS.xl) return 'xl';
      if (width >= TAILWIND_BREAKPOINTS.lg) return 'lg';
      if (width >= TAILWIND_BREAKPOINTS.md) return 'md';
      if (width >= TAILWIND_BREAKPOINTS.sm) return 'sm';
      return 'xs';
    } else {
      if (width >= BOOTSTRAP_BREAKPOINTS.xxl) return 'xxl';
      if (width >= BOOTSTRAP_BREAKPOINTS.xl) return 'xl';
      if (width >= BOOTSTRAP_BREAKPOINTS.lg) return 'lg';
      if (width >= BOOTSTRAP_BREAKPOINTS.md) return 'md';
      if (width >= BOOTSTRAP_BREAKPOINTS.sm) return 'sm';
      return 'xs';
    }
  }

  private getNextBreakpointName(width: number): string | undefined {
    if (this.options.framework === 'tailwind') {
      if (width < TAILWIND_BREAKPOINTS.sm) return 'sm';
      if (width < TAILWIND_BREAKPOINTS.md) return 'md';
      if (width < TAILWIND_BREAKPOINTS.lg) return 'lg';
      if (width < TAILWIND_BREAKPOINTS.xl) return 'xl';
      if (width < TAILWIND_BREAKPOINTS['2xl']) return '2xl';
    } else {
      if (width < BOOTSTRAP_BREAKPOINTS.sm) return 'sm';
      if (width < BOOTSTRAP_BREAKPOINTS.md) return 'md';
      if (width < BOOTSTRAP_BREAKPOINTS.lg) return 'lg';
      if (width < BOOTSTRAP_BREAKPOINTS.xl) return 'xl';
      if (width < BOOTSTRAP_BREAKPOINTS.xxl) return 'xxl';
    }
    return undefined;
  }

  private getBreakpointValue(name: string): number {
    if (this.options.framework === 'tailwind') {
      return TAILWIND_BREAKPOINTS[name as keyof typeof TAILWIND_BREAKPOINTS] || 0;
    } else {
      return BOOTSTRAP_BREAKPOINTS[name as keyof typeof BOOTSTRAP_BREAKPOINTS] || 0;
    }
  }

  private getBreakpointColor(): string {
    const name = this.getBreakpointName(this.currentWidth);
    const colors: Record<string, string> = {
      xs: '#ef4444', // Red
      sm: '#f97316', // Orange
      md: '#eab308', // Yellow
      lg: '#22c55e', // Green
      xl: '#3b82f6', // Blue
      '2xl': '#8b5cf6', // Purple
      xxl: '#a855f7', // Purple (Bootstrap)
    };
    return colors[name] || '#94a3b8';
  }

  private resizeWindow(width: number, height: number): void {
    // Try to resize the window
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    // Center the window on screen
    const left = Math.max(0, (screenWidth - width) / 2);
    const top = Math.max(0, (screenHeight - height) / 2);

    try {
      window.resizeTo(width, height);
      window.moveTo(left, top);
    } catch {
      // If direct resize fails, try opening a new window (for popup windows)
      logger.log('[BreakpointOverlay] Window resize not available in this context');
    }

    // Send message to background script to attempt resize via extension API
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          type: 'RESIZE_WINDOW',
          width,
          height,
        })
        .catch(() => {
          // Extension API may not support window resize
        });
    }

    // Visual feedback
    this.showResizeFeedback(width);
  }

  private showResizeFeedback(targetWidth: number): void {
    if (!this.overlay) return;

    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e293b;
      color: #22c55e;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid #22c55e;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: ${OVERLAY_Z_INDEX};
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    feedback.textContent = `Target: ${targetWidth}px`;
    document.body.appendChild(feedback);

    // Animate in
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
    });

    // Remove after delay
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => feedback.remove(), 200);
    }, 1500);
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.overlay?.remove();
    this.overlay = null;
    this.isActive = false;
  }
}

// Export singleton instance
export const breakpointOverlay = new BreakpointOverlay();
