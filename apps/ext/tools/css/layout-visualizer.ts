import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

interface ChildLayout {
  element: HTMLElement;
  rect: DOMRect;
  flexBasis?: string;
  flexGrow?: string;
  flexShrink?: string;
  alignSelf?: string;
  justifySelf?: string;
  computedSize?: number;
  idealSize?: number;
  gridRow?: string;
  gridColumn?: string;
}

interface LayoutInfo {
  element: HTMLElement;
  type: "flex" | "grid";
  rect: DOMRect;
  styles: Record<string, string>;
  children: ChildLayout[];
  freeSpace?: number;
  containerSize?: number;
}

const FLEX_COLORS = [
  "#89b4fa",
  "#74c7ec",
  "#94e2d5",
  "#a6e3a1",
  "#f9e2af",
  "#fab387",
  "#f38ba8",
  "#cba6f7",
];
const GRID_COLORS = [
  "#cba6f7",
  "#b4befe",
  "#89dceb",
  "#74c7ec",
  "#94e2d5",
  "#a6e3a1",
  "#f9e2af",
  "#fab387",
];

function getComputedLayout(el: HTMLElement): LayoutInfo | null {
  const computed = getComputedStyle(el);
  const display = computed.display;

  if (display === "flex" || display === "inline-flex") {
    const rect = el.getBoundingClientRect();
    const isRow =
      computed.flexDirection === "row" ||
      computed.flexDirection === "row-reverse";
    const containerSize = isRow ? rect.width : rect.height;
    const gap = parseFloat(computed.gap) || 0;
    const children: ChildLayout[] = [];
    let totalChildSize = 0;

    for (const child of el.children) {
      const ce = child as HTMLElement;
      const cr = ce.getBoundingClientRect();
      if (cr.width > 0 && cr.height > 0) {
        const childComputed = getComputedStyle(ce);
        const grow = childComputed.flexGrow || "0";
        const shrink = childComputed.flexShrink || "1";
        const basis = childComputed.flexBasis || "auto";
        const alignSelf = childComputed.alignSelf;
        const computedSize = isRow ? cr.width : cr.height;
        totalChildSize += computedSize;

        let idealSize: number | undefined;
        if (basis !== "auto" && basis !== "0") {
          const basisVal = parseFloat(basis);
          if (!isNaN(basisVal)) idealSize = basisVal;
        }

        children.push({
          element: ce,
          rect: cr,
          flexGrow: grow,
          flexShrink: shrink,
          flexBasis: basis,
          alignSelf: alignSelf,
          computedSize,
          idealSize,
        });
      }
    }

    const totalGaps = children.length > 1 ? gap * (children.length - 1) : 0;
    const freeSpace = containerSize - totalChildSize - totalGaps;

    return {
      element: el,
      type: "flex",
      rect,
      styles: {
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: computed.gap,
        flexWrap: computed.flexWrap,
        alignContent: computed.alignContent,
      },
      children,
      freeSpace,
      containerSize,
    };
  }

  if (display === "grid" || display === "inline-grid") {
    const rect = el.getBoundingClientRect();
    const children: ChildLayout[] = [];
    for (const child of el.children) {
      const ce = child as HTMLElement;
      const cr = ce.getBoundingClientRect();
      if (cr.width > 0 && cr.height > 0) {
        const childComputed = getComputedStyle(ce);
        children.push({
          element: ce,
          rect: cr,
          gridRow: childComputed.gridRow,
          gridColumn: childComputed.gridColumn,
          alignSelf: childComputed.alignSelf,
          justifySelf: childComputed.justifySelf,
        });
      }
    }
    return {
      element: el,
      type: "grid",
      rect,
      styles: {
        display: computed.display,
        gridTemplateColumns: computed.gridTemplateColumns,
        gridTemplateRows: computed.gridTemplateRows,
        gap: computed.gap,
        gridAutoFlow: computed.gridAutoFlow,
        justifyItems: computed.justifyItems,
        alignItems: computed.alignItems,
      },
      children,
    };
  }

  return null;
}

