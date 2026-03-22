/**
 * Baseline Manager Module
 *
 * Manages baseline screenshots stored in IndexedDB.
 * Provides CRUD operations for baseline screenshots with URL-based organization.
 */

import type { BaselineScreenshot, VisualRegressionState } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Constants
// ============================================

const DB_NAME = 'fdh_visual_regression';
const DB_VERSION = 1;
const BASELINE_STORE = 'baselines';
const TEST_STORE = 'tests';

// ============================================
// Database Management
// ============================================

let db: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
async function initDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      logger.log('[BaselineManager] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Baseline screenshots store
      if (!database.objectStoreNames.contains(BASELINE_STORE)) {
        const baselineStore = database.createObjectStore(BASELINE_STORE, { keyPath: 'id' });
        baselineStore.createIndex('url', 'url', { unique: false });
        baselineStore.createIndex('pathname', 'pathname', { unique: false });
        baselineStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Test results store
      if (!database.objectStoreNames.contains(TEST_STORE)) {
        const testStore = database.createObjectStore(TEST_STORE, { keyPath: 'id' });
        testStore.createIndex('url', 'url', { unique: false });
        testStore.createIndex('baselineId', 'baselineId', { unique: false });
        testStore.createIndex('timestamp', 'timestamp', { unique: false });
        testStore.createIndex('status', 'status', { unique: false });
      }

      logger.log('[BaselineManager] Database upgraded to version', DB_VERSION);
    };
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.log('[BaselineManager] Database closed');
  }
}

// ============================================
// Baseline Operations
// ============================================

/**
 * Save a baseline screenshot
 */
export async function saveBaseline(baseline: BaselineScreenshot): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readwrite');
    const store = transaction.objectStore(BASELINE_STORE);
    const request = store.put(baseline);

    request.onsuccess = () => {
      logger.log('[BaselineManager] Baseline saved:', baseline.id);
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to save baseline:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get a baseline by ID
 */
export async function getBaseline(id: string): Promise<BaselineScreenshot | null> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readonly');
    const store = transaction.objectStore(BASELINE_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to get baseline:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get baseline by URL and viewport (exact match)
 */
export async function getBaselineByUrl(
  url: string,
  viewport: { width: number; height: number }
): Promise<BaselineScreenshot | null> {
  const baselines = await getBaselinesByUrl(url);

  return (
    baselines.find(
      (b) => b.viewport.width === viewport.width && b.viewport.height === viewport.height
    ) || null
  );
}

/**
 * Get all baselines for a specific URL
 */
export async function getBaselinesByUrl(url: string): Promise<BaselineScreenshot[]> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readonly');
    const store = transaction.objectStore(BASELINE_STORE);
    const index = store.index('url');
    const request = index.getAll(url);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to get baselines by URL:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get all baselines
 */
export async function getAllBaselines(): Promise<BaselineScreenshot[]> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readonly');
    const store = transaction.objectStore(BASELINE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to get all baselines:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Delete a baseline by ID
 */
export async function deleteBaseline(id: string): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readwrite');
    const store = transaction.objectStore(BASELINE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      logger.log('[BaselineManager] Baseline deleted:', id);
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to delete baseline:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Delete all baselines for a URL
 */
export async function deleteBaselinesByUrl(url: string): Promise<number> {
  const baselines = await getBaselinesByUrl(url);

  for (const baseline of baselines) {
    await deleteBaseline(baseline.id);
  }

  logger.log('[BaselineManager] Deleted', baselines.length, 'baselines for URL:', url);
  return baselines.length;
}

/**
 * Clear all baselines
 */
export async function clearAllBaselines(): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BASELINE_STORE], 'readwrite');
    const store = transaction.objectStore(BASELINE_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      logger.log('[BaselineManager] All baselines cleared');
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to clear baselines:', request.error);
      reject(request.error);
    };
  });
}

// ============================================
// Test Operations
// ============================================

/**
 * Save a test result
 */
export async function saveTest(test: VisualRegressionState['tests'][number]): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TEST_STORE], 'readwrite');
    const store = transaction.objectStore(TEST_STORE);
    const request = store.put(test);

    request.onsuccess = () => {
      logger.log('[BaselineManager] Test saved:', test.id);
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to save test:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get all test results
 */
export async function getAllTests(): Promise<VisualRegressionState['tests']> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TEST_STORE], 'readonly');
    const store = transaction.objectStore(TEST_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to get tests:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get tests by baseline ID
 */
export async function getTestsByBaseline(
  baselineId: string
): Promise<VisualRegressionState['tests']> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TEST_STORE], 'readonly');
    const store = transaction.objectStore(TEST_STORE);
    const index = store.index('baselineId');
    const request = index.getAll(baselineId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to get tests by baseline:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Delete a test by ID
 */
export async function deleteTest(id: string): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TEST_STORE], 'readwrite');
    const store = transaction.objectStore(TEST_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      logger.log('[BaselineManager] Test deleted:', id);
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to delete test:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Clear all tests
 */
export async function clearAllTests(): Promise<void> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([TEST_STORE], 'readwrite');
    const store = transaction.objectStore(TEST_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      logger.log('[BaselineManager] All tests cleared');
      resolve();
    };

    request.onerror = () => {
      logger.error('[BaselineManager] Failed to clear tests:', request.error);
      reject(request.error);
    };
  });
}

// ============================================
// State Management
// ============================================

/**
 * Get complete visual regression state
 */
export async function getState(): Promise<VisualRegressionState> {
  const [baselines, tests] = await Promise.all([getAllBaselines(), getAllTests()]);

  return {
    baselines,
    tests,
    threshold: 0.1,
    ignoreRegions: [],
  };
}

/**
 * Get settings only
 */
export async function getSettings(): Promise<{
  threshold: number;
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }>;
}> {
  // In a real implementation, this would be stored separately
  // For now, return defaults
  return {
    threshold: 0.1,
    ignoreRegions: [],
  };
}

/**
 * Update settings
 */
export async function updateSettings(settings: {
  threshold?: number;
  ignoreRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}): Promise<void> {
  // In a real implementation, this would persist to storage
  logger.log('[BaselineManager] Settings updated:', settings);
}

/**
 * Export all data
 */
export async function exportData(): Promise<{
  baselines: BaselineScreenshot[];
  tests: VisualRegressionState['tests'];
  exportedAt: number;
}> {
  const [baselines, tests] = await Promise.all([getAllBaselines(), getAllTests()]);

  return {
    baselines,
    tests,
    exportedAt: Date.now(),
  };
}

/**
 * Import data
 */
export async function importData(data: {
  baselines: BaselineScreenshot[];
  tests: VisualRegressionState['tests'];
}): Promise<void> {
  // Clear existing data
  await Promise.all([clearAllBaselines(), clearAllTests()]);

  // Import baselines
  for (const baseline of data.baselines) {
    await saveBaseline(baseline);
  }

  // Import tests
  for (const test of data.tests) {
    await saveTest(test);
  }

  logger.log(
    '[BaselineManager] Data imported:',
    data.baselines.length,
    'baselines,',
    data.tests.length,
    'tests'
  );
}

// ============================================
// Export Module
// ============================================

export const baselineManager = {
  saveBaseline,
  getBaseline,
  getBaselineByUrl,
  getBaselinesByUrl,
  getAllBaselines,
  deleteBaseline,
  deleteBaselinesByUrl,
  clearAllBaselines,
  saveTest,
  getAllTests,
  getTestsByBaseline,
  deleteTest,
  clearAllTests,
  getState,
  getSettings,
  updateSettings,
  exportData,
  importData,
  closeDatabase,
};
