# @repo/profiler-analyzer

Pure analysis engine for React profiling data. Zero browser dependencies.

Ported from `react-perf-profiler/apps/ext/packages/analyzer`. Consumed by the React Profiler panel in `apps/ext`.

## Exports

- `runAnalysis(commits)` — full pipeline producing an `AnalysisResult` (score, wasted renders, memo reports, opportunities, anomalies, trends, patterns)
- `analyzeWastedRenders`, `calculateFrameImpact`
- `analyzeMemoization`
- `calculatePerformanceScore`
- `detectAnomalies`, `detectTrends`, `detectPatterns`
- `shallowEqual`

All types are re-exported from `./types`.