function createLayoutPanel(info: LayoutInfo): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.cssText = `
    position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
    background:#1e1e2e;border:1px solid #45475a;border-radius:12px;
    padding:14px;font-family:-apple-system,system-ui,sans-serif;
    font-size:12px;color:#cdd6f4;z-index:2147483647;
    box-shadow:0 16px 40px rgba(0,0,0,0.5);min-width:380px;max-width:560px;
    max-height:50vh;overflow-y:auto;pointer-events:auto;
  `;

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #313244;";
  const badge = document.createElement("span");
  badge.style.cssText =
    "padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;";
  if (info.type === "flex") {
    badge.style.background = "#89b4fa33";
    badge.style.color = "#89b4fa";
    badge.textContent = "Flexbox";
  } else {
    badge.style.background = "#cba6f733";
    badge.style.color = "#cba6f7";
    badge.textContent = "Grid";
  }
  const tag = document.createElement("span");
  tag.style.cssText = "font-family:monospace;color:#a6adc8;font-size:11px;";
  tag.textContent =
    info.element.tagName.toLowerCase() +
    (info.element.id ? "#" + info.element.id : "");
  header.append(badge, tag);
  panel.appendChild(header);

  const props = document.createElement("div");
  props.style.cssText =
    "display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-family:monospace;font-size:11px;";
  for (const [prop, val] of Object.entries(info.styles)) {
    if (!val || val === "normal" || val === "stretch") continue;
    const k = document.createElement("span");
    k.style.color = "#6c7086";
    k.textContent = prop.replace(/([A-Z])/g, "-$1").toLowerCase() + ":";
    const v = document.createElement("span");
    v.style.color = "#a6e3a1";
    v.textContent = val;
    props.append(k, v);
  }
  panel.appendChild(props);

  if (info.type === "flex" && info.freeSpace !== undefined) {
    const spaceInfo = document.createElement("div");
    spaceInfo.style.cssText =
      "margin-top:8px;padding:6px 8px;border-radius:4px;font-size:11px;font-family:monospace;";
    if (info.freeSpace > 0) {
      spaceInfo.style.background = "#a6e3a115";
      spaceInfo.style.color = "#a6e3a1";
      spaceInfo.textContent = `Free space: ${info.freeSpace.toFixed(1)}px`;
    } else if (info.freeSpace < 0) {
      spaceInfo.style.background = "#f38ba815";
      spaceInfo.style.color = "#f38ba8";
      spaceInfo.textContent = `Overflow: ${Math.abs(info.freeSpace).toFixed(1)}px`;
    } else {
      spaceInfo.style.background = "#6c708615";
      spaceInfo.style.color = "#6c7086";
      spaceInfo.textContent = "No free space";
    }
    panel.appendChild(spaceInfo);
  }

  const childInfo = document.createElement("div");
  childInfo.style.cssText =
    "margin-top:8px;padding-top:8px;border-top:1px solid #313244;";
  const childLabel = document.createElement("div");
  childLabel.style.cssText = "color:#6c7086;font-size:11px;margin-bottom:6px;";
  childLabel.textContent = `${info.children.length} child${info.children.length !== 1 ? "ren" : ""}`;
  childInfo.appendChild(childLabel);

  info.children.forEach((child, i) => {
    const row = document.createElement("div");
    row.style.cssText =
      "display:grid;grid-template-columns:20px 1fr auto;gap:4px 6px;align-items:center;font-size:10px;padding:3px 0;";

    const idx = document.createElement("span");
    idx.style.cssText = "color:#6c7086;font-family:monospace;text-align:right;";
    idx.textContent = String(i + 1);
    row.appendChild(idx);

    const details = document.createElement("span");
    details.style.cssText =
      "color:#a6adc8;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

    if (info.type === "flex") {
      const parts: string[] = [];
      if (child.flexGrow && child.flexGrow !== "0")
        parts.push(`grow:${child.flexGrow}`);
      if (child.flexShrink && child.flexShrink !== "1")
        parts.push(`shrink:${child.flexShrink}`);
      if (child.flexBasis && child.flexBasis !== "auto")
        parts.push(`basis:${child.flexBasis}`);
      if (child.alignSelf && child.alignSelf !== "auto")
        parts.push(`self:${child.alignSelf}`);
      if (child.computedSize) parts.push(`${child.computedSize.toFixed(0)}px`);
      details.textContent =
        parts.length > 0
          ? parts.join(" · ")
          : child.element.tagName.toLowerCase();
    } else {
      const parts: string[] = [child.element.tagName.toLowerCase()];
      if (child.gridColumn) parts.push(`col:${child.gridColumn}`);
      if (child.gridRow) parts.push(`row:${child.gridRow}`);
      details.textContent = parts.join(" · ");
    }
    row.appendChild(details);

    const size = document.createElement("span");
    size.style.cssText = "color:#585b70;font-family:monospace;";
    size.textContent = `${child.rect.width.toFixed(0)}×${child.rect.height.toFixed(0)}`;
    row.appendChild(size);

    childInfo.appendChild(row);
  });

  panel.appendChild(childInfo);

  return panel;
}

