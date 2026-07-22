import type { ToolDefinition } from "../types";
import { ToolPanel, createBadge } from "@/content/tool-panel";
import { getOverlayContainer } from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReactHook {
  type:
    | "useState"
    | "useEffect"
    | "useContext"
    | "useMemo"
    | "useCallback"
    | "useRef"
    | "other";
  value: unknown;
  name?: string;
}

interface ReactComponentState {
  name: string;
  props: Record<string, unknown>;
  hooks: ReactHook[];
  element: HTMLElement;
}

interface ReactFiber {
  type?:
    | { name?: string; displayName?: string }
    | string
    | ((...args: unknown[]) => unknown);
  memoizedProps?: Record<string, unknown>;
  memoizedState?: {
    queue?: { name?: string; lastRenderedState?: unknown };
    memoizedState?: unknown;
    next?: ReactFiber["memoizedState"] | null;
    // Effect-specific fields
    tag?: number;
    create?: () => unknown;
    deps?: unknown[];
  } | null;
  child?: ReactFiber;
  sibling?: ReactFiber;
  return?: ReactFiber;
  _debugOwner?: ReactFiber;
  elementType?:
    | { name?: string; displayName?: string }
    | string
    | ((...args: unknown[]) => unknown);
}

// ---------------------------------------------------------------------------
// Fiber tree helpers
// ---------------------------------------------------------------------------

const HOOK_TAG_EFFECT = 5;
const HOOK_TAG_LAYOUT_EFFECT = 7;
const HOOK_TAG_REF = 7;
const MAX_HOOKS = 50;

function getFiberFromElement(element: HTMLElement): ReactFiber | null {
  const key = Object.keys(element).find(
    (k) =>
      k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (!key) return null;
  return (element as any as Record<string, ReactFiber>)[key] ?? null;
}

function findNearestComponentFiber(fiber: ReactFiber): ReactFiber | null {
  let current: ReactFiber | undefined = fiber;
  while (current) {
    const typeName = typeof current.type === "function" ? current.type : null;
    if (typeName) return current;
    current = current._debugOwner || current.return;
  }
  return null;
}

function getComponentName(fiber: ReactFiber): string {
  const type = fiber.type;
  if (typeof type === "function") {
    const fn = type as ((...args: unknown[]) => unknown) & {
      displayName?: string;
      name?: string;
    };
    return fn.displayName || fn.name || "Anonymous";
  }
  if (typeof type === "object" && type !== null) {
    const t = type as { displayName?: string; name?: string };
    return t.displayName || t.name || "Anonymous";
  }
  return "Unknown";
}

function classifyHook(
  stateNode: NonNullable<ReactFiber["memoizedState"]>,
  index: number,
): ReactHook {
  const tag = stateNode.tag;

  // useState (tag 1 or with queue.lastRenderedState)
  if (
    tag === 1 ||
    (stateNode.queue && "lastRenderedState" in (stateNode.queue as object))
  ) {
    return {
      type: "useState",
      value: stateNode.memoizedState,
      name: stateNode.queue?.name,
    };
  }

  // useEffect / useLayoutEffect
  if (tag === HOOK_TAG_EFFECT || tag === HOOK_TAG_LAYOUT_EFFECT) {
    return {
      type: "useEffect",
      value: stateNode.create ? "[effect fn]" : undefined,
    };
  }

  // useRef
  if (
    tag === HOOK_TAG_REF &&
    stateNode.memoizedState &&
    typeof stateNode.memoizedState === "object"
  ) {
    const val = stateNode.memoizedState as { current?: unknown };
    if ("current" in val) {
      return {
        type: "useRef",
        value: val.current,
      };
    }
  }

  // useMemo / useCallback (tag 8, with an array-like deps)
  if (tag === 8) {
    // Check if the memoized value is a function — likely useCallback
    if (typeof stateNode.memoizedState === "function") {
      return {
        type: "useCallback",
        value: "[callback fn]",
      };
    }
    return {
      type: "useMemo",
      value: stateNode.memoizedState,
    };
  }

  // useContext (tag 9 or 10 typically)
  if (tag === 9 || tag === 10) {
    return {
      type: "useContext",
      value: stateNode.memoizedState,
    };
  }

  return {
    type: "other",
    value: stateNode.memoizedState,
    name: tag !== undefined ? `hook(tag=${tag})` : `hook[${index}]`,
  };
}

function extractHooks(fiber: ReactFiber): ReactHook[] {
  const hooks: ReactHook[] = [];
  let stateNode = fiber.memoizedState;
  let index = 0;

  while (stateNode && index < MAX_HOOKS) {
    hooks.push(classifyHook(stateNode, index));
    stateNode = stateNode.next ?? null;
    index++;
  }

  return hooks;
}

function extractReactState(element: HTMLElement): ReactComponentState | null {
  const fiber = getFiberFromElement(element);
  if (!fiber) return null;

  const componentFiber = findNearestComponentFiber(fiber);
  if (!componentFiber) return null;

  const name = getComponentName(componentFiber);
  const props = componentFiber.memoizedProps
    ? Object.entries(componentFiber.memoizedProps)
        .filter(([k]) => !k.startsWith("__") && k !== "children" && k !== "key")
        .reduce<Record<string, unknown>>((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {})
    : {};

  const hooks = extractHooks(componentFiber);

  return { name, props, hooks, element };
}

// ---------------------------------------------------------------------------
// Value rendering
// ---------------------------------------------------------------------------

export function formatValue(value: unknown, maxLength = 60): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();

  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value, null, 0);
      if (str && str.length > maxLength) return str.slice(0, maxLength) + "...";
      return str || String(value);
    } catch {
      return String(value);
    }
  }

  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
}

