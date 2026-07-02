/**
 * React Profiler Zustand store.
 *
 * Holds the in-memory recording state for the React Profiler DevTools panel:
 *  - the live fiberMap (rebuilt from delta commits sent by the MAIN-world bridge)
 *  - the full commit history
 *  - the latest analysis result from @repo/profiler-analyzer
 *  - connection status to the bridge
 *
 * Recording state (commits, fiberMap, analysisResult) is intentionally NOT
 * persisted by default — profiles can be very large. Use exportSession() to
 * save a session to disk or chrome.storage explicitly.
 */

import { create } from "zustand";
import type {
  CommitData,
  FiberData,
  AnalysisResult,
  RenderCause,
  SourceLocation,
  WebVitalMetric,
} from "@repo/profiler-contract";
import { runAnalysis } from "@repo/profiler-analyzer";

export type ProfilerConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "no-react"
  | "error";

export interface ProfilerSessionMeta {
  startedAt: number;
  endedAt?: number;
  reactVersion?: string;
  sourceUrl?: string;
}

export interface ScoreHistoryEntry {
  timestamp: number;
  score: number;
  commitCount: number;
}

export type BudgetMetric =
  | "maxRenderCount"
  | "maxWastedRenderRate"
  | "maxAvgRenderDuration"
  | "minMemoHitRate";

export interface BudgetRule {
  componentPattern: string;
  maxRenderCount?: number;
  maxWastedRenderRate?: number;
  maxAvgRenderDuration?: number;
  minMemoHitRate?: number;
}

export interface PerformanceBudget {
  id: string;
  name: string;
  rules: BudgetRule[];
  createdAt: number;
}

export interface BudgetViolation {
  componentName: string;
  rule: BudgetRule;
  metric: BudgetMetric;
  actualValue: number;
  threshold: number;
}

export interface TimeTravelState {
  /** Whether playback is currently running. */
  isPlaying: boolean;
  /** Currently selected commit index in the time-travel slider. */
  currentStep: number;
  /** Total number of steps available (= commits.length). */
  totalSteps: number;
  /** Playback multiplier (1x = real-time, 2x = half speed, etc.). */
  playbackSpeed: number;
}

interface ProfilerState {
  // Connection
  status: ProfilerConnectionStatus;
  reactVersion: string | undefined;
  lastError: string | undefined;
  // Recording
  isRecording: boolean;
  startedAt: number | undefined;
  // Data
  commits: CommitData[];
  fiberMap: Map<string, FiberData>;
  analysisResult: AnalysisResult | null;
  sessionMeta: ProfilerSessionMeta | null;
  // Cross-commit indexes (rebuilt from commits)
  sourceLocations: Map<string, SourceLocation>;
  renderCauses: Map<string, RenderCause[]>;
  // History
  scoreHistory: ScoreHistoryEntry[];
  // Budgets
  budgets: PerformanceBudget[];
  budgetViolations: BudgetViolation[];
  // Web Vitals
  webVitals: WebVitalMetric[];
  // Time travel
  timeTravel: TimeTravelState;

  // Actions
  setStatus: (status: ProfilerConnectionStatus) => void;
  setReactVersion: (version: string | undefined) => void;
  setError: (message: string | undefined) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addCommit: (commit: CommitData) => void;
  mergeDelta: (commit: CommitData) => void;
  recompute: () => void;
  clear: () => void;
  loadSession: (commits: CommitData[], meta?: ProfilerSessionMeta) => void;
  // Budgets
  addBudget: (budget: PerformanceBudget) => void;
  removeBudget: (id: string) => void;
  checkBudgets: () => void;
  // Web vitals
  addWebVital: (metric: WebVitalMetric) => void;
  // Time travel
  setTimeTravelPlaying: (isPlaying: boolean) => void;
  setTimeTravelStep: (step: number) => void;
  setTimeTravelSpeed: (speed: number) => void;
  nextTimeTravelStep: () => void;
  prevTimeTravelStep: () => void;
}

const MAX_COMMITS_IN_MEMORY = 5000;

