import { describe, beforeEach, vi, it, expect } from 'vitest';
import { animationInspector } from '@/tools/css/animation-inspector';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('animationInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(animationInspector, {
    id: 'animation-inspector',
    name: 'Animation Inspector',
    category: 'css',
    icon: 'Play',
  }, {
    pauseAll: false,
    showTimeline: true,
    slowMotion: '1x',
    highlightAnimated: true,
  });

  it('should be categorized as css', () => {
    expect(animationInspector.category).toBe('css');
  });
});
