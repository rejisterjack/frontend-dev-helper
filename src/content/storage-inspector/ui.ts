/**
 * Storage Inspector UI
 *
 * UI component creation and rendering for the storage inspector.
 */

import type { CacheEntry, CookieInfo, IndexedDBDatabase, StorageInspectorItem } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { PREFIX } from './constants';
import { formatBytes, truncate } from './inspector';
import type { StorageTab } from './types';

// UI state references (set from index.ts)
let shadowRootRef: ShadowRoot | null = null;
let currentTabRef: StorageTab = 'localStorage';

/**
 * Set the shadow root reference for UI updates
 */
export function setShadowRoot(shadowRoot: ShadowRoot | null): void {
  shadowRootRef = shadowRoot;
}

/**
 * Set the current tab reference
 */
export function setCurrentTab(tab: StorageTab): void {
  currentTabRef = tab;
}

/**
 * Get the current tab
 */
export function getCurrentTab(): StorageTab {
  return currentTabRef;
}

/**
 * Get the panel HTML structure
 */
export function getPanelHTML(): string {
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

/**
 * Update a badge count
 */
export function updateBadge(type: string, count: number): void {
  const badge = shadowRootRef?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

/**
 * Update the quota display
 */
export async function updateQuota(
  getStorageQuota: () => Promise<{ usage: number; quota: number } | null>
): Promise<void> {
  const quota = await getStorageQuota();
  const quotaEl = shadowRootRef?.querySelector(`#${PREFIX}-quota`);
  if (quotaEl && quota) {
    const usagePercent = ((quota.usage / quota.quota) * 100).toFixed(1);
    quotaEl.textContent = `Storage: ${formatBytes(quota.usage)} / ${formatBytes(quota.quota)} (${usagePercent}%)`;
  }
}

/**
 * Update the status message
 */
export function updateStatus(message: string): void {
  const statusEl = shadowRootRef?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, 2000);
  }
}

/**
 * Filter content based on search query
 */
export function filterContent(query: string): void {
  const items = shadowRootRef?.querySelectorAll(
    `.${PREFIX}-item, .${PREFIX}-database, .${PREFIX}-cookie, .${PREFIX}-cache`
  );
  items?.forEach((item) => {
    const text = item.textContent?.toLowerCase() || '';
    (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

/**
 * Switch to a different tab
 */
export function switchTabUI(tab: StorageTab): void {
  // Update tab UI
  shadowRootRef?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });
}

/**
 * Get the content element
 */
export function getContentElement(): Element | null {
  if (!shadowRootRef) return null;
  return shadowRootRef.querySelector(`#${PREFIX}-content`);
}

/**
 * Set loading state
 */
export function setLoading(): void {
  const content = getContentElement();
  if (content) {
    content.innerHTML = `<div class="${PREFIX}-loading">Loading...</div>`;
  }
}

/**
 * Set error state
 */
export function setError(error: unknown): void {
  const content = getContentElement();
  if (content) {
    content.innerHTML = `<div class="${PREFIX}-error">Error loading data: ${error}</div>`;
  }
}

/**
 * Render storage items (localStorage or sessionStorage)
 */
export function renderStorageItems(
  items: StorageInspectorItem[],
  type: 'localStorage' | 'sessionStorage'
): string {
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

/**
 * Render IndexedDB databases
 */
export function renderIndexedDB(databases: IndexedDBDatabase[]): string {
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

/**
 * Render cookies
 */
export function renderCookies(cookies: CookieInfo[]): string {
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

/**
 * Render cache storage
 */
export function renderCacheStorage(caches: { [cacheName: string]: CacheEntry[] }): string {
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