function rebuildFiberMapFromCommits(
  commits: CommitData[],
): Map<string, FiberData> {
  const map = new Map<string, FiberData>();
  for (const commit of commits) {
    const fibers: FiberData[] = [];
    if (commit.fibers) fibers.push(...commit.fibers);
    if (commit.rootFiber) {
      collectRecursive(commit.rootFiber, fibers);
    }
    if (commit.isDelta && commit.deltaChangedFibers) {
      for (const f of commit.deltaChangedFibers) map.set(f.id, f);
      if (commit.deltaRemovedFiberIds) {
        for (const id of commit.deltaRemovedFiberIds) map.delete(id);
      }
    } else {
      for (const f of fibers) map.set(f.id, f);
    }
  }
  return map;
}

function collectRecursive(
  fiber: FiberData | null | undefined,
  out: FiberData[],
): void {
  if (!fiber) return;
  out.push(fiber);
  if (fiber.child) collectRecursive(fiber.child, out);
  if (fiber.sibling) collectRecursive(fiber.sibling, out);
}

export const useProfilerStore = create<ProfilerState>()((set, get) => ({
  status: "disconnected",
  reactVersion: undefined,
  lastError: undefined,
  isRecording: false,
  startedAt: undefined,
  commits: [],
  fiberMap: new Map(),
  analysisResult: null,
  sessionMeta: null,
  sourceLocations: new Map(),
  renderCauses: new Map(),
  scoreHistory: [],
  budgets: [],
  budgetViolations: [],
  webVitals: [],
  timeTravel: {
    isPlaying: false,
    currentStep: 0,
    totalSteps: 0,
    playbackSpeed: 1,
  },

  setStatus: (status) => set({ status }),
  setReactVersion: (reactVersion) => set({ reactVersion }),
  setError: (lastError) =>
    set({ lastError, status: lastError ? "error" : get().status }),

  startRecording: () => {
    const now = Date.now();
    set({
      isRecording: true,
      startedAt: now,
      commits: [],
      fiberMap: new Map(),
      analysisResult: null,
      sourceLocations: new Map(),
      renderCauses: new Map(),
      sessionMeta: {
        startedAt: now,
        reactVersion: get().reactVersion,
      },
    });
  },

  stopRecording: () => {
    const meta = get().sessionMeta;
    set({
      isRecording: false,
      sessionMeta: meta ? { ...meta, endedAt: Date.now() } : meta,
    });
    get().recompute();
  },

  addCommit: (commit) => {
    if (commit.isDelta) {
      get().mergeDelta(commit);
    } else {
      // Full commit — also update the fiber map
      const fibers: FiberData[] = [];
      if (commit.fibers) fibers.push(...commit.fibers);
      if (commit.rootFiber) collectRecursive(commit.rootFiber, fibers);
      const map = new Map(get().fiberMap);
      for (const f of fibers) map.set(f.id, f);
      set((state) => ({
        commits: [...state.commits, commit].slice(-MAX_COMMITS_IN_MEMORY),
        fiberMap: map,
      }));
    }
    indexCommitMeta(commit, get, set);
    syncTimeTravelLength(get, set);
    if (!get().isRecording) get().recompute();
  },

  mergeDelta: (commit) => {
    const map = new Map(get().fiberMap);
    if (commit.deltaChangedFibers) {
      for (const f of commit.deltaChangedFibers) map.set(f.id, f);
    }
    if (commit.deltaRemovedFiberIds) {
      for (const id of commit.deltaRemovedFiberIds) map.delete(id);
    }
    set((state) => ({
      commits: [...state.commits, commit].slice(-MAX_COMMITS_IN_MEMORY),
      fiberMap: map,
    }));
    indexCommitMeta(commit, get, set);
    syncTimeTravelLength(get, set);
    if (!get().isRecording) get().recompute();
  },

  recompute: () => {
    const commits = get().commits;
    if (commits.length === 0) {
      set({ analysisResult: null });
      return;
    }
    try {
      const result = runAnalysis(commits);
      set({ analysisResult: result });

      // Track score history — one entry per recompute after a stop.
      const meta = get().sessionMeta;
      if (meta && !get().isRecording) {
        const score = result.performanceScore;
        const lastEntry = get().scoreHistory[get().scoreHistory.length - 1];
        // Avoid duplicate entries from recompute() during the same session.
        if (
          !lastEntry ||
          lastEntry.timestamp !== (meta.endedAt ?? meta.startedAt)
        ) {
          set((state) => ({
            scoreHistory: [
              ...state.scoreHistory,
              {
                timestamp: meta.endedAt ?? meta.startedAt,
                score,
                commitCount: commits.length,
              },
            ].slice(-100),
          }));
        }
      }

      get().checkBudgets();
    } catch (err) {
      console.warn("[FDH Profiler] analysis failed:", err);
    }
  },

  clear: () =>
    set({
      commits: [],
      fiberMap: new Map(),
      analysisResult: null,
      sessionMeta: null,
      sourceLocations: new Map(),
      renderCauses: new Map(),
      isRecording: false,
      startedAt: undefined,
      timeTravel: {
        isPlaying: false,
        currentStep: 0,
        totalSteps: 0,
        playbackSpeed: 1,
      },
    }),

  loadSession: (commits, meta) => {
    const fiberMap = rebuildFiberMapFromCommits(commits);
    const sourceLocations = new Map<string, SourceLocation>();
    const renderCauses = new Map<string, RenderCause[]>();
    for (const commit of commits) {
      indexSourceLocations(commit, sourceLocations);
      indexRenderCauses(commit, renderCauses);
    }
    set({
      commits,
      fiberMap,
      sourceLocations,
      renderCauses,
      sessionMeta: meta ?? null,
      isRecording: false,
      analysisResult: null,
      timeTravel: {
        isPlaying: false,
        currentStep: 0,
        totalSteps: commits.length,
        playbackSpeed: 1,
      },
    });
    get().recompute();
  },

  addBudget: (budget) =>
    set((state) => ({
      budgets: [...state.budgets, budget],
    })),

  removeBudget: (id) =>
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    })),

  checkBudgets: () => {
    const { budgets, analysisResult, commits } = get();
    if (!analysisResult || budgets.length === 0) {
      set({ budgetViolations: [] });
      return;
    }

    const violations: BudgetViolation[] = [];
    const patternRegexCache = new Map<string, RegExp>();

    const matches = (pattern: string, name: string) => {
      let re = patternRegexCache.get(pattern);
      if (!re) {
        const escaped = pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*");
        re = new RegExp(`^${escaped}$`);
        patternRegexCache.set(pattern, re);
      }
      return re.test(name);
    };

    const reportsByName = new Map(
      analysisResult.wastedRenderReports.map((r) => [r.componentName, r]),
    );
    const memoByName = new Map(
      analysisResult.memoReports.map((r) => [r.componentName, r]),
    );
    const durationByName = computeAvgDurations(commits);

    for (const budget of budgets) {
      for (const rule of budget.rules) {
        const checkedNames = new Set<string>();

        for (const [name] of durationByName) {
          if (!matches(rule.componentPattern, name)) continue;
          if (checkedNames.has(name)) continue;
          checkedNames.add(name);

          const wasted = reportsByName.get(name);
          const memo = memoByName.get(name);
          const avgDuration = durationByName.get(name) ?? 0;
          const renderCount = wasted?.totalRenders ?? 0;
          const wastedRate = wasted?.wastedRenderRate ?? 0;
          const memoHit = memo?.currentHitRate ?? 100;

          if (
            rule.maxRenderCount != null &&
            renderCount > rule.maxRenderCount
          ) {
            violations.push({
              componentName: name,
              rule,
              metric: "maxRenderCount",
              actualValue: renderCount,
              threshold: rule.maxRenderCount,
            });
          }
          if (
            rule.maxWastedRenderRate != null &&
            wastedRate > rule.maxWastedRenderRate
          ) {
            violations.push({
              componentName: name,
              rule,
              metric: "maxWastedRenderRate",
              actualValue: wastedRate,
              threshold: rule.maxWastedRenderRate,
            });
          }
          if (
            rule.maxAvgRenderDuration != null &&
            avgDuration > rule.maxAvgRenderDuration
          ) {
            violations.push({
              componentName: name,
              rule,
              metric: "maxAvgRenderDuration",
              actualValue: avgDuration,
              threshold: rule.maxAvgRenderDuration,
            });
          }
          if (rule.minMemoHitRate != null && memoHit < rule.minMemoHitRate) {
            violations.push({
              componentName: name,
              rule,
              metric: "minMemoHitRate",
              actualValue: memoHit,
              threshold: rule.minMemoHitRate,
            });
          }
        }
      }
    }

    set({ budgetViolations: violations });
  },

  addWebVital: (metric) =>
    set((state) => ({
      webVitals: [...state.webVitals, metric].slice(-500),
    })),

  setTimeTravelPlaying: (isPlaying) =>
    set((state) => ({ timeTravel: { ...state.timeTravel, isPlaying } })),

  setTimeTravelStep: (step) =>
    set((state) => ({
      timeTravel: {
        ...state.timeTravel,
        currentStep: Math.max(
          0,
          Math.min(step, Math.max(0, state.timeTravel.totalSteps - 1)),
        ),
      },
    })),

  setTimeTravelSpeed: (playbackSpeed) =>
    set((state) => ({ timeTravel: { ...state.timeTravel, playbackSpeed } })),

  nextTimeTravelStep: () =>
    set((state) => ({
      timeTravel: {
        ...state.timeTravel,
        currentStep: Math.min(
          state.timeTravel.currentStep + 1,
          Math.max(0, state.timeTravel.totalSteps - 1),
        ),
      },
    })),

  prevTimeTravelStep: () =>
    set((state) => ({
      timeTravel: {
        ...state.timeTravel,
        currentStep: Math.max(state.timeTravel.currentStep - 1, 0),
      },
    })),
}));

