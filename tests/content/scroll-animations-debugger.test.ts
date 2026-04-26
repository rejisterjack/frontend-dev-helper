/**
 * Scroll Animations Debugger Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle and DOM management
 * for the scroll-animations-debugger content script tool.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// CSS.supports is not available in jsdom; provide a minimal mock
if (typeof CSS === 'undefined' || !CSS.supports) {
  Object.defineProperty(globalThis, 'CSS', {
    value: { supports: vi.fn(() => false) },
    writable: true,
    configurable: true,
  });
}

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  enable,
  disable,
  toggle,
  getState,
  isSupported,
  getAnimationSummary,
} from '@/content/scroll-animations-debugger';

describe('ScrollAnimationsDebugger', () => {
  beforeEach(() => {
    if (getState().enabled) {
      disable();
    }
    // Clean up leftover DOM
    document.querySelectorAll('.fdh-sa-overlay').forEach((el) => el.remove());
    document.querySelector('.fdh-sa-hud')?.remove();
    document.querySelector('.fdh-sa-no-animations')?.remove();
  });

  afterEach(() => {
    if (getState().enabled) {
      disable();
    }
  });

  // --- Lifecycle tests ---

  it('should enable successfully', () => {
    enable();
    expect(getState().enabled).toBe(true);
  });

  it('should disable successfully', () => {
    enable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should toggle state', () => {
    expect(getState().enabled).toBe(false);

    toggle();
    expect(getState().enabled).toBe(true);

    toggle();
    expect(getState().enabled).toBe(false);
  });

  it('should return correct state via getState', () => {
    const stateBefore = getState();
    expect(stateBefore.enabled).toBe(false);
    expect(stateBefore).toHaveProperty('supported');

    enable();
    const stateAfter = getState();
    expect(stateAfter.enabled).toBe(true);
  });

  it('should handle double-enable gracefully', () => {
    enable();
    enable();
    expect(getState().enabled).toBe(true);
  });

  it('should handle double-disable gracefully', () => {
    enable();
    disable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should clean up DOM elements on disable', () => {
    enable();

    // When enabled with no scroll animations, it creates a "no animations" message
    const noAnimMsg = document.querySelector('.fdh-sa-no-animations');
    expect(noAnimMsg).not.toBeNull();

    disable();

    // All overlays should be removed
    expect(document.querySelector('.fdh-sa-overlay')).toBeNull();
    expect(document.querySelector('.fdh-sa-hud')).toBeNull();
    expect(document.querySelector('.fdh-sa-no-animations')).toBeNull();
  });

  // --- API support check ---

  it('should report support status in getState', () => {
    const state = getState();
    expect(typeof state.supported).toBe('boolean');
  });

  it('should return support status from isSupported', () => {
    // In jsdom, CSS.supports may or may not support animation-timeline
    expect(typeof isSupported()).toBe('boolean');
  });

  // --- Animation summary ---

  it('should return animation summary with zero animations when none present', () => {
    const summary = getAnimationSummary();
    expect(summary).toEqual({
      total: 0,
      scrollTimelines: 0,
      viewTimelines: 0,
    });
  });

  // --- DOM interaction ---

  it('should show no-animations message when no scroll animations found', () => {
    enable();

    // No scroll animations in test environment
    const msg = document.querySelector('.fdh-sa-no-animations');
    expect(msg).not.toBeNull();
    expect(msg?.textContent).toContain('No Scroll Animations Found');

    disable();
  });
});
