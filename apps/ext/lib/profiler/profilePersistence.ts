/**
 * Profile persistence utilities — save, load, list, delete, export, import.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/utils/profilePersistence.ts.
 * Uses chrome.storage.local for session data and URL.createObjectURL for file download.
 */

import { browser } from "wxt/browser";
import type { CommitData } from "@repo/profiler-contract";

export interface SavedProfile {
  version: number;
  name: string;
  commits: CommitData[];
  timestamp: number;
  savedAt: number;
}

export interface ProfileData {
  commits: CommitData[];
  timestamp: number;
}

const DATA_FORMAT_VERSION = 1;
const PROFILE_PREFIX = "fdh-profiler:profile:";
const SESSION_INDEX_KEY = "fdh-profiler:sessions";

function storageKey(name: string): string {
  return `${PROFILE_PREFIX}${name}`;
}

async function readStorage<T>(key: string): Promise<T | null> {
  try {
    const result = await browser.storage.local.get(key);
    return (result[key] as T) ?? null;
  } catch {
    return null;
  }
}

async function writeStorage(key: string, value: unknown): Promise<void> {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch {
    // storage unavailable — ignore
  }
}

async function removeStorage(key: string): Promise<void> {
  try {
    await browser.storage.local.remove(key);
  } catch {
    // storage unavailable — ignore
  }
}

export function saveProfile(name: string, data: ProfileData): void {
  const profile: SavedProfile = {
    version: DATA_FORMAT_VERSION,
    name,
    commits: data.commits,
    timestamp: data.timestamp,
    savedAt: Date.now(),
  };
  writeStorage(storageKey(name), profile);

  (async () => {
    const index: string[] =
      (await readStorage<string[]>(SESSION_INDEX_KEY)) ?? [];
    if (!index.includes(name)) {
      index.push(name);
      await writeStorage(SESSION_INDEX_KEY, index);
    }
  })();
}

export async function loadProfile(name: string): Promise<ProfileData | null> {
  const profile = await readStorage<SavedProfile>(storageKey(name));
  if (!profile) return null;
  return { commits: profile.commits, timestamp: profile.timestamp };
}

export async function listProfiles(): Promise<string[]> {
  const index = await readStorage<string[]>(SESSION_INDEX_KEY);
  return index ?? [];
}

export async function deleteProfile(name: string): Promise<void> {
  await removeStorage(storageKey(name));

  const index = await readStorage<string[]>(SESSION_INDEX_KEY);
  if (index) {
    const updated = index.filter((n) => n !== name);
    await writeStorage(SESSION_INDEX_KEY, updated);
  }
}

export function exportToFile(data: ProfileData, filename: string): void {
  const payload: SavedProfile = {
    version: DATA_FORMAT_VERSION,
    name: filename.replace(/\.json$/i, ""),
    commits: data.commits,
    timestamp: data.timestamp,
    savedAt: Date.now(),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
}

export function importFromFile(): Promise<ProfileData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as SavedProfile | ProfileData;

        if (parsed.commits && Array.isArray(parsed.commits)) {
          resolve({
            commits: parsed.commits,
            timestamp: (parsed as SavedProfile).timestamp ?? Date.now(),
          });
          return;
        }

        resolve(null);
      } catch {
        resolve(null);
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}
