import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  if (!fgRgb || !bgRgb) return 1;

  const l1 = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (color.startsWith('#')) return hexToRgb(color);
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10) };
}

function sanitizeColor(color: string): string {
  const parsed = parseColor(color);
  if (!parsed) return '#000000';
  return rgbToHex(`rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`) || '#000000';
}

interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
  suggestions: string[];
}

function analyzeContrast(fg: string, bg: string): ContrastResult {
  const ratio = getContrastRatio(fg, bg);
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7;
  const wcagAALarge = ratio >= 3;
  const wcagAAALarge = ratio >= 4.5;
  const suggestions: string[] = [];

  if (!wcagAA) suggestions.push('Consider using a darker text color or lighter background');
  if (ratio < 3) suggestions.push('This combination may be difficult to read for many users');

  const rgb1 = parseColor(fg);
  const rgb2 = parseColor(bg);
  if (rgb1 && rgb2) {
    const diff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    if (diff < 50) suggestions.push('Colors are very similar - increase the contrast difference');
  }

  return { ratio, wcagAA, wcagAAA, wcagAALarge, wcagAAALarge, suggestions };
}

export const contrastChecker: ToolDefinition = {
  id: 'contrast-checker',
  name: 'Contrast Checker',
  description: 'Check color contrast ratios against WCAG standards',
  category: 'css',
  icon: 'Contrast',
  configSchema: {
    standard: {
      type: 'select',
      label: 'WCAG Standard',
      default: 'aa',
      options: [
        { label: 'WCAG AA', value: 'aa' },
        { label: 'WCAG AAA', value: 'aaa' },
      ],
    },
    scanAll: { type: 'boolean', label: 'Scan All Text', default: true },
    highlightFailing: { type: 'boolean', label: 'Highlight Failing', default: true },
    showRatio: { type: 'boolean', label: 'Show Ratio', default: true },
    failingColor: { type: 'color', label: 'Failing Highlight', default: '#ef4444' },
  },
  run: (ctx) => {
    let fgColor = '#000000';
    let bgColor = '#ffffff';
    let pickerMode: 'foreground' | 'background' | null = null;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      z-index:2147483647;background:rgba(15,23,42,0.98);
      border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:24px;
      min-width:380px;font-family:'JetBrains Mono','Fira Code',system-ui,sans-serif;
      font-size:14px;color:#e2e8f0;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);
      backdrop-filter:blur(12px);pointer-events:auto;
    `;
    addOverlayElement(overlay);

    function buildOverlay() {
      overlay.textContent = '';
      const result = analyzeContrast(fgColor, bgColor);
      let gradeColor = '#ef4444';
      let grade = 'Fail';
      if (result.wcagAAA) { gradeColor = '#22c55e'; grade = 'AAA'; }
      else if (result.wcagAA) { gradeColor = '#3b82f6'; grade = 'AA'; }

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:20px';

      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center';

      const title = document.createElement('h3');
      title.style.cssText = 'margin:0;font-size:18px;color:#c084fc';
      title.textContent = 'Contrast Checker';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'fdh-cc-close';
      closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px';
      closeBtn.textContent = '×';

      headerRow.appendChild(title);
      headerRow.appendChild(closeBtn);
      header.appendChild(headerRow);

      const subtitle = document.createElement('p');
      subtitle.style.cssText = 'margin:8px 0 0;font-size:12px;color:#64748b';
      subtitle.textContent = 'WCAG 2.1 Level AA requires 4.5:1 for normal text, 3:1 for large text';
      header.appendChild(subtitle);
      overlay.appendChild(header);

      // Color pickers row
      const colorsRow = document.createElement('div');
      colorsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px';

      const fgPicker = createColorPicker('Foreground', fgColor, 'foreground', pickerMode === 'foreground');
      const bgPicker = createColorPicker('Background', bgColor, 'background', pickerMode === 'background');
      colorsRow.appendChild(fgPicker);
      colorsRow.appendChild(bgPicker);
      overlay.appendChild(colorsRow);

      // Results
      const results = document.createElement('div');
      results.style.cssText = 'background:rgba(30,41,59,0.5);border-radius:12px;padding:20px;margin-bottom:20px';

      const ratioDiv = document.createElement('div');
      ratioDiv.style.cssText = 'text-align:center;margin-bottom:16px';
      const ratioNum = document.createElement('div');
      ratioNum.style.cssText = `font-size:48px;font-weight:700;color:${gradeColor};line-height:1`;
      ratioNum.textContent = `${result.ratio.toFixed(2)}:1`;

      const gradeBadge = document.createElement('div');
      gradeBadge.style.cssText = `display:inline-block;margin-top:8px;padding:4px 16px;background:${gradeColor}20;border:2px solid ${gradeColor};border-radius:20px;font-size:14px;font-weight:600;color:${gradeColor}`;
      gradeBadge.textContent = `WCAG ${grade}`;

      ratioDiv.appendChild(ratioNum);
      ratioDiv.appendChild(gradeBadge);
      results.appendChild(ratioDiv);

      // Compliance grid
      const compGrid = document.createElement('div');
      compGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px';

      const normalBox = document.createElement('div');
      normalBox.style.cssText = 'text-align:center;padding:12px;background:rgba(15,23,42,0.5);border-radius:8px';
      normalBox.appendChild(makeLabel('Normal Text'));
      normalBox.appendChild(makePassFail('AA', result.wcagAA));
      normalBox.appendChild(makePassFail('AAA', result.wcagAAA));

      const largeBox = document.createElement('div');
      largeBox.style.cssText = 'text-align:center;padding:12px;background:rgba(15,23,42,0.5);border-radius:8px';
      largeBox.appendChild(makeLabel('Large Text'));
      largeBox.appendChild(makePassFail('AA', result.wcagAALarge));
      largeBox.appendChild(makePassFail('AAA', result.wcagAAALarge));

      compGrid.appendChild(normalBox);
      compGrid.appendChild(largeBox);
      results.appendChild(compGrid);

      // Suggestions
      if (result.suggestions.length > 0) {
        const sugDiv = document.createElement('div');
        sugDiv.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)';
        const sugLabel = document.createElement('div');
        sugLabel.style.cssText = 'font-size:12px;color:#94a3b8;margin-bottom:8px';
        sugLabel.textContent = 'Suggestions:';
        sugDiv.appendChild(sugLabel);
        for (const s of result.suggestions) {
          const sug = document.createElement('div');
          sug.style.cssText = 'font-size:11px;color:#fbbf24;margin-bottom:4px';
          sug.textContent = `• ${s}`;
          sugDiv.appendChild(sug);
        }
        results.appendChild(sugDiv);
      }

      overlay.appendChild(results);

      // Preview
      const preview = document.createElement('div');
      preview.style.cssText = `background:${sanitizeColor(bgColor)};border-radius:12px;padding:20px;margin-bottom:16px`;
      const normalP = document.createElement('p');
      normalP.style.cssText = `margin:0 0 12px;font-size:16px;color:${sanitizeColor(fgColor)};line-height:1.5`;
      normalP.textContent = 'The quick brown fox jumps over the lazy dog.';
      const largeP = document.createElement('p');
      largeP.style.cssText = `margin:0;font-size:20px;font-weight:700;color:${sanitizeColor(fgColor)};line-height:1.4`;
      largeP.textContent = 'Large Text (18pt+ or 14pt bold)';
      preview.appendChild(normalP);
      preview.appendChild(largeP);
      overlay.appendChild(preview);

      // Action buttons
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px';

      const swapBtn = document.createElement('button');
      swapBtn.type = 'button';
      swapBtn.className = 'fdh-cc-swap';
      swapBtn.style.cssText = 'flex:1;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:10px;color:#818cf8;font-size:12px;cursor:pointer';
      swapBtn.textContent = 'Swap Colors';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'fdh-cc-copy';
      copyBtn.style.cssText = 'flex:1;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:10px;color:#818cf8;font-size:12px;cursor:pointer';
      copyBtn.textContent = 'Copy Report';

      actions.appendChild(swapBtn);
      actions.appendChild(copyBtn);
      overlay.appendChild(actions);

      attachListeners();
    }

    function createColorPicker(label: string, color: string, mode: 'foreground' | 'background', active: boolean): HTMLElement {
      const container = document.createElement('div');
      container.style.cssText = 'text-align:center';

      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:block;margin-bottom:8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px';
      lbl.textContent = label;
      container.appendChild(lbl);

      const swatch = document.createElement('div');
      swatch.style.cssText = `width:60px;height:60px;border-radius:12px;margin:0 auto 8px;cursor:pointer;border:3px solid ${active ? '#6366f1' : 'transparent'};box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);background:${sanitizeColor(color)}`;
      container.appendChild(swatch);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = mode === 'foreground' ? 'fdh-cc-fg-input' : 'fdh-cc-bg-input';
      input.value = color;
      input.style.cssText = 'width:100%;background:rgba(30,41,59,0.8);border:1px solid rgba(99,102,241,0.3);border-radius:6px;padding:8px;color:#e2e8f0;font-family:inherit;font-size:12px;text-align:center;text-transform:uppercase';
      container.appendChild(input);

      const pickBtn = document.createElement('button');
      pickBtn.type = 'button';
      pickBtn.className = mode === 'foreground' ? 'fdh-cc-pick-fg' : 'fdh-cc-pick-bg';
      pickBtn.style.cssText = `margin-top:8px;width:100%;background:${active ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'};border:1px solid rgba(99,102,241,0.4);border-radius:6px;padding:6px;color:#818cf8;font-size:11px;cursor:pointer`;
      pickBtn.textContent = active ? 'Click page to pick...' : 'Pick from page';
      container.appendChild(pickBtn);

      return container;
    }

    function makeLabel(text: string): HTMLElement {
      const el = document.createElement('div');
      el.style.cssText = 'font-size:11px;color:#64748b;margin-bottom:4px';
      el.textContent = text;
      return el;
    }

    function makePassFail(level: string, pass: boolean): HTMLElement {
      const el = document.createElement('div');
      el.style.cssText = `font-size:11px;color:${pass ? '#4ade80' : '#f87171'}`;
      el.textContent = `${pass ? '✓' : '✗'} ${level} ${pass ? 'Pass' : 'Fail'}`;
      return el;
    }

    function attachListeners() {
      overlay.querySelector('.fdh-cc-close')?.addEventListener('click', cleanup);

      const fgInput = overlay.querySelector('.fdh-cc-fg-input') as HTMLInputElement | null;
      fgInput?.addEventListener('change', e => { fgColor = (e.target as HTMLInputElement).value; buildOverlay(); });

      const bgInput = overlay.querySelector('.fdh-cc-bg-input') as HTMLInputElement | null;
      bgInput?.addEventListener('change', e => { bgColor = (e.target as HTMLInputElement).value; buildOverlay(); });

      overlay.querySelector('.fdh-cc-pick-fg')?.addEventListener('click', () => {
        pickerMode = pickerMode === 'foreground' ? null : 'foreground';
        buildOverlay();
      });

      overlay.querySelector('.fdh-cc-pick-bg')?.addEventListener('click', () => {
        pickerMode = pickerMode === 'background' ? null : 'background';
        buildOverlay();
      });

      overlay.querySelector('.fdh-cc-swap')?.addEventListener('click', () => {
        const tmp = fgColor;
        fgColor = bgColor;
        bgColor = tmp;
        buildOverlay();
      });

      overlay.querySelector('.fdh-cc-copy')?.addEventListener('click', () => {
        const result = analyzeContrast(fgColor, bgColor);
        const report = [
          'Contrast Analysis Report',
          '========================',
          `Foreground: ${fgColor}`,
          `Background: ${bgColor}`,
          `Contrast Ratio: ${result.ratio.toFixed(2)}:1`,
          '',
          'WCAG Compliance:',
          `- Normal Text AA: ${result.wcagAA ? 'PASS' : 'FAIL'} (needs 4.5:1)`,
          `- Normal Text AAA: ${result.wcagAAA ? 'PASS' : 'FAIL'} (needs 7:1)`,
          `- Large Text AA: ${result.wcagAALarge ? 'PASS' : 'FAIL'} (needs 3:1)`,
          `- Large Text AAA: ${result.wcagAAALarge ? 'PASS' : 'FAIL'} (needs 4.5:1)`,
          '',
          `Overall Grade: ${result.wcagAAA ? 'AAA' : result.wcagAA ? 'AA' : 'FAIL'}`,
        ].join('\n');
        navigator.clipboard.writeText(report).then(() => {
          const btn = overlay.querySelector('.fdh-cc-copy');
          if (btn) {
            (btn as HTMLElement).textContent = 'Copied!';
            setTimeout(() => { (btn as HTMLElement).textContent = 'Copy Report'; }, 1500);
          }
        });
      });
    }

    function onPageClick(e: MouseEvent) {
      if (!pickerMode) return;
      const target = e.target as HTMLElement;
      if (target === overlay || overlay.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();

      const computed = window.getComputedStyle(target);
      if (pickerMode === 'foreground') {
        fgColor = rgbToHex(computed.color) || '#000000';
      } else {
        bgColor = rgbToHex(computed.backgroundColor) || '#ffffff';
      }
      pickerMode = null;
      buildOverlay();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pickerMode) { pickerMode = null; buildOverlay(); }
        else cleanup();
      }
    }

    document.addEventListener('click', onPageClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    buildOverlay();

    function cleanup() {
      document.removeEventListener('click', onPageClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      removeOverlayElement(overlay);
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
