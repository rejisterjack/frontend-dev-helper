import { describe, beforeEach, vi, it, expect } from 'vitest';
import { viewTransitionsDebugger } from '@/tools/inspection/view-transitions-debugger';
import { runStandardToolTests } from '../../helpers';

describe('viewTransitionsDebugger', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(viewTransitionsDebugger, {
    id: 'view-transitions-debugger',
    name: 'View Transitions Debugger',
    category: 'inspection',
    icon: 'RefreshCcw',
  }, {
    captureSnapshots: true,
    slowMotion: false,
    slowMotionDuration: 2000,
    showOverlay: true,
  });

  it('should be categorized as inspection', () => {
    expect(viewTransitionsDebugger.category).toBe('inspection');
  });
});
