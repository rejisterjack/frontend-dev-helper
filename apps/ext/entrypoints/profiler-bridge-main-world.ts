/**
 * React Profiler Bridge — MAIN-world script.
 *
 * This unlisted script runs in the page's main world and monkey-patches
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` to capture React commits.
 * It cannot use any extension APIs directly; it communicates with the
 * ISOLATED-world content script (entrypoints/profiler-bridge.content/index.ts)
 * via `window.postMessage`, authenticated with a per-session random token.
 *
 * Ported from react-perf-profiler/apps/ext/entrypoints/bridge.content/index.ts
 * and adapted to WXT's recommended injectScript pattern (cross-browser).
 *
 * Limitation: requires React running in development mode (the global hook is
 * stripped from production builds by React itself).
 */

import type {
  FiberRoot,
  ReactDevToolsHook,
} from "@/lib/profiler/reactInternals";
import type { FiberData } from "@/lib/profiler/types";
import {
  parseFiberRoot,
  parseFiberNode,
  getReactVersion,
  diffFiberTree,
  buildFiberStateMap,
} from "@/lib/profiler/fiberParser";

export default defineUnlistedScript(() => {
  // =====================================================================
  // Per-session state
  // =====================================================================

  let originalOnCommitFiberRoot:
    | ((rendererID: number, root: FiberRoot, priorityLevel: number) => void)
    | null = null;
  let isProfiling = false;
  let reactVersion: string | undefined;

  // Session token — learned from the ISOLATED content script's first message
  // and echoed back on every message we send. Prevents a malicious page from
  // spoofing START/STOP commands even if it knows the source string.
  let sessionToken: string | null = null;

  // Batch accumulator
  const BATCH_WINDOW_MS = 50;
  const MAX_BATCH_SIZE = 50;
  let commitBatch: ReturnType<typeof parseFiberRoot>[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  // Incremental diffing state
  let previousFiberIds: Set<string> | null = null;
  let previousFiberState: Map<
    string,
    { propsHash: string; duration: number }
  > | null = null;
  let lastCommitId: string | null = null;
  const deltaModeEnabled = true;
  let isFirstCommit = true;
  let incrementalDiffingEnabled = true;
  let sourceCorrelationEnabled = true;

  const PROP_SERIALIZATION_LIMITS = {
    maxPropDepth: 3,
    maxPropKeys: 20,
    maxPropValueLength: 200,
  };

  let renderCauseTrackingEnabled = true;
  let previousCommitFibers: Map<
    string,
    { memoizedProps: Record<string, unknown>; memoizedState: unknown }
  > | null = null;

  // Targeted recording filters
  type RecordingFilter = {
    type: "component" | "duration" | "interaction";
    value: unknown;
  };
  let recordingFilters: RecordingFilter[] = [];
  let isInteractionListening = false;
  let interactionPending = false;
  let interactionCommitBudget = 0;

  let initRetryCount = 0;
  let initRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  const MAX_RETRY_ATTEMPTS = 5;
  const INITIAL_RETRY_DELAY = 500;
  const MAX_RETRY_DELAY_MS = 30000;

  let isInitialized = false;
  let lastError: { type: string; message: string; timestamp: number } | null =
    null;

  let _reactWatchObserver: MutationObserver | null = null;
  let _reactWatchTimer: ReturnType<typeof setTimeout> | null = null;

  const BRIDGE_SOURCE = "fdh-profiler-bridge";
  const CONTENT_SOURCE = "fdh-profiler-content";

  // =====================================================================
  // Messaging
  // =====================================================================

  function sendMessage(payload: Record<string, unknown>): void {
    if (typeof window === "undefined") return;
    const message = {
      source: BRIDGE_SOURCE,
      token: sessionToken ?? undefined,
      payload,
    };
    const targetOrigin =
      window.location.origin === "null" ? "*" : window.location.origin;
    window.postMessage(message, targetOrigin);
  }

  function flushBatch(): void {
    if (commitBatch.length === 0) return;
    const batch = commitBatch;
    commitBatch = [];
    if (batchTimer !== null) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    if (batch.length === 1) {
      sendMessage({ type: "COMMIT", data: batch[0] });
    } else {
      sendMessage({ type: "COMMIT_BATCH", data: batch });
    }
  }

  function addToBatch(commitData: ReturnType<typeof parseFiberRoot>): void {
    commitBatch.push(commitData);
    if (commitBatch.length >= MAX_BATCH_SIZE) {
      flushBatch();
      return;
    }
    if (batchTimer === null) {
      batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
    }
  }

  // =====================================================================
  // Recording filters
  // =====================================================================

  function shouldRecordCommit(
    commitData: ReturnType<typeof parseFiberRoot>,
  ): boolean {
    if (recordingFilters.length === 0) return true;

    for (const filter of recordingFilters) {
      switch (filter.type) {
        case "component": {
          const targetName = filter.value as string;
          const hasComponent = commitData.fibers.some(
            (f) => f.displayName === targetName,
          );
          if (hasComponent) return true;
          break;
        }
        case "duration": {
          const minDuration = filter.value as number;
          if (commitData.duration >= minDuration) return true;
          break;
        }
        case "interaction": {
          if (interactionPending && interactionCommitBudget > 0) {
            interactionCommitBudget--;
            if (interactionCommitBudget <= 0) interactionPending = false;
            return true;
          }
          return false;
        }
      }
    }
    return recordingFilters.every((f) => f.type === "interaction")
      ? false
      : true;
  }

  function setupInteractionListeners(): void {
    if (isInteractionListening) return;
    isInteractionListening = true;
    const interactionEvents = ["click", "input", "keydown", "scroll"];
    const handler = () => {
      if (!interactionPending) return;
      interactionCommitBudget = 20;
    };
    for (const evt of interactionEvents) {
      document.addEventListener(evt, handler, { passive: true, capture: true });
    }
  }

  // =====================================================================
  // Render cause analysis
  // =====================================================================

  function buildRenderCauses(commitData: ReturnType<typeof parseFiberRoot>) {
    if (!renderCauseTrackingEnabled || !previousCommitFibers) return [];

    const causes: Array<{
      fiberId: string;
      componentName: string;
      causes: Array<{
        type:
          | "props-changed"
          | "state-changed"
          | "parent-rerendered"
          | "context-changed"
          | "hooks-changed";
        details: string;
        changedKeys?: string[];
      }>;
    }> = [];

    const currentFibers = new Map<
      string,
      { memoizedProps: Record<string, unknown>; memoizedState: unknown }
    >();

    for (const fiber of commitData.fibers) {
      if (!fiber.displayName) continue;
      const currentProps = fiber.memoizedProps ?? {};
      const currentState = fiber.memoizedState;
      currentFibers.set(fiber.id, {
        memoizedProps: currentProps,
        memoizedState: currentState,
      });

      const prev = previousCommitFibers.get(fiber.id);
      if (!prev) continue;

      const fiberCauses: Array<{
        type:
          | "props-changed"
          | "state-changed"
          | "parent-rerendered"
          | "context-changed"
          | "hooks-changed";
        details: string;
        changedKeys?: string[];
      }> = [];

      const prevProps = prev.memoizedProps;
      const changedKeys: string[] = [];
      for (const key of Object.keys(currentProps)) {
        if (
          !(key in prevProps) ||
          !Object.is(prevProps[key], currentProps[key])
        ) {
          changedKeys.push(key);
        }
      }
      for (const key of Object.keys(prevProps)) {
        if (!(key in currentProps)) {
          changedKeys.push(key);
        }
      }

      if (changedKeys.length > 0) {
        fiberCauses.push({
          type: "props-changed",
          details: `${changedKeys.length} prop(s) changed: ${changedKeys.slice(0, 5).join(", ")}${changedKeys.length > 5 ? "..." : ""}`,
          changedKeys,
        });
      }

      if (currentState !== prev.memoizedState) {
        fiberCauses.push({
          type: "state-changed",
          details: "Component state changed",
        });
      }

      if (fiber.return) {
        const parentId = fiber.return.id;
        if (previousCommitFibers.has(parentId)) {
          fiberCauses.push({
            type: "parent-rerendered",
            details: `Parent "${fiber.return.displayName || "Unknown"}" re-rendered`,
          });
        }
      }

      if (fiberCauses.length > 0) {
        causes.push({
          fiberId: fiber.id,
          componentName: fiber.displayName,
          causes: fiberCauses,
        });
      }
    }

    previousCommitFibers = currentFibers;
    return causes;
  }

  // =====================================================================
  // Hook management
  // =====================================================================

  function getReactDevToolsHook(): ReactDevToolsHook | null {
    if (typeof window === "undefined") return null;
    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || null;
  }

  function setupHookInterception(hook: ReactDevToolsHook): void {
    reactVersion = getReactVersion();
    if (hook.onCommitFiberRoot)
      originalOnCommitFiberRoot = hook.onCommitFiberRoot.bind(hook);

    hook.onCommitFiberRoot = (
      rendererID: number,
      root: FiberRoot,
      priorityLevel: number,
    ): void => {
      if (originalOnCommitFiberRoot) {
        try {
          originalOnCommitFiberRoot(rendererID, root, priorityLevel);
        } catch {
          /* ignore */
        }
      }
      if (!isProfiling) return;
      try {
        const current = root?.current;
        if (!current) return;

        const commitData = parseFiberRoot(current, priorityLevel, {
          sourceCorrelation: sourceCorrelationEnabled,
          propLimits: PROP_SERIALIZATION_LIMITS,
          previousFiberIds,
        });

        if (
          deltaModeEnabled &&
          !isFirstCommit &&
          previousFiberState &&
          commitData.fibers.length > 0
        ) {
          const delta = diffFiberTree(commitData.fibers, previousFiberState);
          delta.baseCommitId = lastCommitId ?? "";
          commitData.changedFiberIds = delta.changedFibers.map((f) => f.id);
          commitData.isDelta = true;
          if (delta.removedFiberIds.length > 0) {
            commitData.removedFiberIds = delta.removedFiberIds;
          }
          if (delta.changedFibers.length < commitData.fibers.length) {
            commitData.deltaChangedFibers = delta.changedFibers;
            commitData.deltaRemovedFiberIds = delta.removedFiberIds;
          }
        }

        if (incrementalDiffingEnabled && commitData.fibers.length > 0) {
          previousFiberState = buildFiberStateMap(commitData.fibers);
          lastCommitId = commitData.id;
          isFirstCommit = false;
        }

        if (incrementalDiffingEnabled) {
          previousFiberIds = new Set(commitData.fibers.map((f) => f.id));
        }

        commitData.renderCauses = buildRenderCauses(commitData);
        commitData.reactVersion = reactVersion;

        if (!shouldRecordCommit(commitData)) return;

        addToBatch(commitData);
      } catch (error) {
        sendMessage({
          type: "ERROR",
          error: error instanceof Error ? error.message : String(error),
          errorType: "PARSE_ERROR",
          recoverable: true,
        });
      }
    };

    sendMessage({
      type: "INIT",
      data: {
        reactVersion,
        supportsFiber: hook.supportsFiber,
        rendererCount: hook.renderers?.size ?? 0,
      },
    });
  }

  // =====================================================================
  // Initialization
  // =====================================================================

  function initBridge(): void {
    if (isInitialized) return;
    const hook = getReactDevToolsHook();
    if (!hook) {
      handleInitFailure("DEVTOOLS_NOT_FOUND");
      return;
    }
    try {
      setupHookInterception(hook);
      isInitialized = true;
      initRetryCount = 0;
      lastError = null;
      sendMessage({
        type: "INIT",
        data: {
          reactVersion,
          supportsFiber: hook.supportsFiber,
          rendererCount: hook.renderers?.size ?? 0,
          success: true,
        },
      });
    } catch (error) {
      handleInitFailure(
        "INIT_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  function handleInitFailure(
    reason: "DEVTOOLS_NOT_FOUND" | "INIT_FAILED",
    details?: string,
  ): void {
    lastError = {
      type: reason,
      message:
        details ||
        (reason === "DEVTOOLS_NOT_FOUND"
          ? "React DevTools hook not found."
          : "Failed to initialize bridge."),
      timestamp: Date.now(),
    };
    sendMessage({
      type: "ERROR",
      error: lastError.message,
      errorType: reason,
      recoverable: initRetryCount < MAX_RETRY_ATTEMPTS,
      retryCount: initRetryCount,
    });
    if (
      detectReact() &&
      !getReactDevToolsHook() &&
      initRetryCount < MAX_RETRY_ATTEMPTS
    ) {
      scheduleRetry();
    } else if (!detectReact()) {
      sendMessage({
        type: "ERROR",
        error: "React not detected.",
        errorType: "REACT_NOT_FOUND",
        recoverable: false,
      });
    }
  }

  function scheduleRetry(): void {
    if (initRetryTimeout) clearTimeout(initRetryTimeout);
    initRetryCount++;
    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      2 ** initRetryCount * INITIAL_RETRY_DELAY,
    );
    sendMessage({
      type: "RETRY_SCHEDULED",
      retryCount: initRetryCount,
      maxRetries: MAX_RETRY_ATTEMPTS,
      nextRetryIn: delay,
    });
    initRetryTimeout = setTimeout(() => initBridge(), delay);
  }

  function cancelRetry(): void {
    if (initRetryTimeout) {
      clearTimeout(initRetryTimeout);
      initRetryTimeout = null;
    }
  }

  // =====================================================================
  // Profiling lifecycle
  // =====================================================================

  function startProfiling(): void {
    if (isProfiling) return;
    isProfiling = true;
    previousFiberIds = null;
    previousFiberState = null;
    lastCommitId = null;
    isFirstCommit = true;
    previousCommitFibers = null;
    window.__FDH_PROFILER_ACTIVE__ = true;
    if (recordingFilters.some((f) => f.type === "interaction")) {
      setupInteractionListeners();
    }
    sendMessage({ type: "START", data: { timestamp: Date.now() } });
  }

  function stopProfiling(): void {
    if (!isProfiling) return;
    isProfiling = false;
    flushBatch();
    window.__FDH_PROFILER_ACTIVE__ = false;
    sendMessage({ type: "STOP", data: { timestamp: Date.now() } });
  }

  // =====================================================================
  // React detection
  // =====================================================================

  function detectReact(): boolean {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return true;
    const w = window as any as Record<string, unknown>;
    if (w.React || w.__REACT__) return true;
    if (document.querySelector("[data-reactroot], [data-reactid]")) return true;

    for (const id of ["root", "app", "__next", "__nuxt"]) {
      const el = document.getElementById(id);
      if (el) {
        if ((el as any as Record<string, unknown>)._reactRootContainer)
          return true;
        if (
          Object.getOwnPropertyNames(el).some((k) =>
            k.startsWith("__reactContainer$"),
          )
        ) {
          return true;
        }
      }
    }

    const FIBER_PREFIXES = [
      "__reactFiber$",
      "__reactInternalInstance$",
      "__reactContainer$",
      "__reactProps$",
      "__reactEventHandlers$",
    ];
    function hasReactFiber(el: Element): boolean {
      const props = Object.getOwnPropertyNames(el);
      for (const p of props) {
        for (const prefix of FIBER_PREFIXES) {
          if (p.startsWith(prefix)) return true;
        }
        if (
          p.startsWith("_react") ||
          (p.startsWith("__react") && !p.startsWith("__REACT"))
        ) {
          return true;
        }
      }
      return false;
    }

    const body = document.body;
    if (body) {
      const children = body.children;
      for (let i = 0; i < Math.min(children.length, 100); i++) {
        if (hasReactFiber(children[i])) return true;
      }
      let count = 0;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode() && count < 200) {
        count++;
        if (hasReactFiber(walker.currentNode as Element)) return true;
      }
    }
    return false;
  }

  function detectReactVersion(): string | undefined {
    const version = getReactVersion();
    if (version) return version;
    const body = document.body;
    if (!body) return undefined;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
    let count = 0;
    while (walker.nextNode() && count < 50) {
      count++;
      const el = walker.currentNode as Element;
      for (const prop of Object.getOwnPropertyNames(el)) {
        if (prop.startsWith("__reactFiber$")) {
          const fiber = (el as any as Record<string, unknown>)[prop];
          if (fiber && typeof fiber === "object") {
            const mode = (fiber as Record<string, unknown>).mode;
            if (typeof mode === "number") {
              if (mode & (1 << 10)) return "18+";
              return "17+";
            }
          }
        }
      }
    }
    return undefined;
  }

  // =====================================================================
  // Live component tree (no recording needed)
  // =====================================================================

  function getLiveComponentTree(): FiberData[] {
    const fibers: FiberData[] = [];
    const fiberMap = new Map<string, FiberData>();
    const visited = new WeakSet<object>();
    const MAX_FIBERS = 5000;

    function collectFiber(fiber: unknown): void {
      if (!fiber || typeof fiber !== "object") return;
      if (visited.has(fiber as object) || fibers.length >= MAX_FIBERS) return;
      visited.add(fiber as object);
      const tag = (fiber as Record<string, unknown>)["tag"] as number;
      if (tag !== 6) {
        const parsed = parseFiberNode(fiber);
        fibers.push(parsed);
        fiberMap.set(parsed.id, parsed);
      }
      const fiberObj = fiber as Record<string, unknown>;
      if (fiberObj["child"]) collectFiber(fiberObj["child"]);
      if (fiberObj["sibling"]) collectFiber(fiberObj["sibling"]);
    }

    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook) {
      if (hook.getFiberRoots && hook.renderers) {
        for (const [id] of hook.renderers) {
          try {
            const roots = hook.getFiberRoots(id);
            for (const root of roots) {
              const rootObj = root as Record<string, unknown>;
              const currentFiber = rootObj["current"] ?? root;
              collectFiber(currentFiber);
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (fibers.length === 0 && hook._fiberRoots) {
        for (const [, roots] of hook._fiberRoots) {
          for (const root of roots) {
            const rootObj = root as Record<string, unknown>;
            const currentFiber = rootObj["current"] ?? root;
            collectFiber(currentFiber);
          }
        }
      }
    }

    if (fibers.length === 0) {
      const body = document.body;
      if (!body) return [];
      const FIBER_KEYS = ["__reactContainer$", "__reactFiber$"];
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
      const scannedRoots = new Set<unknown>();
      const scanEl = (el: Element) => {
        for (const prop of Object.getOwnPropertyNames(el)) {
          for (const prefix of FIBER_KEYS) {
            if (prop.startsWith(prefix)) {
              const value = (el as any as Record<string, unknown>)[prop];
              if (
                value &&
                typeof value === "object" &&
                !scannedRoots.has(value)
              ) {
                scannedRoots.add(value);
                const valObj = value as Record<string, unknown>;
                let rootFiber = value;
                if (valObj["stateNode"] && valObj["current"])
                  rootFiber = valObj["current"];
                else if (
                  valObj["current"] &&
                  typeof valObj["current"] === "object"
                ) {
                  rootFiber = valObj["current"];
                }
                collectFiber(rootFiber);
              }
            }
          }
        }
      };
      scanEl(body);
      let count = 0;
      while (walker.nextNode() && count < 500) {
        count++;
        scanEl(walker.currentNode as Element);
        if (fibers.length >= MAX_FIBERS) break;
      }
    }

    if (fibers.length > 0) {
      for (const fiber of fibers) {
        if (fiber.child && !fiber.child.return) fiber.child.return = fiber;
      }
    }

    return fibers;
  }

  // =====================================================================
  // Inbound message handler (from the ISOLATED content script)
  // =====================================================================

  function handleBridgeMessage(event: MessageEvent): void {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const record = data as Record<string, unknown>;
    if (record["source"] !== CONTENT_SOURCE) return;
    if (!record["payload"]) return;

    const inboundToken = record["token"];
    const { type, ...rest } = record["payload"] as { type: string } & Record<
      string,
      unknown
    >;

    if (sessionToken === null) {
      if (typeof inboundToken === "string") {
        sessionToken = inboundToken;
      }
    } else if (inboundToken !== sessionToken) {
      return;
    }

    switch (type) {
      case "START":
        startProfiling();
        break;
      case "STOP":
        stopProfiling();
        break;
      case "PING":
        sendMessage({
          type: "INIT",
          data: {
            isProfiling,
            reactVersion,
            isInitialized,
            lastError: lastError?.message,
          },
        });
        break;
      case "DETECT_REACT":
        sendMessage({
          type: "DETECT_RESULT",
          reactDetected: detectReact(),
          reactVersion: detectReactVersion(),
          devtoolsDetected: !!getReactDevToolsHook(),
          isInitialized,
        });
        break;
      case "FORCE_INIT":
        cancelRetry();
        initRetryCount = 0;
        initBridge();
        break;
      case "SET_RECORDING_FILTERS":
        recordingFilters = (rest.filters as RecordingFilter[]) ?? [];
        if (recordingFilters.some((f) => f.type === "interaction")) {
          setupInteractionListeners();
          interactionPending = true;
        }
        break;
      case "SET_CONFIG": {
        const config = rest as Record<string, unknown>;
        if ("incrementalDiffing" in config) {
          incrementalDiffingEnabled = !!config.incrementalDiffing;
        }
        if ("sourceCorrelation" in config)
          sourceCorrelationEnabled = !!config.sourceCorrelation;
        if ("renderCauseTracking" in config) {
          renderCauseTrackingEnabled = !!config.renderCauseTracking;
        }
        if ("maxPropDepth" in config) {
          PROP_SERIALIZATION_LIMITS.maxPropDepth =
            (config.maxPropDepth as number) ?? 3;
        }
        if ("maxPropKeys" in config) {
          PROP_SERIALIZATION_LIMITS.maxPropKeys =
            (config.maxPropKeys as number) ?? 20;
        }
        break;
      }
      case "GET_COMPONENT_TREE": {
        const tree = getLiveComponentTree();
        sendMessage({ type: "COMPONENT_TREE_RESULT", data: tree });
        break;
      }
    }
  }

  // =====================================================================
  // Cleanup
  // =====================================================================

  function stopReactWatcher(): void {
    if (_reactWatchTimer !== null) {
      clearTimeout(_reactWatchTimer);
      _reactWatchTimer = null;
    }
    if (_reactWatchObserver !== null) {
      _reactWatchObserver.disconnect();
      _reactWatchObserver = null;
    }
  }

  function cleanup(): void {
    cancelRetry();
    stopReactWatcher();
    if (batchTimer !== null) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    const hook = getReactDevToolsHook();
    if (hook && originalOnCommitFiberRoot)
      hook.onCommitFiberRoot = originalOnCommitFiberRoot;
    window.removeEventListener("message", handleBridgeMessage);
    isProfiling = false;
    isInitialized = false;
    commitBatch = [];
    window.__FDH_PROFILER_ACTIVE__ = false;
  }

  // =====================================================================
  // Setup
  // =====================================================================

  window.addEventListener("message", handleBridgeMessage);

  function tryInit(): void {
    try {
      initBridge();
    } catch (error) {
      handleInitFailure(
        "INIT_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }

  if (!isInitialized) {
    _reactWatchObserver = new MutationObserver(() => {
      if (!isInitialized && detectReact() && getReactDevToolsHook()) {
        stopReactWatcher();
        tryInit();
      }
    });
    _reactWatchObserver.observe(document, { childList: true, subtree: true });
    _reactWatchTimer = setTimeout(stopReactWatcher, 10000);
  }

  window.addEventListener("beforeunload", cleanup);
  window.__FDH_PROFILER_CLEANUP__ = cleanup;
  window.__FDH_PROFILER_DETECT_REACT__ = detectReact;
});
