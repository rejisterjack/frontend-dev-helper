/**
 * Performance Flame Graph Module
 *
 * Visualizes JavaScript execution and performance bottlenecks using:
 * - Performance profiling using PerformanceObserver
 * - Visual flame graph with zoom/pan
 * - Function details on hover
 * - Filter by duration threshold
 * - Long task detection (>50ms)
 * - Forced reflow detection
 * - Memory allocation tracking
 */

import type { FlameGraphEntry, PerformanceProfile } from '@/types';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';
import { performanceProfiler } from './profilers/performance-profiler';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-flame-graph';
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const BAR_HEIGHT = 20;
const BAR_GAP = 2;

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentProfile: PerformanceProfile | null = null;
let zoomLevel = 1;
let panOffset = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
// Track selected entry for detail view
let _selectedEntry: FlameGraphEntry | null = null;
void _selectedEntry; // Mark as intentionally used
let filterThreshold = 1; // Minimum duration in ms to show
const visibleTypes: Set<FlameGraphEntry['type']> = new Set([
  'script',
  'layout',
  'paint',
  'composite',
  'other',
]);

// ============================================
// Public API
// ============================================

/**
 * Enable the flame graph
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  startProfiling();
  logger.log('[FlameGraph] Enabled');
}

/**
 * Disable the flame graph
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  stopProfiling();
  destroyPanel();
  logger.log('[FlameGraph] Disabled');
}

/**
 * Toggle the flame graph
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; isPanelOpen: boolean; isProfiling: boolean } {
  return {
    enabled: isEnabled,
    isPanelOpen,
    isProfiling: performanceProfiler.isProfilingActive(),
  };
}

/**
 * Refresh the flame graph with latest data
 */
export function refresh(): void {
  if (!isEnabled) return;

  currentProfile = performanceProfiler.stopProfiling();
  renderFlameGraph();
  startProfiling();
}

/**
 * Start profiling
 */
export function startProfiling(): void {
  performanceProfiler.startProfiling({
    trackMemory: true,
    detectForcedReflows: true,
    onLongTask: (entry) => {
      logger.log('[FlameGraph] Long task detected:', entry.duration.toFixed(2), 'ms');
    },
  });
  updateStatus('Profiling...');
}

/**
 * Stop profiling and display results
 */
export function stopProfiling(): void {
  currentProfile = performanceProfiler.stopProfiling();
  renderFlameGraph();
  updateStatus('Ready');
}

/**
 * Set duration filter threshold
 */
export function setFilterThreshold(threshold: number): void {
  filterThreshold = threshold;
  if (currentProfile) {
    renderFlameGraph();
  }
}

/**
 * Toggle visibility of entry types
 */
export function toggleType(type: FlameGraphEntry['type']): void {
  if (visibleTypes.has(type)) {
    visibleTypes.delete(type);
  } else {
    visibleTypes.add(type);
  }
  if (currentProfile) {
    renderFlameGraph();
  }
}

/**
 * Export current profile as JSON
 */
