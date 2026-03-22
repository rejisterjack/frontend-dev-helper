/**
 * Visual Regression Module Exports
 *
 * This module provides visual regression testing capabilities:
 * - BaselineManager: Store and manage baseline screenshots in IndexedDB
 * - DiffEngine: Pixel-perfect image comparison with diff generation
 */

export { baselineManager } from './baseline-manager';
export { diffEngine } from './diff-engine';
export type { DiffOptions, PixelComparison } from './diff-engine';
