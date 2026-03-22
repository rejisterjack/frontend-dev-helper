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
 */

import type {
  CacheEntry,
  CookieInfo,
  IndexedDBDatabase,
  IndexedDBObjectStore,
  StorageItem,
  StorageSnapshot,
} from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-storage-inspector';
const REFRESH_INTERVAL = 5000;

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;
let currentTab: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cookies' | 'cache' =
  'localStorage';

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
export function getState(): { enabled: boolean; isPanelOpen: boolean } {
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
// Data Collection
// ============================================

export async function getLocalStorage(): Promise<StorageItem[]> {
  const items: StorageItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      items.push({
        key,
        value,
        size: new Blob([value]).size,
        type: inferType(value),
      });
    }
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export async function getSessionStorage(): Promise<StorageItem[]> {
  const items: StorageItem[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const value = sessionStorage.getItem(key) || '';
      items.push({
        key,
        value,
        size: new Blob([value]).size,
        type: inferType(value),
      });
    }
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export async function getIndexedDB(): Promise<IndexedDBDatabase[]> {
  const databases: IndexedDBDatabase[] = [];

  try {
    // Get list of databases (if supported)
    if ('databases' in indexedDB) {
      const dbList = await (indexedDB as IDBFactory & { databases(): Promise<{ name: string; version: number }[]> }).databases();

      for (const dbInfo of dbList) {
        const db = await openDatabase(dbInfo.name);
        if (db) {
          const objectStores: IndexedDBObjectStore[] = [];

          for (const storeName of Array.from(db.objectStoreNames)) {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const count = await new Promise<number>((resolve) => {
              const request = store.count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => resolve(0);
            });

            const indexes: Array<{ name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }> = [];
            for (const indexName of Array.from(store.indexNames)) {
              const index = store.index(indexName);
              indexes.push({
                name: index.name,
                keyPath: index.keyPath,
                unique: index.unique,
                multiEntry: index.multiEntry,
              });
            }

            objectStores.push({
              name: storeName,
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement,
              indexes,
              count,
            });
          }

          databases.push({
            name: db.name,
            version: db.version,
            objectStores,
          });

          db.close();
        }
      }
    }
  } catch (error) {
    logger.error('[StorageInspector] Failed to get IndexedDB:', error);
  }

  return databases;
}

async function openDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function getCookies(): Promise<CookieInfo[]> {
  const cookies: CookieInfo[] = [];

  try {
    // Parse document.cookie
    const cookieString = document.cookie;
    if (cookieString) {
      cookieString.split(';').forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split('=');
        const value = valueParts.join('=');
        if (name) {
          cookies.push({
            name: decodeURIComponent(name.trim()),
            value: decodeURIComponent(value || ''),
            domain: window.location.hostname,
            path: '/',
            secure: false,
            httpOnly: false,
          });
        }
      });
    }
  } catch (error) {
    logger.error('[StorageInspector] Failed to get cookies:', error);
  }

  return cookies;
}

export async function getCacheStorage(): Promise<{ [cacheName: string]: CacheEntry[] }> {
  const caches: { [cacheName: string]: CacheEntry[] } = {};

  try {
    if ('caches' in window) {
      const cacheNames = await window.caches.keys();

      for (const cacheName of cacheNames) {
        const cache = await window.caches.open(cacheName);
        const requests = await cache.keys();

        const entries: CacheEntry[] = [];
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            entries.push({
              url: request.url,
              size: blob.size,
              headers: Object.fromEntries(response.headers.entries()),
            });
          }
        }

        caches[cacheName] = entries;
      }
    }
  } catch (error) {
    logger.error('[StorageInspector] Failed to get cache storage:', error);
  }

  return caches;
}

export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  usageDetails?: { [key: string]: number };
} | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageDetails: estimate.usageDetails,
      };
    }
  } catch (error) {
    logger.error('[StorageInspector] Failed to get storage quota:', error);
  }
  return null;
}

export async function getCompleteSnapshot(): Promise<StorageSnapshot> {
  const [localStorage, sessionStorage, indexedDB, cookies, cacheStorage] = await Promise.all([
    getLocalStorage(),
    getSessionStorage(),
    getIndexedDB(),
    getCookies(),
    getCacheStorage(),
  ]);

  return {
    localStorage,
    sessionStorage,
    indexedDB,
    cookies,
    cacheStorage,
  };
}

