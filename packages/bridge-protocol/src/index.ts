/**
 * @repo/bridge-protocol — single source of truth for the FDH browser ↔ VS Code
 * bridge protocol.
 *
 * Used by `apps/ext` (browser extension) and `apps/vsx` (VS Code extension)
 * to keep both sides in sync. See `apps/vsx/CLAUDE.md` for the maintenance
 * contract.
 *
 * Exports:
 * - Types only (no runtime): from `./types`
 * - Zod runtime schemas + validator: from `./schemas`
 */

export * from "./types";
export * from "./schemas";
