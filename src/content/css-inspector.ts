/**
 * CSS Property Inspector
 * 
 * Hover over any element to see all computed CSS properties.
 * Filter by categories and copy CSS with one click.
 */

import { getContrastRatio, getWCAGRating } from '../utils/color';

interface CSSProperty {
  name: string;
  value: string;
  computed: string;
  inherited: boolean;
}

interface CSSPropertyGroup {
  name: string;
  properties: string[];
}

// CSS Property Categories
const CSS_CATEGORIES: CSSPropertyGroup[] = [
  {
    name: 'Layout',
    properties: ['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'z-index', 'overflow', 'overflow-x', 'overflow-y', 'visibility']
  },
  {
    name: 'Box Model',
    properties: ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'box-sizing']
  },
  {
    name: 'Typography',
    properties: ['font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration', 'text-transform', 'white-space', 'word-wrap', 'text-overflow', 'color']
  },
  {
    name: 'Background',
    properties: ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-attachment', 'background-clip', 'background-origin']
  },
  {
    name: 'Border',
    properties: ['border', 'border-width', 'border-style', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']
  },
  {
    name: 'Flexbox',
    properties: ['flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'align-self', 'order', 'gap', 'row-gap', 'column-gap']
  },
  {
    name: 'Grid',
    properties: ['grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-column', 'grid-row', 'grid-area', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow', 'grid-gap', 'grid-column-gap', 'grid-row-gap', 'justify-items', 'align-items', 'justify-content', 'align-content', 'place-items', 'place-content']
  },
  {
    name: 'Transform',
    properties: ['transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin', 'backface-visibility']
  },
  {
    name: 'Transition',
    properties: ['transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay']
  },
  {
    name: 'Animation',
    properties: ['animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state']
  },
  {
    name: 'Other',
    properties: ['opacity', 'cursor', 'pointer-events', 'user-select', 'box-shadow', 'text-shadow', 'clip', 'clip-path', 'filter', 'mix-blend-mode', 'isolation']
  }
];

// State
let isActive = false;
let tooltip: HTMLElement | null = null;
let highlightedElement: HTMLElement | null = null;
let currentCategory = 'All';
let showInherited = false;

// Event handlers
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Create the CSS Inspector tooltip
 */
function createTooltip(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fdh-css-inspector';
  el.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 16px;
    min-width: 320px;
    max-width: 450px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    display: none;
  `;
  document.body.appendChild(el);
  return el;
}

/**
 * Get all computed CSS properties for an element
 */
function getAllCSSProperties(element: HTMLElement): CSSProperty[] {
  const computed = window.getComputedStyle(element);
  const parent = element.parentElement;
  const parentComputed = parent ? window.getComputedStyle(parent) : null;
  
  const properties: CSSProperty[] = [];
  
  // Get all CSS properties
  for (let i = 0; i < computed.length; i++) {
    const name = computed[i];
    const value = computed.getPropertyValue(name);
    
    // Check if inherited
    let inherited = false;
    if (parentComputed) {
      const parentValue = parentComputed.getPropertyValue(name);
      inherited = value === parentValue && value !== '';
    }
    
    properties.push({
      name,
      value,
      computed: value,
      inherited
    });
  }
  
  return properties;
}

/**
 * Get CSS properties organized by category
 */
function getPropertiesByCategory(
  element: HTMLElement,
  categoryName: string
): CSSProperty[] {
  const allProps = getAllCSSProperties(element);
  
  if (categoryName === 'All') {
    return allProps.filter(p => {
      if (!showInherited && p.inherited) return false;
      // Filter out default/empty values
      return p.value && p.value !== 'none' && p.value !== 'normal' && p.value !== 'auto' && p.value !== '0px';
    });
  }
  
  const category = CSS_CATEGORIES.find(c => c.name === categoryName);
  if (!category) return [];
  
  return allProps.filter(p => {
    if (!showInherited && p.inherited) return false;
    return category.properties.includes(p.name);
  });
}

/**
 * Generate CSS rule for an element
 */
function generateCSSRule(element: HTMLElement, selector: string): string {
  const computed = window.getComputedStyle(element);
  let css = `${selector} {\n`;
  
  // Get important properties
  const importantProps = [
    'display', 'position', 'width', 'height',
    'margin', 'padding', 'background-color', 'color',
    'font-family', 'font-size', 'font-weight',
    'border', 'border-radius'
  ];
  
  for (const prop of importantProps) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
      css += `  ${prop}: ${value};\n`;
    }
  }
  
  css += '}';
  return css;
}

/**
 * Build the tooltip HTML content
 */
function buildTooltipContent(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter(c => !c.startsWith('fdh-'))
    .map(c => `.${c}`)
    .join('');
  
  const selector = `${tagName}${id}${classes}`;
  const rect = element.getBoundingClientRect();
  
  // Get properties for current category
  const properties = getPropertiesByCategory(element, currentCategory);
  
  // Calculate contrast if we have color info
  const computed = window.getComputedStyle(element);
  const bgColor = computed.backgroundColor;
  const textColor = computed.color;
  let contrastInfo = '';
  
  if (bgColor && textColor && bgColor !== 'rgba(0, 0, 0, 0)') {
    const contrast = getContrastRatio(textColor, bgColor);
    const rating = getWCAGRating(contrast);
    contrastInfo = `
      <div class="fdh-contrast-badge" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        background: ${rating === 'AAA' ? 'rgba(34, 197, 94, 0.2)' : rating === 'AA' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
        color: ${rating === 'AAA' ? '#4ade80' : rating === 'AA' ? '#facc15' : '#f87171'};
      ">
        <span>Contrast: ${contrast.toFixed(2)}</span>
        <span>•</span>
        <span>WCAG ${rating}</span>
      </div>
    `;
  }
  
  // Category selector
  const categoryOptions = ['All', ...CSS_CATEGORIES.map(c => c.name)]
    .map(c => `<option value="${c}" ${c === currentCategory ? 'selected' : ''}>${c}</option>`)
    .join('');
  
  // Properties list
  const propertiesHtml = properties.length > 0
    ? properties.slice(0, 50).map(p => `
        <div class="fdh-prop-row" style="
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          ${p.inherited ? 'opacity: 0.6;' : ''}
        ">
          <span class="fdh-prop-name" style="color: #93c5fd;">${p.name}</span>
          <span class="fdh-prop-value" style="color: #a5f3fc; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.value}</span>
        </div>
      `).join('')
    : '<div style="color: #64748b; padding: 8px;">No properties to display</div>';
  
  return `
    <div class="fdh-css-header" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <code style="color: #c084fc; font-size: 14px; font-weight: 600;">${selector}</code>
        <span style="color: #64748b; font-size: 11px;">${Math.round(rect.width)}×${Math.round(rect.height)}</span>
      </div>
      ${contrastInfo}
    </div>
    
    <div class="fdh-css-controls" style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
      <select class="fdh-category-select" style="
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 6px;
        padding: 6px 10px;
        color: #e2e8f0;
        font-size: 12px;
        cursor: pointer;
      ">
        ${categoryOptions}
      </select>
      
      <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; cursor: pointer;">
        <input type="checkbox" class="fdh-inherited-toggle" ${showInherited ? 'checked' : ''} style="cursor: pointer;">
        Show inherited
      </label>
      
      <button class="fdh-copy-css-btn" style="
        margin-left: auto;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 6px;
        padding: 6px 12px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">Copy CSS</button>
    </div>
    
    <div class="fdh-css-properties" style="max-height: 400px; overflow-y: auto;">
      ${propertiesHtml}
      ${properties.length > 50 ? `<div style="color: #64748b; text-align: center; padding: 8px; font-size: 11px;">...and ${properties.length - 50} more</div>` : ''}
    </div>
  `;
}

/**
 * Update tooltip position
 */
function updateTooltipPosition(x: number, y: number): void {
  if (!tooltip) return;
  
  const rect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x + 20;
  let top = y + 20;
  
  // Keep within viewport
  if (left + rect.width > viewportWidth) {
    left = x - rect.width - 10;
  }
  if (top + rect.height > viewportHeight) {
    top = y - rect.height - 10;
  }
  
  tooltip.style.left = `${Math.max(10, left)}px`;
  tooltip.style.top = `${Math.max(10, top)}px`;
}

/**
 * Highlight an element
 */
function highlightElement(element: HTMLElement): void {
  removeHighlight();
  highlightedElement = element;
  element.style.outline = '2px solid #6366f1';
  element.style.outlineOffset = '2px';
}

/**
 * Remove element highlight
 */
function removeHighlight(): void {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement.style.outlineOffset = '';
    highlightedElement = null;
  }
}

/**
 * Handle mouse move
 */
function handleMouseMove(e: MouseEvent): void {
  if (!isActive || !tooltip) return;
  
  const target = e.target as HTMLElement;
  if (!target || target.closest('.fdh-css-inspector')) return;
  
  highlightElement(target);
  tooltip.innerHTML = buildTooltipContent(target);
  tooltip.style.display = 'block';
  updateTooltipPosition(e.clientX, e.clientY);
  
  // Attach event listeners to controls
  setupTooltipControls();
}

/**
 * Setup tooltip control event listeners
 */
function setupTooltipControls(): void {
  if (!tooltip) return;
  
  // Category selector
  const categorySelect = tooltip.querySelector('.fdh-category-select') as HTMLSelectElement;
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      currentCategory = (e.target as HTMLSelectElement).value;
      if (highlightedElement) {
        tooltip.innerHTML = buildTooltipContent(highlightedElement);
        setupTooltipControls();
      }
    });
  }
  
  // Inherited toggle
  const inheritedToggle = tooltip.querySelector('.fdh-inherited-toggle') as HTMLInputElement;
  if (inheritedToggle) {
    inheritedToggle.addEventListener('change', (e) => {
      showInherited = (e.target as HTMLInputElement).checked;
      if (highlightedElement) {
        tooltip.innerHTML = buildTooltipContent(highlightedElement);
        setupTooltipControls();
      }
    });
  }
  
  // Copy CSS button
  const copyBtn = tooltip.querySelector('.fdh-copy-css-btn') as HTMLButtonElement;
  if (copyBtn && highlightedElement) {
    copyBtn.addEventListener('click', () => {
      const selector = highlightedElement.tagName.toLowerCase() + 
        (highlightedElement.id ? `#${highlightedElement.id}` : '') +
        Array.from(highlightedElement.classList).filter(c => !c.startsWith('fdh-')).map(c => `.${c}`).join('');
      
      const css = generateCSSRule(highlightedElement, selector);
      navigator.clipboard.writeText(css).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy CSS', 1500);
      });
    });
  }
}

