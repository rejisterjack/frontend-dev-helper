/**
 * Network Analyzer - UI Components
 *
 * UI component creation and management for the Network Analyzer.
 */

import { Z_INDEX } from '@/constants';
import { escapeHtml } from '@/utils/sanitize';
import { FILTER_CONFIGS, TYPE_COLORS, TYPE_ICONS } from './constants';
import type { FilterType, NetworkRequest, NetworkStats } from './types';

// UI State
let panel: HTMLElement | null = null;
let currentFilter: FilterType = 'all';
let searchQuery = '';

// Callbacks
let onDisable: (() => void) | null = null;
let onClear: (() => void) | null = null;
let onFilterChange: ((type: FilterType) => void) | null = null;
let onExport: (() => void) | null = null;

/**
 * Set callbacks for UI actions
 */
export function setCallbacks(callbacks: {
  onDisable: () => void;
  onClear: () => void;
  onFilterChange: (type: FilterType) => void;
  onExport: () => void;
}): void {
  onDisable = callbacks.onDisable;
  onClear = callbacks.onClear;
  onFilterChange = callbacks.onFilterChange;
  onExport = callbacks.onExport;
}

/**
 * Get current filter
 */
export function getCurrentFilter(): FilterType {
  return currentFilter;
}

/**
 * Set current filter
 */
export function setFilter(type: FilterType): void {
  currentFilter = type;
}

/**
 * Get search query
 */
export function getSearchQuery(): string {
  return searchQuery;
}

/**
 * Set search query
 */
export function setSearchQuery(query: string): void {
  searchQuery = query;
}

/**
 * Get the panel element
 */
export function getPanel(): HTMLElement | null {
  return panel;
}

/**
 * Set the panel element
 */
export function setPanel(element: HTMLElement | null): void {
  panel = element;
}

/**
 * Create the main panel element
 */
export function createPanel(): HTMLElement {
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

/**
 * Remove detail panel if open
 */
export function removeDetailPanel(): void {
  const detail = document.querySelector('.fdh-na-detail');
  if (detail) {
    detail.remove();
  }
}

/**
 * Get filtered requests based on current filter and search
 */
export function getFilteredRequests(requests: NetworkRequest[]): NetworkRequest[] {
  return requests.filter((req) => {
    if (currentFilter !== 'all' && req.type !== currentFilter) return false;
    if (searchQuery && !req.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}

/**
 * Calculate network statistics
 */
export function calculateStats(requests: NetworkRequest[]): NetworkStats {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  return {
    totalSize: requests.reduce((sum, r) => sum + r.size, 0),
    transferSize: requests.reduce((sum, r) => sum + r.transferSize, 0),
    totalTime: requests.length > 0 ? Math.max(...requests.map((r) => r.endTime)) : 0,
    domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
    renderBlocking: requests.filter((r) => r.renderBlocking).length,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Get color for resource type
 */
export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

/**
 * Get icon for resource type
 */
export function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] || TYPE_ICONS.other;
}

/**
 * Get color for status code
 */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return '#22c55e';
  if (status >= 300 && status < 400) return '#3b82f6';
  if (status >= 400) return '#ef4444';
  return '#94a3b8';
}

/**
 * Get color for duration
 */
export function getDurationColor(duration: number): string {
  if (duration < 100) return '#22c55e';
  if (duration < 500) return '#f59e0b';
  return '#ef4444';
}

/**
 * Convert hex to rgb string
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '100, 116, 139';
}

/**
 * Build the header HTML
 */
export function buildHeader(requests: NetworkRequest[]): string {
  const stats = calculateStats(requests);

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
        <button
          type="button" class="fdh-na-close" style="
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
          ${buildFilterButtons(requests)}
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
        <button
          type="button" class="fdh-na-export" style="
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
        <button
          type="button" class="fdh-na-clear" style="
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

/**
 * Build filter buttons HTML
 */
export function buildFilterButtons(requests: NetworkRequest[]): string {
  return FILTER_CONFIGS.map((f) => {
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
  }).join('');
}

/**
 * Build the request table HTML
 */
export function buildRequestTable(requests: NetworkRequest[]): string {
  const filteredRequests = getFilteredRequests(requests);

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
              const safeName = escapeHtml(req.name);
              const safeUrl = escapeHtml(req.url);

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
                      <span style="color: #e2e8f0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${safeName}">
                        ${isRenderBlock ? '<span style="color: #ef4444;">⚠</span> ' : ''}${safeName}
                      </span>
                      <span style="color: #64748b; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${safeUrl}">${safeUrl}</span>
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

/**
 * Build waterfall bar HTML
 */
export function buildWaterfallBar(req: NetworkRequest, maxDuration: number): string {
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

/**
 * Build detail panel HTML
 */
export function buildDetailPanel(requestId: string, requests: NetworkRequest[]): string {
  const req = requests.find((r) => r.id === requestId);
  if (!req) return '';

  const safeUrl = escapeHtml(req.url);

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
        <button
          type="button" class="fdh-na-detail-close" style="
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
          <div style="color: #e2e8f0; word-break: break-all; font-size: 12px; margin-top: 4px;">${safeUrl}</div>
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

/**
 * Update the UI with current requests
 */
export function updateUI(requests: NetworkRequest[]): void {
  if (!panel) return;

  panel.innerHTML = `
    ${buildHeader(requests)}
    ${buildRequestTable(requests)}
  `;

  attachEventListeners(requests);
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners(requests: NetworkRequest[]): void {
  if (!panel) return;

  // Close button
  const closeBtn = panel.querySelector('.fdh-na-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (onDisable) onDisable();
    });
  }

  // Filter buttons
  panel.querySelectorAll('.fdh-na-filter').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const type = target.dataset.type as FilterType;
      if (onFilterChange) onFilterChange(type);
    });
  });

  // Search input
  const searchInput = panel.querySelector('.fdh-na-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = searchQuery;
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      // Trigger UI update through the filter change callback
      if (onFilterChange) onFilterChange(currentFilter);
    });
  }

  // Export button
  const exportBtn = panel.querySelector('.fdh-na-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (onExport) onExport();
    });
  }

  // Clear button
  const clearBtn = panel.querySelector('.fdh-na-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (onClear) onClear();
    });
  }

  // Row clicks for detail view
  panel.querySelectorAll('.fdh-na-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const id = target.dataset.id;
      if (id) {
        showDetailPanel(id, requests);
      }
    });
  });
}

/**
 * Show detail panel for a request
 */
function showDetailPanel(requestId: string, requests: NetworkRequest[]): void {
  if (!panel) return;

  // Remove existing detail panel
  removeDetailPanel();

  // Create and append detail panel
  const detailHtml = buildDetailPanel(requestId, requests);
  if (!detailHtml) return;

  const detailContainer = document.createElement('div');
  detailContainer.innerHTML = detailHtml;
  document.body.appendChild(detailContainer.firstElementChild!);

  // Attach close handler
  const closeBtn = document.querySelector('.fdh-na-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeDetailPanel();
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
