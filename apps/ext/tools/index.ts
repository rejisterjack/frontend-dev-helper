/**
 * Tools barrel.
 *
 * Phase 1.5 (audit remediation): removed `toolRegistry`, `toolsByCategory`,
 * and `getToolDefinition` from `tools/registry.ts`. The previous Proxy-based
 * registry returned a no-op cleanup function from `run()` (see git history),
 * which silently leaked overlay DOM nodes, event listeners, and intervals for
 * every tool that was ever invoked through it.
 *
 * The real loader is `loadTool()` from `./lazy-registry`, which is what
 * `content/tool-runner.ts` already uses. UI surfaces use `toolMetadata` /
 * `metadataByCategory` directly. No live consumer referenced the registry, so
 * the file was deleted rather than rewritten.
 */
export type {
  ToolDefinition,
  ToolContext,
  ToolCategory,
  ConfigField,
} from "./types";
export { toolMetadata, metadataByCategory } from "./metadata";
export type { ToolMetadata } from "./metadata";
export { loadTool, isToolLoaded, getLoadedTool } from "./lazy-registry";
