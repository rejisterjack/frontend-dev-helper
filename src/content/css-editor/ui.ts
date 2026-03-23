/**
 * Live CSS Editor - UI Component Creation
 */

import { escapeHtml } from '@/utils/sanitize';
import { CSS_CATEGORIES } from './constants';
import type { CSSPropertyDefinition } from './types';

// State references (will be set from editor module)
let selectedElementRef: HTMLElement | null = null;
let activeCategoryRef = 'Layout';
let historyIndexRef = -1;
let historyLengthRef = 0;
let modifiedElementsRef = new Map();

export function setUIStateRefs(refs: {
  selectedElement: HTMLElement | null;
  activeCategory: string;
  historyIndex: number;
  historyLength: number;
  modifiedElements: Map<HTMLElement, unknown>;
}): void {
  selectedElementRef = refs.selectedElement;
  activeCategoryRef = refs.activeCategory;
  historyIndexRef = refs.historyIndex;
  historyLengthRef = refs.historyLength;
  modifiedElementsRef = refs.modifiedElements;
}

export function updateUIState(updates: {
  selectedElement?: HTMLElement | null;
  activeCategory?: string;
  historyIndex?: number;
  historyLength?: number;
}): void {
  if (updates.selectedElement !== undefined) selectedElementRef = updates.selectedElement;
  if (updates.activeCategory !== undefined) activeCategoryRef = updates.activeCategory;
  if (updates.historyIndex !== undefined) historyIndexRef = updates.historyIndex;
  if (updates.historyLength !== undefined) historyLengthRef = updates.historyLength;
}

export function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fdh-css-editor-panel';
  el.id = 'fdh-css-editor-panel';
  el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: calc(100vh - 40px);
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, monospace;
    font-size: 13px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  if (document.body) {
    document.body.appendChild(el);
  }
  return el;
}

