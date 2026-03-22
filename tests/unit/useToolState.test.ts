/**
 * useToolState Hook Tests
 *
 * Unit tests for the tool state management hook.
 * The hook reads/writes chrome.storage.local and listens to
 * chrome.storage.onChanged — all mocked via the global setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToolState } from '@/hooks/useToolState';

// Grab the mocks installed by src/test/setup.ts
const mockStorageLocal = (global as { chrome: { storage: { local: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } } } }).chrome.storage.local;

describe('useToolState', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: storage returns no saved state
    mockStorageLocal.get.mockResolvedValue({ fdh_tool_states: undefined });
    mockStorageLocal.set.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should default to disabled when no stored state exists', async () => {
      const { result } = renderHook(() => useToolState('domOutliner'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state.enabled).toBe(false);
    });

    it('should load persisted enabled=true from storage', async () => {
      mockStorageLocal.get.mockResolvedValue({
        fdh_tool_states: {
          global: { domOutliner: { enabled: true, settings: {} } },
          tabs: {},
        },
      });

      const { result } = renderHook(() => useToolState('domOutliner'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.state.enabled).toBe(true);
    });

    it('should surface storage errors via the error field', async () => {
      mockStorageLocal.get.mockRejectedValue(new Error('Quota exceeded'));

      const { result } = renderHook(() => useToolState('domOutliner'));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Quota exceeded');
    });
  });

  describe('enable', () => {
    it('should set enabled=true and persist to storage', async () => {
      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.enable();
      });

      expect(result.current.state.enabled).toBe(true);
      expect(mockStorageLocal.set).toHaveBeenCalledWith(
        expect.objectContaining({
          fdh_tool_states: expect.objectContaining({
            global: expect.objectContaining({
              domOutliner: expect.objectContaining({ enabled: true }),
            }),
          }),
        })
      );
    });
  });

  describe('disable', () => {
    it('should set enabled=false and persist to storage', async () => {
      // Start enabled
      mockStorageLocal.get.mockResolvedValue({
        fdh_tool_states: {
          global: { domOutliner: { enabled: true, settings: {} } },
          tabs: {},
        },
      });

      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.disable();
      });

      expect(result.current.state.enabled).toBe(false);
      expect(mockStorageLocal.set).toHaveBeenCalledWith(
        expect.objectContaining({
          fdh_tool_states: expect.objectContaining({
            global: expect.objectContaining({
              domOutliner: expect.objectContaining({ enabled: false }),
            }),
          }),
        })
      );
    });
  });

  describe('toggle', () => {
    it('should flip from false to true', async () => {
      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let toggled: boolean | undefined;
      await act(async () => {
        toggled = await result.current.toggle();
      });

      expect(toggled).toBe(true);
      expect(result.current.state.enabled).toBe(true);
    });

    it('should flip from true to false', async () => {
      mockStorageLocal.get.mockResolvedValue({
        fdh_tool_states: {
          global: { domOutliner: { enabled: true, settings: {} } },
          tabs: {},
        },
      });

      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let toggled: boolean | undefined;
      await act(async () => {
        toggled = await result.current.toggle();
      });

      expect(toggled).toBe(false);
      expect(result.current.state.enabled).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should merge new settings into existing ones', async () => {
      mockStorageLocal.get.mockResolvedValue({
        fdh_tool_states: {
          global: { domOutliner: { enabled: false, settings: { opacity: 0.15 } } },
          tabs: {},
        },
      });

      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateSettings({ opacity: 0.5, showLabels: true });
      });

      expect(result.current.state.settings).toEqual(
        expect.objectContaining({ opacity: 0.5, showLabels: true })
      );
    });
  });

  describe('error handling', () => {
    it('should set error when storage.set fails', async () => {
      mockStorageLocal.get.mockResolvedValue({ fdh_tool_states: undefined });
      mockStorageLocal.set.mockRejectedValue(new Error('Write failed'));

      const { result } = renderHook(() => useToolState('domOutliner'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.enable().catch(() => {});
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Write failed');
    });
  });
});