// ============================================
// Data Manipulation
// ============================================

export function setLocalStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
  refresh();
}

export function removeLocalStorageItem(key: string): void {
  localStorage.removeItem(key);
  refresh();
}

export function clearLocalStorage(): void {
  localStorage.clear();
  refresh();
}

export function setSessionStorageItem(key: string, value: string): void {
  sessionStorage.setItem(key, value);
  refresh();
}

export function removeSessionStorageItem(key: string): void {
  sessionStorage.removeItem(key);
  refresh();
}

export function clearSessionStorage(): void {
  sessionStorage.clear();
  refresh();
}

export async function deleteIndexedDBDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => {
      refresh();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearCacheStorage(cacheName: string): Promise<void> {
  try {
    await window.caches.delete(cacheName);
    refresh();
  } catch (error) {
    logger.error('[StorageInspector] Failed to clear cache:', error);
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

function getPanelHTML(): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>💾</span>
        <span>Storage Inspector</span>
      </div>
      <div id="${PREFIX}-actions">
        <button id="${PREFIX}-refresh" title="Refresh">🔄</button>
        <button id="${PREFIX}-export" title="Export All">📤</button>
        <button id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-tabs">
      <button class="${PREFIX}-tab active" data-tab="localStorage">
        LocalStorage
        <span class="${PREFIX}-badge" id="${PREFIX}-localStorage-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="sessionStorage">
        SessionStorage
        <span class="${PREFIX}-badge" id="${PREFIX}-sessionStorage-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="indexedDB">
        IndexedDB
        <span class="${PREFIX}-badge" id="${PREFIX}-indexedDB-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="cookies">
        Cookies
        <span class="${PREFIX}-badge" id="${PREFIX}-cookies-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="cache">
        Cache
        <span class="${PREFIX}-badge" id="${PREFIX}-cache-count">0</span>
      </button>
    </div>
    
    <div id="${PREFIX}-toolbar">
      <input type="text" id="${PREFIX}-search" placeholder="Search..." />
      <button id="${PREFIX}-clear-all">Clear All</button>
    </div>
    
    <div id="${PREFIX}-content"></div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-quota"></span>
      <span id="${PREFIX}-status">Ready</span>
    </div>
  `;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  // Export button
  panel.querySelector(`#${PREFIX}-export`)?.addEventListener('click', exportAllData);

  // Tab switching
  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as typeof currentTab;
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
      clearCurrentStorage();
    }
  });
}

function switchTab(tab: typeof currentTab): void {
  currentTab = tab;

  // Update tab UI
  shadowRoot?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  renderCurrentTab();
}

async function renderCurrentTab(): Promise<void> {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  content.innerHTML = `<div class="${PREFIX}-loading">Loading...</div>`;

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

    updateQuota();
  } catch (error) {
    content.innerHTML = `<div class="${PREFIX}-error">Error loading data: ${error}</div>`;
  }
}

