/**
 * View Transitions Debugger Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle and DOM management
 * for the view-transitions-debugger content script tool.
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
  enable,
  disable,
  toggle,
  getState,
  isSupported,
} from '@/content/view-transitions-debugger';

describe('ViewTransitionsDebugger', () => {
  beforeEach(() => {
    if (getState().enabled) {
      disable();
    }
    // Clean up leftover DOM
    document.querySelector('.fdh-vt-panel')?.remove();
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

    // Should create debug panel
    const panel = document.querySelector('.fdh-vt-panel');
    expect(panel).not.toBeNull();
  });

  it('should disable successfully', () => {
    enable();
    disable();
    expect(getState().enabled).toBe(false);

    // Panel should be removed
    const panel = document.querySelector('.fdh-vt-panel');
    expect(panel).toBeNull();
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

    // Only one panel
    const panels = document.querySelectorAll('.fdh-vt-panel');
    expect(panels.length).toBe(1);
  });

  it('should handle double-disable gracefully', () => {
    enable();
    disable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should clean up DOM elements on disable', () => {
    enable();
    expect(document.querySelector('.fdh-vt-panel')).not.toBeNull();

    disable();
    expect(document.querySelector('.fdh-vt-panel')).toBeNull();
  });

  // --- API support check ---

  it('should report support status in getState', () => {
    const state = getState();
    // In jsdom, startViewTransition is not available
    expect(typeof state.supported).toBe('boolean');
    expect(state.supported).toBe(false);
  });

  it('should return support status from isSupported', () => {
    // In jsdom, View Transitions API is not available
    expect(typeof isSupported()).toBe('boolean');
  });

  // --- Panel content ---

  it('should show not-supported warning when API unavailable', () => {
    enable();

    const panel = document.querySelector('.fdh-vt-panel');
    expect(panel).not.toBeNull();
    // Should contain a support warning since jsdom doesn't support View Transitions
    expect(panel?.innerHTML).toContain('Not Supported');

    disable();
  });

  it('should display panel with title and status', () => {
    enable();

    const panel = document.querySelector('.fdh-vt-panel');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('View Transitions Debugger');
    expect(panel?.textContent).toContain('Idle');

    disable();
  });
});
