import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

type FlameType = "scripting" | "rendering" | "painting";

interface FlameEntry {
  name: string;
  type: FlameType;
  startTime: number;
  duration: number;
  depth: number;
}

const TYPE_COLORS: Record<FlameType, string> = {
  scripting: "#3b82f6",
  rendering: "#a855f7",
  painting: "#22c55e",
};

function inferResourceType(r: PerformanceResourceTiming): FlameType {
  const url = r.name.toLowerCase();
  const ct = (r as PerformanceResourceTiming & { contentType?: string })
    .contentType;
  const initator = (
    r as PerformanceResourceTiming & {
      initiatorType?: string;
    }
  ).initiatorType;
  if (
    url.match(/\.(js|mjs|cjs)(\?|$)/) ||
    initator === "script" ||
    initator === "xmlhttprequest" ||
    (ct && ct.includes("javascript"))
  ) {
    return "scripting";
  }
  if (url.match(/\.(css)(\?|$)/) || (ct && ct.includes("css"))) {
    return "rendering";
  }
  return "painting";
}

function getNavigationType(): string {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav && nav.type) return nav.type;
  } catch {
    // navigation entry unavailable
  }
  try {
    const nt = (
      performance as unknown as {
        navigation?: { type?: number };
      }
    ).navigation;
    if (nt && typeof nt.type === "number") {
      // Legacy PerformanceNavigation enum: 0 navigate, 1 reload, 2 back_forward
      switch (nt.type) {
        case 0:
          return "navigate";
        case 1:
          return "reload";
        case 2:
          return "back_forward";
      }
    }
  } catch {
    // ignore
  }
  return "navigate";
}

