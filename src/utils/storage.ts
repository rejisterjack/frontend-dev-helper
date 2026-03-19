/**
 * Storage Utilities
 *
 * Simplified storage API for tool state management.
 * Wraps chrome.storage with type safety and error handling.
 */

import type { ToolId } from '@/constants';
import { DEFAULT_SETTINGS, ERROR_MESSAGES, STORAGE_KEYS, TOOL_IDS } from '@/constants';
import type { ToolState, ToolsState } from '@/types';

// ============================================
// Types
// ============================================

/**
 * Storage area type
 */
export type StorageArea = 'local' | 'sync' | 'managed';

/**
 * Tool state stored in storage
 */
export interface StoredToolState extends ToolState {
  /** Timestamp of last update */
  updatedAt: number;
  /** Tab ID if state is tab-specific */
  tabId?: number;
}

/**
 * Storage structure for tool states
 */
export interface ToolStatesStorage {
  /** Global tool states */
  global: Partial<Record<ToolId, StoredToolState>>;
  /** Per-tab tool states (tabId -> tool states) */
  tabs: Record<number, Partial<Record<ToolId, StoredToolState>>>;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors: string[];
}

// ============================================
// Tool State Functions
// ============================================

/**
 * Get the state of a specific tool
 * @param toolId - The tool identifier
 * @param tabId - Optional tab ID for tab-specific state
 * @returns The tool state or null if not found
 */
export async function getToolState(toolId: ToolId, tabId?: number): Promise<ToolState | null> {
  try {
    const storageKey = STORAGE_KEYS.TOOL_STATES;
    const result = await chrome.storage.local.get(storageKey);
    const storage: ToolStatesStorage = result[storageKey] || { global: {}, tabs: {} };

    // Check for tab-specific state first
    if (tabId !== undefined && storage.tabs[tabId]?.[toolId]) {
      const { enabled, settings } = storage.tabs[tabId][toolId]!;
      return { enabled, settings };
    }

    // Fall back to global state
    if (storage.global[toolId]) {
      const { enabled, settings } = storage.global[toolId]!;
      return { enabled, settings };
    }

    // Return default state from metadata
    const defaultEnabled = getDefaultToolEnabled(toolId);
    return { enabled: defaultEnabled, settings: {} };
  } catch (error) {
    console.error(`[Storage] Failed to get tool state for ${toolId}:`, error);
    return null;
  }
}

/**
 * Set the state of a specific tool
 * @param toolId - The tool identifier
 * @param state - The new tool state
 * @param tabId - Optional tab ID for tab-specific state
 */
export async function setToolState(
  toolId: ToolId,
  state: ToolState,
  tabId?: number
): Promise<void> {
  try {
    const storageKey = STORAGE_KEYS.TOOL_STATES;
    const result = await chrome.storage.local.get(storageKey);
    const storage: ToolStatesStorage = result[storageKey] || { global: {}, tabs: {} };

    const storedState: StoredToolState = {
      ...state,
      updatedAt: Date.now(),
      ...(tabId !== undefined && { tabId }),
    };

    if (tabId !== undefined) {
      // Store as tab-specific
      if (!storage.tabs[tabId]) {
        storage.tabs[tabId] = {};
      }
      storage.tabs[tabId][toolId] = storedState;
    } else {
      // Store as global
      storage.global[toolId] = storedState;
    }

    await chrome.storage.local.set({ [storageKey]: storage });

    // Notify of state change
    await notifyToolStateChanged(toolId, state, tabId);
  } catch (error) {
    console.error(`[Storage] Failed to set tool state for ${toolId}:`, error);
    throw new Error(ERROR_MESSAGES.STORAGE_SET_FAILED);
  }
}

/**
 * Get all tool states
 * @param tabId - Optional tab ID to include tab-specific states
 * @returns Map of all tool states
 */
