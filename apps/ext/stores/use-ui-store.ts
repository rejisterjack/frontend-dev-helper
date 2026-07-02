import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chromeStorageAdapter } from "@/lib/storage";

type View =
  | "dashboard"
  | "category"
  | "tool-detail"
  | "settings"
  | "ai-chat"
  | "react-profiler";

interface NavigationEntry {
  view: View;
  meta?: Record<string, unknown>;
}

const MAX_RECENT_TOOLS = 10;

const chromeStorageAdapterInstance = chromeStorageAdapter<UIState>();

interface UIState {
  currentView: View;
  selectedCategory: string | null;
  selectedToolId: string | null;
  searchQuery: string;
  commandPaletteOpen: boolean;
  history: NavigationEntry[];
  favoriteToolIds: string[];
  recentToolIds: string[];
  navigateTo: (view: View, meta?: Record<string, unknown>) => void;
  setSearchQuery: (query: string) => void;
  toggleCommandPalette: () => void;
  goBack: () => void;
  addFavorite: (toolId: string) => void;
  removeFavorite: (toolId: string) => void;
  toggleFavorite: (toolId: string) => void;
  addRecent: (toolId: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      currentView: "dashboard",
      selectedCategory: null,
      selectedToolId: null,
      searchQuery: "",
      commandPaletteOpen: false,
      history: [],
      favoriteToolIds: [],
      recentToolIds: [],

      navigateTo: (view, meta) => {
        const { currentView, selectedCategory, selectedToolId } = get();
        set((state) => ({
          currentView: view,
          selectedCategory: (meta?.category as string) ?? selectedCategory,
          selectedToolId:
            (meta?.toolId as string) ??
            (view === "tool-detail" ? selectedToolId : null),
          history: [
            ...state.history,
            {
              view: currentView,
              meta: { category: selectedCategory, toolId: selectedToolId },
            },
          ],
        }));
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      goBack: () => {
        const { history } = get();
        if (history.length === 0) return;
        const last = history[history.length - 1];
        set((state) => ({
          currentView: last.view,
          selectedCategory: (last.meta?.category as string) ?? null,
          selectedToolId: (last.meta?.toolId as string) ?? null,
          history: state.history.slice(0, -1),
        }));
      },

      addFavorite: (toolId) => {
        const { favoriteToolIds } = get();
        if (favoriteToolIds.includes(toolId)) return;
        set({ favoriteToolIds: [...favoriteToolIds, toolId] });
      },

      removeFavorite: (toolId) => {
        const { favoriteToolIds } = get();
        set({ favoriteToolIds: favoriteToolIds.filter((id) => id !== toolId) });
      },

      toggleFavorite: (toolId) => {
        const { favoriteToolIds } = get();
        if (favoriteToolIds.includes(toolId)) {
          set({
            favoriteToolIds: favoriteToolIds.filter((id) => id !== toolId),
          });
        } else {
          set({ favoriteToolIds: [...favoriteToolIds, toolId] });
        }
      },

      addRecent: (toolId) => {
        const { recentToolIds } = get();
        const filtered = recentToolIds.filter((id) => id !== toolId);
        const updated = [toolId, ...filtered].slice(0, MAX_RECENT_TOOLS);
        set({ recentToolIds: updated });
      },
    }),
    {
      name: "fdh-ui-storage",
      storage: chromeStorageAdapterInstance,
      partialize: (state) =>
        ({
          favoriteToolIds: state.favoriteToolIds,
          recentToolIds: state.recentToolIds,
        }) as UIState,
    },
  ),
);
