/**
 * Contrast Checker
 *
 * Check WCAG AA/AAA compliance for color combinations.
 * Pick foreground and background colors to analyze contrast.
 */

import { escapeHtml, sanitizeColor } from '@/utils/sanitize';
import { getContrastRatio, hexToRgb } from '../utils/color';
import { logger } from '../utils/logger';

interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
  suggestions: string[];
}

// State
let isActive = false;
let overlay: HTMLElement | null = null;
let foregroundColor: string = '#000000';
let backgroundColor: string = '#ffffff';
let pickerMode: 'foreground' | 'background' | null = null;

// Event handlers
let clickHandler: ((e: MouseEvent) => void) | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

/**
 * Create the contrast checker overlay
 */
function createOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fdh-contrast-overlay';
  el.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 16px;
    padding: 24px;
    min-width: 380px;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    font-size: 14px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
  `;

  document.body.appendChild(el);
  return el;
}

/**
 * Build the overlay content
 */
function buildOverlayContent(): string {
  const result = analyzeContrast(foregroundColor, backgroundColor);

  // Determine grade color
  let gradeColor = '#ef4444'; // red for fail
  let grade = 'Fail';
  if (result.wcagAAA) {
    gradeColor = '#22c55e'; // green
    grade = 'AAA';
  } else if (result.wcagAA) {
    gradeColor = '#3b82f6'; // blue
    grade = 'AA';
  }

  // Preview text samples
  const normalText = 'The quick brown fox jumps over the lazy dog.';
  const largeText = 'Large Text (18pt+ or 14pt bold)';

  return `
    <div class="fdh-contrast-header" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 18px; color: #c084fc;">🔍 Contrast Checker</h3>
        <button
          type="button" class="fdh-close-btn" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: color 0.2s;
        ">×</button>
      </div>
      <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
        WCAG 2.1 Level AA requires 4.5:1 for normal text, 3:1 for large text
      </p>
    </div>
    
    <div class="fdh-contrast-colors" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <!-- Foreground Color -->
      <div class="fdh-color-picker" style="text-align: center;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Foreground</label>
        <div class="fdh-color-swatch fdh-fg-swatch" style="
          width: 60px;
          height: 60px;
          border-radius: 12px;
          margin: 0 auto 8px;
          cursor: pointer;
          border: 3px solid ${pickerMode === 'foreground' ? '#6366f1' : 'transparent'};
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          background: ${sanitizeColor(foregroundColor) || '#000000'};
          transition: transform 0.2s, border-color 0.2s;
        "></div>
        <input type="text" class="fdh-color-input fdh-fg-input" value="${escapeHtml(foregroundColor)}" style="
          width: 100%;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          padding: 8px;
          color: #e2e8f0;
          font-family: inherit;
          font-size: 12px;
          text-align: center;
          text-transform: uppercase;
        ">
        <button
          type="button" class="fdh-pick-fg-btn" style="
          margin-top: 8px;
          width: 100%;
          background: ${pickerMode === 'foreground' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 6px;
          padding: 6px;
          color: #818cf8;
          font-size: 11px;
          cursor: pointer;
        ">${pickerMode === 'foreground' ? 'Click page to pick...' : '📍 Pick from page'}</button>
      </div>
      
      <!-- Background Color -->
      <div class="fdh-color-picker" style="text-align: center;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Background</label>
        <div class="fdh-color-swatch fdh-bg-swatch" style="
          width: 60px;
          height: 60px;
          border-radius: 12px;
          margin: 0 auto 8px;
          cursor: pointer;
          border: 3px solid ${pickerMode === 'background' ? '#6366f1' : 'transparent'};
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          background: ${sanitizeColor(backgroundColor) || '#ffffff'};
          transition: transform 0.2s, border-color 0.2s;
        "></div>
        <input type="text" class="fdh-color-input fdh-bg-input" value="${escapeHtml(backgroundColor)}" style="
          width: 100%;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          padding: 8px;
          color: #e2e8f0;
          font-family: inherit;
          font-size: 12px;
          text-align: center;
          text-transform: uppercase;
        ">
        <button
          type="button" class="fdh-pick-bg-btn" style="
          margin-top: 8px;
          width: 100%;
          background: ${pickerMode === 'background' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 6px;
          padding: 6px;
          color: #818cf8;
          font-size: 11px;
          cursor: pointer;
        ">${pickerMode === 'background' ? 'Click page to pick...' : '📍 Pick from page'}</button>
      </div>
    </div>
    
    <!-- Results -->
    <div class="fdh-contrast-results" style="
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    ">
      <div style="text-align: center; margin-bottom: 16px;">
        <div class="fdh-contrast-ratio" style="
          font-size: 48px;
          font-weight: 700;
          color: ${gradeColor};
          line-height: 1;
        ">${result.ratio.toFixed(2)}:1</div>
        <div class="fdh-wcag-grade" style="
          display: inline-block;
          margin-top: 8px;
          padding: 4px 16px;
          background: ${gradeColor}20;
          border: 2px solid ${gradeColor};
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: ${gradeColor};
        ">WCAG ${grade}</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
        <div style="text-align: center; padding: 12px; background: rgba(15, 23, 42, 0.5); border-radius: 8px;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Normal Text</div>
          <div style="font-size: 13px; color: ${result.wcagAA ? '#4ade80' : '#ef4444'};">
            ${result.wcagAA ? '✓ AA Pass' : '✗ AA Fail'}
          </div>
          <div style="font-size: 11px; color: ${result.wcagAAA ? '#4ade80' : '#f87171'};">
            ${result.wcagAAA ? '✓ AAA Pass' : '✗ AAA Fail'}
          </div>
        </div>
        <div style="text-align: center; padding: 12px; background: rgba(15, 23, 42, 0.5); border-radius: 8px;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Large Text</div>
          <div style="font-size: 13px; color: ${result.wcagAALarge ? '#4ade80' : '#ef4444'};">
            ${result.wcagAALarge ? '✓ AA Pass' : '✗ AA Fail'}
          </div>
          <div style="font-size: 11px; color: ${result.wcagAAALarge ? '#4ade80' : '#f87171'};">
            ${result.wcagAAALarge ? '✓ AAA Pass' : '✗ AAA Fail'}
          </div>
        </div>
      </div>
      
      ${
        result.suggestions.length > 0
          ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">💡 Suggestions:</div>
          ${result.suggestions.map((s) => `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 4px;">• ${s}</div>`).join('')}
        </div>
      `
          : ''
      }
    </div>
    
    <!-- Preview -->
    <div class="fdh-contrast-preview" style="
      background: ${backgroundColor};
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    ">
      <p style="
        margin: 0 0 12px;
        font-size: 16px;
        color: ${foregroundColor};
        line-height: 1.5;
      ">${normalText}</p>
      <p style="
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: ${foregroundColor};
        line-height: 1.4;
      ">${largeText}</p>
    </div>
    
    <!-- Actions -->
    <div style="display: flex; gap: 8px;">
      <button
        type="button" class="fdh-swap-btn" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 8px;
        padding: 10px;
        color: #818cf8;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      ">🔄 Swap Colors</button>
      <button
        type="button" class="fdh-copy-btn" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: #818cf8;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      ">📋 Copy Report</button>
    </div>
    
    <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #64748b;">
      Press <kbd style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
    </div>
  `;
}

/**
 * Analyze contrast between two colors
 */
function analyzeContrast(fg: string, bg: string): ContrastResult {
  const ratio = getContrastRatio(fg, bg);

  // WCAG thresholds
  // AA: 4.5:1 for normal, 3:1 for large text
  // AAA: 7:1 for normal, 4.5:1 for large text
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7;
  const wcagAALarge = ratio >= 3;
  const wcagAAALarge = ratio >= 4.5;

  const suggestions: string[] = [];

  if (!wcagAA) {
    suggestions.push('Consider using a darker text color or lighter background');
  }
  if (ratio < 3) {
    suggestions.push('This combination may be difficult to read for many users');
  }

  // Check if colors are too similar
  const rgb1 = hexToRgb(fg);
  const rgb2 = hexToRgb(bg);
  if (rgb1 && rgb2) {
    const diff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    if (diff < 50) {
      suggestions.push('Colors are very similar - increase the contrast difference');
    }
  }

  return {
    ratio,
    wcagAA,
    wcagAAA,
    wcagAALarge,
    wcagAAALarge,
    suggestions,
  };
}

/**
 * Setup event listeners on overlay controls
 */
function setupOverlayControls(): void {
  if (!overlay) return;

  // Close button
  const closeBtn = overlay.querySelector('.fdh-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', disable);
  }

  // Color inputs
  const fgInput = overlay.querySelector('.fdh-fg-input') as HTMLInputElement;
  if (fgInput) {
    fgInput.addEventListener('change', (e) => {
      foregroundColor = (e.target as HTMLInputElement).value;
      updateOverlay();
    });
  }

  const bgInput = overlay.querySelector('.fdh-bg-input') as HTMLInputElement;
  if (bgInput) {
    bgInput.addEventListener('change', (e) => {
      backgroundColor = (e.target as HTMLInputElement).value;
      updateOverlay();
    });
  }

  // Pick from page buttons
  const pickFgBtn = overlay.querySelector('.fdh-pick-fg-btn');
  if (pickFgBtn) {
    pickFgBtn.addEventListener('click', () => {
      pickerMode = pickerMode === 'foreground' ? null : 'foreground';
      updateOverlay();
    });
  }

  const pickBgBtn = overlay.querySelector('.fdh-pick-bg-btn');
  if (pickBgBtn) {
    pickBgBtn.addEventListener('click', () => {
      pickerMode = pickerMode === 'background' ? null : 'background';
      updateOverlay();
    });
  }

  // Swap button
  const swapBtn = overlay.querySelector('.fdh-swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const temp = foregroundColor;
      foregroundColor = backgroundColor;
      backgroundColor = temp;
      updateOverlay();
    });
  }

  // Copy button
  const copyBtn = overlay.querySelector('.fdh-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const result = analyzeContrast(foregroundColor, backgroundColor);
      const report = `
Contrast Analysis Report
========================
Foreground: ${foregroundColor}
Background: ${backgroundColor}
Contrast Ratio: ${result.ratio.toFixed(2)}:1

WCAG Compliance:
- Normal Text AA: ${result.wcagAA ? 'PASS' : 'FAIL'} (needs 4.5:1)
- Normal Text AAA: ${result.wcagAAA ? 'PASS' : 'FAIL'} (needs 7:1)
- Large Text AA: ${result.wcagAALarge ? 'PASS' : 'FAIL'} (needs 3:1)
- Large Text AAA: ${result.wcagAAALarge ? 'PASS' : 'FAIL'} (needs 4.5:1)

Overall Grade: ${result.wcagAAA ? 'AAA' : result.wcagAA ? 'AA' : 'FAIL'}
      `.trim();

      navigator.clipboard.writeText(report).then(() => {
        const btn = copyBtn as HTMLButtonElement;
        btn.textContent = '✓ Copied!';
        setTimeout(() => (btn.textContent = '📋 Copy Report'), 1500);
      });
    });
  }
}

