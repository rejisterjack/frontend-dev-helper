import type { ToolDefinition } from '../types';

interface ViewTransitionInfo {
  isActive: boolean;
  phase: 'idle' | 'animating' | 'finished';
  pseudoElements: { name: string; type: string; styles: Record<string, string> }[];
  capturedElements: { name: string; element: Element | null; rect: DOMRect | null }[];
}

function isSupported(): boolean {
  return 'startViewTransition' in document;
}

function detectTransitionState(): ViewTransitionInfo {
  const info: ViewTransitionInfo = { isActive: false, phase: 'idle', pseudoElements: [], capturedElements: [] };

  const elementsWithTransitionName = document.querySelectorAll('[style*="view-transition-name"], [style*="viewTransitionName"]');
  for (const el of elementsWithTransitionName) {
    const style = (el as HTMLElement).style;
    const name = style.viewTransitionName || style.cssText.match(/view-transition-name:\s*([^;]+)/)?.[1];
    if (name && name !== 'none') {
      info.capturedElements.push({ name: name.trim(), element: el, rect: el.getBoundingClientRect() });
    }
  }

  info.pseudoElements = detectPseudoElements();
  if (info.capturedElements.length > 0 || info.pseudoElements.length > 0) {
    info.isActive = true;
    info.phase = 'animating';
  }
  return info;
}

function detectPseudoElements(): { name: string; type: string; styles: Record<string, string> }[] {
  const pseudoElements: { name: string; type: string; styles: Record<string, string> }[] = [];
  const sheets = document.styleSheets;
  for (const sheet of sheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          if (selector?.includes('::view-transition')) {
            const styles: Record<string, string> = {};
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              styles[prop] = rule.style.getPropertyValue(prop);
            }
            pseudoElements.push({ name: selector, type: getPseudoElementType(selector), styles });
          }
        }
      }
    } catch { /* cross-origin */ }
  }
  return pseudoElements;
}

function getPseudoElementType(selector: string): string {
  if (selector.includes('::view-transition-old')) return 'old';
  if (selector.includes('::view-transition-new')) return 'new';
  if (selector.includes('::view-transition-image-pair')) return 'image-pair';
  if (selector.includes('::view-transition-group')) return 'group';
  return 'root';
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'idle': return '#6c7086';
    case 'animating': return '#a6e3a1';
    case 'finished': return '#89b4fa';
    default: return '#cdd6f4';
  }
}

