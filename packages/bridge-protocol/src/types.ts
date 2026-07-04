/**
 * Type-only definitions for the FDH bridge protocol.
 *
 * These are authoritative — both `apps/ext` (browser extension) and
 * `apps/vsx` (VS Code extension) MUST consume them from here, NOT define
 * their own duplicate copies. See `apps/vsx/CLAUDE.md`.
 *
 * Single source of truth — fixes CF-4 / DX-6 in the production audit.
 */

export type BridgeMessageType =
  | "JumpToSource"
  | "OpenInEditor"
  | "ApplyFix"
  | "InspectElement"
  | "Ping"
  | "Pong"
  | "HighlightSource"
  | "ApplyCSSEdit"
  | "PreviewFix"
  | "ApplySourceFix"
  | "PublishDiagnostics"
  | "ClearDiagnostics"
  | "CreateFile"
  | "PerformanceAudit"
  | "Request"
  | "Response"
  | "Auth"
  | "AuthOk"
  | "AuthFail";

/**
 * The wire format. `payload` is loosely typed here; per-message-type
 * narrowing is done via the discriminated-union `BridgeMessageEnvelope`.
 */
export interface BridgeMessageEnvelope {
  type: BridgeMessageType;
  payload?: Record<string, unknown>;
  /** Used by Request/Response for RPC-style correlation. */
  requestId?: string;
  /** Method name for Request/Response. */
  method?: string;
  /** Successful result for Response. */
  result?: unknown;
  /** Error message for Response. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Phase 1 payloads
// ---------------------------------------------------------------------------

export interface JumpToSourcePayload {
  file: string;
  line: number;
  column: number;
  sourceMapUrl?: string;
}

export interface OpenInEditorPayload {
  file: string;
  line?: number;
  column?: number;
}

export interface ApplyFixPayload {
  file: string;
  content: string;
  description: string;
}

export interface InspectElementPayload {
  selector: string;
  html: string;
  computedStyles: Record<string, string>;
}

export interface HighlightSourcePayload {
  file: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

// ---------------------------------------------------------------------------
// Phase 2 payloads
// ---------------------------------------------------------------------------

export interface ApplyCSSEditPayload {
  file: string;
  edits: Array<{
    selector: string;
    property: string;
    value: string;
    oldValue: string;
  }>;
}

// ---------------------------------------------------------------------------
// Phase 3 payloads
// ---------------------------------------------------------------------------

export interface PreviewFixPayload {
  file: string;
  original: string;
  fixed: string;
  description: string;
  fixId: string;
}

export interface SourceFixRange {
  /** Start line, 1-based. */
  sl: number;
  /** Start column, 1-based. */
  sc: number;
  /** End line, 1-based. */
  el: number;
  /** End column, 1-based. */
  ec: number;
}

export interface ApplySourceFixPayload {
  file: string;
  edits: Array<{
    range: SourceFixRange;
    newText: string;
  }>;
}

// ---------------------------------------------------------------------------
// Phase 4 payloads
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticEntry {
  file: string;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
  rule: string;
}

export interface PublishDiagnosticsPayload {
  diagnostics: DiagnosticEntry[];
}

export interface ClearDiagnosticsPayload {}

export interface CreateFilePayload {
  filePath: string;
  content: string;
  openAfterCreate: boolean;
}

// ---------------------------------------------------------------------------
// Performance audit (Phase 5) — sent from ext to VS Code for surfacing in
// the Problems panel or a dedicated webview.
// ---------------------------------------------------------------------------

export type CWVMetric = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";

export interface PerformanceMetricEntry {
  metric: CWVMetric;
  /** Numeric value in the metric's natural unit (ms for LCP/INP/FCP/TTFB, unitless for CLS). */
  value: number;
  /** Numeric rating per the metric's scoring thresholds. */
  rating: "good" | "needs-improvement" | "poor";
}

export interface PerformanceAuditPayload {
  url: string;
  timestamp: number;
  overallScore: number;
  metrics: PerformanceMetricEntry[];
  /** Long tasks (>50ms) observed during the audit window, in ms. */
  longTasks: Array<{ duration: number; startTime: number }>;
  /** Free-form opportunities (e.g. "Reduce unused CSS", "Preconnect to origin"). */
  opportunities: Array<{ id: string; title: string; savingsMs: number }>;
}

// ---------------------------------------------------------------------------
// Auth handshake (Phase 0.3 of the ext audit)
// ---------------------------------------------------------------------------

/**
 * Sent by the client as the FIRST frame after opening the WebSocket.
 * The server compares `token` to its expected shared secret using a
 * constant-time comparison. Until auth succeeds, the server drops every
 * other message type. `client` identifies who is connecting (for logging).
 */
export interface AuthPayload {
  /** Shared secret printed by the VS Code extension on first start. */
  token: string;
  /** Human-readable client identifier, e.g. "ext@1.2.0 (chrome 124)". */
  client: string;
}

export interface AuthOkPayload {
  /** Echo of the client identifier that was authed. */
  client: string;
}

export interface AuthFailPayload {
  reason: string;
}

// ---------------------------------------------------------------------------
// Discriminated-union helpers
// ---------------------------------------------------------------------------

/**
 * Map of message-type → payload type. Used to derive typed envelopes via
 * the discriminated union below.
 */
export interface BridgePayloadMap {
  JumpToSource: JumpToSourcePayload;
  OpenInEditor: OpenInEditorPayload;
  ApplyFix: ApplyFixPayload;
  InspectElement: InspectElementPayload;
  Ping: Record<string, never>;
  Pong: Record<string, never>;
  HighlightSource: HighlightSourcePayload;
  ApplyCSSEdit: ApplyCSSEditPayload;
  PreviewFix: PreviewFixPayload;
  ApplySourceFix: ApplySourceFixPayload;
  PublishDiagnostics: PublishDiagnosticsPayload;
  ClearDiagnostics: ClearDiagnosticsPayload;
  CreateFile: CreateFilePayload;
  PerformanceAudit: PerformanceAuditPayload;
  Request: Record<string, unknown>;
  Response: Record<string, unknown>;
  Auth: AuthPayload;
  AuthOk: AuthOkPayload;
  AuthFail: AuthFailPayload;
}

/**
 * A strongly-typed message envelope. Narrowing on `type` yields the correct
 * `payload` type:
 *
 * ```ts
 * function handle(msg: TypedBridgeMessage) {
 *   if (msg.type === 'JumpToSource') {
 *     msg.payload.line; // number
 *   }
 * }
 * ```
 */
export type TypedBridgeMessage<
  T extends BridgeMessageType = BridgeMessageType,
> = {
  type: T;
  payload: BridgePayloadMap[T];
  requestId?: string;
};

/**
 * Loose envelope used at the wire boundary, before validation has narrowed
 * the payload.
 */
export type AnyBridgeMessage = {
  [T in BridgeMessageType]: TypedBridgeMessage<T>;
}[BridgeMessageType];
