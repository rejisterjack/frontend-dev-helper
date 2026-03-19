/**
 * Performance Tab
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { MemoryInfo, PerformanceMetrics } from '@/types';

export const PerformanceTab: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      // Get performance metrics from the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getPageMetrics,
        });

        if (results[0]?.result) {
          setMetrics(results[0].result as PerformanceMetrics);
        }
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-dev-muted">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-64 items-center justify-center p-4 text-center">
        <div>
          <div className="mb-2 text-4xl">📊</div>
          <div className="text-dev-muted">No performance data available</div>
          <button
            onClick={loadMetrics}
            className="mt-4 rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const { webVitals, navigation, resources, memory } = metrics;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Core Web Vitals
        </h3>
        <button
          onClick={loadMetrics}
          className="rounded p-1 text-dev-muted hover:text-dev-text"
          title="Refresh"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <VitalCard label="LCP" value={webVitals.lcp} unit="ms" threshold={2500} />
        <VitalCard label="FID" value={webVitals.fid} unit="ms" threshold={100} />
        <VitalCard label="CLS" value={webVitals.cls} unit="" threshold={0.1} />
        <VitalCard label="FCP" value={webVitals.fcp} unit="ms" threshold={1800} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Navigation Timing
        </h3>
        <div className="space-y-1 rounded-lg bg-dev-surface p-3">
          <TimingRow label="DNS Lookup" value={navigation.dnsLookup} />
          <TimingRow label="TCP Connection" value={navigation.tcpConnection} />
          <TimingRow label="Server Response" value={navigation.serverResponse} />
          <TimingRow label="DOM Processing" value={navigation.domProcessing} />
          <TimingRow label="Resource Loading" value={navigation.resourceLoading} />
          <div className="mt-2 border-t border-dev-border pt-2">
            <TimingRow label="Total Load" value={navigation.totalLoad} highlight />
          </div>
        </div>
      </div>

      {memory && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dev-muted">
            Memory Usage
          </h3>
          <div className="rounded-lg bg-dev-surface p-3">
            <MemoryBar
              used={memory.usedJSHeapSize}
              total={memory.totalJSHeapSize}
              limit={memory.jsHeapSizeLimit}
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Resources
        </h3>
        <div className="rounded-lg bg-dev-surface p-3">
          <div className="flex justify-between text-sm">
            <span className="text-dev-muted">Total Requests</span>
            <span className="text-dev-text">{resources.totalRequests}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-dev-muted">Total Size</span>
            <span className="text-dev-text">{formatBytes(resources.totalSize)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getPageMetrics(): PerformanceMetrics {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource');

  // Calculate Web Vitals (simplified)
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;

  // Calculate navigation timing
  const navigation: PerformanceMetrics['navigation'] = {
    dnsLookup: nav ? nav.domainLookupEnd - nav.domainLookupStart : 0,
    tcpConnection: nav ? nav.connectEnd - nav.connectStart : 0,
    serverResponse: nav ? nav.responseEnd - nav.requestStart : 0,
    domProcessing: nav ? nav.domComplete - nav.responseEnd : 0,
    resourceLoading: nav ? nav.loadEventEnd - nav.domComplete : 0,
    totalLoad: nav ? nav.loadEventEnd - nav.startTime : performance.now(),
  };

  // Calculate resource stats
  const resourceStats = resources.reduce(
    (acc, r) => ({
      count: acc.count + 1,
      size: acc.size + (r.transferSize || 0),
    }),
    { count: 0, size: 0 }
  );

  // Get memory info if available
  const memory = (performance as { memory?: MemoryInfo }).memory;

  return {
    timestamp: Date.now(),
    webVitals: {
      lcp: null, // Requires PerformanceObserver
      fid: null, // Requires PerformanceObserver
      cls: null, // Requires PerformanceObserver
      fcp,
      ttfb: nav ? nav.responseStart - nav.startTime : null,
      inp: null, // Requires PerformanceObserver
    },
    navigation,
    resources: {
      totalRequests: resourceStats.count,
      totalSize: resourceStats.size,
      byType: {},
      slowestResources: [],
    },
    memory: memory
      ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        }
      : undefined,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// Sub-components
const VitalCard: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  threshold: number;
}> = ({ label, value, unit, threshold }) => {
  const isGood = value !== null && value <= threshold;
  const isPoor = value !== null && value > threshold * 1.5;

  return (
    <div className="rounded-lg bg-dev-surface p-3">
      <div className="text-xs text-dev-muted">{label}</div>
      <div
        className={`text-lg font-semibold ${
          isGood ? 'text-dev-success' : isPoor ? 'text-dev-error' : 'text-dev-warning'
        }`}
      >
        {value !== null ? `${Math.round(value)}${unit}` : '—'}
      </div>
    </div>
  );
};

const TimingRow: React.FC<{
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex justify-between text-sm">
    <span className={highlight ? 'font-medium text-dev-text' : 'text-dev-muted'}>{label}</span>
    <span className={highlight ? 'font-medium text-primary-400' : 'text-dev-text'}>
      {Math.round(value)}ms
    </span>
  </div>
);

const MemoryBar: React.FC<{
  used: number;
  total: number;
  limit: number;
}> = ({ used, limit }) => {
  const percentage = (used / limit) * 100;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-dev-muted">JS Heap</span>
        <span className="text-dev-text">
          {formatBytes(used)} / {formatBytes(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-dev-border">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80 ? 'bg-dev-error' : percentage > 60 ? 'bg-dev-warning' : 'bg-dev-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
