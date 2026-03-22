/**
 * UI Component Creation (toolbar, color picker, instructions, action bar)
 */

import { escapeHtml } from '@/utils/sanitize';
import { COLORS, PREFIX, RESIZE_CURSORS, TOOL_CURSORS } from './constants';
import type { AnnotationTool } from './types';

// ============================================
// Container & Canvas
// ============================================

export interface ContainerElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  selectionBox: HTMLElement;
  resizeHandles: HTMLElement[];
}

/**
 * Create main container
 */
export function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = `${PREFIX}-container`;
  container.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  `;

  document.body.appendChild(container);
  return container;
}

/**
 * Create canvas with container
 */
export function createCanvasElements(container: HTMLElement): ContainerElements {
  const canvasContainer = document.createElement('div');
  canvasContainer.className = `${PREFIX}-canvas-container`;
  canvasContainer.style.cssText = `
    position: relative;
    max-width: 95vw;
    max-height: 85vh;
    overflow: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    border-radius: 8px;
  `;

  const canvas = document.createElement('canvas');
  canvas.className = `${PREFIX}-canvas`;
  canvas.style.cssText = `
    display: block;
    cursor: crosshair;
    background: white;
  `;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvasContainer.appendChild(canvas);
  container.appendChild(canvasContainer);

  // Create selection box for move/resize
  const selectionBox = document.createElement('div');
  selectionBox.className = `${PREFIX}-selection-box`;
  selectionBox.style.cssText = `
    position: absolute;
    border: 2px dashed #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    pointer-events: none;
    display: none;
    z-index: 10;
  `;
  canvasContainer.appendChild(selectionBox);

  // Create resize handles
  const resizeHandles: HTMLElement[] = [];
  const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  for (const pos of handlePositions) {
    const handle = document.createElement('div');
    handle.className = `${PREFIX}-resize-handle ${PREFIX}-resize-handle-${pos}`;
    handle.dataset.position = pos;
    handle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      pointer-events: auto;
      cursor: ${getResizeCursor(pos)};
      display: none;
      z-index: 11;
    `;
    selectionBox.appendChild(handle);
    resizeHandles.push(handle);
  }

  return { container, canvas, ctx, selectionBox, resizeHandles };
}

function getResizeCursor(position: string): string {
  return RESIZE_CURSORS[position] || 'pointer';
}

// ============================================
// Toolbar
// ============================================

export interface ToolbarCallbacks {
  onSetTool: (tool: AnnotationTool) => void;
  onDelete: () => void;
}

/**
 * Create toolbar
 */
export function createToolbar(
  container: HTMLElement,
  callbacks: ToolbarCallbacks,
  currentTool: AnnotationTool = 'select'
): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = `${PREFIX}-toolbar`;
  toolbar.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    padding: 8px;
    background: #1f2937;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 2147483648;
  `;

  const tools: { type: AnnotationTool | 'delete'; icon: string; tooltip: string }[] = [
    { type: 'select', icon: '↖', tooltip: 'Select (V)' },
    { type: 'rectangle', icon: '□', tooltip: 'Rectangle (R)' },
    { type: 'circle', icon: '○', tooltip: 'Circle (C)' },
    { type: 'arrow', icon: '→', tooltip: 'Arrow (A)' },
    { type: 'text', icon: 'T', tooltip: 'Text (T)' },
    { type: 'blur', icon: '◐', tooltip: 'Blur (B)' },
  ];

  for (const tool of tools) {
    const btn = createToolButton(
      tool.type,
      tool.icon,
      tool.tooltip,
      () => {
        callbacks.onSetTool(tool.type as AnnotationTool);
      },
      tool.type === currentTool
    );
    toolbar.appendChild(btn);
  }

  // Add divider
  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 1px;
    background: #374151;
    margin: 4px 8px;
  `;
  toolbar.appendChild(divider);

  // Add delete button
  const deleteBtn = createToolButton('delete', '🗑', 'Delete Selected (Del)', () => {
    callbacks.onDelete();
  });
  toolbar.appendChild(deleteBtn);

  container.appendChild(toolbar);
  return toolbar;
}

