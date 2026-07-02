import { validateBridgeMessage } from "@repo/bridge-protocol";
import type { BridgeMessageEnvelope } from "@repo/bridge-protocol";
import type { VSCodeMessage } from "./vscode-protocol";
import { getBridgeToken } from "./bridge-token";

type MessageHandler = (message: VSCodeMessage) => void;
type RequestHandler = (
  method: string,
  params: Record<string, unknown>,
) => Promise<unknown>;
type StatusHandler = (connected: boolean) => void;

/**
 * VSCodeBridge — client-side WebSocket connection to the FDH VS Code
 * extension.
 *
 * Security model (Phase 0.3 of the ext audit):
 *   1. Every incoming frame is parsed and validated against the shared Zod
 *      schema in @repo/bridge-protocol. Malformed envelopes are dropped + logged.
 *   2. After the socket opens, the client sends an `Auth` envelope carrying
 *      the shared secret stored in the user's settings. The server replies
 *      `AuthOk` or `AuthFail`; until `AuthOk` arrives, outgoing messages are
 *      queued and incoming non-auth messages are ignored.
 */
export class VSCodeBridge {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<MessageHandler> = new Set();
  private requestHandlers = new Map<string, RequestHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30_000;
  private _connected = false;
  /** True once the server has replied `AuthOk` for this connection. */
  private _authed = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private missedHeartbeats = 0;
  private maxMissedHeartbeats = 3;
  private _connecting = false;
  /**
   * Outbound queue — populated between socket open and `AuthOk`. Flushed in
   * order once auth succeeds; messages added while disconnected are dropped
   * (callers check the return value of `send`).
   */
  private outbox: VSCodeMessage[] = [];
  /**
   * Token loaded in connect(); used in onopen. Cleared after use so it's
   * not retained in memory longer than necessary.
   */
  private pendingToken: string | null = null;

  constructor(port: number = 9456) {
    this.url = `ws://localhost:${port}`;
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  /** True only once the connection is both open AND authed. */
  get authed(): boolean {
    return this._authed;
  }

  /**
   * Open the WebSocket and authenticate. Resolves once the socket is OPEN
   * (auth then happens asynchronously via the Auth/AuthOk exchange).
   *
   * Returns false if the socket could not be opened OR no bridge token is
   * configured (the user must set one in Settings → Bridge first).
   */
  async connect(): Promise<boolean> {
    if (this._connecting) return false;
    this._connecting = true;
    this._authed = false;
    this.outbox = [];

    // The auth token lives in encrypted-at-rest storage — load it before
    // opening the socket so it's available in onopen.
    const token = await getBridgeToken().catch(() => "");
    if (!token) {
      console.warn("[FDH Bridge] No auth token configured — skipping connect.");
      this._connecting = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
      return false;
    }
    this.pendingToken = token;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this._connecting = false;
      this.scheduleReconnect();
      return false;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._connected = true;
      this._connecting = false;
      this.notifyStatus(true);
      // The very first frame must be Auth.
      this.ws!.send(
        JSON.stringify({
          type: "Auth",
          payload: {
            token: this.pendingToken ?? "",
            client: `ext@${getExtVersion()} (chrome)`,
          },
        }),
      );
      // Heartbeat is only meaningful once authed — start it after AuthOk.
    };

    this.ws.onclose = () => {
      this._connected = false;
      this._authed = false;
      this._connecting = false;
      this.outbox = [];
      this.stopHeartbeat();
      this.notifyStatus(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this._connected = false;
      this._authed = false;
      this._connecting = false;
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        // Malformed JSON — drop silently.
        return;
      }

      // Fast path for Auth result + heartbeat BEFORE running the full Zod
      // schema (the auth envelopes are simple and gating-critical).
      if (typeof parsed === "object" && parsed !== null) {
        const type = (parsed as { type?: string }).type;
        if (type === "AuthOk") {
          this._authed = true;
          this.startHeartbeat();
          this.flushOutbox();
          return;
        }
        if (type === "AuthFail") {
          console.warn(
            "[FDH Bridge] Server rejected auth token. Update the token in Settings → Bridge.",
          );
          // Stay connected so the user can fix the token without a reconnect
          // storm. The server will keep dropping our other messages until
          // we re-Auth, which the next connect() (after token update) does.
          this._authed = false;
          return;
        }
        if (type === "Pong") {
          this.missedHeartbeats = 0;
          return;
        }
      }

      // Until auth completes, ignore everything else.
      if (!this._authed) return;

      // Full schema validation for everything else. Malformed → drop + log.
      const result = validateBridgeMessage(parsed);
      if (!result.success) {
        console.warn(
          "[FDH Bridge] Dropping malformed message from server:",
          result.error.issues,
        );
        return;
      }
      const message = result.message as VSCodeMessage;

      if (message.type === "Request" && message.requestId && message.method) {
        this.handleRequest(
          message.requestId,
          message.method,
          message.payload ?? {},
        );
        return;
      }
      for (const handler of this.handlers) {
        handler(message);
      }
    };

    // Socket wired up — open/auth/handlers will fire asynchronously.
    return true;
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this._authed = false;
    this._connecting = false;
    this.outbox = [];
    this.reconnectAttempts = 0;
    this.notifyStatus(false);
  }

