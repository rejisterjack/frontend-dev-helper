import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

interface RGB {
  r: number;
  g: number;
  b: number;
}
interface RGBA extends RGB {
  a: number;
}

function hexToRgb(hex: string): RGB | null {
  const m3 = hex.match(/^#?([a-f\d]{3})$/i);
  if (m3) {
    const r = parseInt(m3[1][0] + m3[1][0], 16);
    const g = parseInt(m3[1][1] + m3[1][1], 16);
    const b = parseInt(m3[1][2] + m3[1][2], 16);
    return { r, g, b };
  }
  const m6 = hex.match(/^#?([a-f\d]{6})$/i);
  if (m6) {
    return {
      r: parseInt(m6[1].slice(0, 2), 16),
      g: parseInt(m6[1].slice(2, 4), 16),
      b: parseInt(m6[1].slice(4, 6), 16),
    };
  }
  // #rgba / #rrggbbaa — return opaque rgb; caller handles alpha separately
  // via parseColor which returns RGBA.
  const m8 = hex.match(/^#?([a-f\d]{8})$/i);
  if (m8) {
    return {
      r: parseInt(m8[1].slice(0, 2), 16),
      g: parseInt(m8[1].slice(2, 4), 16),
      b: parseInt(m8[1].slice(4, 6), 16),
    };
  }
  return null;
}

function rgbToHex(rgb: RGB): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Composite a foreground RGBA over a background RGB (alpha-blend per the
 * CSS Color Compositing spec). Returns the resulting opaque RGB. Used so
 * that semi-transparent text is measured against its actual rendered color.
 */
function compositeOver(fg: RGBA, bg: RGB): RGB {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

function parseColor(color: string): RGBA | null {
  if (!color) return null;
  const trimmed = color.trim().toLowerCase();

  if (trimmed.startsWith("#")) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) return null;
    // Parse 4- or 8-digit alpha suffix.
    const m4 = trimmed.match(/^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])$/i);
    const m8 = trimmed.match(/^#([a-f\d]{8})$/i);
    let a = 1;
    if (m4) a = parseInt(m4[4] + m4[4], 16) / 255;
    else if (m8) a = parseInt(trimmed.slice(7, 9), 16) / 255;
    return { ...rgb, a };
  }

  // rgb()/rgba()
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgbMatch) {
    return {
      r: parseFloat(rgbMatch[1]),
      g: parseFloat(rgbMatch[2]),
      b: parseFloat(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // hsl()/hsla()
  const hslMatch = trimmed.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (hslMatch) {
    const rgb = hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]) / 100,
      parseFloat(hslMatch[3]) / 100,
    );
    return {
      ...rgb,
      a: hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1,
    };
  }

  // oklch() — fallback to the browser's own parser via a temporary element.
  if (
    trimmed.startsWith("oklch") ||
    trimmed.startsWith("lab") ||
    trimmed.startsWith("lch")
  ) {
    return parseViaDOM(trimmed);
  }

  // Named colors: 'red', 'transparent', 'currentcolor', etc.
  if (/^[a-z]+$/.test(trimmed)) {
    return parseViaDOM(trimmed);
  }

  return null;
}

