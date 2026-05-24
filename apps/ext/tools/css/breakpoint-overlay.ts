import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

const TAILWIND_BREAKPOINTS: Record<string, number> = {
  sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536,
};

const BOOTSTRAP_BREAKPOINTS: Record<string, number> = {
  xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400,
};

type Framework = 'tailwind' | 'bootstrap';
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const BREAKPOINT_COLORS: Record<string, string> = {
  xs: '#ef4444', sm: '#f97316', md: '#eab308', lg: '#22c55e',
  xl: '#3b82f6', '2xl': '#8b5cf6', xxl: '#a855f7',
};

function getBreakpointName(width: number, framework: Framework): string {
  const bp = framework === 'tailwind' ? TAILWIND_BREAKPOINTS : BOOTSTRAP_BREAKPOINTS;
  const sorted = Object.entries(bp).sort((a, b) => b[1] - a[1]);
  for (const [name, val] of sorted) {
    if (width >= val) return name;
  }
  return 'xs';
}

function getNextBreakpoint(width: number, framework: Framework): string | undefined {
  const bp = framework === 'tailwind' ? TAILWIND_BREAKPOINTS : BOOTSTRAP_BREAKPOINTS;
  const sorted = Object.entries(bp).sort((a, b) => a[1] - b[1]);
  for (const [name, val] of sorted) {
    if (width < val) return name;
  }
  return undefined;
}