// ── Helpers ──────────────────────────────────────────────────────────

function indexSourceLocations(
  commit: CommitData,
  map: Map<string, SourceLocation>,
): void {
  const fibers = collectCommitFibers(commit);
  for (const fiber of fibers) {
    if (fiber.sourceLocation?.fileName && fiber.displayName) {
      // Keep the first-seen location (most stable for diagnostics).
      if (!map.has(fiber.displayName)) {
        map.set(fiber.displayName, fiber.sourceLocation);
      }
    }
  }
}

function indexRenderCauses(
  commit: CommitData,
  map: Map<string, RenderCause[]>,
): void {
  if (!commit.renderCauses) return;
  for (const cause of commit.renderCauses) {
    const existing = map.get(cause.componentName) ?? [];
    existing.push(cause);
    map.set(cause.componentName, existing);
  }
}

function syncTimeTravelLength(
  get: () => ProfilerState,
  set: (partial: Partial<ProfilerState>) => void,
): void {
  const total = get().commits.length;
  const tt = get().timeTravel;
  const nextStep = Math.min(tt.currentStep, Math.max(0, total - 1));
  if (tt.totalSteps !== total || tt.currentStep !== nextStep) {
    set({ timeTravel: { ...tt, totalSteps: total, currentStep: nextStep } });
  }
}

