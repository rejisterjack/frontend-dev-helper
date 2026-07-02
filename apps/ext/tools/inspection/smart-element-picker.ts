import type { ToolDefinition } from "../types";
import {
  HighlightEngine,
  generateSelector,
  getComputedStyles,
} from "@/content/highlight-engine";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

interface ElementAnalysis {
  tag: string;
  id: string | null;
  classes: string[];
  cssSelector: string;
  xpath: string;
  dimensions: { width: number; height: number; top: number; left: number };
  boxModel: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
    border: { top: number; right: number; bottom: number; left: number };
    content: { width: number; height: number };
  };
  colors: {
    foreground: string;
    background: string;
    contrastRatio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  };
  fonts: { family: string; size: string; weight: string; lineHeight: string };
  accessibility: {
    ariaLabel: string | null;
    role: string | null;
    tabIndex: number | null;
    focusable: boolean;
  };
  zIndex: number | null;
  position: string;
}

function getRelativeLuminance(color: string): number {
  const div = document.createElement("div");
  div.style.color = color;
  div.style.display = "none";
  document.body.appendChild(div);
  const computed = getComputedStyle(div).color;
  document.body.removeChild(div);
  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return 0;
  const rgb = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])].map(
    (c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    },
  );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(c1: string, c2: string): number {
  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generateXPath(el: HTMLElement): string {
  if (el.id) return `//*[@id="${el.id}"]`;

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.nodeName === current.nodeName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${current.nodeName.toLowerCase()}[${index}]`);
    current = current.parentElement;
  }

  return "/" + parts.join("/");
}

function formatSelectorDisplay(
  analysis: ElementAnalysis,
  selectorType: string,
): string {
  if (selectorType === "xpath") return analysis.xpath;
  if (selectorType === "both")
    return `${analysis.cssSelector}\n${analysis.xpath}`;
  return analysis.cssSelector;
}

function getCopyText(analysis: ElementAnalysis, selectorType: string): string {
  if (selectorType === "xpath") return analysis.xpath;
  if (selectorType === "both")
    return `${analysis.cssSelector}\n${analysis.xpath}`;
  return analysis.cssSelector;
}

function analyzeElement(
  element: HTMLElement,
  preferClass: boolean,
): ElementAnalysis {
  const computed = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const fg = computed.color;
  const bg = computed.backgroundColor;
  const contrast = getContrastRatio(fg, bg);

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList),
    cssSelector: generateSelector(element, { preferClass }),
    xpath: generateXPath(element),
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX),
    },
    boxModel: {
      margin: {
        top: parseFloat(computed.marginTop) || 0,
        right: parseFloat(computed.marginRight) || 0,
        bottom: parseFloat(computed.marginBottom) || 0,
        left: parseFloat(computed.marginLeft) || 0,
      },
      padding: {
        top: parseFloat(computed.paddingTop) || 0,
        right: parseFloat(computed.paddingRight) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
      },
      border: {
        top: parseFloat(computed.borderTopWidth) || 0,
        right: parseFloat(computed.borderRightWidth) || 0,
        bottom: parseFloat(computed.borderBottomWidth) || 0,
        left: parseFloat(computed.borderLeftWidth) || 0,
      },
      content: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    },
    colors: {
      foreground: fg,
      background: bg === "rgba(0, 0, 0, 0)" ? "transparent" : bg,
      contrastRatio: Math.round(contrast * 100) / 100,
      wcagAA: contrast >= 4.5,
      wcagAAA: contrast >= 7,
    },
    fonts: {
      family: computed.fontFamily,
      size: computed.fontSize,
      weight: computed.fontWeight,
      lineHeight: computed.lineHeight,
    },
    accessibility: {
      ariaLabel: element.getAttribute("aria-label"),
      role: element.getAttribute("role"),
      tabIndex: element.tabIndex >= 0 ? element.tabIndex : null,
      focusable:
        ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(
          element.tagName,
        ) || element.tabIndex >= 0,
    },
    zIndex: computed.zIndex !== "auto" ? parseInt(computed.zIndex, 10) : null,
    position: computed.position,
  };
}

export const smartElementPicker: ToolDefinition = {
  id: "smart-element-picker",
  name: "Smart Element Picker",
  description: "Intelligent element selection with CSS selector generation",
  category: "inspection",
  icon: "MousePointerClick",
  configSchema: {
    selectorType: {
      type: "select",
      label: "Selector Type",
      default: "css",
      options: [
        { label: "CSS", value: "css" },
        { label: "XPath", value: "xpath" },
        { label: "Both", value: "both" },
      ],
    },
    copyOnClick: { type: "boolean", label: "Copy on Click", default: true },
    showSelectorBar: {
      type: "boolean",
      label: "Show Selector Bar",
      default: true,
    },
    preferClass: {
      type: "boolean",
      label: "Prefer Class Selectors",
      default: true,
    },
  },
  run: (ctx, config) => {
    const copyOnClick = (config?.copyOnClick as boolean) ?? true;
    const showSelectorBar = (config?.showSelectorBar as boolean) ?? true;
    const preferClass = (config?.preferClass as boolean) ?? true;
    const selectorType = (config?.selectorType as string) ?? "css";
    let infoPanel: HTMLElement | null = null;
    let selectedElement: HTMLElement | null = null;
    let indicator: HTMLElement | null = null;

    if (showSelectorBar) {
      indicator = document.createElement("div");
      indicator.style.cssText =
        "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:#cdd6f4;padding:12px 24px;border-radius:8px;font-size:14px;z-index:2147483647;box-shadow:0 4px 20px rgba(0,0,0,.5);border:1px solid #313244;font-family:-apple-system,sans-serif;";
      const activeLabel = document.createElement("span");
      activeLabel.style.cssText = "color:#89b4fa;font-weight:600;";
      activeLabel.textContent = "🔍 Smart Picker Active";
      const hintLabel = document.createElement("span");
      hintLabel.style.cssText = "margin-left:12px;color:#6c7086;";
      hintLabel.textContent =
        "Click any element to inspect • Press ESC to exit";
      indicator.append(activeLabel, hintLabel);
      document.body.appendChild(indicator);
    }

    const highlight = new HighlightEngine({
      color: "#89b4fa",
      showLabel: true,
      getLabel: (el) =>
        el.tagName.toLowerCase() + (el.className ? "." + el.classList[0] : ""),
    });

    function buildInfoPanel(analysis: ElementAnalysis): void {
      removeInfoPanel();

      infoPanel = document.createElement("div");
      infoPanel.style.cssText =
        "position:fixed;top:20px;right:20px;width:380px;max-height:80vh;background:#1e1e2e;border:1px solid #313244;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.5);z-index:2147483647;font-family:-apple-system,sans-serif;font-size:13px;color:#cdd6f4;display:flex;flex-direction:column;overflow:hidden;";

      const header = document.createElement("div");
      header.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825;";
      const title = document.createElement("span");
      title.style.cssText = "font-size:14px;font-weight:600;";
      title.textContent = "Element Inspector";
      const closeBtn = document.createElement("button");
      closeBtn.style.cssText =
        "background:none;border:none;color:#6c7086;font-size:20px;cursor:pointer;";
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", cleanup);
      header.append(title, closeBtn);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow-y:auto;padding:12px;";

      function section(titleText: string, content: HTMLElement): void {
        const sec = document.createElement("div");
        sec.style.cssText = "margin-bottom:16px;";
        const label = document.createElement("div");
        label.style.cssText =
          "font-size:11px;font-weight:600;text-transform:uppercase;color:#89b4fa;margin-bottom:8px;letter-spacing:.5px;";
        label.textContent = titleText;
        sec.append(label, content);
        body.appendChild(sec);
      }

      // Element info
      const infoDiv = document.createElement("div");
      infoDiv.style.cssText =
        "display:flex;align-items:center;gap:6px;font-family:monospace;font-size:12px;";
      const tagName = document.createElement("span");
      tagName.style.cssText = "color:#f5c2e7;font-weight:600;";
      tagName.textContent = analysis.tag;
      infoDiv.appendChild(tagName);
      if (analysis.id) {
        const idSpan = document.createElement("span");
        idSpan.style.cssText = "color:#fab387;";
        idSpan.textContent = "#" + analysis.id;
        infoDiv.appendChild(idSpan);
      }
      for (const cls of analysis.classes.slice(0, 3)) {
        const clsSpan = document.createElement("span");
        clsSpan.style.cssText = "color:#89b4fa;";
        clsSpan.textContent = "." + cls;
        infoDiv.appendChild(clsSpan);
      }
      const dimsDiv = document.createElement("div");
      dimsDiv.style.cssText = "display:flex;gap:12px;margin-top:8px;";
      const sizeDiv = document.createElement("div");
      sizeDiv.style.cssText =
        "background:#313244;padding:4px 8px;border-radius:4px;font-size:11px;";
      sizeDiv.textContent =
        "Size: " +
        analysis.dimensions.width +
        " × " +
        analysis.dimensions.height;
      const posDiv = document.createElement("div");
      posDiv.style.cssText =
        "background:#313244;padding:4px 8px;border-radius:4px;font-size:11px;";
      posDiv.textContent =
        "Pos: " + analysis.dimensions.left + ", " + analysis.dimensions.top;
      dimsDiv.append(sizeDiv, posDiv);
      const infoContainer = document.createElement("div");
      infoContainer.append(infoDiv, dimsDiv);
      section("Element", infoContainer);

      // Colors
      const colorsGrid = document.createElement("div");
      colorsGrid.style.cssText =
        "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
      function colorItem(label: string, value: string): HTMLElement {
        const item = document.createElement("div");
        item.style.cssText =
          "display:flex;flex-direction:column;background:#313244;padding:8px;border-radius:6px;";
        const lbl = document.createElement("span");
        lbl.style.cssText =
          "font-size:10px;color:#6c7086;text-transform:uppercase;margin-bottom:2px;";
        lbl.textContent = label;
        const val = document.createElement("span");
        val.style.cssText =
          "font-size:12px;color:#cdd6f4;display:flex;align-items:center;gap:6px;";
        const swatch = document.createElement("span");
        swatch.style.cssText =
          "width:16px;height:16px;border-radius:3px;border:1px solid #6c7086;flex-shrink:0;";
        swatch.style.background =
          value === "transparent"
            ? "repeating-conic-gradient(#6c7086 0% 25%, transparent 0% 50%) 50% / 8px 8px"
            : value;
        val.appendChild(swatch);
        val.appendChild(document.createTextNode(value));
        item.append(lbl, val);
        return item;
      }
      colorsGrid.append(
        colorItem("Text", analysis.colors.foreground),
        colorItem("Background", analysis.colors.background),
      );
      section("Colors & Contrast", colorsGrid);

      const contrastDiv = document.createElement("div");
      contrastDiv.style.cssText =
        "display:flex;align-items:center;gap:8px;margin-top:8px;";
      contrastDiv.textContent =
        "Contrast: " + analysis.colors.contrastRatio + " ";
      const aaBadge = document.createElement("span");
      aaBadge.style.cssText =
        "font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600;background:" +
        (analysis.colors.wcagAA ? "#a6e3a1" : "#f38ba8") +
        ";color:#1e1e2e;";
      aaBadge.textContent = "AA " + (analysis.colors.wcagAA ? "✓" : "✗");
      contrastDiv.appendChild(aaBadge);
      body.appendChild(contrastDiv);

      // Typography
      const fontGrid = document.createElement("div");
      fontGrid.style.cssText =
        "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
      function fontItem(label: string, value: string): HTMLElement {
        const item = document.createElement("div");
        item.style.cssText =
          "display:flex;flex-direction:column;background:#313244;padding:8px;border-radius:6px;";
        const lbl = document.createElement("span");
        lbl.style.cssText =
          "font-size:10px;color:#6c7086;text-transform:uppercase;margin-bottom:2px;";
        lbl.textContent = label;
        const val = document.createElement("span");
        val.style.cssText = "font-size:12px;color:#cdd6f4;";
        val.textContent = value;
        item.append(lbl, val);
        return item;
      }
      fontGrid.append(
        fontItem("Font Size", analysis.fonts.size),
        fontItem("Weight", analysis.fonts.weight),
      );
      section("Typography", fontGrid);

      // Selector
      const selectorDiv = document.createElement("div");
      selectorDiv.style.cssText =
        "font-family:monospace;font-size:11px;background:#313244;padding:8px;border-radius:4px;word-break:break-all;white-space:pre-wrap;";
      selectorDiv.textContent = formatSelectorDisplay(analysis, selectorType);
      section("Selector", selectorDiv);

      // Actions
      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;gap:8px;padding:12px 16px;border-top:1px solid #313244;background:#181825;";
      function actionBtn(label: string, action: string): HTMLElement {
        const btn = document.createElement("button");
        btn.style.cssText =
          "flex:1;padding:8px;background:#45475a;border:none;border-radius:6px;color:#cdd6f4;font-size:12px;cursor:pointer;";
        btn.textContent = label;
        btn.dataset.action = action;
        return btn;
      }
      actions.append(
        actionBtn("Copy Selector", "copy-selector"),
        actionBtn("Copy Styles", "copy-styles"),
      );

      infoPanel.append(header, body, actions);
      document.body.appendChild(infoPanel);

      actions.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        if (action === "copy-selector") {
          navigator.clipboard
            .writeText(getCopyText(analysis, selectorType))
            .catch(() => {});
          target.textContent = "Copied!";
          setTimeout(() => {
            target.textContent = "Copy Selector";
          }, 1500);
        } else if (action === "copy-styles") {
          const styles = getComputedStyles(selectedElement!);
          navigator.clipboard
            .writeText(JSON.stringify(styles, null, 2))
            .catch(() => {});
          target.textContent = "Copied!";
          setTimeout(() => {
            target.textContent = "Copy Styles";
          }, 1500);
        }
      });
    }

    function removeInfoPanel(): void {
      if (infoPanel) {
        infoPanel.remove();
        infoPanel = null;
      }
    }

    highlight.start();

    const handleClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      if (target === infoPanel || infoPanel?.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      selectedElement = target;
      const analysis = analyzeElement(target, preferClass);
      buildInfoPanel(analysis);
      if (copyOnClick)
        navigator.clipboard
          .writeText(getCopyText(analysis, selectorType))
          .catch(() => {});
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") cleanup();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      highlight.stop();
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      removeInfoPanel();
      if (indicator) {
        indicator.remove();
        indicator = null;
      }
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
