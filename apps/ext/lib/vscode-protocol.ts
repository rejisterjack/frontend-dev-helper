export interface VSCodeMessage {
  type:
    | 'JumpToSource'
    | 'OpenInEditor'
    | 'ApplyFix'
    | 'InspectElement'
    | 'Ping'
    | 'Pong'
    | 'HighlightSource'
    | 'ApplyCSSEdit'
    | 'PreviewFix'
    | 'ApplySourceFix'
    | 'PublishDiagnostics'
    | 'ClearDiagnostics'
    | 'CreateFile'
    | 'Request'
    | 'Response';
  payload?: Record<string, unknown>;
  requestId?: string;
  method?: string;
  result?: unknown;
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

export interface ApplySourceFixPayload {
  file: string;
  edits: Array<{
    range: { sl: number; sc: number; el: number; ec: number };
    newText: string;
  }>;
}

// ---------------------------------------------------------------------------
// Phase 4 payloads
// ---------------------------------------------------------------------------

export interface PublishDiagnosticsPayload {
  diagnostics: Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule: string;
  }>;
}

export interface ClearDiagnosticsPayload {}

export interface CreateFilePayload {
  filePath: string;
  content: string;
  openAfterCreate: boolean;
}