export function exportProfile(): void {
  if (!currentProfile) {
    updateStatus('No data to export');
    return;
  }

  const dataStr = JSON.stringify(currentProfile, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `flame-graph-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  updateStatus('Exported');
}

/**
 * Reset zoom and pan
 */
export function resetView(): void {
  zoomLevel = 1;
  panOffset = { x: 0, y: 0 };
  if (currentProfile) {
    renderFlameGraph();
  }
}

// ============================================
// UI Panel
// ============================================

function createPanel(): void {
  if (panelContainer) return;

  panelContainer = document.createElement('div');
  panelContainer.id = `${PREFIX}-container`;
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 800px;
    height: 600px;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = getPanelHTML();
  shadowRoot.appendChild(panel);

  // Add event listeners
  setupEventListeners(panel);

  document.body.appendChild(panelContainer);
  isPanelOpen = true;
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  isPanelOpen = false;
  currentProfile = null;
}

function getPanelHTML(): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>🔥</span>
        <span>Performance Flame Graph</span>
      </div>
      <div id="${PREFIX}-actions">
        <button
          type="button" id="${PREFIX}-record" title="Start/Stop Profiling">⏺</button>
        <button
          type="button" id="${PREFIX}-refresh" title="Refresh Data">🔄</button>
        <button
          type="button" id="${PREFIX}-reset" title="Reset View">⌖</button>
        <button
          type="button" id="${PREFIX}-export" title="Export JSON">📤</button>
        <button
          type="button" id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-toolbar">
      <div id="${PREFIX}-filters">
        <label class="${PREFIX}-filter">
          <input type="checkbox" data-type="script" checked />
          <span class="${PREFIX}-type-script">Script</span>
        </label>
        <label class="${PREFIX}-filter">
          <input type="checkbox" data-type="layout" checked />
          <span class="${PREFIX}-type-layout">Layout</span>
        </label>
        <label class="${PREFIX}-filter">
          <input type="checkbox" data-type="paint" checked />
          <span class="${PREFIX}-type-paint">Paint</span>
        </label>
        <label class="${PREFIX}-filter">
          <input type="checkbox" data-type="composite" checked />
          <span class="${PREFIX}-type-composite">Composite</span>
        </label>
        <label class="${PREFIX}-filter">
          <input type="checkbox" data-type="other" checked />
          <span class="${PREFIX}-type-other">Other</span>
        </label>
      </div>
      <div id="${PREFIX}-threshold">
        <label>Min: <input type="range" id="${PREFIX}-threshold-input" min="0" max="50" value="1" /> <span id="${PREFIX}-threshold-value">1ms</span></label>
      </div>
    </div>
    
    <div id="${PREFIX}-canvas-container">
      <canvas id="${PREFIX}-canvas"></canvas>
      <div id="${PREFIX}-tooltip" class="${PREFIX}-hidden"></div>
    </div>
    
    <div id="${PREFIX}-info">
      <div id="${PREFIX}-stats">
        <span id="${PREFIX}-total-time">Total: 0ms</span>
        <span id="${PREFIX}-script-time">Script: 0ms</span>
        <span id="${PREFIX}-layout-time">Layout: 0ms</span>
        <span id="${PREFIX}-paint-time">Paint: 0ms</span>
        <span id="${PREFIX}-long-tasks">Long Tasks: 0</span>
      </div>
      <div id="${PREFIX}-zoom-controls">
        <button
          type="button" id="${PREFIX}-zoom-out">−</button>
        <span id="${PREFIX}-zoom-level">100%</span>
        <button
          type="button" id="${PREFIX}-zoom-in">+</button>
      </div>
    </div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-status">Ready</span>
      <span id="${PREFIX}-instructions">Scroll to zoom • Drag to pan • Click for details</span>
    </div>
    
    <div id="${PREFIX}-details" class="${PREFIX}-hidden">
      <div id="${PREFIX}-details-header">
        <h3>Function Details</h3>
        <button
          type="button" id="${PREFIX}-details-close">✕</button>
      </div>
      <div id="${PREFIX}-details-content"></div>
    </div>
  `;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Record button
  panel.querySelector(`#${PREFIX}-record`)?.addEventListener('click', () => {
    if (performanceProfiler.isProfilingActive()) {
      stopProfiling();
      updateRecordButton(false);
    } else {
      startProfiling();
      updateRecordButton(true);
    }
  });

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  // Reset view button
  panel.querySelector(`#${PREFIX}-reset`)?.addEventListener('click', () => {
    resetView();
    updateStatus('View reset');
  });

  // Export button
  panel.querySelector(`#${PREFIX}-export`)?.addEventListener('click', exportProfile);

  // Type filters
  panel.querySelectorAll(`#${PREFIX}-filters input`).forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      toggleType(target.dataset.type as FlameGraphEntry['type']);
    });
  });

  // Threshold slider
  const thresholdInput = panel.querySelector(`#${PREFIX}-threshold-input`) as HTMLInputElement;
  thresholdInput?.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    setFilterThreshold(value);
    const valueDisplay = panel.querySelector(`#${PREFIX}-threshold-value`);
    if (valueDisplay) {
      valueDisplay.textContent = `${value}ms`;
    }
  });

  // Zoom controls
  panel.querySelector(`#${PREFIX}-zoom-in`)?.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel * 1.2, MAX_ZOOM);
    renderFlameGraph();
    updateZoomDisplay();
  });

  panel.querySelector(`#${PREFIX}-zoom-out`)?.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel / 1.2, MIN_ZOOM);
    renderFlameGraph();
    updateZoomDisplay();
  });

  // Details panel close
  panel.querySelector(`#${PREFIX}-details-close`)?.addEventListener('click', () => {
    hideDetails();
  });

  // Canvas interactions
  setupCanvasInteractions(panel);
}

