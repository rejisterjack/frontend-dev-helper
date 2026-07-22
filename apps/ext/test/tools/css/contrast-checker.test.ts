import { describe, beforeEach, vi, it, expect } from 'vitest';
import { contrastChecker } from '@/tools/css/contrast-checker';
import { runStandardToolTests } from '../../helpers';

describe('contrastChecker', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(contrastChecker, {
    id: 'contrast-checker',
    name: 'Contrast Checker',
    category: 'css',
    icon: 'Contrast',
  }, {
    standard: 'aa',
    scanAll: true,
    highlightFailing: true,
    showRatio: true,
    failingColor: '#ef4444',
  });

  it('should be categorized as css', () => {
    expect(contrastChecker.category).toBe('css');
  });
});
