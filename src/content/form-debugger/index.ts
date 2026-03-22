/**
 * Form Debugger Module
 *
 * Comprehensive form debugging and analysis tool that provides:
 * - Analyze all forms on page
 * - Show form fields with validation status
 * - Detect missing labels
 * - Show autofill detection
 * - Display validation messages
 * - Check accessibility issues in forms
 *
 * @module form-debugger
 */

import type { FormDebuggerState, FormInfo } from '@/types';
import { logger } from '@/utils/logger';
import { analyzeForms, isFormField, updateFieldValidity } from './analyzer';
import { PREFIX, REFRESH_INTERVAL } from './constants';
import type { TabType } from './types';
import {
  getPanelHTML,
  getStyles,
  renderAccessibility,
  renderFields,
  renderOverview,
  renderValidation,
} from './ui';
import { removeValidationOverlays, updateValidationOverlays } from './validator';

// ============================================
// Re-exports
// ============================================

export * from './analyzer';
export * from './constants';
export * from './types';
export * from './ui';
export * from './validator';

// ============================================
// State
// ============================================

let isEnabled = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;
let mutationObserver: MutationObserver | null = null;
let forms: FormInfo[] = [];
let selectedForm: FormInfo | null = null;
let highlightIssuesEnabled = true;
let currentTab: TabType = 'overview';

// ============================================
// Public API
// ============================================

/**
 * Enable the form debugger
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  startAutoRefresh();
  startMutationObserver();
  attachEventListeners();
  analyzeFormsAndUpdate();
  updateValidationOverlays(forms, highlightIssuesEnabled);

  logger.log('[FormDebugger] Enabled');
}

/**
 * Disable the form debugger
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  removeValidationOverlays();
  stopAutoRefresh();
  stopMutationObserver();
  detachEventListeners();

  forms = [];
  selectedForm = null;

  logger.log('[FormDebugger] Disabled');
}

/**
 * Toggle the form debugger
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
export function getState(): FormDebuggerState {
  return {
    enabled: isEnabled,
    forms,
    selectedForm,
    highlightIssues: highlightIssuesEnabled,
  };
}

/**
 * Refresh form data
 */
export function refresh(): void {
  if (!isEnabled) return;
  analyzeFormsAndUpdate();
  updateValidationOverlays(forms, highlightIssuesEnabled);
  renderCurrentTab();
}

/**
 * Set whether to highlight issues
 */
export function setHighlightIssues(enabled: boolean): void {
  highlightIssuesEnabled = enabled;
  if (isEnabled) {
    updateValidationOverlays(forms, highlightIssuesEnabled);
    renderCurrentTab();
  }
}

/**
 * Select a specific form for detailed view
 */
export function selectForm(formIndex: number): void {
  selectedForm = forms[formIndex] || null;
  if (selectedForm) {
    currentTab = 'fields';
  }
  renderCurrentTab();
}

// ============================================
// Form Analysis
// ============================================

function analyzeFormsAndUpdate(): void {
  const newForms = analyzeForms();

  // Validate selected form still exists
  if (selectedForm && !newForms.find((f) => f.element === selectedForm?.element)) {
    selectedForm = null;
  }

  forms = newForms;
}

// ============================================
// Event Handlers
// ============================================

function attachEventListeners(): void {
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('invalid', handleInvalid, true);
  document.addEventListener('submit', handleSubmit, true);
}

function detachEventListeners(): void {
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('invalid', handleInvalid, true);
  document.removeEventListener('submit', handleSubmit, true);
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  // Update field validity in real-time
  updateFieldValidity(target, forms);
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  updateFieldValidity(target, forms);
  refresh();
}

function handleInvalid(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  logger.warn('[FormDebugger] Field validation failed:', target.name, target.validationMessage);
}

function handleSubmit(event: SubmitEvent): void {
  const form = event.target as HTMLFormElement;
  if (!form) return;

  // Refresh to show validation state
  setTimeout(refresh, 0);
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
    width: 550px;
    max-height: 80vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = getPanelHTML(highlightIssuesEnabled);
  shadowRoot.appendChild(panel);

  setupEventListeners(panel);

  document.body.appendChild(panelContainer);

  renderCurrentTab();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
}