function setupCanvasInteractions(panel: HTMLElement): void {
  const canvas = panel.querySelector(`#${PREFIX}-canvas`) as HTMLCanvasElement;
  if (!canvas) return;

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * zoomFactor));

    // Zoom towards mouse position
    if (newZoom !== zoomLevel) {
      panOffset.x = mouseX - (mouseX - panOffset.x) * (newZoom / zoomLevel);
      zoomLevel = newZoom;
      renderFlameGraph();
      updateZoomDisplay();
    }
  });

  // Drag to pan
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart = { x: e.clientX - panOffset.x, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      panOffset.x = e.clientX - dragStart.x;
      renderFlameGraph();
    } else {
      // Show tooltip on hover
      const entry = getEntryAtPosition(x, y);
      if (entry) {
        showTooltip(e.clientX, e.clientY, entry);
        canvas.style.cursor = 'pointer';
      } else {
        hideTooltip();
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    hideTooltip();
    canvas.style.cursor = 'grab';
  });

  // Click to show details
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const entry = getEntryAtPosition(x, y);
    if (entry) {
      showDetails(entry);
    }
  });
}

// ============================================
// Flame Graph Rendering
// ============================================

function renderFlameGraph(): void {
  if (!shadowRoot || !currentProfile) return;

  const canvas = shadowRoot.querySelector(`#${PREFIX}-canvas`) as HTMLCanvasElement;
  if (!canvas) return;

  const container = shadowRoot.querySelector(`#${PREFIX}-canvas-container`) as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Filter entries
  const filteredEntries = currentProfile.entries
    .filter((e) => visibleTypes.has(e.type))
    .filter((e) => e.duration >= filterThreshold);

  if (filteredEntries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'No data available. Start profiling to collect performance data.',
      width / 2,
      height / 2
    );
    return;
  }

  // Calculate time range
  const totalDuration = currentProfile.summary.totalDuration || 1;
  const pixelsPerMs = (width / totalDuration) * zoomLevel;

  // Render entries
  renderEntries(ctx, filteredEntries, width, height, pixelsPerMs);

  // Update stats
  updateStats();
}

function renderEntries(
  ctx: CanvasRenderingContext2D,
  entries: FlameGraphEntry[],
  width: number,
  _height: number,
  pixelsPerMs: number
): void {
  const stack: FlameGraphEntry[] = [...entries];

  while (stack.length > 0) {
    const entry = stack.pop()!;

    const x = panOffset.x + entry.startTime * pixelsPerMs;
    const barWidth = Math.max(1, entry.duration * pixelsPerMs);
    const y = 40 + entry.depth * (BAR_HEIGHT + BAR_GAP);

    // Skip if outside visible area
    if (x + barWidth < 0 || x > width || y > _height) {
      continue;
    }

    // Draw bar
    const color = getEntryColor(entry);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth, BAR_HEIGHT);

    // Draw border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, barWidth, BAR_HEIGHT);

    // Draw text if bar is wide enough
    if (barWidth > 50) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textBaseline = 'middle';

      const text = truncateText(ctx, entry.name, barWidth - 8);
      ctx.fillText(text, x + 4, y + BAR_HEIGHT / 2);
    }

    // Add children to stack
    for (let i = entry.children.length - 1; i >= 0; i--) {
      const child = entry.children[i];
      if (visibleTypes.has(child.type) && child.duration >= filterThreshold) {
        stack.push(child);
      }
    }
  }

  // Draw time axis (at fixed position)
  drawTimeAxis(ctx, width, pixelsPerMs);
}

function drawTimeAxis(ctx: CanvasRenderingContext2D, width: number, pixelsPerMs: number): void {
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 35);
  ctx.lineTo(width, 35);
  ctx.stroke();

  // Draw time markers
  const timeStep = Math.max(10, Math.floor(100 / pixelsPerMs / 10) * 10);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  for (let t = 0; t * pixelsPerMs + panOffset.x < width; t += timeStep) {
    const x = t * pixelsPerMs + panOffset.x;
    if (x >= 0) {
      ctx.fillText(`${t}ms`, x, 25);

      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 35);
      ctx.stroke();
    }
  }
}

function getEntryColor(entry: FlameGraphEntry): string {
  const colors: Record<FlameGraphEntry['type'], string> = {
    script: '#f59e0b', // Amber
    layout: '#3b82f6', // Blue
    paint: '#10b981', // Emerald
    composite: '#8b5cf6', // Violet
    other: '#64748b', // Slate
  };

  return colors[entry.type] || colors.other;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated.length < text.length) {
    truncated = `${truncated.slice(0, -2)}...`;
  }
  return truncated;
}

