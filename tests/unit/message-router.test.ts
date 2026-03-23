/**
 * Message Router Tests
 *
 * Unit tests for the background script message router.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageRouter } from '@/background/message-router';

describe('MessageRouter', () => {
  let router: MessageRouter;
  let mockChrome: typeof chrome;

  beforeEach(() => {
    // Create fresh instance
    router = new MessageRouter();
    
    // Mock chrome.runtime.sendMessage and onMessage
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
          hasListener: vi.fn(),
        },
        sendMessage: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as unknown as typeof chrome;
    
    (global as unknown as { chrome: unknown }).chrome = mockChrome;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty handler map', () => {
      expect(router).toBeDefined();
    });
  });

  describe('registerHandler', () => {
    it('should register a message handler', () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      router.registerHandler('TEST_MESSAGE', handler);
      
      expect(router.getHandler('TEST_MESSAGE')).toBe(handler);
    });

    it('should allow multiple handlers for different message types', () => {
      const handler1 = vi.fn().mockResolvedValue({ success: true });
      const handler2 = vi.fn().mockResolvedValue({ success: true });
      
      router.registerHandler('MESSAGE_1', handler1);
      router.registerHandler('MESSAGE_2', handler2);
      
      expect(router.getHandler('MESSAGE_1')).toBe(handler1);
      expect(router.getHandler('MESSAGE_2')).toBe(handler2);
    });
  });

  describe('handleMessage', () => {
    it('should route message to registered handler', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, data: 'test' });
      router.registerHandler('TEST_MESSAGE', handler);

      const message = { type: 'TEST_MESSAGE', payload: { id: 123 } };
      const sender = { id: 'test-extension' } as chrome.runtime.MessageSender;
      const sendResponse = vi.fn();

      const result = router.handleMessage(message, sender, sendResponse);
      
      // Async handler returns true
      expect(result).toBe(true);
      
      // Wait for async handler
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      // Router wraps handler result in { success: true, data: <result>, id: ... }
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { success: true, data: 'test' } })
      );
    });

    it('should return error for unknown message types', async () => {
      const message = { type: 'UNKNOWN_MESSAGE' };
      const sender = { id: 'test-extension' } as chrome.runtime.MessageSender;
      const sendResponse = vi.fn();

      router.handleMessage(message, sender, sendResponse);
      
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('No handler registered')
        })
      );
    });

    it('should handle handler errors gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      router.registerHandler('FAILING_MESSAGE', handler);

      const message = { type: 'FAILING_MESSAGE' };
      const sender = { id: 'test-extension' } as chrome.runtime.MessageSender;
      const sendResponse = vi.fn();

      router.handleMessage(message, sender, sendResponse);
      
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: false, 
          error: 'Handler error' 
        })
      );
    });

    it('should handle sync handlers correctly', async () => {
      // Router always returns true (async pattern) even for sync-returning handlers
      const handler = vi.fn().mockReturnValue({ success: true });
      router.registerHandler('SYNC_MESSAGE', handler);

      const message = { type: 'SYNC_MESSAGE' };
      const sender = { id: 'test-extension' } as chrome.runtime.MessageSender;
      const sendResponse = vi.fn();

      const result = router.handleMessage(message, sender, sendResponse);

      expect(result).toBe(true);
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      // Handler returns { success: true }, router wraps it: { success: true, data: { success: true } }
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { success: true } })
      );
    });
  });

  describe('default handlers', () => {
    it('should have PING handler registered', () => {
      expect(router.getHandler('PING')).toBeDefined();
    });

    it('should respond to PING with pong', async () => {
      const pingHandler = router.getHandler('PING');
      expect(pingHandler).toBeDefined();
      
      const result = await pingHandler?.({ type: 'PING' });
      expect(result).toEqual(expect.objectContaining({ pong: true }));
    });

    it('should have GET_SETTINGS handler registered', () => {
      expect(router.getHandler('GET_SETTINGS')).toBeDefined();
    });

    it('should have UPDATE_SETTINGS handler registered', () => {
      expect(router.getHandler('UPDATE_SETTINGS')).toBeDefined();
    });
  });
});
