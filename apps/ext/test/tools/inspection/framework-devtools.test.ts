import { describe, beforeEach, vi, it, expect } from 'vitest';
import { frameworkDevtools } from '@/tools/inspection/framework-devtools';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('frameworkDevtools', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(frameworkDevtools, {
    id: 'framework-devtools',
    name: 'Framework DevTools',
    category: 'inspection',
    icon: 'Code2',
  }, {
    framework: 'auto',
  });

  it('should be categorized as inspection', () => {
    expect(frameworkDevtools.category).toBe('inspection');
  });
});
