import { getSecret } from "./secrets";

/**
 * Read the bridge auth token from encrypted-at-rest storage.
 *
 * Used by lib/vscode-bridge.ts in the background service worker. The token
 * is stored via lib/secrets.ts (AES-GCM with a session-scoped key) so that
 * the on-disk chrome.storage.local file does not contain it in plaintext.
 *
 * Note: this is async, but VSCodeBridge.connect() needs the token synchronously
 * at socket-open time. The bridge therefore reads the token eagerly via
 * `await getBridgeToken()` before attempting to open the socket — see the
 * `connect()` method.
 *
 * For the sync call sites that existed before Phase 0.4, callers should
 * `await getBridgeToken()` and pass the result in.
 */
export async function getBridgeToken(): Promise<string> {
  return getSecret("bridgeToken");
}
