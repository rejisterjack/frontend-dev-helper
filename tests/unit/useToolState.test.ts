/**
 * useToolState Hook Tests
 *
 * Unit tests for the tool state management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToolState } from '@/hooks/useToolState';
import type { ToolState } from '@/types';

// Mock chrome.runtime.sendMessage
const mockSendMessage = vi.fn();

// @ts-expect-error - mocking chrome global
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  },
};

describe('useToolState', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockSendMessage.mockResolvedValue({ success: true, active: false });
  });

  describe('initialization', () => {
    it('should initialize with tool disabled', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true, state: { enabled: false } });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });
    });

    it('should fetch initial state from background', async () => {
      mockSendMessage.mockResolvedValueOnce({ success: true, state: { enabled: true } });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'PESTICIDE_GET_STATE',
        });
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Connection failed'));
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => {
        expect(result.current.error).toBe('Connection failed');
      });
    });
  });

  describe('enable', () => {
    it('should send ENABLE message when enabled', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: false } })
        .mockResolvedValueOnce({ success: true, active: true });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.enable();
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'PESTICIDE_ENABLE',
      });
    });

    it('should update enabled state on success', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: false } })
        .mockResolvedValueOnce({ success: true, active: true });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.enable();
      });
      
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('disable', () => {
    it('should send DISABLE message when disabled', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: true } })
        .mockResolvedValueOnce({ success: true, active: false });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.disable();
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'PESTICIDE_DISABLE',
      });
    });

    it('should update enabled state on success', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: true } })
        .mockResolvedValueOnce({ success: true, active: false });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.disable();
      });
      
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should toggle from enabled to disabled', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: true } })
        .mockResolvedValueOnce({ success: true, active: false });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.toggle();
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'PESTICIDE_TOGGLE',
      });
    });
  });

  describe('error handling', () => {
    it('should set error when enable fails', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: false } })
        .mockResolvedValueOnce({ success: false, error: 'Permission denied' });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      await act(async () => {
        await result.current.enable();
      });
      
      expect(result.current.error).toBe('Permission denied');
    });

    it('should clear error on successful operation', async () => {
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: false } })
        .mockResolvedValueOnce({ success: false, error: 'First error' })
        .mockResolvedValueOnce({ success: true, active: true });
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      // First operation fails
      await act(async () => {
        await result.current.enable();
      });
      expect(result.current.error).toBe('First error');
      
      // Second operation succeeds
      await act(async () => {
        await result.current.enable();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading during operations', async () => {
      let resolveEnable: (value: { success: boolean; active: boolean }) => void;
      const enablePromise = new Promise<{ success: boolean; active: boolean }>((resolve) => {
        resolveEnable = resolve;
      });
      
      mockSendMessage
        .mockResolvedValueOnce({ success: true, state: { enabled: false } })
        .mockReturnValueOnce(enablePromise);
      
      const { result } = renderHook(() => useToolState('pesticide'));
      
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      
      let promise: Promise<void> | undefined;
      act(() => {
        promise = result.current.enable();
      });
      
      expect(result.current.isLoading).toBe(true);
      
      resolveEnable!({ success: true, active: true });
      await promise;
      
      expect(result.current.isLoading).toBe(false);
    });
  });
});
