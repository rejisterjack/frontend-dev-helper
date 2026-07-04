import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";
import type { ToolDefinition } from "../types";

export const performanceBudget: ToolDefinition = {
  id: "performance-budget",
  name: "Performance Budget",
  description: "Set and monitor performance budgets for page metrics",
  category: "performance",
  icon: "Gauge",
  configSchema: {
    maxDOMNodes: { type: "number", label: "Max DOM Nodes", default: 1500 },
    maxBundleSize: {
      type: "number",
      label: "Max Bundle Size (KB)",
      default: 300,
    },
    maxImages: { type: "number", label: "Max Images", default: 50 },
    maxFCP: { type: "number", label: "Max FCP (ms)", default: 1800 },
    maxLCP: { type: "number", label: "Max LCP (ms)", default: 2500 },
    maxCLS: { type: "number", label: "Max CLS", default: 0.1 },
    maxINP: { type: "number", label: "Max INP (ms)", default: 200 },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const maxDOM = (cfg.maxDOMNodes as number) ?? 1500;
    const maxBundle = (cfg.maxBundleSize as number) ?? 300;
    const maxImages = (cfg.maxImages as number) ?? 50;
    const maxFCP = (cfg.maxFCP as number) ?? 1800;
    const maxLCP = (cfg.maxLCP as number) ?? 2500;
    const maxCLS = (cfg.maxCLS as number) ?? 0.1;
    const maxINP = (cfg.maxINP as number) ?? 200;

    const overlays: HTMLElement[] = [];
    let disposed = false;
    let lastSnapshot: {
      overallScore: number;
      budgets: Array<{
        label: string;
        actual: number;
        budget: number;
        unit: string;
      }>;
    } | null = null;

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:380px;max-height:80vh;overflow-y:auto;z-index:2147483647;pointer-events:auto;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:14px;";
    title.textContent = "Performance Budget";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;

    const vscodeBtn = document.createElement("button");
    vscodeBtn.textContent = "Send to VS Code";
    vscodeBtn.style.cssText =
      "background:#6366f1;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;";
    vscodeBtn.onclick = () => {
      try {
        if (!lastSnapshot) return;
        getBridge().send({
          type: "PerformanceAudit",
          payload: {
            url: location.href,
            timestamp: Date.now(),
            overallScore: lastSnapshot.overallScore,
            metrics: lastSnapshot.budgets.map((b) => ({
              metric: b.label,
              value: b.actual,
              rating:
                b.actual <= b.budget
                  ? ("good" as const)
                  : b.actual <= b.budget * 1.5
                    ? ("needs-improvement" as const)
                    : ("poor" as const),
            })),
            longTasks: [],
            opportunities: lastSnapshot.budgets
              .filter((b) => b.actual > b.budget)
              .map((b) => ({
                id: b.label,
                title: `Reduce ${b.label} below ${b.budget}${b.unit}`,
                savingsMs: Math.round(b.actual - b.budget),
              })),
          },
        } as Parameters<ReturnType<typeof getBridge>["send"]>[0]);
      } catch {
        /* best-effort */
      }
    };
    header.append(title, vscodeBtn, closeBtn);

    const body = document.createElement("div");
    body.style.cssText =
      "padding:16px;display:flex;flex-direction:column;gap:12px;";

    panel.append(header, body);

    function measure() {
      const allEls = document.querySelectorAll("*").length;
      const imgs = document.querySelectorAll("img").length;

      // Bundle size: HTMLScriptElement does NOT expose transferSize; only
      // PerformanceResourceTiming does. Sum over resource entries whose
      // initiatorType is 'script' or whose URL ends in .js/.mjs/.cjs. This is
      // the same source performance-audit.ts uses correctly.
      let totalJS = 0;
      try {
        const resources = performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];
        for (const r of resources) {
          const u = r.name.toLowerCase();
          if (
            r.initiatorType === "script" ||
            r.initiatorType === "link" ||
            u.match(/\.(js|mjs|cjs)(\?|$)/)
          ) {
            // transferSize is 0 for cross-origin no-cors resources (opaque);
            // encodedBodySize is the wire size we can observe without CORS.
            totalJS += r.transferSize || r.encodedBodySize || 0;
          }
        }
      } catch {
        /* ignore */
      }
      const jsKB = totalJS / 1024;

      // FCP / LCP / CLS — measured from real PerformanceObserver entry types.
      // (Previous implementation used DCL/load timings, which are NOT FCP/LCP.)
      const paintEntries = performance.getEntriesByType(
        "paint",
      ) as PerformanceEntry[];
      const fcpEntry = paintEntries.find(
        (e) => e.name === "first-contentful-paint",
      );
      const fcp = fcpEntry ? fcpEntry.startTime : 0;

      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint",
      ) as PerformanceEventTiming[];
      const lastLcp =
        lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : null;
      const lcp = lastLcp
        ? ((lastLcp as unknown as { renderTime?: number; loadTime?: number })
            .renderTime ??
          (lastLcp as unknown as { loadTime?: number }).loadTime ??
          0)
        : 0;

      // CLS via session window (the correct algorithm). Layout-shift entries
      // accumulate; we apply the 5s-window / 1s-gap rule from the spec.
      let cls = 0;
      try {
        const shifts = (
          performance.getEntriesByType("layout-shift") as unknown as Array<{
            value: number;
            hadRecentInput: boolean;
            startTime: number;
          }>
        ).filter((s) => !s.hadRecentInput);
        let sessionValue = 0;
        let sessionStart = -Infinity;
        for (const s of shifts) {
          if (
            s.startTime - sessionStart > 5000 ||
            (s.startTime - sessionStart > 1000 && sessionValue > 0)
          ) {
            // New session window.
            if (sessionValue > cls) cls = sessionValue;
            sessionValue = 0;
            sessionStart = s.startTime;
          }
          sessionValue += s.value;
          sessionStart = Math.max(sessionStart, s.startTime);
        }
        if (sessionValue > cls) cls = sessionValue;
      } catch {
        /* ignore */
      }

      // INP — worst interaction duration from "event" entries, bucketed by
      // 100ms start-time proximity (the same proxy the web-vitals library
      // used before native INP support landed).
      let inp = 0;
      try {
        const events = (
          performance.getEntriesByType("event") as unknown as Array<{
            startTime: number;
            duration: number;
          }>
        ).filter((e) => e.duration >= 16);
        const buckets = new Map<number, number>();
        for (const e of events) {
          const bucket = Math.floor(e.startTime / 100);
          buckets.set(bucket, Math.max(buckets.get(bucket) ?? 0, e.duration));
        }
        for (const v of buckets.values()) if (v > inp) inp = v;
      } catch {
        /* ignore */
      }

      type Budget = {
        label: string;
        actual: number;
        budget: number;
        unit: string;
      };
      const budgets: Budget[] = [
        { label: "DOM Nodes", actual: allEls, budget: maxDOM, unit: "nodes" },
        { label: "Bundle Size", actual: jsKB, budget: maxBundle, unit: "KB" },
        { label: "Images", actual: imgs, budget: maxImages, unit: "images" },
        { label: "FCP", actual: fcp, budget: maxFCP, unit: "ms" },
        { label: "LCP", actual: lcp, budget: maxLCP, unit: "ms" },
        { label: "CLS", actual: cls, budget: maxCLS, unit: "" },
        { label: "INP", actual: inp, budget: maxINP, unit: "ms" },
      ];

      let passed = 0;
      while (body.firstChild) body.removeChild(body.firstChild);

      for (const b of budgets) {
        const ok = b.actual <= b.budget;
        if (ok) passed++;

        const row = document.createElement("div");
        row.style.cssText = "display:flex;flex-direction:column;gap:4px;";

        const labelRow = document.createElement("div");
        labelRow.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;";

        const label = document.createElement("span");
        label.style.cssText = "font-size:12px;font-weight:500;";
        label.textContent = b.label;

        const status = document.createElement("span");
        status.style.cssText = `font-size:11px;font-weight:600;color:${ok ? "#22c55e" : "#ef4444"};`;
        status.textContent = `${Math.round(b.actual)} / ${b.budget} ${b.unit} ${ok ? "✓" : "✗"}`;

        labelRow.append(label, status);

        const barBg = document.createElement("div");
        barBg.style.cssText =
          "height:6px;background:#1e293b;border-radius:3px;overflow:hidden;";

        const bar = document.createElement("div");
        const pct = Math.min((b.actual / b.budget) * 100, 100);
        bar.style.cssText = `height:100%;width:${pct}%;background:${ok ? "#22c55e" : "#ef4444"};border-radius:3px;transition:width .3s ease;`;
        barBg.appendChild(bar);

        row.append(labelRow, barBg);
        body.appendChild(row);
      }

      const scoreDiv = document.createElement("div");
      const score = Math.round((passed / budgets.length) * 100);
      scoreDiv.style.cssText = `text-align:center;padding:12px 0;font-size:24px;font-weight:700;color:${score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"};`;
      scoreDiv.textContent = `${score}% passed (${passed}/${budgets.length})`;
      body.appendChild(scoreDiv);

      lastSnapshot = {
        overallScore: score,
        budgets,
      };
    }

    measure();
    const timer = setInterval(() => {
      if (!disposed) measure();
    }, 3000);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
