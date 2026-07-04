import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DiscoveredMedia {
  conditionText: string;
  minWidth: number | null;
  maxWidth: number | null;
}

const BREAKPOINT_COLORS: Record<string, string> = {
  xs: "#ef4444",
  sm: "#f97316",
  md: "#eab308",
  lg: "#22c55e",
  xl: "#3b82f6",
  "2xl": "#8b5cf6",
  xxl: "#a855f7",
};

// Named breakpoint ranges (Tailwind v4 default). Returns the largest named
// breakpoint whose min-width is <= current viewport width, so users see at a
// glance which responsive tier they're in.
const NAMED_BREAKPOINTS: Array<{ name: string; min: number }> = [
  { name: "xs", min: 0 },
  { name: "sm", min: 640 },
  { name: "md", min: 768 },
  { name: "lg", min: 1024 },
  { name: "xl", min: 1280 },
  { name: "2xl", min: 1536 },
];

function activeNamedBreakpoint(width: number): string {
  let active = "xs";
  for (const bp of NAMED_BREAKPOINTS) {
    if (width >= bp.min) active = bp.name;
  }
  return active;
}

function discoverMediaQueries(): DiscoveredMedia[] {
  const found: DiscoveredMedia[] = [];
  const seen = new Set<string>();

  function walk(rules: CSSRuleList): void {
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSMediaRule ||
        rule instanceof CSSSupportsRule ||
        rule instanceof CSSLayerBlockRule
      ) {
        try {
          if (rule instanceof CSSMediaRule) {
            const cond = rule.conditionText || rule.media.mediaText || "";
            const trimmed = cond.trim();
            if (trimmed && !seen.has(trimmed)) {
              seen.add(trimmed);
              const minMatch = trimmed.match(
                /\(\s*min-width\s*:\s*([0-9.]+)\s*px\s*\)/i,
              );
              const maxMatch = trimmed.match(
                /\(\s*max-width\s*:\s*([0-9.]+)\s*px\s*\)/i,
              );
              found.push({
                conditionText: trimmed,
                minWidth: minMatch ? parseFloat(minMatch[1]) : null,
                maxWidth: maxMatch ? parseFloat(maxMatch[1]) : null,
              });
            }
          }
          walk(rule.cssRules);
        } catch {
          // nested cross-origin
        }
        continue;
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules ?? sheet.rules);
    } catch {
      // cross-origin stylesheet
    }
  }
  return found;
}

function describeActiveMedia(mqs: DiscoveredMedia[], width: number): string[] {
  const active: string[] = [];
  for (const mq of mqs) {
    if (!mq.conditionText) continue;
    let matches = false;
    try {
      matches = window.matchMedia(mq.conditionText).matches;
    } catch {
      matches = false;
    }
    if (matches) active.push(mq.conditionText);
  }
  if (active.length === 0 && mqs.length === 0) {
    return width < 640 ? ["< 640px (mobile)"] : [">= 640px"];
  }
  return active;
}