export const breakpointOverlay: ToolDefinition = {
  id: 'breakpoint-overlay',
  name: 'Breakpoint Overlay',
  description: 'Show active CSS breakpoints and media query boundaries',
  category: 'css',
  icon: 'Monitor',
  configSchema: {
    showIndicator: { type: 'boolean', label: 'Show Indicator', default: true },
    showAllBreakpoints: { type: 'boolean', label: 'Show All Breakpoints', default: false },
    highlightActive: { type: 'boolean', label: 'Highlight Active', default: true },
    position: {
      type: 'select', label: 'Position', default: 'top-right',
      options: [
        { label: 'Top Right', value: 'top-right' },
        { label: 'Top Left', value: 'top-left' },
        { label: 'Bottom Right', value: 'bottom-right' },
        { label: 'Bottom Left', value: 'bottom-left' },
      ],
    },
  },
  run: (ctx, config) => {
    let framework: Framework = 'tailwind';
    const position = (config?.position as Position) ?? 'bottom-right';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;z-index:2147483647;
      font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;
      user-select:none;pointer-events:auto;
    `;

    const positions: Record<Position, Record<string, string>> = {
      'top-left': { top: '16px', left: '16px' },
      'top-right': { top: '16px', right: '16px' },
      'bottom-left': { bottom: '16px', left: '16px' },
      'bottom-right': { bottom: '16px', right: '16px' },
    };
    Object.assign(overlay.style, positions[position]);

    addOverlayElement(overlay);

    function buildOverlay() {
      overlay.textContent = '';
      const width = window.innerWidth;
      const height = window.innerHeight;
      const bpName = getBreakpointName(width, framework);
      const nextBp = getNextBreakpoint(width, framework);
      const color = BREAKPOINT_COLORS[bpName] || '#94a3b8';

      const card = document.createElement('div');
      card.style.cssText = `
        background:#1e293b;border:1px solid #334155;border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);overflow:hidden;min-width:140px;
      `;

      // Main info
      const main = document.createElement('div');
      main.style.cssText = 'padding:12px 16px;text-align:center;border-bottom:1px solid #334155';

      const sizeDiv = document.createElement('div');
      sizeDiv.style.cssText = 'color:#f8fafc;font-weight:600;font-size:14px;margin-bottom:4px';
      const widthSpan = document.createElement('span');
      widthSpan.id = 'fdh-bp-width';
      widthSpan.textContent = `${width}px`;
      const xSpan = document.createElement('span');
      xSpan.style.cssText = 'color:#64748b;margin:0 4px';
      xSpan.textContent = 'x';
      const heightSpan = document.createElement('span');
      heightSpan.id = 'fdh-bp-height';
      heightSpan.textContent = `${height}px`;
      sizeDiv.appendChild(widthSpan);
      sizeDiv.appendChild(xSpan);
      sizeDiv.appendChild(heightSpan);
      main.appendChild(sizeDiv);

      const nameDiv = document.createElement('div');
      nameDiv.style.cssText = `color:${color};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600`;
      nameDiv.textContent = nextBp ? `${bpName} (< ${framework === 'tailwind' ? TAILWIND_BREAKPOINTS[nextBp] : BOOTSTRAP_BREAKPOINTS[nextBp]}px)` : bpName;
      main.appendChild(nameDiv);
      card.appendChild(main);

      // Resize presets
      const presets = document.createElement('div');
      presets.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:8px;border-bottom:1px solid #334155';

      const devices = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Laptop', width: 1440, height: 900 },
        { name: 'Desktop', width: 1920, height: 1080 },
      ];

      for (const device of devices) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.width = String(device.width);
        btn.dataset.height = String(device.height);
        btn.title = `${device.name}: ${device.width}x${device.height}`;
        btn.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:2px;
          padding:6px 8px;background:#0f172a;border:1px solid #334155;border-radius:4px;
          color:#94a3b8;cursor:pointer;font-family:inherit;font-size:10px;
        `;
        const label = document.createElement('span');
        label.style.cssText = 'font-size:14px';
        label.textContent = device.width <= 667 ? '\u{1F4F1}' : device.width <= 1024 ? '\u{1F4F1}' : device.width <= 1440 ? '\u{1F4BB}' : '\u{1F5A5}';
        const sizeLabel = document.createElement('span');
        sizeLabel.style.cssText = 'font-size:9px';
        sizeLabel.textContent = `${device.width}px`;
        btn.appendChild(label);
        btn.appendChild(sizeLabel);
        presets.appendChild(btn);
      }
      card.appendChild(presets);

      // Framework toggle
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;padding:4px;background:#0f172a;gap:2px';

      for (const fw of ['tailwind', 'bootstrap'] as const) {
        const fwBtn = document.createElement('button');
        fwBtn.type = 'button';
        fwBtn.dataset.framework = fw;
        const isActive = framework === fw;
        fwBtn.style.cssText = `
          flex:1;padding:4px 8px;background:${isActive ? '#334155' : 'transparent'};
          border:none;border-radius:3px;color:${isActive ? '#f8fafc' : '#64748b'};
          cursor:pointer;font-family:inherit;font-size:10px;
          font-weight:${isActive ? '600' : '400'};
        `;
        fwBtn.textContent = fw === 'tailwind' ? 'Tailwind' : 'Bootstrap';
        footer.appendChild(fwBtn);
      }
      card.appendChild(footer);
      overlay.appendChild(card);

      attachListeners();
    }

    function attachListeners() {
      overlay.querySelectorAll('[data-framework]').forEach(btn => {
        btn.addEventListener('click', e => {
          framework = (e.currentTarget as HTMLElement).dataset.framework as Framework;
          buildOverlay();
        });
      });

      overlay.querySelectorAll('[data-width]').forEach(btn => {
        btn.addEventListener('click', e => {
          const t = e.currentTarget as HTMLElement;
          const w = parseInt(t.dataset.width || '0', 10);
          const h = parseInt(t.dataset.height || '0', 10);
          try {
            window.resizeTo(w, h);
            window.moveTo(Math.max(0, (window.screen.availWidth - w) / 2), Math.max(0, (window.screen.availHeight - h) / 2));
          } catch { /* not available */ }
          showResizeFeedback(w);
        });

        btn.addEventListener('mouseenter', e => {
          const t = e.currentTarget as HTMLElement;
          t.style.background = '#1e293b';
          t.style.borderColor = '#475569';
          t.style.color = '#f8fafc';
        });
        btn.addEventListener('mouseleave', e => {
          const t = e.currentTarget as HTMLElement;
          t.style.background = '#0f172a';
          t.style.borderColor = '#334155';
          t.style.color = '#94a3b8';
        });
      });
    }

    function showResizeFeedback(targetWidth: number) {
      const feedback = document.createElement('div');
      feedback.style.cssText = `
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:#1e293b;color:#22c55e;padding:12px 24px;border-radius:8px;
        font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;
        border:1px solid #22c55e;box-shadow:0 4px 12px rgba(0,0,0,0.3);
        z-index:2147483647;pointer-events:none;opacity:0;transition:opacity 0.2s ease;
      `;
      feedback.textContent = `Target: ${targetWidth}px`;
      document.body.appendChild(feedback);
      requestAnimationFrame(() => { feedback.style.opacity = '1'; });
      setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => feedback.remove(), 200);
      }, 1500);
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildOverlay, 100);
    }

    window.addEventListener('resize', onResize);
    buildOverlay();

    function cleanup() {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      removeOverlayElement(overlay);
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
