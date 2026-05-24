import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type CategoryView = 'grid' | 'list';

interface AIConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: 'openrouter' | 'ollama' | 'fireworks' | 'zai' | 'custom';
}

interface GitHubConfig {
  token: string;
  enabled: boolean;
}

interface VSCodeConfig {
  enabled: boolean;
  port: number;
}

interface SettingsState {
  theme: Theme;
  defaultCategoryView: CategoryView;
  showInactiveTools: boolean;
  shortcuts: Record<string, string>;
  enableTelemetry: boolean;
  ai: AIConfig;
  github: GitHubConfig;
  vscode: VSCodeConfig;
  setTheme: (theme: Theme) => void;
  updateSetting: <K extends keyof Omit<SettingsState, 'theme' | 'ai' | 'github' | 'vscode' | 'setTheme' | 'updateSetting' | 'updateAIConfig' | 'updateGitHubConfig' | 'updateVSCodeConfig' | 'resetToDefaults'>>(
    key: K,
    value: SettingsState[K],
  ) => void;
  updateAIConfig: (partial: Partial<AIConfig>) => void;
  updateGitHubConfig: (partial: Partial<GitHubConfig>) => void;
  updateVSCodeConfig: (partial: Partial<VSCodeConfig>) => void;
  resetToDefaults: () => void;
}

const defaultState = {
  theme: 'system' as Theme,
  defaultCategoryView: 'grid' as CategoryView,
  showInactiveTools: false,
  shortcuts: {},
  enableTelemetry: false,
  ai: {
    enabled: false,
    apiKey: '',
    model: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    provider: 'openrouter' as const,
  },
  github: {
    token: '',
    enabled: false,
  },
  vscode: {
    enabled: false,
    port: 9456,
  },
};

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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,

      setTheme: (theme) => set({ theme }),

      updateSetting: (key, value) => set({ [key]: value }),

      updateAIConfig: (partial) =>
        set((state) => ({
          ai: { ...state.ai, ...partial },
        })),

      updateGitHubConfig: (partial) =>
        set((state) => ({
          github: { ...state.github, ...partial },
        })),

      updateVSCodeConfig: (partial) =>
        set((state) => ({
          vscode: { ...state.vscode, ...partial },
        })),

      resetToDefaults: () => set(defaultState),
    }),
    {
      name: 'fdh-settings-storage',
      storage: chromeStorageAdapter,
    },
  ),
);
