import { WebSocketServer, WebSocket } from "ws";
import {
  validateBridgeMessage,
  type BridgeMessageEnvelope,
} from "@repo/bridge-protocol";

export interface BridgeMessage extends BridgeMessageEnvelope {}

type MessageHandler = (message: BridgeMessage, ws: WebSocket) => void;

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private handlers = new Set<MessageHandler>();
  private _port: number = 9456;
  private _running = false;

  get port(): number {
    return this._port;
  }
  get running(): boolean {
    return this._running;
  }
  get clientCount(): number {
    return this.clients.size;
  }

  start(port: number = 9456): void {
    if (this._running) {
      this.stop();
    }
    this._port = port;

    this.wss = new WebSocketServer({ port });
    this._running = true;

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      ws.on("message", (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          // Malformed JSON — silently drop. (Server resilience.)
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
    for (const ws of this.clients) {
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
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
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
