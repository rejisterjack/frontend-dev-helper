import { describe, beforeEach, vi, it, expect } from 'vitest';
import { networkAnalyzer } from '@/tools/performance/network-analyzer';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('networkAnalyzer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(networkAnalyzer, {
    id: 'network-analyzer',
    name: 'Network Analyzer',
    category: 'performance',
    icon: 'Wifi',
  }, {
    captureXHR: true,
    captureFetch: true,
    captureImages: true,
    captureScripts: true,
    maxEntries: 100,
    showTiming: true,
  });

  it('should have network-specific config', () => {
    const schema = networkAnalyzer.configSchema;
    expect(schema.captureXHR).toBeDefined();
    expect(schema.captureFetch).toBeDefined();
    expect(schema.maxEntries).toBeDefined();
  });
});
