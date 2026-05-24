import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

export const componentAnalyzer: ToolDefinition = {
  id: 'component-analyzer',
  name: 'Component Analyzer',
  description: 'Analyze UI components and generate reusable code snippets',
  category: 'ai',
  icon: 'Puzzle',
  configSchema: {
    targetFramework: {
      type: 'select',
      label: 'Target Framework',
      default: 'react',
      options: [
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' },
        { label: 'HTML/CSS', value: 'html' },
        { label: 'Svelte', value: 'svelte' },
      ],
    },
    includeStyles: { type: 'boolean', label: 'Include Styles', default: true },
    includeProps: { type: 'boolean', label: 'Include Props/Types', default: true },
    extractVariants: { type: 'boolean', label: 'Extract Variants', default: false },
  },
  run: (ctx, _config) => {
    const overlays: HTMLElement[] = [];
    let disposed = false;
    let hoveredEl: HTMLElement | null = null;

    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;display:none;' +
      'background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 14px;max-width:360px;' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);';
    addOverlayElement(tooltip);
    overlays.push(tooltip);

    const highlight = document.createElement('div');
    highlight.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;display:none;' +
      'border:2px solid #a855f7;background:rgba(168,85,247,.08);border-radius:3px;transition:all .05s ease;';
    addOverlayElement(highlight);
    overlays.push(highlight);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:16px;right:16px;width:380px;max-height:400px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;';
    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = 'font-weight:600;font-size:13px;';
    headerTitle.textContent = 'Component Analyzer';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    header.append(headerTitle, closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:12px 14px;';
    body.textContent = 'Hover over elements to analyze them with AI. Click to pin the analysis.';

    const status = document.createElement('div');
    status.style.cssText = 'padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;';
    status.textContent = 'Waiting for element selection...';

    panel.append(header, body, status);

    function getElementInfo(el: HTMLElement): string {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? '#' + el.id : '';
      const classes = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 3).join('.') : '';
      const role = el.getAttribute('role') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const html = el.outerHTML.slice(0, 500);
      return 'Tag: ' + tag + id + classes + '\nRole: ' + (role || 'none') + '\nAria: ' + (ariaLabel || 'none') +
        '\nSize: ' + Math.round(rect.width) + 'x' + Math.round(rect.height) +
        '\nDisplay: ' + styles.display + '\nFont: ' + styles.fontFamily.split(',')[0] + ', ' + styles.fontSize +
        '\nHTML snippet: ' + html;
    }

    async function analyzeElement(el: HTMLElement) {
      const info = getElementInfo(el);
      status.textContent = 'Analyzing element...';
      try {
        const resp = await browser.runtime.sendMessage({
          type: 'LLM_QUERY',
          payload: { query: 'Analyze this UI element for accessibility, performance, and best practice issues. Suggest improvements:\n\n' + info },
        });
        if (disposed) return;
        if (resp?.response) {
          while (body.firstChild) body.removeChild(body.firstChild);
          const pre = document.createElement('div');
          pre.style.cssText = 'white-space:pre-wrap;line-height:1.6;font-size:12px;color:#cbd5e1;';
          pre.textContent = resp.response;
          body.appendChild(pre);
          status.textContent = 'Analysis complete. Hover another element or close.';
        } else {
          status.textContent = 'No AI response. Check API key in Settings.';
        }
      } catch {
        status.textContent = 'AI analysis failed.';
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target === document.documentElement || target === document.body) return;
      if (panel.contains(target)) return;
      hoveredEl = target;
      const rect = target.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.top = (rect.top - 1) + 'px';
      highlight.style.left = (rect.left - 1) + 'px';
      highlight.style.width = (rect.width + 2) + 'px';
      highlight.style.height = (rect.height + 2) + 'px';

      tooltip.style.display = 'block';
      tooltip.style.top = (rect.top - 30) + 'px';
      tooltip.style.left = rect.left + 'px';
      tooltip.textContent = target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') +
        (target.className && typeof target.className === 'string' ? '.' + target.className.split(' ')[0] : '');
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || panel.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (hoveredEl) {
        while (body.firstChild) body.removeChild(body.firstChild);
        const loading = document.createElement('div');
        loading.style.cssText = 'color:#94a3b8;text-align:center;padding:20px;';
        loading.textContent = 'Analyzing...';
        body.appendChild(loading);
        analyzeElement(hoveredEl);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup();
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      overlays.forEach(o => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
