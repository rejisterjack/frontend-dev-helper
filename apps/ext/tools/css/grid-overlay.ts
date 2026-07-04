import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "@/content/overlay-manager";

interface GridContainer {
  element: HTMLElement;
  columns: number;
  rows: number;
  columnTracks: number[];
  rowTracks: number[];
  columnGap: number;
  rowGap: number;
  templateAreas: string[][] | null;
}

function parseLength(value: string): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function parseComputedTrackList(
  value: string,
  fallbackSize: number,
  trackCount: number,
): number[] {
  // Computed grid-template-columns/rows returns the RENDERED track sizes as
  // space-separated pixel values (e.g. "100px 200px 50px") once layout is
  // resolved. Fr/percentage/auto/minmax all collapse to concrete px in the
  // computed value. We just need to parse them.
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter((t) => t && t !== "none");
  if (tokens.length === 0) {
    return Array(trackCount).fill(
      trackCount > 0 ? fallbackSize / trackCount : fallbackSize,
    );
  }
  return tokens.map((t) => {
    const px = parseLength(t);
    // Some browsers return "0px" for collapsed tracks; leave as 0 so the
    // caller's auto-fill logic can redistribute.
    return px;
  });
}

function resolveGap(computed: CSSStyleDeclaration): {
  row: number;
  column: number;
} {
  return {
    row: parseLength(computed.rowGap || ""),
    column: parseLength(computed.columnGap || ""),
  };
}

