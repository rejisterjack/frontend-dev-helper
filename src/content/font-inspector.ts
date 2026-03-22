import { logger } from '../utils/logger';

/**
 * Font Inspector Content Script for FrontendDevHelper
 * Displays font information tooltip on text element hover
 */

interface FontInfo {
  family: string;
  fallbackStack: string[];
  size: string;
  sizeRem: string;
  weight: string;
  lineHeight: string;
  letterSpacing: string;
  source: 'google' | 'adobe' | 'self-hosted' | 'system' | 'unknown';
  sourceUrl?: string;
}

interface InspectorState {
  isActive: boolean;
  currentElement: HTMLElement | null;
}

interface OriginalOutlineStyles {
  outline: string;
  outlineOffset: string;
}

/** WeakMap to store original outline styles without polluting DOM element properties */
const originalOutlineStyles = new WeakMap<HTMLElement, OriginalOutlineStyles>();

const state: InspectorState = {
  isActive: false,
  currentElement: null,
};

// DOM Elements
let fontTooltip: HTMLElement | null = null;
let highlightedElement: HTMLElement | null = null;

/**
 * Get font source by analyzing loaded fonts and stylesheets
 */
function detectFontSource(fontFamily: string): { source: FontInfo['source']; url?: string } {
  const cleanFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim();

  // Check Google Fonts
  const googleFontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
  for (const link of googleFontLinks) {
    const href = link.getAttribute('href') || '';
    if (href.toLowerCase().includes(cleanFamily.toLowerCase().replace(/\s+/g, '+'))) {
      return { source: 'google', url: href };
    }
  }

  // Check for WebFont loader (async Google Fonts)
  interface WebFontLoader {
    WebFont?: unknown;
    WebFontConfig?: { google?: { families?: string[] } };
  }
  const win = window as unknown as WebFontLoader;
  if (win.WebFont) {
    const webFontConfig = win.WebFontConfig;
    if (
      webFontConfig?.google?.families?.some((f: string) =>
        f.toLowerCase().includes(cleanFamily.toLowerCase())
      )
    ) {
      return { source: 'google', url: 'Loaded via WebFont.js' };
    }
  }

  // Check Adobe Typekit
  const typekitScripts = document.querySelectorAll(
    'script[src*="typekit.net"], script[src*="use.typekit.net"]'
  );
  if (typekitScripts.length > 0) {
    for (const script of typekitScripts) {
      const src = script.getAttribute('src') || '';
      if (src.includes('typekit.net') || src.includes('adobe')) {
        return { source: 'adobe', url: src };
      }
    }
  }

  // Check Adobe Fonts (new Typekit)
  const adobeLinks = document.querySelectorAll(
    'link[href*="use.typekit.net"], link[href*="p.typekit.net"]'
  );
  if (adobeLinks.length > 0) {
    return { source: 'adobe', url: adobeLinks[0].getAttribute('href') || undefined };
  }

  // Check if self-hosted by looking at stylesheets
  const stylesheets = Array.from(document.styleSheets);
  for (const sheet of stylesheets) {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      for (const rule of rules) {
        if (rule instanceof CSSFontFaceRule) {
          const ruleFamily = rule.style.fontFamily?.replace(/['"]/g, '').trim();
          if (ruleFamily?.toLowerCase() === cleanFamily.toLowerCase()) {
            const src = (rule.style as unknown as Record<string, string>).src;
            if (src) {
              const urlMatch = src.match(/url\(["']?([^"')]+)["']?\)/);
              if (urlMatch) {
                const fontUrl = new URL(urlMatch[1], location.href);
                const isSelfHosted = fontUrl.origin === location.origin;
                return {
                  source: isSelfHosted ? 'self-hosted' : 'unknown',
                  url: fontUrl.href,
                };
              }
            }
            return { source: 'self-hosted' };
          }
        }
      }
    } catch (_e) {
      // Cross-origin stylesheet, skip
    }
  }

  // Check if it's likely a system font
  const systemFonts = [
    'arial',
    'helvetica',
    'times',
    'times new roman',
    'courier',
    'courier new',
    'verdana',
    'georgia',
    'palatino',
    'garamond',
    'bookman',
    'comic sans ms',
    'trebuchet ms',
    'arial black',
    'impact',
    'system-ui',
    '-apple-system',
    'blinkmacsystemfont',
    'segoe ui',
    'roboto',
    'oxygen',
    'ubuntu',
    'cantarell',
    'fira sans',
    'droid sans',
    'helvetica neue',
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
  ];

  if (systemFonts.some((sf) => cleanFamily.toLowerCase().includes(sf))) {
    return { source: 'system' };
  }

  return { source: 'unknown' };
}

/**
 * Get computed font information from element
 */
function getFontInfo(element: HTMLElement): FontInfo {
  const computedStyle = window.getComputedStyle(element);

  // Get font family and parse fallback stack
  const fullFontFamily = computedStyle.fontFamily;
  const fontStack = fullFontFamily.split(',').map((f) => f.trim().replace(/['"]/g, ''));
  const primaryFamily = fontStack[0] || 'Unknown';
  const fallbacks = fontStack.slice(1);

  // Get font size and convert to rem
  const fontSizePx = parseFloat(computedStyle.fontSize);
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const fontSizeRem = (fontSizePx / rootFontSize).toFixed(3);

  // Get other properties
  const weight = computedStyle.fontWeight;
  const lineHeight = computedStyle.lineHeight;
  const letterSpacing = computedStyle.letterSpacing;

  // Detect source
  const { source, url } = detectFontSource(primaryFamily);

  return {
    family: primaryFamily,
    fallbackStack: fallbacks,
    size: `${fontSizePx}px`,
    sizeRem: `${fontSizeRem}rem`,
    weight,
    lineHeight: lineHeight === 'normal' ? 'normal' : `${parseFloat(lineHeight).toFixed(2)}`,
    letterSpacing: letterSpacing === 'normal' ? 'normal' : letterSpacing,
    source,
    sourceUrl: url,
  };
}

/**
 * Generate CSS for the font
 */
function generateFontCSS(info: FontInfo): string {
  const lines = [
    `font-family: "${info.family}"${info.fallbackStack.length > 0 ? `, ${info.fallbackStack.join(', ')}` : ''};`,
    `font-size: ${info.sizeRem}; /* ${info.size} */`,
    `font-weight: ${info.weight};`,
  ];

  if (info.lineHeight !== 'normal') {
    lines.push(`line-height: ${info.lineHeight};`);
  }

  if (info.letterSpacing !== 'normal') {
    lines.push(`letter-spacing: ${info.letterSpacing};`);
  }

  return lines.join('\n');
}

/**
 * Get human-readable source label
 */
function getSourceLabel(source: FontInfo['source']): string {
  switch (source) {
    case 'google':
      return 'Google Fonts';
    case 'adobe':
      return 'Adobe Fonts (Typekit)';
    case 'self-hosted':
      return 'Self-hosted';
    case 'system':
      return 'System Font';
    default:
      return 'Unknown';
  }
}

/**
 * Create the font tooltip element
 */
function createFontTooltip(): HTMLElement {
  if (fontTooltip) return fontTooltip;

  const tooltip = document.createElement('div');
  tooltip.id = 'fdh-font-tooltip';
  tooltip.className = 'fdh-font-tooltip';
  tooltip.innerHTML = `
    <div class="fdh-font-header">
      <span class="fdh-font-family"></span>
      <span class="fdh-font-badge"></span>
    </div>
    <div class="fdh-font-details">
      <div class="fdh-font-row">
        <span class="fdh-label">Size:</span>
        <span class="fdh-value fdh-font-size"></span>
      </div>
      <div class="fdh-font-row">
        <span class="fdh-label">Weight:</span>
        <span class="fdh-value fdh-font-weight"></span>
      </div>
      <div class="fdh-font-row">
        <span class="fdh-label">Line Height:</span>
        <span class="fdh-value fdh-line-height"></span>
      </div>
      <div class="fdh-font-row">
        <span class="fdh-label">Letter Spacing:</span>
        <span class="fdh-value fdh-letter-spacing"></span>
      </div>
      <div class="fdh-font-row fdh-fallbacks" style="display: none;">
        <span class="fdh-label">Fallbacks:</span>
        <span class="fdh-value fdh-fallback-stack"></span>
      </div>
      <div class="fdh-font-row fdh-source-url" style="display: none;">
        <span class="fdh-label">Source:</span>
        <a class="fdh-value fdh-source-link" target="_blank" rel="noopener"></a>
      </div>
    </div>
    <button class="fdh-copy-css-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy CSS
    </button>
  `;

  // Apply base styles
  tooltip.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #0f172a;
    color: #f8fafc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 240px;
    max-width: 320px;
    pointer-events: none;
    display: none;
    border: 1px solid #334155;
  `;

  // Style header
  const header = tooltip.querySelector('.fdh-font-header') as HTMLElement;
  if (header) {
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #334155;
    `;
  }

  // Style font family name
  const familyName = tooltip.querySelector('.fdh-font-family') as HTMLElement;
  if (familyName) {
    familyName.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      color: #f8fafc;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    `;
  }

  // Style badge
  const badge = tooltip.querySelector('.fdh-font-badge') as HTMLElement;
  if (badge) {
    badge.style.cssText = `
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #3b82f6;
      color: white;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.025em;
    `;
  }

  // Style details container
  const details = tooltip.querySelector('.fdh-font-details') as HTMLElement;
  if (details) {
    details.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    `;
  }

  // Style rows
  const rows = tooltip.querySelectorAll('.fdh-font-row');
  rows.forEach((row) => {
    (row as HTMLElement).style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
  });

  // Style labels
  const labels = tooltip.querySelectorAll('.fdh-label');
  labels.forEach((label) => {
    (label as HTMLElement).style.cssText = `
      color: #94a3b8;
      font-size: 12px;
    `;
  });

  // Style values
  const values = tooltip.querySelectorAll('.fdh-value');
  values.forEach((value) => {
    (value as HTMLElement).style.cssText = `
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    `;
  });

  // Style fallback stack
  const fallbackStack = tooltip.querySelector('.fdh-fallback-stack') as HTMLElement;
  if (fallbackStack) {
    fallbackStack.style.cssText = `
      color: #94a3b8;
      font-size: 11px;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    `;
  }

  // Style source link
  const sourceLink = tooltip.querySelector('.fdh-source-link') as HTMLElement;
  if (sourceLink) {
    sourceLink.style.cssText = `
      color: #60a5fa;
      text-decoration: none;
      font-size: 11px;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    sourceLink.addEventListener('mouseenter', () => {
      sourceLink.style.textDecoration = 'underline';
    });
    sourceLink.addEventListener('mouseleave', () => {
      sourceLink.style.textDecoration = 'none';
    });
  }

  // Style copy button
  const copyBtn = tooltip.querySelector('.fdh-copy-css-btn') as HTMLElement;
  if (copyBtn) {
    copyBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      pointer-events: auto;
      transition: background 0.15s ease;
    `;
    copyBtn.addEventListener('mouseenter', () => {
      copyBtn.style.background = '#2563eb';
    });
    copyBtn.addEventListener('mouseleave', () => {
      copyBtn.style.background = '#3b82f6';
    });
    copyBtn.addEventListener('click', async () => {
      const css = copyBtn.getAttribute('data-css');
      if (css) {
        try {
          await navigator.clipboard.writeText(css);
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
          `;
          copyBtn.style.background = '#10b981';
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '#3b82f6';
          }, 1500);
        } catch (err) {
          logger.error('Failed to copy:', err);
        }
      }
    });
  }

  document.body.appendChild(tooltip);
  fontTooltip = tooltip;
  return tooltip;
}

