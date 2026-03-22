/**
 * Storage Inspector Logic
 *
 * Data collection and manipulation functions for storage inspection.
 */

import type {
  CacheEntry,
  CookieInfo,
  IndexedDBDatabase,
  IndexedDBObjectStore,
  StorageInspectorItem,
  StorageSnapshot,
} from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Data Collection
// ============================================

/**
 * Get all LocalStorage items
 */
export async function getLocalStorage(): Promise<StorageInspectorItem[]> {
  const items: StorageInspectorItem[] = [];
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

/**
 * Get all SessionStorage items
 */
export async function getSessionStorage(): Promise<StorageInspectorItem[]> {
  const items: StorageInspectorItem[] = [];
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

/**
 * Get all IndexedDB databases
 */
export async function getIndexedDB(): Promise<IndexedDBDatabase[]> {
  const databases: IndexedDBDatabase[] = [];

  try {
    // Get list of databases (if supported)
    if ('databases' in indexedDB) {
      const dbList = await (
        indexedDB as IDBFactory & { databases(): Promise<{ name: string; version: number }[]> }
      ).databases();

      for (const dbInfo of dbList) {
        if (!dbInfo.name) continue;
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

            const indexes: Array<{
              name: string;
              keyPath: string | string[];
              unique: boolean;
              multiEntry: boolean;
            }> = [];
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

/**
 * Open an IndexedDB database
 */
async function openDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

/**
 * Get all cookies
 */
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

/**
 * Get all Cache Storage entries
 */
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

/**
 * Get storage quota information
 */
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
        usageDetails: (estimate as { usageDetails?: Record<string, number> }).usageDetails,
      };
    }
  } catch (error) {
    logger.error('[StorageInspector] Failed to get storage quota:', error);
  }
  return null;
}

/**
 * Get a complete snapshot of all storage
 */
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

/**
 * Set a LocalStorage item
 */
export function setLocalStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

/**
 * Remove a LocalStorage item
 */
export function removeLocalStorageItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clear all LocalStorage items
 */
export function clearLocalStorage(): void {
  localStorage.clear();
}

/**
 * Set a SessionStorage item
 */
export function setSessionStorageItem(key: string, value: string): void {
  sessionStorage.setItem(key, value);
}

/**
 * Remove a SessionStorage item
 */
export function removeSessionStorageItem(key: string): void {
  sessionStorage.removeItem(key);
}

/**
 * Clear all SessionStorage items
 */
export function clearSessionStorage(): void {
  sessionStorage.clear();
}

/**
 * Delete an IndexedDB database
 */
export async function deleteIndexedDBDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear a Cache Storage
 */
export async function clearCacheStorage(cacheName: string): Promise<void> {
  try {
    await window.caches.delete(cacheName);
  } catch (error) {
    logger.error('[StorageInspector] Failed to clear cache:', error);
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Infer the type of a stored value
 */
export function inferType(value: string): StorageInspectorItem['type'] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return 'array';
    if (parsed === null) return 'null';
    return typeof parsed as StorageInspectorItem['type'];
  } catch {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!Number.isNaN(Number(value)) && value !== '') return 'number';
    return 'string';
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}
