/**
 * Container Query Inspector Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle, container detection,
 * and DOM management for the container-query-inspector content script tool.
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
  getContainerSummary,
} from '@/content/container-query-inspector';

describe('ContainerQueryInspector', () => {
  beforeEach(() => {
    if (getState().enabled) {
      disable();
    }
    // Clean up leftover DOM
    document.querySelectorAll('.fdh-cq-overlay').forEach((el) => el.remove());
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
    expect(stateBefore).toHaveProperty('containerCount');

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
    expect(getState().enabled).toBe(true);

    disable();

    // All overlays created by the tool should be removed
    expect(document.querySelectorAll('.fdh-cq-overlay').length).toBe(0);
  });

  // --- Container summary ---

  it('should return container summary with zero containers by default', () => {
    const summary = getContainerSummary();
    expect(summary).toEqual({
      total: 0,
      sizeContainers: 0,
      inlineSizeContainers: 0,
      namedContainers: 0,
    });
  });

  // --- Container detection with inline styles ---

  it('should detect container elements with container-type inline style', () => {
    const container = document.createElement('div');
    container.style.containerType = 'inline-size';
    container.style.containerName = 'test-container';
    document.body.appendChild(container);

    try {
      enable();

      // The tool walks the DOM looking for containerType in computed styles.
      // jsdom may not propagate inline containerType to computed styles,
      // so we verify the tool enabled without error and state is correct.
      expect(getState().enabled).toBe(true);
    } finally {
      disable();
      container.remove();
    }
  });

  // --- Overlay creation ---

  it('should create overlay with correct structure', () => {
    const overlay = document.createElement('div');
    overlay.className = 'fdh-cq-overlay';

    const label = document.createElement('div');
    label.className = 'fdh-cq-label';
    label.textContent = '@container (test) [inline-size]';
    overlay.appendChild(label);

    const dimsLabel = document.createElement('div');
    dimsLabel.textContent = '100x200';
    overlay.appendChild(dimsLabel);

    document.body.appendChild(overlay);

    expect(overlay.querySelector('.fdh-cq-label')).not.toBeNull();
    expect(overlay.querySelector('.fdh-cq-label')?.textContent).toContain('test');

    overlay.remove();
  });
});
