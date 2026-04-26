/**
 * Framework DevTools Tests
 *
 * Tests the enable/disable/toggle/getState lifecycle and framework detection
 * for the framework-devtools content script tool.
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
  detectFramework,
  getComponentInfo,
  getTailwindClassInfo,
  decodeTailwindClasses,
  createFrameworkInfo,
  getPageFrameworkInfo,
  detectAll,
  getReactComponentTree,
} from '@/content/framework-devtools';
import type { FrameworkType } from '@/content/framework-devtools';

describe('FrameworkDevtools', () => {
  beforeEach(() => {
    if (getState().enabled) {
      disable();
    }
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
    expect(getState()).toEqual({ enabled: false });

    enable();
    expect(getState()).toEqual({ enabled: true });

    disable();
    expect(getState()).toEqual({ enabled: false });
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

  // --- Framework detection ---

  it('should detect "none" framework when no framework markers present', () => {
    const framework = detectFramework();
    expect(framework).toBe('none');
  });

  it('should detect React via __REACT_DEVTOOLS_GLOBAL_HOOK__', () => {
    (window as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    try {
      expect(detectFramework()).toBe('react');
    } finally {
      delete (window as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    }
  });

  it('should detect Vue via __VUE__', () => {
    (window as Record<string, unknown>).__VUE__ = {};
    try {
      expect(detectFramework()).toBe('vue');
    } finally {
      delete (window as Record<string, unknown>).__VUE__;
    }
  });

  it('should detect Angular via ng global', () => {
    (window as Record<string, unknown>).ng = {};
    try {
      expect(detectFramework()).toBe('angular');
    } finally {
      delete (window as Record<string, unknown>).ng;
    }
  });

  it('should detect Svelte via __svelte global', () => {
    (window as Record<string, unknown>).__svelte = {};
    try {
      expect(detectFramework()).toBe('svelte');
    } finally {
      delete (window as Record<string, unknown>).__svelte;
    }
  });

  // --- getComponentInfo ---

  it('should return null from getComponentInfo when no framework detected', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    try {
      expect(getComponentInfo(el)).toBeNull();
    } finally {
      el.remove();
    }
  });

  // --- Tailwind class info ---

  it('should decode known Tailwind classes', () => {
    const result = getTailwindClassInfo('flex');
    expect(result).toBe('display: flex');

    const result2 = getTailwindClassInfo('hidden');
    expect(result2).toBe('display: none');

    const result3 = getTailwindClassInfo('text-xl');
    expect(result3).toBe('font-size: 1.25rem (20px)');
  });

  it('should return null for unknown classes', () => {
    const result = getTailwindClassInfo('my-custom-utility');
    expect(result).toBeNull();
  });

  it('should handle responsive prefixes', () => {
    const result = getTailwindClassInfo('md:flex');
    expect(result).toContain('flex');
    expect(result).toContain('md');
  });

  it('should handle hover prefixes', () => {
    const result = getTailwindClassInfo('hover:flex');
    expect(result).toContain('flex');
    expect(result).toContain('hover');
  });

  // --- decodeTailwindClasses ---

  it('should decode Tailwind classes from an element', () => {
    const el = document.createElement('div');
    el.className = 'flex items-center p-4 bg-white';
    document.body.appendChild(el);

    try {
      const decoded = decodeTailwindClasses(el);
      expect(decoded.length).toBeGreaterThan(0);
      expect(decoded.some((d) => d.class === 'flex')).toBe(true);
    } finally {
      el.remove();
    }
  });

  // --- createFrameworkInfo ---

  it('should return null from createFrameworkInfo when no data', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    try {
      const result = createFrameworkInfo(el);
      expect(result).toBeNull();
    } finally {
      el.remove();
    }
  });

  // --- getPageFrameworkInfo ---

  it('should return framework info with correct type', () => {
    const info = getPageFrameworkInfo();
    expect(info.framework).toBe('none');
  });

  // --- detectAll ---

  it('should return list of all framework detections', () => {
    const detections = detectAll();
    expect(detections).toHaveLength(5);
    expect(detections.map((d) => d.name)).toEqual([
      'react',
      'vue',
      'angular',
      'svelte',
      'tailwind',
    ]);
  });

  // --- getReactComponentTree ---

  it('should return null from getReactComponentTree when no hook agent', () => {
    expect(getReactComponentTree()).toBeNull();
  });
});
