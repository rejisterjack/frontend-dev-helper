import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";
import { NetworkCapture } from "@/lib/network-capture";

export const networkAnalyzer: ToolDefinition = {
  id: "network-analyzer",
  name: "Network Analyzer",
  description: "Analyze network requests, payloads, and loading performance",
  category: "performance",
  icon: "Wifi",
  configSchema: {
    captureXHR: { type: "boolean", label: "Capture XHR", default: true },
    captureFetch: { type: "boolean", label: "Capture Fetch", default: true },
    captureImages: { type: "boolean", label: "Capture Images", default: true },
    captureScripts: {
      type: "boolean",
      label: "Capture Scripts",
      default: true,
    },
    maxEntries: {
      type: "slider",
      label: "Max Entries",
      default: 100,
      min: 10,
      max: 500,
      step: 10,
    },
    showTiming: { type: "boolean", label: "Show Timing", default: true },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const maxEntries = (cfg.maxEntries as number) ?? 100;
    const showTiming = (cfg.showTiming as boolean) ?? true;
    const captureXHR = (cfg.captureXHR as boolean) ?? true;
    const captureFetch = (cfg.captureFetch as boolean) ?? true;
    const captureImages = (cfg.captureImages as boolean) ?? true;
    const captureScripts = (cfg.captureScripts as boolean) ?? true;

    const overlays: HTMLElement[] = [];
    let disposed = false;

    const TYPE_COLORS: Record<string, string> = {
      document: "#3b82f6",
      script: "#eab308",
      stylesheet: "#a855f7",
      image: "#22c55e",
      font: "#f97316",
      xhr: "#06b6d4",
      fetch: "#06b6d4",
      other: "#6b7280",
    };

    const capture = new NetworkCapture({
      captureXHR,
      captureFetch,
      maxBodySize: 100 * 1024,
    });

    const excludedTypes: string[] = [];
    if (!captureImages) excludedTypes.push("image");
    if (!captureScripts) excludedTypes.push("script");

    function buildFilter(): Parameters<NetworkCapture["getRequests"]>[0] {
      if (excludedTypes.length === 0) return undefined;
      return { excludeResourceTypes: excludedTypes };
    }

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:520px;max-height:500px;z-index:2147483647;pointer-events:auto;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:12px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:14px;";
    title.textContent = "Network Analyzer";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;
    const statsBar = document.createElement("div");
    statsBar.style.cssText =
      "font-size:11px;color:#64748b;margin-left:auto;margin-right:12px;";
    header.append(title, statsBar, closeBtn);

    const listContainer = document.createElement("div");
    listContainer.style.cssText = "flex:1;overflow-y:auto;padding:4px 0;";

    const footer = document.createElement("div");
    footer.style.cssText =
      "padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;display:flex;justify-content:space-between;flex-shrink:0;";
    const footerLeft = document.createElement("span");
    footerLeft.textContent = "Monitoring network requests";
    const footerRight = document.createElement("span");
    footerRight.textContent = "Click × to close";
    footer.append(footerLeft, footerRight);

    panel.append(header, listContainer, footer);

    function renderList() {
      while (listContainer.firstChild)
        listContainer.removeChild(listContainer.firstChild);
      const all = capture.getRequests(buildFilter());
      if (all.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:30px;text-align:center;color:#64748b;";
        empty.textContent = "Waiting for network requests...";
        listContainer.appendChild(empty);
        return;
      }

      const display = all.slice(-maxEntries);
      let totalSize = 0,
        totalDuration = 0;
      let earliestStart = Infinity;
      let latestEnd = 0;
      for (const r of display) {
        totalSize += r.size;
        totalDuration += r.timing.duration;
        const start = (r.timing as { startTime?: number }).startTime ?? 0;
        const end = start + r.timing.duration;
        if (start < earliestStart) earliestStart = start;
        if (end > latestEnd) latestEnd = end;
      }
      const span = Math.max(1, latestEnd - earliestStart);

      statsBar.textContent = `${display.length} requests | ${(totalSize / 1024).toFixed(1)}KB | ${totalDuration.toFixed(0)}ms`;

      for (const req of display) {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid #1e293b;cursor:default;";
        if (req.timing.duration > 1000)
          row.style.background = "rgba(239,68,68,.06)";
        else if (req.size > 512 * 1024)
          row.style.background = "rgba(249,115,22,.06)";

        const dot = document.createElement("div");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${TYPE_COLORS[req.resourceType] || TYPE_COLORS.other};`;

        const name = document.createElement("div");
        name.style.cssText =
          "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        const shortUrl = req.url.split("/").pop() || req.url;
        name.textContent =
          shortUrl.length > 40 ? shortUrl.slice(0, 37) + "..." : shortUrl;
        name.title = req.url;

        const typeTag = document.createElement("span");
        typeTag.style.cssText = `font-size:10px;color:${TYPE_COLORS[req.resourceType] || "#6b7280"};flex-shrink:0;min-width:50px;`;
        typeTag.textContent = req.resourceType;

        const sizeTag = document.createElement("span");
        sizeTag.style.cssText =
          "font-size:10px;color:#94a3b8;min-width:55px;text-align:right;flex-shrink:0;";
        sizeTag.textContent =
          req.size > 1024
            ? (req.size / 1024).toFixed(1) + "KB"
            : req.size + "B";

        const durTag = document.createElement("span");
        const durColor =
          req.timing.duration > 1000
            ? "#ef4444"
            : req.timing.duration > 300
              ? "#f59e0b"
              : "#94a3b8";
        durTag.style.cssText = `font-size:10px;min-width:45px;text-align:right;flex-shrink:0;color:${durColor};`;
        durTag.textContent = showTiming
          ? req.timing.duration.toFixed(0) + "ms"
          : `${req.statusCode}`;

        const statusTag = document.createElement("span");
        statusTag.style.cssText = `font-size:10px;min-width:30px;text-align:right;flex-shrink:0;color:${req.statusCode >= 400 ? "#ef4444" : req.statusCode >= 300 ? "#f59e0b" : "#94a3b8"};`;
        statusTag.textContent = String(req.statusCode);

        // Waterfall column: a 60px-wide track with a proportional bar showing
        // when the request started and how long it ran, normalized to the
        // captured span. Mirrors the Chrome DevTools Network waterfall.
        const start =
          (req.timing as { startTime?: number }).startTime ?? earliestStart;
        const leftPct = Math.max(
          0,
          Math.min(100, ((start - earliestStart) / span) * 100),
        );
        const widthPct = Math.max(
          2,
          Math.min(100, (req.timing.duration / span) * 100),
        );
        const waterfall = document.createElement("div");
        waterfall.style.cssText =
          "position:relative;width:60px;height:8px;background:#1e293b;border-radius:2px;flex-shrink:0;overflow:hidden;";
        const bar = document.createElement("div");
        bar.style.cssText = `position:absolute;left:${leftPct}%;top:0;height:100%;width:${widthPct}%;background:${TYPE_COLORS[req.resourceType] || "#6366f1"};border-radius:2px;`;
        bar.title = `Start: ${(start - earliestStart).toFixed(0)}ms · Duration: ${req.timing.duration.toFixed(0)}ms`;
        waterfall.appendChild(bar);

        row.append(dot, name, typeTag, sizeTag, durTag, statusTag, waterfall);
        listContainer.appendChild(row);
      }
      listContainer.scrollTop = listContainer.scrollHeight;
    }

    capture.start();
    renderList();

    // Refresh list periodically while active. This mirrors network-replay's
    // pattern; NetworkCapture doesn't currently expose a request-callback,
    // so polling on a quiet cadence is the documented contract.
    const refreshTimer = setInterval(() => {
      if (disposed) return;
      renderList();
    }, 500);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearInterval(refreshTimer);
      capture.stop();
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
