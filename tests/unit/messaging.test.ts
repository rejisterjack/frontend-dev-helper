/**
 * Messaging Utilities Tests
 *
 * Unit tests for message utilities and helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, sendMessageToTab, createMessageHandler } from '@/utils/messaging';

// Mock chrome APIs
const mockSendMessage = vi.fn();
const mockQuery = vi.fn();
const mockSendMessageToTab = vi.fn();

// @ts-expect-error - mocking chrome global
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  },
  tabs: {
    query: mockQuery,
    sendMessage: mockSendMessageToTab,
  },
};

describe('Messaging Utilities', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockQuery.mockClear();
    mockSendMessageToTab.mockClear();
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true, data: 'response' });

      const result = await sendMessage({ type: 'TEST', payload: {} });

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'TEST', payload: {} });
      expect(result).toEqual({ success: true, data: 'response' });
    });

    it('should throw error when response indicates failure', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: false, error: 'Failed' });

      await expect(sendMessage({ type: 'TEST' })).rejects.toThrow('Failed');
    });

    it('should throw error when sendMessage fails', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(sendMessage({ type: 'TEST' })).rejects.toThrow('Connection lost');
    });

    it('should include timestamp in message', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true });

      await sendMessage({ type: 'TEST' });

      const sentMessage = mockSendMessage.mock.calls[0][0];
      expect(sentMessage.timestamp).toBeDefined();
      expect(typeof sentMessage.timestamp).toBe('number');
    });
  });

  describe('sendMessageToTab', () => {
    it('should send message to active tab', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 123 }]);
      mockSendMessageToTab.mockResolvedValueOnce({ success: true });

      const result = await sendMessageToTab({ type: 'TEST' });

      expect(mockQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockSendMessageToTab).toHaveBeenCalledWith(123, { type: 'TEST', timestamp: expect.any(Number) });
      expect(result).toEqual({ success: true });
    });

    it('should throw error when no active tab', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(sendMessageToTab({ type: 'TEST' })).rejects.toThrow('No active tab found');
    });

    it('should throw error when tab has no id', async () => {
      mockQuery.mockResolvedValueOnce([{}]);

      await expect(sendMessageToTab({ type: 'TEST' })).rejects.toThrow('Tab has no ID');
    });

    it('should throw error when message to tab fails', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 123 }]);
      mockSendMessageToTab.mockRejectedValueOnce(new Error('Tab error'));

      await expect(sendMessageToTab({ type: 'TEST' })).rejects.toThrow('Tab error');
    });
  });

  describe('createMessageHandler', () => {
    it('should create handler that routes messages correctly', async () => {
      const handlers = {
        MSG_1: vi.fn().mockResolvedValue({ result: 'msg1' }),
        MSG_2: vi.fn().mockResolvedValue({ result: 'msg2' }),
      };

      const messageHandler = createMessageHandler(handlers);
      const sendResponse = vi.fn();

      const result = messageHandler({ type: 'MSG_1' }, {}, sendResponse);

      expect(result).toBe(true); // Async handler
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({ result: 'msg1' });
    });

    it('should handle unknown message types', async () => {
      const handlers = {
        KNOWN: vi.fn(),
      };

      const messageHandler = createMessageHandler(handlers);
      const sendResponse = vi.fn();

      messageHandler({ type: 'UNKNOWN' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type: UNKNOWN',
      });
    });

    it('should handle handler errors', async () => {
      const handlers = {
        FAILING: vi.fn().mockRejectedValue(new Error('Handler failed')),
      };

      const messageHandler = createMessageHandler(handlers);
      const sendResponse = vi.fn();

      messageHandler({ type: 'FAILING' }, {}, sendResponse);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Handler failed',
      });
    });
  });
});