/**
 * Update tooltip with font information
 */
function updateTooltip(info: FontInfo): void {
  const tooltip = createFontTooltip();

  // Update content
  const familyEl = tooltip.querySelector('.fdh-font-family');
  const badgeEl = tooltip.querySelector('.fdh-font-badge');
  const sizeEl = tooltip.querySelector('.fdh-font-size');
  const weightEl = tooltip.querySelector('.fdh-font-weight');
  const lineHeightEl = tooltip.querySelector('.fdh-line-height');
  const letterSpacingEl = tooltip.querySelector('.fdh-letter-spacing');
  const fallbacksRow = tooltip.querySelector('.fdh-fallbacks') as HTMLElement;
  const fallbackStackEl = tooltip.querySelector('.fdh-fallback-stack');
  const sourceUrlRow = tooltip.querySelector('.fdh-source-url') as HTMLElement;
  const sourceLinkEl = tooltip.querySelector('.fdh-source-link') as HTMLAnchorElement;
  const copyBtn = tooltip.querySelector('.fdh-copy-css-btn') as HTMLElement;

  if (familyEl) familyEl.textContent = info.family;
  if (badgeEl) {
    badgeEl.textContent = getSourceLabel(info.source);
    // Update badge color based on source
    const badgeColors: Record<string, string> = {
      google: '#4285f4',
      adobe: '#ff0000',
      'self-hosted': '#10b981',
      system: '#64748b',
      unknown: '#94a3b8',
    };
    (badgeEl as HTMLElement).style.background = badgeColors[info.source] || '#64748b';
  }
  if (sizeEl) sizeEl.textContent = `${info.size} / ${info.sizeRem}`;
  if (weightEl) weightEl.textContent = info.weight;
  if (lineHeightEl) lineHeightEl.textContent = info.lineHeight;
  if (letterSpacingEl) letterSpacingEl.textContent = info.letterSpacing;

  // Show/hide fallback stack
  if (fallbacksRow && fallbackStackEl) {
    if (info.fallbackStack.length > 0) {
      fallbacksRow.style.display = 'flex';
      fallbackStackEl.textContent = info.fallbackStack.join(', ');
    } else {
      fallbacksRow.style.display = 'none';
    }
  }

  // Show/hide source URL
  if (sourceUrlRow && sourceLinkEl) {
    if (info.sourceUrl) {
      sourceUrlRow.style.display = 'flex';
      sourceLinkEl.textContent =
        info.sourceUrl.length > 40 ? `${info.sourceUrl.slice(0, 40)}...` : info.sourceUrl;
      sourceLinkEl.href = info.sourceUrl;
      sourceLinkEl.title = info.sourceUrl;
    } else {
      sourceUrlRow.style.display = 'none';
    }
  }

  // Store CSS for copy button
  if (copyBtn) {
    copyBtn.setAttribute('data-css', generateFontCSS(info));
  }
}

