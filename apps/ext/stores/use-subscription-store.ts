import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionTier } from "@/lib/types";
import { chromeStorageAdapter } from "@/lib/storage";

interface SubscriptionState {
  tier: SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
  isPremium: () => boolean;
}

const chromeStorageAdapterTyped: {
  getItem: (
    name: string,
  ) => Promise<{ state: SubscriptionState; version?: number } | null>;
  setItem: (
    name: string,
    value: { state: SubscriptionState; version?: number },
  ) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
} = {
  getItem: async (name: string) => {
    const result = await chrome.storage.local.get(name);
    const stored = result[name];
    if (!stored) return null;
    // Handle both raw state and wrapped {state, version} formats
    if (typeof stored === "object" && "state" in stored) {
      return stored as { state: SubscriptionState; version?: number };
    }
    return { state: stored as SubscriptionState };
  },
  setItem: async (
    name: string,
    value: { state: SubscriptionState; version?: number },
  ) => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string) => {
    await chrome.storage.local.remove(name);
  },
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: "free" as SubscriptionTier,
      setTier: (tier) => set({ tier }),
      isPremium: () => get().tier !== "free",
    }),
    {
      name: "fdh-subscription-storage",
      storage: chromeStorageAdapterTyped,
    },
  ),
);
