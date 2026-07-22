import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { jumpToCSSSource } from "@/lib/css-source-resolver";
import {
  collectCascadedRules,
  detectConflicts,
  specificityToString,
} from "@/lib/css-analysis";

const CSS_CATEGORIES = [
  {
    name: "Layout",
    properties: [
      "display",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "float",
      "clear",
      "z-index",
      "overflow",
      "overflow-x",
      "overflow-y",
      "visibility",
    ],
  },
  {
    name: "Box Model",
    properties: [
      "width",
      "height",
      "min-width",
      "max-width",
      "min-height",
      "max-height",
      "margin",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "box-sizing",
    ],
  },
  {
    name: "Typography",
    properties: [
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-align",
      "text-decoration",
      "text-transform",
      "white-space",
      "word-wrap",
      "text-overflow",
      "color",
    ],
  },
  {
    name: "Background",
    properties: [
      "background-color",
      "background-image",
      "background-position",
      "background-size",
      "background-repeat",
      "background-attachment",
      "background-clip",
      "background-origin",
    ],
  },
  {
    name: "Border",
    properties: [
      "border-width",
      "border-style",
      "border-color",
      "border-radius",
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-left-radius",
      "border-bottom-right-radius",
    ],
  },
  {
    name: "Flexbox",
    properties: [
      "flex",
      "flex-grow",
      "flex-shrink",
      "flex-basis",
      "flex-direction",
      "flex-wrap",
      "justify-content",
      "align-items",
      "align-content",
      "align-self",
      "order",
      "gap",
      "row-gap",
      "column-gap",
    ],
  },
  {
    name: "Grid",
    properties: [
      "grid-template-columns",
      "grid-template-rows",
      "grid-template-areas",
      "grid-column",
      "grid-row",
      "grid-area",
      "grid-auto-columns",
      "grid-auto-rows",
      "grid-auto-flow",
      "grid-gap",
      "justify-items",
      "place-items",
      "place-content",
    ],
  },
  {
    name: "Transform",
    properties: [
      "transform",
      "transform-origin",
      "transform-style",
      "perspective",
      "perspective-origin",
      "backface-visibility",
    ],
  },
  {
    name: "Transition",
    properties: [
      "transition",
      "transition-property",
      "transition-duration",
      "transition-timing-function",
      "transition-delay",
    ],
  },
  {
    name: "Animation",
    properties: [
      "animation",
      "animation-name",
      "animation-duration",
      "animation-timing-function",
      "animation-delay",
      "animation-iteration-count",
      "animation-direction",
      "animation-fill-mode",
      "animation-play-state",
    ],
  },
  {
    name: "Other",
    properties: [
      "opacity",
      "cursor",
      "pointer-events",
      "user-select",
      "box-shadow",
      "text-shadow",
      "clip-path",
      "filter",
      "mix-blend-mode",
      "isolation",
    ],
  },
];

