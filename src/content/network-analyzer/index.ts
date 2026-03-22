/**
 * Network Analyzer
 *
 * Monitor and analyze all network requests made by the page.
 * Shows waterfall timeline, timing breakdown, resource categorization,
 * and identifies render-blocking resources.
 */

import { logger } from '@/utils/logger';
import {
  clearRequests,
  collectExistingResources,
  disconnectPerformanceObserver,
  getRequests,
  initPerformanceObserver,
  interceptFetch,
  interceptXHR,
  restoreFetch,
  restoreXHR,
  setUpdateCallback,
} from './analyzer';
import type { FilterType, NetworkRequest } from './types';
import {
  createPanel,
  getCurrentFilter,
  getPanel,
  removeDetailPanel,
  setCallbacks,
  setPanel,
  setSearchQuery,
  setFilter as setUIFilter,
  updateUI,
} from './ui';

// Re-export types
export type {
  FilterConfig,
  FilterType,
  NetworkRequest,
  NetworkStats,
  ResourcePattern,
  ResourceTiming,
  ResourceType,
} from './types';

// ============================================
// State
// ============================================

let isActive = false;

// ============================================
// Internal Functions
// ============================================

/**
 * Handle UI update requests
 */
function handleUIUpdate(): void {
  if (!isActive) return;
  updateUI(getRequests());
}

/**
 * Handle disable action from UI
 */
function handleDisable(): void {
  disable();
}

/**
 * Handle clear action from UI
 */
function handleClear(): void {
  clear();
}

/**
 * Handle filter change from UI
 */
function handleFilterChange(type: FilterType): void {
  setUIFilter(type);
  updateUI(getRequests());
}

/**
 * Handle export action from UI
 */
function handleExport(): void {
  exportHAR();
}

// ============================================
// Public API
// ============================================

/**
 * Enable the Network Analyzer
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  // Create panel
  if (!getPanel()) {
    setPanel(createPanel());
  }

  // Set up analyzer update callback
  setUpdateCallback(handleUIUpdate);

  // Set up UI callbacks
  setCallbacks({
    onDisable: handleDisable,
    onClear: handleClear,
    onFilterChange: handleFilterChange,
    onExport: handleExport,
  });

  // Start monitoring
  interceptFetch();
  interceptXHR();
  initPerformanceObserver();

  // Initial UI render
  updateUI(getRequests());

  // Collect existing resources
  collectExistingResources();

  logger.log('[NetworkAnalyzer] Enabled');
}

/**
 * Disable the Network Analyzer
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Hide panel
  const panel = getPanel();
  if (panel) {
    panel.remove();
    setPanel(null);
  }

  // Remove detail panel if open
  removeDetailPanel();

  // Stop monitoring
  restoreFetch();
  restoreXHR();
  disconnectPerformanceObserver();

  logger.log('[NetworkAnalyzer] Disabled');
}

/**
 * Toggle the Network Analyzer on/off
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): {
  enabled: boolean;
  requestCount: number;
  filter: FilterType;
} {
  return {
    enabled: isActive,
    requestCount: getRequests().length,
    filter: getCurrentFilter(),
  };
}

/**
 * Get all captured requests
 */
export function getCapturedRequests(): NetworkRequest[] {
  return getRequests();
}

/**
 * Clear all captured requests
 */
export function clear(): void {
  clearRequests();
  updateUI(getRequests());
}

/**
 * Set filter type
 */
export function setFilter(type: FilterType): void {
  setUIFilter(type);
  setSearchQuery('');
  updateUI(getRequests());
}

/**
 * Cleanup and destroy
 */
export function destroy(): void {
  disable();
  clearRequests();
}

/**
 * Export requests as HAR file
 */
export function exportHAR(): void {
  const requests = getRequests();
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'FrontendDevHelper Network Analyzer',
        version: '1.0.0',
      },
      pages: [
        {
          startedDateTime: new Date(navigation?.startTime || Date.now()).toISOString(),
          id: 'page_1',
          title: document.title,
          pageTimings: {
            onContentLoad: navigation?.domContentLoadedEventEnd || 0,
            onLoad: navigation?.loadEventEnd || 0,
          },
        },
      ],
      entries: requests.map((req) => ({
        pageref: 'page_1',
        startedDateTime: new Date(performance.timeOrigin + req.startTime).toISOString(),
        time: req.duration,
        request: {
          method: req.method,
          url: req.url,
          httpVersion: 'HTTP/1.1',
          headers: [],
          queryString: [],
          cookies: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: {
          status: req.status,
          statusText: req.statusText,
          httpVersion: 'HTTP/1.1',
          headers: [],
          cookies: [],
          content: {
            size: req.size,
            mimeType: '',
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: req.size,
        },
        cache: {},
        timings: req.timing
          ? {
              blocked: -1,
              dns: req.timing.dns,
              connect: req.timing.connect,
              ssl: req.timing.tls,
              send: 0,
              wait: req.timing.ttfb,
              receive: req.timing.download,
            }
          : {},
      })),
    },
  };

  const blob = new Blob([JSON.stringify(har, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `network-log-${new Date().toISOString().replace(/[:.]/g, '-')}.har`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export singleton API
export const networkAnalyzer = {
  enable,
  disable,
  toggle,
  getState,
  getRequests: getCapturedRequests,
  clear,
  setFilter,
  destroy,
  exportHAR,
};

export default networkAnalyzer;
