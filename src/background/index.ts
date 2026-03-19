/**
 * Background Service Worker for FrontendDevHelper
 * 
 * This script runs in the background and handles:
 * - Extension lifecycle events
 * - Message passing between content scripts and popup
 * - Storage management
 * - Context menu creation
 * - Keyboard shortcuts
 */

import { MessageType, type MessagePayload } from '../types/messages';

// ============================================
// Extension Installation & Update
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[FrontendDevHelper] Extension installed/updated:', details.reason);

  // Set default settings on first install
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      settings: {
        darkMode: false,
        showGridLines: false,
        autoInspect: false,
        colorFormat: 'hex',
        gridSize: 20,
        shortcuts: {
          toggleInspector: 'Ctrl+Shift+I',
          openPopup: 'Ctrl+Shift+F',
        },
      },
    });

    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'FrontendDevHelper Installed!',
      message: 'Click the extension icon or press Ctrl+Shift+F to get started.',
    });
  }

  // Create context menu items
  createContextMenus();
});

// ============================================
// Context Menu
// ============================================

function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    // Main parent menu
    chrome.contextMenus.create({
      id: 'fdh-root',
      title: 'FrontendDevHelper',
      contexts: ['all'],
    });

    // Child menu items
    chrome.contextMenus.create({
      id: 'fdh-inspect',
      parentId: 'fdh-root',
      title: '🔍 Inspect Element',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-color',
      parentId: 'fdh-root',
      title: '🎨 Pick Color',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-measure',
      parentId: 'fdh-root',
      title: '📏 Measure Distance',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-separator-1',
      parentId: 'fdh-root',
      type: 'separator',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-copy-css',
      parentId: 'fdh-root',
      title: '📋 Copy Computed CSS',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-copy-html',
      parentId: 'fdh-root',
      title: '📋 Copy HTML',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-separator-2',
      parentId: 'fdh-root',
      type: 'separator',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-grid',
      parentId: 'fdh-root',
      title: '⊞ Toggle Grid Overlay',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'fdh-settings',
      parentId: 'fdh-root',
      title: '⚙️ Settings',
      contexts: ['all'],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const menuActions: Record<string, MessageType> = {
    'fdh-inspect': MessageType.TOGGLE_INSPECTOR,
    'fdh-color': MessageType.PICK_COLOR,
    'fdh-measure': MessageType.MEASURE_DISTANCE,
    'fdh-copy-css': MessageType.COPY_CSS,
    'fdh-copy-html': MessageType.COPY_HTML,
    'fdh-grid': MessageType.TOGGLE_GRID,
  };

  const messageType = menuActions[info.menuItemId as string];
  
  if (messageType) {
    sendMessageToTab(tab.id, { type: messageType });
  } else if (info.menuItemId === 'fdh-settings') {
    chrome.runtime.openOptionsPage?.() || chrome.tabs.create({
      url: chrome.runtime.getURL('index.html'),
    });
  }
});

// ============================================
// Keyboard Shortcuts
// ============================================

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab?.id) return;
  
  console.log('[Background] Command received:', command);
  
  const commandMap: Record<string, string> = {
    'toggle-pesticide': 'PESTICIDE_TOGGLE',
    'toggle-spacing': 'SPACING_TOGGLE',
    'toggle-font-inspector': 'FONT_INSPECTOR_TOGGLE',
    'toggle-color-picker': 'COLOR_PICKER_TOGGLE',
    'toggle-pixel-ruler': 'PIXEL_RULER_TOGGLE',
    'toggle-breakpoint': 'BREAKPOINT_OVERLAY_TOGGLE',
  };
  
  const messageType = commandMap[command];
  if (messageType) {
    chrome.tabs.sendMessage(tab.id, { type: messageType }).catch((err) => {
      console.error('[Background] Failed to send command:', err);
    });
  }
});

// ============================================
// Message Handling
// ============================================

chrome.runtime.onMessage.addListener((
  message: MessagePayload,
  sender,
  sendResponse
) => {
  console.log('[Background] Received message:', message, 'from:', sender);

  (async () => {
    try {
      switch (message.type) {
        case MessageType.GET_TAB_INFO:
          if (sender.tab?.id) {
            const tab = await chrome.tabs.get(sender.tab.id);
            sendResponse({ success: true, data: tab });
          } else {
            sendResponse({ success: false, error: 'No tab info available' });
          }
          break;

        case MessageType.GET_SETTINGS:
          const settings = await chrome.storage.sync.get('settings');
          sendResponse({ success: true, data: settings.settings });
          break;

        case MessageType.SET_SETTINGS:
          if (message.payload) {
            await chrome.storage.sync.set({ settings: message.payload });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No settings provided' });
          }
          break;

        case MessageType.COPY_TO_CLIPBOARD:
          if (message.payload?.text) {
            await chrome.offscreen?.createDocument?.({
              url: 'offscreen.html',
              reasons: ['CLIPBOARD'],
              justification: 'Write text to clipboard',
            }).catch(() => {});
            
            sendResponse({ success: true });
          }
          break;

        case MessageType.INJECT_CONTENT_SCRIPT:
          if (message.payload?.tabId) {
            await injectContentScript(message.payload.tabId);
            sendResponse({ success: true });
          }
          break;

        case MessageType.CAPTURE_SCREENSHOT:
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
              format: 'png',
            });
            sendResponse({ success: true, data: dataUrl });
          } catch (error) {
            sendResponse({ 
              success: false, 
              error: (error as Error).message 
            });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Background] Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// ============================================
// Keyboard Shortcuts
// ============================================

chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log('[Background] Command received:', command);

  if (!tab?.id) return;

  switch (command) {
    case 'toggle-inspector':
      await sendMessageToTab(tab.id, { type: MessageType.TOGGLE_INSPECTOR });
      break;

    case '_execute_action':
      // This is handled automatically by Chrome
      break;
  }
});

// ============================================
// Tab Events
// ============================================

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  // Notify popup about tab change
  chrome.runtime.sendMessage({
    type: MessageType.TAB_CHANGED,
    payload: { tabId },
  }).catch(() => {
    // Popup might not be open, ignore error
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    // Content script will auto-inject via manifest, but we can do additional setup here
    console.log('[Background] Tab updated:', tabId, tab.url);
  }
});

// ============================================
// Helper Functions
// ============================================

async function sendMessageToTab(
  tabId: number, 
  message: MessagePayload
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Content script might not be loaded, try to inject it
    await injectContentScript(tabId);
    // Retry sending message
    await chrome.tabs.sendMessage(tabId, message);
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/index.ts'],
    });
    console.log('[Background] Content script injected into tab:', tabId);
  } catch (error) {
    console.error('[Background] Failed to inject content script:', error);
    throw error;
  }
}

// ============================================
// Icon Badge Updates
// ============================================

export function updateBadge(text: string, color?: string): void {
  chrome.action.setBadgeText({ text });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

// Keep service worker alive for long-running operations
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20000);
keepAlive();

console.log('[FrontendDevHelper] Background service worker initialized');
