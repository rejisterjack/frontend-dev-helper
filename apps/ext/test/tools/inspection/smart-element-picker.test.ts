import { describe, beforeEach, vi, it, expect } from 'vitest';
import { smartElementPicker } from '@/tools/inspection/smart-element-picker';
import { runStandardToolTests } from '../../helpers';

describe('smartElementPicker', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(smartElementPicker, {
    id: 'smart-element-picker',
    name: 'Smart Element Picker',
    category: 'inspection',
    icon: 'MousePointerClick',
  }, {
    selectorType: 'css',
    copyOnClick: true,
    showSelectorBar: true,
    preferClass: true,
  });

  it('should be categorized as inspection', () => {
    expect(smartElementPicker.category).toBe('inspection');
  });
});
