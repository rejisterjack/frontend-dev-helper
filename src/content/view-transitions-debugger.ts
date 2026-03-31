/**
 * View Transitions API Debugger
 *
 * Debug and visualize the View Transitions API:
 * - Detect when view transitions are active
 * - Visualize the pseudo-element tree (::view-transition, ::view-transition-group, etc.)
 * - Force-play transitions for debugging
 * - Inspect snapshot styles
 */

import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';

interface ViewTransitionInfo {
  isActive: boolean;
  phase: 'idle' | 'preparing' | 'animating' | 'finished';
  pseudoElements: PseudoElementInfo[];
  capturedElements: CapturedElementInfo[];
}

interface PseudoElementInfo {
  name: string;
  type: 'root' | 'group' | 'image-pair' | 'old' | 'new';
  styles: Record<string, string>;
}

interface CapturedElementInfo {
  name: string;
  element: Element | null;
  rect: DOMRect | null;
}

// State
let isActive = false;
let debugPanel: HTMLElement | null = null;
let transitionObserver: MutationObserver | null = null;
let currentTransition: ViewTransition | null = null;

/**
 * Check if View Transitions API is supported
 */
export function isSupported(): boolean {
  return 'startViewTransition' in document;
}

/**
 * Detect current view transition state
 */
function detectTransitionState(): ViewTransitionInfo {
  const info: ViewTransitionInfo = {
    isActive: false,
    phase: 'idle',
    pseudoElements: [],
    capturedElements: [],
  };

  // Check for view transition pseudo-elements in computed styles
  const testElement = document.createElement('div');
  document.body.appendChild(testElement);

  // Try to detect active transitions by checking for view-transition-name usage
  const elementsWithTransitionName = document.querySelectorAll('[style*="view-transition-name"], [style*="viewTransitionName"]');

  for (const el of elementsWithTransitionName) {
    const style = (el as HTMLElement).style;
    const name = style.viewTransitionName || style.cssText.match(/view-transition-name:\s*([^;]+)/)?.[1];

    if (name && name !== 'none') {
      info.capturedElements.push({
        name: name.trim(),
        element: el,
        rect: el.getBoundingClientRect(),
      });
    }
  }

  // Check for ::view-transition pseudo-elements by inspecting stylesheets
  info.pseudoElements = detectPseudoElements();

  // Determine phase based on presence of transition elements
  if (info.capturedElements.length > 0 || info.pseudoElements.length > 0) {
    info.isActive = true;
    info.phase = 'animating';
  }

  document.body.removeChild(testElement);

  return info;
}

/**
 * Detect view transition pseudo-elements from stylesheets
 */
function detectPseudoElements(): PseudoElementInfo[] {
  const pseudoElements: PseudoElementInfo[] = [];
  const sheets = document.styleSheets;

  for (const sheet of sheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          if (selector && selector.includes('::view-transition')) {
            const type = getPseudoElementType(selector);
            const styles: Record<string, string> = {};

            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              styles[prop] = rule.style.getPropertyValue(prop);
            }

            pseudoElements.push({
              name: selector,
              type,
              styles,
            });
          }
        }
      }
    } catch {
      // Cross-origin stylesheet - skip
      continue;
    }
  }

  return pseudoElements;
}

/**
 * Get the type of a view transition pseudo-element
 */
function getPseudoElementType(selector: string): PseudoElementInfo['type'] {
  if (selector.includes('::view-transition-old')) return 'old';
  if (selector.includes('::view-transition-new')) return 'new';
  if (selector.includes('::view-transition-image-pair')) return 'image-pair';
  if (selector.includes('::view-transition-group')) return 'group';
  return 'root';
}

/**
 * Create debug panel
 */
