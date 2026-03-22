/**
 * Network Analyzer - Core Logic
 *
 * Network analysis, request interception, and performance monitoring.
 */

import { RESOURCE_PATTERNS } from './constants';
import type { NetworkRequest, ResourceTiming, ResourceType } from './types';

// State
let requests: NetworkRequest[] = [];
let performanceObserver: PerformanceObserver | null = null;
let originalFetch: typeof fetch | null = null;
let originalXHR: typeof XMLHttpRequest | null = null;
let originalSend: typeof XMLHttpRequest.prototype.send | null = null;
let originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
const requestStartTimes: Map<string, number> = new Map();

// Callback for UI updates
let onRequestUpdate: (() => void) | null = null;

/**
 * Set the callback for request updates
 */
export function setUpdateCallback(callback: () => void): void {
  onRequestUpdate = callback;
}

/**
 * Get all captured requests
 */
export function getRequests(): NetworkRequest[] {
  return [...requests];
}

/**
 * Clear all captured requests
 */
export function clearRequests(): void {
  requests = [];
}

/**
 * Notify UI of updates
 */
function notifyUpdate(): void {
  if (onRequestUpdate) {
    onRequestUpdate();
  }
}

/**
 * Detect resource type from URL and content type
 */
export function detectResourceType(url: string, contentType?: string): ResourceType {
  const urlToCheck = contentType ? `${url} ${contentType}` : url;

  for (const { type, patterns } of RESOURCE_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(urlToCheck))) {
      return type;
    }
  }

  return 'other';
}

/**
 * Check if a resource is render-blocking
 */
export function isRenderBlocking(url: string, type: ResourceType): boolean {
  if (type === 'stylesheet') return true;
  if (type === 'script') {
    // Check if it's in the head without async/defer
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (src && url.includes(src)) {
        return (
          !script.hasAttribute('async') &&
          !script.hasAttribute('defer') &&
          !script.hasAttribute('type')
        );
      }
    }
  }
  return false;
}

/**
 * Get file name from URL
 */
export function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    return fileName || urlObj.hostname;
  } catch {
    return url.substring(url.lastIndexOf('/') + 1) || url;
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract timing data from performance entry
 */
export function extractTiming(entry: PerformanceResourceTiming): ResourceTiming {
  return {
    dns: Math.max(0, entry.domainLookupEnd - entry.domainLookupStart),
    connect: Math.max(0, entry.connectEnd - entry.connectStart),
    tls: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
    ttfb: Math.max(0, entry.responseStart - entry.requestStart),
    download: Math.max(0, entry.responseEnd - entry.responseStart),
    total: entry.duration,
  };
}

// ============================================
// Request Interception
// ============================================

/**
 * Intercept fetch requests
 */
export function interceptFetch(): void {
  if (originalFetch) return;

  originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    const id = generateRequestId();
    const startTime = performance.now();

    requestStartTimes.set(id, startTime);

    try {
      const response = await originalFetch!.call(this, input, init);
      const endTime = performance.now();

      const request: NetworkRequest = {
        id,
        url,
        name: getFileName(url),
        type: detectResourceType(url, response.headers.get('content-type') || undefined),
        method,
        status: response.status,
        statusText: response.statusText,
        size: 0,
        transferSize: 0,
        startTime,
        endTime,
        duration: endTime - startTime,
        timing: null,
        initiator: 'fetch',
        renderBlocking: false,
      };

      requests.push(request);
      notifyUpdate();

      return response;
    } catch (error) {
      const endTime = performance.now();

      const request: NetworkRequest = {
        id,
        url,
        name: getFileName(url),
        type: 'api',
        method,
        status: 0,
        statusText: 'Failed',
        size: 0,
        transferSize: 0,
        startTime,
        endTime,
        duration: endTime - startTime,
        timing: null,
        initiator: 'fetch',
        renderBlocking: false,
      };

      requests.push(request);
      notifyUpdate();
      throw error;
    }
  };
}

/**
 * Intercept XMLHttpRequest
 */
