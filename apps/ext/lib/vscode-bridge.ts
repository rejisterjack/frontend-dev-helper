import type { VSCodeMessage } from './vscode-protocol';

type MessageHandler = (message: VSCodeMessage) => void;
type RequestHandler = (method: string, params: Record<string, unknown>) => Promise<unknown>;
type StatusHandler = (connected: boolean) => void;

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
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private missedHeartbeats = 0;
  private maxMissedHeartbeats = 3;
  private _connecting = false;

  constructor(port: number = 9456) {
    this.url = `ws://localhost:${port}`;
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  connect(): void {
    if (this._connecting) return;
    this._connecting = true;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this._connecting = false;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._connected = true;
      this._connecting = false;
      this.startHeartbeat();
      this.notifyStatus(true);
    };

    this.ws.onclose = () => {
      this._connected = false;
      this._connecting = false;
      this.stopHeartbeat();
      this.notifyStatus(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this._connected = false;
      this._connecting = false;
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as VSCodeMessage;

        // Handle pong for heartbeat
        if (message.type === 'Pong') {
          this.missedHeartbeats = 0;
          return;
        }

        if (message.type === 'Request' && message.requestId && message.method) {
          this.handleRequest(message.requestId, message.method, message.payload ?? {});
          return;
        }
        for (const handler of this.handlers) {
          handler(message);
        }
      } catch {
        // Ignore malformed messages
      }
    };
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
    this._connecting = false;
    this.reconnectAttempts = 0;
    this.notifyStatus(false);
  }

  send(message: VSCodeMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
    this.send({ type: 'JumpToSource', payload: { file, line, column } });
  }

  openInEditor(file: string, line?: number, column?: number): void {
    this.send({ type: 'OpenInEditor', payload: { file, line, column } });
  }

  onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  sendResponse(requestId: string, result: unknown): void {
    this.send({ type: 'Response', requestId, result } as VSCodeMessage);
  }

  sendErrorResponse(requestId: string, error: string): void {
    this.send({ type: 'Response', requestId, error } as VSCodeMessage);
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
      if (!this._connected) return;
      this.missedHeartbeats++;
      if (this.missedHeartbeats > this.maxMissedHeartbeats) {
        // Connection is stale, force reconnect
        this.stopHeartbeat();
        if (this.ws) {
          this.ws.close();
        }
        return;
      }
      this.send({ type: 'Ping' });
    }, 10_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async handleRequest(requestId: string, method: string, params: Record<string, unknown>): Promise<void> {
    const handler = this.requestHandlers.get(method);
    if (!handler) {
      this.sendErrorResponse(requestId, `Unknown method: ${method}`);
      return;
    }
    try {
      const result = await handler(method, params);
      this.sendResponse(requestId, result);
    } catch (err) {
      this.sendErrorResponse(requestId, err instanceof Error ? err.message : String(err));
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
      this.connect();
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

export function initBridge(port?: number): VSCodeBridge {
  if (bridgeInstance) bridgeInstance.disconnect();
  bridgeInstance = new VSCodeBridge(port);
  bridgeInstance.connect();
  return bridgeInstance;
}
