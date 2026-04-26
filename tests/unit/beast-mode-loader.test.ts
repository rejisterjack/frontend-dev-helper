import { describe, expect, it } from 'vitest';
import {
  getContainerQueryInspector,
  getScrollAnimationsDebugger,
  getViewTransitionsDebugger,
} from '../../src/content/beast-mode-loader';

describe('beast-mode-loader', () => {
  it('caches container query module promise', () => {
    const a = getContainerQueryInspector();
    const b = getContainerQueryInspector();
    expect(a).toBe(b);
  });

  it('caches view transitions module promise', () => {
    const a = getViewTransitionsDebugger();
    const b = getViewTransitionsDebugger();
    expect(a).toBe(b);
  });

  it('caches scroll animations module promise', () => {
    const a = getScrollAnimationsDebugger();
    const b = getScrollAnimationsDebugger();
    expect(a).toBe(b);
  });
});
