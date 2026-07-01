import assert from "node:assert";
import { WebSocket } from "ws";
import { BridgeServer } from "../src/server";

const TEST_PORT = 9457;

/**
 * Helper: resolve once the server is listening on `port`.
 */
function waitForListen(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = new WebSocket(`ws://127.0.0.1:${port}`);
    probe.once("open", () => {
      probe.close();
      resolve();
    });
    probe.once("error", reject);
    setTimeout(() => reject(new Error("timeout waiting for listen")), 3000);
  });
}

/**
 * Helper: open a client WebSocket against the server, with auto-close on
 * test teardown.
 */
function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
    setTimeout(
      () => reject(new Error("timeout waiting for client connect")),
      3000,
    );
  });
}

function send(ws: WebSocket, message: unknown): void {
  ws.send(JSON.stringify(message));
}

function nextMessage(ws: WebSocket, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("timeout waiting for message")),
      timeoutMs,
    );
    ws.once("message", (raw) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(raw.toString()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

suite("BridgeServer", () => {
  let server: BridgeServer;

  setup(() => {
    server = new BridgeServer();
  });

  teardown(() => {
    server.stop();
  });

  test("starts and reports running state", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    assert.strictEqual(server.running, true);
    assert.strictEqual(server.port, TEST_PORT);
    assert.strictEqual(server.clientCount, 0);
  });

  test("stop() clears running state and closes the server", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    server.stop();
    assert.strictEqual(server.running, false);
    // A new connection should now fail.
    await assert.rejects(() => connectClient(TEST_PORT), Error);
  });

  test("start() on an already-running server restarts it", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    // Restart on a new port without explicit stop().
    server.start(TEST_PORT + 1);
    await waitForListen(TEST_PORT + 1);
    assert.strictEqual(server.port, TEST_PORT + 1);
    assert.strictEqual(server.running, true);
  });

  test("tracks connected clients", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const c1 = await connectClient(TEST_PORT);
    // Give the server a tick to register the connection.
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(server.clientCount, 1);

    const c2 = await connectClient(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(server.clientCount, 2);

    c1.close();
    c2.close();
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(server.clientCount, 0);
  });

  test("responds to Ping with Pong", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    const ws = await connectClient(TEST_PORT);

    send(ws, { type: "Ping" });
    const reply = await nextMessage(ws);
    assert.strictEqual(reply.type, "Pong");
    ws.close();
  });

  test("dispatches non-Ping messages to registered handlers", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const received: any[] = [];
    server.onMessage((msg) => received.push(msg));

    const ws = await connectClient(TEST_PORT);
    send(ws, {
      type: "JumpToSource",
      payload: { file: "foo.ts", line: 10, column: 3 },
    });
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].type, "JumpToSource");
    assert.deepStrictEqual(received[0].payload, {
      file: "foo.ts",
      line: 10,
      column: 3,
    });
    ws.close();
  });

  test("does NOT dispatch Ping to handlers", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const received: any[] = [];
    server.onMessage((msg) => received.push(msg));

    const ws = await connectClient(TEST_PORT);
    send(ws, { type: "Ping" });
    await new Promise((r) => setTimeout(r, 100));

    // Ping is intercepted and answered with Pong — handlers must NOT see it.
    assert.strictEqual(received.length, 0);
    ws.close();
  });

  test("broadcast() sends to all connected clients", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const c1 = await connectClient(TEST_PORT);
    const c2 = await connectClient(TEST_PORT);
    // Drain the (possible) initial messages so the next thing we see is the
    // broadcast.
    await new Promise((r) => setTimeout(r, 50));

    server.broadcast({ type: "ClearDiagnostics" });

    const m1 = await nextMessage(c1);
    const m2 = await nextMessage(c2);
    assert.strictEqual(m1.type, "ClearDiagnostics");
    assert.strictEqual(m2.type, "ClearDiagnostics");
    c1.close();
    c2.close();
  });

  test("send() to a closed client is a no-op (does not throw)", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const ws = await connectClient(TEST_PORT);
    const dead = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise<void>((resolve, reject) =>
      dead.once("open", () => resolve()).once("error", reject),
    );
    dead.close();
    await new Promise((r) => setTimeout(r, 100));

    // The server still has the reference in its Set; send() must check
    // readyState and silently skip.
    assert.doesNotThrow(() => server.send(dead, { type: "Pong" }));
    ws.close();
  });

  test("onMessage() returns an unsubscribe function", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const received: any[] = [];
    const off = server.onMessage((msg) => received.push(msg));

    const ws = await connectClient(TEST_PORT);
    send(ws, { type: "HighlightSource", payload: {} });
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(received.length, 1);

    off();
    send(ws, { type: "HighlightSource", payload: {} });
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(received.length, 1); // still 1 — handler was removed
    ws.close();
  });

  test("ignores malformed JSON without crashing", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const ws = await connectClient(TEST_PORT);
    // Send raw invalid bytes.
    ws.send("this is not json");
    // Server should still respond to a subsequent Ping — proving it's alive.
    send(ws, { type: "Ping" });
    const reply = await nextMessage(ws);
    assert.strictEqual(reply.type, "Pong");
    ws.close();
  });
});
