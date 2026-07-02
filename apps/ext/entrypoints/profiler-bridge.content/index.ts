/**
 * React Profiler Bridge — ISOLATED-world content script.
 *
 * Injects the MAIN-world bridge script (entrypoints/profiler-bridge-main-world.ts)
 * into the page, then relays messages between that bridge and the extension's
 * background service worker over a long-lived `chrome.runtime.connect` port.
 *
 * Authentication: this script generates a per-session random token, includes
 * it in every command sent to the bridge, and verifies it on every message
 * received back. The MAIN-world bridge learns the token from the first
 * inbound message and refuses messages that don't echo it.
 *
 * Port name: `fdh-profiler@<tabId>` — the background and DevTools panel use
 * this convention to route per-tab profiler traffic.
 */

import { injectScript } from "wxt/utils/inject-script";

const BRIDGE_SOURCE = "fdh-profiler-bridge";
const CONTENT_SOURCE = "fdh-profiler-content";
const MAIN_WORLD_SCRIPT_URL = "/profiler-bridge-main-world.js";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",

  async main(ctx) {
    // Token shared between this script and the MAIN-world bridge.
    const sessionToken = generateToken();

    // Connect to the background. Per-tab port name lets the background route
    // messages to the right DevTools panel instance.
    const tabIdPromise = getCurrentTabId();
    const tabId = await tabIdPromise;
    const portName = `fdh-profiler@${tabId ?? "unknown"}`;
    const port = chrome.runtime.connect({ name: portName });

    // Forward commands from background -> MAIN-world bridge.
    port.onMessage.addListener((msg: unknown) => {
      if (!msg || typeof msg !== "object") return;
      const record = msg as Record<string, unknown>;
      if (record["target"] !== "bridge") return;
      const targetOrigin =
        window.location.origin === "null" ? "*" : window.location.origin;
      window.postMessage(
        {
          source: CONTENT_SOURCE,
          token: sessionToken,
          payload: record["payload"],
        },
        targetOrigin,
      );
    });

    // Forward bridge -> background. Token check prevents page spoofing.
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (record["source"] !== BRIDGE_SOURCE) return;
      if (record["token"] !== sessionToken) return;
      port.postMessage({ from: "bridge", payload: record["payload"] });
    });

    // Inject the MAIN-world script. keepInDom: true so it survives SPA navigations.
    try {
      await injectScript(MAIN_WORLD_SCRIPT_URL, { keepInDom: true });
    } catch (err) {
      port.postMessage({
        from: "content",
        payload: {
          type: "ERROR",
          error: err instanceof Error ? err.message : String(err),
          errorType: "INJECT_FAILED",
          recoverable: false,
        },
      });
    }

    // Cleanup on invalidation (extension reloaded, tab closed).
    ctx.onInvalidated(() => {
      port.disconnect();
    });
  },
});

async function getCurrentTabId(): Promise<number | null> {
  try {
    const result = await chrome.runtime.sendMessage({
      type: "FDH_PROFILER_GET_TAB_ID",
    });
    if (result && typeof result === "object" && "tabId" in result) {
      const tabId = (result as { tabId: unknown }).tabId;
      return typeof tabId === "number" ? tabId : null;
    }
  } catch {
    // Service worker may be unavailable during initial load.
  }
  return null;
}
