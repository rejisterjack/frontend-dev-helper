import type { ToolDefinition } from "../types";
import { ToolPanel, createBadge } from "@/content/tool-panel";
import { getOverlayContainer } from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VueReactiveData {
  name: string;
  value: unknown;
}

interface VueComponentInfo {
  name: string;
  framework: "vue2" | "vue3";
  data: VueReactiveData[];
  computed: VueReactiveData[];
  props: VueReactiveData[];
  setupState: VueReactiveData[];
  element: HTMLElement;
}

// ---------------------------------------------------------------------------
// Vue 3 detection & extraction
// ---------------------------------------------------------------------------

function findVue3Component(element: HTMLElement): VueComponentInfo | null {
  // Vue 3: walk __vue_parent_component from the element and its parents
  let target: HTMLElement | null = element;

  while (target) {
    const el = target as unknown as Record<string, unknown>;

    // Vue 3 attaches __vue_parent_component or the internal instance
    if (el.__vue_app__) {
      // Found a Vue app root — try to get root component
      const app = el.__vue_app__ as { _instance?: Record<string, unknown> };
      if (app._instance) {
        return extractVue3Instance(app._instance, target);
      }
    }

    // Check for __vueParentComponent (internal Vue 3 VNode)
    if (el.__vueParentComponent) {
      return extractVue3Instance(
        el.__vueParentComponent as Record<string, unknown>,
        target,
      );
    }

    target = target.parentElement;
  }

  // Fallback: walk all elements looking for __vueParentComponent
  target = element;
  while (target) {
    const vnode = (target as unknown as Record<string, unknown>).__vnode;
    if (vnode && typeof vnode === "object") {
      const vn = vnode as Record<string, unknown>;
      if (vn.component) {
        return extractVue3Instance(
          vn.component as Record<string, unknown>,
          target,
        );
      }
    }
    target = target.parentElement;
  }

  return null;
}

function extractVue3Instance(
  instance: Record<string, unknown>,
  element: HTMLElement,
): VueComponentInfo | null {
  const name = getVue3ComponentName(instance);

  // Extract data (from setupState for Composition API)
  const setupState = instance.setupState as Record<string, unknown> | undefined;
  const setupData: VueReactiveData[] = [];

  if (setupState) {
    for (const [key, value] of Object.entries(setupState)) {
      if (key.startsWith("__") || key.startsWith("_")) continue;
      // Skip functions (methods)
      if (typeof value === "function") continue;
      setupData.push({ name: key, value: unwrapRef(value) });
    }
  }

  // Extract data from ctx (Options API data)
  const ctx = instance.ctx as Record<string, unknown> | undefined;
  const dataEntries: VueReactiveData[] = [];

  if (ctx) {
    const skipKeys = new Set([
      "$",
      "_",
      "$attrs",
      "$data",
      "$el",
      "$emit",
      "$listeners",
      "$parent",
      "$props",
      "$refs",
      "$root",
      "$slots",
      "$options",
    ]);
    for (const [key, value] of Object.entries(ctx)) {
      if (key.startsWith("__") || key.startsWith("_") || skipKeys.has(key))
        continue;
      if (typeof value === "function") continue;
      // Don't duplicate setupState entries
      if (setupData.some((s) => s.name === key)) continue;
      dataEntries.push({ name: key, value: unwrapRef(value) });
    }
  }

  // Extract computed properties
  const computedEntries: VueReactiveData[] = [];
  const computed = instance.computed as
    | Record<string, { value?: unknown }>
    | undefined;
  if (computed) {
    // Vue 3 stores computed on the proxy — check ctx for computed getters
    // Actually computed values in Vue 3 are mixed into setupState or ctx
    // We can detect them from the render proxy
  }

  // Alternative: check the $options computed definition
  const options = instance.type as Record<string, unknown> | undefined;
  const computedDefs = options?.computed as Record<string, unknown> | undefined;
  if (computedDefs && ctx) {
    for (const key of Object.keys(computedDefs)) {
      if (key in ctx) {
        computedEntries.push({ name: key, value: unwrapRef(ctx[key]) });
        // Remove from dataEntries if it was added there
        const idx = dataEntries.findIndex((d) => d.name === key);
        if (idx >= 0) dataEntries.splice(idx, 1);
      }
    }
  }

  // Extract props
  const propEntries: VueReactiveData[] = [];
  const props = instance.props as Record<string, unknown> | undefined;
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("__") || key.startsWith("_")) continue;
      propEntries.push({ name: key, value: unwrapRef(value) });
    }
  }

  return {
    name,
    framework: "vue3",
    data: dataEntries,
    computed: computedEntries,
    props: propEntries,
    setupState: setupData,
    element,
  };
}

function getVue3ComponentName(instance: Record<string, unknown>): string {
  const type = instance.type as Record<string, unknown> | undefined;
  if (type) {
    if (typeof type === "object" && type !== null) {
      if (type.name && typeof type.name === "string") return type.name;
      if (type.displayName && typeof type.displayName === "string")
        return type.displayName;
    }
    if (typeof type === "function") {
      const fn = type as Function & { displayName?: string; name?: string };
      return fn.displayName || fn.name || "Anonymous";
    }
  }
  return "Anonymous";
}

