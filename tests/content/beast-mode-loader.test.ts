/**
 * Beast Mode Loader Tests
 *
 * Tests the lazy-loading module that dynamically imports
 * container-query-inspector, view-transitions-debugger, and
 * scroll-animations-debugger.
 *
 * Also exercises the enable/disable/toggle/getState lifecycle
 * of the container-query-inspector through the loader.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  getContainerQueryInspector,
  getViewTransitionsDebugger,
  getScrollAnimationsDebugger,
} from '@/content/beast-mode-loader';

describe('BeastModeLoader', () => {
  // --- Lazy loading ---

  it('should lazy-load container-query-inspector module', async () => {
    const module = await getContainerQueryInspector();

    expect(module).toBeDefined();
    expect(module.enable).toBeTypeOf('function');
    expect(module.disable).toBeTypeOf('function');
    expect(module.toggle).toBeTypeOf('function');
    expect(module.getState).toBeTypeOf('function');
    expect(module.getContainerSummary).toBeTypeOf('function');
  });

  it('should lazy-load view-transitions-debugger module', async () => {
    const module = await getViewTransitionsDebugger();

    expect(module).toBeDefined();
    expect(module.enable).toBeTypeOf('function');
    expect(module.disable).toBeTypeOf('function');
    expect(module.toggle).toBeTypeOf('function');
    expect(module.getState).toBeTypeOf('function');
    expect(module.isSupported).toBeTypeOf('function');
  });

  it('should lazy-load scroll-animations-debugger module', async () => {
    const module = await getScrollAnimationsDebugger();

    expect(module).toBeDefined();
    expect(module.enable).toBeTypeOf('function');
    expect(module.disable).toBeTypeOf('function');
    expect(module.toggle).toBeTypeOf('function');
    expect(module.getState).toBeTypeOf('function');
    expect(module.isSupported).toBeTypeOf('function');
    expect(module.getAnimationSummary).toBeTypeOf('function');
  });

  // --- Caching ---

  it('should return the same promise for repeated calls', async () => {
    const promise1 = getContainerQueryInspector();
    const promise2 = getContainerQueryInspector();

    expect(promise1).toBe(promise2);

    const [mod1, mod2] = await Promise.all([promise1, promise2]);
    expect(mod1).toBe(mod2);
  });

  // --- Container Query Inspector lifecycle through loader ---

  describe('Container Query Inspector (via loader)', () => {
    let cqi: typeof import('@/content/container-query-inspector');

    beforeEach(async () => {
      cqi = await getContainerQueryInspector();
      if (cqi.getState().enabled) {
        cqi.disable();
      }
      document.querySelectorAll('.fdh-cq-overlay').forEach((el) => el.remove());
    });

    afterEach(() => {
      if (cqi.getState().enabled) {
        cqi.disable();
      }
    });

    it('should enable container-query-inspector successfully', () => {
      cqi.enable();
      expect(cqi.getState().enabled).toBe(true);
    });

    it('should disable container-query-inspector successfully', () => {
      cqi.enable();
      cqi.disable();
      expect(cqi.getState().enabled).toBe(false);
    });

    it('should toggle container-query-inspector state', () => {
      expect(cqi.getState().enabled).toBe(false);

      cqi.toggle();
      expect(cqi.getState().enabled).toBe(true);

      cqi.toggle();
      expect(cqi.getState().enabled).toBe(false);
    });

    it('should return correct state via getState', () => {
      const state = cqi.getState();
      expect(state.enabled).toBe(false);
      expect(state.containerCount).toBe(0);
    });

    it('should handle double-enable gracefully', () => {
      cqi.enable();
      cqi.enable();
      expect(cqi.getState().enabled).toBe(true);
    });

    it('should handle double-disable gracefully', () => {
      cqi.enable();
      cqi.disable();
      cqi.disable();
      expect(cqi.getState().enabled).toBe(false);
    });

    it('should clean up DOM elements on disable', () => {
      cqi.enable();
      expect(cqi.getState().enabled).toBe(true);

      cqi.disable();
      expect(cqi.getState().enabled).toBe(false);

      // All overlays created by the tool should be removed
      expect(document.querySelectorAll('.fdh-cq-overlay').length).toBe(0);
    });
  });
});