/**
 * Show tooltip at position
 */
function showTooltip(x: number, y: number): void {
  const tooltip = createFontTooltip();

  // Position tooltip
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = x + 15;
  let top = y + 15;

  // Keep within viewport
  if (left + 320 > window.innerWidth) {
    left = x - tooltipRect.width - 15;
  }
  if (top + tooltipRect.height > window.innerHeight) {
    top = y - tooltipRect.height - 15;
  }

  tooltip.style.left = `${Math.max(10, left)}px`;
  tooltip.style.top = `${Math.max(10, top)}px`;
  tooltip.style.display = 'block';
}

/**
 * Hide tooltip
 */
function hideTooltip(): void {
  if (fontTooltip) {
    fontTooltip.style.display = 'none';
  }
}

/**
 * Highlight element with outline
 */
function highlightElement(element: HTMLElement): void {
  removeHighlight();
  highlightedElement = element;

  // Store original outline styles in WeakMap to avoid polluting the DOM element
  originalOutlineStyles.set(element, {
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
  });

  element.style.outline = '2px solid #3b82f6';
  element.style.outlineOffset = '2px';
}

/**
 * Remove element highlight
 */
function removeHighlight(): void {
  if (highlightedElement) {
    const original = originalOutlineStyles.get(highlightedElement);
    highlightedElement.style.outline = original?.outline ?? '';
    highlightedElement.style.outlineOffset = original?.outlineOffset ?? '';
    originalOutlineStyles.delete(highlightedElement);
    highlightedElement = null;
  }
}

