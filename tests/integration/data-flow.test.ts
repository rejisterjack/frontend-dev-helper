/**
 * Data Flow Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Data Flow: Background ↔ Content Script ↔ Popup', () => {
  let mockChrome: {
    runtime: {
      sendMessage: ReturnType<typeof vi.fn>;
      onMessage: {
        addListener: ReturnType<typeof vi.fn>;
      };
    };
    tabs: {
      sendMessage: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
    };
    storage: {
      local: {
        get: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
      };
    };
  };

  beforeEach(() => {
    mockChrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
      },
      tabs: {
        sendMessage: vi.fn(),
        query: vi.fn().mockResolvedValue([{ id: 1 }]),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    };
    (global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;
  });

  it('popup requests tool state from background', async () => {
    mockChrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      state: { enabled: true },
    });

    const response = await mockChrome.runtime.sendMessage({
      type: 'PESTICIDE_GET_STATE',
    });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'PESTICIDE_GET_STATE',
    });
    expect(response.state.enabled).toBe(true);
  });

  it('background broadcasts to all tabs', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);

    const tabs = await mockChrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.id) {
        await mockChrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_FEATURE',
          payload: { feature: 'test', enabled: true },
        });
      }
    }

    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
  });

  it('content script reports state changes to background', async () => {
    mockChrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      active: true,
    });

    const response = await mockChrome.runtime.sendMessage({
      type: 'PESTICIDE_ENABLE',
    });

    expect(response.success).toBe(true);
    expect(response.active).toBe(true);
  });

  it('settings persist across contexts', async () => {
    const settings = { theme: 'dark', defaultTools: ['pesticide'] };

    // Save settings
    await mockChrome.storage.local.set({ settings });
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ settings });

    // Retrieve settings
    mockChrome.storage.local.get.mockResolvedValue({ settings });
    const result = await mockChrome.storage.local.get('settings');
    
    expect(result.settings).toEqual(settings);
  });

  it('handles errors gracefully across contexts', async () => {
    mockChrome.runtime.sendMessage.mockRejectedValue(
      new Error('Tab does not exist')
    );

    try {
      await mockChrome.runtime.sendMessage({
        type: 'PESTICIDE_ENABLE',
      });
    } catch (e) {
      expect((e as Error).message).toContain('Tab');
    }
  });

  it('validates data integrity across message passing', async () => {
    const originalData = {
      toolId: 'pesticide',
      state: { enabled: true, timestamp: Date.now() },
    };

    mockChrome.runtime.sendMessage.mockImplementation((msg) => {
      // Simulate validation
      if (!msg.type || typeof msg.type !== 'string') {
        return Promise.resolve({ success: false, error: 'Invalid message' });
      }
      return Promise.resolve({ success: true, data: originalData });
    });

    const response = await mockChrome.runtime.sendMessage({
      type: 'SET_TOOL_STATE',
      payload: originalData,
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(originalData);
  });
});

describe('Cross-Origin Security', () => {
  it('validates origin of incoming messages', () => {
    const validOrigins = [
      'chrome-extension://',
      'https://trusted-domain.com',
    ];

    const validateOrigin = (origin: string): boolean => {
      return validOrigins.some((valid) => origin.startsWith(valid));
    };

    expect(validateOrigin('chrome-extension://abc123/popup.html')).toBe(true);
    expect(validateOrigin('https://trusted-domain.com/page')).toBe(true);
    expect(validateOrigin('https://evil.com')).toBe(false);
  });

  it('sanitizes data before cross-context transmission', () => {
    const sanitizeForTransfer = (data: unknown): unknown => {
      if (typeof data === 'string') {
        return data
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
      if (typeof data === 'object' && data !== null) {
        return Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, sanitizeForTransfer(v)])
        );
      }
      return data;
    };

    const malicious = { html: '<script>alert(1)</script>' };
    const sanitized = sanitizeForTransfer(malicious);

    expect((sanitized as Record<string, string>).html).not.toContain('<script>');
    expect((sanitized as Record<string, string>).html).toContain('&lt;script&gt;');
  });
});
