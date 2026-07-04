import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";

type CWVMetric = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";

interface MetricScore {
  name: CWVMetric;
  value: number;
  unit: string;
  rating: "good" | "needs-improvement" | "poor";
  score: number;
  suggestion: string;
}

interface LongTaskEntry {
  duration: number;
  startTime: number;
}

interface OpportunityEntry {
  id: string;
  title: string;
  savingsMs: number;
}

interface PerformanceResult {
  vitals: MetricScore[];
  overallScore: number;
  resources: { total: number; size: string; slowRequests: number };
  dom: { nodes: number; depth: number; width: number };
  longTasks: {
    count: number;
    totalDuration: number;
    entries: LongTaskEntry[];
  };
  opportunities: OpportunityEntry[];
  timestamp: number;
}

const RATINGS: Record<CWVMetric, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const LINEAR_FALLBACK: Record<CWVMetric, [number, number]> = RATINGS;

const LH_PROFILES: Record<CWVMetric, { median: number; pod: number }> = {
  LCP: { median: 2500, pod: 0.1 },
  CLS: { median: 0.1, pod: 0.1 },
  INP: { median: 200, pod: 0.3 },
  FCP: { median: 1800, pod: 0.1 },
  TTFB: { median: 800, pod: 0.08 },
};

const LH_WEIGHTS: Record<CWVMetric, number> = {
  LCP: 0.25,
  INP: 0.3,
  CLS: 0.25,
  FCP: 0.1,
  TTFB: 0.1,
};

