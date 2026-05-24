import type { ToolDefinition } from '../types';

export const responsivePreview: ToolDefinition = {
  id: 'responsive-preview',
  name: 'Responsive Preview',
  description: 'Preview the page at different screen sizes and device viewports',
  category: 'utility',
  icon: 'Smartphone',
  configSchema: {
    device: {
      type: 'select',
      label: 'Device',
      default: 'iphone-14',
      options: [
        { label: 'iPhone 14', value: 'iphone-14' },
        { label: 'iPhone 14 Pro Max', value: 'iphone-14-pro-max' },
        { label: 'iPad', value: 'ipad' },
        { label: 'iPad Pro', value: 'ipad-pro' },
        { label: 'Pixel 7', value: 'pixel-7' },
        { label: 'Galaxy S23', value: 'galaxy-s23' },
        { label: 'Laptop', value: 'laptop' },
        { label: 'Desktop', value: 'desktop' },
      ],
    },
    showDeviceFrame: { type: 'boolean', label: 'Show Device Frame', default: true },
    rotate: { type: 'boolean', label: 'Rotate', default: false },
    scaleToFit: { type: 'boolean', label: 'Scale to Fit', default: true },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const showFrame = (cfg.showDeviceFrame as boolean) ?? true;
    const rotated = (cfg.rotate as boolean) ?? false;

    const overlays: HTMLElement[] = [];
    let disposed = false;

    const DEVICES: Record<string, { w: number; h: number; label: string }> = {
      'iphone-14': { w: 390, h: 844, label: 'iPhone 14' },
      'iphone-14-pro-max': { w: 430, h: 932, label: 'iPhone 14 Pro Max' },
      'ipad': { w: 768, h: 1024, label: 'iPad' },
      'ipad-pro': { w: 1024, h: 1366, label: 'iPad Pro' },
      'pixel-7': { w: 412, h: 915, label: 'Pixel 7' },
      'galaxy-s23': { w: 360, h: 780, label: 'Galaxy S23' },
      'laptop': { w: 1440, h: 900, label: 'Laptop' },
      'desktop': { w: 1920, h: 1080, label: 'Desktop' },
    };

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:12px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;gap:8px;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:13px;';
    title.textContent = 'Responsive Preview';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    header.append(title, closeBtn);

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:8px 14px;background:#1e293b;border-bottom:1px solid #334155;';

    const rotateBtn = document.createElement('button');
    rotateBtn.style.cssText = 'background:#334155;border:none;color:#e2e8f0;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;';
    rotateBtn.textContent = rotated ? '↻ Rotated' : '↻ Rotate';
    rotateBtn.onclick = () => {
      const iframeWrap = panel.querySelector('.fdh-iframe-wrap') as HTMLElement;
      if (iframeWrap) {
        const isRotated = iframeWrap.dataset.rotated === 'true';
        iframeWrap.dataset.rotated = String(!isRotated);
        applySize(iframeWrap);
      }
    };

    for (const [key, dev] of Object.entries(DEVICES)) {
      const btn = document.createElement('button');
      btn.style.cssText = 'background:#334155;border:none;color:#e2e8f0;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;';
      btn.textContent = dev.label;
      btn.onclick = () => {
        const iframeWrap = panel.querySelector('.fdh-iframe-wrap') as HTMLElement;
        if (iframeWrap) {
          iframeWrap.dataset.device = key;
          applySize(iframeWrap);
        }
        toolbar.querySelectorAll('button').forEach(b => b.style.background = '#334155');
        btn.style.background = '#6366f1';
      };
      toolbar.appendChild(btn);
    }
    toolbar.appendChild(rotateBtn);

    const viewport = document.createElement('div');
    viewport.style.cssText = 'padding:16px;display:flex;justify-content:center;align-items:center;max-height:500px;overflow:auto;';

    const iframeWrap = document.createElement('div');
    iframeWrap.className = 'fdh-iframe-wrap';
    iframeWrap.dataset.device = (cfg.device as string) || 'iphone-14';
    iframeWrap.dataset.rotated = String(rotated);
    iframeWrap.style.cssText = 'position:relative;border:2px solid #475569;border-radius:12px;overflow:hidden;background:white;transition:all .3s ease;';

    const dims = document.createElement('div');
    dims.style.cssText = 'position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);font-size:10px;color:#64748b;white-space:nowrap;';
    iframeWrap.appendChild(dims);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    iframe.src = location.href;
    iframeWrap.appendChild(iframe);

    viewport.appendChild(iframeWrap);
    panel.append(header, toolbar, viewport);

    function applySize(wrap: HTMLElement) {
      const dev = DEVICES[wrap.dataset.device || 'iphone-14'];
      if (!dev) return;
      const isRotated = wrap.dataset.rotated === 'true';
      const w = isRotated ? dev.h : dev.w;
      const h = isRotated ? dev.w : dev.h;
      const maxW = Math.min(w, window.innerWidth - 80);
      const scale = maxW / w;
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      wrap.style.transform = scale < 1 ? `scale(${scale})` : '';
      wrap.style.transformOrigin = 'top center';
      dims.textContent = `${w} × ${h} (${dev.label}${isRotated ? ' rotated' : ''})`;
    }

    applySize(iframeWrap);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      overlays.forEach(o => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
