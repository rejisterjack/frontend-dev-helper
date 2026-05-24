import { describe, beforeEach, vi, it, expect } from 'vitest';
import { fontInspector } from '@/tools/inspection/font-inspector';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('fontInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const p = document.createElement('p');
    p.textContent = 'Hello World';
    document.body.appendChild(p);
    vi.clearAllMocks();
  });

  runStandardToolTests(fontInspector, {
    id: 'font-inspector',
    name: 'Font Inspector',
    category: 'inspection',
    icon: 'Type',
  }, {
    showFontFamily: true,
    showFontSize: true,
    highlightOnHover: false,
  });

  it('should have font-specific config fields', () => {
    const schema = fontInspector.configSchema;
    expect(schema.showFontFamily).toBeDefined();
    expect(schema.showFontSize).toBeDefined();
    expect(schema.showLineHeight).toBeDefined();
    expect(schema.showFontWeight).toBeDefined();
    expect(schema.showLetterSpacing).toBeDefined();
    expect(schema.highlightOnHover).toBeDefined();
  });
});
