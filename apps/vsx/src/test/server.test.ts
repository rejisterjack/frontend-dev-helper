import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { WebSocket } from "ws";
import { BridgeServer } from "../server";

const TEST_PORT = 9457;
const TEST_TOKEN = "test-bridge-token-aaaaaaaaaaaaaaaa";

function waitForListen(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = new WebSocket(`ws://127.0.0.1:${port}`);
    probe.once("open", () => {
      probe.once("close", () => resolve());
      probe.close();
    });
    probe.once("error", reject);
    setTimeout(() => reject(new Error("timeout waiting for listen")), 3000);
  });
}

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

async function authenticate(ws: WebSocket, token = TEST_TOKEN): Promise<void> {
  send(ws, {
    type: "Auth",
    payload: { token, client: "test" },
  });
  const reply = await nextMessage(ws);
  expect(reply.type).toBe("AuthOk");
}

describe("BridgeServer", () => {
  let server: BridgeServer;

  beforeEach(() => {
    server = new BridgeServer(TEST_TOKEN);
  });

  afterEach(() => {
    server.stop();
  });

  test("starts and reports running state", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));
    expect(server.running).toBe(true);
    expect(server.port).toBe(TEST_PORT);
    expect(server.clientCount).toBe(0);
    expect(server.authToken).toBe(TEST_TOKEN);
  });

  test("stop() clears running state", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    server.stop();
    expect(server.running).toBe(false);
    expect(server.clientCount).toBe(0);
  });

  test("rejects unauthenticated Ping", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    const ws = await connectClient(TEST_PORT);
    send(ws, { type: "Ping" });
    await expect(nextMessage(ws, 400)).rejects.toBeDefined();
    ws.close();
  });

  test("AuthFail on wrong token", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    const ws = await connectClient(TEST_PORT);
    send(ws, {
      type: "Auth",
      payload: { token: "wrong", client: "test" },
    });
    const reply = await nextMessage(ws);
    expect(reply.type).toBe("AuthFail");
    ws.close();
  });

  test("responds to Ping with Pong after Auth", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    const ws = await connectClient(TEST_PORT);
    await authenticate(ws);

    send(ws, { type: "Ping" });
    const reply = await nextMessage(ws);
    expect(reply.type).toBe("Pong");
    ws.close();
  });

  test("dispatches messages only after auth", async () => {
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
    expect(received.length).toBe(0);

    await authenticate(ws);
    send(ws, {
      type: "JumpToSource",
      payload: { file: "foo.ts", line: 10, column: 3 },
    });
    await new Promise((r) => setTimeout(r, 100));

    expect(received.length).toBe(1);
    expect(received[0].type).toBe("JumpToSource");
    ws.close();
  });

  test("broadcast() sends only to authed clients", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const c1 = await connectClient(TEST_PORT);
    const c2 = await connectClient(TEST_PORT);
    await authenticate(c1);
    await authenticate(c2);
    await new Promise((r) => setTimeout(r, 50));

    server.broadcast({ type: "ClearDiagnostics" });

    const m1 = await nextMessage(c1);
    const m2 = await nextMessage(c2);
    expect(m1.type).toBe("ClearDiagnostics");
    expect(m2.type).toBe("ClearDiagnostics");
    c1.close();
    c2.close();
  });

  test("closes socket after too many AuthFail attempts", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);
    const ws = await connectClient(TEST_PORT);

    for (let i = 0; i < 5; i++) {
      send(ws, {
        type: "Auth",
        payload: { token: "wrong", client: "test" },
      });
      const reply = await nextMessage(ws);
      expect(reply.type).toBe("AuthFail");
    }

    await new Promise<void>((resolve) => {
      ws.once("close", () => resolve());
      setTimeout(() => resolve(), 500);
    });
    expect(ws.readyState).not.toBe(WebSocket.OPEN);
  });

  test("ignores malformed JSON without crashing", async () => {
    server.start(TEST_PORT);
    await waitForListen(TEST_PORT);

    const ws = await connectClient(TEST_PORT);
    await authenticate(ws);
    ws.send("this is not json");
    send(ws, { type: "Ping" });
    const reply = await nextMessage(ws);
    expect(reply.type).toBe("Pong");
    ws.close();
  });
});