export function getTypeColor(value: unknown): string {
  if (value === undefined || value === null) return "#64748b";
  if (typeof value === "string") return "#a5d6ff";
  if (typeof value === "number") return "#79c0ff";
  if (typeof value === "boolean") return "#ff7b72";
  if (typeof value === "function") return "#d2a8ff";
  if (typeof value === "object") return "#7ee787";
  return "#e2e8f0";
}

// ---------------------------------------------------------------------------
// Panel rendering
// ---------------------------------------------------------------------------

function createSectionHeader(
  title: string,
  count: number,
  color: string,
): { header: HTMLDivElement; content: HTMLDivElement } {
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: ${color};
    user-select: none;
  `;

  const chevron = document.createElement("span");
  chevron.style.cssText = "font-size:10px;transition:transform 0.2s;";
  chevron.textContent = "▼";
  header.appendChild(chevron);

  const label = document.createElement("span");
  label.textContent = title;
  header.appendChild(label);

  const badge = document.createElement("span");
  badge.style.cssText = `
    font-weight: 400;
    color: #64748b;
    font-size: 11px;
  `;
  badge.textContent = `(${count})`;
  header.appendChild(badge);

  const content = document.createElement("div");
  content.style.cssText =
    "display:flex;flex-direction:column;gap:2px;margin-bottom:8px;";

  let expanded = true;
  header.addEventListener("click", () => {
    expanded = !expanded;
    content.style.display = expanded ? "flex" : "none";
    chevron.style.transform = expanded ? "" : "rotate(-90deg)";
  });

  return { header, content };
}

function createKeyValueRow(
  key: string,
  value: unknown,
  highlight = false,
): HTMLDivElement {
  const row = document.createElement("div");
  row.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 4px 8px;
    border-radius: 4px;
    background: #1e293b;
    gap: 8px;
    ${highlight ? "border-left: 3px solid #f59e0b;" : ""}
  `;

  const keyEl = document.createElement("span");
  keyEl.style.cssText = `color:#94a3b8;font-size:11px;white-space:nowrap;flex-shrink:0;`;
  keyEl.textContent = key;
  row.appendChild(keyEl);

  const valueEl = document.createElement("span");
  valueEl.style.cssText = `
    color:${getTypeColor(value)};
    font-family:'SF Mono',Menlo,monospace;
    font-size:11px;
    word-break:break-all;
    text-align:right;
  `;
  valueEl.textContent = formatValue(value);
  row.appendChild(valueEl);

  row.dataset.key = key;

  return row;
}

