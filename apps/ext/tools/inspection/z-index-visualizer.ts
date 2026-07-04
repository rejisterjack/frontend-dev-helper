import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

interface ZIndexElement {
  element: HTMLElement;
  zIndex: number;
  stackingContext: boolean;
  rect: DOMRect;
}

function getColorForZIndex(z: number, colorMode: string): string {
  if (colorMode === "fixed") return "#6366f1";
  if (colorMode === "random") {
    const hue = (z * 47) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }
  // gradient mode
  if (z <= 10) return "#22c55e";
  if (z <= 100) return "#eab308";
  if (z <= 1000) return "#f97316";
  return "#ef4444";
}

function createsStackingContext(el: HTMLElement): boolean {
  const cs = window.getComputedStyle(el);
  const position = cs.position;
  const z = cs.zIndex;

  // Root element always creates a stacking context.
  if (el === document.documentElement) return true;

  // position: fixed or sticky always creates a stacking context.
  if (position === "fixed" || position === "sticky") return true;

  // position: absolute/relative with z-index !== auto.
  if ((position === "absolute" || position === "relative") && z !== "auto") {
    return true;
  }

  // opacity < 1
  const opacity = parseFloat(cs.opacity);
  if (!isNaN(opacity) && opacity < 1) return true;

  // transform, filter, perspective, clip-path, mask !== none
  if (cs.transform && cs.transform !== "none") return true;
  if (cs.filter && cs.filter !== "none") return true;
  if (cs.perspective && cs.perspective !== "none") return true;
  if (cs.clipPath && cs.clipPath !== "none") return true;
  const mask = (cs as unknown as { mask?: string }).mask;
  if (mask && mask !== "none" && mask !== "") return true;

  // will-change with any of the stacking-context-triggering properties
  if (cs.willChange && cs.willChange !== "auto") {
    const wc = cs.willChange.toLowerCase();
    if (
      wc.includes("transform") ||
      wc.includes("opacity") ||
      wc.includes("filter") ||
      wc.includes("perspective") ||
      wc.includes("clip-path") ||
      wc.includes("mask") ||
      wc.includes("isolate")
    ) {
      return true;
    }
  }

  // isolation: isolate
  if (cs.isolation === "isolate") return true;

  // mix-blend-mode !== normal
  if (cs.mixBlendMode && cs.mixBlendMode !== "normal") return true;

  // contain with layout, paint, strict, or content
  const contain = cs.contain;
  if (contain) {
    const parts = contain.split(/\s+/);
    if (
      parts.includes("layout") ||
      parts.includes("paint") ||
      parts.includes("strict") ||
      parts.includes("content")
    ) {
      return true;
    }
  }

  // Flex/grid children with z-index !== auto (per CSS spec, the parent must be
  // a flex/grid container for the child's z-index to create a context).
  const parent = el.parentElement;
  if (parent && z !== "auto") {
    const parentStyle = window.getComputedStyle(parent);
    if (
      parentStyle.display === "flex" ||
      parentStyle.display === "inline-flex" ||
      parentStyle.display === "grid" ||
      parentStyle.display === "inline-grid"
    ) {
      return true;
    }
  }

  // Modern additions: container-type (size/inline-size), backdrop-filter,
  // content-visibility, and the :fullscreen / :modal pseudos.
  const containerType = (cs as unknown as { containerType?: string })
    .containerType;
  if (containerType && containerType !== "normal") return true;

  const backdropFilter = (cs as unknown as { backdropFilter?: string })
    .backdropFilter;
  if (backdropFilter && backdropFilter !== "none") return true;
  const webkitBackdropFilter = (
    cs as unknown as { webkitBackdropFilter?: string }
  ).webkitBackdropFilter;
  if (webkitBackdropFilter && webkitBackdropFilter !== "none") return true;

  const contentVisibility = (cs as unknown as { contentVisibility?: string })
    .contentVisibility;
  if (contentVisibility && contentVisibility !== "visible") return true;

  // :fullscreen and :modal elements are promoted to a top-layer stacking
  // context in modern browsers.
  if (
    typeof (el as unknown as { matches?: (s: string) => boolean }).matches ===
      "function" &&
    (el.matches(":fullscreen") || el.matches(":modal"))
  ) {
    return true;
  }

  return false;
}

function findZIndexedElements(minZIndex: number): ZIndexElement[] {
  const results: ZIndexElement[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
  );
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    const cs = window.getComputedStyle(el);
    const z = cs.zIndex;
    const createsContext = createsStackingContext(el);
    if (createsContext) {
      el.setAttribute("data-fdh-stacking-context", "true");
    }
    if (z === "auto") continue;
    const zNum = parseInt(z, 10);
    if (isNaN(zNum) || zNum < minZIndex) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    results.push({
      element: el,
      zIndex: zNum,
      stackingContext: createsContext,
      rect,
    });
  }
  return results.sort((a, b) => a.zIndex - b.zIndex);
}