export function getRating(
  metric: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const thresholds = RATINGS[metric as CWVMetric];
  if (!thresholds) return "good";
  const [good, poor] = thresholds;
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function logNormalCdf(z: number): number {
  if (z < -5.5) return 0;
  return (
    1 -
    Math.exp(-0.5 * z * z) -
    (1 / 12) * Math.pow(z, 5) -
    (1 / 4) * Math.pow(z, 3) +
    (1 / 2) * z
  );
}

function lighthouseScore(median: number, pod: number, value: number): number {
  if (value <= 0) return 100;
  const location = Math.log(median);
  const scale = Math.log(1 + pod * pod) / Math.sqrt(2 * Math.log(2));
  const z0 = (Math.log(median * (1 + pod)) - location) / scale;
  const cdfZ0 = logNormalCdf(z0);
  if (cdfZ0 <= 0) return 0;
  const cdfVal = logNormalCdf((Math.log(value) - location) / scale);
  const score = (1 - cdfVal) / (1 - cdfZ0);
  return Math.max(0, Math.min(1, score)) * 100;
}

function getScore(metric: CWVMetric, value: number): number {
  const profile = LH_PROFILES[metric];
  if (!profile || value <= 0 || !Number.isFinite(value)) {
    const [good, poor] = LINEAR_FALLBACK[metric] ?? [0, 100];
    if (value <= good) return 100;
    if (value >= poor) return 0;
    return Math.round(100 * (1 - (value - good) / (poor - good)));
  }
  return lighthouseScore(profile.median, profile.pod, value);
}

function computeOverallScore(metrics: MetricScore[]): number {
  let weighted = 0;
  let weight = 0;
  for (const m of metrics) {
    const w = LH_WEIGHTS[m.name];
    if (w === undefined) continue;
    weighted += m.score * w;
    weight += w;
  }
  if (weight === 0) return 0;
  return Math.round(weighted / weight);
}

function getSuggestion(metric: string, value: number, rating: string): string {
  if (rating === "good") return "No action needed";
  const suggestions: Record<string, Record<string, string>> = {
    LCP: {
      "needs-improvement":
        "Consider lazy-loading hero images or optimizing server response time",
      poor: "Critical: Optimize largest content element. Preload hero images, reduce server latency, eliminate render-blocking resources",
    },
    CLS: {
      "needs-improvement":
        "Add explicit width/height to images and videos, avoid inserting content above existing content",
      poor: "Critical: Large layout shifts detected. Reserve space for dynamic content, use CSS aspect-ratio, set dimensions on media",
    },
    INP: {
      "needs-improvement":
        "Break up long JavaScript tasks, use requestAnimationFrame for visual updates",
      poor: "Critical: Input handling is slow. Reduce JavaScript execution time, break tasks into smaller chunks, use web workers",
    },
    FCP: {
      "needs-improvement":
        "Reduce render-blocking resources, inline critical CSS, optimize fonts",
      poor: "Critical: First paint is very slow. Eliminate render-blocking resources, use server-side rendering, optimize critical path",
    },
    TTFB: {
      "needs-improvement":
        "Consider using a CDN, optimize server response time",
      poor: "Critical: Server response is very slow. Use edge caching, optimize database queries, upgrade server infrastructure",
    },
  };
  return suggestions[metric]?.[rating] || "Consider optimizing this metric";
}

function deriveOpportunities(
  metrics: MetricScore[],
  longTasks: LongTaskEntry[],
): OpportunityEntry[] {
  const ops: OpportunityEntry[] = [];
  for (const m of metrics) {
    if (m.rating === "good") continue;
    const thresholds = RATINGS[m.name];
    const target = thresholds?.[0];
    const savings =
      typeof target === "number" && m.unit === "ms"
        ? Math.max(0, Math.round(m.value - target))
        : 0;
    const title = getSuggestion(m.name, m.value, m.rating).split(/[.:]/)[0];
    ops.push({
      id: `reduce-${m.name.toLowerCase()}`,
      title,
      savingsMs: savings,
    });
  }
  if (longTasks.length > 0) {
    const over = longTasks.reduce(
      (sum, t) => sum + Math.max(0, t.duration - 50),
      0,
    );
    ops.push({
      id: "reduce-long-tasks",
      title: "Break up long JavaScript tasks",
      savingsMs: Math.round(over),
    });
  }
  return ops;
}

function makeMetric(name: CWVMetric, value: number, unit: string): MetricScore {
  const rating = getRating(name, value);
  return {
    name,
    value: unit === "" ? parseFloat(value.toFixed(3)) : Math.round(value),
    unit,
    rating,
    score: Math.round(getScore(name, value)),
    suggestion: getSuggestion(name, value, rating),
  };
}

function collectWebVitals(): Promise<{
  metrics: MetricScore[];
  observers: PerformanceObserver[];
}> {
  return new Promise((resolve) => {
    const metrics: MetricScore[] = [];
    const observers: PerformanceObserver[] = [];
    let resolved = false;

    const setMetric = (m: MetricScore) => {
      const idx = metrics.findIndex((x) => x.name === m.name);
      if (idx >= 0) metrics[idx] = m;
      else metrics.push(m);
    };

    const finish = () => {
      if (resolved) return;
      resolved = true;
      settleLcp();
      flushCls();
      flushInp();
      resolve({ metrics, observers });
    };

    const observe = (
      type: string,
      callback: (entries: PerformanceEntry[]) => void,
    ) => {
      try {
        const observer = new PerformanceObserver((list) =>
          callback(list.getEntries()),
        );
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        // type unsupported
      }
    };

    // LCP: resolves on visibilitychange→hidden, 5s ceiling, or 1s idle
    // after the last candidate.
    let lastLcpEntry: PerformanceEntry | null = null;
    let lcpSettled = false;
    let lcpIdleTimer: number | null = null;
    const lcpCeiling = window.setTimeout(finish, 5000);

    const settleLcp = () => {
      if (lcpSettled) return;
      if (!lastLcpEntry) return;
      lcpSettled = true;
      if (lcpIdleTimer !== null) {
        clearTimeout(lcpIdleTimer);
        lcpIdleTimer = null;
      }
      setMetric(makeMetric("LCP", lastLcpEntry.startTime, "ms"));
    };

    observe("largest-contentful-paint", (entries) => {
      const last = entries[entries.length - 1];
      if (!last) return;
      lastLcpEntry = last;
      if (lcpIdleTimer !== null) clearTimeout(lcpIdleTimer);
      lcpIdleTimer = window.setTimeout(settleLcp, 1000);
    });

    // FCP: resolves immediately when its entry arrives.
    observe("paint", (entries) => {
      for (const entry of entries) {
        if (entry.name === "first-contentful-paint") {
          setMetric(makeMetric("FCP", entry.startTime, "ms"));
          break;
        }
      }
    });

    // CLS — session-window with a 1s gap and 5s ceiling (the Google spec).
    let clsValue = 0;
    let sessionValue = 0;
    let sessionStart = -Infinity;
    let clsFlushed = false;

    const flushCls = () => {
      if (clsFlushed) return;
      clsFlushed = true;
      if (sessionValue > clsValue) clsValue = sessionValue;
      if (clsValue > 0) setMetric(makeMetric("CLS", clsValue, ""));
    };

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        const e = entry as unknown as {
          value: number;
          hadRecentInput: boolean;
          startTime: number;
        };
        if (e.hadRecentInput) continue;
        if (
          e.startTime - sessionStart > 5000 ||
          e.startTime - sessionStart > 1000
        ) {
          if (sessionValue > clsValue) clsValue = sessionValue;
          sessionValue = 0;
          sessionStart = e.startTime;
        }
        sessionValue += e.value;
        if (sessionValue > clsValue) clsValue = sessionValue;
      }
      setMetric(makeMetric("CLS", clsValue, ""));
    });

    // INP — worst interaction latency over the audit window. Track the
    // max event duration observed via the 'event' PerformanceObserver.
    let worstInteraction = 0;
    let inpFlushed = false;

    const flushInp = () => {
      if (inpFlushed) return;
      inpFlushed = true;
      if (worstInteraction > 0) {
        setMetric(makeMetric("INP", worstInteraction, "ms"));
      }
    };

    observe("event", (entries) => {
      for (const entry of entries) {
        const e = entry as unknown as { duration: number };
        if (e.duration > worstInteraction) worstInteraction = e.duration;
      }
      if (worstInteraction > 0) {
        setMetric(makeMetric("INP", worstInteraction, "ms"));
      }
    });

    // TTFB — synchronous, no observer needed.
    const navEntries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb > 0) setMetric(makeMetric("TTFB", ttfb, "ms"));
    }

    // CLS resolves on tab-hidden; LCP resolves on tab-hidden or settles
    // via its own idle/ceiling timers. Both are finalized in finish().
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") finish();
      },
      { once: true },
    );

    // Global 5s ceiling for the whole audit.
    window.clearTimeout(lcpCeiling);
    window.setTimeout(finish, 5000);
  });
}

