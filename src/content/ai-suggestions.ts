/**
 * AI Suggestions Content Script Module
 *
 * Integrates AI analysis with the page and provides real-time suggestions overlay.
 */

import { runAIAnalysis } from '@/ai/ai-analyzer';
import type { AIAnalysisResult } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let analysisResult: AIAnalysisResult | null = null;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

const PREFIX = 'fdh-ai-suggestions';

// ============================================
// Public API
// ============================================

export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;
  logger.log('[AISuggestions] Enabled');

  // Auto-run analysis when enabled
  runAnalysis();
}

export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;
  destroyPanel();
  logger.log('[AISuggestions] Disabled');
}

export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

export function getState(): { enabled: boolean; isPanelOpen: boolean; hasAnalysis: boolean } {
  return {
    enabled: isEnabled,
    isPanelOpen,
    hasAnalysis: analysisResult !== null,
  };
}

export async function runAnalysis(): Promise<AIAnalysisResult | null> {
  if (!isEnabled) return null;

  try {
    analysisResult = await runAIAnalysis();
    if (isPanelOpen) {
      renderPanel();
    }
    return analysisResult;
  } catch (error) {
    logger.error('[AISuggestions] Analysis failed:', error);
    return null;
  }
}

export function openPanel(): void {
  if (!isEnabled) enable();
  isPanelOpen = true;
  createPanel();
}

export function closePanel(): void {
  isPanelOpen = false;
  destroyPanel();
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
    width: 400px;
    max-height: 80vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = getStyles();
  shadowRoot.appendChild(style);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  shadowRoot.appendChild(panel);

  document.body.appendChild(panelContainer);

  renderPanel();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
}

function renderPanel(): void {
  if (!shadowRoot || !analysisResult) return;

  const panel = shadowRoot.querySelector(`#${PREFIX}-panel`);
  if (!panel) return;

  const { summary } = analysisResult;

  panel.innerHTML = `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>✨</span>
        <span>AI Suggestions</span>
      </div>
      <button id="${PREFIX}-close">✕</button>
    </div>
    <div id="${PREFIX}-content">
      <div id="${PREFIX}-summary">
        <div class="${PREFIX}-stat">
          <span class="${PREFIX}-stat-value">${summary.total}</span>
          <span class="${PREFIX}-stat-label">Total</span>
        </div>
        <div class="${PREFIX}-stat ${PREFIX}-stat-critical">
          <span class="${PREFIX}-stat-value">${summary.critical}</span>
          <span class="${PREFIX}-stat-label">Critical</span>
        </div>
        <div class="${PREFIX}-stat ${PREFIX}-stat-high">
          <span class="${PREFIX}-stat-value">${summary.high}</span>
          <span class="${PREFIX}-stat-label">High</span>
        </div>
        <div class="${PREFIX}-stat ${PREFIX}-stat-autofix">
          <span class="${PREFIX}-stat-value">${summary.autoFixable}</span>
          <span class="${PREFIX}-stat-label">Auto-fixable</span>
        </div>
      </div>
      <div id="${PREFIX}-suggestions">
        ${analysisResult.suggestions
          .slice(0, 5)
          .map(
            (s) => `
          <div class="${PREFIX}-suggestion ${PREFIX}-${s.priority}">
            <div class="${PREFIX}-suggestion-header">
              <span class="${PREFIX}-category">${s.category}</span>
              <span class="${PREFIX}-priority">${s.priority}</span>
            </div>
            <div class="${PREFIX}-suggestion-title">${s.title}</div>
            <div class="${PREFIX}-suggestion-desc">${s.description}</div>
            ${s.autoFixable ? `<button class="${PREFIX}-fix-btn" data-id="${s.id}">🔧 Fix</button>` : ''}
          </div>
        `
          )
          .join('')}
        ${
          analysisResult.suggestions.length > 5
            ? `
          <div class="${PREFIX}-more">+${analysisResult.suggestions.length - 5} more suggestions</div>
        `
            : ''
        }
      </div>
    </div>
    <div id="${PREFIX}-footer">
      <button id="${PREFIX}-refresh">🔄 Refresh</button>
      <button id="${PREFIX}-view-all">View All</button>
    </div>
  `;

  // Add event listeners
  shadowRoot.querySelector(`#${PREFIX}-close`)?.addEventListener('click', closePanel);
  shadowRoot.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', runAnalysis);
}

function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
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
    }

    #${PREFIX}-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    #${PREFIX}-close:hover {
      background: #334155;
      color: #f8fafc;
    }

    #${PREFIX}-content {
      max-height: 60vh;
      overflow-y: auto;
      padding: 16px;
    }

    #${PREFIX}-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .${PREFIX}-stat {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .${PREFIX}-stat-value {
      display: block;
      font-size: 20px;
      font-weight: 600;
      color: #f8fafc;
    }

    .${PREFIX}-stat-label {
      font-size: 11px;
      color: #94a3b8;
    }

    .${PREFIX}-stat-critical .${PREFIX}-stat-value {
      color: #ef4444;
    }

    .${PREFIX}-stat-high .${PREFIX}-stat-value {
      color: #f97316;
    }

    .${PREFIX}-stat-autofix .${PREFIX}-stat-value {
      color: #10b981;
    }

    .${PREFIX}-suggestion {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      border-left: 3px solid #64748b;
    }

    .${PREFIX}-suggestion.${PREFIX}-critical {
      border-left-color: #ef4444;
    }

    .${PREFIX}-suggestion.${PREFIX}-high {
      border-left-color: #f97316;
    }

    .${PREFIX}-suggestion.${PREFIX}-medium {
      border-left-color: #eab308;
    }

    .${PREFIX}-suggestion-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .${PREFIX}-category {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .${PREFIX}-priority {
      font-size: 10px;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: #334155;
    }

    .${PREFIX}-suggestion.${PREFIX}-critical .${PREFIX}-priority {
      background: #ef4444;
      color: white;
    }

    .${PREFIX}-suggestion-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .${PREFIX}-suggestion-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .${PREFIX}-fix-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    .${PREFIX}-fix-btn:hover {
      background: #059669;
    }

    .${PREFIX}-more {
      text-align: center;
      padding: 12px;
      color: #64748b;
      font-size: 12px;
    }

    #${PREFIX}-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
    }

    #${PREFIX}-footer button {
      flex: 1;
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 8px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    #${PREFIX}-footer button:hover {
      background: #475569;
    }
  `;
}

// ============================================
// Export singleton
// ============================================

export const aiSuggestions = {
  enable,
  disable,
  toggle,
  getState,
  runAnalysis,
  openPanel,
  closePanel,
};
