/**
 * FrontendDevHelper - Storage Types
 *
 * Types for storage areas, items, and storage inspector data structures.
 */

import type { ToolId } from './tools';

// ============================================
// Storage Types
// ============================================

/** Storage area type */
export type StorageArea = 'local' | 'session' | 'sync';

/** Storage item */
export interface StorageItem<T = unknown> {
  key: string;
  value: T;
  area: StorageArea;
  timestamp?: number;
  version?: number;
}

/** Extension storage interface */
export interface ExtensionStorage {
  get<T>(key: string, area?: StorageArea): Promise<T | null>;
  set<T>(key: string, value: T, area?: StorageArea): Promise<void>;
  remove(key: string, area?: StorageArea): Promise<void>;
  clear(area?: StorageArea): Promise<void>;
}

// ============================================
// Storage Inspector Types
// ============================================

/** Storage item for LocalStorage/SessionStorage (Storage Inspector tool) */
export interface StorageInspectorItem {
  key: string;
  value: string;
  size: number;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  area?: StorageArea;
}

/** IndexedDB database info */
export interface IndexedDBDatabase {
  name: string;
  version: number;
  objectStores: IndexedDBObjectStore[];
}

/** IndexedDB object store info */
export interface IndexedDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IndexedDBIndex[];
  count: number;
}

/** IndexedDB index info */
export interface IndexedDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

/** Cookie info */
export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: chrome.cookies.SameSiteStatus;
}

/** Cache storage entry */
export interface CacheEntry {
  url: string;
  size: number;
  headers: Record<string, string>;
}

/** Complete storage snapshot */
export interface StorageSnapshot {
  localStorage: StorageInspectorItem[];
  sessionStorage: StorageInspectorItem[];
  indexedDB: IndexedDBDatabase[];
  cookies: CookieInfo[];
  cacheStorage: { [cacheName: string]: CacheEntry[] };
}

// ============================================
// Favorites/Quick Access Types
// ============================================

/** User favorites storage */
export interface UserFavorites {
  pinnedTools: ToolId[];
  recentTools: Array<{ toolId: ToolId; timestamp: number }>;
}
