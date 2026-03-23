/**
 * FrontendDevHelper - Service Worker
 *
 * Main background script handling:
 * - Extension lifecycle (install, activate, update)
 * - Tool activation/deactivation
 * - State persistence and tab-specific state management
 * - Context menu management
 * - Keyboard shortcuts
 * - Badge updates
 */

import type { ToolId } from '@/constants';
import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  TOOL_IDS,
  TOOL_METADATA,
} from '@/constants';
import type { LLMConfig, LLMPageContext, ToolState, ToolsState } from '@/types';
import {
  broadcastMessage,
  type ExtensionMessage,
  sendMessageToAllTabs,
  sendMessageToTab,
} from '@/utils/messaging';
import {
  clearTabStates,
  getActiveToolsCount,
  getAllToolStates,
  getToolState,
  migrateStorage,
  setToolState,
  toggleToolState,
} from '@/utils/storage';
import { logger } from '../utils/logger';
import { ContextMenuManager } from './context-menu';
import { llmService } from './llm-service';
import { MessageRouter } from './message-router';

// ============================================
// Constants
// ============================================

const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const EXTENSION_NAME = 'FrontendDevHelper';

// Context menu manager instance
let contextMenuManager: ContextMenuManager | null = null;

// Command to tool ID mapping (matches generated manifest.json command names)
const COMMAND_TO_TOOL_ID: Record<string, ToolId> = {
  'toggle-pesticide': TOOL_IDS.DOM_OUTLINER,
  'toggle-spacing': TOOL_IDS.SPACING_VISUALIZER,
  'toggle-font-inspector': TOOL_IDS.FONT_INSPECTOR,
  'toggle-color-picker': TOOL_IDS.COLOR_PICKER,
  'toggle-pixel-ruler': TOOL_IDS.PIXEL_RULER,
  'toggle-breakpoint': TOOL_IDS.RESPONSIVE_BREAKPOINT,
  'toggle-inspector': TOOL_IDS.ELEMENT_INSPECTOR,
  'open-command-palette': TOOL_IDS.COMMAND_PALETTE,
};

// ============================================
// State Management
// ============================================

/**
 * Service Worker State
 */
interface ServiceWorkerState {
  /** Currently active tab IDs */
  activeTabs: Set<number>;
  /** Last known active tools count */
  activeToolsCount: number;
  /** Whether initialization is complete */
  initialized: boolean;
}

const state: ServiceWorkerState = {
  activeTabs: new Set(),
  activeToolsCount: 0,
  initialized: false,
};

// Initialize message router and context menu manager
const messageRouter = new MessageRouter();
contextMenuManager = new ContextMenuManager();

// ============================================
// Lifecycle Events
// ============================================

/**
 * Initialize the service worker
 */
async function initialize(): Promise<void> {
  logger.log(`[${EXTENSION_NAME}] Service Worker initializing v${EXTENSION_VERSION}`);

  try {
    // Register tool message handlers with the router
    registerMessageHandlers();

    // Set up lifecycle listeners
    setupInstallListeners();
    setupMessageListeners();
    setupCommandListeners();
    setupTabListeners();
    setupStorageListeners();

    // Initialize context menus
    contextMenuManager?.initialize();

    // Initialize LLM service
    await llmService.loadConfig();

    // Migrate storage if needed
    await migrateStorage();

    // Initialize active tabs tracking
    await initializeActiveTabs();

    // Update badge
    await updateBadge();

    state.initialized = true;
    logger.log(`[${EXTENSION_NAME}] Service Worker initialized successfully`);
  } catch (error) {
    logger.error(`[${EXTENSION_NAME}] Failed to initialize:`, error);
  }
}

/**
 * Set up install/update listeners
 */
function setupInstallListeners(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    handleInstalled(details);
  });

  chrome.runtime.onStartup.addListener(() => {
    logger.log(`[${EXTENSION_NAME}] Browser startup`);
  });
}

