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

import type { ToolState, ToolsState, ToolType } from '@/types';
import type { ToolId } from '@/constants';
import {
  TOOL_IDS,
  TOOL_METADATA,
  KEYBOARD_SHORTCUTS,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  MESSAGE_TYPES,
} from '@/constants';
import {
  getToolState,
  setToolState,
  getAllToolStates,
  clearAllStates,
  toggleToolState,
  clearTabStates,
  migrateStorage,
  getActiveToolsCount,
} from '@/utils/storage';
import {
  sendMessageToTab,
  sendMessageToAllTabs,
  broadcastMessage,
  createMessage,
  type ExtensionMessage,
  type MessageResponse,
} from '@/utils/messaging';

// ============================================
// Constants
// ============================================

const EXTENSION_VERSION = '1.0.0';
const EXTENSION_NAME = 'FrontendDevHelper';

// Context menu item IDs
const CONTEXT_MENU_ITEMS = {
  INSPECT_ELEMENT: 'fdh-inspect-element',
  MEASURE_DISTANCE: 'fdh-measure-distance',
  PICK_COLOR: 'fdh-pick-color',
  SEPARATOR_1: 'fdh-separator-1',
  TOOLS_PARENT: 'fdh-tools-parent',
  TOGGLE_DOM_OUTLINER: 'fdh-toggle-dom-outliner',
  TOGGLE_SPACING: 'fdh-toggle-spacing',
  TOGGLE_FONT: 'fdh-toggle-font',
  TOGGLE_COLOR_PICKER: 'fdh-toggle-color-picker',
  TOGGLE_RULER: 'fdh-toggle-ruler',
  TOGGLE_BREAKPOINT: 'fdh-toggle-breakpoint',
} as const;

// Command to tool ID mapping
const COMMAND_TO_TOOL_ID: Record<string, ToolId> = {
  toggle_dom_outliner: TOOL_IDS.DOM_OUTLINER,
  toggle_spacing_visualizer: TOOL_IDS.SPACING_VISUALIZER,
  toggle_font_inspector: TOOL_IDS.FONT_INSPECTOR,
  toggle_color_picker: TOOL_IDS.COLOR_PICKER,
  toggle_pixel_ruler: TOOL_IDS.PIXEL_RULER,
  toggle_breakpoint_overlay: TOOL_IDS.RESPONSIVE_BREAKPOINT,
  toggle_inspector: TOOL_IDS.ELEMENT_INSPECTOR,
  take_screenshot: TOOL_IDS.SCREENSHOT_TOOL,
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

// ============================================
// Lifecycle Events
// ============================================

/**
 * Initialize the service worker
 */
async function initialize(): Promise<void> {
  console.log(`[${EXTENSION_NAME}] Service Worker initializing v${EXTENSION_VERSION}`);

  try {
    // Set up lifecycle listeners
    setupInstallListeners();
    setupMessageListeners();
    setupCommandListeners();
    setupTabListeners();
    setupStorageListeners();

    // Initialize context menus
    await initializeContextMenus();

    // Migrate storage if needed
    await migrateStorage();

    // Initialize active tabs tracking
    await initializeActiveTabs();

    // Update badge
    await updateBadge();

    state.initialized = true;
    console.log(`[${EXTENSION_NAME}] Service Worker initialized successfully`);
  } catch (error) {
    console.error(`[${EXTENSION_NAME}] Failed to initialize:`, error);
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
    console.log(`[${EXTENSION_NAME}] Browser startup`);
  });
}

/**
 * Handle extension installation/update
 */
async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  if (details.reason === 'install') {
    console.log(`[${EXTENSION_NAME}] Extension installed`);

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
    console.log(`[${EXTENSION_NAME}] Updated from ${details.previousVersion} to ${EXTENSION_VERSION}`);

    // Handle version-specific migrations
    await handleVersionMigration(details.previousVersion);
  } else if (details.reason === 'chrome_update') {
    console.log(`[${EXTENSION_NAME}] Chrome updated`);
  }
}