/**
 * Check if element is valid for font inspection
 */
function isValidTextElement(element: HTMLElement): boolean {
  // Skip our own UI elements
  if (element.id?.startsWith('fdh-') || element.closest('#fdh-')) {
    return false;
  }

  // Skip script, style, and meta elements
  const tagName = element.tagName.toLowerCase();
  if (['script', 'style', 'meta', 'link', 'head', 'html', 'body'].includes(tagName)) {
    return false;
  }

  // Check if element or its children have visible text
  const hasVisibleText =
    element.childNodes.length > 0 &&
    Array.from(element.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent?.trim().length ?? 0) > 0;
      }
      return false;
    });

  if (!hasVisibleText) return false;

  // Check visibility
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
    return false;
  }

  return true;
}

/**
 * Handle mouse over
 */
function handleMouseOver(e: MouseEvent): void {
  if (!state.isActive) return;

  const target = e.target as HTMLElement;
  if (!target || target === state.currentElement) return;

  if (!isValidTextElement(target)) return;

  state.currentElement = target;

  const fontInfo = getFontInfo(target);
  updateTooltip(fontInfo);
  showTooltip(e.clientX, e.clientY);
  highlightElement(target);
}

/**
 * Handle mouse move for tooltip positioning
 */
function handleMouseMove(e: MouseEvent): void {
  if (!state.isActive || !state.currentElement) return;
  showTooltip(e.clientX, e.clientY);
}

