/**
 * Smart Element Picker Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle and DOM management
 * for the smart-element-picker content script tool.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock logger before importing the module
vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import smartElementPicker from '@/content/smart-element-picker';
import { enable, disable, toggle, getState } from '@/content/smart-element-picker';

describe('SmartElementPicker', () => {
  beforeEach(() => {
    // Ensure tool is disabled before each test
    if (getState().enabled) {
      disable();
    }
    // Clean up any leftover DOM elements
    document.querySelector('#fdh-smart-picker-indicator')?.remove();
    document.querySelector('#fdh-smart-picker-highlight')?.remove();
    document.querySelector('#fdh-smart-picker-panel')?.remove();
  });

  afterEach(() => {
    // Clean up after each test
    if (getState().enabled) {
      disable();
    }
  });

  it('should enable successfully', () => {
    enable();

    expect(getState().enabled).toBe(true);

    // Should add event listeners and visual indicator
    const indicator = document.querySelector('#fdh-smart-picker-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain('Smart Picker Active');
  });

  it('should disable successfully', () => {
    enable();
    expect(getState().enabled).toBe(true);

    disable();
    expect(getState().enabled).toBe(false);

    // Indicator should be removed
    const indicator = document.querySelector('#fdh-smart-picker-indicator');
    expect(indicator).toBeNull();
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
    expect(stateBefore).toEqual({ enabled: false });

    enable();
    const stateAfter = getState();
    expect(stateAfter).toEqual({ enabled: true });
  });

  it('should handle double-enable gracefully', () => {
    enable();
    expect(getState().enabled).toBe(true);

    // Second enable should be a no-op (not throw)
    enable();
    expect(getState().enabled).toBe(true);

    // Should still have exactly one indicator
    const indicators = document.querySelectorAll('#fdh-smart-picker-indicator');
    expect(indicators.length).toBe(1);
  });

  it('should handle double-disable gracefully', () => {
    enable();
    disable();
    expect(getState().enabled).toBe(false);

    // Second disable should be a no-op (not throw)
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should clean up DOM elements on disable', () => {
    enable();

    // Simulate a click that creates highlight and panel by dispatching
    // mousemove then click on a target element
    const target = document.createElement('button');
    target.textContent = 'Click me';
    document.body.appendChild(target);

    // Dispatch mousemove to create highlight
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(moveEvent, 'target', { value: target, writable: false });
    document.dispatchEvent(moveEvent);

    // Now disable and verify cleanup
    disable();

    expect(document.querySelector('#fdh-smart-picker-indicator')).toBeNull();
    expect(document.querySelector('#fdh-smart-picker-highlight')).toBeNull();
    expect(document.querySelector('#fdh-smart-picker-panel')).toBeNull();

    target.remove();
  });

  it('should respond to Escape key to disable', () => {
    enable();
    expect(getState().enabled).toBe(true);

    // Simulate pressing Escape
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    document.dispatchEvent(escapeEvent);

    expect(getState().enabled).toBe(false);
  });

  it('should have a default export with lifecycle methods', () => {
    expect(smartElementPicker.enable).toBeTypeOf('function');
    expect(smartElementPicker.disable).toBeTypeOf('function');
    expect(smartElementPicker.toggle).toBeTypeOf('function');
    expect(smartElementPicker.getState).toBeTypeOf('function');
  });
});