function renderStorageItems(items: StorageItem[], type: 'localStorage' | 'sessionStorage'): string {
  if (items.length === 0) {
    return `<div class="${PREFIX}-empty">No items in ${type}</div>`;
  }

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);

  return `
    <div class="${PREFIX}-info">${items.length} items (${formatBytes(totalSize)})</div>
    <div class="${PREFIX}-list">
      ${items
        .map(
          (item) => `
        <div class="${PREFIX}-item" data-key="${escapeHtml(item.key)}">
          <div class="${PREFIX}-item-header">
            <span class="${PREFIX}-item-key">${escapeHtml(item.key)}</span>
            <span class="${PREFIX}-item-type">${item.type}</span>
            <span class="${PREFIX}-item-size">${formatBytes(item.size)}</span>
          </div>
          <div class="${PREFIX}-item-value">${escapeHtml(truncate(item.value, 100))}</div>
          <div class="${PREFIX}-item-actions">
            <button class="${PREFIX}-edit" data-key="${escapeHtml(item.key)}">Edit</button>
            <button class="${PREFIX}-delete" data-key="${escapeHtml(item.key)}">Delete</button>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderIndexedDB(databases: IndexedDBDatabase[]): string {
  if (databases.length === 0) {
    return `<div class="${PREFIX}-empty">No IndexedDB databases found</div>`;
  }

  return `
    <div class="${PREFIX}-info">${databases.length} database${databases.length !== 1 ? 's' : ''}</div>
    <div class="${PREFIX}-list">
      ${databases
        .map(
          (db) => `
        <div class="${PREFIX}-database" data-name="${escapeHtml(db.name)}">
          <div class="${PREFIX}-database-header">
            <span class="${PREFIX}-database-name">${escapeHtml(db.name)}</span>
            <span class="${PREFIX}-database-version">v${db.version}</span>
            <button class="${PREFIX}-delete-db" data-name="${escapeHtml(db.name)}">Delete DB</button>
          </div>
          <div class="${PREFIX}-stores">
            ${db.objectStores
              .map(
                (store) => `
              <div class="${PREFIX}-store">
                <span class="${PREFIX}-store-name">${escapeHtml(store.name)}</span>
                <span class="${PREFIX}-store-count">${store.count} records</span>
                <span class="${PREFIX}-store-keypath">Key: ${escapeHtml(String(store.keyPath))}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderCookies(cookies: CookieInfo[]): string {
  if (cookies.length === 0) {
    return `<div class="${PREFIX}-empty">No cookies found</div>`;
  }

  return `
    <div class="${PREFIX}-info">${cookies.length} cookie${cookies.length !== 1 ? 's' : ''}</div>
    <div class="${PREFIX}-list">
      ${cookies
        .map(
          (cookie) => `
        <div class="${PREFIX}-cookie">
          <div class="${PREFIX}-cookie-header">
            <span class="${PREFIX}-cookie-name">${escapeHtml(cookie.name)}</span>
            ${cookie.secure ? `<span class="${PREFIX}-badge-secure">Secure</span>` : ''}
            ${cookie.httpOnly ? `<span class="${PREFIX}-badge-httponly">HttpOnly</span>` : ''}
          </div>
          <div class="${PREFIX}-cookie-value">${escapeHtml(truncate(cookie.value, 100))}</div>
          <div class="${PREFIX}-cookie-meta">
            <span>Domain: ${escapeHtml(cookie.domain)}</span>
            <span>Path: ${escapeHtml(cookie.path)}</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderCacheStorage(caches: { [cacheName: string]: CacheEntry[] }): string {
  const cacheNames = Object.keys(caches);
  if (cacheNames.length === 0) {
    return `<div class="${PREFIX}-empty">No cache storage found</div>`;
  }

  return `
    <div class="${PREFIX}-info">${cacheNames.length} cache${cacheNames.length !== 1 ? 's' : ''}</div>
    <div class="${PREFIX}-list">
      ${cacheNames
        .map((cacheName) => {
          const entries = caches[cacheName];
          const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
          return `
          <div class="${PREFIX}-cache" data-name="${escapeHtml(cacheName)}">
            <div class="${PREFIX}-cache-header">
              <span class="${PREFIX}-cache-name">${escapeHtml(cacheName)}</span>
              <span class="${PREFIX}-cache-stats">${entries.length} entries (${formatBytes(totalSize)})</span>
              <button class="${PREFIX}-clear-cache" data-name="${escapeHtml(cacheName)}">Clear Cache</button>
            </div>
            <div class="${PREFIX}-cache-entries">
              ${entries
                .slice(0, 10)
                .map(
                  (entry) => `
                <div class="${PREFIX}-cache-entry">
                  <span class="${PREFIX}-cache-url">${escapeHtml(truncate(entry.url, 60))}</span>
                  <span class="${PREFIX}-cache-size">${formatBytes(entry.size)}</span>
                </div>
              `
                )
                .join('')}
              ${entries.length > 10 ? `<div class="${PREFIX}-cache-more">...and ${entries.length - 10} more</div>` : ''}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

// ============================================
// Utilities
// ============================================

function inferType(value: string): StorageItem['type'] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return 'array';
    if (parsed === null) return 'null';
    return typeof parsed as StorageItem['type'];
  } catch {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!Number.isNaN(Number(value)) && value !== '') return 'number';
    return 'string';
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateBadge(type: string, count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

async function updateQuota(): Promise<void> {
  const quota = await getStorageQuota();
  const quotaEl = shadowRoot?.querySelector(`#${PREFIX}-quota`);
  if (quotaEl && quota) {
    const usagePercent = ((quota.usage / quota.quota) * 100).toFixed(1);
    quotaEl.textContent = `Storage: ${formatBytes(quota.usage)} / ${formatBytes(quota.quota)} (${usagePercent}%)`;
  }
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

function filterContent(query: string): void {
  const items = shadowRoot?.querySelectorAll(`.${PREFIX}-item, .${PREFIX}-database, .${PREFIX}-cookie, .${PREFIX}-cache`);
  items?.forEach((item) => {
    const text = item.textContent?.toLowerCase() || '';
    (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

function clearCurrentStorage(): void {
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
    renderCurrentTab();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
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
      max-height: 80vh;
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

    #${PREFIX}-tabs {
      display: flex;
      overflow-x: auto;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    .${PREFIX}-tab {
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

    #${PREFIX}-toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
    }

    #${PREFIX}-search {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 13px;
    }

    #${PREFIX}-search:focus {
      outline: none;
      border-color: #4f46e5;
    }

    #${PREFIX}-search::placeholder {
      color: #64748b;
    }

    #${PREFIX}-clear-all {
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 12px;
      cursor: pointer;
    }

    #${PREFIX}-clear-all:hover {
      background: #b91c1c;
    }

    #${PREFIX}-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      min-height: 200px;
    }

    .${PREFIX}-loading,
    .${PREFIX}-empty {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .${PREFIX}-info {
      padding: 8px 12px;
      background: #1e293b;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      color: #94a3b8;
    }

    .${PREFIX}-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .${PREFIX}-item,
    .${PREFIX}-database,
    .${PREFIX}-cookie,
    .${PREFIX}-cache {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
    }

    .${PREFIX}-item-header,
    .${PREFIX}-database-header,
    .${PREFIX}-cookie-header,
    .${PREFIX}-cache-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .${PREFIX}-item-key,
    .${PREFIX}-database-name,
    .${PREFIX}-cookie-name,
    .${PREFIX}-cache-name {
      font-weight: 600;
      color: #f8fafc;
      flex: 1;
    }

    .${PREFIX}-item-type,
    .${PREFIX}-database-version {
      background: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: #94a3b8;
    }

    .${PREFIX}-item-size,
    .${PREFIX}-cache-size {
      color: #64748b;
      font-size: 11px;
    }

    .${PREFIX}-item-value,
    .${PREFIX}-cookie-value {
      background: #0f172a;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #94a3b8;
      overflow-wrap: break-word;
      margin-bottom: 8px;
    }

    .${PREFIX}-item-actions {
      display: flex;
      gap: 8px;
    }

    .${PREFIX}-item-actions button,
    .${PREFIX}-delete-db,
    .${PREFIX}-clear-cache {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    .${PREFIX}-item-actions button:hover,
    .${PREFIX}-delete-db:hover,
    .${PREFIX}-clear-cache:hover {
      background: #475569;
    }

    .${PREFIX}-stores {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    .${PREFIX}-store {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #0f172a;
      border-radius: 4px;
      font-size: 12px;
    }

    .${PREFIX}-store-name {
      font-weight: 500;
      color: #e2e8f0;
    }

    .${PREFIX}-store-count {
      background: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }

    .${PREFIX}-store-keypath {
      color: #64748b;
      font-size: 11px;
    }

    .${PREFIX}-badge-secure,
    .${PREFIX}-badge-httponly {
      background: #059669;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .${PREFIX}-badge-httponly {
      background: #7c3aed;
    }

    .${PREFIX}-cookie-meta {
      display: flex;
      gap: 16px;
      font-size: 11px;
      color: #64748b;
    }

    .${PREFIX}-cache-entries {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    .${PREFIX}-cache-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #0f172a;
      border-radius: 4px;
      font-size: 11px;
    }

    .${PREFIX}-cache-url {
      color: #94a3b8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .${PREFIX}-cache-more {
      text-align: center;
      padding: 8px;
      color: #64748b;
      font-size: 11px;
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

// ============================================
// Export singleton
// ============================================

export const storageInspector = {
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