function createToolButton(
  type: AnnotationTool | 'delete',
  icon: string,
  tooltip: string,
  onClick: () => void,
  isActive = false
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${PREFIX}-tool-btn ${PREFIX}-tool-${type}`;
  btn.innerHTML = icon;
  btn.title = tooltip;
  btn.style.cssText = `
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${isActive ? '#374151' : 'transparent'};
    border: none;
    border-radius: 8px;
    color: #f3f4f6;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  btn.addEventListener('mouseenter', () => {
    if (!btn.classList.contains('active')) {
      btn.style.background = '#4b5563';
    }
  });

  btn.addEventListener('mouseleave', () => {
    if (!btn.classList.contains('active')) {
      btn.style.background = isActive ? '#374151' : 'transparent';
    }
  });

  btn.addEventListener('click', onClick);

  return btn;
}

/**
 * Update toolbar UI to reflect current tool
 */
export function updateToolbarUI(toolbar: HTMLElement | null, currentTool: AnnotationTool): void {
  if (!toolbar) return;

  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>(`.${PREFIX}-tool-btn`));
  for (const btn of buttons) {
    let toolType: AnnotationTool | 'delete' | null = null;
    if (btn.className.includes('select')) toolType = 'select';
    else if (btn.className.includes('rectangle')) toolType = 'rectangle';
    else if (btn.className.includes('circle')) toolType = 'circle';
    else if (btn.className.includes('arrow')) toolType = 'arrow';
    else if (btn.className.includes('text')) toolType = 'text';
    else if (btn.className.includes('blur')) toolType = 'blur';
    else if (btn.className.includes('delete')) toolType = 'delete';

    if (toolType && toolType !== 'delete') {
      btn.classList.toggle('active', toolType === currentTool);
      btn.style.background = toolType === currentTool ? '#374151' : 'transparent';
    }
  }
}

/**
 * Update cursor based on current tool
 */
export function updateCursor(canvas: HTMLCanvasElement | null, tool: AnnotationTool): void {
  if (!canvas) return;
  canvas.style.cursor = TOOL_CURSORS[tool];
}

// ============================================
// Color Picker
// ============================================

export interface ColorPickerCallbacks {
  onSetColor: (color: string) => void;
}

/**
 * Create color picker
 */
export function createColorPicker(
  container: HTMLElement,
  callbacks: ColorPickerCallbacks,
  currentColor: string
): HTMLElement {
  const colorPicker = document.createElement('div');
  colorPicker.className = `${PREFIX}-color-picker`;
  colorPicker.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    padding: 10px;
    background: #1f2937;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 2147483648;
    flex-wrap: wrap;
    max-width: 280px;
    justify-content: center;
  `;

  for (const color of COLORS) {
    const colorBtn = document.createElement('button');
    colorBtn.className = `${PREFIX}-color-btn`;
    colorBtn.dataset.color = color;
    colorBtn.title = color;
    colorBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid ${color === currentColor ? '#f3f4f6' : 'transparent'};
      background: ${color};
      cursor: pointer;
      transition: transform 0.2s ease;
      padding: 0;
    `;

    colorBtn.addEventListener('mouseenter', () => {
      colorBtn.style.transform = 'scale(1.2)';
    });

    colorBtn.addEventListener('mouseleave', () => {
      colorBtn.style.transform = 'scale(1)';
    });

    colorBtn.addEventListener('click', () => {
      callbacks.onSetColor(color);
    });

    colorPicker.appendChild(colorBtn);
  }

  container.appendChild(colorPicker);
  return colorPicker;
}

/**
 * Update color picker UI to reflect current color
 */
export function updateColorPickerUI(colorPicker: HTMLElement | null, currentColor: string): void {
  if (!colorPicker) return;

  const buttons = Array.from(
    colorPicker.querySelectorAll<HTMLButtonElement>(`.${PREFIX}-color-btn`)
  );
  for (const btn of buttons) {
    const color = btn.dataset.color;
    btn.style.borderColor = color === currentColor ? '#f3f4f6' : 'transparent';
  }
}

