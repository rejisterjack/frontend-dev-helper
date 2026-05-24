import { describe, beforeEach, vi, it, expect } from 'vitest';
import { focusDebuggerA11y } from '@/tools/accessibility/focus-debugger-a11y';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('focusDebuggerA11y', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(focusDebuggerA11y, {
    id: 'focus-debugger-a11y',
    name: 'Focus Debugger (A11y)',
    category: 'accessibility',
    icon: 'Eye',
  }, {
    showFocusOrder: true,
    showTrapRegions: true,
    highlightSkipLinks: true,
    showAriaRoles: true,
    simulateScreenReader: false,
  });

  it('should be categorized as accessibility', () => {
    expect(focusDebuggerA11y.category).toBe('accessibility');
  });

  it('should have accessibility-specific config options', () => {
    const schema = focusDebuggerA11y.configSchema;
    expect(schema.showFocusOrder).toBeDefined();
    expect(schema.showTrapRegions).toBeDefined();
    expect(schema.highlightSkipLinks).toBeDefined();
    expect(schema.showAriaRoles).toBeDefined();
    expect(schema.simulateScreenReader).toBeDefined();
  });
});
