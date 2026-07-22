/**
 * Type-safe wrappers around chrome.storage.local.get().
 *
 * `chrome.storage.local.get(key)` is typed to return `{ [key: string]: any }`
 * in @types/chrome, but when accessed via `result[key]` the value resolves
 * to `{}` if the key wasn't present — leading to ~30 spurious tsc errors
 * like "Property 'state' does not exist on type '{}'" across the codebase.
 *
 * These helpers restore type safety by returning `T | undefined` and
 * centralizing the lookup.
 */

/**
 * Read a single key from chrome.storage.local, typed as T or undefined.
 *
 * Works in the background service worker (uses the global `browser` polyfill
 * alias when available, falls back to `chrome`).
 */
export async function readStorage<T = unknown>(
  key: string,
): Promise<T | undefined> {
  // The `browser` global is injected by WXT's webextension-polyfill at build
  // time; at type-check time it's declared via .wxt/wxt.d.ts. The type cast
  // here sidesteps a quirk in @types/chrome where `local` is exported as a
  // const, not a re-exportable type — both `browser.storage.local` and
  // `chrome.storage.local` resolve to the same StorageArea at runtime.
  const area = ((globalThis as { browser?: { storage?: { local?: unknown } } })
    .browser?.storage?.local ?? chrome.storage.local) as {
    get: (
      keys?: string | string[] | Record<string, unknown> | null,
    ) => Promise<Record<string, any>>;
    set: (items: Record<string, any>) => Promise<void>;
    remove: (keys: string | string[]) => Promise<void>;
  };
  const result = await area.get(key);
  return result[key] as T | undefined;
}

/**
 * Read a Zustand-persisted store: storage.local holds
 * `{ state: PersistedState, version: number }` per store. This helper
 * unwraps it safely.
 */
export async function readPersistedStore<T = unknown>(
  storageKey: string,
): Promise<{ state: T; version: number } | undefined> {
  return readStorage<{ state: T; version: number }>(storageKey);
}

/**
 * A Zustand `PersistStorage` backed by `chrome.storage.local`. Identical to
 * the inline adapters that used to live in each store, but typed correctly:
 * `getItem` returns `StorageValue<S> | null` instead of the widened `{}`
 * that `result[name]` infers.
 */
export function chromeStorageAdapter<S>(): {
  getItem: (name: string) => Promise<{ state: S; version?: number } | null>;
  setItem: (
    name: string,
    value: { state: S; version?: number },
  ) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
} {
  return {
    getItem: async (name) => {
      const result = await chrome.storage.local.get(name);
      const value = result[name] as { state: S; version?: number } | undefined;
      return value ?? null;
    },
    setItem: async (name, value) => {
      await chrome.storage.local.set({ [name]: value });
    },
    removeItem: async (name) => {
      await chrome.storage.local.remove(name);
    },
  };
}
