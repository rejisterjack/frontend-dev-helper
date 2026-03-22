/**
 * Storage Inspector Module
 *
 * Comprehensive storage inspection and management tool that provides:
 * - LocalStorage viewer/editor
 * - SessionStorage viewer/editor
 * - IndexedDB database browser
 * - Cookie manager
 * - Cache Storage (Service Worker) viewer
 * - Storage quota information
 * - Import/export functionality
 *
 * @module storage-inspector
 */

import { logger } from '@/utils/logger';
import { PREFIX, REFRESH_INTERVAL } from './constants';
// Import inspector functions
import {
  clearCacheStorage,
  clearLocalStorage,
  clearSessionStorage,
  deleteIndexedDBDatabase,
  getCacheStorage,
  getCompleteSnapshot,
  getCookies,
  getIndexedDB,
  getLocalStorage,
  getSessionStorage,
  getStorageQuota,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setSessionStorageItem,
} from './inspector';
import type { StorageInspectorAPI, StorageInspectorState, StorageTab } from './types';

// Import UI functions
import {
  filterContent,
  getContentElement,
  getPanelHTML,
  getStyles,
  renderCacheStorage,
  renderCookies,
  renderIndexedDB,
  renderStorageItems,
  setCurrentTab,
  setError,
  setLoading,
  setShadowRoot,
  switchTabUI,
  updateBadge,
  updateQuota,
  updateStatus,
} from './ui';

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;
let currentTab: StorageTab = 'localStorage';

// ============================================
// Public API
// ============================================

/**
 * Enable the storage inspector
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  startAutoRefresh();
  logger.log('[StorageInspector] Enabled');
}

/**
 * Disable the storage inspector
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  stopAutoRefresh();
  logger.log('[StorageInspector] Disabled');
}

/**
 * Toggle the storage inspector
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
export function getState(): StorageInspectorState {
  return { enabled: isEnabled, isPanelOpen };
}

/**
 * Refresh storage data
 */
export async function refresh(): Promise<void> {
  if (!isEnabled) return;
  await renderCurrentTab();
}

// ============================================
// UI Panel Management
// ============================================

function createPanel(): void {
  if (panelContainer) return;

  panelContainer = document.createElement('div');
  panelContainer.id = `${PREFIX}-container`;
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 600px;
    max-height: 80vh;
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

  // Set UI state references
  setShadowRoot(shadowRoot);

  document.body.appendChild(panelContainer);
  isPanelOpen = true;

  // Initial render
  void renderCurrentTab();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  setShadowRoot(null);
  isPanelOpen = false;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    void refresh();
    updateStatus('Refreshed');
  });

  // Export button
  panel.querySelector(`#${PREFIX}-export`)?.addEventListener('click', exportAllData);

  // Tab switching
  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as StorageTab;
      switchTab(tabName);
    });
  });

  // Search
  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    filterContent(query);
  });

  // Clear all
  panel.querySelector(`#${PREFIX}-clear-all`)?.addEventListener('click', () => {
    if (confirm(`Are you sure you want to clear all ${currentTab} data?`)) {
      void clearCurrentStorage();
    }
  });
}

function switchTab(tab: StorageTab): void {
  currentTab = tab;
  setCurrentTab(tab);
  switchTabUI(tab);
  void renderCurrentTab();
}

async function renderCurrentTab(): Promise<void> {
  if (!shadowRoot) return;

  const content = getContentElement();
  if (!content) return;

  setLoading();

  try {
    switch (currentTab) {
      case 'localStorage': {
        const items = await getLocalStorage();
        updateBadge('localStorage', items.length);
        content.innerHTML = renderStorageItems(items, 'localStorage');
        break;
      }
      case 'sessionStorage': {
        const items = await getSessionStorage();
        updateBadge('sessionStorage', items.length);
        content.innerHTML = renderStorageItems(items, 'sessionStorage');
        break;
      }
      case 'indexedDB': {
        const databases = await getIndexedDB();
        updateBadge('indexedDB', databases.length);
        content.innerHTML = renderIndexedDB(databases);
        break;
      }
      case 'cookies': {
        const cookies = await getCookies();
        updateBadge('cookies', cookies.length);
        content.innerHTML = renderCookies(cookies);
        break;
      }
      case 'cache': {
        const caches = await getCacheStorage();
        const totalEntries = Object.values(caches).reduce((sum, arr) => sum + arr.length, 0);
        updateBadge('cache', totalEntries);
        content.innerHTML = renderCacheStorage(caches);
        break;
      }
    }

    void updateQuota(getStorageQuota);
  } catch (error) {
    setError(error);
  }
}

async function clearCurrentStorage(): Promise<void> {
  switch (currentTab) {
    case 'localStorage':
      clearLocalStorage();
      break;
    case 'sessionStorage':
      clearSessionStorage();
      break;
    case 'indexedDB':
      // Handle IndexedDB clear
      break;
    case 'cache':
      // Handle cache clear
      break;
  }
  await renderCurrentTab();
  updateStatus('Cleared');
}

async function exportAllData(): Promise<void> {
  const snapshot = await getCompleteSnapshot();
  const dataStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `storage-snapshot-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  updateStatus('Exported');
}

function startAutoRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    void renderCurrentTab();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ============================================
// Export singleton
// ============================================

export const storageInspector: StorageInspectorAPI = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  getLocalStorage,
  getSessionStorage,
  getIndexedDB,
  getCookies,
  getCacheStorage,
  getStorageQuota,
  getCompleteSnapshot,
  setLocalStorageItem,
  removeLocalStorageItem,
  clearLocalStorage,
  setSessionStorageItem,
  removeSessionStorageItem,
  clearSessionStorage,
  deleteIndexedDBDatabase,
  clearCacheStorage,
};

// ============================================
// Re-exports
// ============================================

export { PREFIX, REFRESH_INTERVAL } from './constants';
export {
  clearCacheStorage,
  clearLocalStorage,
  clearSessionStorage,
  deleteIndexedDBDatabase,
  formatBytes,
  getCacheStorage,
  getCompleteSnapshot,
  getCookies,
  getIndexedDB,
  getLocalStorage,
  getSessionStorage,
  getStorageQuota,
  inferType,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setSessionStorageItem,
  truncate,
} from './inspector';
export type {
  CacheStorageResult,
  StorageInspectorAPI,
  StorageInspectorState,
  StorageQuotaInfo,
  StorageTab,
} from './types';