export async function getAllToolStates(tabId?: number): Promise<ToolsState> {
  try {
    const storageKey = STORAGE_KEYS.TOOL_STATES;
    const result = await chrome.storage.local.get(storageKey);
    const storage: ToolStatesStorage = result[storageKey] || { global: {}, tabs: {} };

    const allStates: Partial<Record<ToolId, ToolState>> = {};

    // Start with global states
    for (const [toolId, state] of Object.entries(storage.global)) {
      if (state) {
        allStates[toolId as ToolId] = {
          enabled: state.enabled,
          settings: state.settings,
        };
      }
    }

    // Override with tab-specific states if provided
    if (tabId !== undefined && storage.tabs[tabId]) {
      for (const [toolId, state] of Object.entries(storage.tabs[tabId])) {
        if (state) {
          allStates[toolId as ToolId] = {
            enabled: state.enabled,
            settings: state.settings,
          };
        }
      }
    }

    // Fill in defaults for missing tools
    const allToolIds = Object.values(TOOL_IDS);
    for (const toolId of allToolIds) {
      if (!allStates[toolId]) {
        allStates[toolId] = {
          enabled: getDefaultToolEnabled(toolId),
          settings: {},
        };
      }
    }

    return allStates as ToolsState;
  } catch (error) {
    console.error('[Storage] Failed to get all tool states:', error);
    throw new Error(ERROR_MESSAGES.STORAGE_GET_FAILED);
  }
}

/**
 * Clear all tool states
 * @param options - Options for what to clear
 */
export async function clearAllStates(
  options: { global?: boolean; tabs?: boolean; specificTabId?: number } = {}
): Promise<void> {
  const { global = true, tabs = false, specificTabId } = options;

  try {
    const storageKey = STORAGE_KEYS.TOOL_STATES;

    if (global && !tabs && specificTabId === undefined) {
      // Clear everything
      await chrome.storage.local.remove(storageKey);
    } else {
      const result = await chrome.storage.local.get(storageKey);
      const storage: ToolStatesStorage = result[storageKey] || { global: {}, tabs: {} };

      if (global) {
        storage.global = {};
      }

      if (tabs) {
        storage.tabs = {};
      } else if (specificTabId !== undefined) {
        delete storage.tabs[specificTabId];
      }

      await chrome.storage.local.set({ [storageKey]: storage });
    }

    // Also clear legacy keys if they exist
    const legacyKeys = Object.values(TOOL_IDS).map((id) => `fdh_${id}_state`);
    await chrome.storage.local.remove(legacyKeys);
  } catch (error) {
    console.error('[Storage] Failed to clear all states:', error);
    throw new Error(ERROR_MESSAGES.STORAGE_CLEAR_FAILED);
  }
}

/**
 * Toggle a tool's enabled state
 * @param toolId - The tool identifier
 * @param tabId - Optional tab ID for tab-specific state
 * @returns The new enabled state
 */
export async function toggleToolState(toolId: ToolId, tabId?: number): Promise<boolean> {
  const currentState = await getToolState(toolId, tabId);
  const newEnabled = !(currentState?.enabled ?? false);

  await setToolState(
    toolId,
    {
      enabled: newEnabled,
      settings: currentState?.settings ?? {},
    },
    tabId
  );

  return newEnabled;
}

// ============================================
// Tab-Specific State Management
// ============================================

/**
 * Get tab-specific tool state
 * @param tabId - The tab ID
 * @param toolId - The tool identifier
 * @returns The tool state or null
 */
export async function getTabToolState(tabId: number, toolId: ToolId): Promise<ToolState | null> {
  return getToolState(toolId, tabId);
}

/**
 * Set tab-specific tool state
 * @param tabId - The tab ID
 * @param toolId - The tool identifier
 * @param state - The new tool state
 */
export async function setTabToolState(
  tabId: number,
  toolId: ToolId,
  state: ToolState
): Promise<void> {
  return setToolState(toolId, state, tabId);
}

/**
 * Clear all tool states for a specific tab
 * @param tabId - The tab ID
 */
export async function clearTabStates(tabId: number): Promise<void> {
  return clearAllStates({ specificTabId: tabId });
}

/**
 * Copy global states to a specific tab
 * @param tabId - The tab ID to copy states to
 */
export async function copyGlobalStatesToTab(tabId: number): Promise<void> {
  try {
    const globalStates = await getAllToolStates();
    const storageKey = STORAGE_KEYS.TOOL_STATES;
    const result = await chrome.storage.local.get(storageKey);
    const storage: ToolStatesStorage = result[storageKey] || { global: {}, tabs: {} };

    if (!storage.tabs[tabId]) {
      storage.tabs[tabId] = {};
    }

    for (const [toolId, state] of Object.entries(globalStates)) {
      storage.tabs[tabId][toolId as ToolId] = {
        ...state,
        updatedAt: Date.now(),
        tabId,
      };
    }

    await chrome.storage.local.set({ [storageKey]: storage });
  } catch (error) {
    console.error(`[Storage] Failed to copy global states to tab ${tabId}:`, error);
    throw error;
  }
}

