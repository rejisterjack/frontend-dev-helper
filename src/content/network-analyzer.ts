/**
 * Network Analyzer
 *
 * Monitor and analyze all network requests made by the page.
 * Shows waterfall timeline, timing breakdown, resource categorization,
 * and identifies render-blocking resources.
 */

import { Z_INDEX } from '../constants';
import { logger } from '../utils/logger';
import { escapeHtml } from '@/utils/sanitize';

// ============================================
// Types
// ============================================

type ResourceType =
  | 'document'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'api'
  | 'media'
  | 'other';

interface NetworkRequest {
  id: string;
  url: string;
  name: string;
  type: ResourceType;
  method: string;
  status: number;
  statusText: string;
  size: number;
  transferSize: number;
  startTime: number;
  endTime: number;
  duration: number;
  timing: ResourceTiming | null;
  initiator: string;
  renderBlocking: boolean;
}

interface ResourceTiming {
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

type FilterType = 'all' | ResourceType;

// ============================================
// State
// ============================================

let isActive = false;
let panel: HTMLElement | null = null;
let requests: NetworkRequest[] = [];
let currentFilter: FilterType = 'all';
let searchQuery = '';
let performanceObserver: PerformanceObserver | null = null;
let originalFetch: typeof fetch | null = null;
let originalXHR: typeof XMLHttpRequest | null = null;
let originalSend: typeof XMLHttpRequest.prototype.send | null = null;
let originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
const requestStartTimes: Map<string, number> = new Map();

// ============================================
// Resource Type Detection
// ============================================

const RESOURCE_PATTERNS: { type: ResourceType; patterns: RegExp[] }[] = [
  {
    type: 'stylesheet',
    patterns: [/\.css$/i, /\.scss$/i, /\.sass$/i, /\.less$/i, /text\/css/i],
  },
  {
    type: 'script',
    patterns: [
      /\.js$/i,
      /\.ts$/i,
      /\.jsx$/i,
      /\.tsx$/i,
      /text\/javascript/i,
      /application\/javascript/i,
    ],
  },
  {
    type: 'image',
    patterns: [/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff?)$/i, /image\//i],
  },
  {
    type: 'font',
    patterns: [/\.(woff2?|ttf|otf|eot)$/i, /font\//i, /application\/font/i],
  },
  {
    type: 'media',
    patterns: [/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i, /video\//i, /audio\//i],
  },
  {
    type: 'api',
    patterns: [/\/api\//i, /graphql/i, /rest\//i, /json$/i, /application\/json/i],
  },
];

function detectResourceType(url: string, contentType?: string): ResourceType {
  const urlToCheck = contentType ? `${url} ${contentType}` : url;

  for (const { type, patterns } of RESOURCE_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(urlToCheck))) {
      return type;
    }
  }

  return 'other';
}

function isRenderBlocking(url: string, type: ResourceType): boolean {
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

function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop();
    return fileName || urlObj.hostname;
  } catch {
    return url.substring(url.lastIndexOf('/') + 1) || url;
  }
}

// ============================================
// Request Interception
// ============================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function interceptFetch(): void {
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
      updateUI();

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
      updateUI();
      throw error;
    }
  };
}

function interceptXHR(): void {
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
      updateUI();

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
      updateUI();

      if (originalOnError) {
        originalOnError.call(this, ev);
      }
    };

    originalSend!.call(this, body);
  };
}

function restoreFetch(): void {
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}

