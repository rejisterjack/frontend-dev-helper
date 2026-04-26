/**
 * Performance Profiler Module
 *
 * Provides performance profiling capabilities using the Performance API:
 * - Long task detection (>50ms)
 * - JS execution profiling using PerformanceObserver
 * - Forced reflow detection
 * - Memory allocation tracking
 * - Performance entry collection and analysis
 */

import type { FlameGraphEntry, PerformanceProfile } from '@/types';
import { logger } from '@/utils/logger';
import { TimerManager } from '@/utils/timer-manager';
import { CircularBuffer } from '@/utils/circular-buffer';

// ============================================
// Constants
// ============================================

/** Long task threshold in milliseconds (50ms per RAIL guidelines) */
const LONG_TASK_THRESHOLD = 50;

/** Maximum entries to keep in memory */
const MAX_ENTRIES = 1000;

/** Default profiling duration in milliseconds */
const DEFAULT_DURATION = 10000;

// ============================================
// Types
// ============================================

export interface ProfilerOptions {
  /** Duration to profile in milliseconds */
  duration?: number;
  /** Whether to include memory measurements */
  trackMemory?: boolean;
  /** Whether to detect forced reflows */
  detectForcedReflows?: boolean;
  /** Custom long task threshold in milliseconds */
  longTaskThreshold?: number;
  /** Callback when profiling is complete */
  onComplete?: (profile: PerformanceProfile) => void;
  /** Callback when a long task is detected */
  onLongTask?: (entry: PerformanceEntry) => void;
}

export interface ProfilerState {
  isRunning: boolean;
  startTime: number;
  entries: FlameGraphEntry[];
  longTasks: number;
  forcedReflows: number;
  memorySnapshots: Array<{ timestamp: number; used: number; total: number }>;
}

// ============================================
// State
// ============================================

const timers = new TimerManager();

let isProfiling = false;
let performanceObserver: PerformanceObserver | null = null;
let longTaskObserver: PerformanceObserver | null = null;
let layoutObserver: PerformanceObserver | null = null;
let startTime = 0;
let entries = new CircularBuffer<FlameGraphEntry>({ maxSize: MAX_ENTRIES, strategy: 'drop-oldest' });
let entryIdCounter = 0;
let longTasks = 0;
let forcedReflows = 0;
let memorySnapshots = new CircularBuffer<{ timestamp: number; used: number; total: number }>({ maxSize: 200, strategy: 'drop-oldest' });
let options: ProfilerOptions = {};

// ============================================
// Public API
// ============================================

/**
 * Start performance profiling
 */
export function startProfiling(opts: ProfilerOptions = {}): void {
  if (isProfiling) {
    logger.warn('[PerformanceProfiler] Profiling already in progress');
    return;
  }

  options = opts;
  isProfiling = true;
  startTime = performance.now();
  entries.clear();
  entryIdCounter = 0;
  longTasks = 0;
  forcedReflows = 0;
  memorySnapshots.clear();

  try {
    setupPerformanceObserver();
    setupLongTaskObserver();
    setupLayoutObserver();

    if (opts.trackMemory !== false) {
      startMemoryTracking();
    }

    // Auto-stop after duration
    const duration = opts.duration || DEFAULT_DURATION;
    timers.setTimeout(() => {
      if (isProfiling) {
        stopProfiling();
      }
    }, duration);

    logger.log('[PerformanceProfiler] Profiling started');
  } catch (error) {
    logger.error('[PerformanceProfiler] Failed to start profiling:', error);
    isProfiling = false;
  }
}

/**
 * Stop performance profiling
 */
export function stopProfiling(): PerformanceProfile | null {
  if (!isProfiling) {
    logger.warn('[PerformanceProfiler] No profiling in progress');
    return null;
  }

  isProfiling = false;

  // Disconnect observers
  performanceObserver?.disconnect();
  longTaskObserver?.disconnect();
  layoutObserver?.disconnect();

  // Clean up all pending timers (auto-stop setTimeout + memory setInterval)
  timers.clearAll();

  const profile = buildProfile();

  logger.log('[PerformanceProfiler] Profiling stopped', profile);

  if (options.onComplete) {
    options.onComplete(profile);
  }

  return profile;
}

