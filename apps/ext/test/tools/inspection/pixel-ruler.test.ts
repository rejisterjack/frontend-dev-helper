import { describe, beforeEach, vi, it, expect } from 'vitest';
import { pixelRuler } from '@/tools/inspection/pixel-ruler';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('pixelRuler', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(pixelRuler, {
    id: 'pixel-ruler',
    name: 'Pixel Ruler',
    category: 'inspection',
    icon: 'Ruler',
  }, {
    unit: 'px',
    showGuides: true,
    snapToGrid: false,
    gridSize: 8,
    showDimensions: true,
  });

  it('should support different measurement units', () => {
    const schema = pixelRuler.configSchema;
    expect(schema.unit).toBeDefined();
    expect(schema.unit.type).toBe('select');
    const values = schema.unit.options!.map(o => o.value);
    expect(values).toContain('px');
    expect(values).toContain('rem');
    expect(values).toContain('em');
  });
});
