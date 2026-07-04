import type { ToolDefinition } from "../types";
import {
  ToolPanel,
  createTabBar,
  createButton,
  createBadge,
} from "@/content/tool-panel";
import { getOverlayContainer } from "@/content/overlay-manager";

export const designTokenExtractor: ToolDefinition = {
  id: "design-token-extractor",
  name: "Design Token Extractor",
  description:
    "Extract and export design tokens: colors, spacing, typography, shadows, and breakpoints",
  category: "css",
  icon: "palette",

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
      hsl?: [number, number, number];
      family?: string;
      humanName?: string;
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
      type: "min-width" | "max-width";
      count: number;
    }

    const colorMap = new Map<string, TokenEntry>();
    const spacingMap = new Map<string, TokenEntry>();
    const typographyByFamily = new Map<string, TypographyCombo[]>();
    const radiiMap = new Map<string, TokenEntry>();
    const shadowMap = new Map<string, TokenEntry>();
    const breakpoints: BreakpointEntry[] = [];

    // ---- Color helpers ----
    // CIELAB ΔE2000 is the perceptually-uniform color difference metric used
    // by design tools (Figma, Sketch). Plain RGB euclidean distance mis-groups
    // near-duplicate greens vs reds. We use the same implementation as the
    // design-system-validator for consistency across the suite.
    function srgbToLinear(c: number): number {
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    function rgbToXyz(
      r: number,
      g: number,
      b: number,
    ): [number, number, number] {
      const rl = srgbToLinear(r / 255);
      const gl = srgbToLinear(g / 255);
      const bl = srgbToLinear(b / 255);
      // D65 illuminant
      return [
        (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100,
        (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) * 100,
        (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) * 100,
      ];
    }

    function xyzToLab(
      x: number,
      y: number,
      z: number,
    ): [number, number, number] {
      const xn = 95.047,
        yn = 100.0,
        zn = 108.883;
      const fx =
        x / xn > 0.008856 ? Math.cbrt(x / xn) : (x / xn) * 7.787 + 16 / 116;
      const fy =
        y / yn > 0.008856 ? Math.cbrt(y / yn) : (y / yn) * 7.787 + 16 / 116;
      const fz =
        z / zn > 0.008856 ? Math.cbrt(z / zn) : (z / zn) * 7.787 + 16 / 116;
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    }

    function hexToLab(hex: string): [number, number, number] | null {
      const rgb = hexToRgb(hex);
      if (!rgb) return null;
      const xyz = rgbToXyz(rgb[0], rgb[1], rgb[2]);
      return xyzToLab(xyz[0], xyz[1], xyz[2]);
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
      const a1p = a1 * (1 + G);
      const a2p = a2 * (1 + G);
      const C1p = Math.sqrt(a1p * a1p + b1 * b1);
      const C2p = Math.sqrt(a2p * a2p + b2 * b2);
      const h1p =
        (Math.atan2(b1, a1p) * 180) / Math.PI >= 0
          ? (Math.atan2(b1, a1p) * 180) / Math.PI
          : (Math.atan2(b1, a1p) * 180) / Math.PI + 360;
      const h2p =
        (Math.atan2(b2, a2p) * 180) / Math.PI >= 0
          ? (Math.atan2(b2, a2p) * 180) / Math.PI
          : (Math.atan2(b2, a2p) * 180) / Math.PI + 360;
      const dLp = L2 - L1;
      const dCp = C2p - C1p;
      let dhp = 0;
      if (C1p * C2p !== 0) {
        const diff = h2p - h1p;
        if (Math.abs(diff) <= 180) dhp = diff;
        else if (diff > 180) dhp = diff - 360;
        else dhp = diff + 360;
      }
      const dHp =
        2 * Math.sqrt(C1p * C2p) * Math.sin(((dhp / 2) * Math.PI) / 180);
      const Lbarp = (L1 + L2) / 2;
      const Cbarp = (C1p + C2p) / 2;
      let hBarP = 0;
      if (C1p * C2p !== 0) {
        const diff = Math.abs(h1p - h2p);
        if (diff <= 180) hBarP = (h1p + h2p) / 2;
        else if (h1p + h2p < 360) hBarP = (h1p + h2p + 360) / 2;
        else hBarP = (h1p + h2p - 360) / 2;
      }
      const T =
        1 -
        0.17 * Math.cos(((hBarP - 30) * Math.PI) / 180) +
        0.24 * Math.cos((2 * hBarP * Math.PI) / 180) +
        0.32 * Math.cos(((3 * hBarP + 6) * Math.PI) / 180) -
        0.2 * Math.cos(((4 * hBarP - 63) * Math.PI) / 180);
      const dTheta = 30 * Math.exp(-Math.pow((hBarP - 275) / 25, 2));
      const Cbarp7 = Math.pow(Cbarp, 7);
      const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
      const SL =
        1 +
        (0.015 * Math.pow(Lbarp - 50, 2)) /
          Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
      const SC = 1 + 0.045 * Cbarp;
      const SH = 1 + 0.015 * Cbarp * T;
      const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;
      return Math.sqrt(
        Math.pow(dLp / (kL * SL), 2) +
          Math.pow(dCp / (kC * SC), 2) +
          Math.pow(dHp / (kH * SH), 2) +
          RT * (dCp / (kC * SC)) * (dHp / (kH * SH)),
      );
    }

    function rgbToHex(rgb: string): string {
      const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      if (!m) {
        // Accept already-hex input verbatim (3 or 6 digit).
        if (/^#[0-9a-f]{6}$/i.test(rgb)) return rgb.toLowerCase();
        if (/^#[0-9a-f]{3}$/i.test(rgb)) {
          return (
            "#" +
            rgb
              .slice(1)
              .split("")
              .map((c) => c + c)
              .join("")
          );
        }
        return rgb;
      }
      const r = parseInt(m[1]);
      const g = parseInt(m[2]);
      const b = parseInt(m[3]);
      return (
        "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
      );
    }

    function hexToRgb(hex: string): [number, number, number] | null {
      const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!m) return null;
      return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    }

    // Perceptual color difference via CIELAB ΔE2000. A value of ~1.0 is the
    // "just noticeable difference" for trained observers; <2.3 is generally
    // considered perceptually identical.
    function colorDelta(hex1: string, hex2: string): number {
      const lab1 = hexToLab(hex1);
      const lab2 = hexToLab(hex2);
      if (!lab1 || !lab2) return Infinity;
      return deltaE2000(lab1, lab2);
    }

    function rgbToHsl(
      r: number,
      g: number,
      b: number,
    ): [number, number, number] {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          default:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    function hexToHsl(hex: string): [number, number, number] | null {
      const rgb = hexToRgb(hex);
      if (!rgb) return null;
      return rgbToHsl(rgb[0], rgb[1], rgb[2]);
    }

    function hslToString(hsl: [number, number, number]): string {
      return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
    }

    function hueFamily(hsl: [number, number, number]): string {
      const [h, s, l] = hsl;
      if (s < 8) return l > 90 ? "white" : l < 10 ? "black" : "gray";
      if (h < 15 || h >= 345) return "red";
      if (h < 45) return "orange";
      if (h < 65) return "yellow";
      if (h < 165) return "green";
      if (h < 195) return "cyan";
      if (h < 255) return "blue";
      if (h < 285) return "purple";
      return "pink";
    }

    function humanReadableColorName(hsl: [number, number, number]): string {
      const family = hueFamily(hsl);
      const lightnessLabel = hsl[2] < 20 ? "dark" : hsl[2] > 80 ? "light" : "";
      const saturationLabel = hsl[1] < 30 ? "muted" : "";
      return (
        [lightnessLabel, saturationLabel, family].filter(Boolean).join(" ") ||
        family
      );
    }

    function normalizeColor(raw: string): string {
      if (
        !raw ||
        raw === "transparent" ||
        raw === "rgba(0, 0, 0, 0)" ||
        raw === "initial" ||
        raw === "inherit" ||
        raw === "currentColor"
      ) {
        return "";
      }
      if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw.toLowerCase();
      const hex = rgbToHex(raw);
      return hex !== raw ? hex.toLowerCase() : raw;
    }

    // ---- Spacing helper ----
    function normalizeSpacing(raw: string): string {
      if (
        !raw ||
        raw === "0px" ||
        raw === "0" ||
        raw === "auto" ||
        raw === "initial" ||
        raw === "inherit"
      ) {
        return "";
      }
      return raw;
    }

    // ---- DOM scan ----
    function scanDOM() {
      const elements = document.querySelectorAll("body *");
      const maxElements = Math.min(elements.length, 500);

      const tempEl = document.createElement("div");
      document.body.appendChild(tempEl);

      function getNormalizedHex(value: string): string {
        tempEl.style.color = value;
        const computed = getComputedStyle(tempEl).color;
        return rgbToHex(computed).toLowerCase();
      }

      for (let i = 0; i < maxElements; i++) {
        const el = elements[i] as HTMLElement;
        if (
          el.id?.startsWith("fdh-") ||
          el.tagName === "SCRIPT" ||
          el.tagName === "STYLE" ||
          el.tagName === "NOSCRIPT"
        )
          continue;

        const cs = getComputedStyle(el);

        // Colors
        const colorProps = [
          "color",
          "background-color",
          "border-top-color",
        ] as const;
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
            const hsl = hexToHsl(normalizedHex);
            const entry: TokenEntry = { value: raw, normalizedHex, count: 1 };
            if (hsl) {
              entry.hsl = hsl;
              entry.family = hueFamily(hsl);
              entry.humanName = humanReadableColorName(hsl);
            }
            colorMap.set(normalizedHex, entry);
          }
        }

        // Spacing
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

        // Typography combos (keyed by font-family)
        const fontFamily = cs.getPropertyValue("font-family");
        const fontSize = cs.getPropertyValue("font-size");
        const fontWeight = cs.getPropertyValue("font-weight");
        const lineHeight = cs.getPropertyValue("line-height");
        const familyKey = fontFamily || "inherit";
        const familyList = typographyByFamily.get(familyKey) ?? [];
        const existingCombo = familyList.find(
          (c) =>
            c.fontSize === fontSize &&
            c.fontWeight === fontWeight &&
            c.lineHeight === lineHeight,
        );
        if (existingCombo) {
          existingCombo.count++;
        } else {
          familyList.push({
            fontFamily,
            fontSize,
            fontWeight,
            lineHeight,
            count: 1,
          });
          typographyByFamily.set(familyKey, familyList);
        }

        // Border radii — capture ALL FOUR sides plus shorthand
        const radiusProps = [
          "border-radius",
          "border-top-left-radius",
          "border-top-right-radius",
          "border-bottom-right-radius",
          "border-bottom-left-radius",
        ] as const;
        for (const prop of radiusProps) {
          const radiusRaw = cs.getPropertyValue(prop);
          if (
            !radiusRaw ||
            radiusRaw === "0px" ||
            radiusRaw === "none" ||
            radiusRaw === "initial"
          )
            continue;
          const existingR = radiiMap.get(radiusRaw);
          if (existingR) {
            existingR.count++;
          } else {
            radiiMap.set(radiusRaw, { value: radiusRaw, count: 1 });
          }
        }

        // Shadows
        const boxShadow = cs.getPropertyValue("box-shadow");
        if (boxShadow && boxShadow !== "none" && boxShadow !== "initial") {
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
            const delta = colorDelta(
              entryA.normalizedHex,
              entryB.normalizedHex,
            );
            // ΔE2000 < 3 ≈ perceptually indistinguishable; < 6 ≈ "very close".
            // We treat < 4 as a duplicate candidate so reviewers see near-matches.
            if (delta > 0 && delta < 4) {
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

      function walk(rules: CSSRuleList): void {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSMediaRule) {
            const mediaText =
              rule.conditionText || (rule.media && rule.media.mediaText) || "";
            const minMatch = mediaText.match(/\(\s*min-width\s*:\s*([^)]+)\)/);
            const maxMatch = mediaText.match(/\(\s*max-width\s*:\s*([^)]+)\)/);

            if (minMatch) {
              const val = minMatch[1].trim();
              const existing = seen.get("min:" + val);
              if (existing) {
                existing.count++;
              } else {
                seen.set("min:" + val, {
                  value: val,
                  type: "min-width",
                  count: 1,
                });
              }
            }
            if (maxMatch) {
              const val = maxMatch[1].trim();
              const existing = seen.get("max:" + val);
              if (existing) {
                existing.count++;
              } else {
                seen.set("max:" + val, {
                  value: val,
                  type: "max-width",
                  count: 1,
                });
              }
            }
          }
          if (
            rule instanceof CSSMediaRule ||
            rule instanceof CSSSupportsRule ||
            rule instanceof CSSLayerBlockRule
          ) {
            try {
              walk(rule.cssRules);
            } catch {
              // nested cross-origin
            }
            continue;
          }
        }
      }

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules ?? sheet.rules);
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
    const sortedColors = Array.from(colorMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    const sortedSpacing = Array.from(spacingMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    const sortedTypography = Array.from(typographyByFamily.values())
      .flat()
      .sort((a, b) => b.count - a.count);
    const typographyFamilies = Array.from(typographyByFamily.entries()).map(
      ([family, combos]) => ({
        family,
        combos: combos.sort((a, b) => b.count - a.count),
      }),
    );
    const sortedRadii = Array.from(radiiMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    const sortedShadows = Array.from(shadowMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    const colorsByFamily = (() => {
      const groups = new Map<string, TokenEntry[]>();
      for (const entry of sortedColors) {
        const fam = entry.family || "other";
        const list = groups.get(fam) ?? [];
        list.push(entry);
        groups.set(fam, list);
      }
      const familyOrder = [
        "red",
        "orange",
        "yellow",
        "green",
        "cyan",
        "blue",
        "purple",
        "pink",
        "gray",
        "white",
        "black",
        "other",
      ];
      const ordered: Array<[string, TokenEntry[]]> = [];
      for (const fam of familyOrder) {
        const list = groups.get(fam);
        if (list && list.length > 0) ordered.push([fam, list]);
      }
      return ordered;
    })();
    const sortedBreakpoints = breakpoints.sort((a, b) => {
      const parseBp = (v: string) => parseFloat(v);
      return parseBp(a.value) - parseBp(b.value);
    });

    // ---- Token naming helpers ----
    function generateColorName(hex: string, index: number): string {
      const hsl = hexToHsl(hex);
      if (!hsl) return "color-" + index;
      const human = humanReadableColorName(hsl);
      const safe = human.replace(/\s+/g, "-").toLowerCase();
      return `${safe}-${Math.round(hsl[0])}`;
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
          spacingObj[String(i + 1)] = remVal + "rem";
        } else {
          spacingObj[String(i + 1)] = s.value;
        }
      });

      const radiiNames = ["sm", "md", "lg", "xl", "2xl", "3xl", "full"];
      const radiiObj: Record<string, string> = {};
      sortedRadii.forEach((r, i) => {
        radiiObj[radiiNames[i] || "radius-" + i] = r.value;
      });

      const shadowNames = ["sm", "md", "lg", "xl", "2xl"];
      const shadowsObj: Record<string, string> = {};
      sortedShadows.forEach((s, i) => {
        shadowsObj[shadowNames[i] || "shadow-" + i] = s.value;
      });

      const config = {
        theme: {
          colors: colorsObj,
          spacing: spacingObj,
          borderRadius: radiiObj,
          boxShadow: shadowsObj,
        },
      };

      return (
        "/** @type {import('tailwindcss').Config} */\nmodule.exports = " +
        JSON.stringify(config, null, 2) +
        ";"
      );
    }

    function exportCSSCustomProperties(): string {
      const lines: string[] = [":root {"];

      sortedColors.forEach((c, i) => {
        const name = generateColorName(c.normalizedHex || c.value, i);
        lines.push(
          "  --color-" + name + ": " + (c.normalizedHex || c.value) + ";",
        );
      });

      sortedSpacing.forEach((s, i) => {
        lines.push("  --spacing-" + (i + 1) + ": " + s.value + ";");
      });

      sortedTypography.forEach((t, i) => {
        lines.push("  --font-family-" + (i + 1) + ": " + t.fontFamily + ";");
        lines.push("  --font-size-" + (i + 1) + ": " + t.fontSize + ";");
        lines.push("  --font-weight-" + (i + 1) + ": " + t.fontWeight + ";");
        lines.push("  --line-height-" + (i + 1) + ": " + t.lineHeight + ";");
      });

      const radiiNames = ["sm", "md", "lg", "xl", "2xl", "3xl", "full"];
      sortedRadii.forEach((r, i) => {
        const name = radiiNames[i] || "radius-" + i;
        lines.push("  --radius-" + name + ": " + r.value + ";");
      });

      const shadowNames = ["sm", "md", "lg", "xl", "2xl"];
      sortedShadows.forEach((s, i) => {
        const name = shadowNames[i] || "shadow-" + i;
        lines.push("  --shadow-" + name + ": " + s.value + ";");
      });

      sortedBreakpoints.forEach((bp) => {
        const prefix = bp.type === "min-width" ? "up" : "down";
        lines.push(
          "  --breakpoint-" +
            prefix +
            "-" +
            bp.value.replace(/[^a-z0-9]/gi, "") +
            ": " +
            bp.value +
            ";",
        );
      });

      lines.push("}");
      return lines.join("\n");
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
          type: "color",
          description: "Used " + c.count + " times",
        };
      });

      sortedSpacing.forEach((s, i) => {
        tokens.spacing[String(i + 1)] = {
          value: s.value,
          type: "dimension",
          description: "Used " + s.count + " times",
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
          type: "typography",
          description: "Used " + t.count + " times",
        };
      });

      const radiiNames = ["sm", "md", "lg", "xl", "2xl", "3xl", "full"];
      sortedRadii.forEach((r, i) => {
        const name = radiiNames[i] || "radius-" + i;
        tokens.borderRadius[name] = {
          value: r.value,
          type: "dimension",
          description: "Used " + r.count + " times",
        };
      });

      const shadowNames = ["sm", "md", "lg", "xl", "2xl"];
      sortedShadows.forEach((s, i) => {
        const name = shadowNames[i] || "shadow-" + i;
        tokens.shadow[name] = {
          value: s.value,
          type: "shadow",
          description: "Used " + s.count + " times",
        };
      });

      sortedBreakpoints.forEach((bp) => {
        const prefix = bp.type === "min-width" ? "up" : "down";
        const key = prefix + "-" + bp.value.replace(/[^a-z0-9]/gi, "");
        tokens.breakpoint[key] = {
          value: bp.value,
          type: "dimension",
          description: bp.type + ", used in " + bp.count + " rules",
        };
      });

      return JSON.stringify(tokens, null, 2);
    }

    function exportFigmaVariablesJSON(): string {
      const figma = {
        collections: [
          {
            name: "Colors",
            modes: [{ name: "Default", modeId: "default" }],
            variables: sortedColors.map((c, i) => ({
              name: generateColorName(c.normalizedHex || c.value, i),
              resolvedValues: {
                default: {
                  value: c.normalizedHex || c.value,
                  type: "COLOR",
                },
              },
            })),
          },
          {
            name: "Spacing",
            modes: [{ name: "Default", modeId: "default" }],
            variables: sortedSpacing.map((s, i) => ({
              name: "spacing-" + (i + 1),
              resolvedValues: {
                default: {
                  value: parseFloat(s.value) || 0,
                  type: "FLOAT",
                },
              },
            })),
          },
          {
            name: "Typography",
            modes: [{ name: "Default", modeId: "default" }],
            variables: sortedTypography.map((t, i) => ({
              name: "typography-" + (i + 1),
              resolvedValues: {
                default: {
                  value: {
                    fontFamily: t.fontFamily,
                    fontSize: parseFloat(t.fontSize) || 16,
                    fontWeight: t.fontWeight,
                    lineHeight: t.lineHeight,
                  },
                  type: "COMPOSITE",
                },
              },
            })),
          },
          {
            name: "Border Radii",
            modes: [{ name: "Default", modeId: "default" }],
            variables: sortedRadii.map((r, i) => ({
              name:
                ["sm", "md", "lg", "xl", "2xl", "3xl", "full"][i] ||
                "radius-" + i,
              resolvedValues: {
                default: {
                  value: parseFloat(r.value) || 0,
                  type: "FLOAT",
                },
              },
            })),
          },
          {
            name: "Shadows",
            modes: [{ name: "Default", modeId: "default" }],
            variables: sortedShadows.map((s, i) => ({
              name: ["sm", "md", "lg", "xl", "2xl"][i] || "shadow-" + i,
              resolvedValues: {
                default: {
                  value: s.value,
                  type: "STRING",
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
        const toast = document.createElement("div");
        toast.style.cssText = [
          "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);",
          "padding: 8px 16px; background: #22c55e; color: #fff; border-radius: 6px;",
          "font-size: 12px; font-family: system-ui, sans-serif; z-index: 2147483647;",
          "pointer-events: none;",
        ].join(" ");
        toast.textContent = label + " copied to clipboard";
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
      const el = document.createElement("div");
      el.style.cssText = "text-align: center; padding: 20px; color: #64748b;";
      el.textContent = msg;
      container.appendChild(el);
    }

    function renderColors(container: HTMLElement) {
      clearContainer(container);
      if (sortedColors.length === 0) {
        createEmptyMessage(container, "No colors found.");
        return;
      }
      if (colorsByFamily.length === 0) {
        return;
      }
      for (const [family, entries] of colorsByFamily) {
        const familyHeader = document.createElement("div");
        familyHeader.style.cssText =
          "color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 8px 0 4px; padding: 0 8px;";
        familyHeader.textContent = `${family} (${entries.length})`;
        container.appendChild(familyHeader);

        for (const entry of entries) {
          const row = document.createElement("div");
          row.style.cssText =
            "display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;";

          const swatch = document.createElement("div");
          swatch.style.cssText =
            "width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0; border: 1px solid #475569;";
          swatch.style.background = entry.normalizedHex || entry.value;
          row.appendChild(swatch);

          const textBlock = document.createElement("div");
          textBlock.style.cssText =
            "flex: 1; display: flex; flex-direction: column; min-width: 0;";
          const value = document.createElement("span");
          value.style.cssText =
            "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px;";
          value.textContent = entry.normalizedHex || entry.value;
          textBlock.appendChild(value);
          if (entry.hsl) {
            const hslLine = document.createElement("span");
            hslLine.style.cssText =
              "color: #94a3b8; font-family: 'SF Mono', monospace; font-size: 10px;";
            hslLine.textContent =
              `${hslToString(entry.hsl)} · ${entry.humanName || ""}`.trim();
            textBlock.appendChild(hslLine);
          }
          row.appendChild(textBlock);

          const countBadge = document.createElement("span");
          countBadge.style.cssText = "color: #64748b; font-size: 11px;";
          countBadge.textContent = entry.count + "x";
          row.appendChild(countBadge);

          if (entry.isDuplicate) {
            row.appendChild(createBadge("near-dup", "#f59e0b"));
          }

          container.appendChild(row);
        }
      }
    }

    function renderSpacing(container: HTMLElement) {
      clearContainer(container);
      if (sortedSpacing.length === 0) {
        createEmptyMessage(container, "No spacing values found.");
        return;
      }
      for (const entry of sortedSpacing) {
        const row = document.createElement("div");
        row.style.cssText =
          "display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;";

        const bar = document.createElement("div");
        const pxVal = parseFloat(entry.value);
        const barWidth = Math.min(Math.max(pxVal * 2, 4), 100);
        bar.style.cssText =
          "height: 8px; border-radius: 2px; background: #3b82f6; flex-shrink: 0;";
        bar.style.width = barWidth + "px";
        row.appendChild(bar);

        const value = document.createElement("span");
        value.style.cssText =
          "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = entry.value;
        row.appendChild(value);

        const countBadge = document.createElement("span");
        countBadge.style.cssText = "color: #64748b; font-size: 11px;";
        countBadge.textContent = entry.count + "x";
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderTypography(container: HTMLElement) {
      clearContainer(container);
      if (typographyFamilies.length === 0) {
        createEmptyMessage(container, "No typography values found.");
        return;
      }
      for (const { family, combos } of typographyFamilies) {
        const familyHeader = document.createElement("div");
        familyHeader.style.cssText =
          "color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 8px 0 4px; padding: 0 8px;";
        const label =
          family && family !== "inherit"
            ? family.split(",")[0].trim()
            : "(inherited)";
        familyHeader.textContent = `${label} (${combos.length})`;
        container.appendChild(familyHeader);

        for (const combo of combos) {
          const row = document.createElement("div");
          row.style.cssText =
            "padding: 8px; border-radius: 4px; background: #1e293b; margin-bottom: 6px;";

          const preview = document.createElement("div");
          preview.style.cssText =
            "margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e2e8f0;";
          preview.style.fontFamily = combo.fontFamily || "inherit";
          preview.style.fontSize = combo.fontSize;
          preview.style.fontWeight = combo.fontWeight;
          preview.style.lineHeight = combo.lineHeight;
          preview.textContent = "The quick brown fox jumps over the lazy dog";
          row.appendChild(preview);

          const details = document.createElement("div");
          details.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px;";

          const chips: [string, string][] = [
            ["Family", combo.fontFamily.split(",")[0]],
            ["Size", combo.fontSize],
            ["Weight", combo.fontWeight],
            ["Line Height", combo.lineHeight],
          ];
          for (const [lab, val] of chips) {
            const chip = document.createElement("span");
            chip.style.cssText =
              "padding: 2px 6px; border-radius: 4px; background: #0c1222; color: #94a3b8; font-size: 10px; font-family: 'SF Mono', monospace;";
            chip.textContent = lab + ": " + val;
            details.appendChild(chip);
          }

          const countChip = document.createElement("span");
          countChip.style.cssText =
            "padding: 2px 6px; border-radius: 4px; background: #0c1222; color: #64748b; font-size: 10px;";
          countChip.textContent = combo.count + "x";
          details.appendChild(countChip);

          row.appendChild(details);
          container.appendChild(row);
        }
      }
    }

    function renderRadii(container: HTMLElement) {
      clearContainer(container);
      if (sortedRadii.length === 0) {
        createEmptyMessage(container, "No border radii found.");
        return;
      }
      for (const entry of sortedRadii) {
        const row = document.createElement("div");
        row.style.cssText =
          "display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;";

        const shape = document.createElement("div");
        const radiusVal = Math.min(parseFloat(entry.value) || 0, 50);
        shape.style.cssText =
          "width: 24px; height: 24px; background: #3b82f6; flex-shrink: 0;";
        shape.style.borderRadius = radiusVal + "px";
        row.appendChild(shape);

        const value = document.createElement("span");
        value.style.cssText =
          "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = entry.value;
        row.appendChild(value);

        const countBadge = document.createElement("span");
        countBadge.style.cssText = "color: #64748b; font-size: 11px;";
        countBadge.textContent = entry.count + "x";
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderShadows(container: HTMLElement) {
      clearContainer(container);
      if (sortedShadows.length === 0) {
        createEmptyMessage(container, "No box shadows found.");
        return;
      }
      for (const entry of sortedShadows) {
        const row = document.createElement("div");
        row.style.cssText =
          "display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;";

        const shadowPreview = document.createElement("div");
        shadowPreview.style.cssText =
          "width: 32px; height: 32px; border-radius: 4px; background: #f1f5f9; flex-shrink: 0;";
        shadowPreview.style.boxShadow = entry.value;
        row.appendChild(shadowPreview);

        const value = document.createElement("span");
        value.style.cssText =
          "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 11px; flex: 1; word-break: break-all;";
        const displayVal =
          entry.value.length > 50
            ? entry.value.substring(0, 50) + "..."
            : entry.value;
        value.textContent = displayVal;
        row.appendChild(value);

        const countBadge = document.createElement("span");
        countBadge.style.cssText = "color: #64748b; font-size: 11px;";
        countBadge.textContent = entry.count + "x";
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    function renderBreakpoints(container: HTMLElement) {
      clearContainer(container);
      if (sortedBreakpoints.length === 0) {
        createEmptyMessage(container, "No breakpoints found in stylesheets.");
        return;
      }
      for (const bp of sortedBreakpoints) {
        const row = document.createElement("div");
        row.style.cssText =
          "display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: #1e293b; margin-bottom: 4px;";

        const typeLabel = document.createElement("span");
        const isMin = bp.type === "min-width";
        typeLabel.style.cssText =
          "padding: 2px 6px; border-radius: 4px; font-size: 10px;";
        typeLabel.style.background = isMin ? "#22c55e20" : "#f59e0b20";
        typeLabel.style.color = isMin ? "#22c55e" : "#f59e0b";
        typeLabel.textContent = bp.type;
        row.appendChild(typeLabel);

        const value = document.createElement("span");
        value.style.cssText =
          "color: #e2e8f0; font-family: 'SF Mono', monospace; font-size: 12px; flex: 1;";
        value.textContent = bp.value;
        row.appendChild(value);

        const countBadge = document.createElement("span");
        countBadge.style.cssText = "color: #64748b; font-size: 11px;";
        countBadge.textContent = bp.count + " rules";
        row.appendChild(countBadge);

        container.appendChild(row);
      }
    }

    // ---- Panel setup ----
    panel = new ToolPanel({
      title: "Design Token Extractor",
      width: 460,
      maxHeight: "85vh",
      onClose: cleanup,
    });

    // Tab bar
    const tabs = [
      { id: "colors", label: "Colors (" + sortedColors.length + ")" },
      { id: "spacing", label: "Spacing (" + sortedSpacing.length + ")" },
      {
        id: "typography",
        label: "Typography (" + sortedTypography.length + ")",
      },
      { id: "radii", label: "Radii (" + sortedRadii.length + ")" },
      { id: "shadows", label: "Shadows (" + sortedShadows.length + ")" },
      {
        id: "breakpoints",
        label: "Breakpoints (" + sortedBreakpoints.length + ")",
      },
    ];

    const contentContainer = document.createElement("div");
    contentContainer.style.cssText =
      "overflow-y: auto; max-height: 400px; padding: 4px 0;";

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
    const footer = document.createElement("div");
    footer.style.cssText =
      "display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0;";

    const exportFormats = [
      { label: "Tailwind Config", fn: exportTailwindConfig },
      { label: "CSS Variables", fn: exportCSSCustomProperties },
      { label: "Style Dictionary", fn: exportStyleDictionaryJSON },
      { label: "Figma Variables", fn: exportFigmaVariablesJSON },
    ];

    for (const fmt of exportFormats) {
      footer.appendChild(
        createButton(fmt.label, () => copyToClipboard(fmt.fn(), fmt.label)),
      );
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
