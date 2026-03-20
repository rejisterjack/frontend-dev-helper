/**
 * DevTools Entry Point
 *
 * Creates the DevTools panel for the extension.
 */

import { logger } from '@/utils/logger';

// Create the DevTools panel
chrome.devtools.panels.create('FrontendDevHelper', 'icons/icon-32.png', 'panel.html', (panel) => {
  logger.info('[FrontendDevHelper] DevTools panel created');

  // Panel shown/hidden events
  panel.onShown.addListener((window) => {
    logger.info('[FrontendDevHelper] Panel shown');
    // Notify the panel it's now visible
    (window as Window).postMessage({ type: 'PANEL_SHOWN', timestamp: Date.now() }, '*');
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
  chrome.devtools.panels.elements.onSelectionChanged.addListener(updateSidebar);

  // Initial update
  updateSidebar();
});
