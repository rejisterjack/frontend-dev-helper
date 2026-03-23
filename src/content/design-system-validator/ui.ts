/**
 * UI Components for Design System Validator
 * Functions for creating and managing the validator UI
 */

import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';
import {
  getPanelElement,
  getShadowHost,
  getShadowRoot,
  setPanelElement,
  setShadowHost,
  setShadowRoot,
  state,
} from './constants';
import { validate } from './core';

type DisableFn = () => void;
let disableFn: DisableFn | null = null;

import type { ValidationReport, Violation } from './types';

const STYLES = `
  :host {
    --dsv-bg: #0f172a;
    --dsv-bg-secondary: #1e293b;
    --dsv-bg-tertiary: #334155;
    --dsv-text: #f1f5f9;
    --dsv-text-secondary: #94a3b8;
    --dsv-border: #334155;
    --dsv-accent: #3b82f6;
    --dsv-accent-hover: #2563eb;
    --dsv-error: #ef4444;
    --dsv-warning: #f59e0b;
    --dsv-success: #22c55e;
    --dsv-radius: 8px;
    --dsv-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  #dsv-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 80vh;
    background: var(--dsv-bg);
    border: 1px solid var(--dsv-border);
    border-radius: var(--dsv-radius);
    box-shadow: var(--dsv-shadow);
    color: var(--dsv-text);
    font-size: 14px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dsv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--dsv-bg-secondary);
    border-bottom: 1px solid var(--dsv-border);
    cursor: move;
    user-select: none;
  }

  .dsv-title {
    font-weight: 600;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dsv-icon {
    width: 20px;
    height: 20px;
    color: var(--dsv-accent);
  }

  .dsv-close-btn {
    background: none;
    border: none;
    color: var(--dsv-text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .dsv-close-btn:hover {
    color: var(--dsv-text);
    background: var(--dsv-bg-tertiary);
  }

  .dsv-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .dsv-section {
    margin-bottom: 20px;
  }

  .dsv-section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--dsv-text-secondary);
    margin-bottom: 12px;
  }

  .dsv-select {
    width: 100%;
    padding: 10px 12px;
    background: var(--dsv-bg-secondary);
    border: 1px solid var(--dsv-border);
    border-radius: var(--dsv-radius);
    color: var(--dsv-text);
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .dsv-select:focus {
    outline: none;
    border-color: var(--dsv-accent);
  }

  .dsv-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    cursor: pointer;
    transition: background 0.2s;
  }

  .dsv-toggle:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dsv-switch {
    width: 44px;
    height: 24px;
    background: var(--dsv-bg-tertiary);
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
  }

  .dsv-switch.active {
    background: var(--dsv-accent);
  }

  .dsv-switch-thumb {
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  .dsv-switch.active .dsv-switch-thumb {
    transform: translateX(20px);
  }

  .dsv-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .dsv-stat {
    padding: 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    text-align: center;
  }

  .dsv-stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--dsv-accent);
  }

  .dsv-stat-value.error {
    color: var(--dsv-error);
  }

  .dsv-stat-value.warning {
    color: var(--dsv-warning);
  }

  .dsv-stat-label {
    font-size: 12px;
    color: var(--dsv-text-secondary);
    margin-top: 4px;
  }

  .dsv-violations {
    max-height: 200px;
    overflow-y: auto;
  }

  .dsv-violation {
    padding: 10px 12px;
    background: var(--dsv-bg-secondary);
    border-radius: var(--dsv-radius);
    margin-bottom: 8px;
    border-left: 3px solid var(--dsv-warning);
    cursor: pointer;
    transition: background 0.2s;
  }

  .dsv-violation:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-violation.error {
    border-left-color: var(--dsv-error);
  }

  .dsv-violation-type {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--dsv-text-secondary);
    margin-bottom: 4px;
  }

  .dsv-violation-message {
    font-size: 13px;
    line-height: 1.4;
  }

  .dsv-violation-value {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--dsv-warning);
    margin-top: 4px;
  }

  .dsv-btn {
    width: 100%;
    padding: 12px;
    background: var(--dsv-accent);
    border: none;
    border-radius: var(--dsv-radius);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dsv-btn:hover {
    background: var(--dsv-accent-hover);
  }

  .dsv-btn-secondary {
    background: var(--dsv-bg-secondary);
    border: 1px solid var(--dsv-border);
  }

  .dsv-btn-secondary:hover {
    background: var(--dsv-bg-tertiary);
  }

  .dsv-empty {
    text-align: center;
    padding: 32px;
    color: var(--dsv-text-secondary);
  }

  .dsv-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    color: var(--dsv-success);
  }

  .dsv-highlight {
    outline: 2px solid var(--dsv-warning) !important;
    outline-offset: 2px !important;
  }

  .dsv-highlight-error {
    outline: 2px solid var(--dsv-error) !important;
    outline-offset: 2px !important;
  }

  .dsv-actions {
    display: flex;
    gap: 8px;
  }

  .dsv-actions .dsv-btn {
    flex: 1;
  }
`;

function createPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'dsv-panel';
  panel.innerHTML = `
    <div class="dsv-header" id="dsv-header">
      <div class="dsv-title">
        <svg
          aria-hidden="true" class="dsv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Design System Validator
      </div>
      <button
        type="button" class="dsv-close-btn" id="dsv-close" title="Close">
        <svg
          aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="dsv-content">
      <div class="dsv-section">
        <div class="dsv-section-title">Design System</div>
        <select class="dsv-select" id="dsv-preset">
          <option value="tailwind">Tailwind CSS</option>
          <option value="material">Material Design 3</option>
          <option value="bootstrap">Bootstrap 5</option>
          <option value="custom">Custom Tokens</option>
        </select>
      </div>

      <div class="dsv-section">
        <div class="dsv-toggle" id="dsv-highlight-toggle">
          <span class="dsv-toggle-label">
            <svg
              aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Visual Highlighting
          </span>
          <div class="dsv-switch active" id="dsv-switch">
            <div class="dsv-switch-thumb"></div>
          </div>
        </div>
      </div>

      <div class="dsv-section">
        <div class="dsv-section-title">Validation Results</div>
        <div class="dsv-stats" id="dsv-stats">
          <div class="dsv-stat">
            <div class="dsv-stat-value" id="dsv-total-violations">-</div>
            <div class="dsv-stat-label">Violations</div>
          </div>
          <div class="dsv-stat">
            <div class="dsv-stat-value" id="dsv-total-elements">-</div>
            <div class="dsv-stat-label">Elements</div>
          </div>
        </div>
      </div>

      <div class="dsv-section">
        <div class="dsv-section-title">Issues Found</div>
        <div class="dsv-violations" id="dsv-violations">
          <div class="dsv-empty">
            <svg
              aria-hidden="true" class="dsv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>Click "Validate Page" to check for inconsistencies</p>
          </div>
        </div>
      </div>

      <div class="dsv-actions">
        <button
          type="button" class="dsv-btn" id="dsv-validate">
          <svg
            aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Validate Page
        </button>
        <button
          type="button" class="dsv-btn dsv-btn-secondary" id="dsv-export">
          <svg
            aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export
        </button>
      </div>
    </div>
  `;
  return panel;
}