function clearStackingContextMarks(): void {
  const marked = document.querySelectorAll("[data-fdh-stacking-context]");
  marked.forEach((el) => el.removeAttribute("data-fdh-stacking-context"));
}

export const zIndexVisualizer: ToolDefinition = {
  id: "z-index-visualizer",
  name: "Z-Index Visualizer",
  description: "Visualize stacking contexts and z-index values on the page",
  category: "inspection",
  icon: "Layers",
  configSchema: {
    showValues: { type: "boolean", label: "Show Values", default: true },
    colorMode: {
      type: "select",
      label: "Color Mode",
      default: "gradient",
      options: [
        { label: "Gradient", value: "gradient" },
        { label: "Random", value: "random" },
        { label: "Fixed", value: "fixed" },
      ],
    },
    minZIndex: { type: "number", label: "Min Z-Index", default: 0 },
    highlightStackingContexts: {
      type: "boolean",
      label: "Highlight Stacking Contexts",
      default: true,
    },
  },
  run: (ctx, config) => {
    const showValues = (config?.showValues as boolean) ?? true;
    const colorMode = (config?.colorMode as string) ?? "gradient";
    const minZIndex = (config?.minZIndex as number) ?? 0;
    const highlightStackingContexts =
      (config?.highlightStackingContexts as boolean) ?? true;
    const overlayEls: HTMLDivElement[] = [];

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:380px;max-height:75vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .panel{background:#1e1e2e;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid #313244;overflow:hidden;display:flex;flex-direction:column;max-height:75vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#cdd6f4;}
      .header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825;}
      .title{font-weight:600;font-size:14px;}
      .actions{display:flex;gap:4px;}
      .actions button{background:transparent;border:none;color:#6c7086;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .actions button:hover{background:#313244;color:#cdd6f4;}
      .summary{display:flex;gap:12px;padding:8px 16px;border-bottom:1px solid #313244;background:#181825;font-size:12px;color:#6c7086;}
      .content{flex:1;overflow-y:auto;padding:12px;}
      .z-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#313244;border-radius:6px;margin-bottom:6px;cursor:pointer;transition:background 0.15s;}
      .z-item:hover{background:#45475a;}
      .z-badge{min-width:48px;text-align:center;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:700;font-family:monospace;color:white;}
      .z-info{flex:1;min-width:0;}
      .z-tag{font-family:monospace;font-size:12px;color:#cdd6f4;}
      .z-selector{font-size:11px;color:#585b70;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .z-context{font-size:10px;color:#89b4fa;margin-top:2px;}
      .legend{display:flex;gap:12px;padding:8px 16px;border-top:1px solid #313244;background:#181825;font-size:11px;color:#6c7086;flex-wrap:wrap;}
      .legend-item{display:flex;align-items:center;gap:4px;}
      .legend-dot{width:10px;height:10px;border-radius:2px;}
      .empty{text-align:center;padding:40px 20px;color:#6c7086;}
      .content::-webkit-scrollbar{width:6px;}
      .content::-webkit-scrollbar-thumb{background:#313244;border-radius:3px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.textContent = "Z-Index Visualizer";
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.textContent = "🔄";
    const btnToggle = document.createElement("button");
    btnToggle.textContent = "👁";
    const btnClose = document.createElement("button");
    btnClose.textContent = "✕";
    actionsDiv.append(btnRefresh, btnToggle, btnClose);
    header.append(titleDiv, actionsDiv);

    const summaryEl = document.createElement("div");
    summaryEl.className = "summary";

    const content = document.createElement("div");
    content.className = "content";

    const legend = document.createElement("div");
    legend.className = "legend";
    if (colorMode === "gradient") {
      for (const [label, color] of [
        ["Low (0-10)", "#22c55e"],
        ["Mid (11-100)", "#eab308"],
        ["High (101-1000)", "#f97316"],
        ["Extreme (1001+)", "#ef4444"],
      ] as [string, string][]) {
        const item = document.createElement("span");
        item.className = "legend-item";
        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.background = color;
        const txt = document.createElement("span");
        txt.textContent = label;
        item.append(dot, txt);
        legend.appendChild(item);
      }
    }

    panel.append(header, summaryEl, content, legend);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    let visible = true;

    function generateSimpleSelector(el: HTMLElement): string {
      if (el.id) return "#" + el.id;
      const tag = el.tagName.toLowerCase();
      const classes = Array.from(el.classList)
        .filter((c) => !c.startsWith("fdh-"))
        .slice(0, 2);
      if (classes.length) return tag + "." + classes.join(".");
      return tag;
    }

    function updateOverlays(items: ZIndexElement[]): void {
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      if (!visible) return;

      for (const item of items) {
        const color = getColorForZIndex(item.zIndex, colorMode);
        const overlay = document.createElement("div");
        overlay.style.cssText = `position:fixed;top:${item.rect.top}px;left:${item.rect.left}px;width:${item.rect.width}px;height:${item.rect.height}px;border:2px solid ${color};background:${color}15;pointer-events:none;z-index:2147483641;box-sizing:border-box;`;

        if (showValues) {
          const label = document.createElement("div");
          label.style.cssText = `position:absolute;top:-20px;left:0;background:${color};color:white;padding:2px 6px;font-size:10px;font-family:monospace;border-radius:3px 3px 0 0;white-space:nowrap;font-weight:700;`;
          label.textContent = "z:" + item.zIndex;
          overlay.appendChild(label);
        }

        if (highlightStackingContexts && item.stackingContext) {
          const indicator = document.createElement("div");
          indicator.style.cssText = `position:absolute;bottom:4px;right:4px;width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;`;
          overlay.appendChild(indicator);
        }

        addOverlayElement(overlay);
        overlayEls.push(overlay);
      }
    }

    function render(items: ZIndexElement[]): void {
      while (content.firstChild) content.removeChild(content.firstChild);
      while (summaryEl.firstChild) summaryEl.removeChild(summaryEl.firstChild);

      const total = items.length;
      const stackingCount = items.filter((i) => i.stackingContext).length;
      const maxZ = items.length > 0 ? items[items.length - 1].zIndex : 0;

      const countSpan = document.createElement("span");
      countSpan.textContent = total + " elements with z-index";
      summaryEl.appendChild(countSpan);
      if (highlightStackingContexts) {
        const scSpan = document.createElement("span");
        scSpan.textContent = stackingCount + " stacking contexts";
        summaryEl.appendChild(scSpan);
      }
      const maxSpan = document.createElement("span");
      maxSpan.textContent = "Max: " + maxZ;
      summaryEl.appendChild(maxSpan);

      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No elements with z-index found";
        content.appendChild(empty);
        return;
      }

      for (const item of items) {
        const row = document.createElement("div");
        row.className = "z-item";

        const badge = document.createElement("span");
        badge.className = "z-badge";
        const color = getColorForZIndex(item.zIndex, colorMode);
        badge.style.background = color;
        badge.textContent = item.zIndex.toString();
        row.appendChild(badge);

        const info = document.createElement("div");
        info.className = "z-info";
        const tag = document.createElement("div");
        tag.className = "z-tag";
        tag.textContent = "<" + item.element.tagName.toLowerCase() + ">";
        info.appendChild(tag);
        const sel = document.createElement("div");
        sel.className = "z-selector";
        sel.textContent = generateSimpleSelector(item.element);
        info.appendChild(sel);

        if (highlightStackingContexts && item.stackingContext) {
          const ctx = document.createElement("div");
          ctx.className = "z-context";
          ctx.textContent = "Creates stacking context";
          info.appendChild(ctx);
        }

        row.appendChild(info);

        row.addEventListener("click", () => {
          item.element.scrollIntoView({ behavior: "smooth", block: "center" });
          const flash = document.createElement("div");
          const r = item.element.getBoundingClientRect();
          flash.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;border:3px solid ${color};background:${color}30;pointer-events:none;z-index:2147483642;border-radius:3px;transition:opacity 0.5s;`;
          addOverlayElement(flash);
          setTimeout(() => {
            flash.style.opacity = "0";
          }, 1000);
          setTimeout(() => removeOverlayElement(flash), 1500);
        });

        content.appendChild(row);
      }
    }

    function scan(): void {
      const items = findZIndexedElements(minZIndex);
      updateOverlays(items);
      render(items);
    }

    btnRefresh.addEventListener("click", scan);
    btnToggle.addEventListener("click", () => {
      visible = !visible;
      btnToggle.style.opacity = visible ? "1" : "0.4";
      if (visible) scan();
      else {
        for (const el of overlayEls) removeOverlayElement(el);
        overlayEls.length = 0;
      }
    });
    btnClose.addEventListener("click", cleanup);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    const handleResize = () => {
      scan();
    };
    window.addEventListener("resize", handleResize);

    scan();

    function cleanup(): void {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      clearStackingContextMarks();
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
