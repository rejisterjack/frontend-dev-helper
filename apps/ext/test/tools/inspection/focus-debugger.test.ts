import { describe, beforeEach, vi, it, expect } from 'vitest';
import { focusDebugger } from '@/tools/inspection/focus-debugger';
import { runStandardToolTests } from '../../helpers';

describe('focusDebugger', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const btn = document.createElement('button');
    btn.textContent = 'Click me';
    document.body.appendChild(btn);
    vi.clearAllMocks();
  });

  runStandardToolTests(focusDebugger, {
    id: 'focus-debugger',
    name: 'Focus Debugger',
    category: 'inspection',
    icon: 'Focus',
  }, {
    showFocusOrder: true,
    showTabindex: true,
    highlightFocused: true,
    showFocusRing: true,
    trapFocus: false,
  });

  it('should have focus-specific config options', () => {
    const schema = focusDebugger.configSchema;
    expect(schema.showFocusOrder).toBeDefined();
    expect(schema.showTabindex).toBeDefined();
    expect(schema.highlightFocused).toBeDefined();
    expect(schema.showFocusRing).toBeDefined();
    expect(schema.trapFocus).toBeDefined();
  });
});