// ============================================
// Migration
// ============================================

/**
 * Migrate storage from previous versions
 * @returns Migration result
 */
export async function migrateStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    fromVersion: 'unknown',
    toVersion: DEFAULT_SETTINGS.version,
    changes: [],
    errors: [],
  };

  try {
    // Get current storage version
    const versionResult = await chrome.storage.local.get(STORAGE_KEYS.STORAGE_VERSION);
    const currentVersion = versionResult[STORAGE_KEYS.STORAGE_VERSION] as string | undefined;
    result.fromVersion = currentVersion || '0.0.0';

    // Check if migration is needed
    if (currentVersion === DEFAULT_SETTINGS.version) {
      result.changes.push('Storage is up to date');
      return result;
    }

    // Migrate from legacy individual tool storage to consolidated storage
    if (!currentVersion || currentVersion < '1.0.0') {
      await migrateFromLegacyStorage(result);
    }

    // Update storage version
    await chrome.storage.local.set({
      [STORAGE_KEYS.STORAGE_VERSION]: DEFAULT_SETTINGS.version,
    });

    result.changes.push(`Updated storage version to ${DEFAULT_SETTINGS.version}`);
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/**
 * Migrate from legacy storage format
 */
async function migrateFromLegacyStorage(result: MigrationResult): Promise<void> {
  try {
    const allData = await chrome.storage.local.get(null);
    const newStorage: ToolStatesStorage = { global: {}, tabs: {} };
    let migratedCount = 0;

    // Look for legacy tool state keys
    for (const [key, value] of Object.entries(allData)) {
      // Pattern: fdh_{toolId}_state or similar legacy keys
      const match = key.match(/^fdh_([a-z_]+)_state$/i);
      if (match && value) {
        const toolId = match[1] as ToolId;
        if (Object.values(TOOL_IDS).includes(toolId)) {
          newStorage.global[toolId] = {
            enabled: (value as ToolState).enabled ?? false,
            settings: (value as ToolState).settings ?? {},
            updatedAt: Date.now(),
          };
          migratedCount++;
        }
      }
    }

    if (migratedCount > 0) {
      await chrome.storage.local.set({ [STORAGE_KEYS.TOOL_STATES]: newStorage });
      result.changes.push(`Migrated ${migratedCount} tool states from legacy format`);
    }
  } catch (error) {
    result.errors.push(
      `Legacy migration failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================
// Settings Storage
// ============================================

/**
 * Get extension settings
 * @returns Extension settings
 */
export async function getSettings(): Promise<typeof DEFAULT_SETTINGS> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS];

    if (stored) {
      // Merge with defaults for any new properties
      return { ...DEFAULT_SETTINGS, ...stored };
    }

    // Initialize with defaults
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[Storage] Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update extension settings
 * @param settings - Partial settings to update
 */
export async function updateSettings(settings: Partial<typeof DEFAULT_SETTINGS>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  } catch (error) {
    console.error('[Storage] Failed to update settings:', error);
    throw new Error(ERROR_MESSAGES.STORAGE_SET_FAILED);
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get default enabled state for a tool
 */
async function getDefaultToolEnabled(toolId: ToolId): Promise<boolean> {
  // Import dynamically to avoid circular dependencies
  const { TOOL_METADATA } = await import('@/constants');
  return TOOL_METADATA[toolId]?.defaultEnabled ?? false;
}

/**
 * Notify about tool state change
 */
async function notifyToolStateChanged(
  toolId: ToolId,
  state: ToolState,
  tabId?: number
): Promise<void> {
  try {
    // Broadcast to all contexts
    await chrome.runtime.sendMessage({
      type: 'TOOL_STATE_CHANGED',
      payload: { toolId, state, tabId },
      timestamp: Date.now(),
    });
  } catch {
    // Ignore errors - receivers may not be listening
  }
}

/**
 * Count active tools
 * @param tabId - Optional tab ID for tab-specific count
 * @returns Number of active tools
 */
export async function getActiveToolsCount(tabId?: number): Promise<number> {
  const states = await getAllToolStates(tabId);
  return Object.values(states).filter((state) => state.enabled).length;
}

/**
 * Check if any tools are active
 * @param tabId - Optional tab ID for tab-specific check
 * @returns True if at least one tool is active
 */
export async function hasActiveTools(tabId?: number): Promise<boolean> {
  const count = await getActiveToolsCount(tabId);
  return count > 0;
}