// ============================================
// Action Bar
// ============================================

export interface ActionBarCallbacks {
  onCopy: () => void;
  onDownloadPng: () => void;
  onDownloadJpg: () => void;
  onCancel: () => void;
}

/**
 * Create action bar
 */
export function createActionBar(
  container: HTMLElement,
  callbacks: ActionBarCallbacks
): HTMLElement {
  const actionBar = document.createElement('div');
  actionBar.className = `${PREFIX}-action-bar`;
  actionBar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    padding: 12px 20px;
    background: #1f2937;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 2147483648;
  `;

  // Copy button
  const copyBtn = createActionButton('Copy', '📋', callbacks.onCopy);
  actionBar.appendChild(copyBtn);

  // Download PNG button
  const downloadPngBtn = createActionButton('PNG', '💾', callbacks.onDownloadPng);
  actionBar.appendChild(downloadPngBtn);

  // Download JPG button
  const downloadJpgBtn = createActionButton('JPG', '🖼️', callbacks.onDownloadJpg);
  actionBar.appendChild(downloadJpgBtn);

  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 1px;
    background: #374151;
    margin: 0 4px;
  `;
  actionBar.appendChild(divider);

  // Cancel button
  const cancelBtn = createActionButton('Cancel', '✕', callbacks.onCancel, true);
  actionBar.appendChild(cancelBtn);

  container.appendChild(actionBar);
  return actionBar;
}

function createActionButton(
  label: string,
  icon: string,
  onClick: () => void,
  isDanger = false
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `${PREFIX}-action-btn ${PREFIX}-action-${label.toLowerCase()}`;
  btn.innerHTML = `<span style="margin-right: 6px;">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
  btn.style.cssText = `
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: ${isDanger ? '#dc2626' : '#3b82f6'};
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.background = isDanger ? '#b91c1c' : '#2563eb';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.background = isDanger ? '#dc2626' : '#3b82f6';
  });

  btn.addEventListener('click', onClick);

  return btn;
}

// ============================================
// Instructions
// ============================================

/**
 * Create instructions panel
 */
export function createInstructions(container: HTMLElement): HTMLElement {
  const instructions = document.createElement('div');
  instructions.className = `${PREFIX}-instructions`;
  instructions.style.cssText = `
    position: fixed;
    top: 140px;
    right: 20px;
    padding: 16px 20px;
    background: rgba(31, 41, 55, 0.95);
    border-radius: 12px;
    color: #f3f4f6;
    font-size: 13px;
    line-height: 1.6;
    z-index: 2147483648;
    max-width: 240px;
    backdrop-filter: blur(8px);
  `;

  instructions.innerHTML = `
    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #60a5fa;">Keyboard Shortcuts</h4>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px;">
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">V</kbd>
      <span>Select tool</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">R</kbd>
      <span>Rectangle</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">C</kbd>
      <span>Circle</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">A</kbd>
      <span>Arrow</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">T</kbd>
      <span>Text</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">B</kbd>
      <span>Blur</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Del</kbd>
      <span>Delete</span>
      <kbd style="background: #374151; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Esc</kbd>
      <span>Cancel</span>
    </div>
  `;

  container.appendChild(instructions);
  return instructions;
}

// ============================================
// Notification
// ============================================

/**
 * Show notification
 */
export function showNotification(
  container: HTMLElement | null,
  message: string,
  type: 'success' | 'error' = 'success'
): void {
  if (!container) return;

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'error' ? '#dc2626' : '#10b981'};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483649;
    animation: ${PREFIX}-slideUp 0.3s ease-out;
  `;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = `${PREFIX}-fadeOut 0.3s ease-out`;
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ============================================
// CSS Animations
// ============================================

/**
 * Inject CSS animations
 */
export function injectAnimations(): void {
  const styleId = `${PREFIX}-animations`;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes ${PREFIX}-slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes ${PREFIX}-fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