function createDebugPanel(info: ViewTransitionInfo): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'fdh-vt-panel';
  panel.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    width: 360px;
    max-height: 80vh;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 12px;
    padding: 16px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #cdd6f4;
    overflow-y: auto;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #313244;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 600; font-size: 14px;';
  title.textContent = 'View Transitions Debugger';

  const status = document.createElement('span');
  status.style.cssText = `
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    ${info.isActive
      ? 'background: #a6e3a1; color: #1e1e2e;'
      : 'background: #6c7086; color: #cdd6f4;'}
  `;
  status.textContent = info.isActive ? 'Active' : 'Idle';

  header.appendChild(title);
  header.appendChild(status);
  panel.appendChild(header);

  // Support indicator
  if (!isSupported()) {
    const supportWarning = document.createElement('div');
    supportWarning.style.cssText = `
      background: #f9e2af;
      color: #1e1e2e;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 12px;
    `;
    supportWarning.innerHTML = `
      <strong>⚠️ Not Supported</strong><br>
      View Transitions API is not supported in this browser.
    `;
    panel.appendChild(supportWarning);
    return panel;
  }

  // Phase info
  const phaseSection = document.createElement('div');
  phaseSection.style.cssText = 'margin-bottom: 16px;';
  phaseSection.innerHTML = `
    <div style="color: #6c7086; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Phase</div>
    <div style="font-family: monospace; color: ${getPhaseColor(info.phase)};">${info.phase}</div>
  `;
  panel.appendChild(phaseSection);

  // Captured elements
  if (info.capturedElements.length > 0) {
    const elementsSection = document.createElement('div');
    elementsSection.style.cssText = 'margin-bottom: 16px;';

    const elementsHeader = document.createElement('div');
    elementsHeader.style.cssText = `
      color: #6c7086;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 8px;
    `;
    elementsHeader.textContent = `Captured Elements (${info.capturedElements.length})`;
    elementsSection.appendChild(elementsHeader);

    info.capturedElements.forEach((el) => {
      const elItem = document.createElement('div');
      elItem.style.cssText = `
        background: #313244;
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 6px;
        font-family: monospace;
        font-size: 12px;
      `;
      elItem.innerHTML = `
        <div style="color: #89b4fa; font-weight: 600;">${el.name}</div>
        ${el.rect
          ? `<div style="color: #6c7086; font-size: 11px; margin-top: 2px;">
              ${Math.round(el.rect.width)}×${Math.round(el.rect.height)}
            </div>`
          : ''}
      `;
      elementsSection.appendChild(elItem);
    });

    panel.appendChild(elementsSection);
  }

  // Pseudo-elements
  if (info.pseudoElements.length > 0) {
    const pseudoSection = document.createElement('div');
    pseudoSection.style.cssText = 'margin-bottom: 16px;';

    const pseudoHeader = document.createElement('div');
    pseudoHeader.style.cssText = `
      color: #6c7086;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 8px;
    `;
    pseudoHeader.textContent = `Pseudo-Elements (${info.pseudoElements.length})`;
    pseudoSection.appendChild(pseudoHeader);

    info.pseudoElements.slice(0, 5).forEach((pseudo) => {
      const pseudoItem = document.createElement('div');
      pseudoItem.style.cssText = `
        background: #313244;
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 6px;
        font-family: monospace;
        font-size: 11px;
      `;
      pseudoItem.innerHTML = `
        <div style="color: #f5c2e7;">${pseudo.name}</div>
        <div style="color: #6c7086; margin-top: 2px;">type: ${pseudo.type}</div>
      `;
      pseudoSection.appendChild(pseudoItem);
    });

    if (info.pseudoElements.length > 5) {
      const more = document.createElement('div');
      more.style.cssText = 'color: #6c7086; font-size: 11px; text-align: center;';
      more.textContent = `+${info.pseudoElements.length - 5} more`;
      pseudoSection.appendChild(more);
    }

    panel.appendChild(pseudoSection);
  }

  // Force transition button (for testing)
  const forceButton = document.createElement('button');
  forceButton.style.cssText = `
    width: 100%;
    padding: 10px;
    background: #45475a;
    border: none;
    border-radius: 6px;
    color: #cdd6f4;
    font-size: 12px;
    cursor: pointer;
    margin-top: 8px;
  `;
  forceButton.textContent = 'Refresh Detection';
  forceButton.onclick = () => updatePanel();
  panel.appendChild(forceButton);

  // Close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: #6c7086;
    font-size: 18px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeButton.textContent = '×';
  closeButton.onclick = () => disable();
  panel.appendChild(closeButton);

  return panel;
}

/**
 * Get color for transition phase
 */
function getPhaseColor(phase: ViewTransitionInfo['phase']): string {
  switch (phase) {
    case 'idle':
      return '#6c7086';
    case 'preparing':
      return '#f9e2af';
    case 'animating':
      return '#a6e3a1';
    case 'finished':
      return '#89b4fa';
    default:
      return '#cdd6f4';
  }
}

/**
 * Update the debug panel
 */
function updatePanel(): void {
  if (!isActive) return;

  const info = detectTransitionState();

  if (debugPanel) {
    debugPanel.remove();
  }

  debugPanel = createDebugPanel(info);
  document.body.appendChild(debugPanel);
}

/**
 * Setup mutation observer to detect transition changes
 */
function setupObserver(): void {
  transitionObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        if (target.style.viewTransitionName) {
          updatePanel();
          break;
        }
      }
    }
  });

  transitionObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: true,
  });
}

/**
 * Enable View Transitions Debugger
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  updatePanel();
  setupObserver();

  logger.log('[ViewTransitionsDebugger] Enabled');
}

/**
 * Disable View Transitions Debugger
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  if (debugPanel) {
    debugPanel.remove();
    debugPanel = null;
  }

  transitionObserver?.disconnect();
  transitionObserver = null;

  logger.log('[ViewTransitionsDebugger] Disabled');
}

/**
 * Toggle View Transitions Debugger
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
export function getState(): { enabled: boolean; supported: boolean } {
  return { enabled: isActive, supported: isSupported() };
}

// Default export
export default {
  enable,
  disable,
  toggle,
  getState,
  isSupported,
};
