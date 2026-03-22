import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getToolState,
  setToolState,
  getAllToolStates,
  clearAllStates,
  toggleToolState,
  getTabToolState,
  setTabToolState,
  clearTabStates,
  copyGlobalStatesToTab,
  migrateStorage,
  getSettings,
  updateSettings,
  getActiveToolsCount,
  hasActiveTools,
} from '@/utils/storage';
import { TOOL_IDS, type ToolId } from '@/constants';

// Mock chrome.storage
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (keys === null || keys === undefined) {
          return mockStorage;
        }
        if (typeof keys === 'string') {
          return { [keys]: mockStorage[keys] };
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            result[key] = mockStorage[key];
          }
          return result;
        }
        return keys;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          delete mockStorage[keys];
        } else {
          for (const key of keys) {
            delete mockStorage[key];
          }
        }
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(async () => ({})),
  },
});

describe('Storage Utils', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getToolState', () => {
    it('should return default state for unknown tool', async () => {
      const state = await getToolState(TOOL_IDS.DOM_OUTLINER);
      expect(state).toEqual({ enabled: false, settings: {} });
    });

    it('should return stored global state', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: { color: 'red' } });
      const state = await getToolState(TOOL_IDS.DOM_OUTLINER);
      expect(state?.enabled).toBe(true);
      expect(state?.settings).toEqual({ color: 'red' });
    });

    it('should return tab-specific state when tabId provided', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} }, 123);
      const state = await getToolState(TOOL_IDS.DOM_OUTLINER, 123);
      expect(state?.enabled).toBe(true);
    });

    it('should fallback to global state when no tab-specific state', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      const state = await getToolState(TOOL_IDS.DOM_OUTLINER, 123);
      expect(state?.enabled).toBe(true);
    });
  });

  describe('setToolState', () => {
    it('should store global state', async () => {
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: { showMargins: true } });
      const stored = await getToolState(TOOL_IDS.SPACING_VISUALIZER);
      expect(stored?.enabled).toBe(true);
      expect(stored?.settings).toEqual({ showMargins: true });
    });

    it('should store tab-specific state', async () => {
      await setToolState(TOOL_IDS.FONT_INSPECTOR, { enabled: true, settings: {} }, 456);
      const stored = await getToolState(TOOL_IDS.FONT_INSPECTOR, 456);
      expect(stored?.enabled).toBe(true);
    });

    it('should update existing state', async () => {
      await setToolState(TOOL_IDS.COLOR_PICKER, { enabled: false, settings: {} });
      await setToolState(TOOL_IDS.COLOR_PICKER, { enabled: true, settings: { format: 'hex' } });
      const stored = await getToolState(TOOL_IDS.COLOR_PICKER);
      expect(stored?.enabled).toBe(true);
      expect(stored?.settings).toEqual({ format: 'hex' });
    });
  });

  describe('getAllToolStates', () => {
    it('should return all tools with defaults when storage is empty', async () => {
      const states = await getAllToolStates();
      expect(Object.keys(states).length).toBeGreaterThan(0);
      expect(states[TOOL_IDS.DOM_OUTLINER]).toBeDefined();
      expect(states[TOOL_IDS.DOM_OUTLINER].enabled).toBe(false);
    });

    it('should merge global and tab-specific states', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: {} }, 789);
      
      const states = await getAllToolStates(789);
      expect(states[TOOL_IDS.DOM_OUTLINER].enabled).toBe(true); // from global
      expect(states[TOOL_IDS.SPACING_VISUALIZER].enabled).toBe(true); // from tab
    });
  });

  describe('toggleToolState', () => {
    it('should toggle from false to true', async () => {
      const newState = await toggleToolState(TOOL_IDS.PIXEL_RULER);
      expect(newState).toBe(true);
      const stored = await getToolState(TOOL_IDS.PIXEL_RULER);
      expect(stored?.enabled).toBe(true);
    });

    it('should toggle from true to false', async () => {
      await setToolState(TOOL_IDS.PIXEL_RULER, { enabled: true, settings: {} });
      const newState = await toggleToolState(TOOL_IDS.PIXEL_RULER);
      expect(newState).toBe(false);
    });

    it('should work with tab-specific state', async () => {
      const newState = await toggleToolState(TOOL_IDS.RESPONSIVE_BREAKPOINT, 100);
      expect(newState).toBe(true);
      const stored = await getToolState(TOOL_IDS.RESPONSIVE_BREAKPOINT, 100);
      expect(stored?.enabled).toBe(true);
    });
  });

  describe('clearAllStates', () => {
    it('should clear all global states', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: {} });
      
      await clearAllStates({ global: true });
      
      const states = await getAllToolStates();
      expect(states[TOOL_IDS.DOM_OUTLINER].enabled).toBe(false);
      expect(states[TOOL_IDS.SPACING_VISUALIZER].enabled).toBe(false);
    });

    it('should clear tab-specific states', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} }, 200);
      await clearAllStates({ specificTabId: 200 });
      
      const state = await getToolState(TOOL_IDS.DOM_OUTLINER, 200);
      expect(state?.enabled).toBe(false);
    });

    it('should clear everything when no options provided', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: {} }, 300);
      
      await clearAllStates();
      
      const globalStates = await getAllToolStates();
      expect(globalStates[TOOL_IDS.DOM_OUTLINER].enabled).toBe(false);
    });
  });

  describe('tab-specific helpers', () => {
    it('getTabToolState should work as alias', async () => {
      await setTabToolState(100, TOOL_IDS.FONT_INSPECTOR, { enabled: true, settings: {} });
      const state = await getTabToolState(100, TOOL_IDS.FONT_INSPECTOR);
      expect(state?.enabled).toBe(true);
    });

    it('clearTabStates should clear all tools for a tab', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} }, 150);
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: {} }, 150);
      
      await clearTabStates(150);
      
      expect((await getToolState(TOOL_IDS.DOM_OUTLINER, 150))?.enabled).toBe(false);
      expect((await getToolState(TOOL_IDS.SPACING_VISUALIZER, 150))?.enabled).toBe(false);
    });

    it('copyGlobalStatesToTab should copy global state to tab', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: { color: 'blue' } });
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: false, settings: {} });
      
      await copyGlobalStatesToTab(250);
      
      const domState = await getToolState(TOOL_IDS.DOM_OUTLINER, 250);
      expect(domState?.enabled).toBe(true);
      expect(domState?.settings).toEqual({ color: 'blue' });
    });
  });

  describe('migrateStorage', () => {
    it('should initialize storage version when empty', async () => {
      const result = await migrateStorage();
      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should skip when already up to date', async () => {
      await migrateStorage(); // First migration
      const result = await migrateStorage(); // Second should skip
      expect(result.changes).toContain('Storage is up to date');
    });
  });

  describe('getSettings', () => {
    it('should return default settings when none stored', async () => {
      const settings = await getSettings();
      expect(settings).toBeDefined();
      expect(settings.version).toBeDefined();
    });

    it('should merge stored settings with defaults', async () => {
      await updateSettings({ theme: 'light' as 'dark' });
      const settings = await getSettings();
      expect(settings.theme).toBe('light');
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      await updateSettings({ theme: 'dark' });
      const settings = await getSettings();
      expect(settings.theme).toBe('dark');
    });

    it('should merge partial updates', async () => {
      await updateSettings({ theme: 'dark' });
      await updateSettings({ autoOpenDevTools: true });
      const settings = await getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.autoOpenDevTools).toBe(true);
    });
  });

  describe('getActiveToolsCount', () => {
    it('should return default enabled tools count when no explicit state', async () => {
      // COMMAND_PALETTE and AI_SUGGESTIONS have defaultEnabled: true
      const count = await getActiveToolsCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should count active tools', async () => {
      // First disable all tools to get a baseline
      const allStates = await getAllToolStates();
      for (const toolId of Object.keys(allStates)) {
        await setToolState(toolId as ToolId, { enabled: false, settings: {} });
      }
      
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      await setToolState(TOOL_IDS.SPACING_VISUALIZER, { enabled: true, settings: {} });
      
      const count = await getActiveToolsCount();
      expect(count).toBe(2);
    });

    it('should count tab-specific active tools', async () => {
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} }, 400);
      
      const count = await getActiveToolsCount(400);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('hasActiveTools', () => {
    it('should return true when default-enabled tools exist', async () => {
      // COMMAND_PALETTE and AI_SUGGESTIONS have defaultEnabled: true
      const hasActive = await hasActiveTools();
      expect(hasActive).toBe(true);
    });

    it('should return true when tools are explicitly activated', async () => {
      // First disable all
      const allStates = await getAllToolStates();
      for (const toolId of Object.keys(allStates)) {
        await setToolState(toolId as ToolId, { enabled: false, settings: {} });
      }
      
      await setToolState(TOOL_IDS.DOM_OUTLINER, { enabled: true, settings: {} });
      const hasActive = await hasActiveTools();
      expect(hasActive).toBe(true);
    });
  });
});