/**
 * Handle click (copy CSS on Ctrl/Cmd+click)
 */
function handleClick(e: MouseEvent): void {
  if (!isActive) return;
  
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target && !target.closest('.fdh-css-inspector')) {
      const selector = target.tagName.toLowerCase() + 
        (target.id ? `#${target.id}` : '') +
        Array.from(target.classList).filter(c => !c.startsWith('fdh-')).map(c => `.${c}`).join('');
      
      const css = generateCSSRule(target, selector);
      navigator.clipboard.writeText(css);
      
      showNotification('CSS copied to clipboard!');
    }
  }
}

/**
 * Show notification
 */
function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(34, 197, 94, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Handle key down
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isActive) {
    disable();
  }
}

/**
 * Enable CSS Inspector
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;
  
  if (!tooltip) {
    tooltip = createTooltip();
  }
  
  mouseMoveHandler = handleMouseMove;
  clickHandler = handleClick;
  keyDownHandler = handleKeyDown;
  
  document.addEventListener('mousemove', mouseMoveHandler, { passive: true });
  document.addEventListener('click', clickHandler);
  document.addEventListener('keydown', keyDownHandler);
  
  document.body.style.cursor = 'crosshair';
  console.log('[CSSInspector] Enabled');
}

/**
 * Disable CSS Inspector
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;
  
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
  }
  if (clickHandler) {
    document.removeEventListener('click', clickHandler);
  }
  if (keyDownHandler) {
    document.removeEventListener('keydown', keyDownHandler);
  }
  
  removeHighlight();
  if (tooltip) {
    tooltip.style.display = 'none';
  }
  
  document.body.style.cursor = '';
  console.log('[CSSInspector] Disabled');
}

/**
 * Toggle CSS Inspector
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
export function getState(): { enabled: boolean; category: string; showInherited: boolean } {
  return {
    enabled: isActive,
    category: currentCategory,
    showInherited
  };
}

/**
 * Set category
 */
export function setCategory(category: string): void {
  currentCategory = category;
}

/**
 * Set show inherited
 */
export function setShowInherited(show: boolean): void {
  showInherited = show;
}

/**
 * Cleanup
 */
export function destroy(): void {
  disable();
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

// Export singleton API
export const cssInspector = {
  enable,
  disable,
  toggle,
  getState,
  setCategory,
  setShowInherited,
  destroy
};

export default cssInspector;
