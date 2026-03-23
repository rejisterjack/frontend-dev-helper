/**
 * Visual Regression UI
 *
 * UI component creation and management for the visual regression module.
 */

import { escapeHtml } from '@/utils/sanitize';
import { PANEL_CONFIG, PREFIX, PREVIEW_CONFIG, THRESHOLD_CONFIG } from './constants';

/**
 * Get the panel HTML content
 */
export function getPanelHTML(): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>📸</span>
        <span>Visual Regression</span>
      </div>
      <div id="${PREFIX}-actions">
        <button
          type="button" id="${PREFIX}-settings" title="Settings">⚙️</button>
        <button
          type="button" id="${PREFIX}-export" title="Export All">📤</button>
        <button
          type="button" id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-tabs">
      <button
        type="button" class="${PREFIX}-tab active" data-tab="baselines">
        Baselines
        <span class="${PREFIX}-badge" id="${PREFIX}-baseline-count">0</span>
      </button>
      <button
        type="button" class="${PREFIX}-tab" data-tab="tests">
        Tests
        <span class="${PREFIX}-badge" id="${PREFIX}-test-count">0</span>
      </button>
    </div>
    
    <div id="${PREFIX}-content">
      <div id="${PREFIX}-baselines-panel" class="${PREFIX}-panel active">
        <div class="${PREFIX}-toolbar">
          <button
            type="button" id="${PREFIX}-capture-viewport" class="${PREFIX}-btn-primary">Capture Viewport</button>
          <button
            type="button" id="${PREFIX}-capture-full" class="${PREFIX}-btn-secondary">Capture Full Page</button>
        </div>
        <div id="${PREFIX}-baselines-list" class="${PREFIX}-list"></div>
      </div>
      
      <div id="${PREFIX}-tests-panel" class="${PREFIX}-panel">
        <div class="${PREFIX}-toolbar">
          <button
            type="button" id="${PREFIX}-run-test" class="${PREFIX}-btn-primary" disabled>Run Test</button>
          <button
            type="button" id="${PREFIX}-run-batch" class="${PREFIX}-btn-secondary">Run Batch</button>
        </div>
        <div id="${PREFIX}-tests-list" class="${PREFIX}-list"></div>
      </div>
    </div>
    
    <div id="${PREFIX}-settings-panel" class="${PREFIX}-panel hidden">
      <div class="${PREFIX}-settings-section">
        <label>Threshold (%)</label>
        <input type="range" id="${PREFIX}-threshold" min="${THRESHOLD_CONFIG.min}" max="${THRESHOLD_CONFIG.max}" step="${THRESHOLD_CONFIG.step}" value="0.1">
        <span id="${PREFIX}-threshold-value">0.1%</span>
      </div>
      <div class="${PREFIX}-settings-section">
        <label>Ignore Regions</label>
        <div id="${PREFIX}-ignore-regions"></div>
        <button
          type="button" id="${PREFIX}-clear-regions" class="${PREFIX}-btn-secondary">Clear All</button>
      </div>
    </div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-status">Ready</span>
      <span id="${PREFIX}-info"></span>
    </div>
    
    <input type="file" id="${PREFIX}-import-input" accept=".json" style="display: none;">
  `;
}

/**
 * Get the CSS styles for the panel
 */
export function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: ${PANEL_CONFIG.maxHeight};
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
      position: relative;
    }

    #${PREFIX}-actions button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    .${PREFIX}-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 10;
    }

    .${PREFIX}-dropdown button {
      padding: 8px 12px;
      text-align: left;
      white-space: nowrap;
    }

    #${PREFIX}-tabs {
      display: flex;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    .${PREFIX}-tab {
      flex: 1;
      padding: 10px 12px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .${PREFIX}-tab:hover {
      color: #e2e8f0;
      background: #334155;
    }

    .${PREFIX}-tab.active {
      color: #f8fafc;
      background: #0f172a;
      border-bottom: 2px solid #4f46e5;
    }

    .${PREFIX}-badge {
      background: #334155;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      min-width: 18px;
      text-align: center;
    }

    #${PREFIX}-content {
      flex: 1;
      overflow-y: auto;
      min-height: 200px;
    }

    .${PREFIX}-panel {
      display: none;
      padding: 12px;
    }

    .${PREFIX}-panel.active {
      display: block;
    }

    .${PREFIX}-panel.hidden {
      display: none !important;
    }

    .${PREFIX}-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .${PREFIX}-btn-primary,
    .${PREFIX}-btn-secondary {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }

    .${PREFIX}-btn-primary {
      background: #4f46e5;
      color: white;
    }

    .${PREFIX}-btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .${PREFIX}-btn-primary:disabled {
      background: #475569;
      cursor: not-allowed;
    }

    .${PREFIX}-btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }

    .${PREFIX}-btn-secondary:hover {
      background: #475569;
    }

    .${PREFIX}-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .${PREFIX}-empty {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
      font-size: 13px;
    }

    .${PREFIX}-empty-small {
      color: #64748b;
      font-size: 12px;
    }

    .${PREFIX}-baseline,
    .${PREFIX}-test {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
      cursor: pointer;
    }

    .${PREFIX}-baseline:hover,
    .${PREFIX}-test:hover {
      border-color: #475569;
    }

    .${PREFIX}-baseline.selected {
      border-color: #4f46e5;
      background: #1e1b4b;
    }

    .${PREFIX}-test.passed {
      border-left: 3px solid #22c55e;
    }

    .${PREFIX}-test.failed {
      border-left: 3px solid #ef4444;
    }

    .${PREFIX}-baseline-preview,
    .${PREFIX}-test-preview {
      width: 100%;
      height: ${PREVIEW_CONFIG.height}px;
      overflow: hidden;
      border-radius: 4px;
      margin-bottom: 8px;
      background: #0f172a;
    }

    .${PREFIX}-baseline-preview img,
    .${PREFIX}-test-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .${PREFIX}-baseline-info,
    .${PREFIX}-test-header {
      margin-bottom: 8px;
    }

    .${PREFIX}-baseline-date,
    .${PREFIX}-test-date {
      font-weight: 500;
      font-size: 12px;
    }

    .${PREFIX}-baseline-meta,
    .${PREFIX}-test-diff {
      font-size: 11px;
      color: #64748b;
    }

    .${PREFIX}-test-status {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      font-size: 12px;
      margin-right: 8px;
    }

    .${PREFIX}-test-status.passed {
      background: #22c55e;
      color: white;
    }

    .${PREFIX}-test-status.failed {
      background: #ef4444;
      color: white;
    }

    .${PREFIX}-baseline-actions,
    .${PREFIX}-test-actions {
      display: flex;
      gap: 8px;
    }

    .${PREFIX}-baseline-actions button,
    .${PREFIX}-test-actions button {
      flex: 1;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      background: #334155;
      color: #e2e8f0;
    }

    .${PREFIX}-baseline-actions button:hover,
    .${PREFIX}-test-actions button:hover {
      background: #475569;
    }

    .${PREFIX}-select-btn {
      background: #4f46e5 !important;
    }

    .${PREFIX}-approve-btn {
      background: #059669 !important;
    }

    .${PREFIX}-reject-btn {
      background: #dc2626 !important;
    }

    #${PREFIX}-settings-panel {
      padding: 16px;
    }

    .${PREFIX}-settings-section {
      margin-bottom: 16px;
    }

    .${PREFIX}-settings-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 12px;
    }

    .${PREFIX}-settings-section input[type="range"] {
      width: 100%;
      margin-bottom: 4px;
    }

    .${PREFIX}-region {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #1e293b;
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .${PREFIX}-region button {
      padding: 2px 8px;
      font-size: 10px;
      background: #475569;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      font-size: 11px;
      color: #64748b;
    }

    /* Scrollbar */
    #${PREFIX}-content::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}

/**
 * Render baseline item HTML
 */
export function renderBaselineItem(
  id: string,
  screenshot: string,
  date: string,
  viewport: { width: number; height: number },
  isSelected: boolean
): string {
  const escapedDate = escapeHtml(date);
  const escapedId = escapeHtml(id);

  return `
    <div class="${PREFIX}-baseline ${isSelected ? 'selected' : ''}" data-id="${escapedId}">
      <div class="${PREFIX}-baseline-preview">
        <img src="${screenshot}" alt="Baseline" loading="lazy">
      </div>
      <div class="${PREFIX}-baseline-info">
        <div class="${PREFIX}-baseline-date">${escapedDate}</div>
        <div class="${PREFIX}-baseline-meta">
          ${viewport.width}×${viewport.height}
        </div>
      </div>
      <div class="${PREFIX}-baseline-actions">
        <button
          type="button" class="${PREFIX}-select-btn" data-id="${escapedId}">
          ${isSelected ? '✓' : 'Select'}
        </button>
        <button
          type="button" class="${PREFIX}-delete-btn" data-id="${escapedId}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Render test item HTML
 */
