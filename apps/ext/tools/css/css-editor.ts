import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";

interface CSSPropertyDefinition {
  name: string;
  type: "text" | "number" | "color" | "select" | "slider";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface CSSPropertyCategory {
  name: string;
  icon: string;
  properties: CSSPropertyDefinition[];
}

interface CSSEdit {
  property: string;
  oldValue: string;
  oldValuePriority: string;
  newValue: string;
}

interface ElementStyleData {
  selector: string;
  originalCssText: string;
  originalValues: Map<string, { value: string; priority: string }>;
  modifiedStyles: Map<string, string>;
}

const COLOR_PREVIEW_PROPS =
  /^(color|background-color|border-color|border-(top|right|bottom|left)-color|fill|stroke|box-shadow|text-shadow)$/;

const CSS_CATEGORIES: CSSPropertyCategory[] = [
  {
    name: "Layout",
    icon: "⊞",
    properties: [
      {
        name: "display",
        type: "select",
        options: [
          "block",
          "inline",
          "inline-block",
          "flex",
          "grid",
          "none",
          "contents",
          "table",
          "table-cell",
        ],
      },
      {
        name: "position",
        type: "select",
        options: ["static", "relative", "absolute", "fixed", "sticky"],
      },
      { name: "top", type: "text" },
      { name: "right", type: "text" },
      { name: "bottom", type: "text" },
      { name: "left", type: "text" },
      { name: "width", type: "text" },
      { name: "height", type: "text" },
      { name: "min-width", type: "text" },
      { name: "min-height", type: "text" },
      { name: "max-width", type: "text" },
      { name: "max-height", type: "text" },
      { name: "margin", type: "text" },
      { name: "padding", type: "text" },
      { name: "z-index", type: "number" },
      {
        name: "overflow",
        type: "select",
        options: ["visible", "hidden", "scroll", "auto"],
      },
      {
        name: "box-sizing",
        type: "select",
        options: ["content-box", "border-box"],
      },
    ],
  },
  {
    name: "Typography",
    icon: "T",
    properties: [
      { name: "color", type: "color" },
      { name: "font-family", type: "text" },
      { name: "font-size", type: "text" },
      {
        name: "font-weight",
        type: "select",
        options: [
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900",
          "normal",
          "bold",
        ],
      },
      {
        name: "font-style",
        type: "select",
        options: ["normal", "italic", "oblique"],
      },
      { name: "line-height", type: "text" },
      { name: "letter-spacing", type: "text" },
      {
        name: "text-align",
        type: "select",
        options: ["left", "center", "right", "justify"],
      },
      {
        name: "text-decoration",
        type: "select",
        options: ["none", "underline", "overline", "line-through"],
      },
      {
        name: "text-transform",
        type: "select",
        options: ["none", "capitalize", "uppercase", "lowercase"],
      },
      {
        name: "white-space",
        type: "select",
        options: ["normal", "nowrap", "pre", "pre-wrap", "pre-line"],
      },
    ],
  },
  {
    name: "Colors",
    icon: "🎨",
    properties: [
      { name: "background-color", type: "color" },
      { name: "background-image", type: "text" },
      {
        name: "background-size",
        type: "select",
        options: ["auto", "cover", "contain"],
      },
      { name: "border-color", type: "color" },
      { name: "border-width", type: "text" },
      {
        name: "border-style",
        type: "select",
        options: [
          "none",
          "solid",
          "dashed",
          "dotted",
          "double",
          "groove",
          "ridge",
        ],
      },
      { name: "border-radius", type: "text" },
      { name: "opacity", type: "slider", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "Flexbox",
    icon: "↔",
    properties: [
      {
        name: "flex-direction",
        type: "select",
        options: ["row", "row-reverse", "column", "column-reverse"],
      },
      {
        name: "flex-wrap",
        type: "select",
        options: ["nowrap", "wrap", "wrap-reverse"],
      },
      {
        name: "justify-content",
        type: "select",
        options: [
          "flex-start",
          "flex-end",
          "center",
          "space-between",
          "space-around",
          "space-evenly",
        ],
      },
      {
        name: "align-items",
        type: "select",
        options: ["stretch", "flex-start", "flex-end", "center", "baseline"],
      },
      { name: "flex-grow", type: "number", min: 0 },
      { name: "flex-shrink", type: "number", min: 0 },
      { name: "flex-basis", type: "text" },
      { name: "gap", type: "text" },
    ],
  },
  {
    name: "Effects",
    icon: "✨",
    properties: [
      { name: "box-shadow", type: "text" },
      { name: "text-shadow", type: "text" },
      { name: "transform", type: "text" },
      { name: "transition", type: "text" },
      { name: "filter", type: "text" },
      {
        name: "cursor",
        type: "select",
        options: [
          "auto",
          "default",
          "pointer",
          "text",
          "wait",
          "move",
          "not-allowed",
          "grab",
          "crosshair",
        ],
      },
      { name: "pointer-events", type: "select", options: ["auto", "none"] },
      {
        name: "visibility",
        type: "select",
        options: ["visible", "hidden", "collapse"],
      },
    ],
  },
];

function generateSelector(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith("fdh-"))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join("");
  return `${tag}${id}${classes}`;
}

function rgbToHex(cssColor: string): string {
  if (!cssColor) return "#000000";
  // Fast path: already a 6/8/3-digit hex
  const trimmed = cssColor.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.slice(0, 7);
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return (
      "#" +
      trimmed
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  // transparent / empty -> black opaque (color input can't represent alpha)
  if (trimmed === "transparent" || trimmed === "rgba(0, 0, 0, 0)") {
    return "#000000";
  }
  const temp = document.createElement("div");
  temp.style.color = cssColor;
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  const match = computed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/,
  );
  if (!match) return "#000000";
  return (
    "#" +
    [match[1], match[2], match[3]]
      .map((x) => Math.round(parseFloat(x)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const cssEditor: ToolDefinition = {
  id: "css-editor",
  name: "CSS Editor",
  description: "Live-edit CSS properties on any element with instant preview",
  category: "css",
  icon: "PenTool",
  configSchema: {
    autoApply: { type: "boolean", label: "Auto Apply", default: true },
    showDiff: { type: "boolean", label: "Show Diff", default: true },
    persistChanges: {
      type: "boolean",
      label: "Persist Changes",
      default: false,
    },
    editorTheme: {
      type: "select",
      label: "Editor Theme",
      default: "dark",
      options: [
        { label: "Dark", value: "dark" },
        { label: "Light", value: "light" },
      ],
    },
  },
  run: (ctx, config = {}) => {
    const autoApply = config.autoApply !== false;
    const showDiff = config.showDiff !== false;
    const persistChanges = config.persistChanges === true;
    const editorTheme = (config.editorTheme as string) || "dark";

    let activeCategory = "Layout";
    let selectedElement: HTMLElement | null = null;
    const history: CSSEdit[] = [];
    let historyIndex = -1;
    const modifiedElements = new Map<HTMLElement, ElementStyleData>();

    // Highlight overlay
    const highlightBox = document.createElement("div");
    highlightBox.setAttribute("data-fdh-overlay", "css-editor");
    highlightBox.style.cssText = `
      position:fixed;pointer-events:none;z-index:2147483646;
      border:2px solid #8b5cf6;background-color:${hexToRgba("#8b5cf6", 0.1)};
      border-radius:2px;transition:all 0.15s ease-out;display:none;
      box-shadow:0 0 0 4px ${hexToRgba("#8b5cf6", 0.1)};
    `;
    addOverlayElement(highlightBox);

    // Panel
    const panel = document.createElement("div");
    panel.className = "fdh-css-editor-panel";
    panel.setAttribute("data-fdh-overlay", "css-editor");
    const themeBg =
      editorTheme === "light"
        ? "rgba(255,255,255,0.98)"
        : "rgba(15,23,42,0.98)";
    const themeFg = editorTheme === "light" ? "#0f172a" : "#e2e8f0";
    panel.style.cssText = `
      position:fixed;top:20px;right:20px;width:380px;max-height:calc(100vh - 40px);
      z-index:2147483647;background:${themeBg};
      border:1px solid rgba(99,102,241,0.3);border-radius:12px;
      font-family:'JetBrains Mono','Fira Code',system-ui,monospace;
      font-size:13px;color:${themeFg};box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);
      backdrop-filter:blur(12px);overflow:hidden;display:flex;flex-direction:column;
      pointer-events:auto;
    `;
    addOverlayElement(panel);

    function isOwnElement(el: HTMLElement): boolean {
      return el === panel || panel.contains(el) || el === highlightBox;
    }

    function selectElement(el: HTMLElement) {
      selectedElement = el;
      const selector = generateSelector(el);
      if (!modifiedElements.has(el)) {
        modifiedElements.set(el, {
          selector,
          originalCssText: el.style.cssText,
          originalValues: new Map(),
          modifiedStyles: new Map(),
        });
      }
      updateHighlight(el);
      updatePanel();
    }

    function deselectElement() {
      selectedElement = null;
      highlightBox.style.display = "none";
      updatePanel();
    }

    function updateHighlight(el: HTMLElement | null) {
      if (!el) {
        highlightBox.style.display = "none";
        return;
      }
      const rect = el.getBoundingClientRect();
      highlightBox.style.display = "block";
      highlightBox.style.left = `${rect.left}px`;
      highlightBox.style.top = `${rect.top}px`;
      highlightBox.style.width = `${rect.width}px`;
      highlightBox.style.height = `${rect.height}px`;
      highlightBox.style.opacity = "1";
    }

    function previewHighlight(el: HTMLElement | null) {
      if (!el) {
        highlightBox.style.display = "none";
        return;
      }
      const rect = el.getBoundingClientRect();
      highlightBox.style.display = "block";
      highlightBox.style.left = `${rect.left}px`;
      highlightBox.style.top = `${rect.top}px`;
      highlightBox.style.width = `${rect.width}px`;
      highlightBox.style.height = `${rect.height}px`;
      highlightBox.style.opacity = "0.5";
    }

    function applyStyle(property: string, value: string) {
      if (!selectedElement) return;
      const style = selectedElement.style;
      const computed = window.getComputedStyle(selectedElement);
      const oldVal =
        style.getPropertyValue(property) || computed.getPropertyValue(property);
      const oldPriority = style.getPropertyPriority(property);
      style.setProperty(property, value);
      const data = modifiedElements.get(selectedElement);
      if (data) {
        if (!data.originalValues.has(property)) {
          data.originalValues.set(property, {
            value: oldVal,
            priority: oldPriority,
          });
        }
        data.modifiedStyles.set(property, value);
      }
      if (historyIndex < history.length - 1) history.splice(historyIndex + 1);
      history.push({
        property,
        oldValue: oldVal,
        oldValuePriority: oldPriority,
        newValue: value,
      });
      historyIndex++;
      if (history.length > 50) {
        history.shift();
        historyIndex--;
      }
    }

    function undo() {
      if (historyIndex < 0 || !selectedElement) return;
      const edit = history[historyIndex];
      selectedElement.style.setProperty(
        edit.property,
        edit.oldValue,
        edit.oldValuePriority || "",
      );
      const data = modifiedElements.get(selectedElement);
      if (data) {
        if (edit.oldValue)
          data.modifiedStyles.set(edit.property, edit.oldValue);
        else data.modifiedStyles.delete(edit.property);
      }
      historyIndex--;
      updateHighlight(selectedElement);
    }

    function redo() {
      if (historyIndex >= history.length - 1 || !selectedElement) return;
      historyIndex++;
      const edit = history[historyIndex];
      selectedElement.style.setProperty(edit.property, edit.newValue);
      const data = modifiedElements.get(selectedElement);
      if (data) data.modifiedStyles.set(edit.property, edit.newValue);
      updateHighlight(selectedElement);
    }

    function resetElement() {
      if (!selectedElement) return;
      const data = modifiedElements.get(selectedElement);
      if (data) {
        selectedElement.style.cssText = data.originalCssText;
        data.modifiedStyles.clear();
      }
      updateHighlight(selectedElement);
    }

    function resetAll() {
      for (const [el, data] of modifiedElements) {
        el.style.cssText = data.originalCssText;
        data.modifiedStyles.clear();
        data.originalValues.clear();
      }
      history.length = 0;
      historyIndex = -1;
      updateHighlight(selectedElement);
    }

    function copyCSS() {
      if (!selectedElement) return;
      const data = modifiedElements.get(selectedElement);
      if (!data || data.modifiedStyles.size === 0) return;
      let css = `${data.selector} {\n`;
      data.modifiedStyles.forEach((val, prop) => {
        css += `  ${prop}: ${val};\n`;
      });
      css += "}";
      navigator.clipboard
        .writeText(css)
        .then(() => showNotification("CSS copied to clipboard!"));
    }

    function showNotification(msg: string) {
      const n = document.createElement("div");
      n.style.cssText = `
        position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        background:rgba(34,197,94,0.9);color:white;padding:12px 24px;border-radius:8px;
        font-family:system-ui,sans-serif;font-size:13px;z-index:2147483647;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;
      `;
      n.textContent = msg;
      document.body.appendChild(n);
      setTimeout(() => {
        n.style.transition = "opacity 0.3s";
        n.style.opacity = "0";
        setTimeout(() => n.remove(), 300);
      }, 2000);
    }

    function updatePanel() {
      panel.textContent = "";
      const hasSelection = selectedElement !== null;

      // Header
      const header = document.createElement("div");
      header.style.cssText =
        "padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))";

      const headerRow = document.createElement("div");
      headerRow.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";

      const title = document.createElement("h3");
      title.style.cssText = "margin:0;font-size:14px;color:#c084fc";
      title.textContent = "Live CSS Editor";

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:4px";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "fdh-ce-reset";
      resetBtn.style.cssText =
        "background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:4px 8px;color:#f87171;font-size:11px;cursor:pointer";
      resetBtn.textContent = "Reset";

      const resetAllBtn = document.createElement("button");
      resetAllBtn.type = "button";
      resetAllBtn.className = "fdh-ce-reset-all";
      resetAllBtn.style.cssText =
        "background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 8px;color:#fca5a5;font-size:11px;cursor:pointer";
      resetAllBtn.textContent = "Reset All";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "fdh-ce-close";
      closeBtn.style.cssText =
        "background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:0 4px;line-height:1";
      closeBtn.textContent = "×";

      btnRow.appendChild(resetBtn);
      btnRow.appendChild(resetAllBtn);
      btnRow.appendChild(closeBtn);
      headerRow.appendChild(title);
      headerRow.appendChild(btnRow);
      header.appendChild(headerRow);

      // Selector display
      const selectorBox = document.createElement("div");
      selectorBox.style.cssText = `background:rgba(30,41,59,0.8);border-radius:6px;padding:8px 12px;font-family:monospace;font-size:12px;color:${hasSelection ? "#c084fc" : "#64748b"};border:1px solid rgba(99,102,241,0.2);display:flex;justify-content:space-between;align-items:center`;

      const code = document.createElement("code");
      code.textContent = hasSelection
        ? generateSelector(selectedElement!)
        : "No element selected";
      selectorBox.appendChild(code);

      if (hasSelection) {
        const rect = selectedElement!.getBoundingClientRect();
        const dim = document.createElement("span");
        dim.style.cssText = "color:#64748b;font-size:11px";
        dim.textContent = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        selectorBox.appendChild(dim);
      }

      header.appendChild(selectorBox);

      if (!hasSelection) {
        const hint = document.createElement("div");
        hint.style.cssText =
          "margin-top:12px;padding:12px;background:rgba(59,130,246,0.1);border-radius:8px;font-size:12px;color:#60a5fa;text-align:center";
        hint.textContent = "Click any element on the page to edit its styles";
        header.appendChild(hint);
      }

      panel.appendChild(header);

      if (hasSelection) {
        // Category tabs
        const tabs = document.createElement("div");
        tabs.style.cssText =
          "display:flex;gap:4px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);overflow-x:auto";
        for (const cat of CSS_CATEGORIES) {
          const tab = document.createElement("button");
          tab.type = "button";
          tab.className = "fdh-ce-tab";
          tab.dataset.category = cat.name;
          const isActive = cat.name === activeCategory;
          tab.style.cssText = `background:${isActive ? "rgba(99,102,241,0.3)" : "transparent"};border:1px solid ${isActive ? "rgba(99,102,241,0.5)" : "transparent"};border-radius:6px;padding:6px 10px;color:${isActive ? "#c084fc" : "#94a3b8"};font-size:11px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px`;
          tab.textContent = `${cat.icon} ${cat.name}`;
          tabs.appendChild(tab);
        }
        panel.appendChild(tabs);

        // Properties editor
        const editor = document.createElement("div");
        editor.style.cssText =
          "flex:1;overflow-y:auto;padding:16px;max-height:400px";
        const category = CSS_CATEGORIES.find((c) => c.name === activeCategory);
        if (category && selectedElement) {
          const computed = window.getComputedStyle(selectedElement);
          const data = modifiedElements.get(selectedElement);
          const propList = document.createElement("div");
          propList.style.cssText =
            "display:flex;flex-direction:column;gap:12px";

          for (const prop of category.properties) {
            const currentVal = computed.getPropertyValue(prop.name);
            const isModified = data?.modifiedStyles.has(prop.name) ?? false;
            const row = document.createElement("div");
            row.dataset.property = prop.name;
            row.style.cssText = `display:flex;flex-direction:column;gap:4px;padding:8px;background:${isModified ? "rgba(99,102,241,0.1)" : "rgba(30,41,59,0.4)"};border-radius:8px;border:1px solid ${isModified ? "rgba(99,102,241,0.3)" : "transparent"}`;

            const labelRow = document.createElement("div");
            labelRow.style.cssText =
              "display:flex;justify-content:space-between;align-items:center";
            const label = document.createElement("label");
            label.style.cssText =
              "font-size:11px;color:#94a3b8;text-transform:capitalize";
            label.textContent = prop.name.replace(/-/g, " ");
            if (isModified) {
              const dot = document.createElement("span");
              dot.style.cssText = "color:#818cf8;margin-left:4px";
              dot.textContent = "●";
              label.appendChild(dot);
            }
            labelRow.appendChild(label);

            if (COLOR_PREVIEW_PROPS.test(prop.name)) {
              const previewRow = document.createElement("div");
              previewRow.style.cssText =
                "display:flex;align-items:center;gap:4px";
              const preview = document.createElement("div");
              preview.style.cssText = `width:16px;height:16px;border-radius:4px;background:${currentVal};border:1px solid rgba(255,255,255,0.2)`;
              preview.className = "fdh-ce-color-preview";
              preview.dataset.property = prop.name;
              // Alpha swatch: shows the actual rgba render against a checkerboard
              // so transparency is visible, not just the hex from rgbToHex.
              const alphaSwatch = document.createElement("div");
              alphaSwatch.style.cssText = `width:16px;height:16px;border-radius:4px;background:${currentVal};border:1px solid rgba(255,255,255,0.2);background-image:linear-gradient(45deg,#888 25%,transparent 25%,transparent 75%,#888 75%),linear-gradient(45deg,#888 25%,transparent 25%,transparent 75%,#888 75%);background-size:8px 8px;background-position:0 0,4px 4px;position:relative`;
              const alphaOverlay = document.createElement("div");
              alphaOverlay.style.cssText = `position:absolute;inset:0;background:${currentVal};border-radius:4px`;
              alphaSwatch.appendChild(alphaOverlay);
              alphaSwatch.className = "fdh-ce-color-alpha";
              alphaSwatch.dataset.property = prop.name;
              previewRow.appendChild(preview);
              previewRow.appendChild(alphaSwatch);
              labelRow.appendChild(previewRow);
            }

            row.appendChild(labelRow);

            // Input
            if (prop.type === "color") {
              const inputRow = document.createElement("div");
              inputRow.style.cssText =
                "display:flex;gap:8px;align-items:center";
              const colorInput = document.createElement("input");
              colorInput.type = "color";
              colorInput.className = "fdh-ce-color-input";
              colorInput.dataset.property = prop.name;
              colorInput.value = rgbToHex(currentVal);
              colorInput.style.cssText =
                "width:40px;height:32px;border:none;border-radius:6px;cursor:pointer;background:transparent";
              const textInput = document.createElement("input");
              textInput.type = "text";
              textInput.className = "fdh-ce-text-input";
              textInput.dataset.property = prop.name;
              textInput.value = currentVal;
              textInput.style.cssText =
                "flex:1;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:6px 10px;color:#e2e8f0;font-family:inherit;font-size:12px";
              inputRow.appendChild(colorInput);
              inputRow.appendChild(textInput);
              row.appendChild(inputRow);
            } else if (prop.type === "select") {
              const select = document.createElement("select");
              select.className = "fdh-ce-select-input";
              select.dataset.property = prop.name;
              select.style.cssText =
                "width:100%;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:6px 10px;color:#e2e8f0;font-family:inherit;font-size:12px;cursor:pointer";
              for (const opt of prop.options || []) {
                const o = document.createElement("option");
                o.value = opt;
                o.textContent = opt;
                if (currentVal === opt) o.selected = true;
                select.appendChild(o);
              }
              row.appendChild(select);
            } else if (prop.type === "slider") {
              const sliderRow = document.createElement("div");
              sliderRow.style.cssText =
                "display:flex;gap:8px;align-items:center";
              const slider = document.createElement("input");
              slider.type = "range";
              slider.className = "fdh-ce-slider-input";
              slider.dataset.property = prop.name;
              const numVal = parseFloat(currentVal) || 0;
              slider.value = String(numVal);
              slider.min = String(prop.min ?? 0);
              slider.max = String(prop.max ?? 100);
              slider.step = String(prop.step ?? 1);
              slider.style.cssText = "flex:1";
              const display = document.createElement("span");
              display.style.cssText =
                "font-size:11px;color:#94a3b8;min-width:40px;text-align:right";
              display.textContent = numVal.toFixed(2);
              sliderRow.appendChild(slider);
              sliderRow.appendChild(display);
              row.appendChild(sliderRow);
            } else {
              const input = document.createElement("input");
              input.type = prop.type === "number" ? "number" : "text";
              input.className = `fdh-ce-${prop.type}-input`;
              input.dataset.property = prop.name;
              if (prop.type === "number")
                input.value = String(parseFloat(currentVal) || 0);
              else input.value = currentVal;
              input.style.cssText =
                "width:100%;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:6px 10px;color:#e2e8f0;font-family:inherit;font-size:12px";
              row.appendChild(input);
            }

            propList.appendChild(row);
          }
          editor.appendChild(propList);
        }
        panel.appendChild(editor);

        // Action buttons
        const actions = document.createElement("div");
        actions.style.cssText =
          "padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1);background:rgba(30,41,59,0.5);display:flex;gap:8px;flex-wrap:wrap";

        const undoBtn = document.createElement("button");
        undoBtn.type = "button";
        undoBtn.className = "fdh-ce-undo";
        undoBtn.disabled = historyIndex < 0;
        undoBtn.style.cssText = `flex:1;min-width:60px;background:${historyIndex < 0 ? "rgba(100,116,139,0.2)" : "rgba(99,102,241,0.2)"};border:1px solid ${historyIndex < 0 ? "rgba(100,116,139,0.3)" : "rgba(99,102,241,0.4)"};border-radius:6px;padding:8px 12px;color:${historyIndex < 0 ? "#64748b" : "#818cf8"};font-size:11px;cursor:${historyIndex < 0 ? "not-allowed" : "pointer"}`;
        undoBtn.textContent = "Undo";

        const redoBtn = document.createElement("button");
        redoBtn.type = "button";
        redoBtn.className = "fdh-ce-redo";
        redoBtn.disabled = historyIndex >= history.length - 1;
        redoBtn.style.cssText = `flex:1;min-width:60px;background:${historyIndex >= history.length - 1 ? "rgba(100,116,139,0.2)" : "rgba(99,102,241,0.2)"};border:1px solid ${historyIndex >= history.length - 1 ? "rgba(100,116,139,0.3)" : "rgba(99,102,241,0.4)"};border-radius:6px;padding:8px 12px;color:${historyIndex >= history.length - 1 ? "#64748b" : "#818cf8"};font-size:11px;cursor:${historyIndex >= history.length - 1 ? "not-allowed" : "pointer"}`;
        redoBtn.textContent = "Redo";

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "fdh-ce-copy";
        copyBtn.style.cssText =
          "flex:2;min-width:100px;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:8px 12px;color:#4ade80;font-size:11px;cursor:pointer";
        copyBtn.textContent = "Copy CSS";

        const syncBtn = document.createElement("button");
        syncBtn.type = "button";
        syncBtn.className = "fdh-ce-sync";
        syncBtn.style.cssText =
          "flex:2;min-width:100px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:6px;padding:8px 12px;color:#818cf8;font-size:11px;cursor:pointer";
        syncBtn.textContent = "Sync to VS Code";

        const hasModifications = selectedElement
          ? (modifiedElements.get(selectedElement)?.modifiedStyles?.size ?? 0) >
            0
          : false;
        if (!hasModifications) {
          syncBtn.style.opacity = "0.5";
          syncBtn.style.cursor = "not-allowed";
        }

        actions.appendChild(undoBtn);
        actions.appendChild(redoBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(syncBtn);
        panel.appendChild(actions);
      }

      attachPanelListeners();
    }

    function attachPanelListeners() {
      panel.querySelector(".fdh-ce-close")?.addEventListener("click", cleanup);
      panel.querySelector(".fdh-ce-reset")?.addEventListener("click", () => {
        resetElement();
        updatePanel();
      });
      panel
        .querySelector(".fdh-ce-reset-all")
        ?.addEventListener("click", () => {
          resetAll();
          updatePanel();
        });

      panel.querySelectorAll(".fdh-ce-tab").forEach((tab) => {
        tab.addEventListener("click", (e) => {
          const cat = (e.currentTarget as HTMLElement).dataset.category;
          if (cat && CSS_CATEGORIES.some((c) => c.name === cat)) {
            activeCategory = cat;
            updatePanel();
          }
        });
      });

      panel.querySelector(".fdh-ce-undo")?.addEventListener("click", () => {
        undo();
        updatePanel();
      });
      panel.querySelector(".fdh-ce-redo")?.addEventListener("click", () => {
        redo();
        updatePanel();
      });
      panel.querySelector(".fdh-ce-copy")?.addEventListener("click", copyCSS);

      panel.querySelector(".fdh-ce-sync")?.addEventListener("click", () => {
        if (!selectedElement) return;
        const data = modifiedElements.get(selectedElement);
        if (!data || data.modifiedStyles.size === 0) return;

        const bridge = getBridge();
        if (!bridge.connected) {
          showNotification("VS Code not connected");
          return;
        }

        const edits: Array<{
          selector: string;
          property: string;
          value: string;
          oldValue: string;
        }> = [];
        data.modifiedStyles.forEach((value, property) => {
          edits.push({
            selector: data.selector,
            property,
            value,
            oldValue: data.originalValues.get(property)?.value || "",
          });
        });

        bridge.send({
          type: "ApplyCSSEdit",
          payload: {
            file: data.selector + ".css",
            edits,
          },
        });
        showNotification(`Synced ${edits.length} edit(s) to VS Code`);
      });

      panel
        .querySelectorAll(".fdh-ce-text-input, .fdh-ce-number-input")
        .forEach((input) => {
          input.addEventListener("change", (e) => {
            const t = e.target as HTMLInputElement;
            if (t.dataset.property) {
              applyStyle(t.dataset.property, t.value);
              if (autoApply && showDiff) updatePanel();
            }
          });
        });

      panel.querySelectorAll(".fdh-ce-select-input").forEach((input) => {
        input.addEventListener("change", (e) => {
          const t = e.target as HTMLSelectElement;
          if (t.dataset.property) {
            applyStyle(t.dataset.property, t.value);
            if (autoApply && showDiff) updatePanel();
          }
        });
      });

      panel.querySelectorAll(".fdh-ce-color-input").forEach((input) => {
        input.addEventListener("input", (e) => {
          const t = e.target as HTMLInputElement;
          if (t.dataset.property) {
            applyStyle(t.dataset.property, t.value);
            const textInput = panel.querySelector(
              `.fdh-ce-text-input[data-property="${t.dataset.property}"]`,
            ) as HTMLInputElement;
            if (textInput) textInput.value = t.value;
            panel
              .querySelectorAll(
                `.fdh-ce-color-preview[data-property="${t.dataset.property}"]`,
              )
              .forEach((preview) => {
                (preview as HTMLElement).style.background = t.value;
              });
            panel
              .querySelectorAll(
                `.fdh-ce-color-alpha[data-property="${t.dataset.property}"]`,
              )
              .forEach((swatch) => {
                const overlay = (swatch as HTMLElement)
                  .firstChild as HTMLElement;
                if (overlay) overlay.style.background = t.value;
              });
            if (showDiff) updatePanel();
          }
        });
      });

      panel.querySelectorAll(".fdh-ce-slider-input").forEach((input) => {
        input.addEventListener("input", (e) => {
          const t = e.target as HTMLInputElement;
          if (t.dataset.property) {
            applyStyle(t.dataset.property, t.value);
            const display = t.parentElement?.querySelector("span");
            if (display) display.textContent = parseFloat(t.value).toFixed(2);
          }
        });
      });
    }

    function onMouseMove(e: MouseEvent) {
      if (selectedElement) return;
      const target = e.target as HTMLElement;
      if (isOwnElement(target)) return;
      previewHighlight(target);
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (isOwnElement(target)) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(target);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedElement) deselectElement();
        else cleanup();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        updatePanel();
        updateHighlight(selectedElement);
      } else if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
        updatePanel();
        updateHighlight(selectedElement);
      }
    }

    function onResize() {
      updateHighlight(selectedElement);
    }

    const detachViewport = attachViewportTracker(() => {
      updateHighlight(selectedElement);
    });

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    document.body.style.cursor = "crosshair";

    updatePanel();

    function cleanup() {
      detachViewport();
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      modifiedElements.forEach((data, el) => {
        if (!persistChanges) el.style.cssText = data.originalCssText;
      });
      modifiedElements.clear();
      deselectElement();
      removeOverlayElement(highlightBox);
      removeOverlayElement(panel);
      document.body.style.cursor = "";
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
