/**
 * Live CSS Editor Module
 *
 * Provides real-time CSS editing functionality:
 * - Click any element to select and edit its styles
 * - Floating panel with categorized property editors
 * - Live preview of changes
 * - History/undo functionality
 * - Export modified CSS
 */

import { parseColor } from '../utils/color';
import { logger } from '../utils/logger';

// ============================================
// Types and Interfaces
// ============================================

export interface CSSPropertyDefinition {
  name: string;
  type: 'text' | 'number' | 'color' | 'select' | 'slider';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue?: string;
}

export interface CSSPropertyCategory {
  name: string;
  icon: string;
  properties: CSSPropertyDefinition[];
}

export interface CSSEdit {
  property: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export interface ElementStyles {
  element: HTMLElement;
  selector: string;
  originalStyles: Map<string, string>;
  modifiedStyles: Map<string, string>;
  edits: CSSEdit[];
}

export interface CSSEditorState {
  enabled: boolean;
  selectedElement: HTMLElement | null;
  activeCategory: string;
  history: CSSEdit[];
  historyIndex: number;
  modifiedElements: Map<HTMLElement, ElementStyles>;
}

export interface CSSEditorOptions {
  highlightColor?: string;
  maxHistorySize?: number;
  onElementSelect?: (element: HTMLElement) => void;
  onStyleChange?: (element: HTMLElement, property: string, value: string) => void;
}

// ============================================
// CSS Property Categories
// ============================================

const CSS_CATEGORIES: CSSPropertyCategory[] = [
  {
    name: 'Layout',
    icon: '⊞',
    properties: [
      {
        name: 'display',
        type: 'select',
        options: [
          'block',
          'inline',
          'inline-block',
          'flex',
          'grid',
          'none',
          'contents',
          'table',
          'table-cell',
        ],
      },
      {
        name: 'position',
        type: 'select',
        options: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      },
      { name: 'top', type: 'text' },
      { name: 'right', type: 'text' },
      { name: 'bottom', type: 'text' },
      { name: 'left', type: 'text' },
      { name: 'width', type: 'text' },
      { name: 'height', type: 'text' },
      { name: 'min-width', type: 'text' },
      { name: 'min-height', type: 'text' },
      { name: 'max-width', type: 'text' },
      { name: 'max-height', type: 'text' },
      { name: 'margin', type: 'text' },
      { name: 'padding', type: 'text' },
      { name: 'z-index', type: 'number' },
      { name: 'overflow', type: 'select', options: ['visible', 'hidden', 'scroll', 'auto'] },
      { name: 'box-sizing', type: 'select', options: ['content-box', 'border-box'] },
      { name: 'float', type: 'select', options: ['none', 'left', 'right'] },
      { name: 'clear', type: 'select', options: ['none', 'left', 'right', 'both'] },
    ],
  },
  {
    name: 'Typography',
    icon: 'T',
    properties: [
      { name: 'color', type: 'color' },
      { name: 'font-family', type: 'text' },
      { name: 'font-size', type: 'text' },
      {
        name: 'font-weight',
        type: 'select',
        options: [
          '100',
          '200',
          '300',
          '400',
          '500',
          '600',
          '700',
          '800',
          '900',
          'normal',
          'bold',
          'lighter',
          'bolder',
        ],
      },
      { name: 'font-style', type: 'select', options: ['normal', 'italic', 'oblique'] },
      { name: 'line-height', type: 'text' },
      { name: 'letter-spacing', type: 'text' },
      { name: 'word-spacing', type: 'text' },
      { name: 'text-align', type: 'select', options: ['left', 'center', 'right', 'justify'] },
      {
        name: 'text-decoration',
        type: 'select',
        options: ['none', 'underline', 'overline', 'line-through'],
      },
      {
        name: 'text-transform',
        type: 'select',
        options: ['none', 'capitalize', 'uppercase', 'lowercase'],
      },
      {
        name: 'white-space',
        type: 'select',
        options: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
      },
      { name: 'text-overflow', type: 'select', options: ['clip', 'ellipsis'] },
    ],
  },
  {
    name: 'Colors',
    icon: '🎨',
    properties: [
      { name: 'background-color', type: 'color' },
      { name: 'background-image', type: 'text' },
      { name: 'background-size', type: 'select', options: ['auto', 'cover', 'contain'] },
      { name: 'background-position', type: 'text' },
      {
        name: 'background-repeat',
        type: 'select',
        options: ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
      },
      { name: 'border-color', type: 'color' },
      { name: 'border-width', type: 'text' },
      {
        name: 'border-style',
        type: 'select',
        options: [
          'none',
          'solid',
          'dashed',
          'dotted',
          'double',
          'groove',
          'ridge',
          'inset',
          'outset',
        ],
      },
      { name: 'border-radius', type: 'text' },
      { name: 'opacity', type: 'slider', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'Flexbox',
    icon: '↔',
    properties: [
      {
        name: 'flex-direction',
        type: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
      },
      { name: 'flex-wrap', type: 'select', options: ['nowrap', 'wrap', 'wrap-reverse'] },
      {
        name: 'justify-content',
        type: 'select',
        options: [
          'flex-start',
          'flex-end',
          'center',
          'space-between',
          'space-around',
          'space-evenly',
        ],
      },
      {
        name: 'align-items',
        type: 'select',
        options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
      },
      {
        name: 'align-content',
        type: 'select',
        options: [
          'stretch',
          'flex-start',
          'flex-end',
          'center',
          'space-between',
          'space-around',
          'space-evenly',
        ],
      },
      { name: 'flex-grow', type: 'number', min: 0 },
      { name: 'flex-shrink', type: 'number', min: 0 },
      { name: 'flex-basis', type: 'text' },
      {
        name: 'align-self',
        type: 'select',
        options: ['auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
      },
      { name: 'order', type: 'number' },
      { name: 'gap', type: 'text' },
    ],
  },
  {
    name: 'Effects',
    icon: '✨',
    properties: [
      { name: 'box-shadow', type: 'text' },
      { name: 'text-shadow', type: 'text' },
      { name: 'transform', type: 'text' },
      { name: 'transition', type: 'text' },
      { name: 'filter', type: 'text' },
      {
        name: 'cursor',
        type: 'select',
        options: [
          'auto',
          'default',
          'pointer',
          'text',
          'wait',
          'move',
          'not-allowed',
          'grab',
          'crosshair',
        ],
      },
      { name: 'pointer-events', type: 'select', options: ['auto', 'none'] },
      { name: 'user-select', type: 'select', options: ['auto', 'none', 'text', 'all'] },
      { name: 'visibility', type: 'select', options: ['visible', 'hidden', 'collapse'] },
    ],
  },
];

// ============================================
// State Management
// ============================================

let isActive = false;
let selectedElement: HTMLElement | null = null;
let activeCategory = 'Layout';
let panel: HTMLElement | null = null;
let highlightOverlay: HTMLElement | null = null;
const history: CSSEdit[] = [];
let historyIndex = -1;
const MAX_HISTORY_SIZE = 50;
const modifiedElements = new Map<HTMLElement, ElementStyles>();

// Event handlers
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

// Options
let options: Required<CSSEditorOptions> = {
  highlightColor: '#8b5cf6',
  maxHistorySize: 50,
  onElementSelect: () => {},
  onStyleChange: () => {},
};

// ============================================
// Element Selection
// ============================================

function generateSelector(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tagName}${id}${classes}`;
}

function selectElement(element: HTMLElement): void {
  // Don't select our own UI elements
  if (isExtensionElement(element)) return;

  // Deselect previous element
  deselectElement();

  selectedElement = element;
  const selector = generateSelector(element);

  // Store original styles if not already stored
  if (!modifiedElements.has(element)) {
    const computed = window.getComputedStyle(element);
    const originalStyles = new Map<string, string>();

    // Store common properties that might be modified
    CSS_CATEGORIES.forEach((cat) => {
      cat.properties.forEach((prop) => {
        originalStyles.set(prop.name, computed.getPropertyValue(prop.name));
      });
    });

    modifiedElements.set(element, {
      element,
      selector,
      originalStyles,
      modifiedStyles: new Map(),
      edits: [],
    });
  }

  // Add visual highlight
  updateHighlightOverlay();

  // Update panel
  updatePanel();

  // Notify callback
  options.onElementSelect(element);
}

function deselectElement(): void {
  selectedElement = null;
  removeHighlightOverlay();
  updatePanel();
}

// ============================================
// Visual Feedback
// ============================================

function createHighlightOverlay(): void {
  if (highlightOverlay) return;

  highlightOverlay = document.createElement('div');
  highlightOverlay.className = 'fdh-css-editor-highlight';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px solid ${options.highlightColor};
    background-color: ${hexToRgba(options.highlightColor, 0.1)};
    border-radius: 2px;
    transition: all 0.15s ease-out;
    display: none;
    box-shadow: 0 0 0 4px ${hexToRgba(options.highlightColor, 0.1)};
  `;
  if (document.body) {
    document.body.appendChild(highlightOverlay);
  }
}

function removeHighlightOverlay(): void {
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
}

function updateHighlightOverlay(): void {
  if (!highlightOverlay || !selectedElement) {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
    return;
  }

  const rect = selectedElement.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  highlightOverlay.style.display = 'block';
  highlightOverlay.style.left = `${rect.left + scrollX}px`;
  highlightOverlay.style.top = `${rect.top + scrollY}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
}

// ============================================
// Panel UI
// ============================================

function createPanel(): HTMLElement {
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

function buildPanelContent(): string {
  const hasSelection = selectedElement !== null;
  const selector = hasSelection ? generateSelector(selectedElement!) : 'No element selected';
  const dimensions = hasSelection
    ? selectedElement!.getBoundingClientRect()
    : { width: 0, height: 0 };

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
          <button class="fdh-btn-reset" title="Reset all changes" style="
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 6px;
            padding: 4px 8px;
            color: #f87171;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
          ">↩ Reset</button>
          <button class="fdh-btn-close" title="Close editor" style="
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
        <code>${selector}</code>
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
          <button class="fdh-tab ${cat.name === activeCategory ? 'active' : ''}" data-category="${cat.name}" style="
            background: ${cat.name === activeCategory ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};
            border: 1px solid ${cat.name === activeCategory ? 'rgba(99, 102, 241, 0.5)' : 'transparent'};
            border-radius: 6px;
            padding: 6px 10px;
            color: ${cat.name === activeCategory ? '#c084fc' : '#94a3b8'};
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${cat.icon}</span>
            ${cat.name}
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
        <button class="fdh-btn-undo" ${historyIndex < 0 ? 'disabled' : ''} style="
          flex: 1;
          min-width: 60px;
          background: ${historyIndex < 0 ? 'rgba(100,116,139,0.2)' : 'rgba(99, 102, 241, 0.2)'};
          border: 1px solid ${historyIndex < 0 ? 'rgba(100,116,139,0.3)' : 'rgba(99, 102, 241, 0.4)'};
          border-radius: 6px;
          padding: 8px 12px;
          color: ${historyIndex < 0 ? '#64748b' : '#818cf8'};
          font-size: 11px;
          cursor: ${historyIndex < 0 ? 'not-allowed' : 'pointer'};
          transition: all 0.2s;
        ">↶ Undo</button>
        
        <button class="fdh-btn-redo" ${historyIndex >= history.length - 1 ? 'disabled' : ''} style="
          flex: 1;
          min-width: 60px;
          background: ${historyIndex >= history.length - 1 ? 'rgba(100,116,139,0.2)' : 'rgba(99, 102, 241, 0.2)'};
          border: 1px solid ${historyIndex >= history.length - 1 ? 'rgba(100,116,139,0.3)' : 'rgba(99, 102, 241, 0.4)'};
          border-radius: 6px;
          padding: 8px 12px;
          color: ${historyIndex >= history.length - 1 ? '#64748b' : '#818cf8'};
          font-size: 11px;
          cursor: ${historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer'};
          transition: all 0.2s;
        ">↷ Redo</button>
        
        <button class="fdh-btn-copy" style="
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

function buildPropertiesEditor(): string {
  const category = CSS_CATEGORIES.find((c) => c.name === activeCategory);
  if (!category || !selectedElement) return '';

  const computed = window.getComputedStyle(selectedElement);

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${category.properties
        .map((prop) => {
          const currentValue = computed.getPropertyValue(prop.name);
          const modified = modifiedElements.get(selectedElement!)?.modifiedStyles.has(prop.name);

          return `
          <div class="fdh-property-row" data-property="${prop.name}" style="
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
                ${prop.name.replace(/-/g, ' ')}
                ${modified ? '<span style="color: #818cf8; margin-left: 4px;">●</span>' : ''}
              </label>
              ${
                prop.type === 'color'
                  ? `
                <div class="fdh-color-preview" style="
                  width: 16px;
                  height: 16px;
                  border-radius: 4px;
                  background: ${currentValue};
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

function buildPropertyInput(prop: CSSPropertyDefinition, value: string): string {
  const sanitizedValue = value.replace(/"/g, '&quot;');

  switch (prop.type) {
    case 'color': {
      const hexValue = convertRgbToHex(value) || '#000000';
      return `
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="color" 
            class="fdh-color-input" 
            data-property="${prop.name}"
            value="${hexValue}"
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
            data-property="${prop.name}"
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
          data-property="${prop.name}"
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
            <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
          `
            )
            .join('')}
        </select>
      `;

    case 'number':
      return `
        <input type="number" 
          class="fdh-number-input" 
          data-property="${prop.name}"
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
            data-property="${prop.name}"
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
          data-property="${prop.name}"
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

// ============================================
// Style Editing
// ============================================

function applyStyle(property: string, value: string): void {
  if (!selectedElement) return;

  const oldValue =
    selectedElement.style.getPropertyValue(property) ||
    window.getComputedStyle(selectedElement).getPropertyValue(property);

  // Apply the style
  selectedElement.style.setProperty(property, value, 'important');

  // Track the modification
  const elementData = modifiedElements.get(selectedElement);
  if (elementData) {
    elementData.modifiedStyles.set(property, value);
  }

  // Add to history
  addToHistory({
    property,
    oldValue,
    newValue: value,
    timestamp: Date.now(),
  });

  // Notify callback
  options.onStyleChange(selectedElement, property, value);

  // Update UI
  updatePanel();
  updateHighlightOverlay();
}

function addToHistory(edit: CSSEdit): void {
  // Remove any redo entries
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }

  // Add new edit
  history.push(edit);
  historyIndex++;

  // Trim history if needed
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
    historyIndex--;
  }

  // Store edit on element data
  if (selectedElement) {
    const elementData = modifiedElements.get(selectedElement);
    if (elementData) {
      elementData.edits.push(edit);
    }
  }
}

function undo(): void {
  if (historyIndex < 0) return;

  const edit = history[historyIndex];
  if (selectedElement) {
    selectedElement.style.setProperty(edit.property, edit.oldValue);

    const elementData = modifiedElements.get(selectedElement);
    if (elementData) {
      if (edit.oldValue) {
        elementData.modifiedStyles.set(edit.property, edit.oldValue);
      } else {
        elementData.modifiedStyles.delete(edit.property);
      }
    }
  }

  historyIndex--;
  updatePanel();
}

function redo(): void {
  if (historyIndex >= history.length - 1) return;

  historyIndex++;
  const edit = history[historyIndex];

  if (selectedElement) {
    selectedElement.style.setProperty(edit.property, edit.newValue, 'important');

    const elementData = modifiedElements.get(selectedElement);
    if (elementData) {
      elementData.modifiedStyles.set(edit.property, edit.newValue);
    }
  }

  updatePanel();
}

function resetElement(): void {
  if (!selectedElement) return;

  const elementData = modifiedElements.get(selectedElement);
  if (elementData) {
    // Restore original styles
    elementData.modifiedStyles.forEach((_, property) => {
      const originalValue = elementData.originalStyles.get(property) || '';
      selectedElement!.style.setProperty(property, originalValue);
    });

    // Clear modifications
    elementData.modifiedStyles.clear();
    elementData.edits = [];
  }

  updatePanel();
  updateHighlightOverlay();
}

// ============================================
// CSS Export
// ============================================

function generateCSS(): string {
  if (!selectedElement) return '';

  const elementData = modifiedElements.get(selectedElement);
  if (!elementData || elementData.modifiedStyles.size === 0) {
    return '/* No styles modified */';
  }

  const selector = elementData.selector;
  let css = `${selector} {\n`;

  elementData.modifiedStyles.forEach((value, property) => {
    css += `  ${property}: ${value};\n`;
  });

  css += '}';
  return css;
}

function copyCSS(): void {
  const css = generateCSS();
  navigator.clipboard.writeText(css).then(() => {
    showNotification('CSS copied to clipboard!');
  });
}

function exportAllCSS(): string {
  let css = '/* Generated by Live CSS Editor */\n\n';

  modifiedElements.forEach((data) => {
    if (data.modifiedStyles.size > 0) {
      css += `${data.selector} {\n`;
      data.modifiedStyles.forEach((value, property) => {
        css += `  ${property}: ${value};\n`;
      });
      css += '}\n\n';
    }
  });

  return css;
}

// ============================================
// Event Handlers
// ============================================

function handleMouseMove(e: MouseEvent): void {
  if (!isActive || selectedElement) return;

  const target = e.target as HTMLElement;
  if (isExtensionElement(target)) return;

  // Preview highlight on hover when no element selected
  if (highlightOverlay) {
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    highlightOverlay.style.display = 'block';
    highlightOverlay.style.left = `${rect.left + scrollX}px`;
    highlightOverlay.style.top = `${rect.top + scrollY}px`;
    highlightOverlay.style.width = `${rect.width}px`;
    highlightOverlay.style.height = `${rect.height}px`;
    highlightOverlay.style.opacity = '0.5';
  }
}

function handleClick(e: MouseEvent): void {
  if (!isActive) return;

  const target = e.target as HTMLElement;

  // Don't select extension elements
  if (isExtensionElement(target)) return;

  e.preventDefault();
  e.stopPropagation();

  selectElement(target);
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!isActive) return;

  switch (e.key) {
    case 'Escape':
      if (selectedElement) {
        deselectElement();
      } else {
        disable();
      }
      break;
    case 'z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      break;
    case 'y':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        redo();
      }
      break;
  }
}

function handleResize(): void {
  updateHighlightOverlay();
}

// ============================================
// Panel Event Listeners
// ============================================

function attachPanelListeners(): void {
  if (!panel) return;

  // Close button
  panel.querySelector('.fdh-btn-close')?.addEventListener('click', () => {
    disable();
  });

  // Reset button
  panel.querySelector('.fdh-btn-reset')?.addEventListener('click', () => {
    resetElement();
  });

  // Category tabs
  panel.querySelectorAll('.fdh-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const category = (e.currentTarget as HTMLElement).dataset.category;
      if (category) {
        activeCategory = category;
        updatePanel();
      }
    });
  });

  // Undo/Redo buttons
  panel.querySelector('.fdh-btn-undo')?.addEventListener('click', undo);
  panel.querySelector('.fdh-btn-redo')?.addEventListener('click', redo);

  // Copy CSS button
  panel.querySelector('.fdh-btn-copy')?.addEventListener('click', copyCSS);

  // Property inputs
  attachPropertyListeners();
}

function attachPropertyListeners(): void {
  if (!panel || !selectedElement) return;

  // Text inputs
  panel.querySelectorAll('.fdh-text-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);
      }
    });
  });

  // Select inputs
  panel.querySelectorAll('.fdh-select-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);
      }
    });
  });

  // Number inputs
  panel.querySelectorAll('.fdh-number-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);
      }
    });
  });

  // Color inputs
  panel.querySelectorAll('.fdh-color-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);

        // Update text input
        const textInput = panel?.querySelector(
          `.fdh-text-input[data-property="${property}"]`
        ) as HTMLInputElement;
        if (textInput) textInput.value = target.value;

        // Update preview
        const preview = panel?.querySelector(`.fdh-color-preview`) as HTMLElement;
        if (preview) preview.style.background = target.value;
      }
    });
  });

  // Slider inputs
  panel.querySelectorAll('.fdh-slider-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);

        // Update value display
        const display = target.parentElement?.querySelector('span');
        if (display) display.textContent = parseFloat(target.value).toFixed(2);
      }
    });
  });
}

// ============================================
// Utilities
// ============================================

function isExtensionElement(element: HTMLElement): boolean {
  return (
    element.id === 'fdh-css-editor-panel' ||
    element.closest('#fdh-css-editor-panel') !== null ||
    element.classList.contains('fdh-css-editor-highlight') ||
    element.classList.contains('fdh-notification')
  );
}

function convertRgbToHex(cssColor: string): string | null {
  const parsed = parseColor(cssColor);
  if (!parsed) return null;
  return rgbToHex(parsed.r, parsed.g, parsed.b);
}

function rgbToHex(r: number, g: number, b: number): string {
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showNotification(message: string): void {
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

function updatePanel(): void {
  if (!panel) return;
  panel.innerHTML = buildPanelContent();
  attachPanelListeners();
}

// ============================================
// Public API
// ============================================

export function enable(opts?: CSSEditorOptions): void {
  if (isActive) return;

  isActive = true;

  // Merge options
  if (opts) {
    options = { ...options, ...opts };
  }

  // Create UI elements
  if (!panel) {
    panel = createPanel();
  }
  createHighlightOverlay();
  updatePanel();

  // Attach event listeners
  mouseMoveHandler = handleMouseMove;
  clickHandler = handleClick;
  keyDownHandler = handleKeyDown;
  resizeHandler = handleResize;

  document.addEventListener('mousemove', mouseMoveHandler, { passive: true });
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('keydown', keyDownHandler, true);
  window.addEventListener('resize', resizeHandler);

  document.body.style.cursor = 'crosshair';
  logger.log('[CSS Editor] Enabled');
}

export function disable(): void {
  if (!isActive) return;

  isActive = false;

  // Detach event listeners
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
  }
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true);
  }
  if (keyDownHandler) {
    document.removeEventListener('keydown', keyDownHandler, true);
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  // Clean up
  deselectElement();
  if (panel) {
    panel.remove();
    panel = null;
  }
  removeHighlightOverlay();

  document.body.style.cursor = '';
  logger.log('[CSS Editor] Disabled');
}

export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

export function getState(): CSSEditorState {
  return {
    enabled: isActive,
    selectedElement,
    activeCategory,
    history: [...history],
    historyIndex,
    modifiedElements: new Map(modifiedElements),
  };
}

export function setCategory(category: string): void {
  if (CSS_CATEGORIES.some((c) => c.name === category)) {
    activeCategory = category;
    updatePanel();
  }
}

export function getModifiedCSS(): string {
  return exportAllCSS();
}

export function resetAll(): void {
  modifiedElements.forEach((data, element) => {
    data.modifiedStyles.forEach((_, property) => {
      const originalValue = data.originalStyles.get(property) || '';
      element.style.setProperty(property, originalValue);
    });
    data.modifiedStyles.clear();
    data.edits = [];
  });

  history.length = 0;
  historyIndex = -1;

  updatePanel();
}

export function destroy(): void {
  disable();
  modifiedElements.clear();
  history.length = 0;
  historyIndex = -1;
}

// ============================================
// CSS Editor Class
// ============================================

export class CSSLiveEditor {
  private options: Required<CSSEditorOptions>;

  constructor(opts?: CSSEditorOptions) {
    this.options = {
      highlightColor: '#8b5cf6',
      maxHistorySize: 50,
      onElementSelect: () => {},
      onStyleChange: () => {},
      ...opts,
    };
  }

  enable(): void {
    enable(this.options);
  }

  disable(): void {
    disable();
  }

  toggle(): void {
    toggle();
  }

  getState(): CSSEditorState {
    return getState();
  }
}

// Export singleton instance
export const cssEditor = {
  enable,
  disable,
  toggle,
  getState,
  setCategory,
  getModifiedCSS,
  resetAll,
  destroy,
};

export default cssEditor;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fdh-slide-up {
    from { transform: translate(-50%, 100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes fdh-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .fdh-css-editor-panel input:focus,
  .fdh-css-editor-panel select:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5) !important;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  .fdh-css-editor-panel button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
  .fdh-css-editor-panel button:active:not(:disabled) {
    transform: translateY(0);
  }
`;
document.head.appendChild(style);