export const flameGraph: ToolDefinition = {
  id: "flame-graph",
  name: "Performance Entries Viewer",
  description:
    "Visualize performance.measure / mark / resource / longtask entries as a timeline",
  category: "performance",
  icon: "Flame",
  configSchema: {
    sampleRate: {
      type: "slider",
      label: "Sample Rate (ms)",
      default: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    maxDuration: {
      type: "slider",
      label: "Max Duration (s)",
      default: 30,
      min: 5,
      max: 120,
      step: 5,
    },
    showLongTasks: { type: "boolean", label: "Show Long Tasks", default: true },
    longTaskThreshold: {
      type: "slider",
      label: "Long Task Threshold (ms)",
      default: 50,
      min: 10,
      max: 500,
      step: 10,
    },
  },
  run: (ctx, config) => {
    const timeRange = ((config?.maxDuration as number) ?? 30) * 1000;
    const minDuration = (config?.sampleRate as number) ?? 10;
    const showLongTasks = (config?.showLongTasks as boolean) ?? true;
    const longTaskThreshold = (config?.longTaskThreshold as number) ?? 50;

    const entries: FlameEntry[] = [];
    const seenKeys = new Set<string>();
    let active = true;
    let navType = getNavigationType();

    function pushEntry(e: FlameEntry): void {
      const key = `${e.name}|${e.startTime.toFixed(2)}|${e.duration.toFixed(2)}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      entries.push(e);
    }

    function recomputeDepth(): void {
      entries.sort(
        (a, b) => a.startTime - b.startTime || b.duration - a.duration,
      );
      const ends: number[] = [];
      for (const e of entries) {
        let d = 0;
        while (d < ends.length && ends[d] > e.startTime) d++;
        e.depth = d;
        ends[d] = e.startTime + e.duration;
      }
    }

    function captureStaticEntries(): void {
      const now = performance.now();
      const cutoff = now - timeRange;

      const measures = performance.getEntriesByType(
        "measure",
      ) as PerformanceMeasure[];
      for (const m of measures) {
        if (m.startTime < cutoff || m.duration < minDuration) continue;
        pushEntry({
          name: m.name || "measure",
          type: "scripting",
          startTime: m.startTime,
          duration: m.duration,
          depth: 0,
        });
      }

      const marks = performance.getEntriesByType("mark") as PerformanceMark[];
      for (const mk of marks) {
        if (mk.startTime < cutoff) continue;
        pushEntry({
          name: mk.name || "mark",
          type: "rendering",
          startTime: mk.startTime,
          duration: Math.max(minDuration, 0.1),
          depth: 0,
        });
      }

      const resources = performance.getEntriesByType(
        "resource",
      ) as PerformanceResourceTiming[];
      for (const r of resources) {
        if (r.startTime < cutoff || r.duration < minDuration) continue;
        pushEntry({
          name: r.name.split("/").pop() || r.name,
          type: inferResourceType(r),
          startTime: r.startTime,
          duration: r.duration,
          depth: 0,
        });
      }

      const paints = performance.getEntriesByType(
        "paint",
      ) as PerformancePaintTiming[];
      for (const p of paints) {
        if (p.startTime < cutoff) continue;
        pushEntry({
          name: p.name || "paint",
          type: "painting",
          startTime: p.startTime,
          duration: Math.max(minDuration, 0.1),
          depth: 0,
        });
      }

      navType = getNavigationType();
      recomputeDepth();
    }

    // One PerformanceObserver per entry type for cleaner teardown and so a
    // single unsupported entryType does not disable the others.
    const observers: PerformanceObserver[] = [];
    const observedTypes = ["measure", "mark", "resource", "paint", "longtask"];
    for (const entryType of observedTypes) {
      try {
        const obs = new PerformanceObserver((list) => {
          if (!active) return;
          const now = performance.now();
          const cutoff = now - timeRange;
          for (const entry of list.getEntries()) {
            if (entry.startTime < cutoff) continue;
            if (entryType === "longtask") {
              pushEntry({
                name: "longtask",
                type: "scripting",
                startTime: entry.startTime,
                duration: entry.duration,
                depth: 0,
              });
            } else if (entryType === "measure") {
              if (entry.duration < minDuration) continue;
              pushEntry({
                name: entry.name || "measure",
                type: "scripting",
                startTime: entry.startTime,
                duration: entry.duration,
                depth: 0,
              });
            } else if (entryType === "mark") {
              pushEntry({
                name: entry.name || "mark",
                type: "rendering",
                startTime: entry.startTime,
                duration: Math.max(minDuration, 0.1),
                depth: 0,
              });
            } else if (entryType === "resource") {
              if (entry.duration < minDuration) continue;
              pushEntry({
                name: entry.name.split("/").pop() || entry.name,
                type: inferResourceType(entry as PerformanceResourceTiming),
                startTime: entry.startTime,
                duration: entry.duration,
                depth: 0,
              });
            } else if (entryType === "paint") {
              pushEntry({
                name: entry.name || "paint",
                type: "painting",
                startTime: entry.startTime,
                duration: Math.max(minDuration, 0.1),
                depth: 0,
              });
            }
          }
          recomputeDepth();
          renderFlameGraph();
        });
        obs.observe({ type: entryType, buffered: true });
        observers.push(obs);
      } catch {
        // entryType unsupported in this browser
      }
    }

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:780px;height:480px;z-index:2147483647;pointer-events:auto;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .fg-panel { background: #0f172a; border-radius: 12px; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,.5); display: flex; flex-direction: column; height: 100%; overflow: hidden; color: #e2e8f0; font-size: 13px; }
      .fg-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #1e293b; border-bottom: 1px solid #334155; flex-shrink: 0; }
      .fg-header-title { font-weight: 600; font-size: 14px; }
      .fg-header-sub { font-size: 11px; color: #94a3b8; margin-left: 8px; }
      .fg-header-actions { display: flex; gap: 4px; }
      .fg-header-actions button { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 14px; }
      .fg-header-actions button:hover { background: #334155; color: #f8fafc; }
      .fg-canvas-wrap { flex: 1; position: relative; overflow-y: auto; overflow-x: hidden; background: #0f172a; }
      .fg-bar { position: absolute; height: 22px; border-radius: 3px; font-size: 11px; line-height: 22px; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; cursor: default; padding: 0 4px; }
      .fg-bar:hover { filter: brightness(1.2); }
      .fg-tooltip { position: fixed; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; font-size: 12px; pointer-events: none; z-index: 99999; max-width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,.4); display: none; }
      .fg-tooltip.visible { display: block; }
      .fg-tooltip-name { font-weight: 600; color: #f8fafc; margin-bottom: 4px; word-break: break-all; }
      .fg-tooltip-details { display: flex; flex-direction: column; gap: 2px; color: #94a3b8; font-size: 11px; }
      .fg-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #1e293b; border-top: 1px solid #334155; font-size: 11px; color: #64748b; flex-shrink: 0; }
      .fg-legend { display: flex; gap: 12px; padding: 6px 16px; background: #1e293b; border-bottom: 1px solid #334155; flex-shrink: 0; }
      .fg-legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; }
      .fg-legend-dot { width: 10px; height: 10px; border-radius: 2px; }
      .fg-stats { display: flex; gap: 16px; padding: 6px 16px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 12px; color: #94a3b8; flex-shrink: 0; flex-wrap: wrap; }
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "fg-panel";

    const header = document.createElement("div");
    header.className = "fg-header";
    const titleWrap = document.createElement("div");
    titleWrap.style.cssText = "display:flex;align-items:baseline;";
    const title = document.createElement("div");
    title.className = "fg-header-title";
    title.textContent = "Performance Entries";
    const subtitle = document.createElement("span");
    subtitle.className = "fg-header-sub";
    subtitle.textContent = "nav: " + navType;
    titleWrap.append(title, subtitle);
    const actions = document.createElement("div");
    actions.className = "fg-header-actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.textContent = "Refresh";
    btnRefresh.dataset.action = "refresh";
    const btnClose = document.createElement("button");
    btnClose.textContent = "Close";
    btnClose.dataset.action = "close";
    actions.append(btnRefresh, btnClose);
    header.append(titleWrap, actions);

    const legend = document.createElement("div");
    legend.className = "fg-legend";
    for (const [t, c] of Object.entries(TYPE_COLORS)) {
      const item = document.createElement("div");
      item.className = "fg-legend-item";
      const dot = document.createElement("div");
      dot.className = "fg-legend-dot";
      dot.style.background = c;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(t));
      legend.appendChild(item);
    }

    const stats = document.createElement("div");
    stats.className = "fg-stats";
    const statsText = document.createElement("span");
    statsText.textContent = "Entries: 0";
    stats.appendChild(statsText);

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "fg-canvas-wrap";

    const footer = document.createElement("div");
    footer.className = "fg-footer";
    const footerLeft = document.createElement("span");
    footerLeft.textContent = "Hover bars for details";
    const footerRight = document.createElement("span");
    footerRight.textContent =
      "Time range: " + ((config?.maxDuration as number) ?? 30) + "s";
    footer.append(footerLeft, footerRight);

    const tooltip = document.createElement("div");
    tooltip.className = "fg-tooltip";

    panel.append(header, legend, stats, canvasWrap, footer);
    shadow.append(panel, tooltip);

    addOverlayElement(panelHost);

    const BAR_HEIGHT = 22;
    const BAR_GAP = 2;
    const ROW = BAR_HEIGHT + BAR_GAP;

    function renderFlameGraph(): void {
      while (canvasWrap.firstChild)
        canvasWrap.removeChild(canvasWrap.firstChild);
      subtitle.textContent = "nav: " + navType;

      if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText =
          "display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;";
        empty.textContent =
          "No performance entries captured. Interact with the page or use performance.mark()/measure().";
        canvasWrap.appendChild(empty);
        statsText.textContent = "Entries: 0";
        return;
      }

      const maxDepth = Math.max(...entries.map((e) => e.depth), 0);
      const totalHeight = (maxDepth + 1) * ROW + 8;
      canvasWrap.style.position = "relative";
      canvasWrap.style.minHeight = totalHeight + "px";

      const containerWidth = canvasWrap.clientWidth || 700;
      const now = performance.now();
      const timeStart = Math.max(now - timeRange, 0);
      const timeEnd = now;
      const timeSpan = timeEnd - timeStart || 1;

      for (const entry of entries) {
        const x = ((entry.startTime - timeStart) / timeSpan) * containerWidth;
        const w = Math.max(2, (entry.duration / timeSpan) * containerWidth);
        if (x + w < 0 || x > containerWidth) continue;

        const bar = document.createElement("div");
        bar.className = "fg-bar";
        bar.style.left = x + "px";
        bar.style.top = entry.depth * ROW + "px";
        bar.style.width = w + "px";
        bar.style.background = TYPE_COLORS[entry.type] || TYPE_COLORS.scripting;

        if (entry.name === "longtask") {
          bar.style.borderRight = "3px solid #f59e0b";
        } else if (
          showLongTasks &&
          entry.type === "scripting" &&
          entry.duration > longTaskThreshold
        ) {
          bar.style.borderRight = "3px solid #f59e0b";
        }

        if (w > 40) {
          bar.textContent =
            entry.name.length > 30
              ? entry.name.slice(0, 27) + "..."
              : entry.name;
        }

        bar.addEventListener("mouseenter", (ev: MouseEvent) => {
          tooltip.innerHTML = `
            <div class="fg-tooltip-name">${escapeText(entry.name)}</div>
            <div class="fg-tooltip-details">
              <span>Type: ${entry.type}</span>
              <span>Duration: ${entry.duration.toFixed(2)}ms</span>
              <span>Start: ${entry.startTime.toFixed(2)}ms</span>
            </div>
          `;
          tooltip.classList.add("visible");
          positionTooltip(ev);
        });
        bar.addEventListener("mousemove", positionTooltip);
        bar.addEventListener("mouseleave", () =>
          tooltip.classList.remove("visible"),
        );

        canvasWrap.appendChild(bar);
      }

      statsText.textContent =
        "Entries: " + entries.length + " | Depth: " + (maxDepth + 1);

      const longCount = entries.filter(
        (e) => e.duration > longTaskThreshold,
      ).length;
      if (showLongTasks && longCount > 0) {
        const longSpan = document.createElement("span");
        longSpan.style.color = "#f59e0b";
        longSpan.textContent = " | Long tasks: " + longCount;
        stats.appendChild(longSpan);
      }
    }

    function positionTooltip(ev: MouseEvent): void {
      tooltip.style.left = ev.clientX + 12 + "px";
      tooltip.style.top = ev.clientY - 10 + "px";
    }

    function escapeText(s: string): string {
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    panel.addEventListener("click", (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === "close") cleanup();
      else if (target.dataset.action === "refresh") {
        captureStaticEntries();
        renderFlameGraph();
      }
    });

    captureStaticEntries();
    renderFlameGraph();

    const refreshTimer = setInterval(() => {
      if (!active) return;
      captureStaticEntries();
      renderFlameGraph();
    }, 2000);

    function cleanup() {
      if (!active) return;
      active = false;
      clearInterval(refreshTimer);
      for (const obs of observers) {
        try {
          obs.disconnect();
        } catch {
          // ignore
        }
      }
      observers.length = 0;
      removeOverlayElement(panelHost);
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
