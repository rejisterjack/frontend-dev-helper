/**
 * Focus Debugger UI
 *
 * UI component creation for the focus debugger module.
 */

import type { FocusableElement, FocusHistoryEntry } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { PREFIX } from './constants';
import type { CurrentTab, FocusTrigger, Issue } from './types';

export class UIManager {
  private prefix: string;
  private shadowRoot: ShadowRoot | null = null;

  constructor(prefix: string = PREFIX) {
    this.prefix = prefix;
  }

  setShadowRoot(shadowRoot: ShadowRoot | null): void {
    this.shadowRoot = shadowRoot;
  }

  getPanelHTML(): string {
    return `
      <div id="${this.prefix}-header">
        <div id="${this.prefix}-title">
          <span>🎯</span>
          <span>Focus Debugger</span>
        </div>
        <div id="${this.prefix}-actions">
          <button id="${this.prefix}-refresh" title="Refresh">🔄</button>
          <button id="${this.prefix}-toggle-overlays" title="Toggle Overlays">👁️</button>
          <button id="${this.prefix}-close" title="Close">✕</button>
        </div>
      </div>
      
      <div id="${this.prefix}-tabs">
        <button class="${this.prefix}-tab active" data-tab="elements">
          Elements
          <span class="${this.prefix}-badge" id="${this.prefix}-elements-count">0</span>
        </button>
        <button class="${this.prefix}-tab" data-tab="history">
          History
          <span class="${this.prefix}-badge" id="${this.prefix}-history-count">0</span>
        </button>
        <button class="${this.prefix}-tab" data-tab="issues">
          Issues
          <span class="${this.prefix}-badge" id="${this.prefix}-issues-count">0</span>
        </button>
      </div>
      
      <div id="${this.prefix}-toolbar">
        <input type="text" id="${this.prefix}-search" placeholder="Search elements..." />
      </div>
      
      <div id="${this.prefix}-content"></div>
      
      <div id="${this.prefix}-footer">
        <span id="${this.prefix}-stats"></span>
        <span id="${this.prefix}-status">Ready</span>
      </div>
    `;
  }

