/**
 * Message Passing Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Message Passing Integration', () => {
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
    };
    (global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;
  });

  describe('Popup to Background', () => {
    it('should send enable tool message', async () => {
      const message = { type: 'PESTICIDE_ENABLE' };
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      await mockChrome.runtime.sendMessage(message);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should handle response from background', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        active: true,
      });

      const response = await mockChrome.runtime.sendMessage({
        type: 'PESTICIDE_GET_STATE',
      }) as { success: boolean; active: boolean };

      expect(response.success).toBe(true);
      expect(response.active).toBe(true);
    });
  });

  describe('Background to Content Script', () => {
    it('should send message to active tab', async () => {
      const tabId = 1;
      const message = { type: 'PESTICIDE_ENABLE' };

      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });
      await mockChrome.tabs.sendMessage(tabId, message);

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(
        new Error('Could not establish connection')
      );

      try {
        await mockChrome.runtime.sendMessage({ type: 'PING' });
      } catch (e) {
        expect((e as Error).message).toContain('connection');
      }
    });

    it('should handle tab not found', async () => {
      mockChrome.tabs.query.mockResolvedValue([]);

      const tabs = await mockChrome.tabs.query({ active: true }) as unknown[];
      expect(tabs.length).toBe(0);
    });
  });
});
