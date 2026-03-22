/**
 * Messaging Utilities Tests
 *
 * Unit tests for message utilities and helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, sendMessageToActiveTabSimple, createMessageHandler } from '@/utils/messaging';

// Mock chrome APIs
const mockSendMessage = vi.fn();
const mockQuery = vi.fn();
const mockSendMessageToTab = vi.fn();

// @ts-expect-error - mocking chrome global
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
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

    it('should throw error when sendMessage rejects', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(sendMessage({ type: 'TEST' })).rejects.toThrow('Connection lost');
    });

    it('should pass the message as-is (no auto-enrichment)', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true });

      await sendMessage({ type: 'TEST' });

      const sentMessage = mockSendMessage.mock.calls[0][0];
      expect(sentMessage.type).toBe('TEST');
    });
  });

  describe('sendMessageToActiveTabSimple', () => {
    it('should send message to active tab with timestamp', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 123 }]);
      mockSendMessageToTab.mockResolvedValueOnce({ success: true });

      const result = await sendMessageToActiveTabSimple({ type: 'TEST' });

      expect(mockQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockSendMessageToTab).toHaveBeenCalledWith(
        123,
        { type: 'TEST', timestamp: expect.any(Number) }
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw when no active tab exists', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(sendMessageToActiveTabSimple({ type: 'TEST' })).rejects.toThrow('No active tab found');
    });

    it('should throw when active tab has no id', async () => {
      mockQuery.mockResolvedValueOnce([{}]);

      await expect(sendMessageToActiveTabSimple({ type: 'TEST' })).rejects.toThrow('Tab has no ID');
    });

    it('should propagate tab send errors', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 123 }]);
      mockSendMessageToTab.mockRejectedValueOnce(new Error('Tab error'));

      await expect(sendMessageToActiveTabSimple({ type: 'TEST' })).rejects.toThrow('Tab error');
    });
  });

  describe('createMessageHandler', () => {
    it('should route messages to the matching handler', async () => {
      const handlers = {
        MSG_1: vi.fn().mockResolvedValue({ result: 'msg1' }),
        MSG_2: vi.fn().mockResolvedValue({ result: 'msg2' }),
      };

      const messageHandler = createMessageHandler(handlers);
      const sendResponse = vi.fn();

      const result = messageHandler({ type: 'MSG_1' }, {} as chrome.runtime.MessageSender, sendResponse);

      expect(result).toBe(true); // Async — channel stays open
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({ result: 'msg1' });
    });

    it('should respond with error for unknown message types', () => {
      const messageHandler = createMessageHandler({ KNOWN: vi.fn() });
      const sendResponse = vi.fn();

      const result = messageHandler({ type: 'UNKNOWN' }, {} as chrome.runtime.MessageSender, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type: UNKNOWN',
      });
    });

    it('should catch handler errors and respond with failure', async () => {
      const handlers = {
        FAILING: vi.fn().mockRejectedValue(new Error('Handler failed')),
      };

      const messageHandler = createMessageHandler(handlers);
      const sendResponse = vi.fn();

      messageHandler({ type: 'FAILING' }, {} as chrome.runtime.MessageSender, sendResponse);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Handler failed',
      });
    });
  });
});