function restoreXHR(): void {
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

function initPerformanceObserver(): void {
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

function processResourceEntry(entry: PerformanceResourceTiming): void {
  // Skip if already captured by fetch/XHR interceptor
  const existingIndex = requests.findIndex((r) => r.url === entry.name);
  if (existingIndex !== -1) {
    // Update with timing data
    const existing = requests[existingIndex];
    existing.timing = extractTiming(entry);
    existing.size = entry.encodedBodySize;
    existing.transferSize = entry.transferSize;
    updateUI();
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
  updateUI();
}

function extractTiming(entry: PerformanceResourceTiming): ResourceTiming {
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
// UI Components
// ============================================

function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'fdh-network-analyzer';
  el.className = 'fdh-network-analyzer';
  el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 800px;
    height: 500px;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    z-index: ${Z_INDEX.modal};
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  document.body.appendChild(el);
  return el;
}

function buildHeader(): string {
  const stats = calculateStats();

  return `
    <div class="fdh-na-header" style="
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-direction: column;
      gap: 12px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; font-weight: 600; color: #f8fafc;">Network Analyzer</span>
          <span style="font-size: 11px; color: #64748b;">${requests.length} requests</span>
        </div>
        <button class="fdh-na-close" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 16px;
          line-height: 1;
        ">✕</button>
      </div>
      
      <div style="display: flex; gap: 16px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #64748b;">Total:</span>
          <span style="color: #22c55e; font-weight: 500;">${formatBytes(stats.totalSize)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #64748b;">Transferred:</span>
          <span style="color: #3b82f6; font-weight: 500;">${formatBytes(stats.transferSize)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #64748b;">Time:</span>
          <span style="color: #f59e0b; font-weight: 500;">${stats.totalTime.toFixed(0)}ms</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #64748b;">DOM:</span>
          <span style="color: #a855f7; font-weight: 500;">${stats.domContentLoaded.toFixed(0)}ms</span>
        </div>
        ${
          stats.renderBlocking > 0
            ? `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #ef4444; font-weight: 500;">⚠ ${stats.renderBlocking} blocking</span>
          </div>
        `
            : ''
        }
      </div>
      
      <div style="display: flex; gap: 8px; align-items: center;">
        <div class="fdh-na-filters" style="display: flex; gap: 4px;">
          ${buildFilterButtons()}
        </div>
        <input type="text" class="fdh-na-search" placeholder="Filter by URL..." style="
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          padding: 6px 10px;
          color: #e2e8f0;
          font-size: 12px;
          flex: 1;
          min-width: 150px;
          outline: none;
        ">
        <button class="fdh-na-export" style="
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 6px;
          padding: 6px 12px;
          color: #818cf8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        ">Export HAR</button>
        <button class="fdh-na-clear" style="
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 6px;
          padding: 6px 12px;
          color: #f87171;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        ">Clear</button>
      </div>
    </div>
  `;
}

function buildFilterButtons(): string {
  const filters: { type: FilterType; label: string; color: string }[] = [
    { type: 'all', label: 'All', color: '#64748b' },
    { type: 'document', label: 'Doc', color: '#f59e0b' },
    { type: 'stylesheet', label: 'CSS', color: '#3b82f6' },
    { type: 'script', label: 'JS', color: '#facc15' },
    { type: 'image', label: 'Img', color: '#22c55e' },
    { type: 'font', label: 'Font', color: '#a855f7' },
    { type: 'api', label: 'API', color: '#ec4899' },
    { type: 'media', label: 'Media', color: '#06b6d4' },
  ];

  return filters
    .map((f) => {
      const isActive = currentFilter === f.type;
      const count =
        f.type === 'all' ? requests.length : requests.filter((r) => r.type === f.type).length;
      return `
        <button class="fdh-na-filter" data-type="${f.type}" style="
          background: ${isActive ? `rgba(${hexToRgb(f.color)}, 0.3)` : 'rgba(30, 41, 59, 0.8)'};
          border: 1px solid ${isActive ? f.color : 'rgba(99, 102, 241, 0.3)'};
          border-radius: 6px;
          padding: 4px 10px;
          color: ${isActive ? f.color : '#94a3b8'};
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${f.label}</span>
          <span style="
            background: ${isActive ? f.color : 'rgba(100, 116, 139, 0.5)'};
            color: ${isActive ? '#0f172a' : '#cbd5e1'};
            border-radius: 3px;
            padding: 1px 4px;
            font-size: 10px;
            font-weight: 600;
          ">${count}</span>
        </button>
      `;
    })
    .join('');
}

function buildRequestTable(): string {
  const filteredRequests = getFilteredRequests();

  if (filteredRequests.length === 0) {
    return `
      <div style="
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-size: 13px;
      ">
        ${requests.length === 0 ? 'Waiting for network requests...' : 'No requests match your filter'}
      </div>
    `;
  }

  const maxDuration = Math.max(...requests.map((r) => r.duration), 1);

  return `
    <div class="fdh-na-table-container" style="
      flex: 1;
      overflow: auto;
      padding: 0 16px 16px;
    ">
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.98); z-index: 1;">
          <tr>
            <th style="text-align: left; padding: 8px; color: #94a3b8; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1);">Name</th>
            <th style="text-align: center; padding: 8px; color: #94a3b8; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1); width: 50px;">Status</th>
            <th style="text-align: right; padding: 8px; color: #94a3b8; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1); width: 70px;">Size</th>
            <th style="text-align: right; padding: 8px; color: #94a3b8; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1); width: 60px;">Time</th>
            <th style="text-align: left; padding: 8px; color: #94a3b8; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.1); width: 50%;">Waterfall</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRequests
            .map((req) => {
              const typeColor = getTypeColor(req.type);
              const statusColor = getStatusColor(req.status);
              const isRenderBlock = req.renderBlocking;

              return `
              <tr class="fdh-na-row" data-id="${req.id}" style="
                cursor: pointer;
                transition: background 0.15s;
              " onmouseover="this.style.background='rgba(99,102,241,0.1)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      width: 20px;
                      height: 20px;
                      border-radius: 4px;
                      background: rgba(${hexToRgb(typeColor)}, 0.2);
                      color: ${typeColor};
                      font-size: 10px;
                      font-weight: 600;
                      text-transform: uppercase;
                    ">${getTypeIcon(req.type)}</span>
                    <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
                      <span style="color: #e2e8f0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${req.name}">
                        ${isRenderBlock ? '<span style="color: #ef4444;">⚠</span> ' : ''}${req.name}
                      </span>
                      <span style="color: #64748b; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${req.url}">${req.url}</span>
                    </div>
                  </div>
                </td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <span style="
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(${hexToRgb(statusColor)}, 0.2);
                    color: ${statusColor};
                    font-weight: 600;
                    font-size: 10px;
                  ">${req.status || '—'}</span>
                </td>
                <td style="padding: 8px; text-align: right; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  ${formatBytes(req.size)}
                </td>
                <td style="padding: 8px; text-align: right; color: ${getDurationColor(req.duration)}; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  ${req.duration.toFixed(0)}ms
                </td>
                <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  ${buildWaterfallBar(req, maxDuration)}
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildWaterfallBar(req: NetworkRequest, maxDuration: number): string {
  if (!req.timing) {
    const width = (req.duration / maxDuration) * 100;
    return `
      <div style="
        height: 16px;
        background: rgba(148, 163, 184, 0.3);
        border-radius: 3px;
        width: ${Math.max(width, 1)}%;
        position: relative;
      " title="Duration: ${req.duration.toFixed(1)}ms"></div>
    `;
  }

  const scale = 100 / maxDuration;
  const dnsWidth = req.timing.dns * scale;
  const connectWidth = req.timing.connect * scale;
  const tlsWidth = req.timing.tls * scale;
  const ttfbWidth = req.timing.ttfb * scale;
  const downloadWidth = req.timing.download * scale;

  return `
    <div style="
      height: 16px;
      display: flex;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(30, 41, 59, 0.5);
    " title="DNS: ${req.timing.dns.toFixed(1)}ms | Connect: ${req.timing.connect.toFixed(1)}ms | TLS: ${req.timing.tls.toFixed(1)}ms | TTFB: ${req.timing.ttfb.toFixed(1)}ms | Download: ${req.timing.download.toFixed(1)}ms">
      ${dnsWidth > 0.5 ? `<div style="width: ${dnsWidth}%; background: #f59e0b;" title="DNS: ${req.timing.dns.toFixed(1)}ms"></div>` : ''}
      ${connectWidth > 0.5 ? `<div style="width: ${connectWidth}%; background: #3b82f6;" title="Connect: ${req.timing.connect.toFixed(1)}ms"></div>` : ''}
      ${tlsWidth > 0.5 ? `<div style="width: ${tlsWidth}%; background: #8b5cf6;" title="TLS: ${req.timing.tls.toFixed(1)}ms"></div>` : ''}
      ${ttfbWidth > 0.5 ? `<div style="width: ${ttfbWidth}%; background: #22c55e;" title="TTFB: ${req.timing.ttfb.toFixed(1)}ms"></div>` : ''}
      ${downloadWidth > 0.5 ? `<div style="width: ${downloadWidth}%; background: #ec4899;" title="Download: ${req.timing.download.toFixed(1)}ms"></div>` : ''}
    </div>
  `;
}

function buildDetailPanel(requestId: string): string {
  const req = requests.find((r) => r.id === requestId);
  if (!req) return '';

  return `
    <div class="fdh-na-detail" style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      max-height: 400px;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 20px;
      z-index: ${Z_INDEX.modal + 1};
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 14px; font-weight: 600;">Request Details</span>
        <button class="fdh-na-detail-close" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 16px;
        ">✕</button>
      </div>
      
      <div style="overflow-y: auto; max-height: 320px;">
        <div style="margin-bottom: 12px;">
          <span style="color: #64748b; font-size: 11px;">URL</span>
          <div style="color: #e2e8f0; word-break: break-all; font-size: 12px; margin-top: 4px;">${req.url}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
          <div>
            <span style="color: #64748b; font-size: 11px;">Method</span>
            <div style="color: #e2e8f0; font-weight: 500; margin-top: 4px;">${req.method}</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px;">Status</span>
            <div style="color: ${getStatusColor(req.status)}; font-weight: 500; margin-top: 4px;">${req.status} ${req.statusText}</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px;">Type</span>
            <div style="color: #e2e8f0; font-weight: 500; margin-top: 4px; text-transform: uppercase;">${req.type}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
          <div>
            <span style="color: #64748b; font-size: 11px;">Size</span>
            <div style="color: #22c55e; font-weight: 500; margin-top: 4px;">${formatBytes(req.size)}</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px;">Transfer</span>
            <div style="color: #3b82f6; font-weight: 500; margin-top: 4px;">${formatBytes(req.transferSize)}</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px;">Duration</span>
            <div style="color: ${getDurationColor(req.duration)}; font-weight: 500; margin-top: 4px;">${req.duration.toFixed(1)}ms</div>
          </div>
        </div>
        
        ${
          req.timing
            ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="color: #64748b; font-size: 11px; margin-bottom: 8px; display: block;">Timing Breakdown</span>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 10px; background: #f59e0b; border-radius: 2px;"></span>
                  <span style="color: #94a3b8;">DNS Lookup</span>
                </span>
                <span style="color: #e2e8f0;">${req.timing.dns.toFixed(1)}ms</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 10px; background: #3b82f6; border-radius: 2px;"></span>
                  <span style="color: #94a3b8;">Connection</span>
                </span>
                <span style="color: #e2e8f0;">${req.timing.connect.toFixed(1)}ms</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 10px; background: #8b5cf6; border-radius: 2px;"></span>
                  <span style="color: #94a3b8;">TLS Handshake</span>
                </span>
                <span style="color: #e2e8f0;">${req.timing.tls.toFixed(1)}ms</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 10px; background: #22c55e; border-radius: 2px;"></span>
                  <span style="color: #94a3b8;">TTFB</span>
                </span>
                <span style="color: #e2e8f0;">${req.timing.ttfb.toFixed(1)}ms</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 10px; background: #ec4899; border-radius: 2px;"></span>
                  <span style="color: #94a3b8;">Download</span>
                </span>
                <span style="color: #e2e8f0;">${req.timing.download.toFixed(1)}ms</span>
              </div>
            </div>
          </div>
        `
            : ''
        }
        
        ${
          req.renderBlocking
            ? `
          <div style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
            <span style="color: #ef4444; font-size: 12px;">⚠ Render-blocking resource</span>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}

// ============================================
// Helpers
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function getTypeColor(type: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    document: '#f59e0b',
    stylesheet: '#3b82f6',
    script: '#facc15',
    image: '#22c55e',
    font: '#a855f7',
    api: '#ec4899',
    media: '#06b6d4',
    other: '#94a3b8',
  };
  return colors[type] || colors.other;
}

function getTypeIcon(type: ResourceType): string {
  const icons: Record<ResourceType, string> = {
    document: 'D',
    stylesheet: 'C',
    script: 'J',
    image: 'I',
    font: 'F',
    api: 'A',
    media: 'M',
    other: '?',
  };
  return icons[type] || icons.other;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return '#22c55e';
  if (status >= 300 && status < 400) return '#3b82f6';
  if (status >= 400) return '#ef4444';
  return '#94a3b8';
}

function getDurationColor(duration: number): string {
  if (duration < 100) return '#22c55e';
  if (duration < 500) return '#f59e0b';
  return '#ef4444';
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '100, 116, 139';
}

function getFilteredRequests(): NetworkRequest[] {
  return requests.filter((req) => {
    if (currentFilter !== 'all' && req.type !== currentFilter) return false;
    if (searchQuery && !req.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}

interface NetworkStats {
  totalSize: number;
  transferSize: number;
  totalTime: number;
  domContentLoaded: number;
  renderBlocking: number;
}

function calculateStats(): NetworkStats {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  return {
    totalSize: requests.reduce((sum, r) => sum + r.size, 0),
    transferSize: requests.reduce((sum, r) => sum + r.transferSize, 0),
    totalTime: requests.length > 0 ? Math.max(...requests.map((r) => r.endTime)) : 0,
    domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
    renderBlocking: requests.filter((r) => r.renderBlocking).length,
  };
}

// ============================================
// UI Management
// ============================================

function updateUI(): void {
  if (!panel || !isActive) return;

  panel.innerHTML = `
    ${buildHeader()}
    ${buildRequestTable()}
  `;

  attachEventListeners();
}

function attachEventListeners(): void {
  if (!panel) return;

  // Close button
  const closeBtn = panel.querySelector('.fdh-na-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => disable());
  }

  // Filter buttons
  panel.querySelectorAll('.fdh-na-filter').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const type = target.dataset.type as FilterType;
      currentFilter = type;
      updateUI();
    });
  });

  // Search input
  const searchInput = panel.querySelector('.fdh-na-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = searchQuery;
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      updateUI();
    });
  }

  // Export button
  const exportBtn = panel.querySelector('.fdh-na-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportHAR);
  }

  // Clear button
  const clearBtn = panel.querySelector('.fdh-na-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      requests = [];
      updateUI();
    });
  }

  // Row clicks for detail view
  panel.querySelectorAll('.fdh-na-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const id = target.dataset.id;
      if (id) {
        showDetailPanel(id);
      }
    });
  });
}

function showDetailPanel(requestId: string): void {
  if (!panel) return;

  // Remove existing detail panel
  const existingDetail = document.querySelector('.fdh-na-detail');
  if (existingDetail) {
    existingDetail.remove();
  }

  // Create and append detail panel
  const detailHtml = buildDetailPanel(requestId);
  const detailContainer = document.createElement('div');
  detailContainer.innerHTML = detailHtml;
  document.body.appendChild(detailContainer.firstElementChild!);

  // Attach close handler
  const closeBtn = document.querySelector('.fdh-na-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const detail = document.querySelector('.fdh-na-detail');
      if (detail) detail.remove();
    });
  }

  // Close on outside click
  document.addEventListener('click', function closeOnOutside(e) {
    const detail = document.querySelector('.fdh-na-detail');
    if (detail && !detail.contains(e.target as Node) && !panel!.contains(e.target as Node)) {
      detail.remove();
      document.removeEventListener('click', closeOnOutside);
    }
  });
}

// ============================================
// Export
// ============================================

function exportHAR(): void {
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
  if (!panel) {
    panel = createPanel();
  }

  // Start monitoring
  interceptFetch();
  interceptXHR();
  initPerformanceObserver();

  // Initial UI render
  updateUI();

  // Collect existing resources
  const existingEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (const entry of existingEntries) {
    processResourceEntry(entry);
  }

  logger.log('[NetworkAnalyzer] Enabled');
}

/**
 * Disable the Network Analyzer
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Hide panel
  if (panel) {
    panel.remove();
    panel = null;
  }

  // Remove detail panel if open
  const detail = document.querySelector('.fdh-na-detail');
  if (detail) {
    detail.remove();
  }

  // Stop monitoring
  restoreFetch();
  restoreXHR();

  if (performanceObserver) {
    performanceObserver.disconnect();
    performanceObserver = null;
  }

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
    requestCount: requests.length,
    filter: currentFilter,
  };
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
export function clear(): void {
  requests = [];
  updateUI();
}

/**
 * Set filter type
 */
export function setFilter(type: FilterType): void {
  currentFilter = type;
  updateUI();
}

/**
 * Cleanup and destroy
 */
export function destroy(): void {
  disable();
  requests = [];
}

// Export singleton API
export const networkAnalyzer = {
  enable,
  disable,
  toggle,
  getState,
  getRequests,
  clear,
  setFilter,
  destroy,
};

export default networkAnalyzer;