/**
 * Handle extension installation/update
 */
async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  if (details.reason === 'install') {
    logger.log(`[${EXTENSION_NAME}] Extension installed`);

    // Initialize default settings
    await initializeDefaultSettings();

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html#/welcome'),
    });

    // Show notification
    await showNotification(
      'FrontendDevHelper Installed',
      'Click the extension icon to start debugging!'
    );
  } else if (details.reason === 'update') {
    logger.log(
      `[${EXTENSION_NAME}] Updated from ${details.previousVersion} to ${EXTENSION_VERSION}`
    );

    // Handle version-specific migrations
    await handleVersionMigration(details.previousVersion);
  } else if (details.reason === 'chrome_update') {
    logger.log(`[${EXTENSION_NAME}] Chrome updated`);
  }
}

/**
 * Handle version-specific migrations
 */
async function handleVersionMigration(previousVersion: string | undefined): Promise<void> {
  // Future migrations go here
  logger.log(`[${EXTENSION_NAME}] Migrating from version ${previousVersion}`);
}

/**
 * Initialize default settings
 */
async function initializeDefaultSettings(): Promise<void> {
  const existing = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);

  if (!existing[STORAGE_KEYS.SETTINGS]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    });
    logger.log(`[${EXTENSION_NAME}] Default settings initialized`);
  }
}

// ============================================
// Message Handling
// ============================================

/**
 * Register message handlers with the router
 */
function registerMessageHandlers(): void {
  // Tool management handlers
  messageRouter.registerHandler(MESSAGE_TYPES.TOGGLE_TOOL, async (message) => {
    const { payload } = message;
    return handleToggleTool(payload as { toolId: ToolId; enabled?: boolean; tabId?: number });
  });

  messageRouter.registerHandler(MESSAGE_TYPES.GET_TOOL_STATE, async (message) => {
    const { payload } = message;
    return handleGetToolState(payload as { toolId: ToolId; tabId?: number });
  });

  messageRouter.registerHandler(MESSAGE_TYPES.SET_TOOL_STATE, async (message) => {
    const { payload } = message;
    return handleSetToolState(payload as { toolId: ToolId; state: ToolState; tabId?: number });
  });

  messageRouter.registerHandler(MESSAGE_TYPES.GET_ALL_TOOL_STATES, async (message) => {
    const { payload } = message;
    return handleGetAllToolStates(payload as { tabId?: number } | undefined);
  });

  messageRouter.registerHandler(MESSAGE_TYPES.TOOL_STATE_CHANGED, async () => {
    await updateBadge();
    return { acknowledged: true };
  });

  // Feature toggle handler (overrides default to support tab-specific routing)
  messageRouter.registerHandler(MESSAGE_TYPES.TOGGLE_FEATURE, async (message) => {
    const { payload } = message;
    const { feature, enabled } = payload as { feature: string; enabled: boolean };
    // Note: tabId would come from sender in a real scenario
    // For now, we broadcast to all tabs like the default handler
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await sendMessageToTab(tab.id, {
            type: MESSAGE_TYPES.TOGGLE_FEATURE,
            payload: { feature, enabled },
            timestamp: Date.now(),
          } as ExtensionMessage);
        } catch {
          // Tab may not have content script
        }
      }
    }
    return { success: true };
  });

  // Settings handlers (these override the default handlers in MessageRouter)
  messageRouter.registerHandler(MESSAGE_TYPES.GET_SETTINGS, async () => {
    return handleGetSettings();
  });

  messageRouter.registerHandler(MESSAGE_TYPES.UPDATE_SETTINGS, async (message) => {
    const { payload } = message;
    return handleUpdateSettings(payload);
  });

  // LLM service handlers
  messageRouter.registerHandler('LLM_GET_CONFIG', async () => {
    return { config: llmService.getConfig() };
  });

  messageRouter.registerHandler('LLM_UPDATE_CONFIG', async (message) => {
    const { payload } = message;
    await llmService.saveConfig(payload as Partial<LLMConfig>);
    return { success: true };
  });

  messageRouter.registerHandler('LLM_ANALYZE_PAGE', async (message) => {
    const { payload } = message;
    const suggestions = await llmService.analyzePage(payload as LLMPageContext);
    return { suggestions };
  });

  logger.log('[ServiceWorker] Message handlers registered');
}

