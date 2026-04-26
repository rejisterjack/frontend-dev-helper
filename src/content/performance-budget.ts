/**
 * Performance Budget Alerts
 *
 * Set performance budgets (e.g., "LCP must be < 2.5s")
 * Visual alerts when budgets are exceeded
 * Badge turns red when performance degrades
 */

import { estimateElementCount } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';

export interface PerformanceBudget {
  id: string;
  name: string;
  metric:
    | 'lcp'
    | 'fid'
    | 'cls'
    | 'fcp'
    | 'ttfb'
    | 'inp'
    | 'resourceSize'
    | 'resourceCount'
    | 'domSize';
  threshold: number;
  operator: 'less' | 'greater';
  unit: 'ms' | 's' | 'kb' | 'mb' | 'count';
  severity: 'warning' | 'error';
  enabled: boolean;
}

export interface BudgetViolation {
  budget: PerformanceBudget;
  currentValue: number;
  timestamp: number;
  url: string;
}

interface WebVitals {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
}

// Default budgets based on Core Web Vitals
const DEFAULT_BUDGETS: PerformanceBudget[] = [
  {
    id: 'lcp-good',
    name: 'LCP Good',
    metric: 'lcp',
    threshold: 2500,
    operator: 'less',
    unit: 'ms',
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'lcp-poor',
    name: 'LCP Poor',
    metric: 'lcp',
    threshold: 4000,
    operator: 'less',
    unit: 'ms',
    severity: 'error',
    enabled: true,
  },
  {
    id: 'fid-good',
    name: 'FID Good',
    metric: 'fid',
    threshold: 100,
    operator: 'less',
    unit: 'ms',
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'cls-good',
    name: 'CLS Good',
    metric: 'cls',
    threshold: 0.1,
    operator: 'less',
    unit: 'count',
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'cls-poor',
    name: 'CLS Poor',
    metric: 'cls',
    threshold: 0.25,
    operator: 'less',
    unit: 'count',
    severity: 'error',
    enabled: true,
  },
  {
    id: 'fcp-good',
    name: 'FCP Good',
    metric: 'fcp',
    threshold: 1800,
    operator: 'less',
    unit: 'ms',
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'ttfb-good',
    name: 'TTFB Good',
    metric: 'ttfb',
    threshold: 800,
    operator: 'less',
    unit: 'ms',
    severity: 'warning',
    enabled: true,
  },
];

let budgets: PerformanceBudget[] = [...DEFAULT_BUDGETS];
let violations: BudgetViolation[] = [];
let observer: PerformanceObserver | null = null;
let isActive = false;
let notificationOverlay: HTMLElement | null = null;

/**
 * Load budgets from storage
 */
async function loadBudgets(): Promise<void> {
  const result = await chrome.storage.local.get('fdh_performance_budgets');
  if (result.fdh_performance_budgets) {
    budgets = result.fdh_performance_budgets;
  }
}

/**
 * Save budgets to storage
 */
async function saveBudgets(): Promise<void> {
  await chrome.storage.local.set({ fdh_performance_budgets: budgets });
}

/**
 * Get all budgets
 */
export function getBudgets(): PerformanceBudget[] {
  return [...budgets];
}

/**
 * Add a new budget
 */
export async function addBudget(budget: Omit<PerformanceBudget, 'id'>): Promise<PerformanceBudget> {
  const newBudget: PerformanceBudget = {
    ...budget,
    id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  budgets.push(newBudget);
  await saveBudgets();
  return newBudget;
}

/**
 * Update a budget
 */
export async function updateBudget(id: string, updates: Partial<PerformanceBudget>): Promise<void> {
  const index = budgets.findIndex((b) => b.id === id);
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...updates };
    await saveBudgets();
  }
}

/**
 * Remove a budget
 */
export async function removeBudget(id: string): Promise<void> {
  budgets = budgets.filter((b) => b.id !== id);
  await saveBudgets();
}

/**
 * Reset to default budgets
 */
export async function resetToDefaults(): Promise<void> {
  budgets = [...DEFAULT_BUDGETS];
  await saveBudgets();
}

/**
 * Get current Web Vitals
 */
function getCurrentWebVitals(): WebVitals {
  const vitals: WebVitals = {};

  // Get LCP
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
  if (lcpEntries.length > 0) {
    vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
  }

  // Get FCP
  const fcpEntries = performance.getEntriesByType('paint') as PerformanceEntry[];
  const fcp = fcpEntries.find((e) => e.name === 'first-contentful-paint');
  if (fcp) {
    vitals.fcp = fcp.startTime;
  }

  // Get CLS
  const clsEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[];
  vitals.cls = clsEntries.reduce((acc, entry) => {
    const lsEntry = entry as LayoutShiftEntry;
    return acc + (lsEntry.hadRecentInput ? 0 : lsEntry.value);
  }, 0);

  // Get TTFB
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navEntry) {
    vitals.ttfb = navEntry.responseStart - navEntry.startTime;
  }

  return vitals;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Get resource metrics
 */