function setupEventListeners(panel: HTMLElement): void {
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  panel.querySelector(`#${PREFIX}-toggle-highlights`)?.addEventListener('click', () => {
    setHighlightIssues(!highlightIssuesEnabled);
    updateStatus(highlightIssuesEnabled ? 'Highlights on' : 'Highlights off');
  });

  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as TabType;
      switchTab(tabName);
    });
  });

  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    filterContent(query);
  });
}

function switchTab(tab: TabType): void {
  currentTab = tab;

  shadowRoot?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  renderCurrentTab();
}

function renderCurrentTab(): void {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  switch (currentTab) {
    case 'overview':
      content.innerHTML = renderOverview(forms);
      break;
    case 'fields':
      content.innerHTML = renderFields(forms, selectedForm);
      break;
    case 'validation':
      content.innerHTML = renderValidation(forms, selectedForm);
      break;
    case 'accessibility':
      content.innerHTML = renderAccessibility(forms);
      break;
  }

  // Add click handlers for form cards in overview tab
  if (currentTab === 'overview') {
    shadowRoot.querySelectorAll(`.${PREFIX}-form-card`).forEach((card) => {
      card.addEventListener('click', () => {
        const index = card.getAttribute('data-index');
        if (index !== null) {
          selectForm(parseInt(index, 10));
        }
      });
    });
  }

  updateStats();
  updateBadges();
}

function updateStats(): void {
  const statsEl = shadowRoot?.querySelector(`#${PREFIX}-stats`);
  if (statsEl) {
    const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
    const validFields = forms.reduce(
      (sum, f) => sum + f.fields.filter((field) => field.isValid).length,
      0
    );
    statsEl.textContent = `${validFields}/${totalFields} valid`;
  }
}

function updateBadges(): void {
  updateBadge('forms', forms.length);

  const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
  updateBadge('fields', totalFields);

  const validationIssues = forms.reduce(
    (sum, f) => sum + f.fields.filter((field) => !field.isValid).length,
    0
  );
  updateBadge('validation', validationIssues);

  const a11yIssues = forms.reduce((sum, f) => sum + f.accessibilityIssues.length, 0);
  updateBadge('a11y', a11yIssues);
}

function updateBadge(type: string, count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

function filterContent(query: string): void {
  const items = shadowRoot?.querySelectorAll(
    `.${PREFIX}-form-card, .${PREFIX}-field, .${PREFIX}-validation-item, .${PREFIX}-a11y-issue`
  );
  items?.forEach((item) => {
    const text = item.textContent?.toLowerCase() || '';
    (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
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

// ============================================
// Auto-refresh & Mutation Observer
// ============================================

function startAutoRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    refresh();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startMutationObserver(): void {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    let shouldRefresh = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.tagName === 'FORM' ||
              node.tagName === 'INPUT' ||
              node.tagName === 'SELECT' ||
              node.tagName === 'TEXTAREA' ||
              node.querySelector('form, input, select, textarea')
            ) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }

      if (mutation.type === 'attributes') {
        if (['name', 'type', 'required', 'pattern'].includes(mutation.attributeName || '')) {
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      clearTimeout((refresh as unknown as { _timeout: number })._timeout);
      (refresh as unknown as { _timeout: number })._timeout = window.setTimeout(refresh, 100);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['name', 'type', 'required', 'pattern', 'value', 'disabled'],
  });
}

function stopMutationObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

// ============================================
// Export singleton
// ============================================

/**
 * Form debugger singleton instance
 *
 * @example
 * ```typescript
 * import { formDebugger } from '@/content/form-debugger';
 *
 * // Enable the debugger
 * formDebugger.enable();
 *
 * // Get current state
 * const state = formDebugger.getState();
 * ```
 */
export const formDebugger = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  setHighlightIssues,
  selectForm,
};

/**
 * FormDebugger class for alternative usage pattern
 *
 * Provides the same API as the formDebugger singleton but as a class
 * that can be instantiated if needed for advanced use cases.
 */
export class FormDebugger {
  enable(): void {
    enable();
  }

  disable(): void {
    disable();
  }

  toggle(): void {
    toggle();
  }

  getState(): FormDebuggerState {
    return getState();
  }

  refresh(): void {
    refresh();
  }

  setHighlightIssues(enabled: boolean): void {
    setHighlightIssues(enabled);
  }

  selectForm(formIndex: number): void {
    selectForm(formIndex);
  }
}

export default formDebugger;
