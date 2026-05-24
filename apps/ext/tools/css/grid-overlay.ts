import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

interface GridContainer {
  element: HTMLElement;
  rect: DOMRect;
  columns: number;
  rows: number;
  columnTracks: string[];
  rowTracks: string[];
  gap: string;
  columnGap: string;
  rowGap: string;
}

function findGridContainers(): GridContainer[] {
  const containers: GridContainer[] = [];
  const all = document.querySelectorAll('*');

  for (const el of all) {
    const html = el as HTMLElement;
    const computed = getComputedStyle(html);
    const display = computed.display;
    if (display !== 'grid' && display !== 'inline-grid') continue;

    const rect = html.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const colTemplate = computed.gridTemplateColumns;
    const rowTemplate = computed.gridTemplateRows;
    const columns = colTemplate.split(' ').filter(v => v && v !== 'none').length || 1;
    const rows = rowTemplate.split(' ').filter(v => v && v !== 'none').length || 1;

    containers.push({
      element: html, rect, columns, rows,
      columnTracks: colTemplate.split(' ').filter(v => v && v !== 'none'),
      rowTracks: rowTemplate.split(' ').filter(v => v && v !== 'none'),
      gap: computed.gap,
      columnGap: computed.columnGap,
      rowGap: computed.rowGap,
    });
  }

  return containers;
}

function computeTrackPositions(trackCount: number, totalSize: number, tracks: string[], gap: number): number[] {
  const positions: number[] = [0];
  const trackCountSafe = Math.max(trackCount, 1);

  if (tracks.length > 0 && tracks.length === trackCount) {
    let offset = 0;
    for (let i = 0; i < tracks.length - 1; i++) {
      const size = parseFloat(tracks[i]);
      if (isNaN(size) || size === 0) {
        offset += totalSize / trackCountSafe;
      } else {
        offset += size;
      }
      offset += gap;
      positions.push(offset);
    }
    positions.push(totalSize);
  } else {
    const trackSize = totalSize / trackCountSafe;
    for (let i = 1; i < trackCountSafe; i++) {
      positions.push(trackSize * i);
    }
    positions.push(totalSize);
  }

  return positions;
}

function drawGridOverlay(container: GridContainer, lineColor: string, areaOpacity: number, showNames: boolean): HTMLDivElement[] {
  const els: HTMLDivElement[] = [];
  const r = container.rect;
  const gapVal = parseFloat(container.gap) || parseFloat(container.columnGap) || 0;
  const rowGapVal = parseFloat(container.rowGap) || parseFloat(container.gap) || 0;

  const containerBox = document.createElement('div');
  containerBox.style.cssText = `
    position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;
    border:2px solid ${lineColor};pointer-events:none;z-index:2147483640;
  `;
  addOverlayElement(containerBox);
  els.push(containerBox);

  const colPositions = computeTrackPositions(container.columns, r.width, container.columnTracks, gapVal);
  for (let i = 1; i < colPositions.length - 1; i++) {
    const x = r.left + colPositions[i];
    const line = document.createElement('div');
    line.style.cssText = `
      position:fixed;top:${r.top}px;left:${x - 0.5}px;width:1px;height:${r.height}px;
      background:${lineColor};opacity:0.6;pointer-events:none;z-index:2147483641;
    `;
    addOverlayElement(line);
    els.push(line);

    if (showNames) {
      const label = document.createElement('div');
      label.style.cssText = `
        position:fixed;top:${r.top - 14}px;left:${x}px;
        padding:0 3px;background:${lineColor};color:#1e1e2e;
        font-size:9px;font-weight:600;line-height:14px;border-radius:2px;
        pointer-events:none;z-index:2147483642;white-space:nowrap;
      `;
      label.textContent = `C${i}`;
      addOverlayElement(label);
      els.push(label);
    }
  }

  const rowPositions = computeTrackPositions(container.rows, r.height, container.rowTracks, rowGapVal);
  for (let i = 1; i < rowPositions.length - 1; i++) {
    const y = r.top + rowPositions[i];
    const line = document.createElement('div');
    line.style.cssText = `
      position:fixed;top:${y - 0.5}px;left:${r.left}px;width:${r.width}px;height:1px;
      background:${lineColor};opacity:0.6;pointer-events:none;z-index:2147483641;
    `;
    addOverlayElement(line);
    els.push(line);

    if (showNames) {
      const label = document.createElement('div');
      label.style.cssText = `
        position:fixed;top:${y}px;left:${r.left - 22}px;
        padding:0 3px;background:${lineColor};color:#1e1e2e;
        font-size:9px;font-weight:600;line-height:14px;border-radius:2px;
        pointer-events:none;z-index:2147483642;white-space:nowrap;
      `;
      label.textContent = `R${i}`;
      addOverlayElement(label);
      els.push(label);
    }
  }

  const cellColors = ['#8b5cf620', '#8b5cf640'];
  for (let row = 0; row < container.rows; row++) {
    for (let col = 0; col < container.columns; col++) {
      const xStart = colPositions[col];
      const xEnd = colPositions[col + 1];
      const yStart = rowPositions[row];
      const yEnd = rowPositions[row + 1];
      if (xEnd === undefined || yEnd === undefined) continue;

      const cell = document.createElement('div');
      cell.style.cssText = `
        position:fixed;top:${r.top + yStart}px;left:${r.left + xStart}px;
        width:${xEnd - xStart}px;height:${yEnd - yStart}px;
        background:${cellColors[(row + col) % 2]};
        pointer-events:none;z-index:2147483640;
      `;
      addOverlayElement(cell);
      els.push(cell);
    }
  }

  return els;
}

