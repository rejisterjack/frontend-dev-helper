import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSecret, setSecret, migrateLegacySecrets } from "../../lib/secrets";

// In-memory backing for the chrome.storage mocks so encrypted blobs
// survive across calls within a test.
let localStore: Record<string, unknown> = {};
let sessionStore: Record<string, unknown> = {};

beforeEach(() => {
  localStore = {};
  sessionStore = {};
  (global.chrome as any).storage.local = {
    get: (keys?: string | string[]) => {
      if (keys === undefined) return Promise.resolve({ ...localStore });
      const arr = Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const k of arr) if (k in localStore) out[k] = localStore[k];
      return Promise.resolve(out);
    },
    set: (obj: Record<string, unknown>) => {
      Object.assign(localStore, obj);
      return Promise.resolve();
    },
    remove: (keys: string | string[]) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) delete localStore[k];
      return Promise.resolve();
    },
  };
  (global.chrome as any).storage.session = {
    get: (keys?: string | string[]) => {
      if (keys === undefined) return Promise.resolve({ ...sessionStore });
      const arr = Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const k of arr) if (k in sessionStore) out[k] = sessionStore[k];
      return Promise.resolve(out);
    },
    set: (obj: Record<string, unknown>) => {
      Object.assign(sessionStore, obj);
      return Promise.resolve();
    },
  };
});

describe("secrets: round-trip encryption", () => {
  it("setSecret then getSecret returns the plaintext", async () => {
    await setSecret("aiApiKey", "sk-test-12345");
    const out = await getSecret("aiApiKey");
    expect(out).toBe("sk-test-12345");
  });

  it("stores ciphertext in storage.local, not plaintext", async () => {
    await setSecret("githubToken", "ghp_secretpat");
    const raw = localStore["fdh-secrets-blob"] as {
      githubToken?: { iv: string; ciphertext: string };
    };
    expect(raw.githubToken).toBeDefined();
    expect(raw.githubToken!.iv).toBeDefined();
    expect(raw.githubToken!.ciphertext).toBeDefined();
    // Plaintext must not appear in storage.
    const serialized = JSON.stringify(localStore);
    expect(serialized).not.toContain("ghp_secretpat");
  });

  it("empty setSecret clears the field", async () => {
    await setSecret("aiApiKey", "key-1");
    await setSecret("aiApiKey", "");
    expect(await getSecret("aiApiKey")).toBe("");
  });

  it("getSecret returns '' for never-set fields", async () => {
    expect(await getSecret("bridgeToken")).toBe("");
  });

  it("uses a fresh IV on each write (no IV reuse)", async () => {
    await setSecret("aiApiKey", "v1");
    const iv1 = (localStore["fdh-secrets-blob"] as { aiApiKey: { iv: string } })
      .aiApiKey.iv;
    await setSecret("aiApiKey", "v2");
    const iv2 = (localStore["fdh-secrets-blob"] as { aiApiKey: { iv: string } })
      .aiApiKey.iv;
    expect(iv1).not.toBe(iv2);
  });
});

describe("secrets: migration", () => {
  it("moves plaintext from legacy settings into encrypted storage and wipes the originals", async () => {
    localStore["fdh-settings-storage"] = {
      state: {
        ai: { apiKey: "legacy-ai-key" },
        github: { token: "legacy-gh" },
        vscode: { bridgeToken: "legacy-bridge" },
      },
    };

    await migrateLegacySecrets();

    expect(await getSecret("aiApiKey")).toBe("legacy-ai-key");
    expect(await getSecret("githubToken")).toBe("legacy-gh");
    expect(await getSecret("bridgeToken")).toBe("legacy-bridge");

    const stored = localStore["fdh-settings-storage"] as {
      state: {
        ai: { apiKey: string };
        github: { token: string };
        vscode: { bridgeToken: string };
      };
    };
    expect(stored.state.ai.apiKey).toBe("");
    expect(stored.state.github.token).toBe("");
    expect(stored.state.vscode.bridgeToken).toBe("");
  });

  it("is idempotent when there is nothing to migrate", async () => {
    // No legacy key present — calling migrate should be a no-op.
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    await migrateLegacySecrets();
    expect(consoleInfo).not.toHaveBeenCalled();
    consoleInfo.mockRestore();
  });
});