function _escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateVal(s: string, max = 20): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function buildTooltipContent(
  element: HTMLElement,
  currentCategory: string,
  showInherited: boolean,
  options: {
    showBrowserDefaults?: boolean;
    groupByProperty?: boolean;
    maxRules?: number;
  } = {},
): DocumentFragment {
  const targetElement = element;
  const showBrowserDefaults = options.showBrowserDefaults ?? false;
  const groupByProperty = options.groupByProperty ?? true;
  const maxRules = options.maxRules ?? 30;
  const frag = document.createDocumentFragment();

  // Header section
  const header = document.createElement("div");
  header.style.cssText =
    "margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1)";

  const headerRow = document.createElement("div");
  headerRow.style.cssText =
    "display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px";

  const selectorCode = document.createElement("code");
  selectorCode.style.cssText = "color:#c084fc;font-size:14px;font-weight:600";
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith("fdh-"))
    .map((c) => `.${c}`)
    .join("");
  selectorCode.textContent = `${tagName}${id}${classes}`;

  const dimSpan = document.createElement("span");
  dimSpan.style.cssText = "color:#64748b;font-size:11px";
  const rect = element.getBoundingClientRect();
  dimSpan.textContent = `${Math.round(rect.width)}x${Math.round(rect.height)}`;

  headerRow.appendChild(selectorCode);
  headerRow.appendChild(dimSpan);
  header.appendChild(headerRow);
  frag.appendChild(header);

  // Controls row
  const controls = document.createElement("div");
  controls.style.cssText =
    "margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap";

  const catSelect = document.createElement("select");
  catSelect.className = "fdh-ci-cat";
  catSelect.style.cssText =
    "background:rgba(30,41,59,0.8);border:1px solid rgba(99,102,241,0.3);border-radius:6px;padding:6px 10px;color:#e2e8f0;font-size:12px;cursor:pointer";
  for (const name of ["All", ...CSS_CATEGORIES.map((c) => c.name)]) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === currentCategory) opt.selected = true;
    catSelect.appendChild(opt);
  }

  const inheritedLabel = document.createElement("label");
  inheritedLabel.style.cssText =
    "display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;cursor:pointer";
  const inheritedCb = document.createElement("input");
  inheritedCb.type = "checkbox";
  inheritedCb.className = "fdh-ci-inherited";
  inheritedCb.checked = showInherited;
  inheritedCb.style.cursor = "pointer";
  inheritedLabel.appendChild(inheritedCb);
  inheritedLabel.appendChild(document.createTextNode("Show inherited"));

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "fdh-ci-copy";
  copyBtn.style.cssText =
    "margin-left:auto;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:6px;padding:6px 12px;color:#818cf8;font-size:11px;cursor:pointer";
  copyBtn.textContent = "Copy CSS";

  controls.appendChild(catSelect);
  controls.appendChild(inheritedLabel);
  controls.appendChild(copyBtn);
  frag.appendChild(controls);

  // Properties list
  const propsContainer = document.createElement("div");
  propsContainer.style.cssText = "max-height:400px;overflow-y:auto";

  const computed = window.getComputedStyle(element);
  const parent = element.parentElement;
  const parentComputed = parent ? window.getComputedStyle(parent) : null;

  let properties: { name: string; value: string; inherited: boolean }[] = [];
  for (let i = 0; i < computed.length; i++) {
    const name = computed[i];
    const value = computed.getPropertyValue(name);
    let inherited = false;
    if (parentComputed) {
      inherited =
        value === parentComputed.getPropertyValue(name) && value !== "";
    }
    properties.push({ name, value, inherited });
  }

  if (currentCategory !== "All") {
    const cat = CSS_CATEGORIES.find((c) => c.name === currentCategory);
    if (cat)
      properties = properties.filter((p) => cat.properties.includes(p.name));
  }
  if (!showInherited) properties = properties.filter((p) => !p.inherited);
  if (currentCategory === "All") {
    properties = properties.filter(
      (p) =>
        p.value &&
        p.value !== "none" &&
        p.value !== "normal" &&
        p.value !== "auto" &&
        p.value !== "0px",
    );
  }
  // When the user opts to see browser default (initial) values, keep them;
  // otherwise drop properties whose computed value matches the spec initial
  // value for common properties. This mirrors Chrome DevTools' "show all" vs
  // "show filtered" toggle.
  if (!showBrowserDefaults) {
    const INITIAL_VALUES: Record<string, string[]> = {
      display: ["inline"],
      position: ["static"],
      visibility: ["visible"],
      overflow: ["visible"],
      "white-space": ["normal"],
      "text-decoration": ["none"],
      "text-align": ["start"],
      "font-style": ["normal"],
      "font-weight": ["400"],
      opacity: ["1"],
      "z-index": ["auto"],
      "min-width": ["0px"],
      "min-height": ["0px"],
      "background-color": ["rgba(0, 0, 0, 0)", "transparent"],
      "border-width": ["0px"],
      "border-style": ["none"],
      cursor: ["auto"],
    };
    properties = properties.filter((p) => {
      const initial = INITIAL_VALUES[p.name];
      return !initial || !initial.includes(p.value);
    });
  }
  // Cap the rendered property count at the user-configured maxRules so that a
  // page with hundreds of longhand properties doesn't drown the tooltip.
  const cappedProperties = properties.slice(0, maxRules);

  if (properties.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#64748b;padding:8px";
    empty.textContent = "No properties to display";
    propsContainer.appendChild(empty);
  } else {
    // When groupByProperty is enabled (default), sort properties alphabetically
    // so related longhands (e.g. margin, margin-top, margin-right) cluster
    // together — matching the DevTools computed panel convention. When
    // disabled, preserve declaration order.
    const ordered = groupByProperty
      ? [...cappedProperties].sort((a, b) => a.name.localeCompare(b.name))
      : cappedProperties;
    for (const p of ordered) {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);${p.inherited ? "opacity:0.6;" : ""}`;
      const nameWrap = document.createElement("span");
      nameWrap.style.cssText = "display:flex;align-items:center;gap:4px;";
      const nameSpan = document.createElement("span");
      nameSpan.style.color = "#93c5fd";
      nameSpan.textContent = p.name;
      nameWrap.appendChild(nameSpan);
      // Per-property badge: marks inherited properties with a small "Inh."
      // chip so authors can tell at a glance which values were passed down
      // from an ancestor vs declared on the element itself.
      if (p.inherited) {
        const badge = document.createElement("span");
        badge.style.cssText =
          "font-size:9px;padding:0 4px;border-radius:2px;background:#fbbf2420;color:#fbbf24;font-weight:600;line-height:14px;";
        badge.textContent = "Inh.";
        badge.title = "Inherited from ancestor";
        nameWrap.appendChild(badge);
      }
      const rightSide = document.createElement("span");
      rightSide.style.cssText =
        "display:flex;align-items:center;gap:6px;max-width:250px;overflow:hidden";
      const valSpan = document.createElement("span");
      valSpan.style.cssText =
        "color:#a5f3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      valSpan.textContent = p.value;
      const openIcon = document.createElement("span");
      openIcon.textContent = "↗";
      openIcon.title = "Jump to source in VS Code";
      openIcon.style.cssText =
        "cursor:pointer;color:#6366f1;opacity:0;transition:opacity 0.15s;font-size:13px;flex-shrink:0;";
      openIcon.addEventListener("click", (ev) => {
        ev.stopPropagation();
        jumpToCSSSource(targetElement, p.name);
      });
      rightSide.appendChild(valSpan);
      rightSide.appendChild(openIcon);
      row.appendChild(nameWrap);
      row.appendChild(rightSide);
      row.addEventListener("mouseenter", () => {
        openIcon.style.opacity = "1";
      });
      row.addEventListener("mouseleave", () => {
        openIcon.style.opacity = "0";
      });
      propsContainer.appendChild(row);
    }
    if (properties.length > maxRules) {
      const more = document.createElement("div");
      more.style.cssText =
        "color:#64748b;text-align:center;padding:8px;font-size:11px";
      more.textContent = `...and ${properties.length - maxRules} more`;
      propsContainer.appendChild(more);
    }
  }

  frag.appendChild(propsContainer);

  // Conflict detection section
  const allRules = collectCascadedRules(element);
  const conflicts = detectConflicts(allRules);
  if (conflicts.length > 0) {
    const conflictSection = document.createElement("div");
    conflictSection.style.cssText =
      "margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1)";

    const conflictHeader = document.createElement("div");
    conflictHeader.style.cssText =
      "color: #f38ba8; font-size: 11px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;";
    const warningIcon = document.createElement("span");
    warningIcon.textContent = "⚠";
    conflictHeader.appendChild(warningIcon);
    conflictHeader.appendChild(
      document.createTextNode(
        `${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""}`,
      ),
    );
    conflictSection.appendChild(conflictHeader);

    // Show top 5 conflicts
    for (const conflict of conflicts.slice(0, 5)) {
      const row = document.createElement("div");
      row.style.cssText =
        "padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;";

      const propName = document.createElement("span");
      propName.style.color = "#94e2d5";
      propName.textContent = conflict.property;
      row.appendChild(propName);

      row.appendChild(document.createTextNode(": "));

      const winnerVal = document.createElement("span");
      winnerVal.style.color = "#a6e3a1";
      winnerVal.textContent = truncateVal(conflict.winningValue, 15);
      row.appendChild(winnerVal);

      const spec = specificityToString(conflict.winner.specificity);
      const specSpan = document.createElement("span");
      specSpan.style.cssText =
        "color: #6c7086; font-size: 9px; margin-left: 4px;";
      specSpan.textContent = `(${spec})`;
      row.appendChild(specSpan);

      if (conflict.overriddenValues.length > 0) {
        const overridden = document.createElement("span");
        overridden.style.cssText =
          "color: #f38ba8; font-size: 9px; margin-left: 4px;";
        const overVals = conflict.overriddenValues
          .map((v) => truncateVal(v.value, 10))
          .join(", ");
        overridden.textContent = `overrides: ${overVals}`;
        row.appendChild(overridden);
      }

      conflictSection.appendChild(row);
    }

    if (conflicts.length > 5) {
      const more = document.createElement("div");
      more.style.cssText = "color: #6c7086; font-size: 10px; padding: 4px 0;";
      more.textContent = `...and ${conflicts.length - 5} more`;
      conflictSection.appendChild(more);
    }

    frag.appendChild(conflictSection);
  }

  return frag;
}

export const cssInspector: ToolDefinition = {
  id: "css-inspector",
  name: "CSS Inspector",
  description: "Inspect applied CSS rules and computed styles for any element",
  category: "css",
  icon: "Eye",
  configSchema: {
    showInherited: {
      type: "boolean",
      label: "Show Inherited Styles",
      default: false,
    },
    showBrowserDefaults: {
      type: "boolean",
      label: "Show Browser Defaults",
      default: false,
    },
    groupByProperty: {
      type: "boolean",
      label: "Group by Property",
      default: true,
    },
    maxRules: {
      type: "slider",
      label: "Max Rules Shown",
      default: 30,
      min: 10,
      max: 100,
      step: 10,
    },
  },
  run: (ctx, config) => {
    let currentCategory = "All";
    let showInherited = (config?.showInherited as boolean) ?? false;
    const showBrowserDefaults =
      (config?.showBrowserDefaults as boolean) ?? false;
    const groupByProperty = (config?.groupByProperty as boolean) ?? true;
    const maxRules = (config?.maxRules as number) ?? 30;
    let highlightedElement: HTMLElement | null = null;

    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position:fixed;z-index:2147483647;background:rgba(15,23,42,0.98);
      border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:16px;
      min-width:320px;max-width:450px;max-height:80vh;overflow-y:auto;
      font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;
      color:#e2e8f0;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);
      backdrop-filter:blur(12px);display:none;pointer-events:auto;
    `;
    addOverlayElement(tooltip);

    function removeHighlight() {
      if (highlightedElement) {
        highlightedElement.style.outline = "";
        highlightedElement.style.outlineOffset = "";
        highlightedElement = null;
      }
    }

    function highlight(el: HTMLElement) {
      removeHighlight();
      highlightedElement = el;
      el.style.outline = "2px solid #6366f1";
      el.style.outlineOffset = "2px";
    }

    function positionTooltip(x: number, y: number) {
      const r = tooltip.getBoundingClientRect();
      let left = x + 20;
      let top = y + 20;
      if (left + r.width > window.innerWidth) left = x - r.width - 10;
      if (top + r.height > window.innerHeight) top = y - r.height - 10;
      tooltip.style.left = `${Math.max(10, left)}px`;
      tooltip.style.top = `${Math.max(10, top)}px`;
    }

    function refreshTooltip() {
      if (!highlightedElement) return;
      tooltip.textContent = "";
      tooltip.appendChild(
        buildTooltipContent(
          highlightedElement,
          currentCategory,
          showInherited,
          {
            showBrowserDefaults,
            groupByProperty,
            maxRules,
          },
        ),
      );
      attachTooltipListeners();
    }

    function attachTooltipListeners() {
      const catSelect = tooltip.querySelector(
        ".fdh-ci-cat",
      ) as HTMLSelectElement | null;
      if (catSelect) {
        catSelect.addEventListener("change", (e) => {
          currentCategory = (e.target as HTMLSelectElement).value;
          refreshTooltip();
        });
      }

      const inheritedCb = tooltip.querySelector(
        ".fdh-ci-inherited",
      ) as HTMLInputElement | null;
      if (inheritedCb) {
        inheritedCb.addEventListener("change", (e) => {
          showInherited = (e.target as HTMLInputElement).checked;
          refreshTooltip();
        });
      }

      const copyBtn = tooltip.querySelector(".fdh-ci-copy");
      if (copyBtn && highlightedElement) {
        const el = highlightedElement;
        copyBtn.addEventListener("click", () => {
          const comp = window.getComputedStyle(el);
          const importantProps = [
            "display",
            "position",
            "width",
            "height",
            "margin",
            "padding",
            "background-color",
            "color",
            "font-family",
            "font-size",
            "font-weight",
            "border-width",
            "border-radius",
          ];
          const sel =
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : "") +
            Array.from(el.classList)
              .filter((c) => !c.startsWith("fdh-"))
              .map((c) => `.${c}`)
              .join("");
          let css = `${sel} {\n`;
          for (const prop of importantProps) {
            const val = comp.getPropertyValue(prop);
            if (val && val !== "none" && val !== "normal" && val !== "auto") {
              css += `  ${prop}: ${val};\n`;
            }
          }
          css += "}";
          navigator.clipboard.writeText(css).then(() => {
            (copyBtn as HTMLElement).textContent = "Copied!";
            setTimeout(() => {
              (copyBtn as HTMLElement).textContent = "Copy CSS";
            }, 1500);
          });
        });
      }
    }

    function onMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || target === tooltip) return;
      if (target.closest("#fdh-overlay-container")) return;

      highlight(target);
      tooltip.textContent = "";
      tooltip.appendChild(
        buildTooltipContent(target, currentCategory, showInherited, {
          showBrowserDefaults,
          groupByProperty,
          maxRules,
        }),
      );
      tooltip.style.display = "block";
      positionTooltip(e.clientX, e.clientY);
      attachTooltipListeners();
    }

    function onClick(e: MouseEvent) {
      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement;
        if (target && !target.closest("#fdh-overlay-container")) {
          e.preventDefault();
          const comp = window.getComputedStyle(target);
          const importantProps = [
            "display",
            "position",
            "width",
            "height",
            "margin",
            "padding",
            "background-color",
            "color",
            "font-family",
            "font-size",
            "font-weight",
            "border-width",
            "border-radius",
          ];
          const sel =
            target.tagName.toLowerCase() +
            (target.id ? `#${target.id}` : "") +
            Array.from(target.classList)
              .filter((c) => !c.startsWith("fdh-"))
              .map((c) => `.${c}`)
              .join("");
          let css = `${sel} {\n`;
          for (const prop of importantProps) {
            const val = comp.getPropertyValue(prop);
            if (val && val !== "none" && val !== "normal" && val !== "auto") {
              css += `  ${prop}: ${val};\n`;
            }
          }
          css += "}";
          navigator.clipboard.writeText(css);
        }
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cleanup();
    }

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.body.style.cursor = "crosshair";

    function cleanup() {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      removeHighlight();
      removeOverlayElement(tooltip);
      document.body.style.cursor = "";
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
