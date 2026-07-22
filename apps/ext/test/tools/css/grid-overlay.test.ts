import { describe, beforeEach, vi, it, expect } from 'vitest';
import { gridOverlay } from '@/tools/css/grid-overlay';
import { runStandardToolTests } from '../../helpers';

describe('gridOverlay', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(gridOverlay, {
    id: 'grid-overlay',
    name: 'Grid Overlay',
    category: 'css',
    icon: 'Grid3x3',
  }, {
    showLines: true,
    showAreas: true,
    showTracks: true,
    showNames: true,
    lineColor: '#8b5cf6',
    areaOpacity: 0.15,
  });

  it('should be categorized as css', () => {
    expect(gridOverlay.category).toBe('css');
  });
});