function getEntryAtPosition(x: number, y: number): FlameGraphEntry | null {
  if (!currentProfile) return null;

  const container = shadowRoot?.querySelector(`#${PREFIX}-canvas-container`) as HTMLElement;
  if (!container) return null;

  const width = container.clientWidth;
  const totalDuration = currentProfile.summary.totalDuration || 1;
  const pixelsPerMs = (width / totalDuration) * zoomLevel;

  const stack: FlameGraphEntry[] = [...currentProfile.entries];

  while (stack.length > 0) {
    const entry = stack.pop()!;

    const entryX = panOffset.x + entry.startTime * pixelsPerMs;
    const entryWidth = Math.max(1, entry.duration * pixelsPerMs);
    const entryY = 40 + entry.depth * (BAR_HEIGHT + BAR_GAP);

    if (x >= entryX && x <= entryX + entryWidth && y >= entryY && y <= entryY + BAR_HEIGHT) {
      return entry;
    }

    // Check children
    for (const child of entry.children) {
      if (visibleTypes.has(child.type) && child.duration >= filterThreshold) {
        stack.push(child);
      }
    }
  }

  return null;
}

// ============================================
// UI Updates
// ============================================

function updateRecordButton(isRecording: boolean): void {
  const button = shadowRoot?.querySelector(`#${PREFIX}-record`);
  if (button) {
    button.textContent = isRecording ? '⏹' : '⏺';
    button.classList.toggle(`${PREFIX}-recording`, isRecording);
  }
}

function updateZoomDisplay(): void {
  const display = shadowRoot?.querySelector(`#${PREFIX}-zoom-level`);
  if (display) {
    display.textContent = `${Math.round(zoomLevel * 100)}%`;
  }
}

function updateStats(): void {
  if (!currentProfile) return;

  const { summary } = currentProfile;

  const totalTimeEl = shadowRoot?.querySelector(`#${PREFIX}-total-time`);
  const scriptTimeEl = shadowRoot?.querySelector(`#${PREFIX}-script-time`);
  const layoutTimeEl = shadowRoot?.querySelector(`#${PREFIX}-layout-time`);
  const paintTimeEl = shadowRoot?.querySelector(`#${PREFIX}-paint-time`);
  const longTasksEl = shadowRoot?.querySelector(`#${PREFIX}-long-tasks`);

  if (totalTimeEl) totalTimeEl.textContent = `Total: ${summary.totalDuration.toFixed(0)}ms`;
  if (scriptTimeEl) scriptTimeEl.textContent = `Script: ${summary.scriptTime.toFixed(0)}ms`;
  if (layoutTimeEl) layoutTimeEl.textContent = `Layout: ${summary.layoutTime.toFixed(0)}ms`;
  if (paintTimeEl) paintTimeEl.textContent = `Paint: ${summary.paintTime.toFixed(0)}ms`;
  if (longTasksEl) longTasksEl.textContent = `Long Tasks: ${summary.longTasks}`;
}

function updateStatus(message: string): void {
  const statusEl = shadowRoot?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, 2000);
  }
}

function showTooltip(x: number, y: number, entry: FlameGraphEntry): void {
  const tooltip = shadowRoot?.querySelector(`#${PREFIX}-tooltip`) as HTMLElement;
  if (!tooltip) return;

  tooltip.innerHTML = `
    <div class="${PREFIX}-tooltip-name">${escapeHtml(entry.name)}</div>
    <div class="${PREFIX}-tooltip-details">
      <span>Duration: ${entry.duration.toFixed(2)}ms</span>
      <span>Type: ${entry.type}</span>
      <span>Start: ${entry.startTime.toFixed(2)}ms</span>
    </div>
  `;

  tooltip.classList.remove(`${PREFIX}-hidden`);

  // Position tooltip
  const panelRect = panelContainer?.getBoundingClientRect();
  if (panelRect) {
    const tooltipX = x - panelRect.left + 10;
    const tooltipY = y - panelRect.top - 10;
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
  }
}

function hideTooltip(): void {
  const tooltip = shadowRoot?.querySelector(`#${PREFIX}-tooltip`) as HTMLElement;
  tooltip?.classList.add(`${PREFIX}-hidden`);
}