function indexCommitMeta(
  commit: CommitData,
  get: () => ProfilerState,
  set: (partial: Partial<ProfilerState>) => void,
): void {
  let sourceLocations = get().sourceLocations;
  let renderCauses = get().renderCauses;

  const hasSource =
    commit.fibers?.some((f) => f.sourceLocation?.fileName) ||
    collectCommitFibers(commit).some((f) => f.sourceLocation?.fileName);
  const hasCauses = !!commit.renderCauses?.length;

  if (hasSource || hasCauses) {
    sourceLocations = new Map(get().sourceLocations);
    indexSourceLocations(commit, sourceLocations);
    renderCauses = new Map(get().renderCauses);
    indexRenderCauses(commit, renderCauses);
    set({ sourceLocations, renderCauses });
  }
}

function collectCommitFibers(commit: CommitData): FiberData[] {
  const out: FiberData[] = [];
  if (commit.fibers) out.push(...commit.fibers);
  if (commit.rootFiber) collectRecursive(commit.rootFiber, out);
  if (commit.deltaChangedFibers) out.push(...commit.deltaChangedFibers);
  return out;
}

function computeAvgDurations(commits: CommitData[]): Map<string, number> {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const commit of commits) {
    const fibers = collectCommitFibers(commit);
    for (const fiber of fibers) {
      if (!fiber.displayName || fiber.actualDuration == null) continue;
      totals.set(
        fiber.displayName,
        (totals.get(fiber.displayName) ?? 0) + fiber.actualDuration,
      );
      counts.set(fiber.displayName, (counts.get(fiber.displayName) ?? 0) + 1);
    }
  }
  const avg = new Map<string, number>();
  for (const [name, total] of totals) {
    const c = counts.get(name) ?? 1;
    avg.set(name, total / c);
  }
  return avg;
}