export function renderTestItem(
  id: string,
  date: string,
  status: 'passed' | 'failed' | 'approved',
  diffPercentage: number,
  diffImage: string | undefined
): string {
  const escapedDate = escapeHtml(date);
  const escapedId = escapeHtml(id);
  const statusClass = status === 'passed' || status === 'approved' ? 'passed' : 'failed';
  const statusIcon = status === 'passed' ? '✓' : status === 'approved' ? '✓✓' : '✗';

  const diffImageHtml = diffImage
    ? `
      <div class="${PREFIX}-test-preview">
        <img src="${diffImage}" alt="Diff" loading="lazy">
      </div>
    `
    : '';

  const actionsHtml =
    status === 'failed'
      ? `
      <button
        type="button" class="${PREFIX}-approve-btn" data-id="${escapedId}">Approve</button>
      <button
        type="button" class="${PREFIX}-reject-btn" data-id="${escapedId}">Reject</button>
    `
      : '';

  const exportHtml = diffImage
    ? `<button class="${PREFIX}-export-btn" data-id="${escapedId}">Export</button>`
    : '';

  return `
    <div class="${PREFIX}-test ${statusClass}" data-id="${escapedId}">
      <div class="${PREFIX}-test-header">
        <span class="${PREFIX}-test-status ${statusClass}">
          ${statusIcon}
        </span>
        <span class="${PREFIX}-test-date">${escapedDate}</span>
        <span class="${PREFIX}-test-diff">${diffPercentage.toFixed(2)}%</span>
      </div>
      ${diffImageHtml}
      <div class="${PREFIX}-test-actions">
        ${actionsHtml}
        ${exportHtml}
        <button
          type="button" class="${PREFIX}-delete-btn" data-id="${escapedId}">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Render ignore region item HTML
 */
export function renderIgnoreRegionItem(
  index: number,
  region: { x: number; y: number; width: number; height: number }
): string {
  return `
    <div class="${PREFIX}-region">
      <span>${region.x}, ${region.y} (${region.width}×${region.height})</span>
      <button
        type="button" data-index="${index}">Remove</button>
    </div>
  `;
}

/**
 * Render empty state HTML
 */
export function renderEmptyState(message: string): string {
  return `<div class="${PREFIX}-empty">${escapeHtml(message)}</div>`;
}

/**
 * Render export dropdown HTML
 */
export function renderExportDropdown(prefix: string): string {
  return `
    <div class="${prefix}-dropdown">
      <button
        type="button" id="${prefix}-export-data">Export Data (JSON)</button>
      <button
        type="button" id="${prefix}-import-data">Import Data</button>
    </div>
  `;
}
