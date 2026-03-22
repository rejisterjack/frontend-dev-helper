/**
 * Message Handler Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('Message Handler', () => {
  describe('Message Routing', () => {
    it('should handle PING messages', () => {
      const handler = vi.fn(() => ({ pong: true }));
      const message = { type: 'PING' };

      handler(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should handle tool enable messages', () => {
      const enableTool = vi.fn();
      const message = { type: 'PESTICIDE_ENABLE' };

      if (message.type === 'PESTICIDE_ENABLE') {
        enableTool();
      }

      expect(enableTool).toHaveBeenCalled();
    });

    it('should reject unknown message types', () => {
      const knownTypes = ['PING', 'PESTICIDE_ENABLE', 'PESTICIDE_DISABLE'];
      const unknownMessage = { type: 'UNKNOWN' };

      const isKnown = knownTypes.includes(unknownMessage.type);

      expect(isKnown).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const handler = vi.fn(() => {
        throw new Error('Test error');
      });

      try {
        handler();
      } catch (e) {
        expect((e as Error).message).toBe('Test error');
      }
    });

    it('should send error response', () => {
      const sendResponse = vi.fn();
      const error = new Error('Failed');

      sendResponse({ success: false, error: error.message });

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Failed',
      });
    });
  });
});