/**
 * Set up message listeners - delegates to the message router
 */
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return messageRouter.handleMessage(message as ExtensionMessage, sender, sendResponse);
  });
}

/**
 * Handle TOGGLE_TOOL message
 */
async function handleToggleTool(payload: {
  toolId: ToolId;
  enabled?: boolean;
  tabId?: number;
}): Promise<{ toolId: ToolId; enabled: boolean }> {
  const { toolId, enabled, tabId } = payload;

  let newEnabled: boolean;
  if (enabled !== undefined) {
    await setToolState(toolId, { enabled, settings: {} }, tabId);
    newEnabled = enabled;
  } else {
    newEnabled = await toggleToolState(toolId, tabId);
  }

  // Broadcast to content scripts
  await broadcastToolStateChange(toolId, newEnabled, tabId);
  await updateBadge();

  return { toolId, enabled: newEnabled };
}

/**
 * Handle GET_TOOL_STATE message
 */
async function handleGetToolState(payload: {
  toolId: ToolId;
  tabId?: number;
}): Promise<ToolState | null> {
  return getToolState(payload.toolId, payload.tabId);
}

/**
 * Handle SET_TOOL_STATE message
 */
async function handleSetToolState(payload: {
  toolId: ToolId;
  state: ToolState;
  tabId?: number;
}): Promise<{ success: boolean }> {
  await setToolState(payload.toolId, payload.state, payload.tabId);
  await broadcastToolStateChange(payload.toolId, payload.state.enabled, payload.tabId);
  await updateBadge();
  return { success: true };
}

/**
 * Handle GET_ALL_TOOL_STATES message
 */
async function handleGetAllToolStates(payload?: { tabId?: number }): Promise<ToolsState> {
  return getAllToolStates(payload?.tabId);
}

/**
 * Handle GET_SETTINGS message
 */
async function handleGetSettings(): Promise<typeof DEFAULT_SETTINGS> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] ?? DEFAULT_SETTINGS;
}

/**
 * Handle UPDATE_SETTINGS message
 */
async function handleUpdateSettings(payload: unknown): Promise<{ success: boolean }> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: payload,
  });
  return { success: true };
}

// ============================================
// Keyboard Shortcuts
// ============================================

/**
 * Set up command (keyboard shortcut) listeners
 */
function setupCommandListeners(): void {
  chrome.commands.onCommand.addListener((command, tab) => {
    handleCommand(command, tab);
  });
}

/**
 * Handle keyboard shortcut commands
 */
async function handleCommand(command: string, tab?: chrome.tabs.Tab): Promise<void> {
  logger.log(`[${EXTENSION_NAME}] Command received:`, command);

  // Check if it's a tool toggle command
  const toolId = COMMAND_TO_TOOL_ID[command];
  if (toolId && tab?.id) {
    await toggleToolOnTab(toolId, tab.id);
    return;
  }

  // Handle other commands
  switch (command) {
    case '_execute_action':
      // Default action - opens popup, no handling needed
      break;

    default:
      logger.warn(`[${EXTENSION_NAME}] Unknown command:`, command);
  }
}

// ============================================
// Tab Management
// ============================================

/**
 * Set up tab event listeners
 */
function setupTabListeners(): void {
  chrome.tabs.onActivated.addListener((activeInfo) => {
    handleTabActivated(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    handleTabUpdated(tabId, changeInfo, tab);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    handleTabRemoved(tabId);
  });
}

/**
 * Initialize tracking of active tabs
 */
async function initializeActiveTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (tab.id) {
      state.activeTabs.add(tab.id);
    }
  });
}

