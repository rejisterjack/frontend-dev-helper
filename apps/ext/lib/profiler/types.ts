/**
 * Bridge content script types (MAIN world).
 *
 * On-the-wire data shapes (`FiberData`, `SourceLocation`, `RenderCause`)
 * come from @repo/profiler-contract so the bridge cannot drift from the
 * rest of the extension. The `FiberTag` enum is local because it is not
 * part of the on-the-wire contract.
 *
 * Ported from react-perf-profiler/apps/ext/entrypoints/bridge.content/types.ts.
 */

export type {
  SourceLocation,
  FiberData,
  RenderCause,
} from "@repo/profiler-contract";

export enum FiberTag {
  FunctionComponent = 0,
  ClassComponent = 1,
  IndeterminateComponent = 2,
  HostRoot = 3,
  HostPortal = 4,
  HostComponent = 5,
  HostText = 6,
  Fragment = 7,
  Mode = 8,
  ContextConsumer = 9,
  ContextProvider = 10,
  ForwardRef = 11,
  Profiler = 12,
  SuspenseComponent = 13,
  MemoComponent = 14,
  SimpleMemoComponent = 15,
  LazyComponent = 16,
  IncompleteClassComponent = 17,
  DehydratedFragment = 18,
  SuspenseListComponent = 19,
  ScopeComponent = 21,
  OffscreenComponent = 22,
  LegacyHiddenComponent = 23,
  CacheComponent = 24,
  TracingMarkerComponent = 25,
}