function showDetails(entry: FlameGraphEntry): void {
  _selectedEntry = entry;
  void _selectedEntry;
  const details = shadowRoot?.querySelector(`#${PREFIX}-details`) as HTMLElement;
  const content = shadowRoot?.querySelector(`#${PREFIX}-details-content`) as HTMLElement;

  if (!details || !content) return;

  content.innerHTML = `
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Name:</span>
      <span class="${PREFIX}-detail-value">${escapeHtml(entry.name)}</span>
    </div>
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Type:</span>
      <span class="${PREFIX}-detail-value ${PREFIX}-type-${entry.type}">${entry.type}</span>
    </div>
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Duration:</span>
      <span class="${PREFIX}-detail-value">${entry.duration.toFixed(3)}ms</span>
    </div>
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Start Time:</span>
      <span class="${PREFIX}-detail-value">${entry.startTime.toFixed(3)}ms</span>
    </div>
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">End Time:</span>
      <span class="${PREFIX}-detail-value">${entry.endTime.toFixed(3)}ms</span>
    </div>
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Depth:</span>
      <span class="${PREFIX}-detail-value">${entry.depth}</span>
    </div>
    ${
      entry.source
        ? `
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Source:</span>
      <span class="${PREFIX}-detail-value">${escapeHtml(entry.source)}</span>
    </div>
    `
        : ''
    }
    ${
      entry.line
        ? `
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Line:</span>
      <span class="${PREFIX}-detail-value">${entry.line}</span>
    </div>
    `
        : ''
    }
    <div class="${PREFIX}-detail-row">
      <span class="${PREFIX}-detail-label">Children:</span>
      <span class="${PREFIX}-detail-value">${entry.children.length}</span>
    </div>
  `;

  details.classList.remove(`${PREFIX}-hidden`);
}

function hideDetails(): void {
  _selectedEntry = null;
  void _selectedEntry;
  const details = shadowRoot?.querySelector(`#${PREFIX}-details`) as HTMLElement;
  details?.classList.add(`${PREFIX}-hidden`);
}

// ============================================
// Styles
// ============================================

function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    }

    #${PREFIX}-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      background: #1e293b;
      flex-shrink: 0;
    }

    #${PREFIX}-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    #${PREFIX}-actions {
      display: flex;
      gap: 4px;
    }

    #${PREFIX}-actions button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.2s;
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    #${PREFIX}-actions button.${PREFIX}-recording {
      color: #ef4444;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    #${PREFIX}-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid #334155;
      background: #1e293b;
      flex-shrink: 0;
      gap: 16px;
    }

    #${PREFIX}-filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .${PREFIX}-filter {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .${PREFIX}-filter input {
      cursor: pointer;
    }

    .${PREFIX}-type-script { color: #f59e0b; }
    .${PREFIX}-type-layout { color: #3b82f6; }
    .${PREFIX}-type-paint { color: #10b981; }
    .${PREFIX}-type-composite { color: #8b5cf6; }
    .${PREFIX}-type-other { color: #64748b; }

    #${PREFIX}-threshold {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      white-space: nowrap;
    }

    #${PREFIX}-threshold input {
      width: 80px;
    }

    #${PREFIX}-canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #0f172a;
    }

    #${PREFIX}-canvas {
      width: 100%;
      height: 100%;
      cursor: grab;
    }

    #${PREFIX}-canvas:active {
      cursor: grabbing;
    }

    #${PREFIX}-tooltip {
      position: absolute;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      z-index: 100;
      max-width: 300px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    #${PREFIX}-tooltip.${PREFIX}-hidden {
      display: none;
    }

    .${PREFIX}-tooltip-name {
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .${PREFIX}-tooltip-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: #94a3b8;
      font-size: 11px;
    }

    #${PREFIX}-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      flex-shrink: 0;
    }

    #${PREFIX}-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      flex-wrap: wrap;
    }

    #${PREFIX}-stats span {
      color: #94a3b8;
    }

    #${PREFIX}-zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #${PREFIX}-zoom-controls button {
      background: #334155;
      border: none;
      color: #e2e8f0;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #${PREFIX}-zoom-controls button:hover {
      background: #475569;
    }

    #${PREFIX}-zoom-level {
      min-width: 50px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      font-size: 11px;
      color: #64748b;
      flex-shrink: 0;
    }

    #${PREFIX}-details {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      width: 320px;
      max-height: 400px;
      overflow: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 100;
    }

    #${PREFIX}-details.${PREFIX}-hidden {
      display: none;
    }

    #${PREFIX}-details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      background: #0f172a;
    }

    #${PREFIX}-details-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    #${PREFIX}-details-header button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }

    #${PREFIX}-details-header button:hover {
      color: #f8fafc;
    }

    #${PREFIX}-details-content {
      padding: 12px 16px;
    }

    .${PREFIX}-detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #334155;
    }

    .${PREFIX}-detail-row:last-child {
      border-bottom: none;
    }

    .${PREFIX}-detail-label {
      color: #94a3b8;
      font-size: 12px;
    }

    .${PREFIX}-detail-value {
      color: #f8fafc;
      font-size: 12px;
      font-family: monospace;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Scrollbar */
    #${PREFIX}-details::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-details::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-details::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-details::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}

// ============================================
// Export singleton
// ============================================

export const flameGraph = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  startProfiling,
  stopProfiling,
  setFilterThreshold,
  toggleType,
  exportProfile,
  resetView,
};

export default flameGraph;
