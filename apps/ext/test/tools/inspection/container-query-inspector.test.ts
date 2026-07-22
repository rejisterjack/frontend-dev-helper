import { describe, beforeEach, vi, it, expect } from 'vitest';
import { containerQueryInspector } from '@/tools/inspection/container-query-inspector';
import { runStandardToolTests } from '../../helpers';

describe('containerQueryInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(containerQueryInspector, {
    id: 'container-query-inspector',
    name: 'Container Query Inspector',
    category: 'inspection',
    icon: 'Containers',
  }, {
    highlightContainers: true,
    showBreakpoints: true,
    showMatchedRules: true,
    liveResize: true,
  });

  it('should be categorized as inspection', () => {
    expect(containerQueryInspector.category).toBe('inspection');
  });
});