function buildReactPanelContent(
  compState: ReactComponentState,
  container: HTMLDivElement,
  config: Record<string, unknown>,
  previousValues: Map<string, unknown>,
  debugSource?: { fileName: string; lineNumber: number } | null,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);

  const showProps = (config.showProps as boolean) ?? true;
  const showState = (config.showState as boolean) ?? true;
  const showEffects = (config.showEffects as boolean) ?? false;
  const showContext = (config.showContext as boolean) ?? true;

  // Component name header
  const nameRow = document.createElement("div");
  nameRow.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #334155;
  `;
  const nameEl = document.createElement("span");
  nameEl.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #f5c2e7;
    font-family: 'SF Mono', Menlo, monospace;
  `;
  nameEl.textContent = "<" + compState.name + " />";
  nameRow.appendChild(nameEl);
  nameRow.appendChild(createBadge("React", "#61dafb"));

  if (debugSource) {
    const srcBtn = document.createElement("button");
    srcBtn.textContent = "Open source";
    srcBtn.style.cssText = `
      margin-left:auto;background:transparent;color:#6366f1;border:1px solid #6366f1;
      border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:inherit;
    `;
    srcBtn.addEventListener("click", () => {
      const bridge = getBridge();
      if (bridge.connected) {
        bridge.jumpToSource(debugSource.fileName, debugSource.lineNumber, 0);
      }
    });
    nameRow.appendChild(srcBtn);
  }

  container.appendChild(nameRow);

  // Props section
  if (showProps && Object.keys(compState.props).length > 0) {
    const props = compState.props;
    const { header, content } = createSectionHeader(
      "Props",
      Object.keys(props).length,
      "#a5d6ff",
    );
    container.appendChild(header);

    for (const [key, value] of Object.entries(props)) {
      const prevVal = previousValues.get("prop:" + key);
      const changed = prevVal !== undefined && prevVal !== value;
      content.appendChild(createKeyValueRow(key, value, changed));
      previousValues.set("prop:" + key, value);
    }
    container.appendChild(content);
  }

  // Group hooks by type
  const stateHooks = compState.hooks.filter((h) => h.type === "useState");
  const effectHooks = compState.hooks.filter((h) => h.type === "useEffect");
  const contextHooks = compState.hooks.filter((h) => h.type === "useContext");
  const memoHooks = compState.hooks.filter(
    (h) =>
      h.type === "useMemo" || h.type === "useCallback" || h.type === "useRef",
  );
  const otherHooks = compState.hooks.filter((h) => h.type === "other");

  // State section (useState)
  if (showState && stateHooks.length > 0) {
    const { header, content } = createSectionHeader(
      "State (useState)",
      stateHooks.length,
      "#4ade80",
    );
    container.appendChild(header);

    stateHooks.forEach((hook, i) => {
      const key = hook.name || `state[${i}]`;
      const prevVal = previousValues.get("state:" + key);
      const changed = prevVal !== undefined && prevVal !== hook.value;
      content.appendChild(createKeyValueRow(key, hook.value, changed));
      previousValues.set("state:" + key, hook.value);
    });
    container.appendChild(content);
  }

  // Effects section
  if (showEffects && effectHooks.length > 0) {
    const { header, content } = createSectionHeader(
      "Effects",
      effectHooks.length,
      "#f59e0b",
    );
    container.appendChild(header);

    effectHooks.forEach((hook, i) => {
      const row = document.createElement("div");
      row.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        background: #1e293b;
        color: #f59e0b;
        font-size: 11px;
        font-family: 'SF Mono', Menlo, monospace;
      `;
      row.textContent = `useEffect[${i}]`;
      content.appendChild(row);
    });
    container.appendChild(content);
  }

  // Context section
  if (showContext && contextHooks.length > 0) {
    const { header, content } = createSectionHeader(
      "Context",
      contextHooks.length,
      "#c084fc",
    );
    container.appendChild(header);

    contextHooks.forEach((hook, i) => {
      const key = `context[${i}]`;
      const prevVal = previousValues.get("ctx:" + key);
      const changed = prevVal !== undefined && prevVal !== hook.value;
      content.appendChild(createKeyValueRow(key, hook.value, changed));
      previousValues.set("ctx:" + key, hook.value);
    });
    container.appendChild(content);
  }

  // Memoized values
  if (memoHooks.length > 0) {
    const { header, content } = createSectionHeader(
      "Memoized",
      memoHooks.length,
      "#67e8f9",
    );
    container.appendChild(header);

    memoHooks.forEach((hook, i) => {
      const label = hook.type + (hook.name ? `(${hook.name})` : `[${i}]`);
      content.appendChild(createKeyValueRow(label, hook.value));
    });
    container.appendChild(content);
  }

  // Other hooks
  if (otherHooks.length > 0) {
    const { header, content } = createSectionHeader(
      "Other Hooks",
      otherHooks.length,
      "#94a3b8",
    );
    container.appendChild(header);

    otherHooks.forEach((hook, i) => {
      content.appendChild(
        createKeyValueRow(hook.name || `hook[${i}]`, hook.value),
      );
    });
    container.appendChild(content);
  }

  // Empty state
  const totalItems =
    (showProps ? Object.keys(compState.props).length : 0) +
    (showState ? stateHooks.length : 0) +
    (showEffects ? effectHooks.length : 0) +
    (showContext ? contextHooks.length : 0) +
    memoHooks.length +
    otherHooks.length;

  if (totalItems === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "padding:24px 16px;text-align:center;color:#64748b;font-size:12px;";
    empty.textContent = "No state or props detected for this component.";
    container.appendChild(empty);
  }
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const reactStatePanel: ToolDefinition = {
  id: "react-state-panel",
  name: "React State Panel",
  description: "Inspect React component hooks, props, and state in real-time",
  category: "inspection",
  icon: "Atom",
  configSchema: {
    showProps: { type: "boolean", label: "Show Props", default: true },
    showState: { type: "boolean", label: "Show State", default: true },
    showEffects: { type: "boolean", label: "Show Effects", default: false },
    showContext: { type: "boolean", label: "Show Context", default: true },
    liveUpdate: { type: "boolean", label: "Live Updates", default: true },
  },

  run(ctx, config) {
    const liveUpdate = (config?.liveUpdate as boolean) ?? true;
    let disposed = false;
    let currentElement: HTMLElement | null = null;
    let highlightEl: HTMLDivElement | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const previousValues = new Map<string, unknown>();

    const { shadow } = getOverlayContainer();

    // Panel
    const panel = new ToolPanel({
      title: "React State Panel",
      width: 440,
      onClose: () => cleanup(),
    });
    panel.mount(shadow);

    // Initial content - prompt user to hover
    const promptEl = document.createElement("div");
    promptEl.style.cssText = `
      padding:32px 16px;
      text-align:center;
      color:#94a3b8;
      font-size:13px;
      line-height:1.6;
    `;
    const icon = document.createElement("div");
    icon.style.cssText = "font-size:28px;margin-bottom:12px;";
    icon.textContent = "⚛"; // Atom symbol
    promptEl.appendChild(icon);

    const text = document.createElement("div");
    text.textContent =
      "Hover over a React component to inspect its state, props, and hooks.";
    promptEl.appendChild(text);

    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;margin-top:8px;color:#64748b;";
    hint.textContent = "Click on an element to lock selection.";
    promptEl.appendChild(hint);

    panel.appendContent(promptEl);

    // Footer showing status
    const footer = document.createElement("div");
    footer.style.cssText = `
      display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;
    `;
    const statusDot = document.createElement("span");
    statusDot.style.cssText = `
      width:8px;height:8px;border-radius:50%;background:#3b82f6;
    `;
    footer.appendChild(statusDot);
    const statusText = document.createElement("span");
    statusText.textContent = liveUpdate
      ? "Live polling: ON (500ms)"
      : "Live polling: OFF";
    footer.appendChild(statusText);
    panel.getContainer().parentElement?.appendChild(footer);

    let locked = false;
    let observer: IntersectionObserver | null = null;

    function renderComponent(compState: ReactComponentState): void {
      panel.clearContent();
      // Extract _debugSource from the fiber
      const fiber = getFiberFromElement(compState.element);
      let debugSource: { fileName: string; lineNumber: number } | null = null;
      let current: ReactFiber | null | undefined = fiber;
      while (current) {
        if ((current as any)._debugSource) {
          debugSource = (current as any)._debugSource;
          break;
        }
        current = current.return;
      }
      buildReactPanelContent(
        compState,
        panel.getContainer(),
        config ?? {},
        previousValues,
        debugSource,
      );
    }

    function showNoReact(): void {
      panel.clearContent();
      const el = document.createElement("div");
      el.style.cssText =
        "padding:24px 16px;text-align:center;color:#f38ba8;font-size:12px;";
      el.textContent = "No React component found on this element.";
      panel.appendContent(el);
    }

    function highlightElement(target: HTMLElement): void {
      removeHighlight();
      const rect = target.getBoundingClientRect();
      highlightEl = document.createElement("div");
      highlightEl.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #61dafb;
        background: rgba(97,218,251,0.08);
        pointer-events: none;
        z-index: 2147483641;
        border-radius: 3px;
        transition: all 0.1s ease;
      `;
      shadow.appendChild(highlightEl);
    }

    function removeHighlight(): void {
      if (highlightEl) {
        highlightEl.remove();
        highlightEl = null;
      }
    }

    function repositionHighlight(): void {
      if (!highlightEl || !currentElement) return;
      const rect = currentElement.getBoundingClientRect();
      highlightEl.style.top = rect.top + "px";
      highlightEl.style.left = rect.left + "px";
      highlightEl.style.width = rect.width + "px";
      highlightEl.style.height = rect.height + "px";
    }

    function pollState(): void {
      if (!currentElement || disposed) return;
      const compState = extractReactState(currentElement);
      if (compState) {
        renderComponent(compState);
      }
    }

    // Event handlers
    function handleMouseMove(e: MouseEvent): void {
      if (locked || disposed) return;
      const target = e.target as HTMLElement;
      if (
        !target ||
        target === document.documentElement ||
        target === document.body
      )
        return;
      // Avoid highlighting panel elements
      if (panel.getPanelElement().contains(target)) return;

      currentElement = target;
      highlightElement(target);

      const compState = extractReactState(target);
      if (compState) {
        if (compState.hooks.length > MAX_HOOKS) return; // performance guard
        renderComponent(compState);
      } else {
        showNoReact();
      }
    }

    function handleClick(e: MouseEvent): void {
      if (disposed) return;
      const target = e.target as HTMLElement;
      if (!target || panel.getPanelElement().contains(target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (locked && currentElement === target) {
        // Unlock
        locked = false;
        statusText.textContent = liveUpdate
          ? "Live polling: ON (500ms)"
          : "Live polling: OFF";
        statusDot.style.background = "#3b82f6";
        return;
      }

      locked = true;
      currentElement = target;
      statusText.textContent = "Locked — click same element to unlock";
      statusDot.style.background = "#f59e0b";
      highlightElement(target);

      const compState = extractReactState(target);
      if (compState) {
        renderComponent(compState);
      } else {
        showNoReact();
      }
    }

    function handleScroll(): void {
      requestAnimationFrame(repositionHighlight);
    }

    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        if (locked) {
          locked = false;
          statusText.textContent = liveUpdate
            ? "Live polling: ON (500ms)"
            : "Live polling: OFF";
          statusDot.style.background = "#3b82f6";
        } else {
          cleanup();
        }
      }
    }

    // Start live polling if enabled
    if (liveUpdate) {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries[0]?.isIntersecting ?? false;
          if (visible && pollInterval === null) {
            pollInterval = setInterval(pollState, 500);
          } else if (!visible && pollInterval !== null) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(panel.getPanelElement());
    }

    // Attach events
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    document.addEventListener("keydown", handleKeydown, true);

    function cleanup(): void {
      if (disposed) return;
      disposed = true;

      if (pollInterval !== null) clearInterval(pollInterval);
      if (observer) observer.disconnect();
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      document.removeEventListener("keydown", handleKeydown, true);

      removeHighlight();
      panel.destroy();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};

export default reactStatePanel;