/**
 * Update overlay content
 */
function updateOverlay(): void {
  if (!overlay) return;
  overlay.innerHTML = buildOverlayContent();
  setupOverlayControls();
}

/**
 * Handle page click for color picking
 */
function handlePageClick(e: MouseEvent): void {
  if (!isActive || !pickerMode) return;

  // Don't pick from the overlay itself
  if ((e.target as HTMLElement).closest('.fdh-contrast-overlay')) return;

  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  const computed = window.getComputedStyle(target);

  if (pickerMode === 'foreground') {
    foregroundColor = rgbToHex(computed.color) || '#000000';
  } else {
    foregroundColor = rgbToHex(computed.backgroundColor) || '#ffffff';
  }

  pickerMode = null;
  updateOverlay();
}

/**
 * Convert RGB to Hex
 */
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join('')
  );
}

/**
 * Handle key down
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (pickerMode) {
      pickerMode = null;
      updateOverlay();
    } else {
      disable();
    }
  }
}

/**
 * Handle mouse move during color picking
 */
function handleMouseMove(_event: MouseEvent): void {
  if (!isActive || !pickerMode) return;

  document.body.style.cursor = 'crosshair';
}

/**
 * Enable Contrast Checker
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  if (!overlay) {
    overlay = createOverlay();
  }

  overlay.innerHTML = buildOverlayContent();
  setupOverlayControls();

  clickHandler = handlePageClick;
  keyHandler = handleKeyDown;
  mouseMoveHandler = handleMouseMove;

  document.addEventListener('click', clickHandler, true);
  document.addEventListener('keydown', keyHandler);
  document.addEventListener('mousemove', mouseMoveHandler, { passive: true });

  logger.log('[ContrastChecker] Enabled');
}

/**
 * Disable Contrast Checker
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;
  pickerMode = null;

  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true);
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
  }
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
  }

  document.body.style.cursor = '';

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  logger.log('[ContrastChecker] Disabled');
}

/**
 * Toggle Contrast Checker
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Set colors programmatically
 */
export function setColors(fg: string, bg: string): void {
  foregroundColor = fg;
  backgroundColor = bg;
  if (isActive) {
    updateOverlay();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; foreground: string; background: string } {
  return {
    enabled: isActive,
    foreground: foregroundColor,
    background: backgroundColor,
  };
}

/**
 * Cleanup
 */
export function destroy(): void {
  disable();
}

// Export singleton API
export const contrastChecker = {
  enable,
  disable,
  toggle,
  setColors,
  getState,
  destroy,
};

export default contrastChecker;
