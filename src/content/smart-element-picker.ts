/**
 * Smart Element Picker
 *
 * Click any element to get a unified panel showing ALL tool data at once:
 * - CSS properties, spacing, fonts, colors, contrast, ARIA, z-index
 * - "One-click inspect" that runs all relevant tools on the selected element
 */

import type { ElementInfo } from '@/types';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';

interface ElementAnalysis {
  info: ElementInfo;
  styles: Record<string, string>;
  computed: CSSStyleDeclaration;
  boxModel: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
    border: { top: number; right: number; bottom: number; left: number };
    content: { width: number; height: number };
  };
  colors: {
    foreground: string;
    background: string;
    contrastRatio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  };
  fonts: {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
    letterSpacing: string;
  };
  accessibility: {
    ariaLabel: string | null;
    ariaDescribedBy: string | null;
    role: string | null;
    tabIndex: number | null;
    focusable: boolean;
  };
  zIndex: number | null;
  position: {
    type: string;
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

let isActive = false;
let highlightOverlay: HTMLElement | null = null;
let infoPanel: HTMLElement | null = null;

let boundHandlers: {
  mouseMove: (e: MouseEvent) => void;
  click: (e: MouseEvent) => void;
  keyDown: (e: KeyboardEvent) => void;
} | null = null;

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color string to RGB array
 */
function parseColor(color: string): [number, number, number] | null {
  const div = document.createElement('div');
  div.style.color = color;
  div.style.display = 'none';
  document.body.appendChild(div);
  const computed = getComputedStyle(div).color;
  document.body.removeChild(div);

  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return null;
}

/**
 * Analyze an element comprehensively
 */
function analyzeElement(element: HTMLElement): ElementAnalysis {
  const computed = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  // Get colors
  const foreground = computed.color;
  const background = computed.backgroundColor;
  const contrastRatio = getContrastRatio(foreground, background);

  // Get box model
  const boxModel = {
    margin: {
      top: parseFloat(computed.marginTop) || 0,
      right: parseFloat(computed.marginRight) || 0,
      bottom: parseFloat(computed.marginBottom) || 0,
      left: parseFloat(computed.marginLeft) || 0,
    },
    padding: {
      top: parseFloat(computed.paddingTop) || 0,
      right: parseFloat(computed.paddingRight) || 0,
      bottom: parseFloat(computed.paddingBottom) || 0,
      left: parseFloat(computed.paddingLeft) || 0,
    },
    border: {
      top: parseFloat(computed.borderTopWidth) || 0,
      right: parseFloat(computed.borderRightWidth) || 0,
      bottom: parseFloat(computed.borderBottomWidth) || 0,
      left: parseFloat(computed.borderLeftWidth) || 0,
    },
    content: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };

  // Get position info
  const zIndex = computed.zIndex !== 'auto' ? parseInt(computed.zIndex) : null;

  return {
    info: {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      class: element.className || null,
      classes: Array.from(element.classList),
      selector: generateSelector(element),
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top + window.scrollY),
        left: Math.round(rect.left + window.scrollX),
      },
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
      styles: {
        display: computed.display,
        position: computed.position,
        color: foreground,
        backgroundColor: background,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        margin: computed.margin,
        padding: computed.padding,
        borderRadius: computed.borderRadius,
      },
      inlineStyles: element.style.cssText
        ? Object.fromEntries(
            element.style.cssText
              .split(';')
              .filter(Boolean)
              .map((s) => {
                const [k, v] = s.split(':');
                return [k.trim(), v.trim()];
              })
          )
        : {},
      text: element.textContent?.slice(0, 200) || null,
      children: element.children.length,
      aria: {
        label: element.getAttribute('aria-label'),
        labelledBy: element.getAttribute('aria-labelledby'),
        describedBy: element.getAttribute('aria-describedby'),
        role: element.getAttribute('role'),
      },
    },
    styles: Object.fromEntries(
      Array.from(computed).map((prop) => [prop, computed.getPropertyValue(prop)])
    ),
    computed,
    boxModel,
    colors: {
      foreground,
      background: background === 'rgba(0, 0, 0, 0)' ? 'transparent' : background,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      wcagAA: contrastRatio >= 4.5,
      wcagAAA: contrastRatio >= 7,
    },
    fonts: {
      family: computed.fontFamily,
      size: computed.fontSize,
      weight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
    },
    accessibility: {
      ariaLabel: element.getAttribute('aria-label'),
      ariaDescribedBy: element.getAttribute('aria-describedby'),
      role: element.getAttribute('role'),
      tabIndex: element.tabIndex >= 0 ? element.tabIndex : null,
      focusable:
        element.tagName === 'BUTTON' ||
        element.tagName === 'A' ||
        element.tagName === 'INPUT' ||
        element.tagName === 'SELECT' ||
        element.tagName === 'TEXTAREA' ||
        element.tabIndex >= 0,
    },
    zIndex,
    position: {
      type: computed.position,
      top: computed.top,
      right: computed.right,
      bottom: computed.bottom,
      left: computed.left,
    },
  };
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = Array.from(current.classList).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }

    const parentEl: HTMLElement | null = current.parentElement;
    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter((el) => (el as HTMLElement).tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parentEl;
  }

  return path.join(' > ');
}

