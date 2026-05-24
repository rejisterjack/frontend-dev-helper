import type { ToolDefinition } from '../types';

export const networkAnalyzer: ToolDefinition = {
  id: 'network-analyzer',
  name: 'Network Analyzer',
  description: 'Analyze network requests, payloads, and loading performance',
  category: 'performance',
  icon: 'Wifi',
  configSchema: {
    captureXHR: { type: 'boolean', label: 'Capture XHR', default: true },
    captureFetch: { type: 'boolean', label: 'Capture Fetch', default: true },
    captureImages: { type: 'boolean', label: 'Capture Images', default: true },
    captureScripts: { type: 'boolean', label: 'Capture Scripts', default: true },
    maxEntries: { type: 'slider', label: 'Max Entries', default: 100, min: 10, max: 500, step: 10 },
    showTiming: { type: 'boolean', label: 'Show Timing', default: true },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const maxEntries = (cfg.maxEntries as number) ?? 100;
    const showTiming = (cfg.showTiming as boolean) ?? true;
    const captureXHR = (cfg.captureXHR as boolean) ?? true;
    const captureFetch = (cfg.captureFetch as boolean) ?? true;

    const overlays: HTMLElement[] = [];
    const requests: Array<{ url: string; method: string; status: number; duration: number; size: number; type: string; start: number }> = [];
    let disposed = false;

    const TYPE_COLORS: Record<string, string> = {
      document: '#3b82f6', script: '#eab308', stylesheet: '#a855f7',
      image: '#22c55e', font: '#f97316', xmlhttprequest: '#06b6d4', fetch: '#06b6d4', other: '#6b7280',
    };

    function inferType(url: string): string {
      const u = url.toLowerCase();
      if (u.match(/\.(js|mjs|cjs)(\?|$)/)) return 'script';
      if (u.match(/\.css(\?|$)/)) return 'stylesheet';
      if (u.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|avif)(\?|$)/)) return 'image';
      if (u.match(/\.(woff2?|ttf|otf|eot)(\?|$)/)) return 'font';
      if (u.match(/\.(html|htm)(\?|$)/)) return 'document';
      return 'fetch';
    }

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:16px;right:16px;width:520px;max-height:500px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:12px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:14px;';
    title.textContent = 'Network Analyzer';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    const statsBar = document.createElement('div');
    statsBar.style.cssText = 'font-size:11px;color:#64748b;margin-left:auto;margin-right:12px;';
    header.append(title, statsBar, closeBtn);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex:1;overflow-y:auto;padding:4px 0;';

    const footer = document.createElement('div');
    footer.style.cssText = 'padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;display:flex;justify-content:space-between;flex-shrink:0;';
    footer.innerHTML = '<span>Monitoring network requests</span><span>Click X to close</span>';

    panel.append(header, listContainer, footer);

    function renderList() {
      while (listContainer.firstChild) listContainer.removeChild(listContainer.firstChild);
      if (requests.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:30px;text-align:center;color:#64748b;';
        empty.textContent = 'Waiting for network requests...';
        listContainer.appendChild(empty);
        return;
      }

      const display = requests.slice(-maxEntries);
      let totalSize = 0, totalDuration = 0;
      for (const r of display) { totalSize += r.size; totalDuration += r.duration; }

      statsBar.textContent = `${display.length} requests | ${(totalSize / 1024).toFixed(1)}KB | ${totalDuration.toFixed(0)}ms`;

      for (const req of display) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid #1e293b;cursor:default;';
        if (req.duration > 1000) row.style.background = 'rgba(239,68,68,.06)';
        else if (req.size > 512 * 1024) row.style.background = 'rgba(249,115,22,.06)';

        const dot = document.createElement('div');
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${TYPE_COLORS[req.type] || TYPE_COLORS.other};`;

        const name = document.createElement('div');
        name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const shortUrl = req.url.split('/').pop() || req.url;
        name.textContent = shortUrl.length > 40 ? shortUrl.slice(0, 37) + '...' : shortUrl;
        name.title = req.url;

        const typeTag = document.createElement('span');
        typeTag.style.cssText = `font-size:10px;color:${TYPE_COLORS[req.type] || '#6b7280'};flex-shrink:0;min-width:50px;`;
        typeTag.textContent = req.type;

        const sizeTag = document.createElement('span');
        sizeTag.style.cssText = 'font-size:10px;color:#94a3b8;min-width:55px;text-align:right;flex-shrink:0;';
        sizeTag.textContent = req.size > 1024 ? (req.size / 1024).toFixed(1) + 'KB' : req.size + 'B';

        const durTag = document.createElement('span');
        durTag.style.cssText = `font-size:10px;min-width:45px;text-align:right;flex-shrink:0;color:${req.duration > 1000 ? '#ef4444' : req.duration > 300 ? '#f59e0b' : '#94a3b8'};`;
        durTag.textContent = req.duration.toFixed(0) + 'ms';

        row.append(dot, name, typeTag, sizeTag, durTag);
        listContainer.appendChild(row);
      }
      listContainer.scrollTop = listContainer.scrollHeight;
    }

    let perfObserver: PerformanceObserver | null = null;
    try {
      perfObserver = new PerformanceObserver((list) => {
        if (disposed) return;
        for (const entry of list.getEntries()) {
          const r = entry as PerformanceResourceTiming;
          requests.push({
            url: r.name, method: 'GET', status: 200,
            duration: r.duration, size: r.transferSize || 0,
            type: inferType(r.name), start: r.startTime,
          });
        }
        renderList();
      });
      perfObserver.observe({ type: 'resource', buffered: true });
    } catch { /* fallback below */ }

    if (captureFetch) {
      const origFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const start = performance.now();
        return origFetch.call(this, input, init).then((resp) => {
          if (!disposed) {
            requests.push({ url, method: init?.method || 'GET', status: resp.status, duration: performance.now() - start, size: 0, type: 'fetch', start });
            renderList();
          }
          return resp;
        }).catch((err) => {
          if (!disposed) {
            requests.push({ url, method: init?.method || 'GET', status: 0, duration: performance.now() - start, size: 0, type: 'fetch', start });
            renderList();
          }
          throw err;
        });
      } as typeof fetch;
    }

    if (captureXHR) {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
        (this as any).__fdh_method = method;
        (this as any).__fdh_url = String(url);
        return origOpen.call(this, method, url, ...(rest as [boolean?, string?, string?]));
      };
      XMLHttpRequest.prototype.send = function (...args) {
        const start = performance.now();
        const xhr = this as any;
        xhr.addEventListener('load', () => {
          if (!disposed) {
            requests.push({ url: xhr.__fdh_url || '', method: xhr.__fdh_method || 'GET', status: xhr.status, duration: performance.now() - start, size: parseInt(xhr.getResponseHeader('content-length') || '0'), type: 'xmlhttprequest', start });
            renderList();
          }
        });
        return origSend.apply(this, args);
      };
    }

    renderList();

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (perfObserver) perfObserver.disconnect();
      overlays.forEach(o => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
