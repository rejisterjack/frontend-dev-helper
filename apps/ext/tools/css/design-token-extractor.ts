import type { ToolDefinition } from '../types';
import { ToolPanel, createTabBar, createButton, createBadge } from '@/content/tool-panel';
import { getOverlayContainer } from '@/content/overlay-manager';

export const designTokenExtractor: ToolDefinition = {
  id: 'design-token-extractor',
  name: 'Design Token Extractor',
  description: 'Extract and export design tokens: colors, spacing, typography, shadows, and breakpoints',
  category: 'css',
  icon: 'palette',

  run(ctx) {
    let disposed = false;
    let panel: ToolPanel | null = null;

    const { shadow } = getOverlayContainer();

    // ---- Data structures ----
    interface TokenEntry {
      value: string;
      normalizedHex?: string;
      count: number;
      isDuplicate?: boolean;
    }

    interface TypographyCombo {
      fontFamily: string;
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
      count: number;
    }

    interface BreakpointEntry {
      value: string;
      type: 'min-width' | 'max-width';
      count: number;
    }

    const colorMap = new Map<string, TokenEntry>();
    const spacingMap = new Map<string, TokenEntry>();
    const typographyCombos: TypographyCombo[] = [];
    const radiiMap = new Map<string, TokenEntry>();
    const shadowMap = new Map<string, TokenEntry>();
    const breakpoints: BreakpointEntry[] = [];

    // ---- Color helpers ----
    function rgbToHex(rgb: string): string {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return rgb;
      const r = parseInt(m[1]);
      const g = parseInt(m[2]);
      const b = parseInt(m[3]);
      return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
    }

    function hexToRgb(hex: string): [number, number, number] | null {
      const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!m) return null;
      return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    }

    function colorDelta(hex1: string, hex2: string): number {
      const c1 = hexToRgb(hex1);
      const c2 = hexToRgb(hex2);
      if (!c1 || !c2) return Infinity;
      return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2);
    }

    function normalizeColor(raw: string): string {
      if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)' || raw === 'initial' || raw === 'inherit' || raw === 'currentColor') {
        return '';
      }
      if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw.toLowerCase();
      const hex = rgbToHex(raw);
      return hex !== raw ? hex.toLowerCase() : raw;
    }

    // ---- Spacing helper ----
    function normalizeSpacing(raw: string): string {
      if (!raw || raw === '0px' || raw === '0' || raw === 'auto' || raw === 'initial' || raw === 'inherit') {
        return '';
      }
      return raw;
    }

    // ---- DOM scan ----
    function scanDOM() {
      const elements = document.querySelectorAll('body *');
      const maxElements = Math.min(elements.length, 500);

      const tempEl = document.createElement('div');
      document.body.appendChild(tempEl);

      function getNormalizedHex(value: string): string {
        tempEl.style.color = value;
        const computed = getComputedStyle(tempEl).color;
        return rgbToHex(computed).toLowerCase();
      }

      for (let i = 0; i < maxElements; i++) {
        const el = elements[i] as HTMLElement;
        if (el.id?.startsWith('fdh-') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') continue;

        const cs = getComputedStyle(el);

        // Colors
        const colorProps = ['color', 'background-color', 'border-top-color'] as const;
        for (const prop of colorProps) {
          const raw = cs.getPropertyValue(prop);
          const hex = normalizeColor(raw);
          if (!hex) continue;
          const normalizedHex = getNormalizedHex(raw);
          if (!normalizedHex) continue;
          const existing = colorMap.get(normalizedHex);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(normalizedHex, { value: raw, normalizedHex, count: 1 });
          }
        }

        // Spacing
        const spacingProps = [
          'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
          'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
          'gap',
        ] as const;
        for (const prop of spacingProps) {
          const raw = cs.getPropertyValue(prop);
          const normalized = normalizeSpacing(raw);
          if (!normalized) continue;
          const existing = spacingMap.get(normalized);
          if (existing) {
            existing.count++;
          } else {
            spacingMap.set(normalized, { value: normalized, count: 1 });
          }
        }

        // Typography combos
        const fontFamily = cs.getPropertyValue('font-family');
        const fontSize = cs.getPropertyValue('font-size');
        const fontWeight = cs.getPropertyValue('font-weight');
        const lineHeight = cs.getPropertyValue('line-height');
        const comboKey = `${fontFamily}|${fontSize}|${fontWeight}|${lineHeight}`;
        const existingCombo = typographyCombos.find(
          (c) => `${c.fontFamily}|${c.fontSize}|${c.fontWeight}|${c.lineHeight}` === comboKey,
        );
        if (existingCombo) {
          existingCombo.count++;
        } else {
          typographyCombos.push({ fontFamily, fontSize, fontWeight, lineHeight, count: 1 });
        }

        // Border radii
        const borderRadius = cs.getPropertyValue('border-radius');
        if (borderRadius && borderRadius !== '0px' && borderRadius !== 'none' && borderRadius !== 'initial') {
          const existing = radiiMap.get(borderRadius);
          if (existing) {
            existing.count++;
          } else {
            radiiMap.set(borderRadius, { value: borderRadius, count: 1 });
          }
        }

        // Shadows
        const boxShadow = cs.getPropertyValue('box-shadow');
        if (boxShadow && boxShadow !== 'none' && boxShadow !== 'initial') {
          const existing = shadowMap.get(boxShadow);
          if (existing) {
            existing.count++;
          } else {
            shadowMap.set(boxShadow, { value: boxShadow, count: 1 });
          }
        }
      }

      tempEl.remove();

      // Mark near-duplicate colors (delta < 15)
      const colorEntries = Array.from(colorMap.entries());
      for (let i = 0; i < colorEntries.length; i++) {
        for (let j = i + 1; j < colorEntries.length; j++) {
          const [, entryA] = colorEntries[i];
          const [, entryB] = colorEntries[j];
          if (entryA.normalizedHex && entryB.normalizedHex) {
            const delta = colorDelta(entryA.normalizedHex, entryB.normalizedHex);
            if (delta > 0 && delta < 15) {
              entryA.isDuplicate = true;
              entryB.isDuplicate = true;
            }
          }
        }
      }
    }

    // ---- Stylesheet scan for breakpoints ----
    function scanBreakpoints() {
      const seen = new Map<string, BreakpointEntry>();

      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (!(rule instanceof CSSMediaRule)) continue;
            const mediaText = rule.conditionText;
            const minMatch = mediaText.match(/\(min-width:\s*([^)]+)\)/);
            const maxMatch = mediaText.match(/\(max-width:\s*([^)]+)\)/);

            if (minMatch) {
              const val = minMatch[1].trim();
              const existing = seen.get('min:' + val);
              if (existing) {
                existing.count++;
              } else {
                seen.set('min:' + val, { value: val, type: 'min-width', count: 1 });
              }
            }
            if (maxMatch) {
              const val = maxMatch[1].trim();
              const existing = seen.get('max:' + val);
              if (existing) {
                existing.count++;
              } else {
                seen.set('max:' + val, { value: val, type: 'max-width', count: 1 });
              }
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }

      breakpoints.push(...seen.values());
    }

    // ---- Scan ----
    scanDOM();
    scanBreakpoints();

    // ---- Sort helpers ----
    const sortedColors = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
    const sortedSpacing = Array.from(spacingMap.values()).sort((a, b) => b.count - a.count);
    const sortedTypography = typographyCombos.sort((a, b) => b.count - a.count);
    const sortedRadii = Array.from(radiiMap.values()).sort((a, b) => b.count - a.count);
    const sortedShadows = Array.from(shadowMap.values()).sort((a, b) => b.count - a.count);
    const sortedBreakpoints = breakpoints.sort((a, b) => {
      const parseBp = (v: string) => parseFloat(v);
      return parseBp(a.value) - parseBp(b.value);
    });

    // ---- Token naming helpers ----
    function generateColorName(hex: string, index: number): string {
      const rgb = hexToRgb(hex);
      if (!rgb) return 'color-' + index;
      const [r, g, b] = rgb;
      if (r > 200 && g > 200 && b > 200) return 'white';
      if (r < 40 && g < 40 && b < 40) return 'black';
      if (r > g && r > b) return 'red-' + index;
      if (g > r && g > b) return 'green-' + index;
      if (b > r && b > g) return 'blue-' + index;
      return 'color-' + index;
    }

    // ---- Export formats ----
    function exportTailwindConfig(): string {
      const colorsObj: Record<string, string> = {};
      sortedColors.forEach((c, i) => {
        const name = generateColorName(c.normalizedHex || c.value, i);
        colorsObj[name] = c.normalizedHex || c.value;
      });

      const spacingObj: Record<string, string> = {};
      sortedSpacing.forEach((s, i) => {
        const pxMatch = s.value.match(/^([0-9.]+)px$/);
        if (pxMatch) {
          const remVal = parseFloat(pxMatch[1]) / 16;
          spacingObj[String(i + 1)] = remVal + 'rem';
        } else {
          spacingObj[String(i + 1)] = s.value;
        }
      });

      const radiiNames = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
      const radiiObj: Record<string, string> = {};
      sortedRadii.forEach((r, i) => {
        radiiObj[radiiNames[i] || 'radius-' + i] = r.value;
      });

      const shadowNames = ['sm', 'md', 'lg', 'xl', '2xl'];
      const shadowsObj: Record<string, string> = {};
      sortedShadows.forEach((s, i) => {
        shadowsObj[shadowNames[i] || 'shadow-' + i] = s.value;
      });

      const config = {
        theme: {
          colors: colorsObj,
          spacing: spacingObj,
          borderRadius: radiiObj,
          boxShadow: shadowsObj,
        },
      };

      return '/** @type {import(\'tailwindcss\').Config} */\nmodule.exports = ' + JSON.stringify(config, null, 2) + ';';
    }

    function exportCSSCustomProperties(): string {
      const lines: string[] = [':root {'];

      sortedColors.forEach((c, i) => {
        const name = generateColorName(c.normalizedHex || c.value, i);
        lines.push('  --color-' + name + ': ' + (c.normalizedHex || c.value) + ';');
      });

      sortedSpacing.forEach((s, i) => {
        lines.push('  --spacing-' + (i + 1) + ': ' + s.value + ';');
      });

      sortedTypography.forEach((t, i) => {
        lines.push('  --font-family-' + (i + 1) + ': ' + t.fontFamily + ';');
        lines.push('  --font-size-' + (i + 1) + ': ' + t.fontSize + ';');
        lines.push('  --font-weight-' + (i + 1) + ': ' + t.fontWeight + ';');
        lines.push('  --line-height-' + (i + 1) + ': ' + t.lineHeight + ';');
      });

      const radiiNames = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
      sortedRadii.forEach((r, i) => {
        const name = radiiNames[i] || 'radius-' + i;
        lines.push('  --radius-' + name + ': ' + r.value + ';');
      });

      const shadowNames = ['sm', 'md', 'lg', 'xl', '2xl'];
      sortedShadows.forEach((s, i) => {
        const name = shadowNames[i] || 'shadow-' + i;
        lines.push('  --shadow-' + name + ': ' + s.value + ';');
      });

      sortedBreakpoints.forEach((bp) => {
        const prefix = bp.type === 'min-width' ? 'up' : 'down';
        lines.push('  --breakpoint-' + prefix + '-' + bp.value.replace(/[^a-z0-9]/gi, '') + ': ' + bp.value + ';');
      });

      lines.push('}');
      return lines.join('\n');
    }

    function exportStyleDictionaryJSON(): string {
      const tokens: Record<string, Record<string, unknown>> = {
        color: {},
        spacing: {},
        typography: {},
        borderRadius: {},
        shadow: {},
        breakpoint: {},
      };

      sortedColors.forEach((c, i) => {
        const name = generateColorName(c.normalizedHex || c.value, i);
        tokens.color[name] = {
          value: c.normalizedHex || c.value,
          type: 'color',
          description: 'Used ' + c.count + ' times',
        };
      });

      sortedSpacing.forEach((s, i) => {
        tokens.spacing[String(i + 1)] = {
          value: s.value,
          type: 'dimension',
          description: 'Used ' + s.count + ' times',
        };
      });

      sortedTypography.forEach((t, i) => {
        tokens.typography[String(i + 1)] = {
          value: {
            fontFamily: t.fontFamily,
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            lineHeight: t.lineHeight,
          },
          type: 'typography',
          description: 'Used ' + t.count + ' times',
        };
      });

      const radiiNames = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];
      sortedRadii.forEach((r, i) => {
        const name = radiiNames[i] || 'radius-' + i;
        tokens.borderRadius[name] = {
          value: r.value,
          type: 'dimension',
          description: 'Used ' + r.count + ' times',
        };
      });

      const shadowNames = ['sm', 'md', 'lg', 'xl', '2xl'];
      sortedShadows.forEach((s, i) => {
        const name = shadowNames[i] || 'shadow-' + i;
        tokens.shadow[name] = {
          value: s.value,
          type: 'shadow',
          description: 'Used ' + s.count + ' times',
        };
      });

      sortedBreakpoints.forEach((bp) => {
        const prefix = bp.type === 'min-width' ? 'up' : 'down';
        const key = prefix + '-' + bp.value.replace(/[^a-z0-9]/gi, '');
        tokens.breakpoint[key] = {
          value: bp.value,
          type: 'dimension',
          description: bp.type + ', used in ' + bp.count + ' rules',
        };
      });

      return JSON.stringify(tokens, null, 2);
    }

    function exportFigmaVariablesJSON(): string {
      const figma = {
        collections: [
          {
            name: 'Colors',
            modes: [{ name: 'Default', modeId: 'default' }],
            variables: sortedColors.map((c, i) => ({
              name: generateColorName(c.normalizedHex || c.value, i),
              resolvedValues: {
                default: {
                  value: c.normalizedHex || c.value,
                  type: 'COLOR',
                },
              },
            })),
          },
          {
            name: 'Spacing',
            modes: [{ name: 'Default', modeId: 'default' }],
            variables: sortedSpacing.map((s, i) => ({
              name: 'spacing-' + (i + 1),
              resolvedValues: {
                default: {
                  value: parseFloat(s.value) || 0,
                  type: 'FLOAT',
                },
              },
            })),
          },
          {
            name: 'Typography',
            modes: [{ name: 'Default', modeId: 'default' }],
            variables: sortedTypography.map((t, i) => ({
              name: 'typography-' + (i + 1),
              resolvedValues: {
                default: {
                  value: {
                    fontFamily: t.fontFamily,
                    fontSize: parseFloat(t.fontSize) || 16,
                    fontWeight: t.fontWeight,
                    lineHeight: t.lineHeight,
                  },
                  type: 'COMPOSITE',
                },
              },
            })),
          },
          {
            name: 'Border Radii',
            modes: [{ name: 'Default', modeId: 'default' }],
            variables: sortedRadii.map((r, i) => ({
              name: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'][i] || 'radius-' + i,
              resolvedValues: {
                default: {
                  value: parseFloat(r.value) || 0,
                  type: 'FLOAT',
                },
              },
            })),
          },
          {
            name: 'Shadows',
            modes: [{ name: 'Default', modeId: 'default' }],
            variables: sortedShadows.map((s, i) => ({
              name: ['sm', 'md', 'lg', 'xl', '2xl'][i] || 'shadow-' + i,
              resolvedValues: {
                default: {
                  value: s.value,
                  type: 'STRING',
                },
              },
            })),
          },
        ],
      };

      return JSON.stringify(figma, null, 2);
    }

    function copyToClipboard(text: string, label: string) {
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.createElement('div');
        toast.style.cssText = [
          'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);',
          'padding: 8px 16px; background: #22c55e; color: #fff; border-radius: 6px;',
          'font-size: 12px; font-family: system-ui, sans-serif; z-index: 2147483647;',
          'pointer-events: none;',
        ].join(' ');
        toast.textContent = label + ' copied to clipboard';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
    }

    // ---- Rendering ----
    function clearContainer(container: HTMLElement) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    function createEmptyMessage(container: HTMLElement, msg: string) {
      const el = document.createElement('div');
      el.style.cssText = 'text-align: center; padding: 20px; color: #64748b;';
      el.textContent = msg;
      container.appendChild(el);
    }

    function renderColors(container: HTMLElement) {
      clearContainer(container);
      if (sortedColors.length === 0) {
        createEmptyMessage(container, 'No colors found.');
        return;
      }
      for (const entry of sortedColors) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;';

        const swatch = document.createElement('div');
        swatch.style.cssText = 'width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0; border: 1px solid #475569;';
        swatch.style.background = entry.normalizedHex || entry.value;
        row.appendChild(swatch);

        const value = document.createElement('span');
        value.style.cssText = "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = entry.normalizedHex || entry.value;
        row.appendChild(value);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'color: #64748b; font-size: 11px;';
        countBadge.textContent = entry.count + 'x';
        row.appendChild(countBadge);

        if (entry.isDuplicate) {
          row.appendChild(createBadge('near-dup', '#f59e0b'));
        }

        container.appendChild(row);
      }
    }

    function renderSpacing(container: HTMLElement) {
      clearContainer(container);
      if (sortedSpacing.length === 0) {
        createEmptyMessage(container, 'No spacing values found.');
        return;
      }
      for (const entry of sortedSpacing) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;';

        const bar = document.createElement('div');
        const pxVal = parseFloat(entry.value);
        const barWidth = Math.min(Math.max(pxVal * 2, 4), 100);
        bar.style.cssText = 'height: 8px; border-radius: 2px; background: #3b82f6; flex-shrink: 0;';
        bar.style.width = barWidth + 'px';
        row.appendChild(bar);

        const value = document.createElement('span');
        value.style.cssText = "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = entry.value;
        row.appendChild(value);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'color: #64748b; font-size: 11px;';
        countBadge.textContent = entry.count + 'x';
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderTypography(container: HTMLElement) {
      clearContainer(container);
      if (sortedTypography.length === 0) {
        createEmptyMessage(container, 'No typography values found.');
        return;
      }
      for (const combo of sortedTypography) {
        const row = document.createElement('div');
        row.style.cssText = 'padding: 8px; border-radius: 4px; background: #1e293b; margin-bottom: 6px;';

        const preview = document.createElement('div');
        preview.style.cssText = 'margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e2e8f0;';
        preview.style.fontFamily = combo.fontFamily;
        preview.style.fontSize = combo.fontSize;
        preview.style.fontWeight = combo.fontWeight;
        preview.style.lineHeight = combo.lineHeight;
        preview.textContent = 'The quick brown fox jumps over the lazy dog';
        row.appendChild(preview);

        const details = document.createElement('div');
        details.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';

        const chips: [string, string][] = [
          ['Family', combo.fontFamily.split(',')[0]],
          ['Size', combo.fontSize],
          ['Weight', combo.fontWeight],
          ['Line Height', combo.lineHeight],
        ];
        for (const [label, val] of chips) {
          const chip = document.createElement('span');
          chip.style.cssText = "padding: 2px 6px; border-radius: 4px; background: #0c1222; color: #94a3b8; font-size: 10px; font-family: 'SF Mono', monospace;";
          chip.textContent = label + ': ' + val;
          details.appendChild(chip);
        }

        const countChip = document.createElement('span');
        countChip.style.cssText = 'padding: 2px 6px; border-radius: 4px; background: #0c1222; color: #64748b; font-size: 10px;';
        countChip.textContent = combo.count + 'x';
        details.appendChild(countChip);

        row.appendChild(details);
        container.appendChild(row);
      }
    }

    function renderRadii(container: HTMLElement) {
      clearContainer(container);
      if (sortedRadii.length === 0) {
        createEmptyMessage(container, 'No border radii found.');
        return;
      }
      for (const entry of sortedRadii) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;';

        const shape = document.createElement('div');
        const radiusVal = Math.min(parseFloat(entry.value) || 0, 50);
        shape.style.cssText = 'width: 24px; height: 24px; background: #3b82f6; flex-shrink: 0;';
        shape.style.borderRadius = radiusVal + 'px';
        row.appendChild(shape);

        const value = document.createElement('span');
        value.style.cssText = "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = entry.value;
        row.appendChild(value);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'color: #64748b; font-size: 11px;';
        countBadge.textContent = entry.count + 'x';
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderShadows(container: HTMLElement) {
      clearContainer(container);
      if (sortedShadows.length === 0) {
        createEmptyMessage(container, 'No box shadows found.');
        return;
      }
      for (const entry of sortedShadows) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;';

        const shadowPreview = document.createElement('div');
        shadowPreview.style.cssText = 'width: 32px; height: 32px; border-radius: 4px; background: #f1f5f9; flex-shrink: 0;';
        shadowPreview.style.boxShadow = entry.value;
        row.appendChild(shadowPreview);

        const value = document.createElement('span');
        value.style.cssText = "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 11px; flex: 1; word-break: break-all;";
        const displayVal = entry.value.length > 50 ? entry.value.substring(0, 50) + '...' : entry.value;
        value.textContent = displayVal;
        row.appendChild(value);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'color: #64748b; font-size: 11px;';
        countBadge.textContent = entry.count + 'x';
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderBreakpoints(container: HTMLElement) {
      clearContainer(container);
      if (sortedBreakpoints.length === 0) {
        createEmptyMessage(container, 'No breakpoints found in stylesheets.');
        return;
      }
      for (const bp of sortedBreakpoints) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;';

        const typeLabel = document.createElement('span');
        const isMin = bp.type === 'min-width';
        typeLabel.style.cssText = 'padding: 2px 6px; border-radius: 4px; font-size: 10px;';
        typeLabel.style.background = isMin ? '#22c55e20' : '#f59e0b20';
        typeLabel.style.color = isMin ? '#22c55e' : '#f59e0b';
        typeLabel.textContent = bp.type;
        row.appendChild(typeLabel);

        const value = document.createElement('span');
        value.style.cssText = "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = bp.value;
        row.appendChild(value);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'color: #64748b; font-size: 11px;';
        countBadge.textContent = bp.count + ' rules';
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    // ---- Panel setup ----
    panel = new ToolPanel({
      title: 'Design Token Extractor',
      width: 460,
      maxHeight: '85vh',
      onClose: cleanup,
    });

    // Tab bar
    const tabs = [
      { id: 'colors', label: 'Colors (' + sortedColors.length + ')' },
      { id: 'spacing', label: 'Spacing (' + sortedSpacing.length + ')' },
      { id: 'typography', label: 'Typography (' + sortedTypography.length + ')' },
      { id: 'radii', label: 'Radii (' + sortedRadii.length + ')' },
      { id: 'shadows', label: 'Shadows (' + sortedShadows.length + ')' },
      { id: 'breakpoints', label: 'Breakpoints (' + sortedBreakpoints.length + ')' },
    ];

    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = 'overflow-y: auto; max-height: 400px; padding: 4px 0;';

    const tabBar = createTabBar(tabs, (id) => {
      if (!panel || disposed) return;
      panel.clearContent();
      panel.appendContent(tabBar.container);
      panel.appendContent(contentContainer);

      const renderers: Record<string, (c: HTMLElement) => void> = {
        colors: renderColors,
        spacing: renderSpacing,
        typography: renderTypography,
        radii: renderRadii,
        shadows: renderShadows,
        breakpoints: renderBreakpoints,
      };
      const fn = renderers[id];
      if (fn) fn(contentContainer);
    });

    // Initial render
    renderColors(contentContainer);

    panel.appendContent(tabBar.container);
    panel.appendContent(contentContainer);

    // Footer with export buttons
    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0;';

    const exportFormats = [
      { label: 'Tailwind Config', fn: exportTailwindConfig },
      { label: 'CSS Variables', fn: exportCSSCustomProperties },
      { label: 'Style Dictionary', fn: exportStyleDictionaryJSON },
      { label: 'Figma Variables', fn: exportFigmaVariablesJSON },
    ];

    for (const fmt of exportFormats) {
      footer.appendChild(createButton(fmt.label, () => copyToClipboard(fmt.fn(), fmt.label)));
    }

    panel.appendContent(footer);
    panel.mount(shadow);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      panel?.destroy();
      panel = null;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
