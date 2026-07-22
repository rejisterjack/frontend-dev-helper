import { WebSocketServer, WebSocket } from "ws";
import {
  generateBridgeToken,
  timingSafeEqualString,
  validateBridgeMessage,
  type BridgeMessageEnvelope,
} from "@repo/bridge-protocol";

export interface BridgeMessage extends BridgeMessageEnvelope {}

type MessageHandler = (message: BridgeMessage, ws: WebSocket) => void;

interface ClientState {
  authed: boolean;
  clientId: string | null;
  authFailures: number;
}

const MAX_AUTH_FAILURES = 5;

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientState>();
  private handlers = new Set<MessageHandler>();
  private _port: number = 9456;
  private _running = false;
  private expectedToken: string | null = null;

  constructor(expectedToken?: string) {
    if (expectedToken !== undefined) {this.expectedToken = expectedToken;}
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
  get authToken(): string | null {
    return this.expectedToken;
  }

  start(port: number = 9456): void {
    if (this._running) {
      this.stop();
    }
    this._port = port;

    if (this.expectedToken === null) {
      this.expectedToken = generateBridgeToken();
    }

    // Loopback only — do not bind all interfaces (LAN exposure risk).
    this.wss = new WebSocketServer({ port, host: "127.0.0.1" });
    this._running = true;

    this.wss.on("connection", (ws) => {
      this.clients.set(ws, {
        authed: false,
        clientId: null,
        authFailures: 0,
      });

      ws.on("message", (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          return;
        }

        const state = this.clients.get(ws);
        if (!state) {return;}

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
            state.authFailures = 0;
            this.send(ws, { type: "AuthOk", payload: { client } });
          } else {
            state.authFailures += 1;
            this.send(ws, {
              type: "AuthFail",
              payload: { reason: "invalid token" },
            });
            if (state.authFailures >= MAX_AUTH_FAILURES) {
              ws.close();
            }
          }
          return;
        }

        if (!state.authed) {
          return;
        }

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (parsed as { type?: string }).type === "Ping"
        ) {
          this.send(ws, { type: "Pong" });
          return;
        }

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
