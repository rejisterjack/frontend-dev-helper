import { WebSocketServer, WebSocket } from "ws";
import {
  generateBridgeToken,
  timingSafeEqualString,
  validateBridgeMessage,
  type BridgeMessageEnvelope,
} from "@repo/bridge-protocol";

export interface BridgeMessage extends BridgeMessageEnvelope {}

type MessageHandler = (message: BridgeMessage, ws: WebSocket) => void;

/**
 * A connected WebSocket plus its auth state. Until `authed` is true, the
 * server drops every non-`Auth` message from this client.
 */
interface ClientState {
  authed: boolean;
  clientId: string | null;
}

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientState>();
  private handlers = new Set<MessageHandler>();
  private _port: number = 9456;
  private _running = false;
  /**
   * The shared secret clients must present to authenticate. Generated on
   * every `start()` — call `getAuthToken()` after start to retrieve it and
   * surface it to the user (output channel / status bar).
   *
   * If `expectedToken` is passed to the constructor, that fixed value is
   * used across restarts (useful for tests).
   */
  private expectedToken: string | null = null;

  constructor(expectedToken?: string) {
    if (expectedToken !== undefined) this.expectedToken = expectedToken;
  }

  get port(): number {
    return this._port;
  }
  get running(): boolean {
    return this._running;
  }
  get clientCount(): number {
    return this.clients.size;
  }
  /**
   * The shared secret the active server expects, or null if the server is
   * not running. Call this right after `start()` and surface the value to
   * the user so they can paste it into the browser extension Settings.
   */
  get authToken(): string | null {
    return this.expectedToken;
  }

  start(port: number = 9456): void {
    if (this._running) {
      this.stop();
    }
    this._port = port;

    // Generate a fresh per-process secret unless the caller fixed one.
    if (this.expectedToken === null) {
      this.expectedToken = generateBridgeToken();
    }

    this.wss = new WebSocketServer({ port });
    this._running = true;

    this.wss.on("connection", (ws) => {
      this.clients.set(ws, { authed: false, clientId: null });

      ws.on("message", (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          // Malformed JSON — silently drop. (Server resilience.)
          return;
        }

        const state = this.clients.get(ws);
        if (!state) return; // Unknown client; ignore.

        // ----- Auth handshake ------------------------------------------------
        // `Auth` is processed BEFORE validation against the full schema
        // because it gates access to every other message type. We do a
        // minimal shape check here so a malformed Auth still gets rejected.
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (parsed as { type?: string }).type === "Auth"
        ) {
          const auth = parsed as {
            payload?: { token?: string; client?: string };
          };
          const presented = auth.payload?.token ?? "";
          const client = auth.payload?.client ?? "unknown";
          if (
            this.expectedToken !== null &&
            timingSafeEqualString(presented, this.expectedToken)
          ) {
            state.authed = true;
            state.clientId = client;
            this.send(ws, { type: "AuthOk", payload: { client } });
          } else {
            this.send(ws, {
              type: "AuthFail",
              payload: { reason: "invalid token" },
            });
            // Do NOT close — let the client retry with the right token.
          }
          return;
        }

        // Reject everything else until authed. Heartbeats are an exception
        // only for already-authed clients (Ping is in the validated set).
        if (!state.authed) {
          return;
        }

        // Fast path: Ping is intercepted and answered with Pong before any
        // handler or validator runs. This avoids spurious validation errors
        // for the heartbeat (which has no payload).
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (parsed as { type?: string }).type === "Ping"
        ) {
          this.send(ws, { type: "Pong" });
          return;
        }

        // Validate every other message against the shared Zod schema.
        // RR-5 in the audit: previously the server cast payloads with `as`
        // and silently no-op'd on shape mismatches. Now we log + drop.
        const result = validateBridgeMessage(parsed);
        if (!result.success) {
          console.warn(
            "[FDH] Dropping malformed bridge message:",
            result.error.issues,
          );
          return;
        }

        const message = result.message as BridgeMessage;
        for (const handler of this.handlers) {
          handler(message, ws);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });
      ws.on("error", () => {
        this.clients.delete(ws);
      });
    });

    this.wss.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[FDH] Port ${port} is already in use`);
      }
      this._running = false;
    });
  }

  stop(): void {
    for (const ws of this.clients.keys()) {
      ws.close();
    }
    this.clients.clear();
    this.wss?.close();
    this.wss = null;
    this._running = false;
    // Keep expectedToken across stop()/start() so a refresh doesn't
    // invalidate already-paired browser extensions.
  }

  send(ws: WebSocket, message: BridgeMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: BridgeMessage): void {
    const data = JSON.stringify(message);
    for (const [ws, state] of this.clients) {
      if (state.authed && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