/**
 * Check if profiling is active
 */
export function isProfilingActive(): boolean {
  return isProfiling;
}

/**
 * Get current profiling state
 */
export function getState(): ProfilerState {
  return {
    isRunning: isProfiling,
    startTime,
    entries: [...entries.items],
    longTasks,
    forcedReflows,
    memorySnapshots: [...memorySnapshots.items],
  };
}

/**
 * Clear all profiling data
 */
export function clear(): void {
  entries.clear();
  entryIdCounter = 0;
  longTasks = 0;
  forcedReflows = 0;
  memorySnapshots.clear();
}

/**
 * Get collected entries
 */
export function getEntries(): FlameGraphEntry[] {
  return [...entries.items];
}

/**
 * Get memory snapshots
 */
export function getMemorySnapshots(): Array<{ timestamp: number; used: number; total: number }> {
  return [...memorySnapshots.items];
}

// ============================================
// Performance Observers
// ============================================

function setupPerformanceObserver(): void {
  if (!('PerformanceObserver' in window)) {
    logger.warn('[PerformanceProfiler] PerformanceObserver not supported');
    return;
  }

  try {
    performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        processPerformanceEntry(entry);
      }
    });

    // Observe various entry types
    const entryTypes = ['mark', 'measure', 'navigation', 'resource'];

    for (const type of entryTypes) {
      try {
        performanceObserver.observe({ entryTypes: [type] });
      } catch {
        // Some entry types might not be supported
      }
    }
  } catch (error) {
    logger.error('[PerformanceProfiler] Failed to setup PerformanceObserver:', error);
  }
}

function setupLongTaskObserver(): void {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks++;

        const threshold = options.longTaskThreshold || LONG_TASK_THRESHOLD;

        if (entry.duration > threshold) {
          const flameEntry = createFlameEntry({
            name: entry.name || 'Long Task',
            startTime: entry.startTime,
            duration: entry.duration,
            type: 'script',
            source: entry.toJSON?.()?.attribution?.[0]?.containerSrc,
          });

          entries.push(flameEntry);

          if (options.onLongTask) {
            options.onLongTask(entry);
          }
        }
      }
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    logger.error('[PerformanceProfiler] Failed to setup long task observer:', error);
  }
}

function setupLayoutObserver(): void {
  if (!options.detectForcedReflows || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    layoutObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Check for layout/paint entries that might indicate forced reflow
        if (
          entry.entryType === 'layout-shift' ||
          (entry.entryType === 'measure' && entry.name.includes('forced-reflow'))
        ) {
          forcedReflows++;

          const flameEntry = createFlameEntry({
            name: `Forced Reflow: ${entry.name}`,
            startTime: entry.startTime,
            duration: entry.duration || 0,
            type: 'layout',
          });

          entries.push(flameEntry);
        }
      }
    });

    try {
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // layout-shift not supported
    }
  } catch (error) {
    logger.error('[PerformanceProfiler] Failed to setup layout observer:', error);
  }
}

function startMemoryTracking(): void {
  if (!('memory' in performance)) {
    return;
  }

  timers.setInterval(() => {
    const memory = (
      performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
    ).memory;

    if (memory) {
      memorySnapshots.push({
        timestamp: performance.now() - startTime,
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
      });
    }
  }, 1000);
}

// ============================================
// Entry Processing
// ============================================

function processPerformanceEntry(entry: PerformanceEntry): void {
  const flameEntry = createFlameEntry({
    name: entry.name,
    startTime: entry.startTime,
    duration: entry.duration || 0,
    type: categorizeEntry(entry),
  });

  entries.push(flameEntry);
}

