import { describe, beforeEach, vi, it, expect } from 'vitest';
import { layoutVisualizer } from '@/tools/css/layout-visualizer';
import { runStandardToolTests } from '../../helpers';

describe('layoutVisualizer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(layoutVisualizer, {
    id: 'layout-visualizer',
    name: 'Layout Visualizer',
    category: 'css',
    icon: 'LayoutGrid',
  }, {
    showFlex: true,
    showGrid: true,
    showBlock: false,
    showAlignment: true,
    showGaps: true,
  });

  it('should be categorized as css', () => {
    expect(layoutVisualizer.category).toBe('css');
  });
});
