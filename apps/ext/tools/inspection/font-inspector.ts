import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

function detectFontSource(fontFamily: string): {
  source: string;
  label: string;
} {
  const cleanFamily = fontFamily.replace(/['"]/g, "").split(",")[0].trim();

  const googleFontLinks = document.querySelectorAll(
    'link[href*="fonts.googleapis.com"]',
  );
  for (const link of googleFontLinks) {
    const href = (link as HTMLLinkElement).href || "";
    if (
      href
        .toLowerCase()
        .includes(cleanFamily.toLowerCase().replace(/\s+/g, "+"))
    ) {
      return { source: "google", label: "Google Fonts" };
    }
  }

  const typekitScripts = document.querySelectorAll(
    'script[src*="typekit.net"], link[href*="use.typekit.net"]',
  );
  if (typekitScripts.length > 0) {
    return { source: "adobe", label: "Adobe Fonts" };
  }

  const stylesheets = Array.from(document.styleSheets);
  for (const sheet of stylesheets) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        if (rule instanceof CSSFontFaceRule) {
          const ruleFamily = rule.style.fontFamily?.replace(/['"]/g, "").trim();
          if (ruleFamily?.toLowerCase() === cleanFamily.toLowerCase()) {
            const src = (rule.style as unknown as Record<string, string>).src;
            if (src) {
              const urlMatch = src.match(/url\(["']?([^"')]+)["']?\)/);
              if (urlMatch) {
                try {
                  const fontUrl = new URL(urlMatch[1], location.href);
                  return {
                    source:
                      fontUrl.origin === location.origin
                        ? "self-hosted"
                        : "cdn",
                    label:
                      fontUrl.origin === location.origin
                        ? "Self-hosted"
                        : "CDN",
                  };
                } catch {
                  return { source: "self-hosted", label: "Self-hosted" };
                }
              }
            }
            return { source: "self-hosted", label: "Self-hosted" };
          }
        }
      }
    } catch {
      // Cross-origin stylesheet, skip
    }
  }

  const systemFonts = [
    "arial",
    "helvetica",
    "times new roman",
    "courier",
    "verdana",
    "georgia",
    "system-ui",
    "-apple-system",
    "blinkmacsystemfont",
    "segoe ui",
    "roboto",
    "sans-serif",
    "serif",
    "monospace",
  ];
  if (systemFonts.some((sf) => cleanFamily.toLowerCase().includes(sf))) {
    return { source: "system", label: "System Font" };
  }

  return { source: "unknown", label: "Unknown" };
}

function isValidTextElement(element: HTMLElement): boolean {
  if (element.id?.startsWith("fdh-") || element.closest('[id^="fdh-"]'))
    return false;

  const tagName = element.tagName.toLowerCase();
  if (
    ["script", "style", "meta", "link", "head", "html", "body"].includes(
      tagName,
    )
  )
    return false;

  const hasText = Array.from(element.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent?.trim().length ?? 0) > 0;
    }
    return false;
  });
  if (!hasText) return false;

  const cs = window.getComputedStyle(element);
  if (cs.display === "none" || cs.visibility === "hidden") return false;

  return true;
}