function collectResourceInfo(): {
  total: number;
  size: string;
  slowRequests: number;
} {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  let totalSize = 0;
  let slowRequests = 0;

  for (const r of resources) {
    if (r.transferSize) totalSize += r.transferSize;
    if (r.duration > 1000) slowRequests++;
  }

  const sizeStr =
    totalSize > 1024 * 1024
      ? (totalSize / (1024 * 1024)).toFixed(1) + " MB"
      : (totalSize / 1024).toFixed(0) + " KB";

  return { total: resources.length, size: sizeStr, slowRequests };
}

function collectDOMInfo(): { nodes: number; depth: number; width: number } {
  let maxDepth = 0;
  let maxWidth = 0;

  function walk(el: Element, depth: number): void {
    if (depth > maxDepth) maxDepth = depth;
    if (el.children.length > maxWidth) maxWidth = el.children.length;
    for (const child of Array.from(el.children)) {
      walk(child, depth + 1);
    }
  }

  walk(document.documentElement, 0);

  return {
    nodes: document.querySelectorAll("*").length,
    depth: maxDepth,
    width: maxWidth,
  };
}

function collectLongTasks(): {
  count: number;
  totalDuration: number;
  entries: LongTaskEntry[];
  observer: PerformanceObserver | null;
} {
  const entries: LongTaskEntry[] = [];
  let totalDuration = 0;
  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          entries.push({
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
          });
          totalDuration += entry.duration;
        }
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask not supported
  }

  return {
    count: entries.length,
    totalDuration: Math.round(totalDuration),
    entries,
    observer,
  };
}

async function runPerformanceAudit(): Promise<
  PerformanceResult & {
    observers: PerformanceObserver[];
    longTaskObserver: PerformanceObserver | null;
  }
