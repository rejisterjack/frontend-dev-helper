import { describe, it, expect, beforeEach } from "vitest";
import { useConnectionStore } from "@/stores/use-connection-store";

describe("useConnectionStore", () => {
  beforeEach(() => {
    useConnectionStore.getState().reset();
  });

  it("starts disconnected", () => {
    const s = useConnectionStore.getState();
    expect(s.tabId).toBeNull();
    expect(s.contentScriptReady).toBe(false);
    expect(s.vscodeConnected).toBe(false);
    expect(s.vscodeConnecting).toBe(false);
    expect(s.supportedTools).toEqual([]);
    expect(s.lastHeartbeat).toBe(0);
  });

  it("setTabId sets the tab", () => {
    useConnectionStore.getState().setTabId(42);
    expect(useConnectionStore.getState().tabId).toBe(42);
  });

  it("setContentScriptReady(true) records a heartbeat timestamp", () => {
    useConnectionStore.getState().setContentScriptReady(true);
    const s = useConnectionStore.getState();
    expect(s.contentScriptReady).toBe(true);
    expect(s.lastHeartbeat).toBeGreaterThan(0);
  });

  it("setContentScriptReady(false) zeroes the heartbeat", () => {
    useConnectionStore.getState().setContentScriptReady(true);
    useConnectionStore.getState().setContentScriptReady(false);
    expect(useConnectionStore.getState().contentScriptReady).toBe(false);
    expect(useConnectionStore.getState().lastHeartbeat).toBe(0);
  });

  it("setVscodeConnected(true) clears connecting", () => {
    useConnectionStore.getState().setVscodeConnecting(true);
    useConnectionStore.getState().setVscodeConnected(true);
    const s = useConnectionStore.getState();
    expect(s.vscodeConnected).toBe(true);
    expect(s.vscodeConnecting).toBe(false);
  });

  it("setVscodeConnecting flips the flag", () => {
    useConnectionStore.getState().setVscodeConnecting(true);
    expect(useConnectionStore.getState().vscodeConnecting).toBe(true);
  });

  it("updateSupportedTools replaces the list + bumps heartbeat", () => {
    const before = useConnectionStore.getState().lastHeartbeat;
    useConnectionStore.getState().updateSupportedTools(["a", "b"]);
    const s = useConnectionStore.getState();
    expect(s.supportedTools).toEqual(["a", "b"]);
    expect(s.lastHeartbeat).toBeGreaterThanOrEqual(before);
  });

  it("reset returns to initial state", () => {
    useConnectionStore.getState().setTabId(7);
    useConnectionStore.getState().setVscodeConnected(true);
    useConnectionStore.getState().reset();
    const s = useConnectionStore.getState();
    expect(s.tabId).toBeNull();
    expect(s.vscodeConnected).toBe(false);
  });
});
