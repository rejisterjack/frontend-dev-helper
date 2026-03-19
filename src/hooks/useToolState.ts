/**
 * useToolState Hook
 *
 * React hook for managing tool state with chrome.storage sync.
 * Provides reactive state updates and persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ToolState, ToolsState } from '@/types';
import type { ToolId } from '@/constants';

// ============================================
// Types
// ============================================

/**
 * Hook return type for single tool state
 */
export interface UseToolStateReturn {
  /** Current tool state */
  state: ToolState;
  /** Whether state is currently loading */
  isLoading: boolean;
  /** Error if state loading failed */
  error: Error | null;
  /** Enable the tool */
  enable: () => Promise<void>;
  /** Disable the tool */
  disable: () => Promise<void>;
  /** Toggle the tool enabled state */
  toggle: () => Promise<boolean>;
  /** Update the tool state */
  setState: (state: Partial<ToolState>) => Promise<void>;
  /** Update tool settings */
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
}

/**
 * Hook return type for all tool states
 */
export interface UseAllToolStatesReturn {
  /** Map of all tool states */
  states: ToolsState;
  /** Whether states are currently loading */
  isLoading: boolean;
  /** Error if states loading failed */
  error: Error | null;
  /** Set state for a specific tool */
  setToolState: (toolId: ToolId, state: Partial<ToolState>) => Promise<void>;
  /** Toggle a specific tool */
  toggleTool: (toolId: ToolId) => Promise<boolean>;
  /** Enable a specific tool */
  enableTool: (toolId: ToolId) => Promise<void>;
  /** Disable a specific tool */
  disableTool: (toolId: ToolId) => Promise<void>;
  /** Enable multiple tools */
  enableMultiple: (toolIds: ToolId[]) => Promise<void>;
  /** Disable multiple tools */
  disableMultiple: (toolIds: ToolId[]) => Promise<void>;
  /** Disable all tools */
  disableAll: () => Promise<void>;
  /** Refresh states from storage */
  refresh: () => Promise<void>;
}

// ============================================
// Default State
// ============================================

const DEFAULT_TOOL_STATE: ToolState = {
  enabled: false,
  settings: {},
};

// ============================================
// useToolState Hook
// ============================================

/**
 * Hook for managing a single tool's state
 * @param toolId - The tool identifier
 * @param tabId - Optional tab ID for tab-specific state
 * @returns Tool state and control functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, toggle, updateSettings } = useToolState(TOOL_IDS.DOM_OUTLINER);
 *   
 *   return (
 *     <button onClick={toggle}>
 *       {state.enabled ? 'Disable' : 'Enable'} DOM Outliner
 *     </button>
 *   );
 * }
 * ```
 */
