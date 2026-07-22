import { describe, beforeEach, vi, it, expect } from 'vitest';
import { breakpointOverlay } from '@/tools/css/breakpoint-overlay';
import { runStandardToolTests } from '../../helpers';

describe('breakpointOverlay', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(breakpointOverlay, {
    id: 'breakpoint-overlay',
    name: 'Breakpoint Overlay',
    category: 'css',
    icon: 'Monitor',
  }, {
    showIndicator: true,
    showAllBreakpoints: false,
    highlightActive: true,
    position: 'top-right',
  });

  it('should be categorized as css', () => {
    expect(breakpointOverlay.category).toBe('css');
  });
});