function categorizeEntry(entry: PerformanceEntry): FlameGraphEntry['type'] {
  const name = entry.name.toLowerCase();
  const entryType = entry.entryType.toLowerCase();

  if (entryType === 'resource') {
    const initiatorType = (entry as PerformanceResourceTiming).initiatorType;

    if (initiatorType === 'script' || name.endsWith('.js')) {
      return 'script';
    }
    if (initiatorType === 'css' || name.endsWith('.css')) {
      return 'layout';
    }
    if (
      ['img', 'image', 'picture'].includes(initiatorType) ||
      /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)
    ) {
      return 'paint';
    }
  }

  if (name.includes('paint') || name.includes('render') || entryType === 'paint') {
    return 'paint';
  }

  if (name.includes('layout') || name.includes('style') || name.includes('reflow')) {
    return 'layout';
  }

  if (name.includes('composite') || name.includes('layer')) {
    return 'composite';
  }

  if (entryType === 'script' || name.includes('script') || name.includes('function')) {
    return 'script';
  }

  return 'other';
}

function createFlameEntry(params: {
  name: string;
  startTime: number;
  duration: number;
  type: FlameGraphEntry['type'];
  source?: string;
  line?: number;
}): FlameGraphEntry {
  return {
    id: `entry-${++entryIdCounter}`,
    name: params.name,
    startTime: params.startTime,
    duration: params.duration,
    endTime: params.startTime + params.duration,
    children: [],
    depth: 0,
    type: params.type,
    source: params.source,
    line: params.line,
  };
}

// ============================================
// Profile Building
// ============================================

function buildProfile(): PerformanceProfile {
  const allEntries = entries.items;
  const now = performance.now();
  const endTime = isProfiling ? now : startTime + allEntries[allEntries.length - 1]?.duration || 0;

  // Calculate summary statistics
  const scriptTime = allEntries
    .filter((e) => e.type === 'script')
    .reduce((sum, e) => sum + e.duration, 0);

  const layoutTime = allEntries
    .filter((e) => e.type === 'layout')
    .reduce((sum, e) => sum + e.duration, 0);

  const paintTime = allEntries
    .filter((e) => e.type === 'paint')
    .reduce((sum, e) => sum + e.duration, 0);

  // Build hierarchical structure
  const rootEntries = buildHierarchy(allEntries);

  return {
    timestamp: Date.now(),
    url: window.location.href,
    entries: rootEntries,
    summary: {
      totalDuration: endTime - startTime,
      scriptTime,
      layoutTime,
      paintTime,
      longTasks,
    },
  };
}

/**
 * Build hierarchical structure from flat entries
 */
export function buildHierarchy(flatEntries: FlameGraphEntry[]): FlameGraphEntry[] {
  if (flatEntries.length === 0) {
    return [];
  }

  // Sort by start time
  const sorted = [...flatEntries].sort((a, b) => a.startTime - b.startTime);

  const roots: FlameGraphEntry[] = [];
  const stack: FlameGraphEntry[] = [];

  for (const entry of sorted) {
    // Pop entries that ended before this one starts
    while (stack.length > 0 && stack[stack.length - 1].endTime <= entry.startTime) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a root entry
      roots.push(entry);
    } else {
      // This entry is a child of the last entry on the stack
      const parent = stack[stack.length - 1];
      entry.parent = parent;
      entry.depth = parent.depth + 1;
      parent.children.push(entry);
    }

    stack.push(entry);
  }

  return roots;
}

/**
 * Filter entries by duration threshold
 */
export function filterByDuration(
  entryList: FlameGraphEntry[],
  minDuration: number
): FlameGraphEntry[] {
  return entryList.filter((entry) => entry.duration >= minDuration);
}

/**
 * Filter entries by type
 */
export function filterByType(
  entryList: FlameGraphEntry[],
  types: FlameGraphEntry['type'][]
): FlameGraphEntry[] {
  return entryList.filter((entry) => types.includes(entry.type));
}

/**
 * Get entries within a time range
 */
export function getEntriesInRange(
  entryList: FlameGraphEntry[],
  start: number,
  end: number
): FlameGraphEntry[] {
  return entryList.filter((entry) => entry.startTime >= start && entry.endTime <= end);
}

// ============================================
// Export singleton
// ============================================

export const performanceProfiler = {
  startProfiling,
  stopProfiling,
  isProfilingActive,
  getState,
  clear,
  getEntries,
  getMemorySnapshots,
  buildHierarchy,
  filterByDuration,
  filterByType,
  getEntriesInRange,
};

export default performanceProfiler;
