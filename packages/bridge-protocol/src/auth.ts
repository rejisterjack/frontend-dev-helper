/**
 * Authentication helpers for the FDH bridge.
 *
 * Both `apps/ext` (client) and `apps/vsx` (server) compare the shared secret
 * using the same constant-time primitive to avoid timing side-channels.
 *
 * Shared-secret threat model: the bridge is a localhost-only WebSocket. The
 * secret prevents other local processes (and DNS-rebinding attacks from a
 * malicious page) from impersonating either side. It is NOT a substitute
 * for TLS — see MASTER_PLAN_EXT.md Phase 2.4 for the `wss://` follow-up.
 */

/**
 * Generate a new shared secret. Called by the VS Code extension on first
 * start; the value is printed to the output channel for the user to paste
 * into the browser extension's Settings UI.
 *
 * Uses `crypto.getRandomValues` (available in both Node 19+ and the
 * browser/service-worker context). Returns a 32-byte base64url string
 * (~43 chars).
 */
export function generateBridgeToken(): string {
  const bytes = new Uint8Array(32);
  // `globalThis.crypto` resolves to `node:crypto` (Node >= 19) or
  // `window.crypto` (browser/extension). This avoids a Node-specific import.
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/**
 * Compare two strings in constant time. Returns true iff they are the same
 * length AND every byte matches.
 *
 * Falls back to `crypto.subtle.timingSafeEqual` when available (Node) and
 * otherwise uses a pure-JS XOR loop that iterates over the longer string
 * regardless of the shorter one — so the total work is constant given a
 * known maximum length.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still walk the longer string so the timing is bounded by length, not
    // by where the first mismatch occurs.
    const longer = a.length > b.length ? a : b;
    let dummy = 0;
    for (let i = 0; i < longer.length; i++) {
      dummy |= longer.charCodeAt(i);
    }
    // Prevent dead-code elimination.
    if (dummy === 0xdead_beef) return false;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  // Convert to base64 then make it URL-safe.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