// ---------------------------------------------------------------------------
// Vue 2 detection & extraction
// ---------------------------------------------------------------------------

function findVue2Component(element: HTMLElement): VueComponentInfo | null {
  let target: HTMLElement | null = element;

  while (target) {
    const el = target as unknown as Record<string, unknown>;
    const vue = el.__vue__;

    if (vue && typeof vue === "object") {
      return extractVue2Instance(vue as Record<string, unknown>, target);
    }

    target = target.parentElement;
  }

  return null;
}

function extractVue2Instance(
  vm: Record<string, unknown>,
  element: HTMLElement,
): VueComponentInfo {
  const options = (vm.$options || {}) as Record<string, unknown>;
  const name =
    (options.name as string) ||
    (options._componentTag as string) ||
    "Anonymous";

  // Extract data
  const dataEntries: VueReactiveData[] = [];
  const data = vm.$data as Record<string, unknown> | undefined;
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("_") || key.startsWith("__")) continue;
      dataEntries.push({ name: key, value });
    }
  }

  // Extract computed
  const computedEntries: VueReactiveData[] = [];
  const computedDefs = options.computed as Record<string, unknown> | undefined;
  if (computedDefs) {
    for (const key of Object.keys(computedDefs)) {
      try {
        const value = vm[key];
        computedEntries.push({ name: key, value });
      } catch {
        computedEntries.push({ name: key, value: "[error reading]" });
      }
    }
  }

  // Extract props
  const propEntries: VueReactiveData[] = [];
  const props = vm.$props as Record<string, unknown> | undefined;
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      propEntries.push({ name: key, value });
    }
  }

  return {
    name,
    framework: "vue2",
    data: dataEntries,
    computed: computedEntries,
    props: propEntries,
    setupState: [], // Vue 2 doesn't have setupState
    element,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function unwrapRef(value: unknown): unknown {
  // Unwrap Vue refs (objects with __v_isRef)
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.__v_isRef === true && "value" in obj) {
      return obj.value;
    }
  }
  return value;
}

function detectVueComponent(element: HTMLElement): VueComponentInfo | null {
  // Try Vue 3 first
  const vue3 = findVue3Component(element);
  if (vue3) return vue3;

  // Try Vue 2
  const vue2 = findVue2Component(element);
  if (vue2) return vue2;

  return null;
}

// ---------------------------------------------------------------------------
// Value formatting
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

