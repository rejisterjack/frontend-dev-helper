/**
 * AI integration types for the React Profiler.
 *
 * Reuses @repo/profiler-contract for shared data types. The AIConfig type
 * is intentionally omitted — the React Profiler does NOT carry its own AI
 * config; it reuses the global LLM config set in the FDH Settings panel.
 */

import type {
  ComponentMetrics,
  CommitData,
  RenderCause,
  SourceLocation,
} from "@repo/profiler-contract";

export type AISuggestionCategory =
  | "memoization"
  | "state-colocation"
  | "prop-optimization"
  | "context-optimization"
  | "lazy-loading"
  | "render-strategy"
  | "useCallback"
  | "useMemo";

export interface AISuggestion {
  componentName: string;
  issue: string;
  suggestion: string;
  codeExample: string;
  confidence: number;
  category?: AISuggestionCategory;
}

export interface AIRenderContext {
  /** Render causes for this component across commits */
  renderCauses: RenderCause[];
  /** Source location if available (dev builds) */
  sourceLocation: SourceLocation | null;
  /** Prop names that change frequently */
  unstableProps: string[];
  /** Parent component chain */
  parentChain: string[];
  /** Child components that also re-render */
  childRenders: string[];
  /** Summary of the component's Fiber tree neighborhood */
  treeDepth: number;
  treeSiblingCount: number;
}

export interface AIAnalysisRequest {
  componentName: string;
  metrics: ComponentMetrics;
  commits: CommitData[];
  renderContext?: AIRenderContext;
}
