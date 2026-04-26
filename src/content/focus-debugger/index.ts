/**
 * Focus Debugger Module
 *
 * Comprehensive focus debugging tool that provides:
 * - Visualize focus order with numbered overlays
 * - Detect focus traps (elements that trap keyboard navigation)
 * - Show all focusable elements with tab index
 * - Track focus history
 * - Highlight current focused element
 * - Show focus outline issues
 */

import { logger } from '@/utils/logger';
import { ToolLifecycle } from '@/utils/tool-lifecycle';
import { FOCUSABLE_SELECTORS, PREFIX, REFRESH_INTERVAL } from './constants';
import { OverlayManager } from './overlay';
import { FocusTracker } from './tracker';
import type { CurrentTab, FocusDebuggerState } from './types';
import { UIManager } from './ui';

export { FOCUSABLE_SELECTORS, PREFIX, REFRESH_INTERVAL } from './constants';
// Re-export types
export type { CurrentTab, FocusDebuggerState, FocusTrigger } from './types';
export { FocusTracker, OverlayManager, UIManager };

// ============================================
// State
// ============================================

const lifecycle = new ToolLifecycle();

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentTab: CurrentTab = 'elements';

// Component instances
let focusTracker: FocusTracker;
let overlayManager: OverlayManager;
let uiManager: UIManager;

// ============================================
// Public API
// ============================================

/**
 * Enable the focus debugger
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  lifecycle.start();

  // Initialize components
  focusTracker = new FocusTracker(
    () => {
      updateOverlays();
      if (isPanelOpen && currentTab === 'elements') {
        renderCurrentTab();
      }
    },
    () => {
      if (isPanelOpen && currentTab === 'history') {
        renderCurrentTab();
      }
    }
  );
  overlayManager = new OverlayManager(PREFIX);
  uiManager = new UIManager(PREFIX);

  createPanel();
  startAutoRefresh();
  startMutationObserver();
  attachEventListeners();

  focusTracker.scanFocusableElements();
  focusTracker.detectFocusTraps();
  updateOverlays();

  logger.log('[FocusDebugger] Enabled');
}

/**
 * Disable the focus debugger
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  overlayManager?.destroy();

  // Tear down observers, timers, event listeners
  lifecycle.destroy();

  focusTracker?.reset();

  logger.log('[FocusDebugger] Disabled');
}

/**
 * Toggle the focus debugger
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
export function getState(): FocusDebuggerState {
  return {
    enabled: isEnabled,
    showOverlay: isPanelOpen,
    focusableElements: focusTracker?.focusableElements ?? [],
    focusHistory: [...(focusTracker?.focusHistory ?? [])],
    trapDetected: (focusTracker?.trapElements.length ?? 0) > 0,
    trapElements: [...(focusTracker?.trapElements ?? [])],
  };
}

/**
 * Refresh focus data
 */
export function refresh(): void {
  if (!isEnabled) return;
  focusTracker.scanFocusableElements();
  focusTracker.detectFocusTraps();
  updateOverlays();
  renderCurrentTab();
}

/**
 * Clear focus history
 */
export function clearHistory(): void {
  focusTracker?.clearHistory();
  renderCurrentTab();
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
    width: 500px;
    max-height: 80vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });
  uiManager.setShadowRoot(shadowRoot);

  const styleSheet = document.createElement('style');
  styleSheet.textContent = uiManager.getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = uiManager.getPanelHTML();
  shadowRoot.appendChild(panel);

  // Add event listeners
  setupEventListeners(panel);

  document.body.appendChild(panelContainer);
  isPanelOpen = true;

  // Initial render
  renderCurrentTab();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  isPanelOpen = false;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    uiManager.updateStatus('Refreshed');
  });

  // Toggle overlays button
  panel.querySelector(`#${PREFIX}-toggle-overlays`)?.addEventListener('click', () => {
    const isVisible = overlayManager.toggleOverlays();
    updateOverlays();
    uiManager.updateStatus(isVisible ? 'Overlays shown' : 'Overlays hidden');
  });

  // Tab switching
  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as CurrentTab;
      switchTab(tabName);
    });
  });

  // Search
  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    uiManager.filterContent(query);
  });
}

