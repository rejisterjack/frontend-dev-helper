import { describe, beforeEach, vi, it, expect } from 'vitest';
import { aiAnalyzer } from '@/tools/ai/ai-analyzer';
import { runStandardToolTests } from '../../helpers';

describe('aiAnalyzer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(aiAnalyzer, {
    id: 'ai-analyzer',
    name: 'AI Analyzer',
    category: 'ai',
    icon: 'Bot',
  }, {
    analyzeStructure: true,
    analyzeSemantics: true,
    analyzePatterns: true,
    detailLevel: 'detailed',
  });

  it('should have detail level select', () => {
    const schema = aiAnalyzer.configSchema;
    expect(schema.detailLevel).toBeDefined();
    expect(schema.detailLevel.type).toBe('select');
  });
});