/**
 * Create highlight overlay
 */
function createHighlight(element: HTMLElement): void {
  removeHighlight();

  const rect = element.getBoundingClientRect();
  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'fdh-smart-picker-highlight';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    background: rgba(137, 180, 250, 0.2);
    border: 2px solid #89b4fa;
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 0 20px rgba(137, 180, 250, 0.5);
    transition: all 0.1s ease-out;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
  `;

  // Add label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    background: #89b4fa;
    color: #1e1e2e;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
    white-space: nowrap;
  `;
  label.textContent = `${element.tagName.toLowerCase()}${element.className ? '.' + element.classList[0] : ''}`;
  highlightOverlay.appendChild(label);

  document.body.appendChild(highlightOverlay);
}

/**
 * Remove highlight overlay
 */
function removeHighlight(): void {
  highlightOverlay?.remove();
  highlightOverlay = null;
}

/**
 * Update highlight position
 */
function updateHighlight(element: HTMLElement): void {
  if (!highlightOverlay) {
    createHighlight(element);
    return;
  }

  const rect = element.getBoundingClientRect();
  highlightOverlay.style.top = `${rect.top}px`;
  highlightOverlay.style.left = `${rect.left}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;

  const label = highlightOverlay.querySelector('div');
  if (label) {
    label.textContent = `${element.tagName.toLowerCase()}${element.className ? '.' + element.classList[0] : ''}`;
  }
}

/**
 * Create info panel
 */
function createInfoPanel(analysis: ElementAnalysis): void {
  removeInfoPanel();

  infoPanel = document.createElement('div');
  infoPanel.id = 'fdh-smart-picker-panel';
  infoPanel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 80vh;
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #cdd6f4;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  const { info, boxModel, colors, fonts, accessibility, zIndex, position } = analysis;

  infoPanel.innerHTML = `
    <style>
      .fdh-sep-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #313244; background: #181825; }
      .fdh-sep-title { font-size: 14px; font-weight: 600; }
      .fdh-sep-close { background: none; border: none; color: #6c7086; font-size: 20px; cursor: pointer; }
      .fdh-sep-close:hover { color: #f38ba8; }
      .fdh-sep-content { flex: 1; overflow-y: auto; padding: 12px; }
      .fdh-sep-section { margin-bottom: 16px; }
      .fdh-sep-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #89b4fa; margin-bottom: 8px; letter-spacing: 0.5px; }
      .fdh-sep-tag { display: inline-flex; align-items: center; gap: 6px; font-family: monospace; font-size: 12px; }
      .fdh-sep-tag-name { color: #f5c2e7; font-weight: 600; }
      .fdh-sep-tag-id { color: #fab387; }
      .fdh-sep-tag-class { color: #89b4fa; }
      .fdh-sep-dimensions { display: flex; gap: 12px; margin-top: 8px; }
      .fdh-sep-dim { background: #313244; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
      .fdh-sep-dim-label { color: #6c7086; }
      .fdh-sep-dim-value { color: #cdd6f4; font-weight: 600; }
      .fdh-sep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .fdh-sep-item { display: flex; flex-direction: column; background: #313244; padding: 8px; border-radius: 6px; }
      .fdh-sep-item-label { font-size: 10px; color: #6c7086; text-transform: uppercase; margin-bottom: 2px; }
      .fdh-sep-item-value { font-size: 12px; color: #cdd6f4; }
      .fdh-sep-color-preview { width: 16px; height: 16px; border-radius: 3px; border: 1px solid #6c7086; display: inline-block; vertical-align: middle; margin-right: 6px; }
      .fdh-sep-contrast { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
      .fdh-sep-badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 600; }
      .fdh-sep-badge.pass { background: #a6e3a1; color: #1e1e2e; }
      .fdh-sep-badge.fail { background: #f38ba8; color: #1e1e2e; }
      .fdh-sep-box-model { display: grid; gap: 2px; margin-top: 8px; }
      .fdh-sep-box-row { display: flex; gap: 2px; justify-content: center; }
      .fdh-sep-box-cell { padding: 4px 8px; border-radius: 3px; font-size: 10px; text-align: center; min-width: 40px; }
      .fdh-sep-box-margin { background: rgba(249, 226, 175, 0.3); color: #f9e2af; }
      .fdh-sep-box-border { background: rgba(243, 139, 168, 0.3); color: #f38ba8; }
      .fdh-sep-box-padding { background: rgba(166, 227, 161, 0.3); color: #a6e3a1; }
      .fdh-sep-box-content { background: rgba(137, 180, 250, 0.3); color: #89b4fa; font-weight: 600; }
      .fdh-sep-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #313244; background: #181825; }
      .fdh-sep-btn { flex: 1; padding: 8px; background: #45475a; border: none; border-radius: 6px; color: #cdd6f4; font-size: 12px; cursor: pointer; }
      .fdh-sep-btn:hover { background: #585b70; }
      .fdh-sep-copy { font-family: monospace; font-size: 11px; background: #313244; padding: 8px; border-radius: 4px; word-break: break-all; margin-top: 8px; }
    </style>
    <div class="fdh-sep-header">
      <div class="fdh-sep-title">Element Inspector</div>
      <button class="fdh-sep-close">×</button>
    </div>
    <div class="fdh-sep-content">
      <!-- Element Info -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-tag">
          <span class="fdh-sep-tag-name">${info.tag}</span>
          ${info.id ? `<span class="fdh-sep-tag-id">#${info.id}</span>` : ''}
          ${
            info.classes
              ?.slice(0, 3)
              .map((c) => `<span class="fdh-sep-tag-class">.${c}</span>`)
              .join('') || ''
          }
        </div>
        <div class="fdh-sep-dimensions">
          <div class="fdh-sep-dim">
            <span class="fdh-sep-dim-label">Size</span>
            <span class="fdh-sep-dim-value">${info.dimensions.width} × ${info.dimensions.height}</span>
          </div>
          <div class="fdh-sep-dim">
            <span class="fdh-sep-dim-label">Position</span>
            <span class="fdh-sep-dim-value">${info.dimensions.left}, ${info.dimensions.top}</span>
          </div>
        </div>
      </div>

      <!-- Box Model -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Box Model</div>
        <div class="fdh-sep-box-model">
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-margin">margin<br>${boxModel.margin.top}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-margin">${boxModel.margin.left}</div>
            <div class="fdh-sep-box-cell fdh-sep-box-border">border<br>${boxModel.border.top}</div>
            <div class="fdh-sep-box-margin">${boxModel.margin.right}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-border">${boxModel.border.left}</div>
            <div class="fdh-sep-box-cell fdh-sep-box-padding">padding<br>${boxModel.padding.top}</div>
            <div class="fdh-sep-box-border">${boxModel.border.right}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-padding">${boxModel.padding.left}</div>
            <div class="fdh-sep-box-cell fdh-sep-box-content">${boxModel.content.width} × ${boxModel.content.height}</div>
            <div class="fdh-sep-box-padding">${boxModel.padding.right}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-padding">${boxModel.padding.bottom}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-border">${boxModel.border.bottom}</div>
          </div>
          <div class="fdh-sep-box-row">
            <div class="fdh-sep-box-cell fdh-sep-box-margin">${boxModel.margin.bottom}</div>
          </div>
        </div>
      </div>

      <!-- Colors & Contrast -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Colors & Contrast</div>
        <div class="fdh-sep-grid">
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Text</span>
            <span class="fdh-sep-item-value">
              <span class="fdh-sep-color-preview" style="background: ${colors.foreground}"></span>
              ${colors.foreground}
            </span>
          </div>
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Background</span>
            <span class="fdh-sep-item-value">
              <span class="fdh-sep-color-preview" style="background: ${colors.background}"></span>
              ${colors.background}
            </span>
          </div>
        </div>
        <div class="fdh-sep-contrast">
          <span>Contrast: ${colors.contrastRatio}</span>
          <span class="fdh-sep-badge ${colors.wcagAA ? 'pass' : 'fail'}">AA ${colors.wcagAA ? '✓' : '✗'}</span>
          <span class="fdh-sep-badge ${colors.wcagAAA ? 'pass' : 'fail'}">AAA ${colors.wcagAAA ? '✓' : '✗'}</span>
        </div>
      </div>

      <!-- Typography -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Typography</div>
        <div class="fdh-sep-grid">
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Font Size</span>
            <span class="fdh-sep-item-value">${fonts.size}</span>
          </div>
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Weight</span>
            <span class="fdh-sep-item-value">${fonts.weight}</span>
          </div>
          <div class="fdh-sep-item" style="grid-column: 1 / -1;">
            <span class="fdh-sep-item-label">Family</span>
            <span class="fdh-sep-item-value" style="font-size: 11px;">${fonts.family}</span>
          </div>
        </div>
      </div>

      <!-- Positioning -->
      ${
        zIndex !== null || position.type !== 'static'
          ? `
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Positioning</div>
        <div class="fdh-sep-grid">
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Position</span>
            <span class="fdh-sep-item-value">${position.type}</span>
          </div>
          ${
            zIndex !== null
              ? `
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Z-Index</span>
            <span class="fdh-sep-item-value">${zIndex}</span>
          </div>
          `
              : ''
          }
        </div>
      </div>
      `
          : ''
      }

      <!-- Accessibility -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Accessibility</div>
        <div class="fdh-sep-grid">
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Focusable</span>
            <span class="fdh-sep-item-value">${accessibility.focusable ? 'Yes' : 'No'}</span>
          </div>
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Tab Index</span>
            <span class="fdh-sep-item-value">${accessibility.tabIndex ?? 'none'}</span>
          </div>
          ${
            accessibility.role
              ? `
          <div class="fdh-sep-item">
            <span class="fdh-sep-item-label">Role</span>
            <span class="fdh-sep-item-value">${accessibility.role}</span>
          </div>
          `
              : ''
          }
        </div>
        ${accessibility.ariaLabel ? `<div style="margin-top: 8px; font-size: 11px; color: #a6e3a1;">ARIA Label: "${accessibility.ariaLabel}"</div>` : ''}
      </div>

      <!-- Selector -->
      <div class="fdh-sep-section">
        <div class="fdh-sep-section-title">Selector</div>
        <div class="fdh-sep-copy">${info.selector}</div>
      </div>
    </div>
    <div class="fdh-sep-actions">
      <button class="fdh-sep-btn" data-action="copy-selector">Copy Selector</button>
      <button class="fdh-sep-btn" data-action="copy-styles">Copy Styles</button>
      <button class="fdh-sep-btn" data-action="inspect">Full Inspect</button>
    </div>
  `;

  // Close button
  infoPanel.querySelector('.fdh-sep-close')?.addEventListener('click', () => {
    disable();
  });

  // Action buttons
  infoPanel.querySelectorAll('.fdh-sep-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action;
      switch (action) {
        case 'copy-selector':
          navigator.clipboard.writeText(info.selector);
          (btn as HTMLElement).textContent = 'Copied!';
          setTimeout(() => ((btn as HTMLElement).textContent = 'Copy Selector'), 1500);
          break;
        case 'copy-styles':
          navigator.clipboard.writeText(JSON.stringify(info.styles, null, 2));
          (btn as HTMLElement).textContent = 'Copied!';
          setTimeout(() => ((btn as HTMLElement).textContent = 'Copy Styles'), 1500);
          break;
        case 'inspect':
          // Send message to open full inspector
          window.postMessage({ type: 'FDH_OPEN_INSPECTOR', selector: info.selector }, '*');
          break;
      }
    });
  });

  document.body.appendChild(infoPanel);
}

/**
 * Remove info panel
 */
function removeInfoPanel(): void {
  infoPanel?.remove();
  infoPanel = null;
}

/**
 * Handle mouse move
 */
function handleMouseMove(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (target === highlightOverlay || target === infoPanel || infoPanel?.contains(target)) {
    return;
  }

  updateHighlight(target);
}

/**
 * Handle click
 */
function handleClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;

  // Don't select the overlay or panel
  if (target === highlightOverlay || target === infoPanel || infoPanel?.contains(target)) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  // Element selected - could store reference for future use
  void target;
  createHighlight(target);

  const analysis = analyzeElement(target);
  createInfoPanel(analysis);
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
 * Enable Smart Element Picker
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  boundHandlers = {
    mouseMove: handleMouseMove,
    click: handleClick,
    keyDown: handleKeyDown,
  };

  document.addEventListener('mousemove', boundHandlers.mouseMove, true);
  document.addEventListener('click', boundHandlers.click, true);
  document.addEventListener('keydown', boundHandlers.keyDown, true);

  // Add visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'fdh-smart-picker-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    border: 1px solid #313244;
  `;
  indicator.innerHTML = `
    <span style="color: #89b4fa; font-weight: 600;">🔍 Smart Picker Active</span>
    <span style="margin-left: 12px; color: #6c7086;">Click any element to inspect • Press ESC to exit</span>
  `;
  document.body.appendChild(indicator);

  logger.log('[SmartElementPicker] Enabled');
}

/**
 * Disable Smart Element Picker
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  if (boundHandlers) {
    document.removeEventListener('mousemove', boundHandlers.mouseMove, true);
    document.removeEventListener('click', boundHandlers.click, true);
    document.removeEventListener('keydown', boundHandlers.keyDown, true);
    boundHandlers = null;
  }

  removeHighlight();
  removeInfoPanel();

  document.querySelector('#fdh-smart-picker-indicator')?.remove();

  logger.log('[SmartElementPicker] Disabled');
}

/**
 * Toggle Smart Element Picker
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
export function getState(): { enabled: boolean } {
  return { enabled: isActive };
}

// Alias for handler compatibility
export { analyzeElement as inspectElement };

// Default export for registry
export default {
  enable,
  disable,
  toggle,
  getState,
};
