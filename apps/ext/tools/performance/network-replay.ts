import type { ToolDefinition } from '../types';
import { NetworkCapture } from '@/lib/network-capture';
import type { CapturedRequest } from '@/lib/network-capture';
import { exportAsCurl, exportAsFetch, exportAsPostmanCollection } from '@/lib/export-service';
import type { CapturedRequestForExport } from '@/lib/export-service';

function toExportRequest(req: CapturedRequest): CapturedRequestForExport {
  return {
    id: req.id,
    url: req.url,
    method: req.method,
    requestHeaders: req.requestHeaders,
    requestBody: req.requestBody,
    responseHeaders: req.responseHeaders,
    responseBody: req.responseBody,
    statusCode: req.statusCode,
    statusText: req.statusText,
    contentType: req.contentType,
    timing: req.timing,
    resourceType: req.resourceType,
    size: req.size,
    timestamp: req.timestamp,
  };
}

export const networkReplay: ToolDefinition = {
  id: 'network-replay',
  name: 'Network Replay',
  description: 'Capture, replay, and export network requests as cURL, fetch, or Postman',
  category: 'performance',
  icon: 'Repeat',
  configSchema: {
    captureXHR: { type: 'boolean', label: 'Capture XHR', default: true },
    captureFetch: { type: 'boolean', label: 'Capture Fetch', default: true },
    maxBodySize: { type: 'slider', label: 'Max Body Size (KB)', default: 100, min: 10, max: 500, step: 10 },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const captureXHR = (cfg.captureXHR as boolean) ?? true;
    const captureFetch = (cfg.captureFetch as boolean) ?? true;
    const maxBodySizeKB = (cfg.maxBodySize as number) ?? 100;
    const maxBodySize = maxBodySizeKB * 1024;

    const overlays: HTMLElement[] = [];
    let disposed = false;

    const TYPE_COLORS: Record<string, string> = {
      document: '#3b82f6',
      script: '#eab308',
      stylesheet: '#a855f7',
      image: '#22c55e',
      font: '#f97316',
      xhr: '#06b6d4',
      fetch: '#06b6d4',
      other: '#6b7280',
    };

    const TYPE_FILTERS = ['all', 'xhr', 'fetch', 'script', 'stylesheet', 'image', 'font', 'document', 'other'] as const;
    let activeFilter = 'all';

    const capture = new NetworkCapture({
      maxBodySize,
      captureXHR,
      captureFetch,
    });

    let selectedRequestId: string | null = null;

    // --- Panel ---
    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed;top:16px;right:16px;width:600px;max-height:600px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:12px;display:flex;flex-direction:column;overflow:hidden;';
    document.body.appendChild(panel);
    overlays.push(panel);

    // Header
    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:600;font-size:14px;';
    titleEl.textContent = 'Network Replay';

    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const statsBar = document.createElement('span');
    statsBar.style.cssText = 'font-size:11px;color:#64748b;';

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText =
      'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;

    headerRight.append(statsBar, closeBtn);
    header.append(titleEl, headerRight);

    // Controls bar
    const controlsBar = document.createElement('div');
    controlsBar.style.cssText =
      'display:flex;align-items:center;gap:6px;padding:8px 14px;background:#0c1222;border-bottom:1px solid #1e293b;flex-shrink:0;flex-wrap:wrap;';

    const recordBtn = document.createElement('button');
    recordBtn.style.cssText =
      'padding:4px 10px;border-radius:6px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;font-size:11px;cursor:pointer;font-family:inherit;';
    recordBtn.textContent = 'Start Recording';

    const clearBtn = document.createElement('button');
    clearBtn.style.cssText =
      'padding:4px 10px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;';
    clearBtn.textContent = 'Clear';

    const exportAllBtn = document.createElement('button');
    exportAllBtn.style.cssText =
      'padding:4px 10px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;';
    exportAllBtn.textContent = 'Export All';

    const filterSelect = document.createElement('select');
    filterSelect.style.cssText =
      'padding:4px 8px;border-radius:6px;border:1px solid #334155;background:#0c1222;color:#e2e8f0;font-size:11px;font-family:inherit;cursor:pointer;';
    for (const f of TYPE_FILTERS) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f === 'all' ? 'All Types' : f.charAt(0).toUpperCase() + f.slice(1);
      filterSelect.appendChild(opt);
    }
    filterSelect.onchange = () => {
      activeFilter = filterSelect.value;
      renderList();
    };

    controlsBar.append(recordBtn, clearBtn, filterSelect, exportAllBtn);

    // List container
    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex:1;overflow-y:auto;min-height:0;';

    // Detail panel (hidden by default)
    const detailContainer = document.createElement('div');
    detailContainer.style.cssText = 'display:none;flex:1;overflow-y:auto;min-height:0;padding:12px;';

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText =
      'padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;display:flex;justify-content:space-between;flex-shrink:0;';

    const footerLeft = document.createElement('span');
    footerLeft.textContent = 'Click a request to inspect';
    const footerRight = document.createElement('span');
    footerRight.textContent = 'Record → Inspect → Replay / Export';
    footer.append(footerLeft, footerRight);

    panel.append(header, controlsBar, listContainer, detailContainer, footer);

    // --- State ---
    let isRecording = false;

    // --- Buttons ---
    recordBtn.onclick = () => {
      if (disposed) return;
      if (isRecording) {
        capture.stop();
        isRecording = false;
        recordBtn.textContent = 'Start Recording';
        recordBtn.style.background = '#3b82f6';
        recordBtn.style.borderColor = '#3b82f6';
      } else {
        capture.clear();
        capture.start();
        isRecording = true;
        recordBtn.textContent = 'Stop Recording';
        recordBtn.style.background = '#ef4444';
        recordBtn.style.borderColor = '#ef4444';
        selectedRequestId = null;
        showList();
      }
      renderList();
    };

    clearBtn.onclick = () => {
      if (disposed) return;
      capture.clear();
      selectedRequestId = null;
      showList();
      renderList();
    };

    exportAllBtn.onclick = () => {
      if (disposed) return;
      const reqs = capture.getRequests();
      if (reqs.length === 0) return;
      const json = exportAsPostmanCollection(reqs.map(toExportRequest));
      copyToClipboard(json);
      flashButton(exportAllBtn, 'Copied!');
    };

    // --- Rendering ---
    function showList() {
      listContainer.style.display = '';
      detailContainer.style.display = 'none';
    }

    function showDetail() {
      listContainer.style.display = 'none';
      detailContainer.style.display = '';
    }

    function flashButton(btn: HTMLButtonElement, text: string) {
      const orig = btn.textContent;
      btn.textContent = text;
      btn.style.color = '#22c55e';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.color = '';
      }, 1200);
    }

    function copyToClipboard(text: string) {
      try {
        navigator.clipboard.writeText(text);
      } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    }

    function renderList() {
      while (listContainer.firstChild) listContainer.removeChild(listContainer.firstChild);

      const reqs = capture.getRequests();
      const filtered = activeFilter === 'all' ? reqs : reqs.filter((r) => r.resourceType === activeFilter);

      statsBar.textContent = `${filtered.length} requests`;

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:30px;text-align:center;color:#64748b;';
        empty.textContent = isRecording ? 'Listening for network requests...' : 'Press Start Recording to capture';
        listContainer.appendChild(empty);
        return;
      }

      for (const req of filtered) {
        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid #1e293b;cursor:pointer;';
        if (req.statusCode >= 400) row.style.background = 'rgba(239,68,68,.06)';
        else if (req.timing.duration > 1000) row.style.background = 'rgba(249,115,22,.06)';

        if (selectedRequestId === req.id) {
          row.style.background = 'rgba(59,130,246,.12)';
          row.style.borderLeft = '2px solid #3b82f6';
        }

        // Method badge
        const methodEl = document.createElement('span');
        const methodColor =
          req.method === 'GET'
            ? '#22c55e'
            : req.method === 'POST'
              ? '#3b82f6'
              : req.method === 'PUT'
                ? '#f59e0b'
                : req.method === 'DELETE'
                  ? '#ef4444'
                  : '#94a3b8';
        methodEl.style.cssText = `font-size:10px;font-weight:700;color:${methodColor};min-width:36px;flex-shrink:0;`;
        methodEl.textContent = req.method;

        // Status
        const statusEl = document.createElement('span');
        const statusColor =
          req.statusCode === 0
            ? '#6b7280'
            : req.statusCode < 300
              ? '#22c55e'
              : req.statusCode < 400
                ? '#3b82f6'
                : '#ef4444';
        statusEl.style.cssText = `font-size:10px;color:${statusColor};min-width:28px;flex-shrink:0;`;
        statusEl.textContent = req.statusCode === 0 ? 'ERR' : String(req.statusCode);

        // URL
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const shortUrl = req.url.split('/').pop() || req.url;
        nameEl.textContent = shortUrl.length > 40 ? shortUrl.slice(0, 37) + '...' : shortUrl;
        nameEl.title = req.url;

        // Type dot
        const dotEl = document.createElement('div');
        dotEl.style.cssText = `width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${TYPE_COLORS[req.resourceType] || TYPE_COLORS.other};`;

        // Duration
        const durEl = document.createElement('span');
        durEl.style.cssText = `font-size:10px;min-width:45px;text-align:right;flex-shrink:0;color:${req.timing.duration > 1000 ? '#ef4444' : req.timing.duration > 300 ? '#f59e0b' : '#94a3b8'};`;
        durEl.textContent = req.timing.duration.toFixed(0) + 'ms';

        // Size
        const sizeEl = document.createElement('span');
        sizeEl.style.cssText = 'font-size:10px;color:#94a3b8;min-width:55px;text-align:right;flex-shrink:0;';
        sizeEl.textContent = req.size > 1024 ? (req.size / 1024).toFixed(1) + 'KB' : req.size + 'B';

        row.append(dotEl, methodEl, statusEl, nameEl, durEl, sizeEl);

        row.onclick = () => {
          selectedRequestId = req.id;
          renderDetail(req);
          showDetail();
        };

        listContainer.appendChild(row);
      }

      listContainer.scrollTop = listContainer.scrollHeight;
    }

    function renderDetail(req: CapturedRequest) {
      while (detailContainer.firstChild) detailContainer.removeChild(detailContainer.firstChild);

      // Back button
      const backBtn = document.createElement('button');
      backBtn.style.cssText =
        'padding:4px 10px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;margin-bottom:8px;';
      backBtn.textContent = '← Back to list';
      backBtn.onclick = () => {
        selectedRequestId = null;
        showList();
        renderList();
      };
      detailContainer.appendChild(backBtn);

      // Action buttons row
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;';

      const replayBtn = createActionBtn('Replay', '#3b82f6');
      const curlBtn = createActionBtn('Copy cURL', '#334155');
      const fetchBtnEl = createActionBtn('Copy fetch()', '#334155');
      const postmanBtn = createActionBtn('Copy Postman', '#334155');

      replayBtn.onclick = () => {
        replayRequest(req);
        flashButton(replayBtn, 'Replayed!');
      };
      curlBtn.onclick = () => {
        copyToClipboard(exportAsCurl(toExportRequest(req)));
        flashButton(curlBtn, 'Copied!');
      };
      fetchBtnEl.onclick = () => {
        copyToClipboard(exportAsFetch(toExportRequest(req)));
        flashButton(fetchBtnEl, 'Copied!');
      };
      postmanBtn.onclick = () => {
        copyToClipboard(exportAsPostmanCollection([toExportRequest(req)]));
        flashButton(postmanBtn, 'Copied!');
      };

      actionsRow.append(replayBtn, curlBtn, fetchBtnEl, postmanBtn);
      detailContainer.appendChild(actionsRow);

      // Summary card
      const summaryEl = document.createElement('div');
      summaryEl.style.cssText = 'background:#1e293b;border-radius:8px;padding:10px;margin-bottom:10px;';

      const statusColor =
        req.statusCode < 300 ? '#22c55e' : req.statusCode < 400 ? '#3b82f6' : '#ef4444';

      const infoRow = document.createElement('div');
      infoRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;font-size:12px;';

      const fields = [
        { label: 'Method:', value: req.method, color: '#f1f5f9', bold: true },
        { label: 'Status:', value: `${req.statusCode} ${req.statusText}`, color: statusColor, bold: true },
        { label: 'Duration:', value: `${req.timing.duration.toFixed(1)}ms`, color: '#f1f5f9', bold: false },
        { label: 'Size:', value: req.size > 1024 ? (req.size / 1024).toFixed(1) + 'KB' : req.size + 'B', color: '#f1f5f9', bold: false },
        { label: 'Type:', value: req.resourceType, color: TYPE_COLORS[req.resourceType] || '#94a3b8', bold: false },
      ];

      for (const field of fields) {
        const span = document.createElement('span');
        const b = document.createElement('b');
        b.style.color = '#94a3b8';
        b.textContent = field.label + ' ';
        span.appendChild(b);
        const val = document.createElement('span');
        val.style.color = field.color;
        if (field.bold) val.style.fontWeight = '600';
        val.textContent = field.value;
        span.appendChild(val);
        infoRow.appendChild(span);
      }

      summaryEl.appendChild(infoRow);

      const urlRow = document.createElement('div');
      urlRow.style.cssText = 'margin-top:6px;font-size:11px;color:#94a3b8;word-break:break-all;';
      const urlLabel = document.createElement('b');
      urlLabel.textContent = 'URL: ';
      urlRow.appendChild(urlLabel);
      urlRow.appendChild(document.createTextNode(req.url));
      summaryEl.appendChild(urlRow);

      detailContainer.appendChild(summaryEl);

      // Tabs: Request Headers / Response Headers / Request Body / Response Body
      const tabBar = document.createElement('div');
      tabBar.style.cssText = 'display:flex;gap:2px;background:#0c1222;padding:2px;border-radius:6px;margin-bottom:8px;';

      const tabIds = ['req-headers', 'res-headers', 'req-body', 'res-body'];
      const tabLabels = ['Req Headers', 'Res Headers', 'Req Body', 'Res Body'];
      const tabBtns: Record<string, HTMLButtonElement> = {};

      const tabContent = document.createElement('div');
      tabContent.style.cssText =
        'background:#1e293b;border-radius:8px;padding:10px;font-family:\'SF Mono\',Consolas,monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:220px;overflow-y:auto;color:#e2e8f0;line-height:1.5;';

      function setTab(id: string) {
        for (const [tid, btn] of Object.entries(tabBtns)) {
          if (tid === id) {
            btn.style.background = '#1e293b';
            btn.style.color = '#f1f5f9';
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#64748b';
          }
        }
        switch (id) {
          case 'req-headers':
            tabContent.textContent = formatHeaders(req.requestHeaders);
            break;
          case 'res-headers':
            tabContent.textContent = formatHeaders(req.responseHeaders);
            break;
          case 'req-body':
            tabContent.textContent = req.requestBody || '(empty)';
            break;
          case 'res-body':
            tabContent.textContent = req.responseBody || '(empty)';
            break;
        }
      }

      for (let i = 0; i < tabIds.length; i++) {
        const btn = document.createElement('button');
        btn.style.cssText =
          'flex:1;padding:5px 8px;border:none;border-radius:4px;background:transparent;color:#64748b;font-size:11px;cursor:pointer;font-family:inherit;';
        btn.textContent = tabLabels[i];
        const tid = tabIds[i];
        btn.onclick = () => setTab(tid);
        tabBtns[tid] = btn;
        tabBar.appendChild(btn);
      }

      detailContainer.appendChild(tabBar);
      detailContainer.appendChild(tabContent);

      setTab('req-headers');
    }

    function createActionBtn(text: string, bg: string): HTMLButtonElement {
      const btn = document.createElement('button');
      btn.style.cssText = `padding:4px 10px;border-radius:6px;border:1px solid ${bg};background:${bg};color:${bg === '#334155' ? '#94a3b8' : '#fff'};font-size:11px;cursor:pointer;font-family:inherit;`;
      btn.textContent = text;
      btn.addEventListener('mouseenter', () => {
        btn.style.opacity = '0.8';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.opacity = '1';
      });
      return btn;
    }

    function formatHeaders(headers: Record<string, string>): string {
      const entries = Object.entries(headers);
      if (entries.length === 0) return '(no headers)';
      return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
    }

    function replayRequest(req: CapturedRequest) {
      const init: RequestInit = {
        method: req.method,
        headers: req.requestHeaders,
      };
      if (req.requestBody && req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = req.requestBody;
      }
      fetch(req.url, init).catch(() => {
        // Silently fail - replay is best-effort
      });
    }

    // Auto-start recording
    capture.start();
    isRecording = true;
    recordBtn.textContent = 'Stop Recording';
    recordBtn.style.background = '#ef4444';
    recordBtn.style.borderColor = '#ef4444';

    renderList();

    // Refresh list periodically while recording
    const refreshTimer = setInterval(() => {
      if (disposed) return;
      if (isRecording && selectedRequestId === null) {
        renderList();
      }
    }, 500);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearInterval(refreshTimer);
      capture.stop();
      overlays.forEach((o) => o.remove());
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
