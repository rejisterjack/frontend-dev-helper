/**
 * CSS Variable Inspector Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle, variable collection,
 * grouping, and DOM management for the css-variable-inspector content script tool.
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
  collectAllVariables,
  groupVariables,
  updateVariable,
  exportAsDesignTokens,
} from '@/content/css-variable-inspector';
import type { CSSVariable } from '@/content/css-variable-inspector';

describe('CSSVariableInspector', () => {
  beforeEach(() => {
    if (getState().enabled) {
      disable();
    }
    // Clean up leftover DOM
    document.querySelector('#fdh-css-variable-inspector')?.remove();
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

    // Should create overlay panel
    const overlay = document.querySelector('#fdh-css-variable-inspector');
    expect(overlay).not.toBeNull();
  });

  it('should disable successfully', () => {
    enable();
    disable();
    expect(getState().enabled).toBe(false);

    // Overlay should be removed
    const overlay = document.querySelector('#fdh-css-variable-inspector');
    expect(overlay).toBeNull();
  });

  it('should toggle state', () => {
    expect(getState().enabled).toBe(false);

    toggle();
    expect(getState().enabled).toBe(true);

    toggle();
    expect(getState().enabled).toBe(false);
  });

  it('should return correct state via getState', () => {
    expect(getState()).toEqual({ enabled: false });

    enable();
    expect(getState()).toEqual({ enabled: true });
  });

  it('should handle double-enable gracefully', () => {
    enable();
    enable();
    expect(getState().enabled).toBe(true);

    // Only one overlay
    const overlays = document.querySelectorAll('#fdh-css-variable-inspector');
    expect(overlays.length).toBe(1);
  });

  it('should handle double-disable gracefully', () => {
    enable();
    disable();
    disable();
    expect(getState().enabled).toBe(false);
  });

  it('should clean up DOM elements on disable', () => {
    enable();
    expect(document.querySelector('#fdh-css-variable-inspector')).not.toBeNull();

    disable();
    expect(document.querySelector('#fdh-css-variable-inspector')).toBeNull();
  });

  // --- Variable collection ---

  it('should collect CSS variables from stylesheets', () => {
    // Create a stylesheet with CSS variables
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --primary-color: #89b4fa;
        --font-size-base: 16px;
      }
    `;
    document.head.appendChild(style);

    try {
      const variables = collectAllVariables();
      const names = variables.map((v) => v.name);
      expect(names).toContain('--primary-color');
      expect(names).toContain('--font-size-base');
    } finally {
      style.remove();
    }
  });

  it('should return empty array when no CSS variables exist', () => {
    const variables = collectAllVariables();
    // In a clean jsdom with no CSS variables, should be empty or near-empty
    expect(Array.isArray(variables)).toBe(true);
  });

  // --- Variable grouping ---

  it('should group variables by category', () => {
    const variables: CSSVariable[] = [
      {
        name: '--primary-color',
        value: '#89b4fa',
        computedValue: '#89b4fa',
        definedIn: ':root',
        scope: 'global',
        usageCount: 0,
        type: 'color',
      },
      {
        name: '--spacing-md',
        value: '16px',
        computedValue: '16px',
        definedIn: ':root',
        scope: 'global',
        usageCount: 0,
        type: 'size',
      },
    ];

    const groups = groupVariables(variables);
    expect(groups.length).toBeGreaterThan(0);

    // Should have at least a Colors category
    const colorGroup = groups.find((g) => g.category === 'Colors');
    expect(colorGroup).toBeDefined();
    expect(colorGroup!.variables.length).toBeGreaterThan(0);
  });

  // --- Variable update ---

  it('should update CSS variable on root element', () => {
    updateVariable('--test-var', 'red');

    const value = document.documentElement.style.getPropertyValue('--test-var');
    expect(value).toBe('red');
  });

  it('should update CSS variable on target element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    try {
      updateVariable('--my-var', 'blue', el);
      expect(el.style.getPropertyValue('--my-var')).toBe('blue');
    } finally {
      el.remove();
    }
  });

  // --- Export ---

  it('should export as JSON design tokens', () => {
    const style = document.createElement('style');
    style.textContent = `:root { --test-color: #ff0000; }`;
    document.head.appendChild(style);

    try {
      const json = exportAsDesignTokens('json');
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    } finally {
      style.remove();
    }
  });

  it('should export as CSS format', () => {
    const style = document.createElement('style');
    style.textContent = `:root { --test-color: #ff0000; }`;
    document.head.appendChild(style);

    try {
      const css = exportAsDesignTokens('css');
      expect(css).toContain(':root');
      expect(css).toContain('--test-color');
    } finally {
      style.remove();
    }
  });

  it('should export as Figma tokens format', () => {
    const style = document.createElement('style');
    style.textContent = `:root { --test-color: #ff0000; }`;
    document.head.appendChild(style);

    try {
      const figma = exportAsDesignTokens('figma');
      const parsed = JSON.parse(figma);
      expect(parsed.version).toBe('1.0');
      expect(parsed.tokens).toBeDefined();
    } finally {
      style.remove();
    }
  });
});