function getTypeColor(value: unknown): string {
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

function buildVuePanelContent(
  compInfo: VueComponentInfo,
  container: HTMLDivElement,
  config: Record<string, unknown>,
  previousValues: Map<string, unknown>,
  sourceFile?: string | null,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);

  const showData = (config.showData as boolean) ?? true;
  const showComputed = (config.showComputed as boolean) ?? true;
  const showProps = (config.showProps as boolean) ?? true;
  const showSetup = (config.showSetup as boolean) ?? true;

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
    color: #42b883;
    font-family: 'SF Mono', Menlo, monospace;
  `;
  nameEl.textContent = "<" + compInfo.name + " />";
  nameRow.appendChild(nameEl);

  const versionLabel = compInfo.framework === "vue3" ? "Vue 3" : "Vue 2";
  nameRow.appendChild(createBadge(versionLabel, "#42b883"));

  if (sourceFile) {
    const srcBtn = document.createElement("button");
    srcBtn.textContent = "Open source";
    srcBtn.style.cssText = `
      margin-left:auto;background:transparent;color:#42b883;border:1px solid #42b883;
      border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:inherit;
    `;
    srcBtn.addEventListener("click", () => {
      const bridge = getBridge();
      if (bridge.connected) {
        bridge.jumpToSource(sourceFile, 0, 0);
      }
    });
    nameRow.appendChild(srcBtn);
  }

  container.appendChild(nameRow);

  // Setup State section (Composition API — Vue 3 only)
  if (showSetup && compInfo.setupState.length > 0) {
    const { header, content } = createSectionHeader(
      "Setup State",
      compInfo.setupState.length,
      "#67e8f9",
    );
    container.appendChild(header);

    for (const item of compInfo.setupState) {
      const prevVal = previousValues.get("setup:" + item.name);
      const changed = prevVal !== undefined && prevVal !== item.value;
      content.appendChild(createKeyValueRow(item.name, item.value, changed));
      previousValues.set("setup:" + item.name, item.value);
    }
    container.appendChild(content);
  }

  // Data section
  if (showData && compInfo.data.length > 0) {
    const { header, content } = createSectionHeader(
      "Data",
      compInfo.data.length,
      "#4ade80",
    );
    container.appendChild(header);

    for (const item of compInfo.data) {
      const prevVal = previousValues.get("data:" + item.name);
      const changed = prevVal !== undefined && prevVal !== item.value;
      content.appendChild(createKeyValueRow(item.name, item.value, changed));
      previousValues.set("data:" + item.name, item.value);
    }
    container.appendChild(content);
  }

  // Computed section
  if (showComputed && compInfo.computed.length > 0) {
    const { header, content } = createSectionHeader(
      "Computed",
      compInfo.computed.length,
      "#c084fc",
    );
    container.appendChild(header);

    for (const item of compInfo.computed) {
      const prevVal = previousValues.get("computed:" + item.name);
      const changed = prevVal !== undefined && prevVal !== item.value;
      content.appendChild(createKeyValueRow(item.name, item.value, changed));
      previousValues.set("computed:" + item.name, item.value);
    }
    container.appendChild(content);
  }

  // Props section
  if (showProps && compInfo.props.length > 0) {
    const { header, content } = createSectionHeader(
      "Props",
      compInfo.props.length,
      "#a5d6ff",
    );
    container.appendChild(header);

    for (const item of compInfo.props) {
      const prevVal = previousValues.get("prop:" + item.name);
      const changed = prevVal !== undefined && prevVal !== item.value;
      content.appendChild(createKeyValueRow(item.name, item.value, changed));
      previousValues.set("prop:" + item.name, item.value);
    }
    container.appendChild(content);
  }

  // Empty state
  const totalItems =
    (showSetup ? compInfo.setupState.length : 0) +
    (showData ? compInfo.data.length : 0) +
    (showComputed ? compInfo.computed.length : 0) +
    (showProps ? compInfo.props.length : 0);

  if (totalItems === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "padding:24px 16px;text-align:center;color:#64748b;font-size:12px;";
    empty.textContent = "No reactive data detected for this component.";
    container.appendChild(empty);
  }
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const vueStatePanel: ToolDefinition = {
  id: "vue-state-panel",
  name: "Vue State Panel",
  description: "Inspect Vue component reactive data and computed properties",
  category: "inspection",
  icon: "Diamond",
  configSchema: {
    showData: { type: "boolean", label: "Show Data", default: true },
    showComputed: { type: "boolean", label: "Show Computed", default: true },
    showProps: { type: "boolean", label: "Show Props", default: true },
    showSetup: { type: "boolean", label: "Show Setup State", default: true },
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
      title: "Vue State Panel",
      width: 440,
      onClose: () => cleanup(),
    });
    panel.mount(shadow);

    // Initial prompt
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
    icon.textContent = "💎"; // Diamond
    promptEl.appendChild(icon);

    const text = document.createElement("div");
    text.textContent =
      "Hover over a Vue component to inspect its reactive data, computed properties, and props.";
    promptEl.appendChild(text);

    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;margin-top:8px;color:#64748b;";
    hint.textContent = "Click on an element to lock selection.";
    promptEl.appendChild(hint);

    panel.appendContent(promptEl);

    // Footer status
    const footer = document.createElement("div");
    footer.style.cssText = `
      display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;
    `;
    const statusDot = document.createElement("span");
    statusDot.style.cssText = `
      width:8px;height:8px;border-radius:50%;background:#42b883;
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

    function renderComponent(compInfo: VueComponentInfo): void {
      panel.clearContent();
      // Extract source file from Vue component
      let sourceFile: string | null = null;
      if (compInfo.framework === "vue3") {
        const el = compInfo.element as any;
        const instance = el.__vueParentComponent;
        if (instance) {
          sourceFile = instance.type?.__file || null;
        }
      } else {
        const el = compInfo.element as any;
        if (el.__vue__?.$options) {
          sourceFile = el.__vue__.$options.__file || null;
        }
      }
      buildVuePanelContent(
        compInfo,
        panel.getContainer(),
        config ?? {},
        previousValues,
        sourceFile,
      );
    }

    function showNoVue(): void {
      panel.clearContent();
      const el = document.createElement("div");
      el.style.cssText =
        "padding:24px 16px;text-align:center;color:#f38ba8;font-size:12px;";
      el.textContent = "No Vue component found on this element.";
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
        border: 2px solid #42b883;
        background: rgba(66,184,131,0.08);
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
      const compInfo = detectVueComponent(currentElement);
      if (compInfo) {
        renderComponent(compInfo);
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
      if (panel.getPanelElement().contains(target)) return;

      currentElement = target;
      highlightElement(target);

      const compInfo = detectVueComponent(target);
      if (compInfo) {
        renderComponent(compInfo);
      } else {
        showNoVue();
      }
    }

    function handleClick(e: MouseEvent): void {
      if (disposed) return;
      const target = e.target as HTMLElement;
      if (!target || panel.getPanelElement().contains(target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (locked && currentElement === target) {
        locked = false;
        statusText.textContent = liveUpdate
          ? "Live polling: ON (500ms)"
          : "Live polling: OFF";
        statusDot.style.background = "#42b883";
        return;
      }

      locked = true;
      currentElement = target;
      statusText.textContent = "Locked — click same element to unlock";
      statusDot.style.background = "#f59e0b";
      highlightElement(target);

      const compInfo = detectVueComponent(target);
      if (compInfo) {
        renderComponent(compInfo);
      } else {
        showNoVue();
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
          statusDot.style.background = "#42b883";
        } else {
          cleanup();
        }
      }
    }

    // Start live polling
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

export default vueStatePanel;
