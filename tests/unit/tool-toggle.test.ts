import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_IDS } from '@/constants';
import { applyToolEnabledInTab, toggleToolInTab } from '@/utils/tool-toggle';
import * as storage from '@/utils/storage';

vi.mock('@/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/utils/storage')>('@/utils/storage');
  return {
    ...actual,
    getToolState: vi.fn(),
    setToolState: vi.fn(),
  };
});

describe('tool-toggle', () => {
  beforeEach(() => {
    vi.mocked(storage.getToolState).mockReset();
    vi.mocked(storage.setToolState).mockReset();
    vi.mocked(storage.setToolState).mockResolvedValue(undefined);
    vi.mocked(chrome.tabs.sendMessage).mockReset();
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({});
  });

  it('applyToolEnabledInTab disables exclusive peers before enabling', async () => {
    vi.mocked(storage.getToolState).mockImplementation(async (id) => {
      if (id === TOOL_IDS.SMART_ELEMENT_PICKER) {
        return { enabled: true, settings: { x: 1 } };
      }
      if (id === TOOL_IDS.ELEMENT_INSPECTOR) {
        return { enabled: false, settings: {} };
      }
      return { enabled: false, settings: {} };
    });

    await applyToolEnabledInTab(7, TOOL_IDS.ELEMENT_INSPECTOR, true);

    expect(storage.setToolState).toHaveBeenCalledWith(TOOL_IDS.SMART_ELEMENT_PICKER, {
      enabled: false,
      settings: { x: 1 },
    });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'SMART_ELEMENT_PICKER_DISABLE' });
    expect(storage.setToolState).toHaveBeenCalledWith(TOOL_IDS.ELEMENT_INSPECTOR, {
      enabled: true,
      settings: {},
    });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: 'INSPECTOR_ENABLE' });
  });

  it('toggleToolInTab flips enabled state', async () => {
    vi.mocked(storage.getToolState).mockImplementation(async () => ({
      enabled: false,
      settings: { a: 1 },
    }));

    const next = await toggleToolInTab(3, TOOL_IDS.DOM_OUTLINER);

    expect(next).toBe(true);
    expect(storage.setToolState).toHaveBeenCalledWith(TOOL_IDS.DOM_OUTLINER, {
      enabled: true,
      settings: { a: 1 },
    });
  });
});
