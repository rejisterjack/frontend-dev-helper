/**
 * Performance Budget Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle, budget management,
 * and violation detection for the performance-budget content script tool.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  enable,
  disable,
  toggle,
  getState,
  getBudgets,
  addBudget,
  updateBudget,
  removeBudget,
  resetToDefaults,
  setBudget,
  collectMetrics,
  getRecentViolations,
} from '@/content/performance-budget';
import type { PerformanceBudget } from '@/content/performance-budget';

describe('PerformanceBudget', () => {
  beforeEach(async () => {
    // Ensure tool is disabled and reset state
    if (getState().enabled) {
      disable();
    }
    // Clean up DOM
    document.querySelector('#fdh-performance-budget-alert')?.remove();
    // Reset to defaults for clean test state
    await resetToDefaults();
  });

  afterEach(async () => {
    if (getState().enabled) {
      disable();
    }
    await resetToDefaults();
  });

  // --- Lifecycle tests ---

  it('should enable successfully', async () => {
    await enable();
    expect(getState().enabled).toBe(true);
  });

  it('should disable successfully', async () => {
    await enable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should toggle state', async () => {
    expect(getState().enabled).toBe(false);

    await toggle();
    expect(getState().enabled).toBe(true);

    await toggle();
    expect(getState().enabled).toBe(false);
  });

  it('should return correct state via getState', async () => {
    const stateBefore = getState();
    expect(stateBefore.enabled).toBe(false);
    expect(stateBefore.violations).toEqual([]);

    await enable();
    const stateAfter = getState();
    expect(stateAfter.enabled).toBe(true);
  });

  it('should handle double-enable gracefully', async () => {
    await enable();
    await enable();
    expect(getState().enabled).toBe(true);
  });

  it('should handle double-disable gracefully', async () => {
    await enable();
    disable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should clean up DOM elements on disable', async () => {
    await enable();
    disable();
    // Notification overlay should be gone
    expect(document.querySelector('#fdh-performance-budget-alert')).toBeNull();
  });

  // --- Budget management ---

  it('should return default budgets', () => {
    const budgets = getBudgets();
    expect(budgets.length).toBeGreaterThan(0);

    const names = budgets.map((b) => b.name);
    expect(names).toContain('LCP Good');
    expect(names).toContain('FID Good');
    expect(names).toContain('CLS Good');
  });

  it('should add a new budget', async () => {
    const initialCount = getBudgets().length;

    const budget = await addBudget({
      name: 'Test Budget',
      metric: 'lcp',
      threshold: 3000,
      operator: 'less',
      unit: 'ms',
      severity: 'warning',
      enabled: true,
    });

    expect(budget.id).toBeTruthy();
    expect(budget.name).toBe('Test Budget');
    expect(getBudgets().length).toBe(initialCount + 1);
  });

  it('should update a budget', async () => {
    const budgets = getBudgets();
    const lcpBudget = budgets.find((b) => b.metric === 'lcp' && b.name === 'LCP Good');
    expect(lcpBudget).toBeDefined();

    await updateBudget(lcpBudget!.id, { threshold: 9999 });
    const updated = getBudgets().find((b) => b.id === lcpBudget!.id);
    expect(updated!.threshold).toBe(9999);
  });

  it('should remove a budget', async () => {
    const initialCount = getBudgets().length;
    const budgets = getBudgets();
    const firstBudget = budgets[0];

    await removeBudget(firstBudget.id);
    expect(getBudgets().length).toBe(initialCount - 1);
    expect(getBudgets().find((b) => b.id === firstBudget.id)).toBeUndefined();
  });

  it('should reset to default budgets', async () => {
    // Add extra budget
    await addBudget({
      name: 'Extra',
      metric: 'lcp',
      threshold: 10000,
      operator: 'less',
      unit: 'ms',
      severity: 'warning',
      enabled: true,
    });

    expect(getBudgets().length).toBeGreaterThan(7);

    await resetToDefaults();
    expect(getBudgets().length).toBe(7); // Default has 7 budgets
  });

  // --- setBudget ---

  it('should set budget by metric name for existing metric', () => {
    setBudget('lcp', 5000);
    const lcpBudgets = getBudgets().filter((b) => b.metric === 'lcp');
    // At least one LCP budget should have threshold 5000
    expect(lcpBudgets.some((b) => b.threshold === 5000)).toBe(true);
  });

  // --- collectMetrics ---

  it('should collect current performance metrics', () => {
    const metrics = collectMetrics();
    expect(metrics).toHaveProperty('lcp');
    expect(metrics).toHaveProperty('fid');
    expect(metrics).toHaveProperty('cls');
    expect(metrics).toHaveProperty('fcp');
    expect(metrics).toHaveProperty('ttfb');
    expect(metrics).toHaveProperty('resourceCount');
    expect(metrics).toHaveProperty('domSize');
    expect(typeof metrics.resourceCount).toBe('number');
    expect(typeof metrics.domSize).toBe('number');
  });

  // --- getRecentViolations ---

  it('should return recent violations from storage', async () => {
    const violations = await getRecentViolations();
    expect(Array.isArray(violations)).toBe(true);
  });
});