function getResourceMetrics(): { size: number; count: number } {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const totalSize = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
  return {
    size: Math.round(totalSize / 1024), // KB
    count: resources.length,
  };
}

/**
 * Get DOM size
 */
function getDOMSize(): number {
  return estimateElementCount(document);
}

/**
 * Check budgets against current metrics
 */
function checkBudgets(): BudgetViolation[] {
  const vitals = getCurrentWebVitals();
  const resources = getResourceMetrics();
  const domSize = getDOMSize();
  const url = window.location.href;
  const timestamp = Date.now();

  const newViolations: BudgetViolation[] = [];

  for (const budget of budgets) {
    if (!budget.enabled) continue;

    let currentValue: number;

    switch (budget.metric) {
      case 'lcp':
        currentValue = vitals.lcp ?? 0;
        break;
      case 'fid':
        currentValue = vitals.fid ?? 0;
        break;
      case 'cls':
        currentValue = vitals.cls ?? 0;
        break;
      case 'fcp':
        currentValue = vitals.fcp ?? 0;
        break;
      case 'ttfb':
        currentValue = vitals.ttfb ?? 0;
        break;
      case 'inp':
        currentValue = vitals.inp ?? 0;
        break;
      case 'resourceSize':
        currentValue = resources.size;
        break;
      case 'resourceCount':
        currentValue = resources.count;
        break;
      case 'domSize':
        currentValue = domSize;
        break;
      default:
        continue;
    }

    // Check if budget is violated
    const isViolated =
      budget.operator === 'less'
        ? currentValue > budget.threshold
        : currentValue < budget.threshold;

    if (isViolated) {
      newViolations.push({
        budget,
        currentValue,
        timestamp,
        url,
      });
    }
  }

  return newViolations;
}

/**
 * Show violation notification
 */
