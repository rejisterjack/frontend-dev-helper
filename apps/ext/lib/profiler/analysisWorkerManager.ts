/**
 * Analysis Worker Manager — clean API for running the analysis pipeline in a
 * Web Worker with progress reporting. Falls back to synchronous execution
 * when Workers are unavailable (e.g. in environments without Worker support).
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/utils/analysisWorkerManager.ts.
 */

import type { AnalysisResult, CommitData } from "@repo/profiler-contract";
import { runAnalysis } from "@repo/profiler-analyzer";
import type {
  WorkerAnalysisError,
  WorkerAnalysisProgress,
  WorkerAnalysisRequest,
  WorkerAnalysisResult,
} from "./analysisWorker";

export type ProgressCallback = (phase: string, progress: number) => void;

let worker: Worker | null = null;
let isRunning = false;

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./analysisWorker.ts", import.meta.url), {
      type: "module",
    });
    return worker;
  } catch {
    return null;
  }
}

export function runAnalysisAsync(
  commits: CommitData[],
  onProgress?: ProgressCallback,
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    if (!w) {
      try {
        const result = runAnalysis(commits);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      return;
    }

    if (isRunning) {
      reject(new Error("Analysis already running"));
      return;
    }

    isRunning = true;

    const handleMessage = (
      ev: MessageEvent<
        WorkerAnalysisProgress | WorkerAnalysisResult | WorkerAnalysisError
      >,
    ) => {
      const msg = ev.data;
      switch (msg.type) {
        case "PROGRESS":
          onProgress?.(msg.phase, msg.progress);
          break;
        case "RESULT":
          cleanup();
          resolve(msg.result);
          break;
        case "ERROR":
          cleanup();
          reject(new Error(msg.error));
          break;
      }
    };

    const handleError = (ev: ErrorEvent) => {
      cleanup();
      reject(new Error(ev.message));
    };

    const cleanup = () => {
      isRunning = false;
      w.removeEventListener("message", handleMessage);
      w.removeEventListener("error", handleError);
    };

    w.addEventListener("message", handleMessage);
    w.addEventListener("error", handleError);

    const request: WorkerAnalysisRequest = { type: "ANALYZE", commits };
    w.postMessage(request);
  });
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  isRunning = false;
}