/**
 * Handle tab activation
 */
async function handleTabActivated(tabId: number): Promise<void> {
  logger.log(`[${EXTENSION_NAME}] Tab activated:`, tabId);

  // Update badge for the new active tab
  await updateBadge(tabId);

  // Notify content script
  try {
    await sendMessageToTab(tabId, {
      type: MESSAGE_TYPES.TAB_CHANGED,
      payload: { active: true, tabId },
      timestamp: Date.now(),
    } as ExtensionMessage);
  } catch {
    // Tab may not have content script
  }
}

/**
 * Handle tab updates
 */
async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
): Promise<void> {
  if (changeInfo.status === 'complete' && tab.url) {
    logger.log(`[${EXTENSION_NAME}] Tab loaded:`, tabId, tab.url);

    // Add to active tabs
    state.activeTabs.add(tabId);

    // Notify content script
    try {
      await sendMessageToTab(tabId, {
        type: MESSAGE_TYPES.INIT,
        payload: { url: tab.url },
        timestamp: Date.now(),
      } as ExtensionMessage);
    } catch {
      // Content script may not be injected
    }
  }

  if (changeInfo.url) {
    logger.log(`[${EXTENSION_NAME}] URL changed:`, tabId, changeInfo.url);

    // Clear tab-specific states when URL changes
    await clearTabStates(tabId);

    // Notify of URL change
    try {
      await sendMessageToTab(tabId, {
        type: MESSAGE_TYPES.URL_CHANGED,
        payload: { url: changeInfo.url, tabId },
        timestamp: Date.now(),
      } as ExtensionMessage);
    } catch {
      // Content script may not be available
    }
  }
}

/**
 * Handle tab removal
 */
async function handleTabRemoved(tabId: number): Promise<void> {
  logger.log(`[${EXTENSION_NAME}] Tab removed:`, tabId);

  state.activeTabs.delete(tabId);

  // Clean up tab-specific states
  await clearTabStates(tabId);
}

// ============================================
// Storage Listeners
// ============================================

/**
 * Set up storage change listeners
 */
function setupStorageListeners(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      handleStorageChanges(changes);
    }
  });
}

/**
 * Handle storage changes
 */
async function handleStorageChanges(
  changes: Record<string, chrome.storage.StorageChange>
): Promise<void> {
  // Update badge if tool states changed
  if (changes[STORAGE_KEYS.TOOL_STATES]) {
    await updateBadge();
  }
}

// ============================================
// Tool Management Helpers
// ============================================

/**
 * Activate a tool on a specific tab
 */
async function activateToolOnTab(toolId: ToolId, tabId: number): Promise<void> {
  await setToolState(toolId, { enabled: true, settings: {} }, tabId);
  await broadcastToolStateChange(toolId, true, tabId);
  await updateBadge(tabId);

  // Show notification
  const meta = TOOL_METADATA[toolId];
  if (meta) {
    await showNotification(
      `${meta.name} Activated`,
      `The ${meta.name} tool is now active on this tab.`
    );
  }
}

/**
 * Toggle a tool on a specific tab
 */
async function toggleToolOnTab(toolId: ToolId, tabId: number): Promise<boolean> {
  const newState = await toggleToolState(toolId, tabId);
  await broadcastToolStateChange(toolId, newState, tabId);
  await updateBadge(tabId);
  return newState;
}

/**
 * Broadcast tool state change to content scripts
 */
