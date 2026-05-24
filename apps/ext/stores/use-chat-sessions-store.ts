import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatSessionsState {
  sessions: ChatSession[];
  activeSessionId: string | null;

  createSession: () => string;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearSession: (sessionId: string) => void;
  getActiveSession: () => ChatSession | undefined;
  autoTitleSession: (sessionId: string, firstMessage: string) => void;
}

const MAX_SESSIONS = 50;
const MAX_MESSAGES_PER_SESSION = 200;

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

export const useChatSessionsStore = create<ChatSessionsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const session: ChatSession = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, MAX_SESSIONS),
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) => {
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== id);
          const newActive = state.activeSessionId === id
            ? (filtered[0]?.id ?? null)
            : state.activeSessionId;
          return { sessions: filtered, activeSessionId: newActive };
        });
      },

      switchSession: (id) => {
        set({ activeSessionId: id });
      },

      addMessage: (sessionId, message) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message].slice(-MAX_MESSAGES_PER_SESSION),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));
      },

      updateMessage: (sessionId, messageId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }));
      },

      clearSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [], updatedAt: Date.now() }
              : s
          ),
        }));
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },

      autoTitleSession: (sessionId, firstMessage) => {
        const title = firstMessage.length > 40
          ? firstMessage.slice(0, 40).trim() + '...'
          : firstMessage;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId && s.title === 'New Chat'
              ? { ...s, title, updatedAt: Date.now() }
              : s
          ),
        }));
      },
    }),
    {
      name: 'fdh-chat-sessions',
      storage: chromeStorageAdapter,
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