> {
  const { metrics, observers } = await collectWebVitals();
  const resources = collectResourceInfo();
  const dom = collectDOMInfo();
  const longTasks = collectLongTasks();
  const opportunities = deriveOpportunities(metrics, longTasks.entries);
  const overallScore = computeOverallScore(metrics);

  return {
    vitals: metrics,
    overallScore,
    resources,
    dom,
    longTasks: {
      count: longTasks.count,
      totalDuration: longTasks.totalDuration,
      entries: longTasks.entries,
    },
    opportunities,
    timestamp: Date.now(),
    observers,
    longTaskObserver: longTasks.observer,
  };
}

// ---------------------------------------------------------------------------
// UI Rendering
// ---------------------------------------------------------------------------

function ratingColor(rating: string): string {
  switch (rating) {
    case "good":
      return "#a6e3a1";
    case "needs-improvement":
      return "#f9e2af";
    case "poor":
      return "#f38ba8";
    default:
      return "#6c7086";
  }
}

function ratingLabel(rating: string): string {
  switch (rating) {
    case "good":
      return "GOOD";
    case "needs-improvement":
      return "NEEDS WORK";
    case "poor":
      return "POOR";
    default:
      return "N/A";
  }
}

function renderScoreGauge(score: number, color: string): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText = "display:flex;align-items:center;gap:8px;";

  const gauge = document.createElement("div");
  gauge.style.cssText = `
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12px; color: #1e1e2e;
    background: ${color};
  `;
  gauge.textContent = String(score);
  container.appendChild(gauge);

  return container;
}

function renderMetric(metric: MetricScore): HTMLElement {
  const row = document.createElement("div");
  row.style.cssText = "padding: 12px 16px; border-bottom: 1px solid #313244;";

  const header = document.createElement("div");
  header.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;";

  const left = document.createElement("div");
  left.style.cssText = "display: flex; align-items: center; gap: 8px;";

  left.appendChild(renderScoreGauge(metric.score, ratingColor(metric.rating)));

  const nameDiv = document.createElement("div");
  const nameSpan = document.createElement("div");
  nameSpan.style.cssText = "font-weight: 600; font-size: 13px; color: #cdd6f4;";
  nameSpan.textContent = metric.name;
  nameDiv.appendChild(nameSpan);

  const badge = document.createElement("span");
  badge.style.cssText = `font-size: 10px; font-weight: 600; color: ${ratingColor(metric.rating)};`;
  badge.textContent = ratingLabel(metric.rating);
  nameDiv.appendChild(badge);

  left.appendChild(nameDiv);
  header.appendChild(left);

  const valueSpan = document.createElement("span");
  valueSpan.style.cssText =
    "font-weight: 700; font-size: 16px; color: #cdd6f4;";
  valueSpan.textContent = `${metric.value}${metric.unit ? " " + metric.unit : ""}`;
  header.appendChild(valueSpan);

  row.appendChild(header);

  // Suggestion
  const suggestion = document.createElement("div");
  suggestion.style.cssText =
    "color: #6c7086; font-size: 11px; margin-top: 4px; padding-left: 44px;";
  suggestion.textContent = metric.suggestion;
  row.appendChild(suggestion);

  return row;
}