  renderElements(
    focusableElements: FocusableElement[],
    currentFocusedElement: HTMLElement | null
  ): string {
    if (focusableElements.length === 0) {
      return `<div class="${this.prefix}-empty">No focusable elements found</div>`;
    }

    return `
      <div class="${this.prefix}-info">${focusableElements.length} focusable elements</div>
      <div class="${this.prefix}-list">
        ${focusableElements
          .map(
            (el) => `
          <div class="${this.prefix}-item ${el.element === currentFocusedElement ? `${this.prefix}-current` : ''}" 
               data-selector="${escapeHtml(el.selector)}"
               data-taborder="${el.tabOrder}">
            <div class="${this.prefix}-item-header">
              <span class="${this.prefix}-tab-order">${el.tabOrder}</span>
              <span class="${this.prefix}-item-tag">${el.element.tagName.toLowerCase()}</span>
              ${el.tabIndex !== 0 ? `<span class="${this.prefix}-tab-index">tabindex="${el.tabIndex}"</span>` : ''}
              ${el.ariaLabel ? `<span class="${this.prefix}-aria-label" title="${escapeHtml(el.ariaLabel)}">♿</span>` : ''}
            </div>
            <div class="${this.prefix}-item-selector">${escapeHtml(el.selector)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderHistory(focusHistory: FocusHistoryEntry[]): string {
    if (focusHistory.length === 0) {
      return `
        <div class="${this.prefix}-empty">
          <div>No focus history yet</div>
          <div class="${this.prefix}-empty-hint">Tab through elements to build history</div>
        </div>
      `;
    }

    return `
      <div class="${this.prefix}-toolbar-secondary">
        <button id="${this.prefix}-clear-history">Clear History</button>
      </div>
      <div class="${this.prefix}-info">${focusHistory.length} focus events</div>
      <div class="${this.prefix}-list">
        ${focusHistory
          .map(
            (entry, index) => `
          <div class="${this.prefix}-history-item" data-index="${index}">
            <div class="${this.prefix}-history-header">
              <span class="${this.prefix}-history-trigger ${this.prefix}-trigger-${entry.trigger}">${this.getTriggerIcon(entry.trigger)}</span>
              <span class="${this.prefix}-history-element">${entry.element}</span>
              <span class="${this.prefix}-history-time">${this.formatTime(entry.timestamp)}</span>
            </div>
            <div class="${this.prefix}-history-selector">${escapeHtml(entry.selector)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderIssues(focusableElements: FocusableElement[], _trapElements: HTMLElement[]): string {
    const issues: Issue[] = [];

    // Check for missing focus indicators
    focusableElements.forEach((el) => {
      const style = window.getComputedStyle(el.element);
      const outline = style.outline;
      const outlineWidth = parseFloat(style.outlineWidth);

      if (outline === 'none' || outlineWidth === 0) {
        issues.push({
          type: 'warning',
          message: 'Missing visible focus indicator',
          element: el.selector,
        });
      }
    });

    // Check for positive tab indices
    const positiveTabIndices = focusableElements.filter((el) => el.tabIndex > 0);
    if (positiveTabIndices.length > 1) {
      issues.push({
        type: 'warning',
        message: `Multiple positive tabindex values found (${positiveTabIndices.length}) - can create confusing tab order`,
      });
    }

    // Check for elements without labels
    focusableElements.forEach((el) => {
      const element = el.element;
      const hasLabel =
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby') ||
        ((element as HTMLInputElement).labels &&
          (element as HTMLInputElement).labels!.length > 0) ||
        !!element.getAttribute('title');

      if (
        !hasLabel &&
        ['input', 'textarea', 'select', 'button'].includes(element.tagName.toLowerCase())
      ) {
        issues.push({
          type: 'error',
          message: 'Focusable element missing accessible label',
          element: el.selector,
        });
      }
    });

    // Check for hidden focusable elements
    focusableElements.forEach((el) => {
      const rect = el.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        issues.push({
          type: 'warning',
          message: 'Focusable element has zero dimensions',
          element: el.selector,
        });
      }
    });

    if (issues.length === 0) {
      return `
        <div class="${this.prefix}-empty">
          <div>✅ No issues found</div>
          <div class="${this.prefix}-empty-hint">All focusable elements look good!</div>
        </div>
      `;
    }

    return `
      <div class="${this.prefix}-info">${issues.length} issue${issues.length !== 1 ? 's' : ''} found</div>
      <div class="${this.prefix}-list">
        ${issues
          .map(
            (issue) => `
          <div class="${this.prefix}-issue ${this.prefix}-issue-${issue.type}">
            <div class="${this.prefix}-issue-header">
              <span class="${this.prefix}-issue-icon">${this.getIssueIcon(issue.type)}</span>
              <span class="${this.prefix}-issue-type">${issue.type.toUpperCase()}</span>
            </div>
            <div class="${this.prefix}-issue-message">${escapeHtml(issue.message)}</div>
            ${issue.element ? `<div class="${this.prefix}-issue-element">${escapeHtml(issue.element)}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  updateTabUI(currentTab: CurrentTab): void {
    this.shadowRoot?.querySelectorAll(`.${this.prefix}-tab`).forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-tab') === currentTab);
    });
  }

  updateStatus(message: string): void {
    const statusEl = this.shadowRoot?.querySelector(`#${this.prefix}-status`);
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        if (statusEl) statusEl.textContent = 'Ready';
      }, 2000);
    }
  }

  updateStats(currentTabOrder: number | undefined, totalElements: number): void {
    const statsEl = this.shadowRoot?.querySelector(`#${this.prefix}-stats`);
    if (statsEl) {
      const current = currentTabOrder ?? '-';
      statsEl.textContent = `Focus: ${current} / ${totalElements}`;
    }
  }

  updateBadges(elementsCount: number, historyCount: number, issuesCount: number): void {
    this.updateBadge('elements', elementsCount);
    this.updateBadge('history', historyCount);
    this.updateBadge('issues', issuesCount);
  }

  private updateBadge(type: string, count: number): void {
    const badge = this.shadowRoot?.querySelector(`#${this.prefix}-${type}-count`);
    if (badge) badge.textContent = String(count);
  }

  filterContent(query: string): void {
    const items = this.shadowRoot?.querySelectorAll(
      `.${this.prefix}-item, .${this.prefix}-history-item, .${this.prefix}-issue`
    );
    items?.forEach((item) => {
      const text = item.textContent?.toLowerCase() || '';
      (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  }

  private getTriggerIcon(trigger: FocusTrigger): string {
    switch (trigger) {
      case 'keyboard':
        return '⌨️';
      case 'mouse':
        return '🖱️';
      case 'script':
        return '⚡';
    }
  }

  private getIssueIcon(type: 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getStyles(): string {
    return `
      #${this.prefix}-panel {
        background: #0f172a;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 80vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #e2e8f0;
      }

      #${this.prefix}-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #334155;
        background: #1e293b;
      }

      #${this.prefix}-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }

      #${this.prefix}-actions {
        display: flex;
        gap: 4px;
      }

      #${this.prefix}-actions button {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
      }

      #${this.prefix}-actions button:hover {
        background: #334155;
        color: #f8fafc;
      }

      #${this.prefix}-tabs {
        display: flex;
        overflow-x: auto;
        border-bottom: 1px solid #334155;
        background: #1e293b;
      }

      .${this.prefix}-tab {
        flex: 1;
        min-width: 100px;
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

      .${this.prefix}-tab:hover {
        color: #e2e8f0;
        background: #334155;
      }

      .${this.prefix}-tab.active {
        color: #f8fafc;
        background: #0f172a;
        border-bottom: 2px solid #4f46e5;
      }

      .${this.prefix}-badge {
        background: #334155;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        min-width: 18px;
        text-align: center;
      }

      #${this.prefix}-toolbar {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid #334155;
      }

      .${this.prefix}-toolbar-secondary {
        display: flex;
        gap: 8px;
        padding: 0 12px 12px;
      }

      #${this.prefix}-toolbar button,
      .${this.prefix}-toolbar-secondary button {
        background: #334155;
        border: none;
        color: #e2e8f0;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      #${this.prefix}-toolbar button:hover,
      .${this.prefix}-toolbar-secondary button:hover {
        background: #475569;
      }

      #${this.prefix}-search {
        flex: 1;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 8px 12px;
        color: #f8fafc;
        font-size: 13px;
      }

      #${this.prefix}-search:focus {
        outline: none;
        border-color: #4f46e5;
      }

      #${this.prefix}-search::placeholder {
        color: #64748b;
      }

      #${this.prefix}-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        min-height: 200px;
      }

      .${this.prefix}-loading,
      .${this.prefix}-empty {
        text-align: center;
        padding: 40px;
        color: #64748b;
      }

      .${this.prefix}-empty-hint {
        font-size: 12px;
        margin-top: 8px;
        opacity: 0.7;
      }

      .${this.prefix}-info {
        padding: 8px 12px;
        background: #1e293b;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #94a3b8;
      }

      .${this.prefix}-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .${this.prefix}-item,
      .${this.prefix}-history-item,
      .${this.prefix}-issue {
        background: #1e293b;
        border-radius: 8px;
        padding: 12px;
        border: 1px solid #334155;
      }

      .${this.prefix}-item.${this.prefix}-current {
        border-color: #22c55e;
        background: rgba(34, 197, 94, 0.1);
      }

      .${this.prefix}-item-header,
      .${this.prefix}-history-header,
      .${this.prefix}-issue-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        flex-wrap: wrap;
      }

      .${this.prefix}-tab-order {
        background: #4f46e5;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        min-width: 20px;
        text-align: center;
      }

      .${this.prefix}-item-tag {
        font-weight: 600;
        color: #f8fafc;
        text-transform: lowercase;
      }

      .${this.prefix}-tab-index {
        background: #f59e0b;
        color: #1e293b;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
      }

      .${this.prefix}-aria-label {
        color: #22c55e;
      }

      .${this.prefix}-item-selector,
      .${this.prefix}-history-selector,
      .${this.prefix}-issue-element {
        font-family: monospace;
        font-size: 11px;
        color: #64748b;
        overflow-wrap: break-word;
      }

      .${this.prefix}-trigger-keyboard { color: #3b82f6; }
      .${this.prefix}-trigger-mouse { color: #f59e0b; }
      .${this.prefix}-trigger-script { color: #a855f7; }

      .${this.prefix}-history-element {
        font-weight: 500;
        color: #e2e8f0;
      }

      .${this.prefix}-history-time {
        margin-left: auto;
        font-size: 11px;
        color: #64748b;
        font-family: monospace;
      }

      .${this.prefix}-issue-error {
        border-color: #dc2626;
      }

      .${this.prefix}-issue-warning {
        border-color: #f59e0b;
      }

      .${this.prefix}-issue-info {
        border-color: #3b82f6;
      }

      .${this.prefix}-issue-icon {
        font-size: 14px;
      }

      .${this.prefix}-issue-type {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .${this.prefix}-issue-error .${this.prefix}-issue-type {
        background: #dc2626;
        color: white;
      }

      .${this.prefix}-issue-warning .${this.prefix}-issue-type {
        background: #f59e0b;
        color: #1e293b;
      }

      .${this.prefix}-issue-info .${this.prefix}-issue-type {
        background: #3b82f6;
        color: white;
      }

      .${this.prefix}-issue-message {
        margin-top: 4px;
        color: #e2e8f0;
      }

      #${this.prefix}-footer {
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
      #${this.prefix}-content::-webkit-scrollbar {
        width: 8px;
      }

      #${this.prefix}-content::-webkit-scrollbar-track {
        background: transparent;
      }

      #${this.prefix}-content::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
      }

      #${this.prefix}-content::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
    `;
  }
}