function createInfoPanel(containers: GridContainer[]): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position:fixed;top:12px;right:12px;width:280px;
    background:#1e1e2e;border:1px solid #45475a;border-radius:12px;
    padding:14px;font-family:-apple-system,system-ui,sans-serif;
    font-size:12px;color:#cdd6f4;z-index:2147483647;
    box-shadow:0 16px 40px rgba(0,0,0,0.5);max-height:60vh;overflow-y:auto;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #313244;';
  title.textContent = `Grid Containers (${containers.length})`;
  panel.appendChild(title);

  containers.forEach((gc, idx) => {
    const item = document.createElement('div');
    item.style.cssText = 'background:#313244;padding:8px 10px;border-radius:6px;margin-bottom:6px;';

    const tag = document.createElement('div');
    tag.style.cssText = 'font-family:monospace;color:#cba6f7;font-size:11px;margin-bottom:4px;';
    tag.textContent = gc.element.tagName.toLowerCase() + (gc.element.id ? '#' + gc.element.id : ':nth(' + idx + ')');
    item.appendChild(tag);

    const info = document.createElement('div');
    info.style.cssText = 'color:#6c7086;font-size:11px;';
    info.textContent = `${gc.columns} cols × ${gc.rows} rows · gap: ${gc.gap}`;
    item.appendChild(info);

    panel.appendChild(item);
  });

  return panel;
}

export const gridOverlay: ToolDefinition = {
  id: 'grid-overlay',
  name: 'Grid Overlay',
  description: 'Overlay CSS Grid lines, areas, and tracks on the page',
  category: 'css',
  icon: 'Grid3x3',
  configSchema: {
    showLines: { type: 'boolean', label: 'Show Grid Lines', default: true },
    showAreas: { type: 'boolean', label: 'Show Areas', default: true },
    showTracks: { type: 'boolean', label: 'Show Tracks', default: true },
    showNames: { type: 'boolean', label: 'Show Names', default: true },
    lineColor: { type: 'color', label: 'Line Color', default: '#8b5cf6' },
    areaOpacity: { type: 'slider', label: 'Area Opacity', default: 0.15, min: 0, max: 1, step: 0.05 },
  },
  run(ctx, config = {}) {
    const allOverlays: HTMLDivElement[] = [];
    const lineColor = (config.lineColor as string) || '#8b5cf6';
    const areaOpacity = typeof config.areaOpacity === 'number' ? config.areaOpacity : 0.15;
    const showNames = config.showNames !== false;

    const containers = findGridContainers();

    for (const gc of containers) {
      const drawn = drawGridOverlay(gc, lineColor, areaOpacity, showNames);
      allOverlays.push(...drawn);
    }

    const panelHost = document.createElement('div');
    panelHost.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;';
    const shadow = panelHost.attachShadow({ mode: 'open' });
    const panel = createInfoPanel(containers);
    panel.style.pointerEvents = 'auto';
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup(); };
    document.addEventListener('keydown', handleKeyDown, true);

    function cleanup() {
      document.removeEventListener('keydown', handleKeyDown, true);
      for (const o of allOverlays) removeOverlayElement(o);
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
