/**
 * useToolState — Tool state management hook
 *
 * Handles loading tool states from storage, toggling tools,
 * counting active tools, and listening for state-change messages.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TOOL_IDS, type ToolId } from '../../constants';
import type { ToolsState } from '../../types';
import { DEFAULT_FEATURE_TOGGLES } from '../../types';
import { logger } from '../../utils/logger';
import {
  clearAllStates,
  getAllToolStates,
  getUiPrefs,
} from '../../utils/storage';
import { applyToolEnabledInTab } from '../../utils/tool-toggle';

export interface UseToolStateReturn {
  toolsState: ToolsState;
  isLoading: boolean;
  showResetConfirm: boolean;
  activeToolsCount: number;
  showAdvancedTools: boolean;
  setShowAdvancedTools: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleTool: (toolId: ToolId, enabled: boolean) => Promise<void>;
  handleResetAll: () => Promise<void>;
  setToolsState: React.Dispatch<React.SetStateAction<ToolsState>>;
}

export function useToolState(): UseToolStateReturn {
  const [toolsState, setToolsState] = useState<ToolsState>({} as ToolsState);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  // Load initial state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        const states = await getAllToolStates();
        setToolsState(states);
        const prefs = await getUiPrefs();
        setShowAdvancedTools(prefs.showAdvancedTools);
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to load state:', err);
        setIsLoading(false);
      }
    };

    loadState();

    // Listen for state changes from service worker
    const handleMessage = (message: { type: string; payload?: Record<string, unknown> }) => {
      if (message.type === 'TOOL_STATE_CHANGED') {
        const toolId = message.payload?.toolId as ToolId | undefined;
        const payload = message.payload as {
          enabled?: boolean;
          state?: { enabled?: boolean };
        };
        const enabled =
          typeof payload?.enabled === 'boolean'
            ? payload.enabled
            : typeof payload?.state?.enabled === 'boolean'
              ? payload.state.enabled
              : undefined;
        if (toolId && typeof enabled === 'boolean') {
          setToolsState((prev) => ({
            ...prev,
            [toolId]: { ...prev[toolId], enabled },
          }));
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  /**
   * Toggle a tool on/off
   */
  const handleToggleTool = useCallback(async (toolId: ToolId, enabled: boolean) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Optimistic update
    setToolsState((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], enabled },
    }));

    try {
      await applyToolEnabledInTab(tab.id, toolId, enabled);
    } catch (err) {
      logger.error('Failed to toggle tool:', err);
      const all = await getAllToolStates();
      setToolsState(all);
    }
  }, []);

  /**
   * Reset all tools
   */
  const handleResetAll = useCallback(async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
      return;
    }

    const resetState = {} as ToolsState;
    for (const toolId of Object.values(TOOL_IDS)) {
      const defaultEnabled = DEFAULT_FEATURE_TOGGLES[toolId] ?? false;
      resetState[toolId] = { enabled: defaultEnabled, settings: {} };
    }

    setToolsState(resetState);
    setShowResetConfirm(false);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'DISABLE_ALL_TOOLS' });
      } catch (err) {
        logger.error('Failed to send DISABLE_ALL_TOOLS:', err);
      }
    }

    try {
      await clearAllStates();
    } catch (err) {
      logger.error('Failed to clear storage:', err);
    }
  }, [showResetConfirm]);

  const activeToolsCount = useMemo(
    () => Object.values(toolsState).filter((s) => s?.enabled).length,
    [toolsState]
  );

  return {
    toolsState,
    isLoading,
    showResetConfirm,
    activeToolsCount,
    showAdvancedTools,
    setShowAdvancedTools,
    handleToggleTool,
    handleResetAll,
    setToolsState,
  };
}
