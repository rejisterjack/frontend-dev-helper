/**
 * Bridge protocol types for the browser extension.
 *
 * Re-exported from `@repo/bridge-protocol`, the single source of truth
 * shared with `apps/vsx`. Fixing CF-4 / DX-6 in the production audit.
 *
 * Back-compat: existing imports of `VSCodeMessage` etc. from this file
 * continue to work.
 *
 * Future work: migrate call sites to import from `@repo/bridge-protocol`
 * directly, then delete this file.
 */
export type {
  AnyBridgeMessage,
  ApplyCSSEditPayload,
  ApplyFixPayload,
  ApplySourceFixPayload,
  BridgeMessageEnvelope,
  BridgeMessageType,
  BridgePayloadMap,
  ClearDiagnosticsPayload,
  CreateFilePayload,
  DiagnosticEntry,
  DiagnosticSeverity,
  HighlightSourcePayload,
  InspectElementPayload,
  JumpToSourcePayload,
  OpenInEditorPayload,
  PreviewFixPayload,
  PublishDiagnosticsPayload,
  SourceFixRange,
  TypedBridgeMessage,
} from "@repo/bridge-protocol/types";

// Back-compat alias. The original name in this file was `VSCodeMessage`.
import type { BridgeMessageEnvelope } from "@repo/bridge-protocol/types";
export type VSCodeMessage = BridgeMessageEnvelope;
