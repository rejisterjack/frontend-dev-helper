import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toolMetadata } from '@/tools/metadata';

interface ActiveTool {
  toolId: string;
  active: boolean;
  config: Record<string, unknown>;
  activatedAt: number;
  error?: string;
}

interface ToolsState {
  activeTools: Record<string, ActiveTool>;
  toggleTool: (toolId: string) => void;
  activateTool: (toolId: string, config?: Record<string, unknown>) => void;
  deactivateTool: (toolId: string) => void;
  deactivateAll: () => void;
  deactivateCategory: (category: string) => void;
  updateToolConfig: (toolId: string, config: Record<string, unknown>) => void;
  setToolError: (toolId: string, error: string) => void;
}

const chromeStorageAdapter = {
  getItem: async (name: string) => {
    const result = await chrome.storage.local.get(name);
    return result[name] ?? null;
  },
  setItem: async (name: string, value: unknown) => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string) => {
    await chrome.storage.local.remove(name);
  },
};

function sendToolMessage(type: string, toolId?: string, config?: Record<string, unknown>) {
  try {
    const msg: Record<string, unknown> = { type };
    if (toolId) msg.toolId = toolId;
    if (config) msg.config = config;
    browser.runtime.sendMessage(msg).catch(() => {});
  } catch { /* not in extension context */ }
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set, get) => ({
      activeTools: {},

      toggleTool: (toolId) => {
        const current = get().activeTools[toolId];
        if (current?.active) {
          get().deactivateTool(toolId);
        } else {
          get().activateTool(toolId);
        }
      },

      activateTool: (toolId, config = {}) => {
        sendToolMessage('POPUP_ACTIVATE_TOOL', toolId, config);
        set((state) => ({
          activeTools: {
            ...state.activeTools,
            [toolId]: {
              toolId,
              active: true,
              config,
              activatedAt: Date.now(),
            },
          },
        }));
      },

      deactivateTool: (toolId) => {
        sendToolMessage('POPUP_DEACTIVATE_TOOL', toolId);
        set((state) => {
          const { [toolId]: _, ...rest } = state.activeTools;
          return { activeTools: rest };
        });
      },

      deactivateAll: () => {
        sendToolMessage('POPUP_DEACTIVATE_ALL');
        set({ activeTools: {} });
      },

      deactivateCategory: (category) => {
        const toDeactivate = Object.entries(get().activeTools)
          .filter(([, v]) => v.active && toolMetadata[ v.toolId]?.category === category)
          .map(([, v]) => v.toolId);
        for (const id of toDeactivate) {
          sendToolMessage('POPUP_DEACTIVATE_TOOL', id);
        }
        set((state) => {
          const filtered: Record<string, ActiveTool> = {};
          for (const [key, value] of Object.entries(state.activeTools)) {
            if (toolMetadata[key]?.category !== category) {
              filtered[key] = value;
            }
          }
          return { activeTools: filtered };
        });
      },

      updateToolConfig: (toolId, config) => {
        set((state) => {
          const existing = state.activeTools[toolId];
          if (!existing) return state;
          return {
            activeTools: {
              ...state.activeTools,
              [toolId]: {
                ...existing,
                config: { ...existing.config, ...config },
              },
            },
          };
        });
      },

      setToolError: (toolId, error) => {
        set((state) => {
          const existing = state.activeTools[toolId];
          if (!existing) return state;
          return {
            activeTools: {
              ...state.activeTools,
              [toolId]: { ...existing, error },
            },
          };
        });
      },
    }),
    {
      name: 'fdh-tools-storage',
      storage: chromeStorageAdapter,
    },
  ),
);
