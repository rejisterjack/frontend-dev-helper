/**
 * Storage Manager
 *
 * Handles all chrome.storage operations with type safety,
 * caching, and change listeners.
 */

import type { ExtensionStorage, StorageArea } from '@/types';
import { logger } from '../utils/logger';

export class StorageManager {
  private cache: Map<string, unknown> = new Map();
  private listeners: Set<(changes: Record<string, chrome.storage.StorageChange>) => void> =
    new Set();

  constructor() {
    this.setupChangeListener();
  }

  /**
   * Get a value from storage
   */
  async get<K extends keyof ExtensionStorage>(
    key: K,
    _area: StorageArea = 'local'
  ): Promise<ExtensionStorage[K] | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached as ExtensionStorage[K];
    }

    try {
      const result = await chrome.storage[_area].get(key);
      const value = result[key] ?? null;

      if (value !== null) {
        this.cache.set(key, value);
      }

      return value;
    } catch (error) {
      logger.error(`[StorageManager] Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  async set<K extends keyof ExtensionStorage>(
    key: K,
    value: ExtensionStorage[K],
    area: StorageArea = 'local'
  ): Promise<void> {
    try {
      const storageItem = {
        value,
        timestamp: Date.now(),
        version: 1,
      };

      await chrome.storage[area].set({ [key]: storageItem });
      this.cache.set(key, storageItem);
    } catch (error) {
      logger.error(`[StorageManager] Failed to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: keyof ExtensionStorage, area: StorageArea = 'local'): Promise<void> {
    try {
      await chrome.storage[area].remove(key);
      this.cache.delete(key);
    } catch (error) {
      logger.error(`[StorageManager] Failed to remove ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  async clear(area: StorageArea = 'local'): Promise<void> {
    try {
      await chrome.storage[area].clear();
      this.cache.clear();
    } catch (error) {
      logger.error('[StorageManager] Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Get multiple values from storage
   */
  async getMultiple<K extends keyof ExtensionStorage>(
    keys: K[],
    area: StorageArea = 'local'
  ): Promise<Pick<ExtensionStorage, K>> {
    try {
      const result = await chrome.storage[area].get(keys);
      return result as Pick<ExtensionStorage, K>;
    } catch (error) {
      logger.error('[StorageManager] Failed to get multiple keys:', error);
      throw error;
    }
  }

  /**
   * Set multiple values in storage
   */
  async setMultiple(items: Partial<ExtensionStorage>, area: StorageArea = 'local'): Promise<void> {
    try {
      const storageItems: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(items)) {
        const storageItem = {
          value,
          timestamp: Date.now(),
          version: 1,
        };
        storageItems[key] = storageItem;
        this.cache.set(key, storageItem);
      }

      await chrome.storage[area].set(storageItems);
    } catch (error) {
      logger.error('[StorageManager] Failed to set multiple items:', error);
      throw error;
    }
  }

  /**
   * Subscribe to storage changes
   */
  subscribe(callback: (changes: Record<string, chrome.storage.StorageChange>) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Set up the storage change listener
   */
  private setupChangeListener(): void {
    chrome.storage.onChanged.addListener((changes, _area) => {
      // Update cache with new values
      for (const [key, change] of Object.entries(changes)) {
        if (change.newValue !== undefined) {
          this.cache.set(key, change.newValue);
        } else {
          this.cache.delete(key);
        }
      }

      // Notify subscribers
      this.listeners.forEach((listener) => listener(changes));
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
