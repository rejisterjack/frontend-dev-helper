import { describe, beforeEach, vi } from 'vitest';
import { spacingVisualizer } from '@/tools/inspection/spacing-visualizer';
import { runStandardToolTests } from '../../helpers';

describe('spacingVisualizer', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(spacingVisualizer, {
    id: 'spacing-visualizer',
    name: 'Spacing Visualizer',
    category: 'inspection',
    icon: 'Move',
  }, {
    showMargin: true,
    showPadding: true,
    marginColor: '#f97316',
    paddingColor: '#22c55e',
  });
});
