import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRunner } from '@/content/tool-runner';

function createMockCtx() {
  const callbacks: (() => void)[] = [];
  return {
    onInvalidated: (cb: () => void) => callbacks.push(cb),
    _callbacks: callbacks,
  };
}

describe('ToolRunner', () => {
  let runner: ToolRunner;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
    runner = new ToolRunner(ctx);
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  it('should create a ToolRunner instance', () => {
    expect(runner).toBeDefined();
  });

  it('should report no active tools initially', () => {
    expect(runner.getActiveToolIds()).toEqual([]);
  });

  it('should report tool as inactive initially', () => {
    expect(runner.isActive('dom-outliner')).toBe(false);
  });

  it('should activate a valid tool', async () => {
    await runner.activate('dom-outliner');
    expect(runner.isActive('dom-outliner')).toBe(true);
    expect(runner.getActiveToolIds()).toContain('dom-outliner');
  });

  it('should deactivate an active tool', async () => {
    await runner.activate('dom-outliner');
    runner.deactivate('dom-outliner');
    expect(runner.isActive('dom-outliner')).toBe(false);
    expect(runner.getActiveToolIds()).not.toContain('dom-outliner');
  });

  it('should handle deactivating an inactive tool gracefully', () => {
    expect(() => runner.deactivate('dom-outliner')).not.toThrow();
  });

  it('should deactivate all tools', async () => {
    await runner.activate('dom-outliner');
    await runner.activate('spacing-visualizer');
    runner.deactivateAll();
    expect(runner.getActiveToolIds()).toEqual([]);
    expect(runner.isActive('dom-outliner')).toBe(false);
    expect(runner.isActive('spacing-visualizer')).toBe(false);
  });

  it('should handle activating unknown tool gracefully', async () => {
    await expect(runner.activate('nonexistent-tool')).resolves.toBeUndefined();
  });

  it('should reactivate a tool when calling activate on already active tool', async () => {
    await runner.activate('dom-outliner');
    expect(runner.isActive('dom-outliner')).toBe(true);
    await runner.activate('dom-outliner');
    expect(runner.isActive('dom-outliner')).toBe(true);
  });

  it('should activate tools from different categories', async () => {
    await runner.activate('dom-outliner');
    await runner.activate('css-inspector');
    await runner.activate('accessibility-audit');
    expect(runner.getActiveToolIds().length).toBe(3);
  });
});
