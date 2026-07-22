import { describe, beforeEach, vi, it, expect } from 'vitest';
import { colorPicker } from '@/tools/inspection/color-picker';
import { runStandardToolTests } from '../../helpers';

describe('colorPicker', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(colorPicker, {
    id: 'color-picker',
    name: 'Color Picker',
    category: 'inspection',
    icon: 'Pipette',
  }, {
    format: 'hex',
    copyOnPick: true,
    showTooltip: true,
    includeOpacity: false,
  });

  it('should support different color formats', () => {
    const schema = colorPicker.configSchema;
    expect(schema.format).toBeDefined();
    expect(schema.format.type).toBe('select');
    const values = schema.format.options!.map(o => o.value);
    expect(values).toContain('hex');
    expect(values).toContain('rgb');
    expect(values).toContain('hsl');
  });
});