export function interceptXHR(): void {
  if (originalXHR) return;

  originalXHR = window.XMLHttpRequest;
  originalOpen = XMLHttpRequest.prototype.open;
  originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    (this as XMLHttpRequest & { _fdhMethod?: string; _fdhUrl?: string })._fdhMethod = method;
    (this as XMLHttpRequest & { _fdhMethod?: string; _fdhUrl?: string })._fdhUrl = String(url);
    originalOpen!.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const xhr = this as XMLHttpRequest & {
      _fdhMethod?: string;
      _fdhUrl?: string;
      _fdhId?: string;
      _fdhStartTime?: number;
    };
    const id = generateRequestId();
    const startTime = performance.now();

    xhr._fdhId = id;
    xhr._fdhStartTime = startTime;
    requestStartTimes.set(id, startTime);

    const originalOnLoad = xhr.onload;
    const originalOnError = xhr.onerror;

    xhr.onload = function (this: XMLHttpRequest, ev: ProgressEvent) {
      const endTime = performance.now();
      const contentType = xhr.getResponseHeader('Content-Type') || '';
      const url = xhr._fdhUrl || xhr.responseURL;

      const request: NetworkRequest = {
        id,
        url,
        name: getFileName(url),
        type: detectResourceType(url, contentType),
        method: xhr._fdhMethod || 'GET',
        status: xhr.status,
        statusText: xhr.statusText,
        size: xhr.response?.toString().length || 0,
        transferSize: 0,
        startTime,
        endTime,
        duration: endTime - startTime,
        timing: null,
        initiator: 'xhr',
        renderBlocking: false,
      };

      requests.push(request);
      notifyUpdate();

      if (originalOnLoad) {
        originalOnLoad.call(this, ev);
      }
    };

    xhr.onerror = function (this: XMLHttpRequest, ev: ProgressEvent) {
      const endTime = performance.now();
      const url = xhr._fdhUrl || '';

      const request: NetworkRequest = {
        id,
        url,
        name: getFileName(url),
        type: 'api',
        method: xhr._fdhMethod || 'GET',
        status: 0,
        statusText: 'Failed',
        size: 0,
        transferSize: 0,
        startTime,
        endTime,
        duration: endTime - startTime,
        timing: null,
        initiator: 'xhr',
        renderBlocking: false,
      };

      requests.push(request);
      notifyUpdate();

      if (originalOnError) {
        originalOnError.call(this, ev);
      }
    };

    originalSend!.call(this, body);
  };
}

/**
 * Restore original fetch
 */
export function restoreFetch(): void {
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}

/**
 * Restore original XMLHttpRequest
 */
export function restoreXHR(): void {
  if (originalOpen) {
    XMLHttpRequest.prototype.open = originalOpen;
    originalOpen = null;
  }
  if (originalSend) {
    XMLHttpRequest.prototype.send = originalSend;
    originalSend = null;
  }
}

// ============================================
// Performance Observer
// ============================================

/**
 * Initialize performance observer
 */
export function initPerformanceObserver(): void {
  if (!('PerformanceObserver' in window)) return;

  performanceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        processResourceEntry(entry as PerformanceResourceTiming);
      }
    }
  });

  performanceObserver.observe({ entryTypes: ['resource'] });
}

/**
 * Process a performance resource entry
 */
function processResourceEntry(entry: PerformanceResourceTiming): void {
  // Skip if already captured by fetch/XHR interceptor
  const existingIndex = requests.findIndex((r) => r.url === entry.name);
  if (existingIndex !== -1) {
    // Update with timing data
    const existing = requests[existingIndex];
    existing.timing = extractTiming(entry);
    existing.size = entry.encodedBodySize;
    existing.transferSize = entry.transferSize;
    notifyUpdate();
    return;
  }

  const type = detectResourceType(entry.name);
  const request: NetworkRequest = {
    id: generateRequestId(),
    url: entry.name,
    name: getFileName(entry.name),
    type,
    method: 'GET',
    status: 200,
    statusText: 'OK',
    size: entry.encodedBodySize,
    transferSize: entry.transferSize,
    startTime: entry.startTime,
    endTime: entry.responseEnd,
    duration: entry.duration,
    timing: extractTiming(entry),
    initiator: 'document',
    renderBlocking: isRenderBlocking(entry.name, type),
  };

  requests.push(request);
  notifyUpdate();
}

/**
 * Disconnect performance observer
 */
export function disconnectPerformanceObserver(): void {
  if (performanceObserver) {
    performanceObserver.disconnect();
    performanceObserver = null;
  }
}

/**
 * Collect existing resources
 */
export function collectExistingResources(): void {
  const existingEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (const entry of existingEntries) {
    processResourceEntry(entry);
  }
}
