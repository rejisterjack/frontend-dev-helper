import { z } from "zod";

/**
 * Runtime-validated Zod schemas for the FDH bridge protocol.
 *
 * Single source of truth — `apps/ext` (Zod 4) and `apps/vsx` should consume
 * these instead of duplicating the cast-and-hope pattern.
 *
 * NOTE on the Zod version split (audit finding DX-6): this package declares
 * `zod ^4.4.3`. `apps/ext` already uses Zod 4 and consumes cleanly.
 * `apps/web` and `apps/mcp` use Zod 3 and do NOT consume this package. If
 * they ever need to, either bump them to Zod 4 OR add a compatibility shim.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const fileSchema = z
  .string()
  .min(1)
  .describe("Workspace-relative or absolute file path.");
const positiveLineSchema = z
  .number()
  .int()
  .positive()
  .describe("1-based line number.");
const nonNegativeColSchema = z
  .number()
  .int()
  .nonnegative()
  .describe("0- or 1-based column number.");

// ---------------------------------------------------------------------------
// Per-message-type payload schemas
// ---------------------------------------------------------------------------

export const jumpToSourcePayloadSchema = z.object({
  file: fileSchema,
  line: positiveLineSchema,
  column: nonNegativeColSchema,
  sourceMapUrl: z.string().url().optional(),
});

export const openInEditorPayloadSchema = z.object({
  file: fileSchema,
  line: positiveLineSchema.optional(),
  column: nonNegativeColSchema.optional(),
});

export const applyFixPayloadSchema = z.object({
  file: fileSchema,
  content: z.string(),
  description: z.string().default(""),
});

export const inspectElementPayloadSchema = z.object({
  selector: z.string(),
  html: z.string(),
  computedStyles: z.record(z.string(), z.string()),
});

export const highlightSourcePayloadSchema = z.object({
  file: fileSchema,
  startLine: positiveLineSchema,
  startCol: nonNegativeColSchema,
  endLine: positiveLineSchema,
  endCol: nonNegativeColSchema,
});

export const cssEditSchema = z.object({
  selector: z.string(),
  property: z.string(),
  value: z.string(),
  oldValue: z.string(),
});

export const applyCSSEditPayloadSchema = z.object({
  file: fileSchema,
  edits: z.array(cssEditSchema).min(1),
});

export const previewFixPayloadSchema = z.object({
  file: fileSchema,
  original: z.string(),
  fixed: z.string(),
  description: z.string().default(""),
  fixId: z.string().min(1),
});

export const sourceFixRangeSchema = z
  .object({
    sl: positiveLineSchema,
    sc: nonNegativeColSchema,
    el: positiveLineSchema,
    ec: nonNegativeColSchema,
  })
  .refine((r) => (r.sl === r.el ? r.sc <= r.ec : r.sl < r.el), {
    message: "end position must not precede start position",
  });

export const sourceFixEditSchema = z.object({
  range: sourceFixRangeSchema,
  newText: z.string(),
});

export const applySourceFixPayloadSchema = z.object({
  file: fileSchema,
  edits: z.array(sourceFixEditSchema).min(1),
});

export const diagnosticSeveritySchema = z.enum(["error", "warning", "info"]);

export const diagnosticEntrySchema = z.object({
  file: fileSchema,
  line: positiveLineSchema,
  column: nonNegativeColSchema,
  severity: diagnosticSeveritySchema,
  message: z.string().min(1),
  rule: z.string(),
});

export const publishDiagnosticsPayloadSchema = z.object({
  diagnostics: z.array(diagnosticEntrySchema),
});

export const clearDiagnosticsPayloadSchema = z.object({}).strict();

export const createFilePayloadSchema = z.object({
  filePath: fileSchema,
  content: z.string(),
  openAfterCreate: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Performance audit
// ---------------------------------------------------------------------------

export const performanceMetricSchema = z.object({
  metric: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB"]),
  value: z.number().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
});

export const performanceAuditPayloadSchema = z.object({
  url: z.string().min(1),
  timestamp: z.number().nonnegative(),
  overallScore: z.number().min(0).max(100),
  metrics: z.array(performanceMetricSchema),
  longTasks: z.array(
    z.object({
      duration: z.number().nonnegative(),
      startTime: z.number().nonnegative(),
    }),
  ),
  opportunities: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      savingsMs: z.number().nonnegative(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Request / Response (RPC envelopes used by apps/ext VSCodeBridge)
// ---------------------------------------------------------------------------

export const requestSchema = z.object({
  type: z.literal("Request"),
  requestId: z.string().min(1),
  method: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const responseSchema = z.object({
  type: z.literal("Response"),
  requestId: z.string().min(1),
  // A response carries either `result` or `error`, but Zod can't easily
  // express "exactly one of" without a superRefine — keep both optional so
  // callers can branch on presence.
  result: z.unknown().optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Auth handshake
// ---------------------------------------------------------------------------

export const authPayloadSchema = z.object({
  token: z.string().min(8),
  client: z.string().min(1).max(128),
});

export const authOkPayloadSchema = z.object({
  client: z.string().min(1).max(128),
});

export const authFailPayloadSchema = z.object({
  reason: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Discriminated-union of all message envelopes
// ---------------------------------------------------------------------------

export const bridgeMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("JumpToSource"),
    payload: jumpToSourcePayloadSchema,
  }),
  z.object({
    type: z.literal("OpenInEditor"),
    payload: openInEditorPayloadSchema,
  }),
  z.object({ type: z.literal("ApplyFix"), payload: applyFixPayloadSchema }),
  z.object({
    type: z.literal("InspectElement"),
    payload: inspectElementPayloadSchema,
  }),
  z.object({
    type: z.literal("Ping"),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("Pong"),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("HighlightSource"),
    payload: highlightSourcePayloadSchema,
  }),
  z.object({
    type: z.literal("ApplyCSSEdit"),
    payload: applyCSSEditPayloadSchema,
  }),
  z.object({ type: z.literal("PreviewFix"), payload: previewFixPayloadSchema }),
  z.object({
    type: z.literal("ApplySourceFix"),
    payload: applySourceFixPayloadSchema,
  }),
  z.object({
    type: z.literal("PublishDiagnostics"),
    payload: publishDiagnosticsPayloadSchema,
  }),
  z.object({
    type: z.literal("ClearDiagnostics"),
    payload: clearDiagnosticsPayloadSchema.optional(),
  }),
  z.object({ type: z.literal("CreateFile"), payload: createFilePayloadSchema }),
  z.object({
    type: z.literal("PerformanceAudit"),
    payload: performanceAuditPayloadSchema,
  }),
  // RPC + auth envelopes never carry a `payload`; their fields are top-level.
  requestSchema,
  responseSchema,
  z.object({ type: z.literal("Auth"), payload: authPayloadSchema }),
  z.object({ type: z.literal("AuthOk"), payload: authOkPayloadSchema }),
  z.object({ type: z.literal("AuthFail"), payload: authFailPayloadSchema }),
]);

/**
 * Validate an unknown message received over the wire.
 *
 * @returns `{ success: true, message }` on valid input,
 *          `{ success: false, error }` on invalid input.
 */
export function validateBridgeMessage(
  raw: unknown,
):
  | { success: true; message: z.infer<typeof bridgeMessageSchema> }
  | { success: false; error: z.ZodError } {
  const result = bridgeMessageSchema.safeParse(raw);
  if (result.success) {
    return { success: true, message: result.data };
  }
  return { success: false, error: result.error };
}