export function useToolState(toolId: ToolId, tabId?: number): UseToolStateReturn {
  const [state, setLocalState] = useState<ToolState>(DEFAULT_TOOL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Load initial state
  useEffect(() => {
    mountedRef.current = true;
    loadState();

    return () => {
      mountedRef.current = false;
    };
  }, [toolId, tabId]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      const toolStatesChange = changes.fdh_tool_states;
      if (toolStatesChange) {
        const newValue = toolStatesChange.newValue as {
          global?: Record<ToolId, ToolState>;
          tabs?: Record<number, Record<ToolId, ToolState>>;
        } | undefined;

        if (newValue) {
          let newState: ToolState | undefined;

          if (tabId !== undefined && newValue.tabs?.[tabId]?.[toolId]) {
            newState = newValue.tabs[tabId][toolId];
          } else if (newValue.global?.[toolId]) {
            newState = newValue.global[toolId];
          }

          if (newState && mountedRef.current) {
            setLocalState(newState);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [toolId, tabId]);

  // Load state from storage
  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await chrome.storage.local.get('fdh_tool_states');
      const storage = result.fdh_tool_states as {
        global?: Record<ToolId, ToolState>;
        tabs?: Record<number, Record<ToolId, ToolState>>;
      } | undefined;

      let loadedState: ToolState | undefined;

      if (tabId !== undefined && storage?.tabs?.[tabId]?.[toolId]) {
        loadedState = storage.tabs[tabId][toolId];
      } else if (storage?.global?.[toolId]) {
        loadedState = storage.global[toolId];
      }

      if (mountedRef.current) {
        setLocalState(loadedState ?? DEFAULT_TOOL_STATE);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [toolId, tabId]);

  // Save state to storage
  const saveState = useCallback(async (newState: ToolState): Promise<void> => {
    try {
      const result = await chrome.storage.local.get('fdh_tool_states');
      const storage = result.fdh_tool_states as {
        global: Record<ToolId, ToolState>;
        tabs: Record<number, Record<ToolId, ToolState>>;
      } || { global: {}, tabs: {} };

      if (tabId !== undefined) {
        if (!storage.tabs[tabId]) {
          storage.tabs[tabId] = {};
        }
        storage.tabs[tabId][toolId] = newState;
      } else {
        storage.global[toolId] = newState;
      }

      await chrome.storage.local.set({ fdh_tool_states: storage });

      // Notify background script
      await chrome.runtime.sendMessage({
        type: 'TOOL_STATE_CHANGED',
        payload: { toolId, state: newState, tabId },
        timestamp: Date.now(),
      }).catch(() => {
        // Ignore errors - background may not be listening
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [toolId, tabId]);

  // Enable the tool
  const enable = useCallback(async () => {
    const newState = { ...state, enabled: true };
    setLocalState(newState);
    await saveState(newState);
  }, [state, saveState]);

  // Disable the tool
  const disable = useCallback(async () => {
    const newState = { ...state, enabled: false };
    setLocalState(newState);
    await saveState(newState);
  }, [state, saveState]);

  // Toggle the tool
  const toggle = useCallback(async (): Promise<boolean> => {
    const newState = { ...state, enabled: !state.enabled };
    setLocalState(newState);
    await saveState(newState);
    return newState.enabled;
  }, [state, saveState]);

  // Update the tool state
  const setState = useCallback(async (partialState: Partial<ToolState>): Promise<void> => {
    const newState = { ...state, ...partialState };
    setLocalState(newState);
    await saveState(newState);
  }, [state, saveState]);

  // Update tool settings
  const updateSettings = useCallback(async (settings: Record<string, unknown>): Promise<void> => {
    const newState = {
      ...state,
      settings: { ...state.settings, ...settings },
    };
    setLocalState(newState);
    await saveState(newState);
  }, [state, saveState]);

  return {
    state,
    isLoading,
    error,
    enable,
    disable,
    toggle,
    setState,
    updateSettings,
  };
}

// ============================================
// useAllToolStates Hook
// ============================================

/**
 * Hook for managing all tool states
 * @param tabId - Optional tab ID for tab-specific states
 * @returns All tool states and control functions
 * 
 * @example
 * ```tsx
 * function Toolbar() {
 *   const { states, toggleTool, disableAll } = useAllToolStates();
 *   
 *   return (
 *     <div>
 *       {Object.entries(states).map(([toolId, state]) => (
 *         <button key={toolId} onClick={() => toggleTool(toolId as ToolId)}>
 *           {toolId}: {state.enabled ? 'ON' : 'OFF'}
 *         </button>
 *       ))}
 *       <button onClick={disableAll}>Disable All</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllToolStates(tabId?: number): UseAllToolStatesReturn {
  const [states, setStates] = useState<ToolsState>({} as ToolsState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Load initial states
  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [tabId]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      const toolStatesChange = changes.fdh_tool_states;
      if (toolStatesChange && mountedRef.current) {
        refresh();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [tabId]);

  // Refresh states from storage
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Import TOOL_IDS dynamically to avoid issues during SSR
      const { TOOL_IDS } = await import('@/constants');
      const result = await chrome.storage.local.get('fdh_tool_states');
      const storage = result.fdh_tool_states as {
        global?: Record<ToolId, ToolState>;
        tabs?: Record<number, Record<ToolId, ToolState>>;
      } | undefined;

      const allStates: Partial<Record<ToolId, ToolState>> = {};

      // Get all tool IDs
      const allToolIds = Object.values(TOOL_IDS);

      // Start with defaults
      for (const id of allToolIds) {
        allStates[id] = DEFAULT_TOOL_STATE;
      }

      // Apply global states
      if (storage?.global) {
        for (const [id, state] of Object.entries(storage.global)) {
          allStates[id as ToolId] = state;
        }
      }

      // Apply tab-specific states if provided
      if (tabId !== undefined && storage?.tabs?.[tabId]) {
        for (const [id, state] of Object.entries(storage.tabs[tabId])) {
          allStates[id as ToolId] = state;
        }
      }

      if (mountedRef.current) {
        setStates(allStates as ToolsState);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tabId]);

  // Save a single tool state
  const saveToolState = useCallback(async (toolId: ToolId, newState: ToolState): Promise<void> => {
    try {
      const result = await chrome.storage.local.get('fdh_tool_states');
      const storage = result.fdh_tool_states as {
        global: Record<ToolId, ToolState>;
        tabs: Record<number, Record<ToolId, ToolState>>;
      } || { global: {}, tabs: {} };

      if (tabId !== undefined) {
        if (!storage.tabs[tabId]) {
          storage.tabs[tabId] = {} as Record<ToolId, ToolState>;
        }
        storage.tabs[tabId][toolId] = newState;
      } else {
        storage.global[toolId] = newState;
      }

      await chrome.storage.local.set({ fdh_tool_states: storage });

      // Update local state
      setStates((prev) => ({
        ...prev,
        [toolId]: newState,
      }));

      // Notify background script
      await chrome.runtime.sendMessage({
        type: 'TOOL_STATE_CHANGED',
        payload: { toolId, state: newState, tabId },
        timestamp: Date.now(),
      }).catch(() => {
        // Ignore errors - background may not be listening
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [tabId]);

  // Set state for a specific tool
  const setToolState = useCallback(async (toolId: ToolId, partialState: Partial<ToolState>): Promise<void> => {
    const currentState = states[toolId] ?? DEFAULT_TOOL_STATE;
    const newState = { ...currentState, ...partialState };
    await saveToolState(toolId, newState);
  }, [states, saveToolState]);

  // Toggle a specific tool
  const toggleTool = useCallback(async (toolId: ToolId): Promise<boolean> => {
    const currentState = states[toolId] ?? DEFAULT_TOOL_STATE;
    const newState = { ...currentState, enabled: !currentState.enabled };
    await saveToolState(toolId, newState);
    return newState.enabled;
  }, [states, saveToolState]);

  // Enable a specific tool
  const enableTool = useCallback(async (toolId: ToolId): Promise<void> => {
    const currentState = states[toolId] ?? DEFAULT_TOOL_STATE;
    const newState = { ...currentState, enabled: true };
    await saveToolState(toolId, newState);
  }, [states, saveToolState]);

  // Disable a specific tool
  const disableTool = useCallback(async (toolId: ToolId): Promise<void> => {
    const currentState = states[toolId] ?? DEFAULT_TOOL_STATE;
    const newState = { ...currentState, enabled: false };
    await saveToolState(toolId, newState);
  }, [states, saveToolState]);

  // Enable multiple tools
  const enableMultiple = useCallback(async (toolIds: ToolId[]): Promise<void> => {
    await Promise.all(toolIds.map((id) => enableTool(id)));
  }, [enableTool]);

  // Disable multiple tools
  const disableMultiple = useCallback(async (toolIds: ToolId[]): Promise<void> => {
    await Promise.all(toolIds.map((id) => disableTool(id)));
  }, [disableTool]);

  // Disable all tools
  const disableAll = useCallback(async (): Promise<void> => {
    const { TOOL_IDS } = await import('@/constants');
    const allToolIds = Object.values(TOOL_IDS);
    await disableMultiple(allToolIds);
  }, [disableMultiple]);

  return {
    states,
    isLoading,
    error,
    setToolState,
    toggleTool,
    enableTool,
    disableTool,
    enableMultiple,
    disableMultiple,
    disableAll,
    refresh,
  };
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to get the count of active tools
 * @param tabId - Optional tab ID
 * @returns Number of active tools
 */
export function useActiveToolsCount(tabId?: number): number {
  const { states } = useAllToolStates(tabId);
  return Object.values(states).filter((state) => state?.enabled).length;
}

/**
 * Hook to check if any tools are active
 * @param tabId - Optional tab ID
 * @returns True if any tool is active
 */
export function useHasActiveTools(tabId?: number): boolean {
  const count = useActiveToolsCount(tabId);
  return count > 0;
}

/**
 * Hook to get active tool IDs
 * @param tabId - Optional tab ID
 * @returns Array of active tool IDs
 */
export function useActiveToolIds(tabId?: number): ToolId[] {
  const { states } = useAllToolStates(tabId);
  return Object.entries(states)
    .filter(([, state]) => state?.enabled)
    .map(([toolId]) => toolId as ToolId);
}