export const viewTransitionsDebugger: ToolDefinition = {
  id: 'view-transitions-debugger',
  name: 'View Transitions Debugger',
  description: 'Debug and preview View Transitions API animations',
  category: 'inspection',
  icon: 'RefreshCcw',
  configSchema: {
    captureSnapshots: { type: 'boolean', label: 'Capture Snapshots', default: true },
    slowMotion: { type: 'boolean', label: 'Slow Motion', default: false },
    slowMotionDuration: { type: 'slider', label: 'Duration (ms)', default: 2000, min: 500, max: 10000, step: 500 },
    showOverlay: { type: 'boolean', label: 'Show Overlay', default: true },
  },
  run: (ctx, _config) => {
    let mutationObserver: MutationObserver | null = null;

    const panelHost = document.createElement('div');
    panelHost.style.cssText = 'position:fixed;top:16px;right:16px;width:360px;max-height:80vh;z-index:2147483647;';
    const shadow = panelHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .panel{background:#1e1e2e;border:1px solid #45475a;border-radius:12px;padding:16px;font-family:-apple-system,sans-serif;font-size:13px;color:#cdd6f4;overflow-y:auto;max-height:80vh;box-shadow:0 20px 50px rgba(0,0,0,.5);}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #313244;}
      .title{font-weight:600;font-size:14px;}
      .close-btn{background:none;border:none;color:#6c7086;font-size:18px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;}
      .close-btn:hover{color:#f38ba8;}
      .status{padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;}
      .status-active{background:#a6e3a1;color:#1e1e2e;}
      .status-idle{background:#6c7086;color:#cdd6f4;}
      .warning{background:#f9e2af;color:#1e1e2e;padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;font-weight:600;}
      .section{margin-bottom:16px;}
      .section-label{color:#6c7086;font-size:11px;text-transform:uppercase;margin-bottom:4px;}
      .section-value{font-family:monospace;}
      .item{background:#313244;padding:8px 12px;border-radius:6px;margin-bottom:6px;font-family:monospace;font-size:12px;}
      .item-name{color:#89b4fa;font-weight:600;}
      .item-meta{color:#6c7086;font-size:11px;margin-top:2px;}
      .pseudo-name{color:#f5c2e7;}
      .refresh-btn{width:100%;padding:10px;background:#45475a;border:none;border-radius:6px;color:#cdd6f4;font-size:12px;cursor:pointer;margin-top:8px;}
      .refresh-btn:hover{background:#585b70;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'panel';

    function buildPanel(info: ViewTransitionInfo): void {
      while (panel.firstChild) panel.removeChild(panel.firstChild);

      const header = document.createElement('div');
      header.className = 'header';
      const titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.textContent = 'View Transitions Debugger';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status ' + (info.isActive ? 'status-active' : 'status-idle');
      statusSpan.textContent = info.isActive ? 'Active' : 'Idle';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', cleanup);
      header.append(titleDiv, statusSpan, closeBtn);
      panel.appendChild(header);

      if (!isSupported()) {
        const warning = document.createElement('div');
        warning.className = 'warning';
        warning.textContent = 'View Transitions API is not supported in this browser.';
        panel.appendChild(warning);
        return;
      }

      const phaseSection = document.createElement('div');
      phaseSection.className = 'section';
      const phaseLabel = document.createElement('div');
      phaseLabel.className = 'section-label';
      phaseLabel.textContent = 'Phase';
      const phaseValue = document.createElement('div');
      phaseValue.className = 'section-value';
      phaseValue.style.color = getPhaseColor(info.phase);
      phaseValue.textContent = info.phase;
      phaseSection.append(phaseLabel, phaseValue);
      panel.appendChild(phaseSection);

      if (info.capturedElements.length > 0) {
        const elementsSection = document.createElement('div');
        elementsSection.className = 'section';
        const elLabel = document.createElement('div');
        elLabel.className = 'section-label';
        elLabel.textContent = 'Captured Elements (' + info.capturedElements.length + ')';
        elementsSection.appendChild(elLabel);

        for (const el of info.capturedElements) {
          const item = document.createElement('div');
          item.className = 'item';
          const nameSpan = document.createElement('div');
          nameSpan.className = 'item-name';
          nameSpan.textContent = el.name;
          item.appendChild(nameSpan);
          if (el.rect) {
            const meta = document.createElement('div');
            meta.className = 'item-meta';
            meta.textContent = Math.round(el.rect.width) + '×' + Math.round(el.rect.height);
            item.appendChild(meta);
          }
          elementsSection.appendChild(item);
        }
        panel.appendChild(elementsSection);
      }

      if (info.pseudoElements.length > 0) {
        const pseudoSection = document.createElement('div');
        pseudoSection.className = 'section';
        const pseudoLabel = document.createElement('div');
        pseudoLabel.className = 'section-label';
        pseudoLabel.textContent = 'Pseudo-Elements (' + info.pseudoElements.length + ')';
        pseudoSection.appendChild(pseudoLabel);

        for (const pseudo of info.pseudoElements.slice(0, 5)) {
          const item = document.createElement('div');
          item.className = 'item';
          const nameSpan = document.createElement('div');
          nameSpan.className = 'pseudo-name';
          nameSpan.textContent = pseudo.name;
          item.appendChild(nameSpan);
          const meta = document.createElement('div');
          meta.className = 'item-meta';
          meta.textContent = 'type: ' + pseudo.type;
          item.appendChild(meta);
          pseudoSection.appendChild(item);
        }
        if (info.pseudoElements.length > 5) {
          const more = document.createElement('div');
          more.style.cssText = 'color:#6c7086;font-size:11px;text-align:center;';
          more.textContent = '+' + (info.pseudoElements.length - 5) + ' more';
          pseudoSection.appendChild(more);
        }
        panel.appendChild(pseudoSection);
      }

      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'refresh-btn';
      refreshBtn.textContent = 'Refresh Detection';
      refreshBtn.addEventListener('click', () => {
        const newInfo = detectTransitionState();
        buildPanel(newInfo);
      });
      panel.appendChild(refreshBtn);
    }

    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function updatePanel(): void {
      const info = detectTransitionState();
      buildPanel(info);
    }

    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target.style.viewTransitionName) {
            updatePanel();
            break;
          }
        }
      }
    });
    mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });

    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup(); };
    document.addEventListener('keydown', handleKeyDown, true);

    updatePanel();

    function cleanup() {
      if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
      document.removeEventListener('keydown', handleKeyDown, true);
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
