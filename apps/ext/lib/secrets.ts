/**
 * Encrypted-at-rest secret storage for the FDH extension.
 *
 * Threat model:
 *   `chrome.storage.local` is NOT encrypted on disk — its backing IndexedDB
 *   file can be read by anyone with filesystem access to the user's profile
 *   directory. Phase 0.4 of the ext audit flagged this for the AI API key
 *   and GitHub PAT.
 *
 * Approach:
 *   - Generate a random 256-bit AES-GCM key on first run, kept in
 *     `chrome.storage.session` (in-memory, scoped to the extension process,
 *     cleared on browser close, NOT exposed to content scripts).
 *   - Encrypt each secret with that key + a fresh IV per write, store the
 *     `{ iv, ciphertext }` blob back in `chrome.storage.local`.
 *   - On read: pull the key from session storage, decrypt, return plaintext.
 *   - If the session key is missing (browser restarted), the secrets are
 *     unreadable and the caller treats them as empty — the user re-enters
 *     them. This is the intended behavior: an attacker who copies the
 *     profile directory after the browser closed gets only ciphertext.
 *
 * Performance: WebCrypto AES-GCM is native and ~microsecond for these
 * sizes, so the async API here is the only overhead.
 */

const SESSION_KEY_NAME = "fdh-secret-key";
const LOCAL_BLOB_NAME = "fdh-secrets-blob";

interface EncryptedBlob {
  iv: string; // base64
  ciphertext: string; // base64
}

interface SecretsBlob {
  aiApiKey?: EncryptedBlob;
  githubToken?: EncryptedBlob;
  bridgeToken?: EncryptedBlob;
}

type SecretField = keyof SecretsBlob;

let cachedKey: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const existing = await chrome.storage.session.get(SESSION_KEY_NAME);
  if (existing[SESSION_KEY_NAME] instanceof ArrayBuffer) {
    cachedKey = await crypto.subtle.importKey(
      "raw",
      existing[SESSION_KEY_NAME] as ArrayBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    return cachedKey;
  }

  // First run — generate a new 256-bit key. We MUST mark it extractable
  // so we can persist the raw key bytes to chrome.storage.session; otherwise
  // `exportKey` throws `InvalidAccessException: key is not extractable`.
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  await chrome.storage.session.set({ [SESSION_KEY_NAME]: raw });
  cachedKey = key;
  return key;
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function encrypt(plaintext: string): Promise<EncryptedBlob> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return { iv: bufToBase64(iv.buffer), ciphertext: bufToBase64(ciphertext) };
}

async function decrypt(blob: EncryptedBlob): Promise<string> {
  const key = await getOrCreateKey();
  const iv = new Uint8Array(base64ToBuf(blob.iv));
  const dec = new TextDecoder();
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBuf(blob.ciphertext),
    );
    return dec.decode(plaintext);
  } catch {
    // Key mismatch (e.g. session key rotated) — treat as empty so the user
    // is prompted to re-enter the secret in Settings.
    return "";
  }
}

async function readBlob(): Promise<SecretsBlob> {
  const result = await chrome.storage.local.get(LOCAL_BLOB_NAME);
  return (result[LOCAL_BLOB_NAME] as SecretsBlob) ?? {};
}

async function writeBlob(blob: SecretsBlob): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_BLOB_NAME]: blob });
}

/**
 * Read a decrypted secret. Returns '' if not set OR if decryption fails
 * (e.g. after a browser restart cleared the session key).
 */
export async function getSecret(field: SecretField): Promise<string> {
  const blob = await readBlob();
  const entry = blob[field];
  if (!entry) return "";
  return decrypt(entry);
}

/**
 * Write a secret. Empty/null plaintext clears the field.
 */
export async function setSecret(
  field: SecretField,
  plaintext: string,
): Promise<void> {
  const blob = await readBlob();
  if (!plaintext) {
    delete blob[field];
  } else {
    blob[field] = await encrypt(plaintext);
  }
  await writeBlob(blob);
}

/**
 * Migrate a plaintext secret from the legacy storage.local location into
 * encrypted-at-rest storage. Idempotent — once migrated, the plaintext copy
 * is deleted and subsequent calls are no-ops.
 *
 * Called on extension startup (background SW init).
 */
export async function migrateLegacySecrets(): Promise<void> {
  // The legacy secrets lived under fdh-settings-storage.state.{ai.github,vscode}.
  const LEGACY = "fdh-settings-storage";
  const stored = (await chrome.storage.local.get(LEGACY))[LEGACY] as
    | {
        state?: {
          ai?: { apiKey?: string };
          github?: { token?: string };
          vscode?: { bridgeToken?: string };
        };
      }
    | undefined;

  const state = stored?.state;
  if (!state) return;

  let migrated = false;

  if (state.ai?.apiKey) {
    await setSecret("aiApiKey", state.ai.apiKey);
    state.ai.apiKey = "";
    migrated = true;
  }
  if (state.github?.token) {
    await setSecret("githubToken", state.github.token);
    state.github.token = "";
    migrated = true;
  }
  if (state.vscode?.bridgeToken) {
    await setSecret("bridgeToken", state.vscode.bridgeToken);
    state.vscode.bridgeToken = "";
    migrated = true;
  }

  if (migrated) {
    await chrome.storage.local.set({ [LEGACY]: stored });
    console.info("[FDH] Migrated plaintext secrets to encrypted storage.");
  }
}
