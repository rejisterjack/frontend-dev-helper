import { describe, it, expect, vi, beforeEach } from 'vitest';
import { domOutliner } from '@/tools/inspection/dom-outliner';

function createMockCtx() {
  const callbacks: (() => void)[] = [];
  return {
    onInvalidated: (cb: () => void) => callbacks.push(cb),
    _callbacks: callbacks,
  };
}

function setupDOM() {
  const div = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = 'Hello';
  const span = document.createElement('span');
  span.textContent = 'World';
  div.appendChild(p);
  div.appendChild(span);
  document.body.appendChild(div);
}

describe('domOutliner', () => {
  beforeEach(() => {
    document.body.textContent = '';
    setupDOM();
    vi.clearAllMocks();
  });

  it('should have correct tool metadata', () => {
    expect(domOutliner.id).toBe('dom-outliner');
    expect(domOutliner.name).toBe('DOM Outliner');
    expect(domOutliner.description).toBeDefined();
    expect(domOutliner.category).toBe('inspection');
    expect(domOutliner.icon).toBe('Box');
  });

  it('should have valid config fields', () => {
    const schema = domOutliner.configSchema;
    expect(schema).toBeDefined();
    expect(schema.showLabels).toBeDefined();
    expect(schema.showLabels.type).toBe('boolean');
    expect(schema.showLabels.default).toBe(true);
    expect(schema.outlineColor).toBeDefined();
    expect(schema.outlineColor.type).toBe('color');
    expect(schema.maxDepth).toBeDefined();
    expect(schema.maxDepth.type).toBe('slider');
    expect(schema.maxDepth.min).toBe(1);
    expect(schema.maxDepth.max).toBe(10);
    expect(schema.targetTags).toBeDefined();
    expect(schema.targetTags.type).toBe('select');
    expect(schema.targetTags.options).toHaveLength(3);
    expect(schema.excludeHidden).toBeDefined();
    expect(schema.excludeHidden.type).toBe('boolean');
  });

  it('should return a cleanup function from run()', () => {
    const ctx = createMockCtx();
    const cleanup = domOutliner.run(ctx, {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('should register onInvalidated callback', () => {
    const ctx = createMockCtx();
    domOutliner.run(ctx, {});
    expect(ctx._callbacks.length).toBeGreaterThan(0);
  });

  it('should accept config options', () => {
    const ctx = createMockCtx();
    const cleanup = domOutliner.run(ctx, {
      showLabels: false,
      maxDepth: 3,
      excludeHidden: false,
      targetTags: 'all',
    });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('should not throw when document has no elements', () => {
    document.body.textContent = '';
    const ctx = createMockCtx();
    const cleanup = domOutliner.run(ctx, {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