function parseViaDOM(color: string): RGBA | null {
  const probe = document.createElement("div");
  probe.style.color = "";
  probe.style.color = color;
  if (!probe.style.color) return null;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const m = computed.match(
    /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/,
  );
  if (!m) return null;
  return {
    r: parseFloat(m[1]),
    g: parseFloat(m[2]),
    b: parseFloat(m[3]),
    a: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function getContrastRatio(fg: string, bg: string): number {
  const fgRgba = parseColor(fg);
  const bgRgba = parseColor(bg);
  if (!fgRgba || !bgRgba) return 1;

  // Composite each color over white if it has alpha (text over a real
  // background produces a different effective color than the raw value).
  const bgOpaque: RGB =
    bgRgba.a < 1
      ? compositeOver(bgRgba, { r: 255, g: 255, b: 255 })
      : { r: bgRgba.r, g: bgRgba.g, b: bgRgba.b };
  const fgOpaque: RGB =
    fgRgba.a < 1
      ? compositeOver(fgRgba, bgOpaque)
      : { r: fgRgba.r, g: fgRgba.g, b: fgRgba.b };

  const l1 = relativeLuminance(fgOpaque.r, fgOpaque.g, fgOpaque.b);
  const l2 = relativeLuminance(bgOpaque.r, bgOpaque.g, bgOpaque.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function sanitizeColor(color: string): string {
  const parsed = parseColor(color);
  if (!parsed) return "#000000";
  // Composite over white so the preview reflects what the user actually sees
  // (semi-transparent colors otherwise render through the panel background).
  const opaque =
    parsed.a < 1
      ? compositeOver(parsed, { r: 255, g: 255, b: 255 })
      : { r: parsed.r, g: parsed.g, b: parsed.b };
  return rgbToHex(opaque);
}

interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
  suggestions: string[];
}

function analyzeContrast(
  fg: string,
  bg: string,
  level: "aa" | "aaa" = "aa",
): ContrastResult {
  const ratio = getContrastRatio(fg, bg);
  // WCAG 2.1 thresholds. Large text = ≥18pt (24px) or ≥14pt bold (18.66px).
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7;
  const wcagAALarge = ratio >= 3;
  const wcagAAALarge = ratio >= 4.5;
  const suggestions: string[] = [];

  const target = level === "aaa" ? 7 : 4.5;
  if (ratio < target) {
    suggestions.push(
      `Needs ${target}:1 for ${level.toUpperCase()} normal text (currently ${ratio.toFixed(2)}:1)`,
    );
  }
  if (ratio < 3) {
    suggestions.push("Below 3:1 — fails even large-text AA; very hard to read");
  }

  const c1 = parseColor(fg);
  const c2 = parseColor(bg);
  if (c1 && c2) {
    const diff =
      Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
    if (diff < 50) {
      suggestions.push(
        "Foreground and background are very similar — increase the luminance gap",
      );
    }
  }

  return { ratio, wcagAA, wcagAAA, wcagAALarge, wcagAAALarge, suggestions };
}

export const contrastChecker: ToolDefinition = {
  id: "contrast-checker",
  name: "Contrast Checker",
  description: "Check color contrast ratios against WCAG standards",
  category: "css",
  icon: "Contrast",
  configSchema: {
    standard: {
      type: "select",
      label: "WCAG Standard",
      default: "aa",
      options: [
        { label: "WCAG AA", value: "aa" },
        { label: "WCAG AAA", value: "aaa" },
      ],
    },
    scanAll: { type: "boolean", label: "Scan All Text", default: true },
    highlightFailing: {
      type: "boolean",
      label: "Highlight Failing",
      default: true,
    },
    showRatio: { type: "boolean", label: "Show Ratio", default: true },
    failingColor: {
      type: "color",
      label: "Failing Highlight",
      default: "#ef4444",
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const standard = (cfg.standard as "aa" | "aaa") ?? "aa";
    // Configs that affect future scanAll/highlighting behavior. Currently
    // only `standard` is wired into the live checker; scanAll and
    // highlightFailing will toggle the page-scan overlay (Phase 3 polish).
    void (cfg.scanAll as boolean | undefined);
    void (cfg.highlightFailing as boolean | undefined);
    void (cfg.showRatio as boolean | undefined);
    void (cfg.failingColor as string | undefined);

    let fgColor = "#000000";
    let bgColor = "#ffffff";
    let pickerMode: "foreground" | "background" | null = null;

    const overlay = document.createElement("div");
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
      overlay.textContent = "";
      const result = analyzeContrast(fgColor, bgColor, standard);
      let gradeColor = "#ef4444";
      let grade = "Fail";
      if (result.wcagAAA) {
        gradeColor = "#22c55e";
        grade = "AAA";
      } else if (result.wcagAA) {
        gradeColor = "#3b82f6";
        grade = "AA";
      }

      // Header
      const header = document.createElement("div");
      header.style.cssText = "margin-bottom:20px";

      const headerRow = document.createElement("div");
      headerRow.style.cssText =
        "display:flex;justify-content:space-between;align-items:center";

      const title = document.createElement("h3");
      title.style.cssText = "margin:0;font-size:18px;color:#c084fc";
      title.textContent = "Contrast Checker";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "fdh-cc-close";
      closeBtn.style.cssText =
        "background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px";
      closeBtn.textContent = "×";

      headerRow.appendChild(title);
      headerRow.appendChild(closeBtn);
      header.appendChild(headerRow);

      const subtitle = document.createElement("p");
      subtitle.style.cssText = "margin:8px 0 0;font-size:12px;color:#64748b";
      subtitle.textContent =
        "WCAG 2.1 Level AA requires 4.5:1 for normal text, 3:1 for large text";
      header.appendChild(subtitle);
      overlay.appendChild(header);

      // Color pickers row
      const colorsRow = document.createElement("div");
      colorsRow.style.cssText =
        "display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px";

      const fgPicker = createColorPicker(
        "Foreground",
        fgColor,
        "foreground",
        pickerMode === "foreground",
      );
      const bgPicker = createColorPicker(
        "Background",
        bgColor,
        "background",
        pickerMode === "background",
      );
      colorsRow.appendChild(fgPicker);
      colorsRow.appendChild(bgPicker);
      overlay.appendChild(colorsRow);

      // Results
      const results = document.createElement("div");
      results.style.cssText =
        "background:rgba(30,41,59,0.5);border-radius:12px;padding:20px;margin-bottom:20px";

      const ratioDiv = document.createElement("div");
      ratioDiv.style.cssText = "text-align:center;margin-bottom:16px";
      const ratioNum = document.createElement("div");
      ratioNum.style.cssText = `font-size:48px;font-weight:700;color:${gradeColor};line-height:1`;
      ratioNum.textContent = `${result.ratio.toFixed(2)}:1`;

      const gradeBadge = document.createElement("div");
      gradeBadge.style.cssText = `display:inline-block;margin-top:8px;padding:4px 16px;background:${gradeColor}20;border:2px solid ${gradeColor};border-radius:20px;font-size:14px;font-weight:600;color:${gradeColor}`;
      gradeBadge.textContent = `WCAG ${grade}`;

      ratioDiv.appendChild(ratioNum);
      ratioDiv.appendChild(gradeBadge);
      results.appendChild(ratioDiv);

      // Compliance grid
      const compGrid = document.createElement("div");
      compGrid.style.cssText =
        "display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px";

      const normalBox = document.createElement("div");
      normalBox.style.cssText =
        "text-align:center;padding:12px;background:rgba(15,23,42,0.5);border-radius:8px";
      normalBox.appendChild(makeLabel("Normal Text"));
      normalBox.appendChild(makePassFail("AA", result.wcagAA));
      normalBox.appendChild(makePassFail("AAA", result.wcagAAA));

      const largeBox = document.createElement("div");
      largeBox.style.cssText =
        "text-align:center;padding:12px;background:rgba(15,23,42,0.5);border-radius:8px";
      largeBox.appendChild(makeLabel("Large Text"));
      largeBox.appendChild(makePassFail("AA", result.wcagAALarge));
      largeBox.appendChild(makePassFail("AAA", result.wcagAAALarge));

      compGrid.appendChild(normalBox);
      compGrid.appendChild(largeBox);
      results.appendChild(compGrid);

      // Suggestions
      if (result.suggestions.length > 0) {
        const sugDiv = document.createElement("div");
        sugDiv.style.cssText =
          "margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)";
        const sugLabel = document.createElement("div");
        sugLabel.style.cssText =
          "font-size:12px;color:#94a3b8;margin-bottom:8px";
        sugLabel.textContent = "Suggestions:";
        sugDiv.appendChild(sugLabel);
        for (const s of result.suggestions) {
          const sug = document.createElement("div");
          sug.style.cssText = "font-size:11px;color:#fbbf24;margin-bottom:4px";
          sug.textContent = `• ${s}`;
          sugDiv.appendChild(sug);
        }
        results.appendChild(sugDiv);
      }

      overlay.appendChild(results);

      // Preview
      const preview = document.createElement("div");
      preview.style.cssText = `background:${sanitizeColor(bgColor)};border-radius:12px;padding:20px;margin-bottom:16px`;
      const normalP = document.createElement("p");
      normalP.style.cssText = `margin:0 0 12px;font-size:16px;color:${sanitizeColor(fgColor)};line-height:1.5`;
      normalP.textContent = "The quick brown fox jumps over the lazy dog.";
      const largeP = document.createElement("p");
      largeP.style.cssText = `margin:0;font-size:20px;font-weight:700;color:${sanitizeColor(fgColor)};line-height:1.4`;
      largeP.textContent = "Large Text (18pt+ or 14pt bold)";
      preview.appendChild(normalP);
      preview.appendChild(largeP);
      overlay.appendChild(preview);

      // Action buttons
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:8px";

      const swapBtn = document.createElement("button");
      swapBtn.type = "button";
      swapBtn.className = "fdh-cc-swap";
      swapBtn.style.cssText =
        "flex:1;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:10px;color:#818cf8;font-size:12px;cursor:pointer";
      swapBtn.textContent = "Swap Colors";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "fdh-cc-copy";
      copyBtn.style.cssText =
        "flex:1;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:10px;color:#818cf8;font-size:12px;cursor:pointer";
      copyBtn.textContent = "Copy Report";

      actions.appendChild(swapBtn);
      actions.appendChild(copyBtn);
      overlay.appendChild(actions);

      attachListeners();
    }

    function createColorPicker(
      label: string,
      color: string,
      mode: "foreground" | "background",
      active: boolean,
    ): HTMLElement {
      const container = document.createElement("div");
      container.style.cssText = "text-align:center";

      const lbl = document.createElement("label");
      lbl.style.cssText =
        "display:block;margin-bottom:8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px";
      lbl.textContent = label;
      container.appendChild(lbl);

      const swatch = document.createElement("div");
      swatch.style.cssText = `width:60px;height:60px;border-radius:12px;margin:0 auto 8px;cursor:pointer;border:3px solid ${active ? "#6366f1" : "transparent"};box-shadow:0 4px 6px -1px rgba(0,0,0,0.3);background:${sanitizeColor(color)}`;
      container.appendChild(swatch);

      const input = document.createElement("input");
      input.type = "text";
      input.className =
        mode === "foreground" ? "fdh-cc-fg-input" : "fdh-cc-bg-input";
      input.value = color;
      input.style.cssText =
        "width:100%;background:rgba(30,41,59,0.8);border:1px solid rgba(99,102,241,0.3);border-radius:6px;padding:8px;color:#e2e8f0;font-family:inherit;font-size:12px;text-align:center;text-transform:uppercase";
      container.appendChild(input);

      const pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.className =
        mode === "foreground" ? "fdh-cc-pick-fg" : "fdh-cc-pick-bg";
      pickBtn.style.cssText = `margin-top:8px;width:100%;background:${active ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.1)"};border:1px solid rgba(99,102,241,0.4);border-radius:6px;padding:6px;color:#818cf8;font-size:11px;cursor:pointer`;
      pickBtn.textContent = active ? "Click page to pick..." : "Pick from page";
      container.appendChild(pickBtn);

      return container;
    }

    function makeLabel(text: string): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = "font-size:11px;color:#64748b;margin-bottom:4px";
      el.textContent = text;
      return el;
    }

    function makePassFail(level: string, pass: boolean): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `font-size:11px;color:${pass ? "#4ade80" : "#f87171"}`;
      el.textContent = `${pass ? "✓" : "✗"} ${level} ${pass ? "Pass" : "Fail"}`;
      return el;
    }

    function attachListeners() {
      overlay
        .querySelector(".fdh-cc-close")
        ?.addEventListener("click", cleanup);

      const fgInput = overlay.querySelector(
        ".fdh-cc-fg-input",
      ) as HTMLInputElement | null;
      fgInput?.addEventListener("change", (e) => {
        fgColor = (e.target as HTMLInputElement).value;
        buildOverlay();
      });

      const bgInput = overlay.querySelector(
        ".fdh-cc-bg-input",
      ) as HTMLInputElement | null;
      bgInput?.addEventListener("change", (e) => {
        bgColor = (e.target as HTMLInputElement).value;
        buildOverlay();
      });

      overlay
        .querySelector(".fdh-cc-pick-fg")
        ?.addEventListener("click", () => {
          pickerMode = pickerMode === "foreground" ? null : "foreground";
          buildOverlay();
        });

      overlay
        .querySelector(".fdh-cc-pick-bg")
        ?.addEventListener("click", () => {
          pickerMode = pickerMode === "background" ? null : "background";
          buildOverlay();
        });

      overlay.querySelector(".fdh-cc-swap")?.addEventListener("click", () => {
        const tmp = fgColor;
        fgColor = bgColor;
        bgColor = tmp;
        buildOverlay();
      });

      overlay.querySelector(".fdh-cc-copy")?.addEventListener("click", () => {
        const result = analyzeContrast(fgColor, bgColor, standard);
        const report = [
          "Contrast Analysis Report",
          "========================",
          `Foreground: ${fgColor}`,
          `Background: ${bgColor}`,
          `Contrast Ratio: ${result.ratio.toFixed(2)}:1`,
          "",
          "WCAG Compliance:",
          `- Normal Text AA: ${result.wcagAA ? "PASS" : "FAIL"} (needs 4.5:1)`,
          `- Normal Text AAA: ${result.wcagAAA ? "PASS" : "FAIL"} (needs 7:1)`,
          `- Large Text AA: ${result.wcagAALarge ? "PASS" : "FAIL"} (needs 3:1)`,
          `- Large Text AAA: ${result.wcagAAALarge ? "PASS" : "FAIL"} (needs 4.5:1)`,
          "",
          `Overall Grade: ${result.wcagAAA ? "AAA" : result.wcagAA ? "AA" : "FAIL"}`,
        ].join("\n");
        navigator.clipboard.writeText(report).then(() => {
          const btn = overlay.querySelector(".fdh-cc-copy");
          if (btn) {
            (btn as HTMLElement).textContent = "Copied!";
            setTimeout(() => {
              (btn as HTMLElement).textContent = "Copy Report";
            }, 1500);
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
      if (pickerMode === "foreground") {
        const parsed = parseColor(computed.color);
        fgColor = parsed
          ? rgbToHex({ r: parsed.r, g: parsed.g, b: parsed.b })
          : "#000000";
      } else {
        const parsed = parseColor(computed.backgroundColor);
        bgColor = parsed
          ? rgbToHex({ r: parsed.r, g: parsed.g, b: parsed.b })
          : "#ffffff";
      }
      pickerMode = null;
      buildOverlay();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pickerMode) {
          pickerMode = null;
          buildOverlay();
        } else cleanup();
      }
    }

    document.addEventListener("click", onPageClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    buildOverlay();

    function cleanup() {
      document.removeEventListener("click", onPageClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      removeOverlayElement(overlay);
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