/**
 * Handle mouse out
 */
function handleMouseOut(e: MouseEvent): void {
  if (!state.isActive) return;

  const target = e.target as HTMLElement;
  if (target === state.currentElement) {
    state.currentElement = null;
    hideTooltip();
    removeHighlight();
  }
}

/**
 * Activate font inspector
 */
export function activateFontInspector(): void {
  if (state.isActive) return;

  state.isActive = true;

  // Add event listeners
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseout', handleMouseOut, true);

  // Show activation notification
  showNotification('Font Inspector activated - Hover over text elements');
}

/**
 * Deactivate font inspector
 */
export function deactivateFontInspector(): void {
  state.isActive = false;
  state.currentElement = null;

  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseout', handleMouseOut, true);

  hideTooltip();
  removeHighlight();
}

/**
 * Show notification
 */
function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.className = 'fdh-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    border: 1px solid #334155;
    animation: fdh-slideIn 0.3s ease;
  `;

  // Add animation
  if (!document.getElementById('fdh-animations')) {
    const style = document.createElement('style');
    style.id = 'fdh-animations';
    style.textContent = `
      @keyframes fdh-slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fdh-slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fdh-slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Toggle font inspector state
 */
export function toggleFontInspector(): void {
  if (state.isActive) {
    deactivateFontInspector();
  } else {
    activateFontInspector();
  }
}

/**
 * Get current inspector state
 */
export function getInspectorState(): InspectorState {
  return { ...state };
}

/**
 * Cleanup function
 */
export function cleanupFontInspector(): void {
  deactivateFontInspector();

  if (fontTooltip) {
    fontTooltip.remove();
    fontTooltip = null;
  }
}

/**
 * Initialize font inspector - listen for messages from extension
 */
export function initializeFontInspector(): void {
  // Listen for messages from the extension
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.action) {
        case 'ACTIVATE_FONT_INSPECTOR':
          activateFontInspector();
          sendResponse({ success: true, active: true });
          break;
        case 'DEACTIVATE_FONT_INSPECTOR':
          deactivateFontInspector();
          sendResponse({ success: true, active: false });
          break;
        case 'TOGGLE_FONT_INSPECTOR':
          toggleFontInspector();
          sendResponse({ success: true, active: state.isActive });
          break;
        case 'GET_FONT_INSPECTOR_STATE':
          sendResponse({ success: true, active: state.isActive });
          break;
        case 'CLEANUP':
          cleanupFontInspector();
          sendResponse({ success: true });
          break;
      }
      return true;
    });
  }
}

// Auto-initialize if running as content script
if (typeof window !== 'undefined') {
  initializeFontInspector();
}

// Wrapper object for consistent API
export const fontInspector = {
  enable: activateFontInspector,
  disable: deactivateFontInspector,
  toggle: toggleFontInspector,
  getState: () => ({ enabled: state.isActive }),
  destroy: cleanupFontInspector,
};
