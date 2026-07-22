import { describe, beforeEach, vi, it, expect } from 'vitest';
import { cssScanner } from '@/tools/css/css-scanner';
import { runStandardToolTests } from '../../helpers';

describe('cssScanner', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(cssScanner, {
    id: 'css-scanner',
    name: 'CSS Scanner',
    category: 'css',
    icon: 'Search',
  }, {
    scanUnused: true,
    scanDuplicates: true,
    scanSpecificity: true,
    scanImportants: true,
    maxResults: 50,
  });

  it('should be categorized as css', () => {
    expect(cssScanner.category).toBe('css');
  });
});