async function broadcastToolStateChange(
  toolId: ToolId,
  enabled: boolean,
  tabId?: number
): Promise<void> {
  const message = {
    type: MESSAGE_TYPES.TOOL_STATE_CHANGED,
    payload: { toolId, enabled },
    timestamp: Date.now(),
  } as ExtensionMessage;

  if (tabId) {
    // Send to specific tab
    try {
      await sendMessageToTab(tabId, message);
    } catch {
      // Tab may not have content script
    }
  } else {
    // Broadcast to all tabs
    await sendMessageToAllTabs(message, (tab) => {
      // Only send to http/https URLs
      return !!tab.url?.match(/^https?:\/\//);
    });
  }

  // Also broadcast to popup and other extension contexts
  await broadcastMessage(message);
}

// ============================================
// Badge Management
// ============================================

/**
 * Update the extension badge
 */
async function updateBadge(tabId?: number): Promise<void> {
  try {
    const count = await getActiveToolsCount(tabId);
    state.activeToolsCount = count;

    // Get the active tab if not provided
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    if (!tabId) return;

    // Update badge text
    const badgeText = count > 0 ? String(count) : '';
    await chrome.action.setBadgeText({ text: badgeText, tabId });

    // Update badge color based on count
    const badgeColor = count > 0 ? '#10B981' : '#6B7280'; // Green or gray
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    // Update badge title (tooltip)
    const title =
      count > 0
        ? `${EXTENSION_NAME} (${count} active tool${count > 1 ? 's' : ''})`
        : EXTENSION_NAME;
    await chrome.action.setTitle({ title, tabId });
  } catch (error) {
    logger.error(`[${EXTENSION_NAME}] Failed to update badge:`, error);
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Show a notification
 */
async function showNotification(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title,
      message,
    });
  } catch (error) {
    logger.error(`[${EXTENSION_NAME}] Failed to show notification:`, error);
  }
}

/**
 * Get the active tool IDs for a tab
 */
async function getActiveToolIds(tabId?: number): Promise<ToolId[]> {
  const states = await getAllToolStates(tabId);
  return Object.entries(states)
    .filter(([, state]) => state?.enabled)
    .map(([toolId]) => toolId as ToolId);
}

// ============================================
// Cleanup on Activate
// ============================================

/**
 * Clean up old storage on activation
 * This runs when the service worker is activated (browser startup or update)
 */
async function cleanupOldStorage(): Promise<void> {
  try {
    // Get all storage keys
    const allData = await chrome.storage.local.get(null);
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    const keysToRemove: string[] = [];

    for (const [key, value] of Object.entries(allData)) {
      // Clean up old session data
      if (key === STORAGE_KEYS.SESSION_DATA && value?.timestamp) {
        if (now - value.timestamp > ONE_WEEK) {
          keysToRemove.push(key);
        }
      }

      // Clean up orphaned tab states
      if (key === STORAGE_KEYS.TOOL_STATES && value?.tabs) {
        const activeTabIds = Array.from(state.activeTabs);
        const tabStates = value.tabs as Record<number, unknown>;

        for (const tabId of Object.keys(tabStates)) {
          const id = parseInt(tabId, 10);
          if (!activeTabIds.includes(id)) {
            delete tabStates[id];
          }
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.TOOL_STATES]: value });
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      logger.log(`[${EXTENSION_NAME}] Cleaned up old storage:`, keysToRemove);
    }
  } catch (error) {
    logger.error(`[${EXTENSION_NAME}] Failed to cleanup storage:`, error);
  }
}

// Run cleanup on activation
chrome.runtime.onInstalled.addListener(() => {
  cleanupOldStorage();
});

// ============================================
// Keep Alive
// ============================================

/**
 * Keep the service worker alive
 */
chrome.runtime.onConnect.addListener((port) => {
  logger.log(`[${EXTENSION_NAME}] Port connected:`, port.name);

  port.onDisconnect.addListener(() => {
    logger.log(`[${EXTENSION_NAME}] Port disconnected:`, port.name);
  });
});

// ============================================
// Initialize
// ============================================

// Start initialization
initialize();

// Export for testing
export { activateToolOnTab, getActiveToolIds, handleCommand, state, toggleToolOnTab, updateBadge };
