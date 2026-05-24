import { describe, beforeEach, vi, it, expect } from 'vitest';
import { cssVariableInspector } from '@/tools/css/css-variable-inspector';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('cssVariableInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(cssVariableInspector, {
    id: 'css-variable-inspector',
    name: 'CSS Variable Inspector',
    category: 'css',
    icon: 'Variable',
  }, {
    groupByScope: true,
    showComputed: true,
    showFallbacks: false,
    filterPrefix: '',
  });

  it('should be categorized as css', () => {
    expect(cssVariableInspector.category).toBe('css');
  });
});