/**
 * Handle version-specific migrations
 */
async function handleVersionMigration(previousVersion: string | undefined): Promise<void> {
  // Future migrations go here
  console.log(`[${EXTENSION_NAME}] Migrating from version ${previousVersion}`);
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
    console.log(`[${EXTENSION_NAME}] Default settings initialized`);
  }
}

// ============================================
// Context Menu
// ============================================

/**
 * Initialize context menus
 */
async function initializeContextMenus(): Promise<void> {
  // Remove existing menus
  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

  // Create main context menu items
  const menuItems: chrome.contextMenus.CreateProperties[] = [
    {
      id: CONTEXT_MENU_ITEMS.INSPECT_ELEMENT,
      title: 'Inspect Element with FrontendDevHelper',
      contexts: ['page', 'selection', 'link', 'image', 'video', 'audio'],
    },
    {
      id: CONTEXT_MENU_ITEMS.MEASURE_DISTANCE,
      title: 'Measure Distance',
      contexts: ['page'],
    },
    {
      id: CONTEXT_MENU_ITEMS.PICK_COLOR,
      title: 'Pick Color',
      contexts: ['page', 'image', 'video'],
    },
    {
      id: CONTEXT_MENU_ITEMS.SEPARATOR_1,
      type: 'separator',
      contexts: ['page'],
    },
    {
      id: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
      title: 'FrontendDevHelper Tools',
      contexts: ['page'],
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_DOM_OUTLINER,
      title: 'Toggle DOM Outliner',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_SPACING,
      title: 'Toggle Spacing Visualizer',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_FONT,
      title: 'Toggle Font Inspector',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_COLOR_PICKER,
      title: 'Toggle Color Picker',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_RULER,
      title: 'Toggle Pixel Ruler',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
    {
      id: CONTEXT_MENU_ITEMS.TOGGLE_BREAKPOINT,
      title: 'Toggle Breakpoint Overlay',
      contexts: ['page'],
      parentId: CONTEXT_MENU_ITEMS.TOOLS_PARENT,
    },
  ];

  for (const item of menuItems) {
    chrome.contextMenus.create(item);
  }

  // Set up click handler
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

  console.log(`[${EXTENSION_NAME}] Context menus initialized`);
}

/**
 * Handle context menu clicks
 */
async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  if (!tab?.id) return;

  console.log(`[${EXTENSION_NAME}] Context menu clicked:`, info.menuItemId);

  switch (info.menuItemId) {
    case CONTEXT_MENU_ITEMS.INSPECT_ELEMENT:
      await activateToolOnTab(TOOL_IDS.ELEMENT_INSPECTOR, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.MEASURE_DISTANCE:
      await activateToolOnTab(TOOL_IDS.MEASUREMENT_TOOL, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.PICK_COLOR:
      await activateToolOnTab(TOOL_IDS.COLOR_PICKER, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_DOM_OUTLINER:
      await toggleToolOnTab(TOOL_IDS.DOM_OUTLINER, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_SPACING:
      await toggleToolOnTab(TOOL_IDS.SPACING_VISUALIZER, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_FONT:
      await toggleToolOnTab(TOOL_IDS.FONT_INSPECTOR, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_COLOR_PICKER:
      await toggleToolOnTab(TOOL_IDS.COLOR_PICKER, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_RULER:
      await toggleToolOnTab(TOOL_IDS.PIXEL_RULER, tab.id);
      break;

    case CONTEXT_MENU_ITEMS.TOGGLE_BREAKPOINT:
      await toggleToolOnTab(TOOL_IDS.RESPONSIVE_BREAKPOINT, tab.id);
      break;
  }
}

// ============================================
// Message Handling
// ============================================

/**
 * Set up message listeners
 */
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Return true to indicate async response
    handleMessage(message as ExtensionMessage, sender)
      .then((response) => sendResponse({ success: true, data: response }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true;
  });
}

/**
 * Handle incoming messages
 */
async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const { type, payload } = message;

  console.log(`[${EXTENSION_NAME}] Received message:`, type, 'from tab:', sender.tab?.id);

  switch (type) {
    // Tool management
    case MESSAGE_TYPES.TOGGLE_TOOL:
      return handleToggleTool(payload as { toolId: ToolId; enabled?: boolean; tabId?: number });

    case MESSAGE_TYPES.GET_TOOL_STATE:
      return handleGetToolState(payload as { toolId: ToolId; tabId?: number });

    case MESSAGE_TYPES.SET_TOOL_STATE:
      return handleSetToolState(
        payload as { toolId: ToolId; state: ToolState; tabId?: number }
      );

    case MESSAGE_TYPES.GET_ALL_TOOL_STATES:
      return handleGetAllToolStates(payload as { tabId?: number } | undefined);

    case MESSAGE_TYPES.TOOL_STATE_CHANGED:
      await updateBadge();
      return { acknowledged: true };

    // Feature toggles
    case MESSAGE_TYPES.TOGGLE_FEATURE:
      return handleToggleFeature(
        payload as { feature: string; enabled: boolean },
        sender.tab?.id
      );

    // Settings
    case MESSAGE_TYPES.GET_SETTINGS:
      return handleGetSettings();

    case MESSAGE_TYPES.UPDATE_SETTINGS:
      return handleUpdateSettings(payload);

    // Ping
    case MESSAGE_TYPES.PING:
      return { pong: true, timestamp: Date.now() };

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
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
 * Handle TOGGLE_FEATURE message
 */
async function handleToggleFeature(
  payload: { feature: string; enabled: boolean },
  tabId?: number
): Promise<{ success: boolean }> {
  const { feature, enabled } = payload;

  if (tabId) {
    try {
      await sendMessageToTab(tabId, {
        type: MESSAGE_TYPES.TOGGLE_FEATURE,
        payload: { feature, enabled },
        timestamp: Date.now(),
      } as ExtensionMessage);
    } catch {
      // Tab may not have content script
    }
  }

  return { success: true };
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
  console.log(`[${EXTENSION_NAME}] Command received:`, command);

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
      console.warn(`[${EXTENSION_NAME}] Unknown command:`, command);
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
  console.log(`[${EXTENSION_NAME}] Tab activated:`, tabId);

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
    console.log(`[${EXTENSION_NAME}] Tab loaded:`, tabId, tab.url);

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
    console.log(`[${EXTENSION_NAME}] URL changed:`, tabId, changeInfo.url);

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
  console.log(`[${EXTENSION_NAME}] Tab removed:`, tabId);

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
async function handleStorageChanges(changes: Record<string, chrome.storage.StorageChange>): Promise<void> {
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
    const title = count > 0
      ? `${EXTENSION_NAME} (${count} active tool${count > 1 ? 's' : ''})`
      : EXTENSION_NAME;
    await chrome.action.setTitle({ title, tabId });
  } catch (error) {
    console.error(`[${EXTENSION_NAME}] Failed to update badge:`, error);
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
    console.error(`[${EXTENSION_NAME}] Failed to show notification:`, error);
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
      console.log(`[${EXTENSION_NAME}] Cleaned up old storage:`, keysToRemove);
    }
  } catch (error) {
    console.error(`[${EXTENSION_NAME}] Failed to cleanup storage:`, error);
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
  console.log(`[${EXTENSION_NAME}] Port connected:`, port.name);

  port.onDisconnect.addListener(() => {
    console.log(`[${EXTENSION_NAME}] Port disconnected:`, port.name);
  });
});

// ============================================
// Initialize
// ============================================

// Start initialization
initialize();

// Export for testing
export {
  state,
  handleMessage,
  handleCommand,
  updateBadge,
  activateToolOnTab,
  toggleToolOnTab,
  getActiveToolIds,
};
