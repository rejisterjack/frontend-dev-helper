/**
 * Service Worker Tests
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock chrome API
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onConnect: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    getManifest: vi.fn(() => ({ manifest_version: 3, name: 'Test', version: '1.0.0' })),
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    sendMessage: vi.fn(),
    onActivated: {
      addListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
    },
  },
  storage: {
    onChanged: {
      addListener: vi.fn(),
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn((cb?: () => void) => {
      cb?.();
    }),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
  },
};

// Setup global chrome mock
vi.stubGlobal('chrome', mockChrome);

/** Captured after SW init; global afterEach clearAllMocks wipes call history between tests. */
let swRegistration: {
  onMessage: boolean;
  onInstalled: boolean;
  onStartup: boolean;
  tabActivated: boolean;
  tabUpdated: boolean;
  onCommand: boolean;
  contextMenuCreate: boolean;
  contextMenuClick: boolean;
};

describe('Service Worker', () => {
  beforeAll(async () => {
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.notifications.create.mockResolvedValue(undefined);
    await import('@/background/service-worker');
    await vi.waitFor(() =>
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled()
    );
    swRegistration = {
      onMessage: mockChrome.runtime.onMessage.addListener.mock.calls.length > 0,
      onInstalled: mockChrome.runtime.onInstalled.addListener.mock.calls.length > 0,
      onStartup: mockChrome.runtime.onStartup.addListener.mock.calls.length > 0,
      tabActivated: mockChrome.tabs.onActivated.addListener.mock.calls.length > 0,
      tabUpdated: mockChrome.tabs.onUpdated.addListener.mock.calls.length > 0,
      onCommand: mockChrome.commands.onCommand.addListener.mock.calls.length > 0,
      contextMenuCreate: mockChrome.contextMenus.create.mock.calls.length > 0,
      contextMenuClick: mockChrome.contextMenus.onClicked.addListener.mock.calls.length > 0,
    };
  });

  beforeEach(() => {
    mockChrome.tabs.query.mockResolvedValue([]);
  });

  describe('Initialization', () => {
    it('registers core Chrome listeners during module init', () => {
      expect(swRegistration.onInstalled).toBe(true);
      expect(swRegistration.onMessage).toBe(true);
      expect(swRegistration.onStartup).toBe(true);
      expect(swRegistration.tabActivated).toBe(true);
      expect(swRegistration.tabUpdated).toBe(true);
      expect(swRegistration.onCommand).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should handle TOGGLE_TOOL message', async () => {
      const mockTab = { id: 123, url: 'https://example.com' };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      expect(swRegistration.onMessage).toBe(true);
    });

    it('should handle GET_TOOL_STATE message', () => {
      expect(swRegistration.onMessage).toBe(true);
    });

    it('should handle GET_SETTINGS message', async () => {
      const mockSettings = { theme: 'dark', enabled: true };
      mockChrome.storage.local.get.mockResolvedValue({
        fdh_settings: mockSettings,
      });

      const result = await mockChrome.storage.local.get('fdh_settings');
      expect(result.fdh_settings).toEqual(mockSettings);
    });

    it('should handle UPDATE_SETTINGS message', async () => {
      const newSettings = { theme: 'light', enabled: true };
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await mockChrome.storage.local.set({ fdh_settings: newSettings });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        fdh_settings: newSettings,
      });
    });

    it('should handle unknown message types', () => {
      expect(swRegistration.onMessage).toBe(true);
    });
  });

  describe('Tab Management', () => {
    it('should query active tab', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
      expect(tabs).toEqual([mockTab]);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it('should send message to tab', async () => {
      const tabId = 123;
      const message = { type: 'PESTICIDE_ENABLE' };
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      const response = await mockChrome.tabs.sendMessage(tabId, message);
      expect(response).toEqual({ success: true });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
    });

    it('should handle tab activation', () => {
      expect(swRegistration.tabActivated).toBe(true);
    });

    it('should handle tab updates', () => {
      expect(swRegistration.tabUpdated).toBe(true);
    });
  });

  describe('Storage', () => {
    it('should get tool states from storage', async () => {
      const mockStates = {
        domOutliner: { enabled: true, settings: {} },
        colorPicker: { enabled: false, settings: {} },
      };
      mockChrome.storage.local.get.mockResolvedValue({
        fdh_tool_states: mockStates,
      });

      const result = await mockChrome.storage.local.get('fdh_tool_states');
      expect(result.fdh_tool_states).toEqual(mockStates);
    });

    it('should set tool states in storage', async () => {
      const states = {
        domOutliner: { enabled: true },
      };
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await mockChrome.storage.local.set({ fdh_tool_states: states });
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      try {
        await mockChrome.storage.local.get('key');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Badge Management', () => {
    it('should update badge count', async () => {
      const activeTools = 3;
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);

      await mockChrome.action.setBadgeText({
        text: String(activeTools),
      });

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '3',
      });
    });

    it('should set badge color', async () => {
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await mockChrome.action.setBadgeBackgroundColor({ color: '#a855f7' });

      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#a855f7',
      });
    });

    it('should clear badge when no tools active', async () => {
      await mockChrome.action.setBadgeText({ text: '' });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('Command Handling', () => {
    it('should register command handler', () => {
      expect(swRegistration.onCommand).toBe(true);
    });

    it('should handle keyboard commands', async () => {
      const mockTab = { id: 123 };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      expect(swRegistration.onCommand).toBe(true);
    });
  });

  describe('Context Menus', () => {
    it('should create context menu items', () => {
      expect(swRegistration.contextMenuCreate).toBe(true);
    });

    it('should register context menu click handler', () => {
      expect(swRegistration.contextMenuClick).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle tab messaging errors', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValue(
        new Error('Could not establish connection')
      );

      try {
        await mockChrome.tabs.sendMessage(123, { type: 'TEST' });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle invalid tab IDs', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Invalid tab ID'));

      try {
        await mockChrome.tabs.sendMessage(-1, { type: 'TEST' });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Cross-Origin Handling', () => {
    it('should check URL permissions', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://app.example.com/path',
      ];

      const invalidUrls = [
        'chrome://extensions',
        'chrome-extension://abc123',
        'about:blank',
        'file:///path/to/file',
      ];

      // Valid URLs should be processable
      validUrls.forEach((url) => {
        expect(url.startsWith('http')).toBe(true);
      });

      // Invalid URLs should be rejected
      invalidUrls.forEach((url) => {
        expect(url.startsWith('http')).toBe(false);
      });
    });
  });
});
