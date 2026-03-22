/**
 * Storage Inspector Types
 *
 * Type definitions for the storage inspector module.
 */

import type {
  CacheEntry,
  CookieInfo,
  IndexedDBDatabase,
  StorageInspectorItem,
  StorageSnapshot,
} from '@/types';

/** Export types from the global types */
export type {
  CacheEntry,
  CookieInfo,
  IndexedDBDatabase,
  IndexedDBObjectStore,
  StorageInspectorItem,
  StorageSnapshot,
} from '@/types';

/** Current tab type for the storage inspector */
export type StorageTab = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cookies' | 'cache';

/** State of the storage inspector */
export interface StorageInspectorState {
  enabled: boolean;
  isPanelOpen: boolean;
}

/** Storage quota information */
export interface StorageQuotaInfo {
  usage: number;
  quota: number;
  usageDetails?: { [key: string]: number };
}

/** Cache storage result type */
export type CacheStorageResult = { [cacheName: string]: CacheEntry[] };

/** Storage inspector singleton interface */
export interface StorageInspectorAPI {
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  getState: () => StorageInspectorState;
  refresh: () => Promise<void>;
  getLocalStorage: () => Promise<StorageInspectorItem[]>;
  getSessionStorage: () => Promise<StorageInspectorItem[]>;
  getIndexedDB: () => Promise<IndexedDBDatabase[]>;
  getCookies: () => Promise<CookieInfo[]>;
  getCacheStorage: () => Promise<CacheStorageResult>;
  getStorageQuota: () => Promise<StorageQuotaInfo | null>;
  getCompleteSnapshot: () => Promise<StorageSnapshot>;
  setLocalStorageItem: (key: string, value: string) => void;
  removeLocalStorageItem: (key: string) => void;
  clearLocalStorage: () => void;
  setSessionStorageItem: (key: string, value: string) => void;
  removeSessionStorageItem: (key: string) => void;
  clearSessionStorage: () => void;
  deleteIndexedDBDatabase: (name: string) => Promise<void>;
  clearCacheStorage: (cacheName: string) => Promise<void>;
}
