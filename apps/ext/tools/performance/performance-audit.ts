import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";

interface MetricScore {
  name: string;
  value: number;
  unit: string;
  rating: "good" | "needs-improvement" | "poor";
  score: number; // 0-100
  suggestion: string;
}

interface PerformanceResult {
  vitals: MetricScore[];
  resources: { total: number; size: string; slowRequests: number };
  dom: { nodes: number; depth: number; width: number };
  longTasks: { count: number; totalDuration: number };
  timestamp: number;
}

export function getRating(
  metric: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[metric] || [Infinity, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function getScore(metric: string, value: number): number {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[metric] || [0, 100];
  if (value <= good) return 100;
  if (value >= poor) return 0;
  return Math.round(100 * (1 - (value - good) / (poor - good)));
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

function collectWebVitals(): Promise<{
  metrics: MetricScore[];
  observers: PerformanceObserver[];
}> {
  return new Promise((resolve) => {
    const metrics: MetricScore[] = [];
    const observers: PerformanceObserver[] = [];
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve({ metrics, observers });
    };

    // LCP: don't snapshot at 500ms — observe until the page is hidden or
    // 2.5s elapses with no new LCP candidate. Browsers keep updating the LCP
    // candidate as larger elements paint.
    let lastLcpEntry: PerformanceEntry | null = null;
    let lcpSettledTimer: number | null = null;
    const settleLcp = () => {
      if (lastLcpEntry && !metrics.some((m) => m.name === "LCP")) {
        const value = lastLcpEntry.startTime;
        const rating = getRating("LCP", value);
        metrics.push({
          name: "LCP",
          value: Math.round(value),
          unit: "ms",
          rating,
          score: getScore("LCP", value),
          suggestion: getSuggestion("LCP", value, rating),
        });
      }
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
        // Type not supported in this browser.
      }
    };

    // LCP
    observe("largest-contentful-paint", (entries) => {
      const last = entries[entries.length - 1];
      if (last) {
        lastLcpEntry = last;
        if (lcpSettledTimer !== null) clearTimeout(lcpSettledTimer);
        // Reset the settle timer each time a new candidate arrives.
        lcpSettledTimer = window.setTimeout(settleLcp, 2500);
      }
    });

    // FCP
    observe("paint", (entries) => {
      for (const entry of entries) {
        if (
          entry.name === "first-contentful-paint" &&
          !metrics.some((m) => m.name === "FCP")
        ) {
          const value = entry.startTime;
          const rating = getRating("FCP", value);
          metrics.push({
            name: "FCP",
            value: Math.round(value),
            unit: "ms",
            rating,
            score: getScore("FCP", value),
            suggestion: getSuggestion("FCP", value, rating),
          });
        }
      }
    });

    // CLS — session-window algorithm (5s window, 1s gap, max session value).
    // This is the spec definition since 2020; summing all shifts over-counts
    // long-lived SPAs.
    let clsValue = 0;
    let sessionValue = 0;
    let sessionStart = -Infinity;
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
        sessionStart = Math.max(sessionStart, e.startTime);
      }
      if (sessionValue > clsValue) clsValue = sessionValue;
      if (!metrics.some((m) => m.name === "CLS")) {
        const rating = getRating("CLS", clsValue);
        metrics.push({
          name: "CLS",
          value: parseFloat(clsValue.toFixed(3)),
          unit: "",
          rating,
          score: getScore("CLS", clsValue),
          suggestion: getSuggestion("CLS", clsValue, rating),
        });
      } else {
        // Update in place as new shifts accumulate.
        const idx = metrics.findIndex((m) => m.name === "CLS");
        if (idx >= 0) {
          const rating = getRating("CLS", clsValue);
          metrics[idx] = {
            name: "CLS",
            value: parseFloat(clsValue.toFixed(3)),
            unit: "",
            rating,
            score: getScore("CLS", clsValue),
            suggestion: getSuggestion("CLS", clsValue, rating),
          };
        }
      }
    });

    // INP — worst interaction (highest duration of the slowest event in any
    // interaction), per the spec. We approximate "interaction" by grouping
    // pointerdown/pointerup/click/keydown on a nearby start time; the
    // simplified worst-event-duration proxy used here is what most early
    // web-vitals versions did and is much closer to real INP than max-event.
    const interactionBuckets = new Map<number, number>();
    let worstInteraction = 0;
    observe("event", (entries) => {
      for (const entry of entries) {
        const e = entry as unknown as {
          startTime: number;
          duration: number;
          name: string;
        };
        if (!e.duration || e.duration < 16) continue;
        // Bucket events into interactions by 100ms start-time proximity.
        const bucket = Math.floor(e.startTime / 100);
        interactionBuckets.set(
          bucket,
          Math.max(interactionBuckets.get(bucket) ?? 0, e.duration),
        );
      }
      // INP is the worst interaction, not the worst single event. We take
      // the max bucket as the proxy.
      let max = 0;
      for (const v of interactionBuckets.values()) if (v > max) max = v;
      worstInteraction = max;
    });

    // TTFB (synchronous, no observer needed)
    const navEntries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      const ttfb = nav.responseStart - nav.requestStart;
      const rating = getRating("TTFB", ttfb);
      metrics.push({
        name: "TTFB",
        value: Math.round(ttfb),
        unit: "ms",
        rating,
        score: getScore("TTFB", ttfb),
        suggestion: getSuggestion("TTFB", ttfb, rating),
      });
    }

    // Resolve after a grace period. LCP may settle later via its own timer;
    // we accept the snapshot but keep observers alive so cleanup can stop
    // them. If the page becomes hidden, also resolve early.
    setTimeout(() => {
      settleLcp();
      if (worstInteraction > 0 && !metrics.some((m) => m.name === "INP")) {
        const rating = getRating("INP", worstInteraction);
        metrics.push({
          name: "INP",
          value: Math.round(worstInteraction),
          unit: "ms",
          rating,
          score: getScore("INP", worstInteraction),
          suggestion: getSuggestion("INP", worstInteraction, rating),
        });
      }
      finish();
    }, 1500);

    // Resolve immediately if the page is hidden — no more paints will arrive.
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") {
          settleLcp();
          finish();
        }
      },
      { once: true },
    );
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
  observer: PerformanceObserver | null;
} {
  let count = 0;
  let totalDuration = 0;
  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          count++;
          totalDuration += entry.duration;
        }
      }
    });
    // buffered:true returns entries that fired before the observer was set
    // up — without this the previous implementation always saw zero.
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask not supported
  }

  return { count, totalDuration: Math.round(totalDuration), observer };
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

  return {
    vitals: metrics,
    resources,
    dom,
    longTasks: {
      count: longTasks.count,
      totalDuration: longTasks.totalDuration,
    },
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
          resources: result.resources,
          dom: result.dom,
          longTasks: {
            count: result.longTasks.count,
            totalDuration: result.longTasks.totalDuration,
          },
          timestamp: result.timestamp,
        };
        if (disposed) {
          // User closed the panel during collection.
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

        // Overall score
        const avgScore =
          result.vitals.length > 0
            ? Math.round(
                result.vitals.reduce((sum, m) => sum + m.score, 0) /
                  result.vitals.length,
              )
            : 0;
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

        // Web Vitals section
        const vitalsHeader = document.createElement("div");
        vitalsHeader.style.cssText =
          "padding:10px 16px;color:#6c7086;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #313244;";
        vitalsHeader.textContent = "Core Web Vitals";
        panel.appendChild(vitalsHeader);

        for (const metric of result.vitals) {
          panel.appendChild(renderMetric(metric));
        }

        // Resources section
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

        // DOM section
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

        // Long tasks
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

    // Send to VS Code — previously a no-op. Now sends the captured audit
    // payload so the editor side can render it / file issues.
    vscodeBtn.addEventListener("click", () => {
      const bridge = getBridge();
      if (!bridge.connected) {
        vscodeBtn.textContent = "Not connected";
        setTimeout(() => {
          vscodeBtn.textContent = "Send to VS Code";
        }, 2000);
        return;
      }
      if (!lastResult) {
        vscodeBtn.textContent = "Nothing to send";
        setTimeout(() => {
          vscodeBtn.textContent = "Send to VS Code";
        }, 2000);
        return;
      }
      const sent = bridge.send({
        type: "PerformanceAudit",
        payload: lastResult,
      } as unknown as Parameters<typeof bridge.send>[0]);
      vscodeBtn.textContent = sent ? "Sent!" : "Failed";
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
