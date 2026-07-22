import { describe, beforeEach, vi, it, expect } from 'vitest';
import { zIndexVisualizer } from '@/tools/inspection/z-index-visualizer';
import { runStandardToolTests } from '../../helpers';

describe('zIndexVisualizer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(zIndexVisualizer, {
    id: 'z-index-visualizer',
    name: 'Z-Index Visualizer',
    category: 'inspection',
    icon: 'Layers',
  }, {
    minZIndex: 0,
    colorMode: 'gradient',
    showLabels: true,
    showStackingContexts: true,
  });

  it('should have z-index specific config options', () => {
    const schema = zIndexVisualizer.configSchema;
    expect(schema).toBeDefined();
    if (schema?.colorMode) {
      expect(schema.colorMode.type).toBe('select');
    }
  });
});