function parseTemplateAreas(value: string): string[][] | null {
  const cleaned = (value || "").trim();
  if (!cleaned || cleaned === "none" || cleaned === ".") return null;
  const rows: string[][] = [];
  const rowStrs = cleaned.match(/"[^"]*"/g);
  if (!rowStrs) return null;
  for (const r of rowStrs) {
    const cells = r.replace(/"/g, "").trim().split(/\s+/).filter(Boolean);
    if (cells.length > 0) rows.push(cells);
  }
  return rows.length > 0 ? rows : null;
}

function findGridContainers(): GridContainer[] {
  const containers: GridContainer[] = [];
  const all = document.querySelectorAll("*");

  for (const el of all) {
    const html = el as HTMLElement;
    const computed = getComputedStyle(html);
    const display = computed.display;
    if (display !== "grid" && display !== "inline-grid") continue;

    const rect = html.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Probe track count first by counting whitespace-separated tokens in the
    // computed template. The rendered computed value is space-separated px.
    const colTokenCount =
      computed.gridTemplateColumns &&
      computed.gridTemplateColumns !== "none" &&
      computed.gridTemplateColumns.trim() !== "(null)"
        ? computed.gridTemplateColumns.trim().split(/\s+/).length
        : 0;
    const rowTokenCount =
      computed.gridTemplateRows &&
      computed.gridTemplateRows !== "none" &&
      computed.gridTemplateRows.trim() !== "(null)"
        ? computed.gridTemplateRows.trim().split(/\s+/).length
        : 0;

    const columnTracks = parseComputedTrackList(
      computed.gridTemplateColumns,
      rect.width,
      Math.max(colTokenCount, 1),
    );
    const rowTracks = parseComputedTrackList(
      computed.gridTemplateRows,
      rect.height,
      Math.max(rowTokenCount, 1),
    );
    const { row, column } = resolveGap(computed);

    let columns = columnTracks.length;
    let rows = rowTracks.length;

    for (const child of html.children) {
      const childStyle = getComputedStyle(child as HTMLElement);
      const colStart = parseInt(
        childStyle.getPropertyValue("grid-column-start"),
        10,
      );
      const colEnd = parseInt(
        childStyle.getPropertyValue("grid-column-end"),
        10,
      );
      const rowStart = parseInt(
        childStyle.getPropertyValue("grid-row-start"),
        10,
      );
      const rowEnd = parseInt(childStyle.getPropertyValue("grid-row-end"), 10);
      if (!isNaN(colEnd)) columns = Math.max(columns, colEnd - 1);
      else if (!isNaN(colStart)) columns = Math.max(columns, colStart);
      if (!isNaN(rowEnd)) rows = Math.max(rows, rowEnd - 1);
      else if (!isNaN(rowStart)) rows = Math.max(rows, rowStart);
    }

    columns = Math.max(columns, 1);
    rows = Math.max(rows, 1);

    const areas = parseTemplateAreas(computed.gridTemplateAreas);
    if (areas) {
      columns = Math.max(columns, areas[0].length);
      rows = Math.max(rows, areas.length);
    }

    containers.push({
      element: html,
      columns,
      rows,
      columnTracks,
      rowTracks,
      columnGap: column,
      rowGap: row,
      templateAreas: areas,
    });
  }

  return containers;
}

function computeTrackStarts(tracks: number[], gap: number): number[] {
  const starts: number[] = [0];
  let offset = 0;
  for (let i = 0; i < tracks.length; i++) {
    offset += tracks[i];
    starts.push(offset);
    if (i < tracks.length - 1) offset += gap;
  }
  return starts;
}

interface GridOverlayElements {
  containerBox: HTMLDivElement;
  lines: HTMLDivElement[];
  lineLabels: HTMLDivElement[];
  cells: HTMLDivElement[];
  areaLabels: HTMLDivElement[];
}

function createGridOverlayElements(
  container: GridContainer,
): GridOverlayElements {
  const containerBox = document.createElement("div");
  const lines: HTMLDivElement[] = [];
  const lineLabels: HTMLDivElement[] = [];
  const cells: HTMLDivElement[] = [];
  const areaLabels: HTMLDivElement[] = [];

  const totalLines = container.columns + 1 + container.rows + 1;
  for (let i = 0; i < totalLines; i++) {
    lines.push(document.createElement("div"));
    lineLabels.push(document.createElement("div"));
  }

  for (let i = 0; i < container.columns * container.rows; i++) {
    cells.push(document.createElement("div"));
  }

  return { containerBox, lines, lineLabels, cells, areaLabels };
}

interface RenderConfig {
  lineColor: string;
  showLines: boolean;
  showTracks: boolean;
  showNames: boolean;
  showAreas: boolean;
  areaOpacity: number;
}

function positionGridOverlay(
  container: GridContainer,
  els: GridOverlayElements,
  cfg: RenderConfig,
): void {
  const r = container.element.getBoundingClientRect();

  const colTracks = container.columnTracks.length
    ? container.columnTracks
    : Array(container.columns).fill(r.width / container.columns);
  const rowTracks = container.rowTracks.length
    ? container.rowTracks
    : Array(container.rows).fill(r.height / container.rows);

  const totalCols =
    colTracks.reduce((s, t) => s + t, 0) +
    container.columnGap * (colTracks.length - 1);
  const totalRows =
    rowTracks.reduce((s, t) => s + t, 0) +
    container.rowGap * (rowTracks.length - 1);

  if (colTracks.length < container.columns) {
    const remaining = Math.max(0, r.width - totalCols);
    const perCol = container.columns - colTracks.length;
    const extra = perCol > 0 ? remaining / perCol : 0;
    while (colTracks.length < container.columns) colTracks.push(extra);
  }
  if (rowTracks.length < container.rows) {
    const remaining = Math.max(0, r.height - totalRows);
    const perRow = container.rows - rowTracks.length;
    const extra = perRow > 0 ? remaining / perRow : 0;
    while (rowTracks.length < container.rows) rowTracks.push(extra);
  }

  const colStarts = computeTrackStarts(colTracks, container.columnGap);
  const rowStarts = computeTrackStarts(rowTracks, container.rowGap);

  els.containerBox.style.cssText = `
    position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;
    border:2px solid ${cfg.lineColor};pointer-events:none;z-index:2147483640;
    ${cfg.showTracks ? `background:transparent;` : ""}
  `;

  let lineIdx = 0;
  let labelIdx = 0;
  if (cfg.showLines) {
    for (let i = 0; i < colStarts.length; i++) {
      const x = r.left + colStarts[i];
      const line = els.lines[lineIdx++];
      const isEdge = i === 0 || i === colStarts.length - 1;
      line.style.cssText = `
        position:fixed;top:${r.top}px;left:${x - 0.5}px;width:1px;height:${r.height}px;
        background:${cfg.lineColor};opacity:${isEdge ? 0.4 : 0.7};pointer-events:none;z-index:2147483641;
      `;
      const label = els.lineLabels[labelIdx++];
      // Click-to-copy: clicking a line label copies the grid-line number to the
      // clipboard so authors can paste it straight into `grid-column: <n>`.
      label.style.cssText = `
        position:fixed;top:${r.top - 16}px;left:${x - 6}px;
        padding:1px 4px;background:${cfg.lineColor};color:#1e1e2e;
        font-size:9px;font-weight:600;line-height:12px;border-radius:2px;
        pointer-events:auto;cursor:pointer;z-index:2147483643;white-space:nowrap;font-family:monospace;
      `;
      label.textContent = String(i + 1);
      label.title = "Click to copy grid line number";
      label.onclick = () => {
        void navigator.clipboard.writeText(String(i + 1)).then(() => {
          const prev = label.textContent;
          label.textContent = "✓";
          setTimeout(() => {
            label.textContent = prev;
          }, 800);
        });
      };
    }
    for (let i = 0; i < rowStarts.length; i++) {
      const y = r.top + rowStarts[i];
      const line = els.lines[lineIdx++];
      const isEdge = i === 0 || i === rowStarts.length - 1;
      line.style.cssText = `
        position:fixed;top:${y - 0.5}px;left:${r.left}px;width:${r.width}px;height:1px;
        background:${cfg.lineColor};opacity:${isEdge ? 0.4 : 0.7};pointer-events:none;z-index:2147483641;
      `;
      const label = els.lineLabels[labelIdx++];
      label.style.cssText = `
        position:fixed;top:${y - 6}px;left:${r.left - 24}px;
        padding:1px 4px;background:${cfg.lineColor};color:#1e1e2e;
        font-size:9px;font-weight:600;line-height:12px;border-radius:2px;
        pointer-events:auto;cursor:pointer;z-index:2147483643;white-space:nowrap;font-family:monospace;
      `;
      label.textContent = String(i + 1);
      label.title = "Click to copy grid line number";
      label.onclick = () => {
        void navigator.clipboard.writeText(String(i + 1)).then(() => {
          const prev = label.textContent;
          label.textContent = "✓";
          setTimeout(() => {
            label.textContent = prev;
          }, 800);
        });
      };
    }
  }

  if (cfg.showTracks) {
    const cellColors = [
      `rgba(139,92,246,${cfg.areaOpacity})`,
      `rgba(139,92,246,${cfg.areaOpacity * 1.6})`,
    ];
    let cellIdx = 0;
    for (let row = 0; row < container.rows; row++) {
      for (let col = 0; col < container.columns; col++) {
        const xStart = colStarts[col];
        const xEnd = colStarts[col + 1];
        const yStart = rowStarts[row];
        const yEnd = rowStarts[row + 1];
        if (xEnd === undefined || yEnd === undefined) continue;

        const cell = els.cells[cellIdx++];
        cell.setAttribute("data-fdh-overlay", "grid-cell");
        cell.style.cssText = `
          position:fixed;top:${r.top + yStart}px;left:${r.left + xStart}px;
          width:${xEnd - xStart}px;height:${yEnd - yStart}px;
          background:${cellColors[(row + col) % 2]};
          pointer-events:none;z-index:2147483640;
        `;
      }
    }
  }

  if (cfg.showAreas && container.templateAreas) {
    const seen = new Set<string>();
    for (let row = 0; row < container.templateAreas.length; row++) {
      const rowAreas = container.templateAreas[row];
      for (let col = 0; col < rowAreas.length; col++) {
        const name = rowAreas[col];
        if (!name || name === "." || seen.has(name)) continue;
        seen.add(name);

        let minCol = col;
        let maxCol = col;
        let minRow = row;
        let maxRow = row;
        for (let r2 = 0; r2 < container.templateAreas.length; r2++) {
          for (let c2 = 0; c2 < container.templateAreas[r2].length; c2++) {
            if (container.templateAreas[r2][c2] === name) {
              minCol = Math.min(minCol, c2);
              maxCol = Math.max(maxCol, c2);
              minRow = Math.min(minRow, r2);
              maxRow = Math.max(maxRow, r2);
            }
          }
        }

        const xStart = colStarts[minCol] ?? 0;
        const xEnd = colStarts[maxCol + 1] ?? colStarts[colStarts.length - 1];
        const yStart = rowStarts[minRow] ?? 0;
        const yEnd = rowStarts[maxRow + 1] ?? rowStarts[rowStarts.length - 1];

        const label = document.createElement("div");
        label.setAttribute("data-fdh-overlay", "grid-area-label");
        label.style.cssText = `
          position:fixed;top:${r.top + (yStart + yEnd) / 2 - 9}px;left:${r.left + (xStart + xEnd) / 2 - name.length * 3.5}px;
          padding:2px 6px;background:${cfg.lineColor};color:#1e1e2e;
          font-size:10px;font-weight:700;line-height:14px;border-radius:3px;
          pointer-events:none;z-index:2147483644;white-space:nowrap;font-family:monospace;
        `;
        label.textContent = name;
        els.areaLabels.push(label);
        addOverlayElement(label);
      }
    }
  }
}

function drawGridOverlay(
  container: GridContainer,
  cfg: RenderConfig,
): { elements: HTMLDivElement[]; tracker: () => void; detach: () => void } {
  const els = createGridOverlayElements(container);
  const allEls = [
    els.containerBox,
    ...els.lines,
    ...els.lineLabels,
    ...els.cells,
  ];

  for (const el of allEls) addOverlayElement(el);

  const tracker = () => positionGridOverlay(container, els, cfg);
  tracker();

  const detach = attachViewportTracker(tracker);

  return { elements: allEls, tracker, detach };
}

function createInfoPanel(containers: GridContainer[]): HTMLDivElement {
  const panel = document.createElement("div");
  panel.setAttribute("data-fdh-overlay", "grid-info-panel");
  panel.style.cssText = `
    position:fixed;top:12px;right:12px;width:280px;
    background:#1e1e2e;border:1px solid #45475a;border-radius:12px;
    padding:14px;font-family:-apple-system,system-ui,sans-serif;
    font-size:12px;color:#cdd6f4;z-index:2147483647;
    box-shadow:0 16px 40px rgba(0,0,0,0.5);max-height:60vh;overflow-y:auto;
  `;

  const title = document.createElement("div");
  title.style.cssText =
    "font-weight:600;font-size:14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #313244;";
  title.textContent = `Grid Containers (${containers.length})`;
  panel.appendChild(title);

  containers.forEach((gc, idx) => {
    const item = document.createElement("div");
    item.style.cssText =
      "background:#313244;padding:8px 10px;border-radius:6px;margin-bottom:6px;";

    const tag = document.createElement("div");
    tag.style.cssText =
      "font-family:monospace;color:#cba6f7;font-size:11px;margin-bottom:4px;";
    tag.textContent =
      gc.element.tagName.toLowerCase() +
      (gc.element.id ? "#" + gc.element.id : ":nth(" + idx + ")");
    item.appendChild(tag);

    const info = document.createElement("div");
    info.style.cssText = "color:#6c7086;font-size:11px;";
    info.textContent = `${gc.columns} cols × ${gc.rows} rows · col-gap: ${gc.columnGap}px · row-gap: ${gc.rowGap}px`;
    item.appendChild(info);

    if (gc.templateAreas) {
      const areasRow = document.createElement("div");
      areasRow.style.cssText =
        "color:#a6e3a1;font-size:10px;font-family:monospace;margin-top:4px;";
      const names = new Set<string>();
      for (const r of gc.templateAreas)
        for (const c of r) if (c !== ".") names.add(c);
      areasRow.textContent = `areas: ${Array.from(names).join(", ")}`;
      item.appendChild(areasRow);
    }

    panel.appendChild(item);
  });

  return panel;
}

export const gridOverlay: ToolDefinition = {
  id: "grid-overlay",
  name: "Grid Overlay",
  description: "Overlay CSS Grid lines, areas, and tracks on the page",
  category: "css",
  icon: "Grid3x3",
  configSchema: {
    showLines: { type: "boolean", label: "Show Grid Lines", default: true },
    showAreas: { type: "boolean", label: "Show Areas", default: true },
    showTracks: { type: "boolean", label: "Show Tracks", default: true },
    showNames: { type: "boolean", label: "Show Names", default: true },
    lineColor: { type: "color", label: "Line Color", default: "#8b5cf6" },
    areaOpacity: {
      type: "slider",
      label: "Area Opacity",
      default: 0.15,
      min: 0,
      max: 1,
      step: 0.05,
    },
  },
  run(ctx, config = {}) {
    const lineColor = (config.lineColor as string) || "#8b5cf6";
    const showLines = config.showLines !== false;
    const showAreas = config.showAreas !== false;
    const showTracks = config.showTracks !== false;
    const showNames = config.showNames !== false;
    const areaOpacity =
      typeof config.areaOpacity === "number" ? config.areaOpacity : 0.15;

    const allOverlays: HTMLDivElement[] = [];
    const detachTrackers: Array<() => void> = [];
    void showNames;

    const containers = findGridContainers();

    for (const gc of containers) {
      const { elements, detach } = drawGridOverlay(gc, {
        lineColor,
        showLines,
        showTracks,
        showNames,
        showAreas,
        areaOpacity,
      });
      allOverlays.push(...elements);
      detachTrackers.push(detach);
    }

    const panel = createInfoPanel(containers);
    addOverlayElement(panel);
    allOverlays.push(panel);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const detach of detachTrackers) detach();
      for (const o of allOverlays) removeOverlayElement(o);
      allOverlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
