import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

interface DesignSpec {
  source: "page" | "url" | "fallback";
  sourceLabel: string;
  colors: string[];
  spacings: number[]; // px
  fontSizes: number[]; // px
  fontWeights: number[];
  radii: number[]; // px
}

const FALLBACK_SPEC: DesignSpec = {
  source: "fallback",
  sourceLabel: "Generic 4px-base scale (no design tokens found)",
  colors: [
    "#000000",
    "#ffffff",
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ],
  spacings: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
  fontSizes: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72],
  fontWeights: [400, 500, 600, 700],
  radii: [0, 2, 4, 6, 8, 12, 16, 24],
};

export const designSystemValidator: ToolDefinition = {
  id: "design-system-validator",
  name: "Design System Validator",
  description: "Validate page elements against the page's own design tokens",
  category: "css",
  icon: "CheckCircle",
  configSchema: {
    checkColors: { type: "boolean", label: "Check Colors", default: true },
    checkTypography: {
      type: "boolean",
      label: "Check Typography",
      default: true,
    },
    checkSpacing: { type: "boolean", label: "Check Spacing", default: true },
    checkBorderRadius: {
      type: "boolean",
      label: "Check Border Radius",
      default: true,
    },
    tolerance: {
      type: "slider",
      label: "Tolerance (%)",
      default: 5,
      min: 0,
      max: 20,
      step: 1,
    },
  },
  run: (ctx, config) => {
    const {
      checkColors = true,
      checkTypography = true,
      checkSpacing = true,
      checkBorderRadius = true,
      tolerance = 5,
    } = (config ?? {}) as {
      checkColors?: boolean;
      checkTypography?: boolean;
      checkSpacing?: boolean;
      checkBorderRadius?: boolean;
      tolerance?: number;
    };

    let panel: HTMLDivElement | null = null;
    let disposed = false;
    const cleanupFns: Array<() => void> = [];

    // --- Color normalization with cache ---
    const colorCache = new Map<string, [number, number, number]>();
    const probeEl = document.createElement("div");
    probeEl.style.position = "absolute";
    probeEl.style.visibility = "hidden";
    probeEl.style.pointerEvents = "none";

    function normalizeRgb(raw: string): [number, number, number] {
      const cached = colorCache.get(raw);
      if (cached) return cached;
      probeEl.style.color = "";
      probeEl.style.color = raw;
      if (!probeEl.parentElement) document.body.appendChild(probeEl);
      const computed = getComputedStyle(probeEl).color;
      const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const rgb: [number, number, number] = m
        ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
        : [0, 0, 0];
      colorCache.set(raw, rgb);
      return rgb;
    }

    // --- CIELAB ΔE2000 implementation ---
    // Ref: Sharma, Wu, Dalal (2005). The CIEDE2000 Color-Difference Formula.
    function srgbToLinear(c: number): number {
      const cs = c / 255;
      return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    }

    function rgbToXyz([r, g, b]: [number, number, number]): [
      number,
      number,
      number,
    ] {
      const lr = srgbToLinear(r);
      const lg = srgbToLinear(g);
      const lb = srgbToLinear(b);
      return [
        (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100,
        (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) * 100,
        (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) * 100,
      ];
    }

    function xyzToLab([x, y, z]: [number, number, number]): [
      number,
      number,
      number,
    ] {
      // D65 reference white
      const xn = 95.047;
      const yn = 100.0;
      const zn = 108.883;
      const fx =
        x / xn > 0.008856 ? Math.cbrt(x / xn) : (x / xn) * 7.787 + 16 / 116;
      const fy =
        y / yn > 0.008856 ? Math.cbrt(y / yn) : (y / yn) * 7.787 + 16 / 116;
      const fz =
        z / zn > 0.008856 ? Math.cbrt(z / zn) : (z / zn) * 7.787 + 16 / 116;
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    }

    function rgbToLab(rgb: [number, number, number]): [number, number, number] {
      return xyzToLab(rgbToXyz(rgb));
    }

    function deg2rad(d: number): number {
      return (d * Math.PI) / 180;
    }

    function rad2deg(r: number): number {
      return (r * 180) / Math.PI;
    }

    function deltaE2000(
      lab1: [number, number, number],
      lab2: [number, number, number],
    ): number {
      const [L1, a1, b1] = lab1;
      const [L2, a2, b2] = lab2;
      const kL = 1,
        kC = 1,
        kH = 1;

      const C1 = Math.sqrt(a1 * a1 + b1 * b1);
      const C2 = Math.sqrt(a2 * a2 + b2 * b2);
      const Cbar = (C1 + C2) / 2;

      const Cbar7 = Math.pow(Cbar, 7);
      const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

      const a1p = (1 + G) * a1;
      const a2p = (1 + G) * a2;
      const C1p = Math.sqrt(a1p * a1p + b1 * b1);
      const C2p = Math.sqrt(a2p * a2p + b2 * b2);

      let h1p = b1 === 0 && a1p === 0 ? 0 : rad2deg(Math.atan2(b1, a1p));
      if (h1p < 0) h1p += 360;
      let h2p = b2 === 0 && a2p === 0 ? 0 : rad2deg(Math.atan2(b2, a2p));
      if (h2p < 0) h2p += 360;

      const dLp = L2 - L1;
      const dCp = C2p - C1p;

      let dhp = h2p - h1p;
      if (Math.abs(dhp) > 180) {
        if (h2p <= h1p) dhp += 360;
        else dhp -= 360;
      }
      const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp / 2));

      const Lbarp = (L1 + L2) / 2;
      const Cbarp = (C1p + C2p) / 2;

      let hbarp: number;
      if (C1p * C2p === 0) {
        hbarp = h1p + h2p;
      } else if (Math.abs(h1p - h2p) <= 180) {
        hbarp = (h1p + h2p) / 2;
      } else if (h1p + h2p < 360) {
        hbarp = (h1p + h2p + 360) / 2;
      } else {
        hbarp = (h1p + h2p - 360) / 2;
      }

      const T =
        1 -
        0.17 * Math.cos(deg2rad(hbarp - 30)) +
        0.24 * Math.cos(deg2rad(2 * hbarp)) +
        0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
        0.2 * Math.cos(deg2rad(4 * hbarp - 63));

      const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
      const Cbarp7 = Math.pow(Cbarp, 7);
      const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
      const SL =
        1 +
        (0.015 * Math.pow(Lbarp - 50, 2)) /
          Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
      const SC = 1 + 0.045 * Cbarp;
      const SH = 1 + 0.015 * Cbarp * T;
      const RT = -Math.sin(deg2rad(2 * dTheta)) * RC;

      const dE = Math.sqrt(
        Math.pow(dLp / (kL * SL), 2) +
          Math.pow(dCp / (kC * SC), 2) +
          Math.pow(dHp / (kH * SH), 2) +
          RT * (dCp / (kC * SC)) * (dHp / (kH * SH)),
      );
      return dE;
    }

    // --- Spec discovery: read page's actual design tokens ---
    function discoverSpec(): DesignSpec {
      const colors = new Set<string>();
      const spacings = new Set<number>();
      const fontSizes = new Set<number>();
      const fontWeights = new Set<number>();
      const radii = new Set<number>();

      // 1. Scan :root CSS custom properties for design tokens
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walkRules(sheet.cssRules);
        } catch {
          // cross-origin
        }
      }

      function walkRules(rules: CSSRuleList | null | undefined) {
        if (!rules) return;
        for (const rule of Array.from(rules)) {
          if (
            rule instanceof CSSMediaRule ||
            rule instanceof CSSSupportsRule ||
            (typeof CSSLayerBlockRule !== "undefined" &&
              rule instanceof CSSLayerBlockRule)
          ) {
            walkRules(rule.cssRules);
            continue;
          }
          if (rule instanceof CSSStyleRule) {
            const isRootish =
              rule.selectorText === ":root" ||
              rule.selectorText.includes(":root") ||
              rule.selectorText === "html";
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (!prop || !prop.startsWith("--")) continue;
              const val = rule.style.getPropertyValue(prop).trim();
              if (!val) continue;
              collectToken(prop, val, isRootish);
            }
          }
          // @theme blocks (Tailwind v4)
          if (
            typeof CSSPropertyRule !== "undefined" &&
            rule instanceof CSSPropertyRule
          ) {
            collectToken(rule.name, rule.initialValue || "", true);
          }
        }
      }

      function collectToken(name: string, value: string, _rootish: boolean) {
        const lname = name.toLowerCase();
        // color tokens
        if (
          /color|colour|bg|background|fill|stroke|border-color/i.test(lname)
        ) {
          if (/^(#|rgb|rgba|hsl|hsla|oklch|color)/i.test(value.trim())) {
            colors.add(value.trim());
          }
        }
        // spacing tokens (--space-*, --gap-*, --pad-*)
        const spaceMatch = lname.match(
          /(--(?:space|gap|pad|margin|inset|offset)[\w-]*)/,
        );
        if (spaceMatch) {
          const px = parsePx(value);
          if (px !== null && px >= 0 && px <= 256) spacings.add(px);
        }
        // font-size tokens (--font-size-*)
        if (/font-size|text-size/i.test(lname)) {
          const px = parsePx(value);
          if (px !== null && px > 0) fontSizes.add(px);
        }
        // font-weight tokens
        if (/font-weight/i.test(lname)) {
          const w = parseInt(value, 10);
          if (!isNaN(w)) fontWeights.add(w);
        }
        // radius tokens (--radius-*, --rounded-*)
        if (/radius|rounded/i.test(lname)) {
          const px = parsePx(value);
          if (px !== null && px >= 0) radii.add(px);
        }
      }

      const spec: DesignSpec = {
        source: "page",
        sourceLabel: "Page CSS custom properties",
        colors: Array.from(colors),
        spacings: Array.from(spacings).sort((a, b) => a - b),
        fontSizes: Array.from(fontSizes).sort((a, b) => a - b),
        fontWeights: Array.from(fontWeights).sort((a, b) => a - b),
        radii: Array.from(radii).sort((a, b) => a - b),
      };

      const hasAnything =
        spec.colors.length > 0 ||
        spec.spacings.length > 0 ||
        spec.fontSizes.length > 0;

      return hasSomethingMeaningful(spec) ? spec : FALLBACK_SPEC;
    }

    function hasSomethingMeaningful(spec: DesignSpec): boolean {
      // Need at least colors OR (spacings AND fontSizes) to validate meaningfully
      return (
        spec.colors.length >= 3 ||
        (spec.spacings.length >= 3 && spec.fontSizes.length >= 2)
      );
    }

    function parsePx(val: string): number | null {
      const m = val.match(/^([0-9.]+)px$/);
      return m ? parseFloat(m[1]) : null;
    }

    // Pre-normalize palette to LAB once per scan (not per element!)
    function buildPaletteLab(
      palette: string[],
    ): Array<{ hex: string; lab: [number, number, number] }> {
      return palette.map((hex) => ({
        hex,
        lab: rgbToLab(normalizeRgb(hex)),
      }));
    }

    function isNearScale(value: number, scale: number[], tol: number): boolean {
      // tol is a percentage; for spacing/radius we treat it as px tolerance
      // directly (so 5% → 5px window, which is sensible for 4-96px scales).
      return scale.some((s) => Math.abs(value - s) <= tol);
    }

    function findClosestColor(
      target: string,
      paletteLab: Array<{ hex: string; lab: [number, number, number] }>,
    ): { hex: string; distance: number } {
      const targetLab = rgbToLab(normalizeRgb(target));
      let best = { hex: paletteLab[0]?.hex ?? "", distance: Infinity };
      for (const entry of paletteLab) {
        const d = deltaE2000(targetLab, entry.lab);
        if (d < best.distance) best = { hex: entry.hex, distance: d };
      }
      return best;
    }

    interface TokenFinding {
      property: string;
      value: string;
      element: string;
      category: "color" | "typography" | "spacing" | "radius";
      issue: string;
      suggestion?: string;
    }

    function scan(spec: DesignSpec): TokenFinding[] {
      const findings: TokenFinding[] = [];
      const elements = document.querySelectorAll("body *");
      const maxElements = Math.min(elements.length, 500);
      // ΔE2000 threshold: ~2.3 is "just noticeable"; 5 is a clear mismatch.
      const colorThreshold = Math.max(2.3, (tolerance / 100) * 20);
      const paletteLab = buildPaletteLab(spec.colors);

      for (let i = 0; i < maxElements; i++) {
        const el = elements[i] as HTMLElement;
        if (el.id?.startsWith("fdh-")) continue;
        if (el.hasAttribute("data-fdh-overlay")) continue;
        const cs = getComputedStyle(el);
        const tag = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : ""}`;

        if (checkSpacing && spec.spacings.length > 0) {
          const spacingProps = [
            "margin-top",
            "margin-right",
            "margin-bottom",
            "margin-left",
            "padding-top",
            "padding-right",
            "padding-bottom",
            "padding-left",
            "gap",
          ];
          for (const prop of spacingProps) {
            const v = cs.getPropertyValue(prop);
            const px = parsePx(v);
            if (px !== null && px > 0) {
              if (!isNearScale(px, spec.spacings, tolerance)) {
                const closest = spec.spacings.reduce((best, s) =>
                  Math.abs(s - px) < Math.abs(best - px) ? s : best,
                );
                findings.push({
                  property: prop,
                  value: v,
                  element: tag,
                  category: "spacing",
                  issue: `Non-token spacing: ${v}`,
                  suggestion: `Closest token: ${closest}px`,
                });
              }
            }
          }
        }

        if (checkTypography) {
          const fontSize = cs.getPropertyValue("font-size");
          const px = parsePx(fontSize);
          if (px !== null && px > 0 && spec.fontSizes.length > 0) {
            if (!isNearScale(px, spec.fontSizes, tolerance)) {
              const closest = spec.fontSizes.reduce((best, s) =>
                Math.abs(s - px) < Math.abs(best - px) ? s : best,
              );
              findings.push({
                property: "font-size",
                value: fontSize,
                element: tag,
                category: "typography",
                issue: `Non-token font-size: ${fontSize}`,
                suggestion: `Closest token: ${closest}px`,
              });
            }
          }

          const fontWeight = cs.getPropertyValue("font-weight");
          const weight = parseInt(fontWeight, 10);
          if (
            !isNaN(weight) &&
            spec.fontWeights.length > 0 &&
            !spec.fontWeights.includes(weight)
          ) {
            findings.push({
              property: "font-weight",
              value: fontWeight,
              element: tag,
              category: "typography",
              issue: `Non-token font-weight: ${fontWeight}`,
            });
          }
        }

        if (checkColors && paletteLab.length > 0) {
          const colorProps = ["color", "background-color", "border-top-color"];
          for (const prop of colorProps) {
            const v = cs.getPropertyValue(prop);
            if (
              v &&
              v !== "rgba(0, 0, 0, 0)" &&
              v !== "transparent" &&
              !v.startsWith("rgb(0, 0, 0)") &&
              !v.startsWith("rgba(0, 0, 0, 0)")
            ) {
              const closest = findClosestColor(v, paletteLab);
              if (closest.distance > colorThreshold) {
                findings.push({
                  property: prop,
                  value: v,
                  element: tag,
                  category: "color",
                  issue: `Off-palette color: ${v} (ΔE=${closest.distance.toFixed(1)})`,
                  suggestion: `Closest token: ${closest.hex}`,
                });
              }
            }
          }
        }

        if (checkBorderRadius && spec.radii.length > 0) {
          const radiusProps = [
            "border-top-left-radius",
            "border-top-right-radius",
            "border-bottom-left-radius",
            "border-bottom-right-radius",
          ];
          for (const prop of radiusProps) {
            const v = cs.getPropertyValue(prop);
            // skip "Xpx Ypx" elliptical radii
            if (!v || v.includes(" ")) continue;
            const px = parsePx(v);
            if (px !== null && px > 0) {
              if (!isNearScale(px, spec.radii, tolerance)) {
                findings.push({
                  property: prop,
                  value: v,
                  element: tag,
                  category: "radius",
                  issue: `Non-token border-radius: ${v}`,
                });
              }
            }
          }
        }
      }

      return findings;
    }

    function escapeHtml(s: string): string {
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function createPanel(): HTMLDivElement {
      const el = document.createElement("div");
      el.setAttribute("data-fdh-overlay", "dsv");
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "false");
      el.setAttribute("aria-label", "Design System Validator");
      el.style.cssText = `
        position: fixed; top: 20px; right: 20px; width: 420px; max-height: 85vh;
        font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #e2e8f0;
        background: #0f172a; border: 1px solid #334155; border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); z-index: 2147483647;
        pointer-events: auto; display: flex; flex-direction: column; overflow: hidden;
      `;

      const spec = discoverSpec();
      const findings = scan(spec);

      const colorIssues = findings.filter((f) => f.category === "color").length;
      const typoIssues = findings.filter(
        (f) => f.category === "typography",
      ).length;
      const spacingIssues = findings.filter(
        (f) => f.category === "spacing",
      ).length;
      const radiusIssues = findings.filter(
        (f) => f.category === "radius",
      ).length;

      el.innerHTML = `
        <div data-drag-handle style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#1e293b;border-bottom:1px solid #334155;cursor:move;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;">
            <span style="color:#3b82f6;">&#10003;</span> Design System Validator
          </div>
          <button data-action="close" aria-label="Close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:4px;line-height:1;">&times;</button>
        </div>
        <div style="padding:10px 18px;background:#0f172a;border-bottom:1px solid #1e293b;font-size:11px;color:#94a3b8;">
          <strong style="color:#cbd5e1;">Spec source:</strong> ${escapeHtml(spec.sourceLabel)}<br>
          <span style="color:#64748b;">${spec.colors.length} colors · ${spec.spacings.length} spacings · ${spec.fontSizes.length} font sizes · ${spec.radii.length} radii</span>
        </div>
        <div style="padding:14px 18px;display:flex;gap:8px;border-bottom:1px solid #1e293b;">
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:18px;font-weight:700;color:${colorIssues > 0 ? "#f59e0b" : "#22c55e"}">${colorIssues}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Color</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:18px;font-weight:700;color:${typoIssues > 0 ? "#f59e0b" : "#22c55e"}">${typoIssues}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Typography</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:18px;font-weight:700;color:${spacingIssues > 0 ? "#f59e0b" : "#22c55e"}">${spacingIssues}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Spacing</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#1e293b;border-radius:8px;">
            <div style="font-size:18px;font-weight:700;color:${radiusIssues > 0 ? "#f59e0b" : "#22c55e"}">${radiusIssues}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Radius</div>
          </div>
        </div>
        <div style="overflow-y:auto;flex:1;padding:14px 18px;">
          ${
            spec.colors.length > 0
              ? `<div style="margin-bottom:14px;">
                  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:6px;">Discovered color palette (${spec.colors.length})</div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    ${spec.colors
                      .slice(0, 24)
                      .map(
                        (c) =>
                          `<div title="${escapeHtml(c)}" style="width:20px;height:20px;border-radius:4px;background:${escapeHtml(c)};border:1px solid #475569;"></div>`,
                      )
                      .join("")}
                  </div>
                </div>`
              : ""
          }
          ${
            findings.length > 0
              ? `
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:8px;">Inconsistencies (${findings.length})</div>
              <div style="max-height:300px;overflow-y:auto;">
              ${findings
                .slice(0, 80)
                .map(
                  (f) => `
                <div style="padding:8px 10px;margin-bottom:6px;background:#1e293b;border-radius:6px;border-left:3px solid ${f.category === "color" ? "#3b82f6" : f.category === "typography" ? "#8b5cf6" : f.category === "spacing" ? "#22c55e" : "#ec4899"};">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-weight:500;font-size:12px;">${escapeHtml(f.property)}</span>
                    <span style="font-size:10px;padding:2px 6px;background:#334155;border-radius:4px;color:#94a3b8;">${f.category}</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">${escapeHtml(f.issue)}</div>
                  ${f.suggestion ? `<div style="font-size:11px;color:#22c55e;margin-top:2px;">→ ${escapeHtml(f.suggestion)}</div>` : ""}
                  <div style="font-size:11px;color:#64748b;">on ${escapeHtml(f.element)}</div>
                </div>
              `,
                )
                .join("")}
              </div>
            </div>`
              : `<div style="text-align:center;padding:30px 20px;color:#22c55e;">All scanned elements conform to the discovered design tokens.</div>`
          }
        </div>
        <div style="padding:10px 18px;border-top:1px solid #1e293b;display:flex;gap:8px;">
          <button data-action="rescan" style="flex:1;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;cursor:pointer;font-size:12px;">Rescan</button>
          <button data-action="export" style="flex:1;padding:8px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:6px;color:#3b82f6;cursor:pointer;font-size:12px;">Export JSON</button>
        </div>
      `;

      // Drag handlers (with cleanup)
      let dragging = false;
      let dragX = 0;
      let dragY = 0;
      const handle = el.querySelector(
        "[data-drag-handle]",
      ) as HTMLElement | null;
      const onMove = (e: MouseEvent) => {
        if (!dragging) return;
        el.style.left = `${e.clientX - dragX}px`;
        el.style.top = `${e.clientY - dragY}px`;
        el.style.right = "auto";
      };
      const onUp = () => {
        dragging = false;
      };
      if (handle) {
        const onDown = (e: MouseEvent) => {
          dragging = true;
          dragX = e.clientX - el.offsetLeft;
          dragY = e.clientY - el.offsetTop;
          e.preventDefault();
        };
        handle.addEventListener("mousedown", onDown);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        cleanupFns.push(() => {
          handle.removeEventListener("mousedown", onDown);
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        });
      }

      el.querySelector('[data-action="close"]')?.addEventListener(
        "click",
        () => {
          cleanup();
        },
      );

      el.querySelector('[data-action="rescan"]')?.addEventListener(
        "click",
        () => {
          if (panel && !disposed) {
            removeOverlayElement(panel);
            panel = createPanel();
            addOverlayElement(panel);
          }
        },
      );

      el.querySelector('[data-action="export"]')?.addEventListener(
        "click",
        () => {
          const data = {
            url: window.location.href,
            timestamp: Date.now(),
            spec,
            findings,
            summary: {
              colorIssues,
              typographyIssues: typoIssues,
              spacingIssues,
              radiusIssues,
            },
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `design-system-report-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        },
      );

      return el;
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      while (cleanupFns.length > 0) {
        try {
          cleanupFns.pop()?.();
        } catch {
          // best-effort
        }
      }
      if (probeEl.parentElement) {
        probeEl.remove();
      }
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
