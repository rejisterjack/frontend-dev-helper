/**
 * Lazy-load Beast Mode tool modules so their code lands in separate chunks
 * until a tool is first used.
 */

import { logger } from '@/utils/logger';

type Cqi = typeof import('./container-query-inspector');
type Vtd = typeof import('./view-transitions-debugger');
type Sad = typeof import('./scroll-animations-debugger');

let cqiPromise: Promise<Cqi> | null = null;
let vtdPromise: Promise<Vtd> | null = null;
let sadPromise: Promise<Sad> | null = null;

export function getContainerQueryInspector(): Promise<Cqi> {
  if (!cqiPromise) {
    cqiPromise = import('./container-query-inspector').catch((err) => {
      cqiPromise = null;
      logger.error('[BeastMode] Failed to load container-query-inspector', err);
      throw err;
    });
  }
  return cqiPromise;
}

export function getViewTransitionsDebugger(): Promise<Vtd> {
  if (!vtdPromise) {
    vtdPromise = import('./view-transitions-debugger').catch((err) => {
      vtdPromise = null;
      logger.error('[BeastMode] Failed to load view-transitions-debugger', err);
      throw err;
    });
  }
  return vtdPromise;
}

export function getScrollAnimationsDebugger(): Promise<Sad> {
  if (!sadPromise) {
    sadPromise = import('./scroll-animations-debugger').catch((err) => {
      sadPromise = null;
      logger.error('[BeastMode] Failed to load scroll-animations-debugger', err);
      throw err;
    });
  }
  return sadPromise;
}
