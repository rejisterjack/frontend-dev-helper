import { describe, beforeEach, vi, it, expect } from 'vitest';
import { smartSuggestions } from '@/tools/ai/smart-suggestions';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('smartSuggestions', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(smartSuggestions, {
    id: 'smart-suggestions',
    name: 'Smart Suggestions',
    category: 'ai',
    icon: 'Sparkles',
  }, {
    suggestFixes: true,
    suggestImprovements: true,
    maxSuggestions: 10,
    focusArea: 'all',
  });

  it('should be categorized as ai', () => {
    expect(smartSuggestions.category).toBe('ai');
  });
});
