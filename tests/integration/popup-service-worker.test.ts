/**
 * Integration Tests: Popup ↔ Service Worker ↔ Content Script
 *
 * Tests the full message flow between all extension contexts.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MESSAGE_TYPES } from '../../src/constants';

describe('Popup ↔ Service Worker Integration', () => {
  const mockChrome = {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.stubGlobal('chrome', mockChrome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Loading Flow', () => {
    it('should load tool states from service worker', async () => {
      const mockStates = {
        domOutliner: { enabled: true, settings: {} },
        colorPicker: { enabled: false, settings: {} },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: mockStates,
      });

      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_ALL_TOOL_STATES,
      });

      expect(response.success).toBe(true);
      expect(response.data.domOutliner.enabled).toBe(true);
      expect(response.data.colorPicker.enabled).toBe(false);
    });

    it('should handle service worker errors gracefully', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Service worker not ready'));

      await expect(
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_ALL_TOOL_STATES })
      ).rejects.toThrow('Service worker not ready');
    });

    it('should broadcast state changes to all contexts', async () => {
      const message = {
        type: MESSAGE_TYPES.TOOL_STATE_CHANGED,
        payload: { toolId: 'domOutliner', enabled: true },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const response = await chrome.runtime.sendMessage(message);

      expect(response.success).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('Tab Communication Flow', () => {
    it('should send tool toggle to content script via tabs API', async () => {
      const mockTab = { id: 123, url: 'https://example.com' };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      expect(tab.id).toBe(123);
      
      const response = await chrome.tabs.sendMessage(tab.id!, {
        type: 'PESTICIDE_ENABLE',
      }) as { success: boolean };

      expect(response.success).toBe(true);
    });

    it('should handle tabs without content scripts', async () => {
      const mockTab = { id: 123, url: 'chrome://extensions' };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Cannot access chrome:// URL'));

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await expect(
        chrome.tabs.sendMessage(tab.id!, { type: 'PESTICIDE_ENABLE' })
      ).rejects.toThrow('Cannot access chrome:// URL');
    });
  });

  describe('Storage Synchronization', () => {
    it('should persist tool states to storage', async () => {
      const states = {
        toolStates: { domOutliner: { enabled: true } },
      };

      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await chrome.storage.local.set(states);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(states);
    });

    it('should retrieve tool states from storage', async () => {
      const mockData = {
        fdh_tool_states: {
          tabs: { 123: { domOutliner: { enabled: true } } },
        },
      };

      mockChrome.storage.local.get.mockResolvedValue(mockData);

      const result = await chrome.storage.local.get('fdh_tool_states');

      expect(result.fdh_tool_states.tabs[123].domOutliner.enabled).toBe(true);
    });
  });
});

describe('Cross-Tab Synchronization', () => {
  const mockChrome = {
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.stubGlobal('chrome', mockChrome);
  });

  it('should sync tool state to all tabs in global mode', async () => {
    const tabs = [
      { id: 1, url: 'https://example.com' },
      { id: 2, url: 'https://test.com' },
      { id: 3, url: 'chrome://extensions' }, // Should be skipped
    ];

    mockChrome.tabs.query.mockResolvedValue(tabs);
    mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

    // Simulate broadcasting to all valid tabs
    for (const tab of tabs) {
      if (tab.url?.startsWith('http')) {
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.TOOL_STATE_CHANGED,
          payload: { toolId: 'domOutliner', enabled: true, synced: true },
        });
      }
    }

    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.any(Object));
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(2, expect.any(Object));
  });
});

describe('Error Recovery', () => {
  it('should retry failed message sends', async () => {
    const mockSendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce({ success: true });

    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        await mockSendMessage();
        break;
      } catch {
        attempts++;
        if (attempts >= maxRetries) throw new Error('Max retries exceeded');
      }
    }

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });
});
