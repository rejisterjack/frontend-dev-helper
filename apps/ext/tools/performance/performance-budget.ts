import type { ToolDefinition } from '../types';

export const performanceBudget: ToolDefinition = {
  id: 'performance-budget',
  name: 'Performance Budget',
  description: 'Set and monitor performance budgets for page metrics',
  category: 'performance',
  icon: 'Gauge',
  configSchema: {
    maxDOMNodes: { type: 'number', label: 'Max DOM Nodes', default: 1500 },
    maxBundleSize: { type: 'number', label: 'Max Bundle Size (KB)', default: 300 },
    maxImages: { type: 'number', label: 'Max Images', default: 50 },
    maxFCP: { type: 'number', label: 'Max FCP (ms)', default: 1800 },
    maxLCP: { type: 'number', label: 'Max LCP (ms)', default: 2500 },
    maxCLS: { type: 'number', label: 'Max CLS', default: 0.1 },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const maxDOM = (cfg.maxDOMNodes as number) ?? 1500;
    const maxBundle = (cfg.maxBundleSize as number) ?? 300;
    const maxImages = (cfg.maxImages as number) ?? 50;
    const maxFCP = (cfg.maxFCP as number) ?? 1800;
    const maxLCP = (cfg.maxLCP as number) ?? 2500;
    const maxCLS = (cfg.maxCLS as number) ?? 0.1;

    const overlays: HTMLElement[] = [];
    let disposed = false;

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:16px;right:16px;width:380px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:14px;';
    title.textContent = 'Performance Budget';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;';

    panel.append(header, body);

    function measure() {
      const allEls = document.querySelectorAll('*').length;
      const imgs = document.querySelectorAll('img').length;
      const scripts = document.querySelectorAll('script');
      let totalJS = 0;
      scripts.forEach(s => {
        if (s.src) totalJS += (s as any).transferSize || 0;
        else totalJS += s.textContent?.length || 0;
      });
      const jsKB = totalJS / 1024;

      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = navEntries[0];
      const fcp = nav ? (nav.domContentLoadedEventEnd - nav.startTime) : 0;
      const lcp = nav ? nav.loadEventEnd - nav.startTime : 0;

      type Budget = { label: string; actual: number; budget: number; unit: string; };
      const budgets: Budget[] = [
        { label: 'DOM Nodes', actual: allEls, budget: maxDOM, unit: 'nodes' },
        { label: 'Bundle Size', actual: jsKB, budget: maxBundle, unit: 'KB' },
        { label: 'Images', actual: imgs, budget: maxImages, unit: 'images' },
        { label: 'FCP', actual: fcp, budget: maxFCP, unit: 'ms' },
        { label: 'LCP', actual: lcp, budget: maxLCP, unit: 'ms' },
      ];

      let passed = 0;
      while (body.firstChild) body.removeChild(body.firstChild);

      for (const b of budgets) {
        const ok = b.actual <= b.budget;
        if (ok) passed++;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

        const labelRow = document.createElement('div');
        labelRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

        const label = document.createElement('span');
        label.style.cssText = 'font-size:12px;font-weight:500;';
        label.textContent = b.label;

        const status = document.createElement('span');
        status.style.cssText = `font-size:11px;font-weight:600;color:${ok ? '#22c55e' : '#ef4444'};`;
        status.textContent = `${Math.round(b.actual)} / ${b.budget} ${b.unit} ${ok ? '✓' : '✗'}`;

        labelRow.append(label, status);

        const barBg = document.createElement('div');
        barBg.style.cssText = 'height:6px;background:#1e293b;border-radius:3px;overflow:hidden;';

        const bar = document.createElement('div');
        const pct = Math.min((b.actual / b.budget) * 100, 100);
        bar.style.cssText = `height:100%;width:${pct}%;background:${ok ? '#22c55e' : '#ef4444'};border-radius:3px;transition:width .3s ease;`;
        barBg.appendChild(bar);

        row.append(labelRow, barBg);
        body.appendChild(row);
      }

      const scoreDiv = document.createElement('div');
      const score = Math.round((passed / budgets.length) * 100);
      scoreDiv.style.cssText = `text-align:center;padding:12px 0;font-size:24px;font-weight:700;color:${score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'};`;
      scoreDiv.textContent = `${score}% passed (${passed}/${budgets.length})`;
      body.appendChild(scoreDiv);
    }

    measure();
    const timer = setInterval(() => { if (!disposed) measure(); }, 3000);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      overlays.forEach(o => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
