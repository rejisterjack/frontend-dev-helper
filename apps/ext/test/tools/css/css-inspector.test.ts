import { describe, beforeEach, vi, it, expect } from 'vitest';
import { cssInspector } from '@/tools/css/css-inspector';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('cssInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(cssInspector, {
    id: 'css-inspector',
    name: 'CSS Inspector',
    category: 'css',
    icon: 'Eye',
  }, {
    showInherited: false,
    showBrowserDefaults: false,
    groupByProperty: true,
    maxRules: 30,
  });

  it('should be categorized as css', () => {
    expect(cssInspector.category).toBe('css');
  });
});
