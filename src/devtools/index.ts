/**
 * DevTools Entry Point
 *
 * Creates the DevTools panel for the extension.
 */

import { MESSAGE_TYPES } from '@/constants';
import { logger } from '@/utils/logger';

let inspectedHintTimer: ReturnType<typeof setTimeout> | null = null;

function sendInspectedElementHint(selector: string): void {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  if (tabId === undefined || !selector) return;
  void chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.FDH_INSPECTED_HINT,
    payload: { tabId, selector },
  });
}

// Create the DevTools panel
chrome.devtools.panels.create('FrontendDevHelper', 'icons/icon-32.png', 'panel.html', (panel) => {
  logger.info('[FrontendDevHelper] DevTools panel created');

  // Panel shown/hidden events
  panel.onShown.addListener((window) => {
    logger.info('[FrontendDevHelper] Panel shown');
    // Notify the panel it's now visible
    // Use extension origin for security instead of wildcard
    const extensionOrigin = chrome.runtime.getURL('');
    (window as Window).postMessage({ type: 'PANEL_SHOWN', timestamp: Date.now() }, extensionOrigin);
  });

  panel.onHidden.addListener(() => {
    logger.info('[FrontendDevHelper] Panel hidden');
  });
});

// Create a sidebar in the Elements panel
chrome.devtools.panels.elements.createSidebarPane('FrontendDevHelper', (sidebar) => {
  logger.info('[FrontendDevHelper] Elements sidebar created');

  // Update sidebar content when selection changes
  const updateSidebar = (): void => {
    sidebar.setExpression(`
        (() => {
          const el = $0;
          if (!el) return { error: 'No element selected' };
          
          const computed = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: Array.from(el.classList),
            dimensions: {
              width: el.offsetWidth,
              height: el.offsetHeight,
            },
            styles: {
              display: computed.display,
              position: computed.position,
              margin: computed.margin,
              padding: computed.padding,
            },
            attributes: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value })),
          };
        })()
      `);
  };

  // Listen for selection changes
  chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
    updateSidebar();
    if (inspectedHintTimer) clearTimeout(inspectedHintTimer);
    inspectedHintTimer = setTimeout(() => {
      inspectedHintTimer = null;
      chrome.devtools.inspectedWindow.eval(
        `(() => { const el = $0; if (!el) return ''; try { if (el.id) return '#' + CSS.escape(el.id); return el.tagName.toLowerCase(); } catch (e) { return ''; } })()`,
        (result, isException) => {
          if (isException || typeof result !== 'string' || !result) return;
          sendInspectedElementHint(result);
        }
      );
    }, 250);
  });

  // Initial update
  updateSidebar();
});
