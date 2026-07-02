# @repo/profiler-contract

Single source of truth for the React Profiler data contract.

Ported from `react-perf-profiler/packages/profile-contract`. Consumed by the
MAIN-world bridge, the ISOLATED content script, the background service worker,
the DevTools panel, and the analyzer Web Worker.

## Exports

- `@repo/profiler-contract` — pure TypeScript types only (no runtime deps)
- `@repo/profiler-contract/schema` — Zod schemas for runtime validation of payloads crossing a process boundary

The HTTP `ProfileClient` from RPP is intentionally NOT ported: FDH has no
`/api/profiles` web endpoint yet. Add it later when a sync feature lands.
