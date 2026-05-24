import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function parseRgb(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
  if (!match) return null;
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] !== undefined ? parseFloat(match[4]) : 1 };
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  });
}

export const colorPicker: ToolDefinition = {
  id: 'color-picker',
  name: 'Color Picker',
  description: 'Pick and copy colors from any element on the page',
  category: 'inspection',
  icon: 'Pipette',
  configSchema: {
    format: {
      type: 'select',
      label: 'Color Format',
      default: 'hex',
      options: [
        { label: 'HEX', value: 'hex' },
        { label: 'RGB', value: 'rgb' },
        { label: 'HSL', value: 'hsl' },
      ],
    },
    copyOnPick: { type: 'boolean', label: 'Copy on Pick', default: true },
    showTooltip: { type: 'boolean', label: 'Show Tooltip', default: true },
    includeOpacity: { type: 'boolean', label: 'Include Opacity', default: false },
  },
  run: (ctx, config) => {
    const format = (config?.format as string) ?? 'hex';
    const copyOnPick = (config?.copyOnPick as boolean) ?? true;
    const showTooltip = (config?.showTooltip as boolean) ?? true;
    const includeOpacity = (config?.includeOpacity as boolean) ?? false;

    let highlightBox: HTMLElement | null = null;
    let tooltip: HTMLElement | null = null;
    let panel: HTMLElement | null = null;
    let picked = false;

    function createHighlight(): void {
      if (highlightBox) return;
      highlightBox = document.createElement('div');
      highlightBox.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483641;
        border: 2px solid #6366f1;
        background: rgba(99, 102, 241, 0.08);
        border-radius: 2px;
        display: none;
      `;
      addOverlayElement(highlightBox);
    }

    function createTooltipEl(): void {
      if (tooltip) return;
      tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        border: 1px solid #45475a;
        display: none;
        white-space: nowrap;
      `;
      addOverlayElement(tooltip);
    }

    function isOwnElement(el: Element): boolean {
      if (!el) return false;
      if (el.classList) {
        for (let i = 0; i < el.classList.length; i++) {
          if (el.classList[i].startsWith('fdh-')) return true;
        }
      }
      return false;
    }

    function formatColor(rgb: { r: number; g: number; b: number; a: number }): { hex: string; rgb: string; hsl: string } {
      const hex = includeOpacity && rgb.a < 1
        ? rgbToHex(rgb.r, rgb.g, rgb.b) + Math.round(rgb.a * 255).toString(16).padStart(2, '0')
        : rgbToHex(rgb.r, rgb.g, rgb.b);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const rgbStr = includeOpacity && rgb.a < 1
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`
        : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      const hslStr = includeOpacity && rgb.a < 1
        ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgb.a})`
        : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      return { hex, rgb: rgbStr, hsl: hslStr };
    }

    function getFormattedValue(formatted: { hex: string; rgb: string; hsl: string }): string {
      switch (format) {
        case 'rgb': return formatted.rgb;
        case 'hsl': return formatted.hsl;
        default: return formatted.hex;
      }
    }

    function showPanel(colorRgb: { r: number; g: number; b: number; a: number }, bgRgb: { r: number; g: number; b: number; a: number }, clickX: number, clickY: number): void {
      removePanel();
      picked = true;

      panel = document.createElement('div');
      panel.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        border: 1px solid #313244;
        overflow: hidden;
        width: 280px;
        pointer-events: auto;
        cursor: default;
      `;

      const colorFormatted = formatColor(colorRgb);
      const bgFormatted = formatColor(bgRgb);

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #313244;background:#181825;';
      const titleSpan = document.createElement('span');
      titleSpan.style.cssText = 'font-weight:600;font-size:13px;';
      titleSpan.textContent = 'Color Picker';
      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'background:none;border:none;color:#6c7086;font-size:16px;cursor:pointer;padding:0 4px;';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => { removePanel(); picked = false; });
      header.append(titleSpan, closeBtn);
      panel.appendChild(header);

      function addColorSection(label: string, formatted: { hex: string; rgb: string; hsl: string }, rgb: { r: number; g: number; b: number; a: number }): void {
        const section = document.createElement('div');
        section.style.cssText = 'padding:10px 14px;';

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
        const labelEl = document.createElement('span');
        labelEl.style.cssText = 'font-size:11px;color:#6c7086;width:85px;flex-shrink:0;';
        labelEl.textContent = label;
        const swatch = document.createElement('div');
        swatch.style.cssText = `width:32px;height:32px;border-radius:6px;background:${formatted.hex};border:2px solid #45475a;flex-shrink:0;`;
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        const makeRow = (fmtLabel: string, value: string): void => {
          const r = document.createElement('div');
          r.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:3px 8px;border-radius:4px;cursor:pointer;margin-bottom:2px;font-family:'JetBrains Mono',monospace;font-size:12px;`;
          r.addEventListener('mouseenter', () => { r.style.background = '#313244'; });
          r.addEventListener('mouseleave', () => { r.style.background = 'transparent'; });
          const lbl = document.createElement('span');
          lbl.style.cssText = 'color:#6c7086;font-size:11px;';
          lbl.textContent = fmtLabel;
          const val = document.createElement('span');
          val.style.cssText = 'color:#cdd6f4;';
          val.textContent = value;
          r.append(lbl, val);
          r.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(value);
            val.textContent = 'Copied!';
            val.style.color = '#a6e3a1';
            setTimeout(() => { val.textContent = value; val.style.color = '#cdd6f4'; }, 1200);
          });
          info.appendChild(r);
        };

        makeRow('HEX', formatted.hex);
        makeRow('RGB', formatted.rgb);
        makeRow('HSL', formatted.hsl);
        row.append(labelEl, swatch, info);
        section.appendChild(row);
        panel!.appendChild(section);
      }

      addColorSection('Text Color', colorFormatted, colorRgb);
      addColorSection('Background', bgFormatted, bgRgb);

      const hint = document.createElement('div');
      hint.style.cssText = 'padding:8px 14px;border-top:1px solid #313244;font-size:11px;color:#585b70;text-align:center;';
      hint.textContent = 'Click a value to copy • Press ESC to exit';
      panel.appendChild(hint);

      document.body.appendChild(panel);

      requestAnimationFrame(() => {
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        let left = clickX + 16;
        let top = clickY + 16;
        if (left + rect.width > window.innerWidth - 16) left = clickX - rect.width - 16;
        if (top + rect.height > window.innerHeight - 16) top = clickY - rect.height - 16;
        panel.style.left = Math.max(16, left) + 'px';
        panel.style.top = Math.max(16, top) + 'px';
      });
    }

    function removePanel(): void {
      if (panel) { panel.remove(); panel = null; }
    }

    function removeHighlight(): void {
      if (highlightBox) { highlightBox.style.display = 'none'; }
    }

    function removeTooltip(): void {
      if (tooltip) { tooltip.style.display = 'none'; }
    }

    createHighlight();
    createTooltipEl();

    const handleMouseMove = (e: MouseEvent) => {
      if (picked) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || isOwnElement(target) || target === document.documentElement || target === document.body) {
        removeHighlight();
        removeTooltip();
        return;
      }

      const cs = window.getComputedStyle(target);
      const colorStr = cs.color;
      const bgStr = cs.backgroundColor;
      const colorRgb = parseRgb(colorStr);
      const bgRgb = parseRgb(bgStr);

      if (!colorRgb) { removeHighlight(); removeTooltip(); return; }

      const formatted = formatColor(colorRgb);
      const mainValue = getFormattedValue(formatted);

      if (highlightBox) {
        const rect = target.getBoundingClientRect();
        highlightBox.style.display = 'block';
        highlightBox.style.top = rect.top + 'px';
        highlightBox.style.left = rect.left + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
      }

      if (showTooltip && tooltip) {
        tooltip.style.display = 'block';
        const swatch = document.createElement('span');
        swatch.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:3px;background:${formatted.hex};margin-right:6px;vertical-align:middle;border:1px solid #45475a;`;
        const text = document.createElement('span');
        text.textContent = mainValue;
        while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
        tooltip.append(swatch, text);

        const pad = 16;
        let left = e.clientX + pad;
        let top = e.clientY - 30;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        requestAnimationFrame(() => {
          if (!tooltip) return;
          const tr = tooltip.getBoundingClientRect();
          if (left + tr.width > window.innerWidth - pad) left = e.clientX - tr.width - pad;
          if (top < pad) top = e.clientY + pad;
          tooltip.style.left = Math.max(pad, left) + 'px';
          tooltip.style.top = Math.max(pad, top) + 'px';
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || isOwnElement(target)) {
        if (panel && panel.contains(e.target as Node)) return;
        return;
      }
      if (panel && panel.contains(e.target as Node)) return;

      e.preventDefault();
      e.stopPropagation();

      const cs = window.getComputedStyle(target);
      const colorRgb = parseRgb(cs.color);
      const bgRgb = parseRgb(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };

      if (!colorRgb) return;

      if (copyOnPick) {
        const formatted = formatColor(colorRgb);
        copyToClipboard(getFormattedValue(formatted));
      }

      showPanel(colorRgb, bgRgb, e.clientX, e.clientY);
      removeHighlight();
      removeTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (picked) { removePanel(); picked = false; }
        else cleanup();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.body.style.cursor = 'crosshair';

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.cursor = '';
      picked = false;
      if (highlightBox) { removeOverlayElement(highlightBox); highlightBox = null; }
      if (tooltip) { removeOverlayElement(tooltip); tooltip = null; }
      removePanel();
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
