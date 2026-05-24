import { describe, beforeEach, vi, it, expect } from 'vitest';
import { componentTree } from '@/tools/inspection/component-tree';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('componentTree', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(componentTree, {
    id: 'component-tree',
    name: 'Component Tree',
    category: 'inspection',
    icon: 'GitBranch',
  }, {
    maxDepth: 6,
    showProps: true,
    showState: false,
    highlightUpdates: true,
    collapseThreshold: 50,
  });

  it('should have maxDepth slider with correct range', () => {
    const schema = componentTree.configSchema;
    expect(schema.maxDepth).toBeDefined();
    expect(schema.maxDepth.type).toBe('slider');
    expect(schema.maxDepth.min).toBe(1);
    expect(schema.maxDepth.max).toBe(15);
  });
});