export function generateSelector(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tagName}${id}${classes}`;
}

export function buildPanelContent(): string {
  const hasSelection = selectedElementRef !== null;
  const selector = hasSelection ? generateSelector(selectedElementRef!) : 'No element selected';
  const dimensions = hasSelection
    ? selectedElementRef!.getBoundingClientRect()
    : { width: 0, height: 0 };

  const escapedSelector = escapeHtml(selector);

  return `
    <!-- Header -->
    <div class="fdh-panel-header" style="
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 14px; color: #c084fc; display: flex; align-items: center; gap: 8px;">
          <span>🎨</span>
          Live CSS Editor
        </h3>
        <div style="display: flex; gap: 4px;">
          <button
            type="button" class="fdh-btn-reset" title="Reset all changes" style="
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 6px;
            padding: 4px 8px;
            color: #f87171;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
          ">↩ Reset</button>
          <button
            type="button" class="fdh-btn-close" title="Close editor" style="
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 20px;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
          ">×</button>
        </div>
      </div>
      
      <div class="fdh-selector-display" style="
        background: rgba(30, 41, 59, 0.8);
        border-radius: 6px;
        padding: 8px 12px;
        font-family: monospace;
        font-size: 12px;
        color: ${hasSelection ? '#c084fc' : '#64748b'};
        border: 1px solid rgba(99, 102, 241, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <code>${escapedSelector}</code>
        ${hasSelection ? `<span style="color: #64748b; font-size: 11px;">${Math.round(dimensions.width)}×${Math.round(dimensions.height)}</span>` : ''}
      </div>
      
      ${
        !hasSelection
          ? `
        <div style="margin-top: 12px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 12px; color: #60a5fa; text-align: center;">
          👆 Click any element on the page to edit its styles
        </div>
      `
          : ''
      }
    </div>

    ${
      hasSelection
        ? `
      <!-- Category Tabs -->
      <div class="fdh-category-tabs" style="
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        overflow-x: auto;
        scrollbar-width: none;
      ">
        ${CSS_CATEGORIES.map(
          (cat) => `
          <button
            type="button" class="fdh-tab ${cat.name === activeCategoryRef ? 'active' : ''}" data-category="${escapeHtml(cat.name)}" style="
            background: ${cat.name === activeCategoryRef ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};
            border: 1px solid ${cat.name === activeCategoryRef ? 'rgba(99, 102, 241, 0.5)' : 'transparent'};
            border-radius: 6px;
            padding: 6px 10px;
            color: ${cat.name === activeCategoryRef ? '#c084fc' : '#94a3b8'};
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${escapeHtml(cat.icon)}</span>
            ${escapeHtml(cat.name)}
          </button>
        `
        ).join('')}
      </div>

      <!-- Properties Editor -->
      <div class="fdh-properties-editor" style="
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        max-height: 400px;
      ">
        ${buildPropertiesEditor()}
      </div>

      <!-- History & Actions -->
      <div class="fdh-panel-actions" style="
        padding: 12px 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
        background: rgba(30, 41, 59, 0.5);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      ">
        <button
          type="button" class="fdh-btn-undo" ${historyIndexRef < 0 ? 'disabled' : ''} style="
          flex: 1;
          min-width: 60px;
          background: ${historyIndexRef < 0 ? 'rgba(100,116,139,0.2)' : 'rgba(99, 102, 241, 0.2)'};
          border: 1px solid ${historyIndexRef < 0 ? 'rgba(100,116,139,0.3)' : 'rgba(99, 102, 241, 0.4)'};
          border-radius: 6px;
          padding: 8px 12px;
          color: ${historyIndexRef < 0 ? '#64748b' : '#818cf8'};
          font-size: 11px;
          cursor: ${historyIndexRef < 0 ? 'not-allowed' : 'pointer'};
          transition: all 0.2s;
        ">↶ Undo</button>
        
        <button
          type="button" class="fdh-btn-redo" ${historyIndexRef >= historyLengthRef - 1 ? 'disabled' : ''} style="
          flex: 1;
          min-width: 60px;
          background: ${historyIndexRef >= historyLengthRef - 1 ? 'rgba(100,116,139,0.2)' : 'rgba(99, 102, 241, 0.2)'};
          border: 1px solid ${historyIndexRef >= historyLengthRef - 1 ? 'rgba(100,116,139,0.3)' : 'rgba(99, 102, 241, 0.4)'};
          border-radius: 6px;
          padding: 8px 12px;
          color: ${historyIndexRef >= historyLengthRef - 1 ? '#64748b' : '#818cf8'};
          font-size: 11px;
          cursor: ${historyIndexRef >= historyLengthRef - 1 ? 'not-allowed' : 'pointer'};
          transition: all 0.2s;
        ">↷ Redo</button>
        
        <button
          type="button" class="fdh-btn-copy" style="
          flex: 2;
          min-width: 100px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 6px;
          padding: 8px 12px;
          color: #4ade80;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        ">📋 Copy CSS</button>
      </div>
    `
        : ''
    }
  `;
}

export function buildPropertiesEditor(): string {
  const category = CSS_CATEGORIES.find((c) => c.name === activeCategoryRef);
  if (!category || !selectedElementRef) return '';

  const computed = window.getComputedStyle(selectedElementRef);

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${category.properties
        .map((prop) => {
          const currentValue = computed.getPropertyValue(prop.name);
          const modified = modifiedElementsRef
            .get(selectedElementRef!)
            ?.modifiedStyles.has(prop.name);

          return `
          <div class="fdh-property-row" data-property="${escapeHtml(prop.name)}" style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px;
            background: ${modified ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.4)'};
            border-radius: 8px;
            border: 1px solid ${modified ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 11px; color: #94a3b8; text-transform: capitalize;">
                ${escapeHtml(prop.name.replace(/-/g, ' '))}
                ${modified ? '<span style="color: #818cf8; margin-left: 4px;">●</span>' : ''}
              </label>
              ${
                prop.type === 'color'
                  ? `
                <div class="fdh-color-preview" style="
                  width: 16px;
                  height: 16px;
                  border-radius: 4px;
                  background: ${escapeHtml(currentValue)};
                  border: 1px solid rgba(255,255,255,0.2);
                "></div>
              `
                  : ''
              }
            </div>
            ${buildPropertyInput(prop, currentValue)}
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

export function buildPropertyInput(prop: CSSPropertyDefinition, value: string): string {
  const sanitizedValue = value.replace(/"/g, '&quot;');

  switch (prop.type) {
    case 'color': {
      const hexValue = convertRgbToHex(value) || '#000000';
      return `
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="color" 
            class="fdh-color-input" 
            data-property="${escapeHtml(prop.name)}"
            value="${escapeHtml(hexValue)}"
            style="
              width: 40px;
              height: 32px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              background: transparent;
            "
          >
          <input type="text" 
            class="fdh-text-input" 
            data-property="${escapeHtml(prop.name)}"
            value="${sanitizedValue}"
            placeholder="auto"
            style="
              flex: 1;
              background: rgba(15, 23, 42, 0.8);
              border: 1px solid rgba(99, 102, 241, 0.2);
              border-radius: 6px;
              padding: 6px 10px;
              color: #e2e8f0;
              font-family: inherit;
              font-size: 12px;
            "
          >
        </div>
      `;
    }

    case 'select':
      return `
        <select 
          class="fdh-select-input" 
          data-property="${escapeHtml(prop.name)}"
          style="
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 6px;
            padding: 6px 10px;
            color: #e2e8f0;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
          "
        >
          ${prop.options
            ?.map(
              (opt) => `
            <option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>
          `
            )
            .join('')}
        </select>
      `;

    case 'number':
      return `
        <input type="number" 
          class="fdh-number-input" 
          data-property="${escapeHtml(prop.name)}"
          value="${parseFloat(value) || 0}"
          min="${prop.min ?? ''}"
          max="${prop.max ?? ''}"
          step="${prop.step ?? 1}"
          style="
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 6px;
            padding: 6px 10px;
            color: #e2e8f0;
            font-family: inherit;
            font-size: 12px;
          "
        >
      `;

    case 'slider': {
      const numValue = parseFloat(value) || 0;
      return `
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="range" 
            class="fdh-slider-input" 
            data-property="${escapeHtml(prop.name)}"
            value="${numValue}"
            min="${prop.min ?? 0}"
            max="${prop.max ?? 100}"
            step="${prop.step ?? 1}"
            style="flex: 1;"
          >
          <span style="font-size: 11px; color: #94a3b8; min-width: 40px; text-align: right;">
            ${numValue.toFixed(2)}
          </span>
        </div>
      `;
    }

    default:
      return `
        <input type="text" 
          class="fdh-text-input" 
          data-property="${escapeHtml(prop.name)}"
          value="${sanitizedValue}"
          placeholder="auto"
          style="
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 6px;
            padding: 6px 10px;
            color: #e2e8f0;
            font-family: inherit;
            font-size: 12px;
          "
        >
      `;
  }
}

function convertRgbToHex(cssColor: string): string | null {
  // Create a temporary element to compute the color
  const temp = document.createElement('div');
  temp.style.color = cssColor;
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  document.body.appendChild(temp);

  const computedColor = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join('')
  );
}

export function showNotification(message: string): void {
  // Remove existing notification
  document.querySelector('.fdh-notification')?.remove();

  const notification = document.createElement('div');
  notification.className = 'fdh-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 197, 94, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: fdh-slide-up 0.3s ease-out;
  `;
  notification.textContent = message;
  if (document.body) {
    document.body.appendChild(notification);
  } else {
    return;
  }

  setTimeout(() => {
    notification.style.animation = 'fdh-fade-out 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}