export const layoutVisualizer: ToolDefinition = {
  id: "layout-visualizer",
  name: "Layout Visualizer",
  description: "Visualize Flexbox, Grid, and block layout properties",
  category: "css",
  icon: "LayoutGrid",
  configSchema: {
    showFlex: { type: "boolean", label: "Show Flex Layouts", default: true },
    showGrid: { type: "boolean", label: "Show Grid Layouts", default: true },
    showBlock: { type: "boolean", label: "Show Block Layouts", default: false },
    showAlignment: { type: "boolean", label: "Show Alignment", default: true },
    showGaps: { type: "boolean", label: "Show Gaps", default: true },
    showChildDetails: {
      type: "boolean",
      label: "Show Child Flex/Grid Props",
      default: true,
    },
    showFreeSpace: {
      type: "boolean",
      label: "Show Free Space / Overflow",
      default: true,
    },
  },
  run(ctx, config = {}) {
    const overlays: HTMLDivElement[] = [];
    let panelHost: HTMLDivElement | null = null;
    let currentHovered: HTMLElement | null = null;

    const showFlex = config.showFlex !== false;
    const showGrid = config.showGrid !== false;

    function handleMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        !target ||
        target === document.body ||
        target === document.documentElement
      )
        return;
      if (currentHovered === target) return;
      currentHovered = target;

      clearOverlays();

      const layout = getComputedLayout(target);
      if (!layout) return;
      if (layout.type === "flex" && !showFlex) return;
      if (layout.type === "grid" && !showGrid) return;

      const colors = layout.type === "flex" ? FLEX_COLORS : GRID_COLORS;
      const parentColor = layout.type === "flex" ? "#89b4fa" : "#cba6f7";

      const parentBox = document.createElement("div");
      parentBox.style.cssText = `
        position:fixed;top:${layout.rect.top}px;left:${layout.rect.left}px;
        width:${layout.rect.width}px;height:${layout.rect.height}px;
        border:2px solid ${parentColor};background:${parentColor}15;
        pointer-events:none;z-index:2147483640;
      `;
      addOverlayElement(parentBox);
      overlays.push(parentBox);

      layout.children.forEach((child, i) => {
        const color = colors[i % colors.length];
        const childBox = document.createElement("div");
        childBox.style.cssText = `
          position:fixed;top:${child.rect.top}px;left:${child.rect.left}px;
          width:${child.rect.width}px;height:${child.rect.height}px;
          border:1px solid ${color};background:${color}20;
          pointer-events:none;z-index:2147483641;
        `;

        const label = document.createElement("div");
        label.style.cssText = `
          position:absolute;top:-16px;left:0;padding:0 4px;
          background:${color};color:#1e1e2e;font-size:9px;line-height:14px;
          font-weight:600;border-radius:2px;white-space:nowrap;
        `;
        if (layout.type === "flex") {
          const parts: string[] = [];
          if (child.flexGrow && child.flexGrow !== "0")
            parts.push(`g${child.flexGrow}`);
          if (child.flexShrink && child.flexShrink !== "1")
            parts.push(`s${child.flexShrink}`);
          if (child.flexBasis && child.flexBasis !== "auto")
            parts.push(`b:${child.flexBasis}`);
          label.textContent = parts.length > 0 ? parts.join(" ") : `#${i + 1}`;
        } else {
          label.textContent = `#${i + 1}`;
        }
        childBox.appendChild(label);

        addOverlayElement(childBox);
        overlays.push(childBox);
      });

      if (panelHost) panelHost.remove();
      panelHost = document.createElement("div");
      panelHost.style.cssText =
        "position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;";
      const shadow = panelHost.attachShadow({ mode: "open" });
      const panel = createLayoutPanel(layout);
      panel.style.pointerEvents = "auto";
      shadow.appendChild(panel);
      document.body.appendChild(panelHost);
    }

    function clearOverlays() {
      for (const o of overlays) removeOverlayElement(o);
      overlays.length = 0;
      if (panelHost) {
        panelHost.remove();
        panelHost = null;
      }
    }

    function handleMouseOut() {
      currentHovered = null;
      clearOverlays();
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      clearOverlays();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
