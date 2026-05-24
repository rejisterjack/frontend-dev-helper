import { describe, beforeEach, vi, it, expect } from 'vitest';
import { visualRegression } from '@/tools/utilities/visual-regression';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('visualRegression', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(visualRegression, {
    id: 'visual-regression',
    name: 'Visual Regression',
    category: 'utility',
    icon: 'Image',
  }, {
    threshold: 1,
    captureViewport: true,
    captureFullPage: false,
    highlightDiffs: true,
    diffColor: '#ff00ff',
  });

  it('should be categorized as utility', () => {
    expect(visualRegression.category).toBe('utility');
  });
});
