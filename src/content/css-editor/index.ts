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

import { logger } from '@/utils/logger';
import { CSS_ANIMATIONS, CSS_CATEGORIES, DEFAULT_OPTIONS } from './constants';
import {
  applyStyle,
  cleanup as cleanupEditor,
  copyCSS,
  exportAllCSS,
  getHistory,
  getHistoryIndex,
  getOptions,
  redo,
  resetAll,
  resetElement,
  setOptions,
  undo,
} from './editor';
import {
  cleanup as cleanupInspector,
  deselectElement,
  getModifiedElements,
  getSelectedElement,
  isExtensionElement,
  selectElement,
  setSelectCallback,
} from './inspector';
import {
  cleanup as cleanupPreview,
  createHighlightOverlay,
  previewHighlight,
  removeHighlightOverlay,
  setHighlightColor,
  updateHighlightColor,
  updateHighlightOverlay,
} from './preview';
import type {
  CSSEdit,
  CSSEditorOptions,
  CSSEditorState,
  CSSPropertyCategory,
  CSSPropertyDefinition,
  ElementStyles,
} from './types';
import { buildPanelContent, createPanel, setUIStateRefs, updateUIState } from './ui';

// Re-export types
export type {
  CSSEdit,
  CSSEditorOptions,
  CSSEditorState,
  CSSPropertyCategory,
  CSSPropertyDefinition,
  ElementStyles,
};

// ============================================
// State Management
// ============================================

let isActive = false;
let activeCategory = 'Layout';
let panel: HTMLElement | null = null;

// Event handlers
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

// ============================================
// Event Handlers
// ============================================

function handleMouseMove(e: MouseEvent): void {
  if (!isActive || getSelectedElement()) return;

  const target = e.target as HTMLElement;
  if (isExtensionElement(target)) return;

  // Preview highlight on hover when no element selected
  previewHighlight(target);
}

function handleClick(e: MouseEvent): void {
  if (!isActive) return;

  const target = e.target as HTMLElement;

  // Don't select extension elements
  if (isExtensionElement(target)) return;

  e.preventDefault();
  e.stopPropagation();

  selectElement(target);
  updatePanel();
  updateHighlightOverlay(getSelectedElement());
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!isActive) return;

  switch (e.key) {
    case 'Escape':
      if (getSelectedElement()) {
        deselectElement();
        removeHighlightOverlay();
        updatePanel();
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
        updatePanel();
        updateHighlightOverlay(getSelectedElement());
      }
      break;
    case 'y':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        redo();
        updatePanel();
        updateHighlightOverlay(getSelectedElement());
      }
      break;
  }
}

function handleResize(): void {
  updateHighlightOverlay(getSelectedElement());
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
    updatePanel();
    updateHighlightOverlay(getSelectedElement());
  });

  // Category tabs
  panel.querySelectorAll('.fdh-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const category = (e.currentTarget as HTMLElement).dataset.category;
      if (category && CSS_CATEGORIES.some((c) => c.name === category)) {
        activeCategory = category;
        updateUIState({ activeCategory });
        updatePanel();
      }
    });
  });

  // Undo/Redo buttons
  panel.querySelector('.fdh-btn-undo')?.addEventListener('click', () => {
    undo();
    updatePanel();
    updateHighlightOverlay(getSelectedElement());
  });
  panel.querySelector('.fdh-btn-redo')?.addEventListener('click', () => {
    redo();
    updatePanel();
    updateHighlightOverlay(getSelectedElement());
  });

  // Copy CSS button
  panel.querySelector('.fdh-btn-copy')?.addEventListener('click', copyCSS);

  // Property inputs
  attachPropertyListeners();
}

function attachPropertyListeners(): void {
  if (!panel || !getSelectedElement()) return;

  // Text inputs
  panel.querySelectorAll('.fdh-text-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const property = target.dataset.property;
      if (property) {
        applyStyle(property, target.value);
        updatePanel();
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
        updatePanel();
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
        updatePanel();
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
        const preview = panel?.querySelector('.fdh-color-preview') as HTMLElement;
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

function updatePanel(): void {
  if (!panel) return;

  // Update UI state refs before building content
  updateUIState({
    selectedElement: getSelectedElement(),
    activeCategory,
    historyIndex: getHistoryIndex(),
    historyLength: getHistory().length,
  });

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
    setOptions(opts);
    if (opts.highlightColor) {
      setHighlightColor(opts.highlightColor);
    }
  }

  // Set up select callback
  setSelectCallback((element) => {
    const options = getOptions();
    if (options.onElementSelect) {
      options.onElementSelect(element);
    }
  });

  // Set up UI state refs
  setUIStateRefs({
    selectedElement: getSelectedElement(),
    activeCategory,
    historyIndex: getHistoryIndex(),
    historyLength: getHistory().length,
    modifiedElements: getModifiedElements(),
  });

  // Create UI elements
  if (!panel) {
    panel = createPanel();
  }
  createHighlightOverlay();
  updateHighlightColor(getOptions().highlightColor);
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
    selectedElement: getSelectedElement(),
    activeCategory,
    history: getHistory(),
    historyIndex: getHistoryIndex(),
    modifiedElements: new Map(getModifiedElements()),
  };
}

export function setCategory(category: string): void {
  if (CSS_CATEGORIES.some((c) => c.name === category)) {
    activeCategory = category;
    updateUIState({ activeCategory });
    updatePanel();
  }
}

export function getModifiedCSS(): string {
  return exportAllCSS();
}

export function destroy(): void {
  disable();
  cleanupEditor();
  cleanupInspector();
  cleanupPreview();
}

// ============================================
// CSS Editor Class
// ============================================

export class CSSLiveEditor {
  private editorOptions: Required<CSSEditorOptions>;

  constructor(opts?: CSSEditorOptions) {
    this.editorOptions = {
      ...DEFAULT_OPTIONS,
      ...opts,
    };
  }

  enable(): void {
    enable(this.editorOptions);
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

// ============================================
// Add CSS Animations
// ============================================

const style = document.createElement('style');
style.textContent = CSS_ANIMATIONS;
document.head.appendChild(style);
