import type { SessionRecording } from './session-recorder';

const DB_NAME = 'fdh-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const MAX_SESSIONS = 50;
const MAX_STORAGE_MB = 100;

export class SessionStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };
    });
  }

  async saveSession(session: SessionRecording): Promise<void> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onsuccess = async () => {
        await this.pruneIfNeeded();
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save session: ${request.error?.message}`));
      };
    });
  }

  async getSessions(): Promise<SessionRecording[]> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = (request.result as SessionRecording[]).sort(
          (a, b) => b.startTime - a.startTime,
        );
        resolve(sessions);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get sessions: ${request.error?.message}`));
      };
    });
  }

  async getSession(id: string): Promise<SessionRecording | null> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve((request.result as SessionRecording) || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get session: ${request.error?.message}`));
      };
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to delete session: ${request.error?.message}`));
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to clear sessions: ${request.error?.message}`));
      };
    });
  }

  async getStorageSize(): Promise<number> {
    await this.ensureDb();
    const sessions = await this.getSessions();
    // Estimate: each session stored as JSON in IndexedDB
    let totalBytes = 0;
    for (const session of sessions) {
      totalBytes += new Blob([JSON.stringify(session)]).size;
    }
    return totalBytes;
  }

  private async pruneIfNeeded(): Promise<void> {
    const sessions = await this.getSessions();

    let needsPrune = false;

    // Check count limit
    if (sessions.length > MAX_SESSIONS) {
      needsPrune = true;
    }

    // Check storage size limit
    if (!needsPrune) {
      const sizeBytes = await this.getStorageSize();
      const sizeMB = sizeBytes / (1024 * 1024);
      if (sizeMB > MAX_STORAGE_MB) {
        needsPrune = true;
      }
    }

    if (!needsPrune) return;

    // Sessions are sorted by startTime descending; delete oldest (last in array)
    const excess = sessions.length - MAX_SESSIONS;
    const toDelete = excess > 0
      ? sessions.slice(-excess)
      : [sessions[sessions.length - 1]]; // Delete at least the oldest

    for (const session of toDelete) {
      await this.deleteSession(session.id);
    }
  }

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }
}

let storageInstance: SessionStorage | null = null;

export function getSessionStorage(): SessionStorage {
  if (!storageInstance) {
    storageInstance = new SessionStorage();
  }
  return storageInstance;
}
