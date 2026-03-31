/**
 * Cross-Tab State Synchronization
 *
 * Synchronizes tool states across all browser tabs.
 * - When a tool is enabled in one tab, optionally sync to all tabs
 * - "Global mode" vs "Per-tab mode" toggle
 * - Visual indicator showing which tabs have tools active
 */

import { MESSAGE_TYPES } from '@/constants';
import type { ToolId } from '@/types';
import { logger } from '@/utils/logger';
import { broadcastMessage, type ExtensionMessage } from '@/utils/messaging';

// ============================================
// Constants
// ============================================

const SYNC_MODE_KEY = 'fdh_sync_mode';
const SYNCED_TABS_KEY = 'fdh_synced_tabs';

export type SyncMode = 'global' | 'per-tab';

interface TabState {
  tabId: number;
  url: string;
  activeTools: ToolId[];
  lastUpdated: number;
}

// Note: SyncState interface removed - not currently used but kept for future use
/*
interface SyncState {
  mode: SyncMode;
  syncedTabs: TabState[];
  globalToolStates: Record<ToolId, boolean>;
}
*/

// ============================================
// State Management
// ============================================

let currentMode: SyncMode = 'per-tab';
let syncedTabs: Map<number, TabState> = new Map();
let globalToolStates: Partial<Record<ToolId, boolean>> = {};

// ============================================
// Initialization
// ============================================

/**
 * Initialize cross-tab sync
 */
export async function initializeCrossTabSync(): Promise<void> {
  // Load saved sync mode
  const result = await chrome.storage.local.get([SYNC_MODE_KEY, SYNCED_TABS_KEY]);
  currentMode = (result[SYNC_MODE_KEY] as SyncMode) || 'per-tab';
  syncedTabs = new Map(
    Object.entries(result[SYNCED_TABS_KEY] || {}).map(([k, v]) => [parseInt(k, 10), v as TabState])
  );

  // Set up tab event listeners
  setupTabListeners();

  // Set up message listener for sync messages
  chrome.runtime.onMessage.addListener(handleSyncMessage);

  // Set up storage change listener for cross-context sync
  chrome.storage.onChanged.addListener(handleStorageChange);

  logger.log('[CrossTabSync] Initialized with mode:', currentMode);
}

/**
 * Set up tab event listeners
 */
function setupTabListeners(): void {
  // Track tab activations
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tabState = syncedTabs.get(activeInfo.tabId);
    if (tabState) {
      tabState.lastUpdated = Date.now();
      await saveSyncedTabs();
    }
  });

  // Track tab removals
  chrome.tabs.onRemoved.addListener((tabId) => {
    syncedTabs.delete(tabId);
    saveSyncedTabs();
  });

  // Track tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      const existingState = syncedTabs.get(tabId);
      if (existingState) {
        existingState.url = tab.url;
        existingState.lastUpdated = Date.now();
        saveSyncedTabs();
      }
    }
  });
}

/**
 * Handle sync-related messages
 */
function handleSyncMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: Record<string, unknown>) => void
): boolean {
  switch (message.type) {
    case 'GET_SYNC_MODE':
      sendResponse({ mode: currentMode });
      return false;

    case 'SET_SYNC_MODE':
      if (message.payload && typeof message.payload === 'object' && 'mode' in message.payload) {
        setSyncMode(message.payload.mode as SyncMode);
        sendResponse({ success: true });
      }
      return false;

    case 'GET_SYNCED_TABS':
      sendResponse({ tabs: Array.from(syncedTabs.values()) });
      return false;

    case 'TOOL_STATE_CHANGED':
      // Handle tool state change for sync
      if (currentMode === 'global' && message.payload) {
        const { toolId, enabled, tabId } = message.payload as {
          toolId: ToolId;
          enabled: boolean;
          tabId?: number;
        };

        // Update global state
        globalToolStates[toolId] = enabled;

        // Sync to all other tabs
        if (tabId) {
          syncToolStateToAllTabs(toolId, enabled, tabId);
        }
      }

      // Update tab's active tools
      if (sender.tab?.id) {
        updateTabToolState(sender.tab.id, message.payload as { toolId: ToolId; enabled: boolean });
      }
      return false;

    default:
      return false;
  }
}

/**
 * Handle storage changes (for cross-context sync)
 */
function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>): void {
  if (changes[SYNC_MODE_KEY]) {
    currentMode = changes[SYNC_MODE_KEY].newValue as SyncMode;
    logger.log('[CrossTabSync] Mode changed to:', currentMode);
  }

  if (changes[SYNCED_TABS_KEY]) {
    const newTabs = changes[SYNCED_TABS_KEY].newValue as Record<string, TabState>;
    syncedTabs = new Map(Object.entries(newTabs).map(([k, v]) => [parseInt(k, 10), v]));
  }
}

// ============================================
// Sync Operations
// ============================================

/**
 * Set the sync mode
 */
export async function setSyncMode(mode: SyncMode): Promise<void> {
  currentMode = mode;
  await chrome.storage.local.set({ [SYNC_MODE_KEY]: mode });

  if (mode === 'global') {
    // Enable all globally enabled tools on current tabs
    await syncGlobalStateToAllTabs();
  }

  logger.log('[CrossTabSync] Set mode to:', mode);
}

/**
 * Get current sync mode
 */
export function getSyncMode(): SyncMode {
  return currentMode;
}

/**
 * Sync a tool state to all tabs except the source
 */