function showViolationNotification(violations: BudgetViolation[]): void {
  if (violations.length === 0) return;

  // Remove existing notification
  notificationOverlay?.remove();

  const hasErrors = violations.some((v) => v.budget.severity === 'error');

  notificationOverlay = document.createElement('div');
  notificationOverlay.id = 'fdh-performance-budget-alert';
  notificationOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 400px;
    background: ${hasErrors ? '#1e1e2e' : '#1e1e2e'};
    border: 2px solid ${hasErrors ? '#f38ba8' : '#f9e2af'};
    border-radius: 12px;
    padding: 16px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #cdd6f4;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    animation: fdh-budget-alert-in 0.3s ease-out;
  `;

  // Filter violations by severity for potential future use
  // const criticalViolations = violations.filter((v) => v.budget.severity === 'error');
  // const warningViolations = violations.filter((v) => v.budget.severity === 'warning');

  notificationOverlay.innerHTML = `
    <style>
      @keyframes fdh-budget-alert-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .fdh-budget-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        font-size: 14px;
      }
      .fdh-budget-icon {
        font-size: 18px;
      }
      .fdh-budget-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .fdh-budget-item {
        background: #313244;
        padding: 10px 12px;
        border-radius: 8px;
        border-left: 3px solid ${hasErrors ? '#f38ba8' : '#f9e2af'};
      }
      .fdh-budget-name {
        font-weight: 500;
        margin-bottom: 4px;
      }
      .fdh-budget-values {
        font-size: 12px;
        color: #a6adc8;
      }
      .fdh-budget-current {
        color: ${hasErrors ? '#f38ba8' : '#f9e2af'};
        font-weight: 600;
      }
      .fdh-budget-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #6c7086;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fdh-budget-close:hover {
        color: #cdd6f4;
      }
    </style>
    <button class="fdh-budget-close">×</button>
    <div class="fdh-budget-header">
      <span class="fdh-budget-icon">${hasErrors ? '🚨' : '⚠️'}</span>
      <span>Performance Budget ${hasErrors ? 'Violations' : 'Warnings'}</span>
    </div>
    <div class="fdh-budget-list">
      ${violations
        .map(
          (v) => `
        <div class="fdh-budget-item">
          <div class="fdh-budget-name">${escapeHtml(v.budget.name)}</div>
          <div class="fdh-budget-values">
            Current: <span class="fdh-budget-current">${escapeHtml(formatValue(v.currentValue, v.budget.unit))}</span> |
            Budget: ${escapeHtml(formatValue(v.budget.threshold, v.budget.unit))}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  // Close button
  notificationOverlay.querySelector('.fdh-budget-close')?.addEventListener('click', () => {
    notificationOverlay?.remove();
    notificationOverlay = null;
  });

  // Auto-dismiss after 10 seconds for warnings, keep errors
  if (!hasErrors) {
    setTimeout(() => {
      notificationOverlay?.remove();
      notificationOverlay = null;
    }, 10000);
  }

  document.body.appendChild(notificationOverlay);
}

/**
 * Format value with unit
 */
function formatValue(value: number, unit: string): string {
  switch (unit) {
    case 'ms':
      return `${Math.round(value)}ms`;
    case 's':
      return `${value.toFixed(2)}s`;
    case 'kb':
      return `${Math.round(value)}KB`;
    case 'mb':
      return `${value.toFixed(2)}MB`;
    case 'count':
    default:
      return value < 0.1 ? value.toFixed(3) : String(Math.round(value));
  }
}

/**
 * Update extension badge based on violations
 */
async function updateBadge(violations: BudgetViolation[]): Promise<void> {
  const errors = violations.filter((v) => v.budget.severity === 'error');
  const warnings = violations.filter((v) => v.budget.severity === 'warning');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      if (errors.length > 0) {
        await chrome.action.setBadgeText({ text: '!', tabId: tab.id });
        await chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId: tab.id }); // Red
        await chrome.action.setTitle({
          title: `FrontendDevHelper - ${errors.length} performance budget error${errors.length > 1 ? 's' : ''}!`,
          tabId: tab.id,
        });
      } else if (warnings.length > 0) {
        await chrome.action.setBadgeText({ text: String(warnings.length), tabId: tab.id });
        await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B', tabId: tab.id }); // Yellow
        await chrome.action.setTitle({
          title: `FrontendDevHelper - ${warnings.length} performance budget warning${warnings.length > 1 ? 's' : ''}`,
          tabId: tab.id,
        });
      }
    }
  } catch (error) {
    logger.error('[PerformanceBudget] Failed to update badge:', error);
  }
}

/**
 * Run budget check
 */
async function runBudgetCheck(): Promise<void> {
  if (!isActive) return;

  const newViolations = checkBudgets();

  // Only show notification if new violations appeared
  const hasNewViolations = newViolations.some(
    (nv) => !violations.some((v) => v.budget.id === nv.budget.id && v.url === nv.url)
  );

  violations = newViolations;

  if (hasNewViolations && newViolations.length > 0) {
    showViolationNotification(newViolations);
    await updateBadge(newViolations);
  }

  // Store violations
  await chrome.storage.local.set({
    fdh_performance_violations: violations.slice(0, 50), // Keep last 50
  });
}

/**
 * Enable performance budget monitoring
 */
export async function enable(): Promise<void> {
  if (isActive) return;
  isActive = true;

  await loadBudgets();

  // Initial check
  await runBudgetCheck();

  // Set up observers
  if ('PerformanceObserver' in window) {
    try {
      observer = new PerformanceObserver(() => {
        // Debounce checks
        setTimeout(runBudgetCheck, 1000);
      });
      // 'web-vitals' is not a valid PerformanceObserver entryType in Chrome
      observer.observe({ entryTypes: ['resource', 'navigation'] });
    } catch {
      // Fallback to periodic checks
      setInterval(runBudgetCheck, 5000);
    }
  } else {
    // Periodic checks
    setInterval(runBudgetCheck, 5000);
  }

  logger.log('[PerformanceBudget] Enabled');
}

/**
 * Disable performance budget monitoring
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  observer?.disconnect();
  observer = null;

  notificationOverlay?.remove();
  notificationOverlay = null;

  logger.log('[PerformanceBudget] Disabled');
}

/**
 * Toggle performance budget monitoring
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
export function getState(): { enabled: boolean; violations: BudgetViolation[] } {
  return { enabled: isActive, violations };
}

/**
 * Get recent violations
 */
export async function getRecentViolations(): Promise<BudgetViolation[]> {
  const result = await chrome.storage.local.get('fdh_performance_violations');
  return result.fdh_performance_violations || [];
}

/**
 * Collect current performance metrics
 */
export function collectMetrics(): {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  resourceCount: number;
  domSize: number;
} {
  const vitals = getCurrentWebVitals();
  return {
    lcp: vitals.lcp ?? null,
    fid: vitals.fid ?? null,
    cls: vitals.cls ?? null,
    fcp: vitals.fcp ?? null,
    ttfb: vitals.ttfb ?? null,
    resourceCount: performance.getEntriesByType('resource').length,
    domSize: estimateElementCount(document),
  };
}

/**
 * Set a budget value
 */
export function setBudget(metric: string, value: number): void {
  const existing = budgets.find((b) => b.metric === metric);
  if (existing) {
    existing.threshold = value;
  } else {
    addBudget({
      metric: metric as PerformanceBudget['metric'],
      name: metric.toUpperCase(),
      threshold: value,
      operator: 'less',
      unit: 'ms',
      severity: 'warning',
      enabled: true,
    });
  }
}

// Export checkBudgets for handlers
export { checkBudgets };

// Default export
export default {
  enable,
  disable,
  toggle,
  getState,
  getBudgets,
  addBudget,
  updateBudget,
  removeBudget,
  resetToDefaults,
  getRecentViolations,
  collectMetrics,
  checkBudgets,
  setBudget,
};
