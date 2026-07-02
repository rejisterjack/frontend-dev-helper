/**
 * Canonical profile data contract for the Frontend Dev Helper React Profiler.
 *
 * Ported from react-perf-profiler/packages/profile-contract/src/types.ts.
 *
 * This is the single source of truth for every type that crosses a process
 * boundary: MAIN-world bridge -> ISOLATED content script -> service worker ->
 * DevTools panel -> analyzer Web Worker.
 *
 * Constraints:
 *  - Pure types only. No runtime values, no browser/Node APIs.
 *  - No imports from `apps/ext` or `apps/web`.
 *  - Every type here that crosses the wire must have a mirroring Zod schema
 *    in `./schema.ts`.
 */

export type Severity = "low" | "medium" | "high" | "critical";

export interface SourceLocation {
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

/**
 * A serialized React Fiber node. Captured by the MAIN-world bridge from
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` and forwarded through
 * the extension pipeline.
 *
 * Note: `type`, `elementType`, and `memoizedState` are intentionally
 * `unknown` because React fibers carry heterogeneous runtime values
 * (functions, classes, symbols, raw state) that have no useful static shape.
 */
export interface FiberData {
  id: string;
  displayName: string;
  key: string | null;
  child: FiberData | null;
  sibling: FiberData | null;
  return: FiberData | null;
  type: unknown;
  elementType: unknown;
  memoizedProps: Record<string, unknown>;
  memoizedState: unknown;
  actualDuration: number;
  actualStartTime: number;
  selfBaseDuration: number;
  treeBaseDuration: number;
  tag: number;
  index: number;
  flags?: number;
  mode: number;
  sourceLocation?: SourceLocation;
}

export type RenderCauseType =
  | "props-changed"
  | "state-changed"
  | "parent-rerendered"
  | "context-changed"
  | "hooks-changed";

export interface RenderCauseEntry {
  type: RenderCauseType;
  details: string;
  changedKeys?: string[];
}

export interface RenderCause {
  fiberId: string;
  componentName: string;
  causes: RenderCauseEntry[];
}

export type PriorityLevelString =
  | "Immediate"
  | "UserBlocking"
  | "Normal"
  | "Low"
  | "Idle";

export interface InteractionData {
  id: number;
  name: string;
  timestamp: number;
}

/**
 * One React commit. This is the atomic unit captured by the bridge and the
 * atomic unit consumed by the analyzer.
 */
export interface CommitData {
  id: string;
  timestamp: number;
  priorityLevel: PriorityLevelString;
  interactions?: InteractionData[];
  duration: number;
  /** Full fiber tree for the commit. Absent on delta commits (`isDelta: true`). */
  rootFiber?: FiberData | null;
  /** Flat fiber list (alternative to walking `rootFiber`). */
  fibers?: FiberData[];
  reactVersion?: string;
  priorityLevelString?: PriorityLevelString;
  actualDuration?: number;
  actualStartTime?: number;
  renderCauses?: RenderCause[];
  changedFiberIds?: string[];
  /** Delta commits carry only the changed/removed fibers, not the full tree. */
  isDelta?: boolean;
  deltaChangedFibers?: FiberData[];
  deltaRemovedFiberIds?: string[];
}

// ---------------------------------------------------------------------------
// Analysis output types (computed by @repo/profiler-analyzer)
// ---------------------------------------------------------------------------

export interface ComponentMetrics {
  componentName: string;
  renderCount: number;
  wastedRenderCount: number;
  wastedRenderRate: number;
  totalRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  isMemoized: boolean;
  memoHitRate?: number;
  firstSeen: number;
  lastSeen: number;
}

export type WastedRenderIssueType =
  | "prop-reference"
  | "state-reference"
  | "inline-function"
  | "inline-object"
  | "inline-array"
  | "context-change";

export interface WastedRenderIssue {
  type: WastedRenderIssueType;
  description: string;
  suggestion: string;
  occurrences: string[];
  severity: Severity;
}

export type WastedRenderAction = "memo" | "useMemo" | "useCallback" | "none";

export interface WastedRenderReport {
  componentName: string;
  renderCount: number;
  totalRenders: number;
  wastedRenders: number;
  wastedRenderRate: number;
  recommendedAction: WastedRenderAction;
  estimatedSavingsMs: number;
  severity: Severity;
  issues: WastedRenderIssue[];
}

export type MemoIssueType =
  | "unstable-callback"
  | "unstable-object"
  | "unstable-array"
  | "inline-jsx"
  | "deep-prop";

export interface MemoIssue {
  type: MemoIssueType;
  propName: string;
  description: string;
  suggestion: string;
  severity: Severity;
}

export type MemoRecommendationType =
  | "useCallback"
  | "useMemo"
  | "React.memo"
  | "split-props";

export interface MemoRecommendation {
  type: MemoRecommendationType;
  description: string;
  codeExample?: string;
}

export interface MemoReport {
  componentName: string;
  hasMemo: boolean;
  currentHitRate: number;
  optimalHitRate: number;
  isEffective: boolean;
  issues: MemoIssue[];
  recommendations: MemoRecommendation[];
}

/** Backwards-compatible alias. */
export type MemoEffectivenessReport = MemoReport;

export type OptimizationType =
  | "memo"
  | "useMemo"
  | "useCallback"
  | "split-props"
  | "colocate-state";

export type Impact = "high" | "medium" | "low";

export interface OptimizationOpportunity {
  componentName: string;
  type: OptimizationType;
  impact: Impact;
  estimatedSavings: number;
  description: string;
}

export interface AnomalyReportEntry {
  commitIndex: number;
  duration: number;
  expectedRange: { low: number; high: number };
  zScore: number;
  severity: Severity;
}

export interface AnomalyReportGroup {
  componentName: string;
  reports: AnomalyReportEntry[];
}

export type TrendDirection = "improving" | "stable" | "degrading";

export interface TrendReportEntry {
  componentName: string;
  slope: number;
  rSquared: number;
  direction: TrendDirection;
  sampleSize: number;
}

export type RenderPattern = "burst" | "periodic" | "cascade" | "escalating";

export interface PatternReportEntry {
  pattern: RenderPattern;
  components: string[];
  description: string;
  confidence: number;
}

/**
 * The full analysis envelope. Persisted alongside the raw commit data and
 * surfaced to the user in the panel.
 */
export interface AnalysisResult {
  timestamp: number;
  totalCommits: number;
  wastedRenderReports: WastedRenderReport[];
  memoReports: MemoReport[];
  performanceScore: number;
  topOpportunities: OptimizationOpportunity[];
  anomalyReports?: AnomalyReportGroup[];
  trendReports?: TrendReportEntry[];
  patternReports?: PatternReportEntry[];
}

// ---------------------------------------------------------------------------
// Web Vitals (PerformanceObserver-derived, captured from the page)
// ---------------------------------------------------------------------------

export type WebVitalRating = "good" | "needs-improvement" | "poor";

export interface WebVitalMetric {
  name: "LCP" | "FCP" | "CLS" | "INP" | "FID" | "TTFB" | (string & {});
  value: number;
  rating: WebVitalRating;
  timestamp: number;
  element?: string;
}
