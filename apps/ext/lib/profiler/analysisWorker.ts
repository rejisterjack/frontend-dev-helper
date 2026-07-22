/**
 * Analysis Web Worker — offloads the React profile analysis pipeline from the
 * main thread of the DevTools panel.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/utils/analysisWorker.ts.
 * Uses @repo/profiler-analyzer's runAnalysis() as the analysis entry point
 * (no need to re-implement the pipeline here).
 */

/// <reference lib="webworker" />

import type { AnalysisResult, CommitData } from "@repo/profiler-contract";
import { profileDataSchema } from "@repo/profiler-contract/schema";
import {
  analyzeWastedRenders,
  analyzeMemoization,
  calculatePerformanceScore,
} from "@repo/profiler-analyzer";
import type { OptimizationOpportunity } from "@repo/profiler-contract";

export interface WorkerAnalysisRequest {
  type: "ANALYZE";
  commits: CommitData[];
}

export interface WorkerAnalysisProgress {
  type: "PROGRESS";
  phase: string;
  progress: number;
}

export interface WorkerAnalysisResult {
  type: "RESULT";
  result: AnalysisResult;
}

export interface WorkerAnalysisError {
  type: "ERROR";
  error: string;
}

export type WorkerMessage =
  | WorkerAnalysisRequest
  | WorkerAnalysisProgress
  | WorkerAnalysisResult
  | WorkerAnalysisError;

function generateOpportunities(
  wastedReports: import("@repo/profiler-contract").WastedRenderReport[],
  memoReports: import("@repo/profiler-contract").MemoReport[],
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  for (const report of wastedReports) {
    if (report.recommendedAction === "none") continue;
    const impact: Record<string, "high" | "medium" | "low"> = {
      critical: "high",
      high: "high",
      medium: "medium",
      low: "low",
    };
    opportunities.push({
      componentName: report.componentName,
      type: report.recommendedAction,
      impact: impact[report.severity] ?? "low",
      estimatedSavings: report.estimatedSavingsMs,
      description: `"${report.componentName}" wastes ${report.wastedRenderRate}% of its ${report.totalRenders} renders. Recommended: ${report.recommendedAction}.`,
    });
  }

  for (const report of memoReports) {
    if (report.isEffective) continue;
    for (const rec of report.recommendations) {
      const typeMap: Record<string, OptimizationOpportunity["type"]> = {
        useCallback: "useCallback",
        useMemo: "useMemo",
        "React.memo": "memo",
        "split-props": "split-props",
      };
      const opportunityType = typeMap[rec.type] ?? "memo";
      const exists = opportunities.some(
        (o) =>
          o.componentName === report.componentName &&
          o.type === opportunityType,
      );
      if (exists) continue;
      opportunities.push({
        componentName: report.componentName,
        type: opportunityType,
        impact:
          report.currentHitRate < 30
            ? "high"
            : report.currentHitRate < 60
              ? "medium"
              : "low",
        estimatedSavings: 0,
        description: rec.description,
      });
    }
  }

  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  opportunities.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  return opportunities;
}

const ctx = self as any as {
  onmessage: ((ev: MessageEvent<WorkerAnalysisRequest>) => void) | null;
  postMessage: (
    message:
      | WorkerAnalysisProgress
      | WorkerAnalysisResult
      | WorkerAnalysisError,
  ) => void;
};

ctx.onmessage = (ev: MessageEvent<WorkerAnalysisRequest>) => {
  const { type, commits } = ev.data;
  if (type !== "ANALYZE") return;

  try {
    const parsed = profileDataSchema.safeParse(commits);
    if (!parsed.success) {
      ctx.postMessage({
        type: "ERROR",
        error: `Invalid profile payload: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`,
      });
      return;
    }
    const validCommits = parsed.data;

    ctx.postMessage({
      type: "PROGRESS",
      phase: "wasted-renders",
      progress: 0.25,
    });
    const wastedRenderReports = analyzeWastedRenders(validCommits);

    ctx.postMessage({ type: "PROGRESS", phase: "memoization", progress: 0.5 });
    const memoReports = analyzeMemoization(validCommits);

    ctx.postMessage({ type: "PROGRESS", phase: "scoring", progress: 0.75 });
    const performanceScore = calculatePerformanceScore(
      wastedRenderReports,
      memoReports,
      validCommits,
    );

    ctx.postMessage({
      type: "PROGRESS",
      phase: "opportunities",
      progress: 0.9,
    });
    const topOpportunities = generateOpportunities(
      wastedRenderReports,
      memoReports,
    );

    const result: AnalysisResult = {
      timestamp: Date.now(),
      totalCommits: validCommits.length,
      wastedRenderReports,
      memoReports,
      performanceScore,
      topOpportunities,
    };

    ctx.postMessage({ type: "RESULT", result });
  } catch (error) {
    ctx.postMessage({
      type: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
