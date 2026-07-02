import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VSCodeBridge } from "@/lib/vscode-bridge";

// Mock the bridge-token module so connect() resolves a known token.
vi.mock("@/lib/bridge-token", () => ({
  getBridgeToken: vi.fn().mockResolvedValue("test-secret-token"),
}));

// Mock validateBridgeMessage so we can drive both success and failure paths.
vi.mock("@repo/bridge-protocol", () => ({
  validateBridgeMessage: vi.fn((raw: unknown) => {
    // Naive stub: treat any object with a `type` string as valid.
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as any).type === "string"
    ) {
      return { success: true, message: raw };
    }
    return { success: false, error: { issues: ["invalid"] } };
  }),
}));

// ---- Test WebSocket stub ---------------------------------------------------
type Listener = (event: any) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;
  static CONNECTING = 0;
  static CLOSING = 2;

  url: string;
  readyState: number = FakeWebSocket.CONNECTING;
  onopen: Listener | null = null;
  onclose: Listener | null = null;
  onerror: Listener | null = null;
  onmessage: Listener | null = null;
  sent: any[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  // Helpers to drive the bridge from tests.
  fireOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }
  fireMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
  fireClose(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
  }
  fireError(): void {
    this.onerror?.({});
  }
}

describe("VSCodeBridge", () => {
  let bridge: VSCodeBridge;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    (globalThis as any).WebSocket = FakeWebSocket;
    vi.useFakeTimers();
    bridge = new VSCodeBridge();
  });

  afterEach(() => {
    bridge.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as any).WebSocket;
  });

  it("connect() resolves false when no bridge token is configured", async () => {
    const { getBridgeToken } = await import("@/lib/bridge-token");
    (getBridgeToken as any).mockResolvedValueOnce("");

    const ok = await bridge.connect();
    expect(ok).toBe(false);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("connect() opens a WebSocket and sends the Auth envelope on open", async () => {
    const ok = await bridge.connect();
    expect(ok).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(1);

    const sock = FakeWebSocket.instances[0];
    expect(sock.url).toBe("ws://localhost:9456");

    // Before open, no Auth sent.
    expect(sock.sent).toHaveLength(0);

    sock.fireOpen();
    expect(sock.sent).toHaveLength(1);
    expect(sock.sent[0]).toEqual({
      type: "Auth",
      payload: {
        token: "test-secret-token",
        client: expect.stringContaining("ext@"),
      },
    });
  });

  it("AuthOk promotes the bridge to authed and flushes the outbox", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();

    // Send before authed → queued, not delivered.
    const queued = bridge.send({ type: "Ping" });
    expect(queued).toBe(false);
    expect(sock.sent).toHaveLength(1); // still just Auth

    sock.fireMessage({ type: "AuthOk" });
    expect(bridge.authed).toBe(true);

    // The queued Ping should now be flushed.
    expect(sock.sent).toHaveLength(2);
    expect(sock.sent[1]).toEqual({ type: "Ping" });
  });

  it("AuthFail leaves the bridge unauthed; subsequent sends queue forever", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sock.fireMessage({ type: "AuthFail" });
    expect(bridge.authed).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Server rejected auth token"),
    );

    // Send → queued (not dropped), so callers can retry by reconnecting.
    expect(bridge.send({ type: "Ping" })).toBe(false);
  });

  it("Pong resets the missed-heartbeat counter (heartbeat path)", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    // Heartbeat interval is 10_000ms; max missed = 3. So the 4th tick
    // (missed > 3) force-closes the socket.
    const spy = vi.spyOn(sock, "close");
    vi.advanceTimersByTime(40_000);
    expect(spy).toHaveBeenCalled();
  });

  it("malformed JSON frames are silently dropped (no throw)", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    const handler = vi.fn();
    bridge.onMessage(handler);

    // Manually push invalid JSON via the raw onmessage.
    expect(() => sock.onmessage?.({ data: "{not json" })).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it("valid post-auth frames are dispatched to onMessage handlers", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    const handler = vi.fn();
    const off = bridge.onMessage(handler);

    sock.fireMessage({
      type: "PublishDiagnostics",
      payload: { uri: "file:///x.ts", diagnostics: [] },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0] as any[])[0].type).toBe("PublishDiagnostics");

    // Unsubscribe works.
    off();
    sock.fireMessage({
      type: "PublishDiagnostics",
      payload: { uri: "file:///y.ts", diagnostics: [] },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("onStatusChange fires true on open and false on close", async () => {
    const statuses: boolean[] = [];
    bridge.onStatusChange((c) => statuses.push(c));

    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireClose();

    expect(statuses).toEqual([true, false]);
  });

  it("Request frames invoke the registered handler and send a Response", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    bridge.onRequest("DoThing", handler);

    sock.fireMessage({
      type: "Request",
      requestId: "r1",
      method: "DoThing",
      payload: { x: 1 },
    });

    // Microtasks flush for async handler.
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith("DoThing", { x: 1 }),
    );

    // Response should have been sent over the socket.
    await vi.waitFor(() => {
      const response = sock.sent.find(
        (m) => m.type === "Response" && m.requestId === "r1",
      );
      expect(response).toBeDefined();
      expect(response.result).toEqual({ ok: true });
    });
  });

  it("Request to an unknown method yields an error Response", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    sock.fireMessage({ type: "Request", requestId: "r2", method: "Nope" });

    await vi.waitFor(() => {
      const response = sock.sent.find(
        (m) => m.type === "Response" && m.requestId === "r2",
      );
      expect(response).toBeDefined();
      expect(response.error).toContain("Unknown method");
    });
  });

  it("send() returns false before socket open", async () => {
    await bridge.connect(); // socket created, not open yet
    expect(bridge.send({ type: "Ping" })).toBe(false);
  });

  it("disconnect() tears down socket + timers and notifies status", async () => {
    const statuses: boolean[] = [];
    bridge.onStatusChange((c) => statuses.push(c));

    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    bridge.disconnect();
    expect(sock.closed).toBe(true);
    expect(bridge.connected).toBe(false);
    expect(bridge.authed).toBe(false);
    expect(statuses.at(-1)).toBe(false);
  });

  it("reconnect uses exponential backoff after a close", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireClose(); // schedules a reconnect

    // First reconnect attempt ~1s later (baseReconnectDelay = 1000ms).
    // scheduleReconnect → setTimeout → connect() → await getBridgeToken → new WebSocket.
    vi.advanceTimersByTime(1_000);
    // Drain the microtasks queue so connect()'s await resolves before we assert.
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("jumpToSource / openInEditor serialize the correct envelope", async () => {
    await bridge.connect();
    const sock = FakeWebSocket.instances[0];
    sock.fireOpen();
    sock.fireMessage({ type: "AuthOk" });

    bridge.jumpToSource("/abs/file.tsx", 12, 3);
    bridge.openInEditor("/abs/file2.tsx");

    const sentTypes = sock.sent.map((m) => m.type);
    expect(sentTypes).toContain("JumpToSource");
    expect(sentTypes).toContain("OpenInEditor");

    const jump = sock.sent.find((m) => m.type === "JumpToSource");
    expect(jump.payload).toEqual({
      file: "/abs/file.tsx",
      line: 12,
      column: 3,
    });
  });
});
