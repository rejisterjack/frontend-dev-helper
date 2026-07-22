import { describe, beforeEach, vi, it, expect } from 'vitest';
import { performanceBudget } from '@/tools/performance/performance-budget';
import { runStandardToolTests } from '../../helpers';

describe('performanceBudget', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(performanceBudget, {
    id: 'performance-budget',
    name: 'Performance Budget',
    category: 'performance',
    icon: 'Gauge',
  }, {
    maxDOMNodes: 1500,
    maxBundleSize: 300,
    maxImages: 50,
    maxFCP: 1800,
    maxLCP: 2500,
    maxCLS: 0.1,
  });

  it('should have budget config options', () => {
    const schema = performanceBudget.configSchema;
    expect(schema.maxDOMNodes).toBeDefined();
    expect(schema.maxDOMNodes.type).toBe('number');
    expect(schema.maxFCP).toBeDefined();
    expect(schema.maxLCP).toBeDefined();
  });
});
