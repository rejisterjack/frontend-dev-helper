/**
 * Shared helpers to keep content-script work off the critical path on large DOMs.
 */

export const DEFAULT_DOM_SAMPLING = {
  /** Above this node count, tools may sample instead of scanning every node. */
  largeDomThreshold: 1500,
  /** Max elements to process in one synchronous chunk before yielding. */
  chunkSize: 400,
} as const;

/**
 * Schedule work during idle time or after a short timeout (fallback).
 */
export function runWhenIdle(fn: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => fn(), { timeout: 500 });
    return;
  }
  setTimeout(fn, 0);
}

/**
 * Iterate a NodeList or array in chunks, yielding between chunks.
 */
export function forEachElementChunked<T extends Element>(
  nodes: ArrayLike<T>,
  chunkSize: number,
  visitor: (el: T) => void,
  onChunkComplete?: () => void
): void {
  const total = nodes.length;
  let i = 0;

  const step = () => {
    const end = Math.min(i + chunkSize, total);
    for (; i < end; i++) {
      visitor(nodes[i]);
    }
    if (i < total) {
      onChunkComplete?.();
      runWhenIdle(step);
    }
  };

  step();
}

export function shouldSampleDom(estimatedNodes: number): boolean {
  return estimatedNodes > DEFAULT_DOM_SAMPLING.largeDomThreshold;
}

/**
 * Approximate number of elements (includes expensive query on huge trees; prefer caching count per walk).
 */
export function estimateElementCount(root: Document | Element = document): number {
  return root.querySelectorAll('*').length;
}

/**
 * Stride 1 = visit every node; stride > 1 = visit every Nth node on large DOMs.
 */
export function getStrideForLargeDom(estimatedCount: number): number {
  if (!shouldSampleDom(estimatedCount)) return 1;
  return Math.max(2, Math.ceil(estimatedCount / DEFAULT_DOM_SAMPLING.largeDomThreshold));
}

/**
 * Single synchronous walk with optional stride sampling on large pages.
 * Use for tools that must return synchronously; log once when sampling applies.
 */
export function walkElementsEfficiently(
  root: Document | Element,
  visitor: (el: Element) => void,
  logInfo?: (msg: string) => void
): void {
  const nodes = root.querySelectorAll('*');
  const n = nodes.length;
  const stride = getStrideForLargeDom(n);
  if (stride > 1) {
    logInfo?.(
      `[FDH] Large DOM (${n} nodes); sampling every ${stride} elements for this scan.`
    );
  }
  for (let i = 0; i < n; i += stride) {
    visitor(nodes[i]);
  }
}
