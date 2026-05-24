import { describe, beforeEach, vi, it, expect } from 'vitest';
import { scrollAnimationsDebugger } from '@/tools/performance/scroll-animations-debugger';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('scrollAnimationsDebugger', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(scrollAnimationsDebugger, {
    id: 'scroll-animations-debugger',
    name: 'Scroll Animations Debugger',
    category: 'performance',
    icon: 'ArrowDown',
  }, {
    showScrollTimeline: true,
    showProgress: true,
    freezeScroll: false,
    highlightTriggers: true,
  });

  it('should be categorized as performance', () => {
    expect(scrollAnimationsDebugger.category).toBe('performance');
  });
});
