/**
 * Enhanced Performance Tab
 *
 * Comprehensive performance analysis including:
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 * - Navigation timing breakdown
 * - Resource analysis with optimization hints
 * - Memory usage tracking
 * - Image optimization recommendations
 * - Render blocking resources detection
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryInfo, ResourceAnalysis, WebVitals } from '@/types';
import { logger } from '@/utils/logger';

interface PerformanceData {
  timestamp: number;
  webVitals: WebVitals;
  navigation: NavigationTiming;
  resources: ResourceAnalysis;
  memory?: MemoryInfo;
  imageOptimizations: ImageOptimization[];
  renderBlocking: RenderBlockingResource[];
  longTasks: LongTaskInfo[];
}

interface NavigationTiming {
  dnsLookup: number;
  tcpConnection: number;
  serverResponse: number;
  domProcessing: number;
  resourceLoading: number;
  totalLoad: number;
  redirectTime: number;
  tlsHandshake: number;
}

interface ImageOptimization {
  element: string;
  src: string;
  currentSize: number;
  currentFormat: string;
  recommendations: string[];
  potentialSavings: number;
}

interface RenderBlockingResource {
  url: string;
  type: 'stylesheet' | 'script';
  size: number;
  blockingTime: number;
}

interface LongTaskInfo {
  duration: number;
  startTime: number;
}

const VITAL_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 },
};

export const PerformanceTab: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVitalsTab, setActiveVitalsTab] = useState<'overview' | 'details'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['vitals']));
  const observerRef = useRef<PerformanceObserver | null>(null);
  const longTaskObserverRef = useRef<PerformanceObserver | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const loadMetrics = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        // Get performance metrics via executeScript (has access to performance API)
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getPageMetrics,
        });

        // Get DOM-based performance data via messaging (more reliable)
        const domData = await chrome.tabs
          .sendMessage(tab.id, {
            type: 'GET_PERFORMANCE_DOM_DATA',
          })
          .catch(() => ({ imageOptimizations: [], renderBlocking: [] }));

        if (results[0]?.result) {
          const metrics = results[0].result as PerformanceData;
          // Merge DOM data from content script
          setMetrics({
            ...metrics,
            imageOptimizations: domData.imageOptimizations || [],
            renderBlocking: (domData.renderBlocking || []).map(
              (r: { url: string; type: string }) => {
                // Find matching resource timing
                const resource = metrics.resources.slowestResources?.find((res) =>
                  res.url.includes(r.url.split('/').pop() || '')
                );
                return {
                  url: r.url,
                  type: r.type as 'stylesheet' | 'script',
                  size: resource?.size || 0,
                  blockingTime: resource?.duration || 0,
                };
              }
            ),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    // Set up Web Vitals observer in the popup context
    if ('PerformanceObserver' in window) {
      try {
        observerRef.current = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.log('[Performance]', entry.name, (entry as { value?: number }).value);
          }
        });
        observerRef.current.observe({ entryTypes: ['web-vitals'] });
      } catch {
        // Web Vitals API may not be available
      }

      // Observe long tasks
      try {
        longTaskObserverRef.current = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.log('[Long Task]', entry.duration, 'ms');
          }
        });
        longTaskObserverRef.current.observe({ entryTypes: ['longtask'] });
      } catch {
        // Long Task API may not be available
      }
    }

    return () => {
      observerRef.current?.disconnect();
      longTaskObserverRef.current?.disconnect();
    };
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
            type="button"
            onClick={loadMetrics}
            className="mt-4 rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const { webVitals, navigation, resources, memory, imageOptimizations, renderBlocking } = metrics;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
            Performance Analysis
          </h3>
          <p className="text-[10px] text-dev-muted mt-0.5">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMetrics}
            className="rounded p-1.5 text-dev-muted hover:text-dev-text hover:bg-dev-surface transition-colors"
            title="Refresh metrics"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-dev-border bg-dev-surface/50 px-3 py-2 text-[11px] text-dev-text leading-snug">
        <span className="font-semibold text-dev-muted">Performance summary · </span>
        LCP {webVitals.lcp != null ? `${Math.round(webVitals.lcp)}ms` : '—'} · CLS{' '}
        {webVitals.cls != null ? webVitals.cls.toFixed(3) : '—'} · INP{' '}
        {webVitals.inp != null ? `${Math.round(webVitals.inp)}ms` : '—'} · Requests{' '}
        {resources.totalRequests}
      </div>

      {/* Core Web Vitals Section */}
      <div className="rounded-lg bg-dev-surface overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('vitals')}
          className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-medium text-dev-text">Core Web Vitals</span>
          </div>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('vitals') ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('vitals') && (
          <div className="p-3 pt-0 border-t border-dev-border">
            {/* Vitals Tabs */}
            <div className="flex gap-1 mt-3 mb-3">
              <button
                type="button"
                onClick={() => setActiveVitalsTab('overview')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                  activeVitalsTab === 'overview'
                    ? 'bg-primary-600 text-white'
                    : 'text-dev-muted hover:text-dev-text hover:bg-dev-border'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveVitalsTab('details')}
                className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                  activeVitalsTab === 'details'
                    ? 'bg-primary-600 text-white'
                    : 'text-dev-muted hover:text-dev-text hover:bg-dev-border'
                }`}
              >
                Details
              </button>
            </div>

            {activeVitalsTab === 'overview' ? (
              <div className="grid grid-cols-2 gap-2">
                <VitalCard
                  label="LCP"
                  value={webVitals.lcp}
                  unit="ms"
                  thresholds={VITAL_THRESHOLDS.lcp}
                  description="Largest Contentful Paint"
                />
                <VitalCard
                  label="FID"
                  value={webVitals.fid}
                  unit="ms"
                  thresholds={VITAL_THRESHOLDS.fid}
                  description="First Input Delay"
                />
                <VitalCard
                  label="CLS"
                  value={webVitals.cls}
                  unit=""
                  thresholds={VITAL_THRESHOLDS.cls}
                  description="Cumulative Layout Shift"
                />
                <VitalCard
                  label="INP"
                  value={webVitals.inp}
                  unit="ms"
                  thresholds={VITAL_THRESHOLDS.inp}
                  description="Interaction to Next Paint"
                />
                <VitalCard
                  label="FCP"
                  value={webVitals.fcp}
                  unit="ms"
                  thresholds={VITAL_THRESHOLDS.fcp}
                  description="First Contentful Paint"
                />
                <VitalCard
                  label="TTFB"
                  value={webVitals.ttfb}
                  unit="ms"
                  thresholds={VITAL_THRESHOLDS.ttfb}
                  description="Time to First Byte"
                />
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <VitalDetailRow
                  name="Largest Contentful Paint (LCP)"
                  value={webVitals.lcp}
                  unit="ms"
                  target="< 2.5s"
                  thresholds={VITAL_THRESHOLDS.lcp}
                />
                <VitalDetailRow
                  name="First Input Delay (FID)"
                  value={webVitals.fid}
                  unit="ms"
                  target="< 100ms"
                  thresholds={VITAL_THRESHOLDS.fid}
                />
                <VitalDetailRow
                  name="Cumulative Layout Shift (CLS)"
                  value={webVitals.cls}
                  unit=""
                  target="< 0.1"
                  thresholds={VITAL_THRESHOLDS.cls}
                />
                <VitalDetailRow
                  name="Interaction to Next Paint (INP)"
                  value={webVitals.inp}
                  unit="ms"
                  target="< 200ms"
                  thresholds={VITAL_THRESHOLDS.inp}
                />
                <VitalDetailRow
                  name="First Contentful Paint (FCP)"
                  value={webVitals.fcp}
                  unit="ms"
                  target="< 1.8s"
                  thresholds={VITAL_THRESHOLDS.fcp}
                />
                <VitalDetailRow
                  name="Time to First Byte (TTFB)"
                  value={webVitals.ttfb}
                  unit="ms"
                  target="< 800ms"
                  thresholds={VITAL_THRESHOLDS.ttfb}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Timing */}
      <div className="rounded-lg bg-dev-surface overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('timing')}
          className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span className="text-sm font-medium text-dev-text">Navigation Timing</span>
          </div>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('timing') ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('timing') && (
          <div className="p-3 pt-0 border-t border-dev-border space-y-1">
            <TimingRow label="Redirect Time" value={navigation.redirectTime} />
            <TimingRow label="DNS Lookup" value={navigation.dnsLookup} />
            <TimingRow label="TCP Connection" value={navigation.tcpConnection} />
            <TimingRow label="TLS Handshake" value={navigation.tlsHandshake} />
            <TimingRow label="Server Response (TTFB)" value={navigation.serverResponse} />
            <TimingRow label="DOM Processing" value={navigation.domProcessing} />
            <TimingRow label="Resource Loading" value={navigation.resourceLoading} />
            <div className="mt-2 border-t border-dev-border pt-2">
              <TimingRow label="Total Load Time" value={navigation.totalLoad} highlight />
            </div>
          </div>
        )}
      </div>

      {/* Resource Analysis */}
      <div className="rounded-lg bg-dev-surface overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('resources')}
          className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <span className="text-sm font-medium text-dev-text">Resources</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dev-border text-dev-muted">
              {resources.totalRequests}
            </span>
          </div>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('resources') ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('resources') && (
          <div className="p-3 pt-0 border-t border-dev-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-dev-bg p-2">
                <div className="text-[10px] text-dev-muted">Total Size</div>
                <div className="text-sm font-medium text-dev-text">
                  {formatBytes(resources.totalSize)}
                </div>
              </div>
              <div className="rounded bg-dev-bg p-2">
                <div className="text-[10px] text-dev-muted">Transfer Size</div>
                <div className="text-sm font-medium text-dev-text">
                  {formatBytes(resources.transferSize)}
                </div>
              </div>
            </div>

            {resources.byType && Object.keys(resources.byType).length > 0 && (
              <div>
                <div className="text-[10px] text-dev-muted mb-2">By Type</div>
                <div className="space-y-1">
                  {Object.entries(resources.byType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([type, size]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-dev-muted capitalize">{type}</span>
                        <span className="text-dev-text">{formatBytes(size as number)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {resources.slowestResources && resources.slowestResources.length > 0 && (
              <div>
                <div className="text-[10px] text-dev-muted mb-2">Slowest Resources</div>
                <div className="space-y-1">
                  {resources.slowestResources.slice(0, 3).map((resource) => (
                    <div key={resource.url} className="flex justify-between text-xs truncate">
                      <span className="text-dev-muted truncate max-w-[180px]" title={resource.url}>
                        {resource.url.split('/').pop() || resource.url}
                      </span>
                      <span className="text-dev-warning">{Math.round(resource.duration)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Optimization */}
      {imageOptimizations.length > 0 && (
        <div className="rounded-lg bg-dev-surface overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('images')}
            className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🖼️</span>
              <span className="text-sm font-medium text-dev-text">Image Optimization</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full text-dev-warning"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                {imageOptimizations.length} issues
              </span>
            </div>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('images') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expandedSections.has('images') && (
            <div className="p-3 pt-0 border-t border-dev-border">
              <div className="space-y-2">
                {imageOptimizations.slice(0, 3).map((img) => (
                  <div key={img.src} className="rounded bg-dev-bg p-2 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="truncate text-dev-text">{img.src.split('/').pop()}</span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-dev-border text-dev-muted">
                        {img.currentFormat.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-dev-muted text-[10px] mb-1">
                      Size: {formatBytes(img.currentSize)} • Potential savings:{' '}
                      {formatBytes(img.potentialSavings)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {img.recommendations.map((rec) => (
                        <span
                          key={rec}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {imageOptimizations.length > 3 && (
                  <div className="text-center text-[10px] text-dev-muted">
                    +{imageOptimizations.length - 3} more images
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render Blocking Resources */}
      {renderBlocking.length > 0 && (
        <div className="rounded-lg bg-dev-surface overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('blocking')}
            className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              <span className="text-sm font-medium text-dev-text">Render Blocking</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dev-error/20 text-dev-error">
                {renderBlocking.length}
              </span>
            </div>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('blocking') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expandedSections.has('blocking') && (
            <div className="p-3 pt-0 border-t border-dev-border">
              <div className="space-y-1">
                {renderBlocking.map((resource) => (
                  <div
                    key={resource.url}
                    className="flex justify-between items-center text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          resource.type === 'stylesheet' ? 'text-blue-400' : 'text-yellow-400'
                        }
                      >
                        {resource.type === 'stylesheet' ? '📄' : '📜'}
                      </span>
                      <span className="truncate max-w-[200px] text-dev-muted" title={resource.url}>
                        {resource.url.split('/').pop()}
                      </span>
                    </div>
                    <span className="text-dev-warning">{Math.round(resource.blockingTime)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Memory Usage */}
      {memory && (
        <div className="rounded-lg bg-dev-surface overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('memory')}
            className="w-full flex items-center justify-between p-3 hover:bg-dev-surface/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-medium text-dev-text">Memory Usage</span>
            </div>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 text-dev-muted transition-transform ${expandedSections.has('memory') ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expandedSections.has('memory') && (
            <div className="p-3 pt-0 border-t border-dev-border">
              <MemoryBar
                used={memory.usedJSHeapSize}
                total={memory.totalJSHeapSize}
                limit={memory.jsHeapSizeLimit}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Components
const VitalCard: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  thresholds: { good: number; poor: number };
  description: string;
}> = ({ label, value, unit, thresholds, description }) => {
  const isGood = value !== null && value <= thresholds.good;
  const isPoor = value !== null && value >= thresholds.poor;

  return (
    <div className="rounded-lg bg-dev-bg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-dev-muted">{label}</span>
        <div
          className={`w-2 h-2 rounded-full ${isGood ? 'bg-dev-success' : isPoor ? 'bg-dev-error' : 'bg-dev-warning'}`}
        />
      </div>
      <div
        className={`text-lg font-semibold ${isGood ? 'text-dev-success' : isPoor ? 'text-dev-error' : 'text-dev-warning'}`}
      >
        {value !== null ? `${Math.round(value)}${unit}` : '—'}
      </div>
      <div className="text-[10px] text-dev-muted mt-0.5">{description}</div>
    </div>
  );
};

const VitalDetailRow: React.FC<{
  name: string;
  value: number | null;
  unit: string;
  target: string;
  thresholds: { good: number; poor: number };
}> = ({ name, value, unit, target, thresholds }) => {
  const isGood = value !== null && value <= thresholds.good;
  const isPoor = value !== null && value >= thresholds.poor;

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-dev-text">{name}</span>
      <div className="flex items-center gap-3">
        <span className="text-dev-muted">Target: {target}</span>
        <span
          className={`font-medium ${isGood ? 'text-dev-success' : isPoor ? 'text-dev-error' : 'text-dev-warning'}`}
        >
          {value !== null ? `${Math.round(value)}${unit}` : '—'}
        </span>
      </div>
    </div>
  );
};

const TimingRow: React.FC<{
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex justify-between text-sm py-0.5">
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
      <div className="flex justify-between text-sm mb-2">
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
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-[10px] text-dev-muted">
        {percentage > 80
          ? '⚠️ High memory usage - Consider checking for memory leaks'
          : percentage > 60
            ? '⚡ Moderate memory usage'
            : '✅ Memory usage is healthy'}
      </div>
    </div>
  );
};

// Helper function injected into page context
// NOTE: This runs via executeScript and has access to the page's performance API
// DOM-dependent data (images, render blocking) is fetched separately via messaging
function getPageMetrics(): Omit<PerformanceData, 'imageOptimizations' | 'renderBlocking'> & {
  imageOptimizations: [];
  renderBlocking: [];
} {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const paintEntries = performance.getEntriesByType('paint');

  // Calculate Web Vitals
  const fcp = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;

  // Get LCP if available
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
  const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

  // Get CLS from layout shift entries
  const layoutShiftEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[];
  const cls =
    layoutShiftEntries.reduce((acc, entry) => {
      return (
        acc + ((entry as LayoutShiftEntry).hadRecentInput ? 0 : (entry as LayoutShiftEntry).value)
      );
    }, 0) || null;

  // Calculate navigation timing
  const navigation: NavigationTiming = {
    dnsLookup: nav ? nav.domainLookupEnd - nav.domainLookupStart : 0,
    tcpConnection: nav ? nav.connectEnd - nav.connectStart : 0,
    serverResponse: nav ? nav.responseEnd - nav.requestStart : 0,
    domProcessing: nav ? nav.domComplete - nav.responseEnd : 0,
    resourceLoading: nav ? nav.loadEventEnd - nav.domComplete : 0,
    totalLoad: nav ? nav.loadEventEnd - nav.startTime : performance.now(),
    redirectTime: nav ? nav.redirectEnd - nav.redirectStart : 0,
    tlsHandshake:
      nav && nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
  };

  // Calculate resource stats
  const resourceStats = resources.reduce(
    (acc, r) => ({
      count: acc.count + 1,
      size: acc.size + (r.transferSize || 0),
      encodedSize: acc.encodedSize + (r.encodedBodySize || 0),
    }),
    { count: 0, size: 0, encodedSize: 0 }
  );

  // Group resources by type
  const byType: Record<string, number> = {};
  resources.forEach((r) => {
    const type = r.initiatorType || 'other';
    byType[type] = (byType[type] || 0) + (r.transferSize || 0);
  });

  // Find slowest resources
  const slowestResources = resources
    .filter((r) => r.duration > 100)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map((r) => ({
      url: r.name,
      duration: r.duration,
      size: r.transferSize,
    }));

  // Get memory info
  const memory = (performance as { memory?: MemoryInfo }).memory;

  return {
    timestamp: Date.now(),
    webVitals: {
      lcp,
      fid: null, // Requires user interaction
      cls,
      fcp,
      ttfb: nav ? nav.responseStart - nav.startTime : null,
      inp: null, // Requires user interaction
    },
    navigation,
    resources: {
      totalRequests: resourceStats.count,
      totalSize: resourceStats.encodedSize,
      transferSize: resourceStats.size,
      byType,
      slowestResources,
    },
    memory: memory
      ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        }
      : undefined,
    imageOptimizations: [], // Fetched separately via messaging
    renderBlocking: [], // Fetched separately via messaging
    longTasks: [],
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// LayoutShiftEntry interface
type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

export default PerformanceTab;