  /**
   * Send a message to the VS Code extension.
   *
   * Returns `false` if the socket is not open OR not yet authed; callers
   * that need guaranteed delivery should check the return value. Messages
   * sent before auth completes are queued and flushed on `AuthOk`.
   */
  send(message: VSCodeMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    if (!this._authed) {
      this.outbox.push(message);
      return false;
    }
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  jumpToSource(file: string, line: number, column: number): void {
    this.send({ type: "JumpToSource", payload: { file, line, column } });
  }

  openInEditor(file: string, line?: number, column?: number): void {
    this.send({ type: "OpenInEditor", payload: { file, line, column } });
  }

  onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  sendResponse(requestId: string, result: unknown): void {
    this.send({ type: "Response", requestId, result } as VSCodeMessage);
  }

  sendErrorResponse(requestId: string, error: string): void {
    this.send({ type: "Response", requestId, error } as VSCodeMessage);
  }

  private flushOutbox(): void {
    if (this.outbox.length === 0) return;
    const queued = this.outbox;
    this.outbox = [];
    for (const msg of queued) {
      try {
        this.ws?.send(JSON.stringify(msg));
      } catch {
        // Re-queue on failure; next flush will retry.
        this.outbox.push(msg);
      }
    }
  }

  private notifyStatus(connected: boolean): void {
    for (const handler of this.statusHandlers) {
      try {
        handler(connected);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;
    this.heartbeatTimer = setInterval(() => {
      if (!this._authed) return;
      this.missedHeartbeats++;
      if (this.missedHeartbeats > this.maxMissedHeartbeats) {
        // Connection is stale, force reconnect
        this.stopHeartbeat();
        if (this.ws) {
          this.ws.close();
        }
        return;
      }
      this.send({ type: "Ping" });
    }, 10_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async handleRequest(
    requestId: string,
    method: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    const handler = this.requestHandlers.get(method);
    if (!handler) {
      this.sendErrorResponse(requestId, `Unknown method: ${method}`);
      return;
    }
    try {
      const result = await handler(method, params);
      this.sendResponse(requestId, result);
    } catch (err) {
      this.sendErrorResponse(
        requestId,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;

    // Exponential backoff with cap, no hard limit on attempts
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      // Reset attempts counter periodically to avoid permanently long backoff
      if (this.reconnectAttempts > 20) {
        this.reconnectAttempts = 5;
      }
      void this.connect();
    }, delay);
  }
}

let bridgeInstance: VSCodeBridge | null = null;

export function getBridge(): VSCodeBridge {
  if (!bridgeInstance) {
    bridgeInstance = new VSCodeBridge();
  }
  return bridgeInstance;
}

export async function initBridge(port?: number): Promise<VSCodeBridge> {
  if (bridgeInstance) bridgeInstance.disconnect();
  bridgeInstance = new VSCodeBridge(port);
  await bridgeInstance.connect();
  return bridgeInstance;
}

/**
 * Read the extension's own version (for the Auth `client` field) without
 * pulling in the chrome.* types at module load time in tests.
 */
function getExtVersion(): string {
  try {
    // browser.runtime.id is provided by WXT/polyfill in the SW context.
    const manifest = (
      globalThis as {
        chrome?: { runtime?: { getManifest?: () => { version?: string } } };
      }
    ).chrome?.runtime?.getManifest?.();
    return manifest?.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// BridgeMessageEnvelope re-export kept for callers that import it from here.
export type { BridgeMessageEnvelope };
