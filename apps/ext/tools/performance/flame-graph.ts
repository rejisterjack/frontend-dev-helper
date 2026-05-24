import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

interface FlameEntry {
  name: string;
  type: 'script' | 'layout' | 'paint' | 'render' | 'idle';
  startTime: number;
  duration: number;
  depth: number;
}

const TYPE_COLORS: Record<FlameEntry['type'], string> = {
  script: '#3b82f6',
  layout: '#ef4444',
  paint: '#22c55e',
  render: '#a855f7',
  idle: '#6b7280',
};

export const flameGraph: ToolDefinition = {
  id: 'flame-graph',
  name: 'Flame Graph',
  description: 'Visualize JavaScript execution performance with flame charts',
  category: 'performance',
  icon: 'Flame',
  configSchema: {
    sampleRate: { type: 'slider', label: 'Sample Rate (ms)', default: 10, min: 1, max: 100, step: 1 },
    maxDuration: { type: 'slider', label: 'Max Duration (s)', default: 30, min: 5, max: 120, step: 5 },
    showLongTasks: { type: 'boolean', label: 'Show Long Tasks', default: true },
    longTaskThreshold: { type: 'slider', label: 'Long Task Threshold (ms)', default: 50, min: 10, max: 500, step: 10 },
  },
  run: (ctx, config) => {
    const timeRange = ((config?.maxDuration as number) ?? 30) * 1000;
    const minDuration = (config?.sampleRate as number) ?? 10;
    const showLongTasks = (config?.showLongTasks as boolean) ?? true;
    const longTaskThreshold = (config?.longTaskThreshold as number) ?? 50;

    const entries: FlameEntry[] = [];
    const overlayEls: HTMLElement[] = [];
    let active = true;

    // -- Capture Performance entries --
    function captureEntries(): void {
      const now = performance.now();
      const cutoff = now - timeRange;

      // Gather measures
      const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
      for (const m of measures) {
        if (m.startTime < cutoff || m.duration < minDuration) continue;
        entries.push({ name: m.name || 'measure', type: 'script', startTime: m.startTime, duration: m.duration, depth: 0 });
      }

      // Gather marks (zero-duration, inflate slightly for visibility)
      const marks = performance.getEntriesByType('mark') as PerformanceMark[];
      for (const mk of marks) {
        if (mk.startTime < cutoff) continue;
        entries.push({ name: mk.name || 'mark', type: 'render', startTime: mk.startTime, duration: Math.max(minDuration, 0.1), depth: 0 });
      }

      // Gather resource timing entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const r of resources) {
        if (r.startTime < cutoff || r.duration < minDuration) continue;
        const rType = inferResourceType(r);
        entries.push({ name: r.name.split('/').pop() || r.name, type: rType, startTime: r.startTime, duration: r.duration, depth: 1 });
      }

      // Gather navigation timing
      const navigations = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      for (const n of navigations) {
        if (n.startTime < cutoff) continue;
        entries.push({ name: 'navigation', type: 'script', startTime: n.startTime, duration: n.duration, depth: 0 });
      }

      // Compute depth from overlap (simple greedy stacking)
      entries.sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
      const ends: number[] = [];
      for (const e of entries) {
        let d = 0;
        while (d < ends.length && ends[d] > e.startTime) d++;
        e.depth = d;
        ends[d] = e.startTime + e.duration;
      }
    }

    function inferResourceType(r: PerformanceResourceTiming): FlameEntry['type'] {
      const url = r.name.toLowerCase();
      if (url.match(/\.(js|mjs|cjs)(\?|$)/)) return 'script';
      if (url.match(/\.(css)(\?|$)/)) return 'render';
      if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/)) return 'paint';
      return 'layout';
    }

    // -- PerformanceObserver for live entries --
    let perfObserver: PerformanceObserver | null = null;
    try {
      perfObserver = new PerformanceObserver(() => {
        if (!active) return;
        captureEntries();
        renderFlameGraph();
      });
      perfObserver.observe({ entryTypes: ['measure', 'mark', 'resource', 'longtask'] });
    } catch {
      // PerformanceObserver may not support all entry types; fall back to polling
    }

    // -- Build panel in shadow DOM --
    const panelHost = document.createElement('div');
    panelHost.style.cssText = 'position:fixed;top:20px;right:20px;width:780px;height:480px;z-index:2147483646;';
    const shadow = panelHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .fg-panel { background: #0f172a; border-radius: 12px; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,.5); display: flex; flex-direction: column; height: 100%; overflow: hidden; color: #e2e8f0; font-size: 13px; }
      .fg-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #1e293b; border-bottom: 1px solid #334155; flex-shrink: 0; }
      .fg-header-title { font-weight: 600; font-size: 14px; }
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

    const panel = document.createElement('div');
    panel.className = 'fg-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'fg-header';
    const title = document.createElement('div');
    title.className = 'fg-header-title';
    title.textContent = 'Performance Flame Graph';
    const actions = document.createElement('div');
    actions.className = 'fg-header-actions';
    const btnRefresh = document.createElement('button');
    btnRefresh.textContent = 'Refresh';
    btnRefresh.dataset.action = 'refresh';
    const btnClose = document.createElement('button');
    btnClose.textContent = 'Close';
    btnClose.dataset.action = 'close';
    actions.append(btnRefresh, btnClose);
    header.append(title, actions);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'fg-legend';
    for (const [t, c] of Object.entries(TYPE_COLORS)) {
      const item = document.createElement('div');
      item.className = 'fg-legend-item';
      const dot = document.createElement('div');
      dot.className = 'fg-legend-dot';
      dot.style.background = c;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(t));
      legend.appendChild(item);
    }

    // Stats bar
    const stats = document.createElement('div');
    stats.className = 'fg-stats';
    const statsText = document.createElement('span');
    statsText.textContent = 'Entries: 0';
    stats.appendChild(statsText);

    // Canvas wrapper
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'fg-canvas-wrap';

    // Footer
    const footer = document.createElement('div');
    footer.className = 'fg-footer';
    const footerLeft = document.createElement('span');
    footerLeft.textContent = 'Hover bars for details';
    const footerRight = document.createElement('span');
    footerRight.textContent = 'Time range: ' + ((config?.maxDuration as number) ?? 30) + 's';
    footer.append(footerLeft, footerRight);

    // Tooltip (lives outside canvas wrap so it is not clipped)
    const tooltip = document.createElement('div');
    tooltip.className = 'fg-tooltip';

    panel.append(header, legend, stats, canvasWrap, footer);
    shadow.append(panel, tooltip);

    document.body.appendChild(panelHost);

    // -- Rendering --
    const BAR_HEIGHT = 22;
    const BAR_GAP = 2;
    const ROW = BAR_HEIGHT + BAR_GAP;

    function renderFlameGraph(): void {
      // Remove old bars
      while (canvasWrap.firstChild) canvasWrap.removeChild(canvasWrap.firstChild);
      // Remove overlay highlights
      for (const o of overlayEls) removeOverlayElement(o);
      overlayEls.length = 0;

      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;';
        empty.textContent = 'No performance entries captured. Interact with the page or use performance.mark()/measure().';
        canvasWrap.appendChild(empty);
        statsText.textContent = 'Entries: 0';
        return;
      }

      const maxDepth = Math.max(...entries.map(e => e.depth), 0);
      const totalHeight = (maxDepth + 1) * ROW + 8;
      canvasWrap.style.position = 'relative';
      canvasWrap.style.minHeight = totalHeight + 'px';

      const containerWidth = canvasWrap.clientWidth || 700;
      const now = performance.now();
      const timeStart = Math.max(now - timeRange, 0);
      const timeEnd = now;
      const timeSpan = timeEnd - timeStart || 1;

      for (const entry of entries) {
        const x = ((entry.startTime - timeStart) / timeSpan) * containerWidth;
        const w = Math.max(2, (entry.duration / timeSpan) * containerWidth);
        if (x + w < 0 || x > containerWidth) continue;

        const bar = document.createElement('div');
        bar.className = 'fg-bar';
        bar.style.left = x + 'px';
        bar.style.top = (entry.depth * ROW) + 'px';
        bar.style.width = w + 'px';
        bar.style.background = TYPE_COLORS[entry.type] || TYPE_COLORS.idle;

        // Long task indicator
        if (showLongTasks && entry.type === 'script' && entry.duration > longTaskThreshold) {
          bar.style.borderRight = '3px solid #f59e0b';
        }

        if (w > 40) {
          bar.textContent = entry.name.length > 30 ? entry.name.slice(0, 27) + '...' : entry.name;
        }

        bar.addEventListener('mouseenter', (ev: MouseEvent) => {
          tooltip.innerHTML = `
            <div class="fg-tooltip-name">${escapeText(entry.name)}</div>
            <div class="fg-tooltip-details">
              <span>Type: ${entry.type}</span>
              <span>Duration: ${entry.duration.toFixed(2)}ms</span>
              <span>Start: ${entry.startTime.toFixed(2)}ms</span>
            </div>
          `;
          tooltip.classList.add('visible');
          positionTooltip(ev);
        });
        bar.addEventListener('mousemove', positionTooltip);
        bar.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));

        canvasWrap.appendChild(bar);
      }

      statsText.textContent = 'Entries: ' + entries.length + ' | Depth: ' + (maxDepth + 1);

      // Add long-task count
      const longCount = entries.filter(e => e.duration > longTaskThreshold).length;
      if (showLongTasks && longCount > 0) {
        const longSpan = document.createElement('span');
        longSpan.style.color = '#f59e0b';
        longSpan.textContent = ' | Long tasks: ' + longCount;
        stats.appendChild(longSpan);
      }
    }

    function positionTooltip(ev: MouseEvent): void {
      tooltip.style.left = (ev.clientX + 12) + 'px';
      tooltip.style.top = (ev.clientY - 10) + 'px';
    }

    function escapeText(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // -- Event handlers --
    panel.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'close') cleanup();
      else if (target.dataset.action === 'refresh') { captureEntries(); renderFlameGraph(); }
    });

    // Initial capture & render
    captureEntries();
    renderFlameGraph();

    // Auto-refresh every 2 seconds
    const refreshTimer = setInterval(() => {
      if (!active) return;
      captureEntries();
      renderFlameGraph();
    }, 2000);

    function cleanup() {
      active = false;
      clearInterval(refreshTimer);
      if (perfObserver) perfObserver.disconnect();
      for (const o of overlayEls) removeOverlayElement(o);
      overlayEls.length = 0;
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
