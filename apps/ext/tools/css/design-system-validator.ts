import type { ToolDefinition } from '../types';

export const designSystemValidator: ToolDefinition = {
  id: 'design-system-validator',
  name: 'Design System Validator',
  description: 'Validate page elements against a design system specification',
  category: 'css',
  icon: 'CheckCircle',
  configSchema: {
    checkColors: { type: 'boolean', label: 'Check Colors', default: true },
    checkTypography: { type: 'boolean', label: 'Check Typography', default: true },
    checkSpacing: { type: 'boolean', label: 'Check Spacing', default: true },
    checkBorderRadius: { type: 'boolean', label: 'Check Border Radius', default: false },
    tolerance: { type: 'slider', label: 'Tolerance (%)', default: 5, min: 0, max: 20, step: 1 },
  },
  run: (ctx, config) => {
    const {
      checkColors = true,
      checkTypography = true,
      checkSpacing = true,
      tolerance = 5,
    } = config ?? {};

    let panel: HTMLDivElement | null = null;
    let disposed = false;

    // --- Preset token scales for comparison ---
    const TAILWIND_SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96];
    const TAILWIND_FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];
    const TAILWIND_COLORS = [
      '#3B82F6', '#2563EB', '#1D4ED8', '#0F172A', '#1E293B', '#334155',
      '#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9',
      '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4',
    ];
    const BOOTSTRAP_SPACING = [0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];
    const BOOTSTRAP_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64];
    const MATERIAL_SPACING = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
    const MATERIAL_FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 45, 57, 64];

    function parsePx(val: string): number | null {
      const m = val.match(/^([0-9.]+)px$/);
      return m ? parseFloat(m[1]) : null;
    }

    function normalizeColor(raw: string): string {
      const el = document.createElement('div');
      el.style.color = raw;
      document.body.appendChild(el);
      const computed = getComputedStyle(el).color;
      el.remove();
      return computed;
    }

    function colorDistance(c1: string, c2: string): number {
      const parse = (c: string) => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [0, 0, 0];
      };
      const [r1, g1, b1] = parse(c1);
      const [r2, g2, b2] = parse(c2);
      return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    }

    function isNearScale(value: string, scale: number[], tol: number): boolean {
      const px = parsePx(value);
      if (px === null) return true;
      const t = tol * 2;
      return scale.some((s) => Math.abs(px - s) <= t);
    }

    function isNearFontScale(value: string, scale: number[], tol: number): boolean {
      const px = parsePx(value);
      if (px === null) return true;
      return scale.some((s) => Math.abs(px - s) <= tol);
    }

    function isNearColor(value: string, palette: string[], threshold: number): boolean {
      const norm = normalizeColor(value);
      return palette.some((c) => colorDistance(norm, normalizeColor(c)) < threshold);
    }

    interface TokenFinding {
      property: string;
      value: string;
      element: string;
      category: 'color' | 'typography' | 'spacing';
      issue: string;
    }

    function scan(): TokenFinding[] {
      const findings: TokenFinding[] = [];
      const elements = document.querySelectorAll('body *');
      const maxElements = Math.min(elements.length, 500);
      const threshold = Math.max(1, (tolerance / 100) * 442);

      for (let i = 0; i < maxElements; i++) {
        const el = elements[i] as HTMLElement;
        if (el.id?.startsWith('fdh-')) continue;
        const cs = getComputedStyle(el);
        const tag = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''}`;

        if (checkSpacing) {
          const spacingProps = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap'];
          for (const prop of spacingProps) {
            const v = cs.getPropertyValue(prop);
            const px = parsePx(v);
            if (px !== null && px > 0) {
              if (!isNearScale(v, TAILWIND_SPACING, tolerance) &&
                  !isNearScale(v, BOOTSTRAP_SPACING, tolerance) &&
                  !isNearScale(v, MATERIAL_SPACING, tolerance)) {
                findings.push({ property: prop, value: v, element: tag, category: 'spacing',
                  issue: `Non-standard spacing: ${v} not in common design scales` });
              }
            }
          }
        }

        if (checkTypography) {
          const fontSize = cs.getPropertyValue('font-size');
          const px = parsePx(fontSize);
          if (px !== null && px > 0) {
            if (!isNearFontScale(fontSize, TAILWIND_FONT_SIZES, tolerance) &&
                !isNearFontScale(fontSize, BOOTSTRAP_FONT_SIZES, tolerance) &&
                !isNearFontScale(fontSize, MATERIAL_FONT_SIZES, tolerance)) {
              findings.push({ property: 'font-size', value: fontSize, element: tag, category: 'typography',
                issue: `Non-standard font-size: ${fontSize}` });
            }
          }

          const fontWeight = cs.getPropertyValue('font-weight');
          const standardWeights = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
          if (fontWeight && !standardWeights.includes(fontWeight)) {
            findings.push({ property: 'font-weight', value: fontWeight, element: tag, category: 'typography',
              issue: `Non-standard font-weight: ${fontWeight}` });
          }
        }

        if (checkColors) {
          const colorProps = ['color', 'background-color', 'border-color'];
          for (const prop of colorProps) {
            const v = cs.getPropertyValue(prop);
            if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent' && !v.startsWith('rgb(0, 0, 0)')) {
              if (!isNearColor(v, TAILWIND_COLORS, threshold)) {
                findings.push({ property: prop, value: v, element: tag, category: 'color',
                  issue: `Color not in standard palette: ${v}` });
              }
            }
          }
        }
      }

      return findings;
    }

    function scanCSSVars(): { name: string; value: string; category: string }[] {
      const vars: { name: string; value: string; category: string }[] = [];
      const seen = new Set<string>();

      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              for (let i = 0; i < rule.style.length; i++) {
                const prop = rule.style[i];
                if (prop?.startsWith('--')) {
                  const val = rule.style.getPropertyValue(prop).trim();
                  if (val && !seen.has(prop)) {
                    seen.add(prop);
                    let category = 'other';
                    if (/color|colour|bg|border-color|fill|stroke/i.test(prop)) category = 'color';
                    else if (/font|size|weight|line-height|letter-spacing/i.test(prop)) category = 'typography';
                    else if (/space|gap|pad|margin|inset|offset/i.test(prop)) category = 'spacing';
                    vars.push({ name: prop, value: val, category });
                  }
                }
              }
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
      return vars;
    }

    function escapeHtml(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function createPanel(): HTMLDivElement {
      const el = document.createElement('div');
      el.style.cssText = `
        position: fixed; top: 20px; right: 20px; width: 420px; max-height: 85vh;
        font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #e2e8f0;
        background: #0f172a; border: 1px solid #334155; border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); z-index: 2147483647;
        pointer-events: auto; display: flex; flex-direction: column; overflow: hidden;
      `;

      const findings = scan();
      const cssVars = scanCSSVars();
      const colorVars = cssVars.filter((v) => v.category === 'color');
      const typoVars = cssVars.filter((v) => v.category === 'typography');
      const spaceVars = cssVars.filter((v) => v.category === 'spacing');
      const otherVars = cssVars.filter((v) => v.category === 'other');

      const colorIssues = findings.filter((f) => f.category === 'color').length;
      const typoIssues = findings.filter((f) => f.category === 'typography').length;
      const spacingIssues = findings.filter((f) => f.category === 'spacing').length;

      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#1e293b;border-bottom:1px solid #334155;cursor:move;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;">
            <span style="color:#3b82f6;">&#10003;</span> Design System Validator
          </div>
          <button data-action="close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:4px;line-height:1;">&times;</button>
        </div>
        <div style="padding:14px 18px;display:flex;gap:10px;border-bottom:1px solid #1e293b;">
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:20px;font-weight:700;color:${colorIssues > 0 ? '#f59e0b' : '#22c55e'}">${colorIssues}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Color Issues</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:20px;font-weight:700;color:${typoIssues > 0 ? '#f59e0b' : '#22c55e'}">${typoIssues}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Typography</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:20px;font-weight:700;color:${spacingIssues > 0 ? '#f59e0b' : '#22c55e'}">${spacingIssues}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Spacing</div>
          </div>
        </div>
        <div style="overflow-y:auto;flex:1;padding:14px 18px;">
          <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:8px;">CSS Custom Properties (${cssVars.length})</div>
            ${colorVars.length > 0 ? `<div style="margin-bottom:10px;"><div style="font-size:11px;color:#3b82f6;margin-bottom:4px;">Colors (${colorVars.length})</div>${colorVars.slice(0, 15).map((v) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;"><div style="width:12px;height:12px;border-radius:3px;background:${escapeHtml(v.value)};border:1px solid #475569;flex-shrink:0;"></div><span style="color:#94a3b8;">${escapeHtml(v.name)}</span><span style="color:#64748b;margin-left:auto;font-size:11px;">${escapeHtml(v.value.substring(0, 30))}</span></div>`).join('')}</div>` : ''}
            ${typoVars.length > 0 ? `<div style="margin-bottom:10px;"><div style="font-size:11px;color:#8b5cf6;margin-bottom:4px;">Typography (${typoVars.length})</div>${typoVars.slice(0, 10).map((v) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;"><span style="color:#94a3b8;">${escapeHtml(v.name)}</span><span style="color:#64748b;margin-left:auto;font-size:11px;">${escapeHtml(v.value.substring(0, 30))}</span></div>`).join('')}</div>` : ''}
            ${spaceVars.length > 0 ? `<div style="margin-bottom:10px;"><div style="font-size:11px;color:#22c55e;margin-bottom:4px;">Spacing (${spaceVars.length})</div>${spaceVars.slice(0, 10).map((v) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;"><span style="color:#94a3b8;">${escapeHtml(v.name)}</span><span style="color:#64748b;margin-left:auto;font-size:11px;">${escapeHtml(v.value.substring(0, 30))}</span></div>`).join('')}</div>` : ''}
            ${otherVars.length > 0 ? `<div><div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Other (${otherVars.length})</div>${otherVars.slice(0, 8).map((v) => `<div style="display:flex;gap:6px;padding:3px 0;font-size:12px;"><span style="color:#94a3b8;">${escapeHtml(v.name)}</span><span style="color:#64748b;margin-left:auto;font-size:11px;">${escapeHtml(v.value.substring(0, 30))}</span></div>`).join('')}</div>` : ''}
          </div>
          ${findings.length > 0 ? `
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:8px;">Inconsistencies (${findings.length})</div>
            <div style="max-height:250px;overflow-y:auto;">
            ${findings.slice(0, 80).map((f) => `
              <div style="padding:8px 10px;margin-bottom:6px;background:#1e293b;border-radius:6px;border-left:3px solid ${f.category === 'color' ? '#3b82f6' : f.category === 'typography' ? '#8b5cf6' : '#22c55e'};">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-weight:500;font-size:12px;">${escapeHtml(f.property)}</span>
                  <span style="font-size:10px;padding:2px 6px;background:#334155;border-radius:4px;color:#94a3b8;">${f.category}</span>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">${escapeHtml(f.issue)}</div>
                <div style="font-size:11px;color:#64748b;">on ${escapeHtml(f.element)}</div>
              </div>
            `).join('')}
            </div>
          </div>` : `<div style="text-align:center;padding:20px;color:#22c55e;">All scanned elements match common design system patterns.</div>`}
        </div>
        <div style="padding:10px 18px;border-top:1px solid #1e293b;display:flex;gap:8px;">
          <button data-action="rescan" style="flex:1;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;cursor:pointer;font-size:12px;">Rescan</button>
          <button data-action="export" style="flex:1;padding:8px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:6px;color:#3b82f6;cursor:pointer;font-size:12px;">Export JSON</button>
        </div>
      `;

      // Make panel draggable
      let dragging = false;
      let dragX = 0;
      let dragY = 0;
      const header = el.querySelector('[style*="cursor:move"]') as HTMLElement;
      if (header) {
        header.addEventListener('mousedown', (e) => {
          dragging = true;
          dragX = e.clientX - el.offsetLeft;
          dragY = e.clientY - el.offsetTop;
          e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
          if (!dragging) return;
          el.style.left = `${e.clientX - dragX}px`;
          el.style.top = `${e.clientY - dragY}px`;
          el.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });
      }

      // Close button
      el.querySelector('[data-action="close"]')?.addEventListener('click', () => {
        cleanup();
      });

      // Rescan button
      el.querySelector('[data-action="rescan"]')?.addEventListener('click', () => {
        if (panel && !disposed) {
          removeOverlayElement(panel);
          panel = createPanel();
          addOverlayElement(panel);
        }
      });

      // Export button
      el.querySelector('[data-action="export"]')?.addEventListener('click', () => {
        const data = {
          url: window.location.href,
          timestamp: Date.now(),
          cssVariables: cssVars,
          findings,
          summary: { colorIssues, typographyIssues: typoIssues, spacingIssues },
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design-system-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });

      return el;
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (panel) {
        removeOverlayElement(panel);
        panel = null;
      }
    }

    panel = createPanel();
    addOverlayElement(panel);

    ctx.onInvalidated(() => {
      cleanup();
    });

    return cleanup;
  },
};
