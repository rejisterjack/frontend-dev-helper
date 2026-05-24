import { create } from 'zustand';

interface ConnectionState {
  tabId: number | null;
  contentScriptReady: boolean;
  vscodeConnected: boolean;
  vscodeConnecting: boolean;
  supportedTools: string[];
  lastHeartbeat: number;
  setTabId: (tabId: number | null) => void;
  setContentScriptReady: (ready: boolean) => void;
  setVscodeConnected: (connected: boolean) => void;
  setVscodeConnecting: (connecting: boolean) => void;
  updateSupportedTools: (tools: string[]) => void;
  reset: () => void;
}

const initialState = {
  tabId: null,
  contentScriptReady: false,
  vscodeConnected: false,
  vscodeConnecting: false,
  supportedTools: [] as string[],
  lastHeartbeat: 0,
};

export const useConnectionStore = create<ConnectionState>()((set) => ({
  ...initialState,

  setTabId: (tabId) => set({ tabId }),

  setContentScriptReady: (ready) =>
    set({ contentScriptReady: ready, lastHeartbeat: ready ? Date.now() : 0 }),

  setVscodeConnected: (connected) =>
    set({ vscodeConnected: connected, vscodeConnecting: false }),

  setVscodeConnecting: (connecting) =>
    set({ vscodeConnecting: connecting }),

  updateSupportedTools: (tools) =>
    set({ supportedTools: tools, lastHeartbeat: Date.now() }),

  reset: () => set(initialState),
}));
