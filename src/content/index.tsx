/**
 * Content Script
 *
 * Injected into web pages to provide inspection capabilities,
 * DOM manipulation, and communication with the background script.
 */

import type { ExtensionSettings } from '@/types';
import { FeatureManager } from './feature-manager';
import { ElementInspector } from './inspector';
import { MessageHandler } from './message-handler';
import { createRootContainer } from './ui-container';
import './content.css';

// Prevent double initialization
if (window.__FRONTEND_DEV_HELPER__?.initialized) {
  console.log('[FrontendDevHelper] Already initialized');
} else {
  init();
}

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
  console.log('[FrontendDevHelper] Content script initializing');

  // Mark as initialized
  window.__FRONTEND_DEV_HELPER__ = {
    version: '0.1.0',
    initialized: true,
  };

  // Create UI container
  const container = createRootContainer();

  // Initialize managers
  const featureManager = new FeatureManager();
  const elementInspector = new ElementInspector(container);
  const messageHandler = new MessageHandler({
    featureManager,
    elementInspector,
  });

  // Load settings
  const settings = await loadSettings();
  window.__FRONTEND_DEV_HELPER__.settings = settings;

  // Initialize features based on settings
  if (settings.enabled) {
    await featureManager.initialize();
  }

  // Set up message handling
  messageHandler.initialize();

  // Set up keyboard shortcuts
  setupKeyboardShortcuts(featureManager);

  console.log('[FrontendDevHelper] Content script initialized');
}

/**
 * Load extension settings
 */
async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    });

    return (
      response.data ?? {
        enabled: true,
        theme: 'dark',
        autoOpenDevTools: false,
        experimentalFeatures: false,
        lastActiveTab: 'inspector',
        shortcuts: {},
      }
    );
  } catch (error) {
    console.error('[FrontendDevHelper] Failed to load settings:', error);
    return {
      enabled: true,
      theme: 'dark',
      autoOpenDevTools: false,
      experimentalFeatures: false,
      lastActiveTab: 'inspector',
      shortcuts: {},
    };
  }
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts(featureManager: FeatureManager): void {
  document.addEventListener('keydown', (event) => {
    // Escape to disable all features
    if (event.key === 'Escape') {
      featureManager.disableAll();
      return;
    }

    // Alt+Shift+I for inspector
    if (event.altKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      featureManager.toggleFeature('elementInspector');
    }

    // Alt+Shift+C for color picker
    if (event.altKey && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      featureManager.toggleFeature('colorPicker');
    }
  });
}