function switchTab(tab: CurrentTab): void {
  currentTab = tab;
  uiManager.updateTabUI(tab);
  renderCurrentTab();
}

function renderCurrentTab(): void {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  switch (currentTab) {
    case 'elements':
      content.innerHTML = uiManager.renderElements(
        focusTracker.focusableElements,
        focusTracker.currentFocusedElement
      );
      break;
    case 'history':
      content.innerHTML = uiManager.renderHistory(focusTracker.focusHistory);
      // Setup clear history button
      shadowRoot.querySelector(`#${PREFIX}-clear-history`)?.addEventListener('click', () => {
        clearHistory();
      });
      break;
    case 'issues':
      content.innerHTML = uiManager.renderIssues(
        focusTracker.focusableElements,
        focusTracker.trapElements
      );
      break;
  }

  updateStats();
  updateBadges();
}

function updateStats(): void {
  const currentTabOrder = focusTracker?.getCurrentTabOrder();
  uiManager.updateStats(currentTabOrder, focusTracker?.focusableElements.length ?? 0);
}

function updateBadges(): void {
  const elementsCount = focusTracker?.focusableElements.length ?? 0;
  const historyCount = focusTracker?.focusHistory.length ?? 0;

  // Calculate issues count
  const issuesHtml = uiManager.renderIssues(
    focusTracker?.focusableElements ?? [],
    focusTracker?.trapElements ?? []
  );
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = issuesHtml;
  const issuesCount = tempDiv.querySelectorAll(`.${PREFIX}-issue`).length;

  uiManager.updateBadges(elementsCount, historyCount, issuesCount);
}

// ============================================
// Event Handlers
// ============================================

function attachEventListeners(): void {
  lifecycle.addEventListener(document, 'focusin', handleFocusIn, true);
  lifecycle.addEventListener(document, 'focusout', handleFocusOut, true);
  lifecycle.addEventListener(document, 'keydown', handleKeyDown, true);
  lifecycle.addEventListener(document, 'mousedown', handleMouseDown, true);
  lifecycle.addEventListener(document, 'click', handleClick, true);
}

function detachEventListeners(): void {
  // Handled by lifecycle.destroy() via AbortController
}

function handleFocusIn(event: FocusEvent): void {
  focusTracker?.handleFocusIn(event);
}

function handleFocusOut(event: FocusEvent): void {
  focusTracker?.handleFocusOut(event);
}

function handleKeyDown(event: KeyboardEvent): void {
  focusTracker?.handleKeyDown(event);

  // Handle panel shortcuts
  if (!isPanelOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    disable();
  }
}

function handleMouseDown(): void {
  focusTracker?.handleMouseDown();
}

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  // Check if clicked on an overlay
  if (target?.closest(`.${PREFIX}-overlay`)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

// ============================================
// Overlays
// ============================================

function updateOverlays(): void {
  overlayManager?.updateOverlays(
    focusTracker?.focusableElements ?? [],
    focusTracker?.currentFocusedElement ?? null
  );
}

// ============================================
// Auto-refresh & Mutation Observer
// ============================================

function startAutoRefresh(): void {
  lifecycle.setInterval(() => {
    refresh();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  // Handled by lifecycle.destroy()
}

function startMutationObserver(): void {
  const mutationObserver = new MutationObserver((mutations) => {
    let shouldRefresh = false;

    for (const mutation of mutations) {
      // Check if any focusable elements were added/removed
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (focusTracker?.isFocusableElement(node) || node.querySelector(FOCUSABLE_SELECTORS)) {
              shouldRefresh = true;
              break;
            }
          }
        }
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement) {
            if (focusTracker?.isFocusableElement(node) || node.querySelector(FOCUSABLE_SELECTORS)) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }

      // Check for tabindex changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'tabindex') {
        shouldRefresh = true;
      }

      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      // Debounce refresh
      lifecycle.setTimeout(refresh, 100);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex', 'disabled', 'hidden', 'style'],
  });

  lifecycle.addObserver(mutationObserver);
}

function stopMutationObserver(): void {
  // Handled by lifecycle.destroy()
}

// ============================================
// Export singleton
// ============================================

export const focusDebugger = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  clearHistory,
};