export const fontInspector: ToolDefinition = {
  id: "font-inspector",
  name: "Font Inspector",
  description: "Inspect font properties of any element on the page",
  category: "inspection",
  icon: "Type",
  configSchema: {
    showFontFamily: {
      type: "boolean",
      label: "Show Font Family",
      default: true,
    },
    showFontSize: { type: "boolean", label: "Show Font Size", default: true },
    showLineHeight: {
      type: "boolean",
      label: "Show Line Height",
      default: true,
    },
    showFontWeight: {
      type: "boolean",
      label: "Show Font Weight",
      default: true,
    },
    showLetterSpacing: {
      type: "boolean",
      label: "Show Letter Spacing",
      default: false,
    },
    highlightOnHover: {
      type: "boolean",
      label: "Highlight on Hover",
      default: true,
    },
  },

  run(ctx, config) {
    const showFontFamily = (config?.showFontFamily ?? true) as boolean;
    const showFontSize = (config?.showFontSize ?? true) as boolean;
    const showLineHeight = (config?.showLineHeight ?? true) as boolean;
    const showFontWeight = (config?.showFontWeight ?? true) as boolean;
    const showLetterSpacing = (config?.showLetterSpacing ?? false) as boolean;
    const highlightOnHover = (config?.highlightOnHover ?? true) as boolean;

    let tooltip: HTMLElement | null = null;
    let highlightedElement: HTMLElement | null = null;
    const originalOutlines = new WeakMap<
      HTMLElement,
      { outline: string; outlineOffset: string }
    >();

    function createTooltipEl(): void {
      if (tooltip) return;
      tooltip = document.createElement("div");
      tooltip.className = "fdh-font-tooltip";
      tooltip.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: #0f172a;
        color: #f8fafc;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        min-width: 240px;
        max-width: 320px;
        pointer-events: none;
        display: none;
        border: 1px solid #334155;
      `;
      addOverlayElement(tooltip);
    }

    function highlightEl(element: HTMLElement): void {
      removeHighlightEl();
      highlightedElement = element;
      originalOutlines.set(element, {
        outline: element.style.outline,
        outlineOffset: element.style.outlineOffset,
      });
      element.style.outline = "2px solid #3b82f6";
      element.style.outlineOffset = "2px";
    }

    function removeHighlightEl(): void {
      if (highlightedElement) {
        const orig = originalOutlines.get(highlightedElement);
        highlightedElement.style.outline = orig?.outline ?? "";
        highlightedElement.style.outlineOffset = orig?.outlineOffset ?? "";
        originalOutlines.delete(highlightedElement);
        highlightedElement = null;
      }
    }

    function showTooltip(
      element: HTMLElement,
      mouseX: number,
      mouseY: number,
    ): void {
      if (!tooltip) return;

      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

      const cs = window.getComputedStyle(element);
      const fullFontFamily = cs.fontFamily;
      const fontStack = fullFontFamily
        .split(",")
        .map((f) => f.trim().replace(/['"]/g, ""));
      const primaryFamily = fontStack[0] || "Unknown";

      const fontSizePx = parseFloat(cs.fontSize);
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const fontSizeRem = (fontSizePx / rootFontSize).toFixed(3);
      const weight = cs.fontWeight;
      const lineHeight =
        cs.lineHeight === "normal"
          ? "normal"
          : `${parseFloat(cs.lineHeight).toFixed(2)}`;
      const letterSpacing = cs.letterSpacing;
      const color = cs.color;

      const { label: sourceLabel } = detectFontSource(primaryFamily);

      // Header: font family + source badge
      const header = document.createElement("div");
      header.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #334155";

      const familySpan = document.createElement("span");
      familySpan.style.cssText =
        "font-weight:600;font-size:14px;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px";
      familySpan.textContent = primaryFamily;

      const badge = document.createElement("span");
      badge.style.cssText =
        "font-size:10px;padding:2px 6px;border-radius:4px;background:#3b82f6;color:white;text-transform:uppercase;font-weight:500";
      badge.textContent = sourceLabel;

      header.appendChild(familySpan);
      header.appendChild(badge);
      tooltip.appendChild(header);

      // Detail rows
      const details = document.createElement("div");
      details.style.cssText = "display:flex;flex-direction:column;gap:6px";

      const addRow = (label: string, value: string) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center";
        const lbl = document.createElement("span");
        lbl.style.cssText = "color:#94a3b8;font-size:12px";
        lbl.textContent = label;
        const val = document.createElement("span");
        val.style.cssText =
          "color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px";
        val.textContent = value;
        row.appendChild(lbl);
        row.appendChild(val);
        details.appendChild(row);
      };

      if (showFontFamily) {
        addRow("Family", primaryFamily);
        if (fontStack.length > 1) {
          addRow("Fallbacks", fontStack.slice(1).join(", "));
        }
      }
      if (showFontSize) addRow("Size", `${fontSizePx}px / ${fontSizeRem}rem`);
      if (showFontWeight) addRow("Weight", weight);
      if (showLineHeight) addRow("Line Height", lineHeight);
      if (showLetterSpacing)
        addRow(
          "Letter Spacing",
          letterSpacing === "normal" ? "normal" : letterSpacing,
        );
      addRow("Color", color);

      tooltip.appendChild(details);

      // Position tooltip
      tooltip.style.display = "block";
      requestAnimationFrame(() => {
        if (!tooltip) return;
        let left = mouseX + 15;
        let top = mouseY + 15;
        const ttRect = tooltip.getBoundingClientRect();
        if (left + ttRect.width > window.innerWidth)
          left = mouseX - ttRect.width - 15;
        if (top + ttRect.height > window.innerHeight)
          top = mouseY - ttRect.height - 15;
        tooltip.style.left = `${Math.max(10, left)}px`;
        tooltip.style.top = `${Math.max(10, top)}px`;
      });
    }

    function hideTooltip(): void {
      if (tooltip) tooltip.style.display = "none";
    }

    createTooltipEl();

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target === highlightedElement) return;
      if (!isValidTextElement(target)) return;

      if (highlightOnHover) highlightEl(target);
      showTooltip(target, e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!highlightedElement) return;
      if (!tooltip) return;

      let left = e.clientX + 15;
      let top = e.clientY + 15;
      const ttRect = tooltip.getBoundingClientRect();
      if (left + ttRect.width > window.innerWidth)
        left = e.clientX - ttRect.width - 15;
      if (top + ttRect.height > window.innerHeight)
        top = e.clientY - ttRect.height - 15;
      tooltip.style.left = `${Math.max(10, left)}px`;
      tooltip.style.top = `${Math.max(10, top)}px`;
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target === highlightedElement ||
        target === highlightedElement?.parentElement
      ) {
        removeHighlightEl();
        hideTooltip();
      }
    };

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseout", handleMouseOut, true);

    const cleanup = () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      removeHighlightEl();
      if (tooltip) {
        removeOverlayElement(tooltip);
        tooltip = null;
      }
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
