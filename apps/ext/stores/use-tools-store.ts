import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toolMetadata } from "@/tools/metadata";
import { chromeStorageAdapter } from "@/lib/storage";
import { ensureActiveTabHostAccess } from "@/lib/host-permissions";

interface ActiveTool {
  toolId: string;
  active: boolean;
  config: Record<string, unknown>;
  activatedAt: number;
  error?: string;
}

interface ToolsState {
  activeTools: Record<string, ActiveTool>;
  toggleTool: (toolId: string) => Promise<void>;
  activateTool: (
    toolId: string,
    config?: Record<string, unknown>,
  ) => Promise<void>;
  deactivateTool: (toolId: string) => void;
  deactivateAll: () => void;
  deactivateCategory: (category: string) => void;
  updateToolConfig: (toolId: string, config: Record<string, unknown>) => void;
  setToolError: (toolId: string, error: string) => void;
  lastPermissionError: string | null;
  clearPermissionError: () => void;
}

const chromeStorageAdapterInstance = chromeStorageAdapter<ToolsState>();

function sendToolMessage(
  type: string,
  toolId?: string,
  config?: Record<string, unknown>,
) {
  try {
    const msg: Record<string, unknown> = { type };
    if (toolId) msg.toolId = toolId;
    if (config) msg.config = config;
    browser.runtime.sendMessage(msg).catch(() => {});
  } catch {
    /* not in extension context */
  }
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set, get) => ({
      activeTools: {},
      lastPermissionError: null,
      clearPermissionError: () => set({ lastPermissionError: null }),

      toggleTool: async (toolId) => {
        const current = get().activeTools[toolId];
        if (current?.active) {
          get().deactivateTool(toolId);
        } else {
          await get().activateTool(toolId);
        }
      },

      activateTool: async (toolId, config = {}) => {
        try {
          const access = await ensureActiveTabHostAccess();
          if (!access.ok) {
            set({
              lastPermissionError:
                access.reason ?? "Host permission required for this site.",
            });
            return;
          }
        } catch {
          // Non-extension contexts (unit tests) skip permission checks.
        }
        set({ lastPermissionError: null });
        sendToolMessage("POPUP_ACTIVATE_TOOL", toolId, config);
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
        sendToolMessage("POPUP_DEACTIVATE_TOOL", toolId);
        set((state) => {
          const { [toolId]: _, ...rest } = state.activeTools;
          return { activeTools: rest };
        });
      },

      deactivateAll: () => {
        sendToolMessage("POPUP_DEACTIVATE_ALL");
        set({ activeTools: {} });
      },

      deactivateCategory: (category) => {
        const toDeactivate = Object.entries(get().activeTools)
          .filter(
            ([, v]) =>
              v.active && toolMetadata[v.toolId]?.category === category,
          )
          .map(([, v]) => v.toolId);
        for (const id of toDeactivate) {
          sendToolMessage("POPUP_DEACTIVATE_TOOL", id);
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
      name: "fdh-tools-storage",
      storage: chromeStorageAdapterInstance,
    },
  ),
);