function makeDraggable(header: HTMLElement, panel: HTMLElement): void {
  let isDragging = false;
  let startX: number, startY: number;
  let initialLeft: number, initialTop: number;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.margin = '0';
    panel.style.top = `${initialTop}px`;
    panel.style.left = `${initialLeft}px`;
    panel.style.right = 'auto';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

export function updateStats(report: ValidationReport): void {
  const root = getShadowRoot();
  if (!root) return;
  const totalViolationsEl = root.getElementById('dsv-total-violations');
  const totalElementsEl = root.getElementById('dsv-total-elements');
  const violationsListEl = root.getElementById('dsv-violations');

  if (totalViolationsEl) {
    totalViolationsEl.textContent = String(report.violations.length);
    totalViolationsEl.className = `dsv-stat-value ${report.violations.length > 0 ? 'error' : ''}`;
  }

  if (totalElementsEl) {
    totalElementsEl.textContent = String(report.totalElements);
  }

  if (violationsListEl) {
    if (report.violations.length === 0) {
      violationsListEl.innerHTML = `
        <div class="dsv-empty">
          <svg
            aria-hidden="true" class="dsv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>No violations found! Your page follows the design system.</p>
        </div>
      `;
    } else {
      const grouped = report.violations.slice(0, 20).reduce(
        (acc, v) => {
          acc[v.type] = acc[v.type] || [];
          acc[v.type].push(v);
          return acc;
        },
        {} as Record<string, Violation[]>
      );

      violationsListEl.innerHTML = Object.entries(grouped)
        .map(([type, violations]) =>
          violations
            .map(
              (v) => `
            <div class="dsv-violation ${v.severity}" data-violation-id="${v.id}">
              <div class="dsv-violation-type">${escapeHtml(type)}</div>
              <div class="dsv-violation-message">${escapeHtml(v.message)}</div>
              ${v.actualValue ? `<div class="dsv-violation-value">${escapeHtml(v.actualValue)}</div>` : ''}
            </div>
          `
            )
            .join('')
        )
        .join('');

      // Add click handlers to highlight elements
      violationsListEl.querySelectorAll('.dsv-violation').forEach((el) => {
        el.addEventListener('click', () => {
          const violationId = el.getAttribute('data-violation-id');
          const violation = report.violations.find((v) => v.id === violationId);
          if (violation) {
            violation.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (state.highlightingEnabled) {
              highlightElement(violation.element, violation.severity);
            }
          }
        });
      });
    }
  }
}

export function highlightElement(element: HTMLElement, severity: 'error' | 'warning'): void {
  const className = severity === 'error' ? 'dsv-highlight-error' : 'dsv-highlight';
  element.classList.add(className);
  setTimeout(() => {
    element.classList.remove(className);
  }, 2000);
}

export function updateHighlights(): void {
  // Remove all existing highlights
  document.querySelectorAll('.dsv-highlight, .dsv-highlight-error').forEach((el) => {
    el.classList.remove('dsv-highlight', 'dsv-highlight-error');
  });

  if (!state.highlightingEnabled) return;

  // Add highlights to violations
  for (const violation of state.violations) {
    const className = violation.severity === 'error' ? 'dsv-highlight-error' : 'dsv-highlight';
    violation.element.classList.add(className);
  }
}

export function exportReport(report: ValidationReport): void {
  const data = {
    ...report,
    violations: report.violations.map((v) => ({
      ...v,
      element: v.element.tagName,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `design-system-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function attachEventListeners(): void {
  const root = getShadowRoot();
  if (!root) return;

  const closeBtn = root.getElementById('dsv-close');
  const presetSelect = root.getElementById('dsv-preset') as HTMLSelectElement;
  const highlightToggle = root.getElementById('dsv-highlight-toggle');
  const validateBtn = root.getElementById('dsv-validate');
  const exportBtn = root.getElementById('dsv-export');
  const header = root.getElementById('dsv-header');
  const panel = getPanelElement();

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      disableFn?.();
    });
  }

  if (presetSelect) {
    presetSelect.value = state.currentPreset;
    presetSelect.addEventListener('change', (e) => {
      state.currentPreset = (e.target as HTMLSelectElement).value;
      if (state.report) {
        const report = validate();
        updateStats(report);
        updateHighlights();
      }
    });
  }

  if (highlightToggle) {
    highlightToggle.addEventListener('click', () => {
      state.highlightingEnabled = !state.highlightingEnabled;
      const switchEl = root?.getElementById('dsv-switch');
      if (switchEl) {
        switchEl.classList.toggle('active', state.highlightingEnabled);
      }
      updateHighlights();
    });
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', () => {
      validateBtn.textContent = 'Validating...';
      (validateBtn as HTMLButtonElement).disabled = true;

      requestAnimationFrame(() => {
        const report = validate();
        updateStats(report);
        updateHighlights();
        validateBtn.innerHTML = `
          <svg
            aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Validate Page
        `;
        (validateBtn as HTMLButtonElement).disabled = false;
      });
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (state.report) {
        exportReport(state.report);
      } else {
        logger.warn('No report available to export');
        alert('Please validate the page first before exporting.');
      }
    });
  }

  if (header && panel) {
    makeDraggable(header, panel);
  }
}

export function createUI(onClose?: DisableFn): void {
  if (onClose) {
    disableFn = onClose;
  }
  if (getShadowHost() || getShadowRoot()) return;

  const host = document.createElement('div');
  host.id = 'dsv-shadow-host';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
  setShadowHost(host);

  const root = host.attachShadow({ mode: 'open' });
  setShadowRoot(root);

  const styleSheet = document.createElement('style');
  styleSheet.textContent = STYLES;
  root.appendChild(styleSheet);

  const panel = createPanel();
  setPanelElement(panel);
  root.appendChild(panel);

  document.body.appendChild(host);

  attachEventListeners();
}

export function destroyUI(): void {
  // Remove all highlights
  document.querySelectorAll('.dsv-highlight, .dsv-highlight-error').forEach((el) => {
    el.classList.remove('dsv-highlight', 'dsv-highlight-error');
  });

  // Remove shadow host
  const host = getShadowHost();
  if (host) {
    host.remove();
    setShadowHost(null);
    setShadowRoot(null);
    setPanelElement(null);
  }
}
