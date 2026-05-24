import { describe, beforeEach, vi, it, expect } from 'vitest';
import { elementInspector } from '@/tools/inspection/element-inspector';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('elementInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(elementInspector, {
    id: 'element-inspector',
    name: 'Element Inspector',
    category: 'inspection',
    icon: 'Scan',
  }, {
    showComputedStyles: true,
    showBoxModel: true,
    showEventListeners: false,
    showAccessibility: true,
    maxStyles: 20,
  });

  it('should have a maxStyles slider config', () => {
    const schema = elementInspector.configSchema;
    expect(schema.maxStyles).toBeDefined();
    expect(schema.maxStyles.type).toBe('slider');
    expect(schema.maxStyles.min).toBe(5);
    expect(schema.maxStyles.max).toBe(50);
  });
});
