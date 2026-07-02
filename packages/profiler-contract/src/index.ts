/**
 * Public entry point of @repo/profiler-contract.
 *
 * Re-exports the canonical TypeScript types. Zod schemas live in
 * `@repo/profiler-contract/schema` to keep the type-only import path free of
 * the `zod` runtime dependency for consumers that only need types.
 */

export * from "./types.js";
