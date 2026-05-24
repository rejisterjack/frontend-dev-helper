import { describe, beforeEach, vi, it, expect } from 'vitest';
import { responsivePreview } from '@/tools/utilities/responsive-preview';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('responsivePreview', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(responsivePreview, {
    id: 'responsive-preview',
    name: 'Responsive Preview',
    category: 'utility',
    icon: 'Smartphone',
  }, {
    device: 'iphone-14',
    orientation: 'portrait',
    showGrid: false,
  });

  it('should have device select with common devices', () => {
    const schema = responsivePreview.configSchema;
    expect(schema.device).toBeDefined();
    expect(schema.device.type).toBe('select');
    const values = schema.device.options!.map(o => o.value);
    expect(values).toContain('iphone-14');
  });
});