async function syncToolStateToAllTabs(
  toolId: ToolId,
  enabled: boolean,
  excludeTabId: number
): Promise<void> {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id && tab.id !== excludeTabId && isValidTab(tab)) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.TOOL_STATE_CHANGED,
          payload: { toolId, enabled, synced: true },
          timestamp: Date.now(),
        } as ExtensionMessage);

        // Update tab's state
        const tabState = syncedTabs.get(tab.id) || {
          tabId: tab.id,
          url: tab.url || '',
          activeTools: [],
          lastUpdated: Date.now(),
        };

        if (enabled) {
          if (!tabState.activeTools.includes(toolId)) {
            tabState.activeTools.push(toolId);
          }
        } else {
          tabState.activeTools = tabState.activeTools.filter((id) => id !== toolId);
        }

        syncedTabs.set(tab.id, tabState);
      } catch {
        // Tab may not have content script, ignore
      }
    }
  }

  await saveSyncedTabs();
}

/**
 * Sync global state to all tabs
 */
async function syncGlobalStateToAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id && isValidTab(tab)) {
      for (const [toolId, enabled] of Object.entries(globalToolStates)) {
        if (enabled) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: MESSAGE_TYPES.TOOL_STATE_CHANGED,
              payload: { toolId, enabled: true, synced: true },
              timestamp: Date.now(),
            } as ExtensionMessage);
          } catch {
            // Ignore errors for tabs without content script
          }
        }
      }
    }
  }
}

/**
 * Update tab's tool state
 */
async function updateTabToolState(
  tabId: number,
  payload: { toolId: ToolId; enabled: boolean }
): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) return;

  let tabState = syncedTabs.get(tabId);
  if (!tabState) {
    tabState = {
      tabId,
      url: tab.url || '',
      activeTools: [],
      lastUpdated: Date.now(),
    };
  }

  if (payload.enabled) {
    if (!tabState.activeTools.includes(payload.toolId)) {
      tabState.activeTools.push(payload.toolId);
    }
  } else {
    tabState.activeTools = tabState.activeTools.filter((id) => id !== payload.toolId);
  }

  tabState.lastUpdated = Date.now();
  syncedTabs.set(tabId, tabState);

  await saveSyncedTabs();

  // Broadcast tab state change for UI updates
  broadcastMessage({
    type: 'TAB_TOOLS_CHANGED',
    payload: { tabId, activeTools: tabState.activeTools },
    timestamp: Date.now(),
  } as ExtensionMessage);
}

/**
 * Save synced tabs to storage
 */
async function saveSyncedTabs(): Promise<void> {
  const obj = Object.fromEntries(syncedTabs.entries());
  await chrome.storage.local.set({ [SYNCED_TABS_KEY]: obj });
}

/**
 * Check if tab is valid for syncing
 */
function isValidTab(tab: chrome.tabs.Tab): boolean {
  return !!tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
}

// ============================================
// Public API
// ============================================

/**
 * Get all synced tabs info
 */
export function getSyncedTabs(): TabState[] {
  return Array.from(syncedTabs.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
}

/**
 * Get active tools for a specific tab
 */
export function getTabActiveTools(tabId: number): ToolId[] {
  return syncedTabs.get(tabId)?.activeTools || [];
}

/**
 * Get global tool states
 */
export function getGlobalToolStates(): Partial<Record<ToolId, boolean>> {
  return { ...globalToolStates };
}

/**
 * Get count of tabs with tools active
 */
export function getActiveTabCount(): number {
  return Array.from(syncedTabs.values()).filter((tab) => tab.activeTools.length > 0).length;
}

/**
 * Get total active tools across all tabs
 */
export function getTotalActiveTools(): number {
  const uniqueTools = new Set<ToolId>();
  for (const tab of syncedTabs.values()) {
    for (const tool of tab.activeTools) {
      uniqueTools.add(tool);
    }
  }
  return uniqueTools.size;
}

/**
 * Clear all synced data
 */
export async function clearSyncedData(): Promise<void> {
  syncedTabs.clear();
  globalToolStates = {};
  await chrome.storage.local.remove([SYNCED_TABS_KEY]);
  logger.log('[CrossTabSync] Cleared all synced data');
}

// ============================================
// Badge Update
// ============================================

/**
 * Update badge to show cross-tab info
 */
export async function updateSyncBadge(tabId?: number): Promise<void> {
  try {
    if (currentMode === 'global') {
      const activeCount = Object.values(globalToolStates).filter(Boolean).length;
      const text = activeCount > 0 ? String(activeCount) : '';
      const color = activeCount > 0 ? '#8B5CF6' : '#6B7280'; // Purple for global mode

      if (tabId) {
        await chrome.action.setBadgeText({ text, tabId });
        await chrome.action.setBadgeBackgroundColor({ color, tabId });
      } else {
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color });
      }

      await chrome.action.setTitle({
        title:
          activeCount > 0
            ? `FrontendDevHelper (${activeCount} global tools active)`
            : 'FrontendDevHelper (Global Mode)',
      });
    }
  } catch (error) {
    logger.error('[CrossTabSync] Failed to update badge:', error);
  }
}

// Default export
export default {
  initializeCrossTabSync,
  setSyncMode,
  getSyncMode,
  getSyncedTabs,
  getTabActiveTools,
  getGlobalToolStates,
  getActiveTabCount,
  getTotalActiveTools,
  clearSyncedData,
  updateSyncBadge,
};
