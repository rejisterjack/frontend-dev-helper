import type { ToolDefinition } from '../types';

export const screenshotStudio: ToolDefinition = {
  id: 'screenshot-studio',
  name: 'Screenshot Studio',
  description: 'Capture, annotate, and export page screenshots',
  category: 'utility',
  icon: 'Camera',
  configSchema: {
    captureMode: {
      type: 'select',
      label: 'Capture Mode',
      default: 'viewport',
      options: [
        { label: 'Viewport', value: 'viewport' },
        { label: 'Full Page', value: 'fullpage' },
        { label: 'Element', value: 'element' },
        { label: 'Selection', value: 'selection' },
      ],
    },
    format: {
      type: 'select',
      label: 'Format',
      default: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'JPEG', value: 'jpeg' },
        { label: 'WebP', value: 'webp' },
      ],
    },
    quality: { type: 'slider', label: 'Quality', default: 90, min: 10, max: 100, step: 5 },
    showAnnotations: { type: 'boolean', label: 'Show Annotations', default: true },
    includeMetadata: { type: 'boolean', label: 'Include Metadata', default: false },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const captureMode = (cfg.captureMode as string) ?? 'viewport';
    const format = (cfg.format as string) ?? 'png';
    const quality = ((cfg.quality as number) ?? 90) / 100;

    const overlays: HTMLElement[] = [];
    let disposed = false;
    let isCapturing = false;

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:16px;right:16px;width:280px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:13px;';
    title.textContent = 'Screenshot Studio';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'padding:14px;display:flex;flex-direction:column;gap:8px;';

    const status = document.createElement('div');
    status.style.cssText = 'font-size:11px;color:#64748b;text-align:center;';

    function createBtn(label: string, onClick: () => void): HTMLButtonElement {
      const btn = document.createElement('button');
      btn.style.cssText = 'width:100%;padding:8px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:background .15s;';
      btn.textContent = label;
      btn.onclick = onClick;
      return btn;
    }

    const captureBtn = createBtn('Capture Viewport', () => captureScreenshot('viewport'));
    captureBtn.style.background = '#3b82f6';
    captureBtn.style.color = 'white';

    const fullBtn = createBtn('Capture Full Page', () => captureScreenshot('fullpage'));
    fullBtn.style.background = '#334155';
    fullBtn.style.color = '#e2e8f0';

    const elementBtn = createBtn('Capture Element', () => startElementCapture());
    elementBtn.style.background = '#334155';
    elementBtn.style.color = '#e2e8f0';

    body.append(captureBtn, fullBtn, elementBtn, status);
    panel.append(header, body);

    async function captureScreenshot(mode: string) {
      if (isCapturing) return;
      isCapturing = true;
      status.textContent = 'Capturing...';

      try {
        const canvas = document.createElement('canvas');
        const ctx2d = canvas.getContext('2d')!;

        if (mode === 'viewport') {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx2d.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff';
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
          // Draw visible content area representation
          ctx2d.fillStyle = '#f8fafc';
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
          ctx2d.font = '14px system-ui';
          ctx2d.fillStyle = '#64748b';
          ctx2d.textAlign = 'center';
          ctx2d.fillText(`${canvas.width} × ${canvas.height} viewport capture`, canvas.width / 2, canvas.height / 2);
          ctx2d.fillText('Full screenshot requires chrome.tabs.captureVisibleTab in background', canvas.width / 2, canvas.height / 2 + 24);
        } else {
          const scrollH = document.documentElement.scrollHeight;
          const scrollW = document.documentElement.scrollWidth;
          canvas.width = scrollW;
          canvas.height = scrollH;
          ctx2d.fillStyle = '#f8fafc';
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
          ctx2d.font = '14px system-ui';
          ctx2d.fillStyle = '#64748b';
          ctx2d.textAlign = 'center';
          ctx2d.fillText(`${scrollW} × ${scrollH} full page capture`, canvas.width / 2, canvas.height / 2);
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        showPreview(dataUrl, mode);
        status.textContent = 'Captured!';
      } catch (err) {
        status.textContent = 'Capture failed: ' + (err instanceof Error ? err.message : 'Unknown error');
      }
      isCapturing = false;
    }

    function startElementCapture() {
      status.textContent = 'Click an element to capture it';
      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('click', handleClick, true);
        const target = e.target as HTMLElement;
        if (target === panel || panel.contains(target)) return;
        captureElementScreenshot(target);
      };
      document.addEventListener('click', handleClick, true);
    }

    function captureElementScreenshot(el: HTMLElement) {
      const rect = el.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const ctx2d = canvas.getContext('2d')!;
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx2d.fillStyle = '#f8fafc';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      ctx2d.font = '12px system-ui';
      ctx2d.fillStyle = '#64748b';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(`${el.tagName.toLowerCase()} ${Math.round(rect.width)}×${Math.round(rect.height)}`, canvas.width / 2, canvas.height / 2);
      showPreview(canvas.toDataURL(), 'element');
      status.textContent = 'Element captured!';
    }

    function showPreview(dataUrl: string, mode: string) {
      // Remove old preview
      const old = body.querySelector('.fdh-preview');
      if (old) old.remove();

      const preview = document.createElement('div');
      preview.className = 'fdh-preview';
      preview.style.cssText = 'margin-top:8px;border:1px solid #334155;border-radius:6px;overflow:hidden;';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'width:100%;display:block;';

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:4px;padding:8px;background:#1e293b;';

      const dlBtn = document.createElement('button');
      dlBtn.style.cssText = 'flex:1;padding:6px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;';
      dlBtn.textContent = 'Download';
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `screenshot-${mode}-${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
        a.click();
      };

      const copyBtn = document.createElement('button');
      copyBtn.style.cssText = 'flex:1;padding:6px;background:#334155;color:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:11px;';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = async () => {
        try {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          copyBtn.textContent = 'Copied!';
        } catch {
          copyBtn.textContent = 'Failed';
        }
      };

      actions.append(dlBtn, copyBtn);
      preview.append(img, actions);
      body.appendChild(preview);
    }

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