export const performanceAudit: ToolDefinition = {
  id: "performance-audit",
  name: "Performance Audit",
  description:
    "Measure Core Web Vitals and get actionable performance suggestions",
  category: "performance",
  icon: "Gauge",

  run(ctx) {
    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:440px;max-height:85vh;overflow-y:auto;" +
      "z-index:2147483647;pointer-events:auto;background:#1e1e2e;color:#cdd6f4;" +
      "font-family:system-ui,-apple-system,sans-serif;font-size:13px;border-radius:12px;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #45475a;display:flex;flex-direction:column;";

    // Header
    const header = document.createElement("div");
    header.style.cssText =
      "padding:12px 16px;border-bottom:1px solid #45475a;display:flex;justify-content:space-between;align-items:center;";
    const title = document.createElement("span");
    title.style.cssText = "font-weight:600;font-size:15px;";
    title.textContent = "Performance Audit";
    header.appendChild(title);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;";

    const vscodeBtn = document.createElement("button");
    vscodeBtn.textContent = "Send to VS Code";
    vscodeBtn.style.cssText =
      "background:#6366f1;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;display:none;";
    btnRow.appendChild(vscodeBtn);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.cssText =
      "background:#45475a;color:#cdd6f4;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;";
    btnRow.appendChild(closeButton);

    header.appendChild(btnRow);
    panel.appendChild(header);

    // Loading
    const loading = document.createElement("div");
    loading.style.cssText =
      "padding:32px 16px;text-align:center;color:#6c7086;";
    loading.textContent = "Collecting performance metrics...";
    panel.appendChild(loading);

    addOverlayElement(panel);

    // Stash observers so cleanup can disconnect them. Previously they were
    // never disconnected — a leak per audit run.
    const pendingObservers: PerformanceObserver[] = [];
    let lastResult: PerformanceResult | null = null;

    runPerformanceAudit()
      .then((result) => {
        for (const o of result.observers) pendingObservers.push(o);
        if (result.longTaskObserver)
          pendingObservers.push(result.longTaskObserver);
        lastResult = {
          vitals: result.vitals,
          overallScore: result.overallScore,
          resources: result.resources,
          dom: result.dom,
          longTasks: {
            count: result.longTasks.count,
            totalDuration: result.longTasks.totalDuration,
            entries: result.longTasks.entries,
          },
          opportunities: result.opportunities,
          timestamp: result.timestamp,
        };
        if (disposed) {
          for (const o of pendingObservers) {
            try {
              o.disconnect();
            } catch {
              /* ignore */
            }
          }
          return;
        }
        if (loading.parentNode) loading.parentNode.removeChild(loading);

        const avgScore = result.overallScore;
        const overallColor =
          avgScore >= 90 ? "#a6e3a1" : avgScore >= 50 ? "#f9e2af" : "#f38ba8";

        const scoreBar = document.createElement("div");
        scoreBar.style.cssText =
          "padding:16px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #313244;";

        const bigGauge = document.createElement("div");
        bigGauge.style.cssText = `
        width: 56px; height: 56px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 20px; color: #1e1e2e;
        background: ${overallColor}; flex-shrink: 0;
      `;
        bigGauge.textContent = String(avgScore);
        scoreBar.appendChild(bigGauge);

        const scoreInfo = document.createElement("div");
        const scoreLabel = document.createElement("div");
        scoreLabel.style.cssText = "font-weight: 600; font-size: 14px;";
        scoreLabel.textContent = "Performance Score";
        scoreInfo.appendChild(scoreLabel);
        const scoreDetail = document.createElement("div");
        scoreDetail.style.cssText = "color: #6c7086; font-size: 11px;";
        scoreDetail.textContent = `${result.vitals.length} metrics collected`;
        scoreInfo.appendChild(scoreDetail);
        scoreBar.appendChild(scoreInfo);

        panel.appendChild(scoreBar);

        const vitalsHeader = document.createElement("div");
        vitalsHeader.style.cssText =
          "padding:10px 16px;color:#6c7086;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #313244;";
        vitalsHeader.textContent = "Core Web Vitals";
        panel.appendChild(vitalsHeader);

        for (const metric of result.vitals) {
          panel.appendChild(renderMetric(metric));
        }

        const resHeader = document.createElement("div");
        resHeader.style.cssText =
          "padding:10px 16px;color:#6c7086;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #313244;";
        resHeader.textContent = "Resources";
        panel.appendChild(resHeader);

        const resRow = document.createElement("div");
        resRow.style.cssText =
          "padding:12px 16px;border-bottom:1px solid #313244;display:flex;gap:20px;";

        const resItems = [
          {
            label: "Requests",
            value: String(result.resources.total),
            color: "#89b4fa",
          },
          { label: "Transfer", value: result.resources.size, color: "#cba6f7" },
          {
            label: "Slow (>1s)",
            value: String(result.resources.slowRequests),
            color: result.resources.slowRequests > 0 ? "#f38ba8" : "#a6e3a1",
          },
        ];

        for (const item of resItems) {
          const itemDiv = document.createElement("div");
          const valSpan = document.createElement("div");
          valSpan.style.cssText = `font-weight: 600; font-size: 16px; color: ${item.color};`;
          valSpan.textContent = item.value;
          itemDiv.appendChild(valSpan);
          const labelSpan = document.createElement("div");
          labelSpan.style.cssText = "font-size: 10px; color: #6c7086;";
          labelSpan.textContent = item.label;
          itemDiv.appendChild(labelSpan);
          resRow.appendChild(itemDiv);
        }
        panel.appendChild(resRow);

        const domRow = document.createElement("div");
        domRow.style.cssText =
          "padding:12px 16px;border-bottom:1px solid #313244;display:flex;gap:20px;";

        const domItems = [
          {
            label: "DOM Nodes",
            value: String(result.dom.nodes),
            color: result.dom.nodes > 1500 ? "#f38ba8" : "#89b4fa",
          },
          {
            label: "Max Depth",
            value: String(result.dom.depth),
            color: result.dom.depth > 20 ? "#fab387" : "#89b4fa",
          },
          {
            label: "Max Width",
            value: String(result.dom.width),
            color: "#89b4fa",
          },
        ];

        for (const item of domItems) {
          const itemDiv = document.createElement("div");
          const valSpan = document.createElement("div");
          valSpan.style.cssText = `font-weight: 600; font-size: 16px; color: ${item.color};`;
          valSpan.textContent = item.value;
          itemDiv.appendChild(valSpan);
          const labelSpan = document.createElement("div");
          labelSpan.style.cssText = "font-size: 10px; color: #6c7086;";
          labelSpan.textContent = item.label;
          itemDiv.appendChild(labelSpan);
          domRow.appendChild(itemDiv);
        }
        panel.appendChild(domRow);

        if (result.longTasks.count > 0) {
          const ltRow = document.createElement("div");
          ltRow.style.cssText =
            "padding:12px 16px;border-bottom:1px solid #313244;";
          const ltText = document.createElement("div");
          ltText.style.cssText = "color: #fab387; font-size: 12px;";
          ltText.textContent = `${result.longTasks.count} long task(s) detected (${result.longTasks.totalDuration}ms total) — these block the main thread`;
          ltRow.appendChild(ltText);
          panel.appendChild(ltRow);
        }

        vscodeBtn.style.display = "inline-block";
        sendPerformanceToVsCode(lastResult);
      })
      .catch(() => {
        if (loading.parentNode) loading.parentNode.removeChild(loading);
        const errDiv = document.createElement("div");
        errDiv.style.cssText =
          "padding:32px 16px;text-align:center;color:#f38ba8;";
        errDiv.textContent = "Failed to collect performance metrics";
        panel.appendChild(errDiv);
        for (const o of pendingObservers) {
          try {
            o.disconnect();
          } catch {
            /* ignore */
          }
        }
      });

    const sendPerformanceToVsCode = (result: PerformanceResult): boolean => {
      if (disposed) return false;
      try {
        const bridge = getBridge();
        if (!bridge.connected) return false;
        return bridge.send({
          type: "PerformanceAudit",
          payload: {
            url: location.href,
            timestamp: result.timestamp,
            overallScore: result.overallScore,
            metrics: result.vitals.map((m) => ({
              metric: m.name,
              value: m.value,
              rating: m.rating,
            })),
            longTasks: result.longTasks.entries,
            opportunities: result.opportunities,
          },
        });
      } catch {
        return false;
      }
    };

    vscodeBtn.addEventListener("click", () => {
      if (!lastResult) {
        vscodeBtn.textContent = "Nothing to send";
        setTimeout(() => {
          vscodeBtn.textContent = "Send to VS Code";
        }, 2000);
        return;
      }
      const sent = sendPerformanceToVsCode(lastResult);
      if (!getBridge().connected) {
        vscodeBtn.textContent = "Not connected";
      } else {
        vscodeBtn.textContent = sent ? "Sent!" : "Failed";
      }
      setTimeout(() => {
        vscodeBtn.textContent = "Send to VS Code";
      }, 2000);
    });

    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      // Disconnect any observers created during the audit so the page
      // isn't paying for them after the panel closes.
      for (const o of pendingObservers) {
        try {
          o.disconnect();
        } catch {
          /* ignore */
        }
      }
      pendingObservers.length = 0;
      removeOverlayElement(panel);
    };

    closeButton.addEventListener("click", cleanup);
    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
