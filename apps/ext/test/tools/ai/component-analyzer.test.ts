import { describe, beforeEach, vi, it, expect } from 'vitest';
import { componentAnalyzer } from '@/tools/ai/component-analyzer';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('componentAnalyzer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(componentAnalyzer, {
    id: 'component-analyzer',
    name: 'Component Analyzer',
    category: 'ai',
    icon: 'Puzzle',
  }, {
    targetFramework: 'react',
    generateCode: true,
    analyzeProps: true,
    analyzeState: true,
  });

  it('should have targetFramework select', () => {
    const schema = componentAnalyzer.configSchema;
    expect(schema.targetFramework).toBeDefined();
    expect(schema.targetFramework.type).toBe('select');
    const values = schema.targetFramework.options!.map(o => o.value);
    expect(values).toContain('react');
  });
});