export const breakpointOverlay: ToolDefinition = {
  id: "breakpoint-overlay",
  name: "Breakpoint Overlay",
  description: "Show active CSS breakpoints and media query boundaries",
  category: "css",
  icon: "Monitor",
  configSchema: {
    showIndicator: { type: "boolean", label: "Show Indicator", default: true },
    showAllBreakpoints: {
      type: "boolean",
      label: "Show All Breakpoints",
      default: false,
    },
    highlightActive: {
      type: "boolean",
      label: "Highlight Active",
      default: true,
    },
    position: {
      type: "select",
      label: "Position",
      default: "top-right",
      options: [
        { label: "Top Right", value: "top-right" },
        { label: "Top Left", value: "top-left" },
        { label: "Bottom Right", value: "bottom-right" },
        { label: "Bottom Left", value: "bottom-left" },
      ],
    },
  },
  run: (ctx, config) => {
    const showIndicator = config?.showIndicator !== false;
    const showAllBreakpoints = config?.showAllBreakpoints === true;
    const highlightActive = config?.highlightActive !== false;
    const position = (config?.position as Position) ?? "bottom-right";

    const overlay = document.createElement("div");
    overlay.setAttribute("data-fdh-overlay", "breakpoint");
    overlay.style.cssText = `
      position:fixed;z-index:2147483647;
      font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;
      user-select:none;pointer-events:auto;
    `;

    const positions: Record<Position, Record<string, string>> = {
      "top-left": { top: "16px", left: "16px" },
      "top-right": { top: "16px", right: "16px" },
      "bottom-left": { bottom: "16px", left: "16px" },
      "bottom-right": { bottom: "16px", right: "16px" },
    };
    Object.assign(overlay.style, positions[position]);

    addOverlayElement(overlay);

    const discovered = discoverMediaQueries();

    function buildOverlay() {
      if (!showIndicator) {
        overlay.textContent = "";
        return;
      }
      overlay.textContent = "";

      const width = window.innerWidth;
      const height = window.innerHeight;
      const activeMedia = describeActiveMedia(discovered, width);
      const bpName = activeNamedBreakpoint(width);
      const bpColor = BREAKPOINT_COLORS[bpName] ?? "#94a3b8";

      const card = document.createElement("div");
      card.style.cssText = `
        background:#1e293b;border:1px solid #334155;border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);overflow:hidden;min-width:180px;max-width:320px;
      `;

      const main = document.createElement("div");
      main.style.cssText =
        "padding:12px 16px;text-align:center;border-bottom:1px solid #334155";

      const sizeDiv = document.createElement("div");
      sizeDiv.style.cssText =
        "color:#f8fafc;font-weight:600;font-size:14px;margin-bottom:4px";
      sizeDiv.textContent = `${width}px x ${height}px`;
      main.appendChild(sizeDiv);

      const bpBadge = document.createElement("div");
      bpBadge.style.cssText = `color:${bpColor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;padding:2px 8px;background:${bpColor}22;border-radius:10px;margin-bottom:4px`;
      bpBadge.textContent = bpName;
      main.appendChild(bpBadge);

      const badge = document.createElement("div");
      const accentColor = highlightActive ? "#22c55e" : "#94a3b8";
      badge.style.cssText = `color:${accentColor};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;display:inline-block;padding:2px 8px;background:${accentColor}22;border-radius:10px;margin-top:2px`;
      badge.textContent = `${activeMedia.length} active @media`;
      main.appendChild(badge);
      card.appendChild(main);

      const activeSection = document.createElement("div");
      activeSection.style.cssText =
        "padding:8px 12px;border-bottom:1px solid #334155";

      const activeLabel = document.createElement("div");
      activeLabel.style.cssText =
        "color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px";
      activeLabel.textContent = "Active now";
      activeSection.appendChild(activeLabel);

      if (activeMedia.length === 0) {
        const none = document.createElement("div");
        none.style.cssText = "color:#94a3b8;font-size:11px";
        none.textContent = "No media queries match";
        activeSection.appendChild(none);
      } else {
        for (const cond of activeMedia.slice(0, 5)) {
          const row = document.createElement("div");
          row.style.cssText =
            "color:#22c55e;font-size:10px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
          row.textContent = "@media " + cond;
          activeSection.appendChild(row);
        }
        if (activeMedia.length > 5) {
          const more = document.createElement("div");
          more.style.cssText = "color:#64748b;font-size:10px;margin-top:2px";
          more.textContent = `+${activeMedia.length - 5} more`;
          activeSection.appendChild(more);
        }
      }
      card.appendChild(activeSection);

      if (showAllBreakpoints && discovered.length > 0) {
        const allSection = document.createElement("div");
        allSection.style.cssText =
          "padding:8px 12px;border-bottom:1px solid #334155;max-height:160px;overflow-y:auto";

        const allLabel = document.createElement("div");
        allLabel.style.cssText =
          "color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px";
        allLabel.textContent = `All discovered (${discovered.length})`;
        allSection.appendChild(allLabel);

        const sortedByWidth = [...discovered].sort((a, b) => {
          const aw = a.minWidth ?? (a.maxWidth !== null ? a.maxWidth : 0);
          const bw = b.minWidth ?? (b.maxWidth !== null ? b.maxWidth : 0);
          return aw - bw;
        });

        for (const mq of sortedByWidth) {
          const row = document.createElement("div");
          const isActive = activeMedia.includes(mq.conditionText);
          const color = isActive ? "#22c55e" : "#64748b";
          row.style.cssText = `color:${color};font-size:10px;font-family:monospace;padding:2px 0;border-left:2px solid ${isActive ? "#22c55e" : "transparent"};padding-left:6px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
          row.textContent = mq.conditionText;
          allSection.appendChild(row);
        }
        card.appendChild(allSection);
      }

      overlay.appendChild(card);
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildOverlay, 100);
    }

    window.addEventListener("resize", onResize);
    buildOverlay();

    function cleanup() {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      removeOverlayElement(overlay);
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
