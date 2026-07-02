import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

// ---------------------------------------------------------------------------
// Element data extraction helpers
// ---------------------------------------------------------------------------

export interface ExtractedElement {
  tag: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  ariaAttributes: Record<string, string>;
  role: string;
  inlineStyles: string;
  computedStyles: Record<string, string>;
  textContent: string;
  children: ExtractedElement[];
  images: { src: string; alt: string }[];
  formInfo: {
    type: string;
    name: string;
    value: string;
    placeholder: string;
  } | null;
  rect: { width: number; height: number };
}

const MEANINGFUL_STYLE_PROPS = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
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
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "color",
  "background",
  "background-color",
  "background-image",
  "border",
  "border-radius",
  "border-color",
  "border-width",
  "border-style",
  "box-shadow",
  "text-shadow",
  "opacity",
  "overflow",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-self",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-gap",
  "transform",
  "transition",
  "animation",
  "cursor",
  "white-space",
  "text-overflow",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "list-style",
];

const DEFAULT_STYLE_VALUES: Record<string, Set<string>> = {
  display: new Set(["block", "inline"]),
  position: new Set(["static"]),
  "font-weight": new Set(["400", "normal"]),
  "font-style": new Set(["normal"]),
  "text-align": new Set(["start", "left"]),
  opacity: new Set(["1"]),
  cursor: new Set(["auto", "default"]),
  "white-space": new Set(["normal"]),
  "text-decoration": new Set(["none"]),
  overflow: new Set(["visible"]),
  "border-width": new Set(["0px"]),
  "border-style": new Set(["none"]),
  "background-color": new Set(["rgba(0, 0, 0, 0)", "transparent"]),
  "z-index": new Set(["auto"]),
  "min-width": new Set(["0px"]),
  "min-height": new Set(["0px"]),
  "letter-spacing": new Set(["normal"]),
};

function extractElement(
  el: HTMLElement,
  depth: number,
  maxDepth: number,
): ExtractedElement {
  const tag = el.tagName.toLowerCase();
  const id = el.id || "";
  const classes = (typeof el.className === "string" ? el.className : "")
    .split(/\s+/)
    .filter(Boolean);
  const rect = el.getBoundingClientRect();
  const computed = window.getComputedStyle(el);

  // Attributes
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (
      !attr.name.startsWith("aria-") &&
      attr.name !== "role" &&
      attr.name !== "class" &&
      attr.name !== "id" &&
      attr.name !== "style"
    ) {
      attributes[attr.name] = attr.value;
    }
  }

  // ARIA attributes
  const ariaAttributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("aria-")) {
      ariaAttributes[attr.name] = attr.value;
    }
  }

  const role = el.getAttribute("role") || "";
  const inlineStyles = el.getAttribute("style") || "";

  // Computed styles that differ from browser defaults
  const computedStyles: Record<string, string> = {};
  for (const prop of MEANINGFUL_STYLE_PROPS) {
    const val = computed.getPropertyValue(prop);
    const defaults = DEFAULT_STYLE_VALUES[prop];
    if (val && (!defaults || !defaults.has(val))) {
      computedStyles[prop] = val;
    }
  }

  // Text content (direct text only, not from children)
  let textContent = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent?.trim() || "";
    }
  }

  // Children (up to maxDepth)
  const children: ExtractedElement[] = [];
  if (depth < maxDepth) {
    for (const child of Array.from(el.children) as HTMLElement[]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        children.push(extractElement(child, depth + 1, maxDepth));
      }
    }
  }

  // Images
  const images: { src: string; alt: string }[] = [];
  if (tag === "img") {
    images.push({
      src: el.getAttribute("src") || "",
      alt: el.getAttribute("alt") || "",
    });
  }
  for (const img of Array.from(el.querySelectorAll("img"))) {
    images.push({
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
    });
  }

  // Form info
  let formInfo: ExtractedElement["formInfo"] = null;
  if (["input", "textarea", "select"].includes(tag)) {
    formInfo = {
      type: (el as HTMLInputElement).type || tag,
      name: (el as HTMLInputElement).name || "",
      value: (el as HTMLInputElement).value || "",
      placeholder: (el as HTMLInputElement).placeholder || "",
    };
  }

  return {
    tag,
    id,
    classes,
    attributes,
    ariaAttributes,
    role,
    inlineStyles,
    computedStyles,
    textContent,
    children,
    images,
    formInfo,
    rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
  };
}

// ---------------------------------------------------------------------------
// Component name generation
// ---------------------------------------------------------------------------

function generateComponentName(data: ExtractedElement): string {
  if (data.id) {
    return data.id
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  }
  const meaningfulClasses = data.classes.filter(
    (c) =>
      !["container", "wrapper", "div", "span"].includes(c) && c.length < 30,
  );
  if (meaningfulClasses.length > 0) {
    return meaningfulClasses[0]
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  }
  return data.tag.charAt(0).toUpperCase() + data.tag.slice(1) + "Component";
}

// ---------------------------------------------------------------------------
// Style block generation
// ---------------------------------------------------------------------------

function buildCSSBlock(
  className: string,
  styles: Record<string, string>,
): string {
  const entries = Object.entries(styles);
  if (entries.length === 0) return "";
  const props = entries.map(([k, v]) => `  ${k}: ${v};`).join("\n");
  return `.${className} {\n${props}\n}`;
}

// ---------------------------------------------------------------------------
// Framework-specific code generators
// ---------------------------------------------------------------------------

type Framework = "react" | "vue" | "svelte" | "html";

/** Escape a string for use inside HTML/JSX attribute values. */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ariaString(attrs: Record<string, string>, role: string): string {
  const parts: string[] = [];
  if (role) parts.push(`role="${escapeAttr(role)}"`);
  for (const [k, v] of Object.entries(attrs)) {
    parts.push(`${k}="${escapeAttr(v)}"`);
  }
  return parts.join(" ");
}

function buildChildMarkupReact(data: ExtractedElement, indent: string): string {
  const ariaPart = ariaString(data.ariaAttributes, data.role);
  const classPart =
    data.classes.length > 0
      ? ` className="${escapeAttr(data.classes.join(" "))}"`
      : "";
  const idPart = data.id ? ` id="${escapeAttr(data.id)}"` : "";
  const extraAttrs = Object.entries(data.attributes)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";

  if (data.children.length === 0 && !data.textContent) {
    if (data.tag === "img") {
      const src = data.attributes["src"] || data.images[0]?.src || "";
      const alt = data.attributes["alt"] || data.images[0]?.alt || "";
      return `${indent}<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${classPart} />`;
    }
    if (["input", "br", "hr"].includes(data.tag)) {
      return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr} />`;
    }
    return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr}></${data.tag}>`;
  }

  const children = data.children
    .map((c) => buildChildMarkupReact(c, indent + "  "))
    .join("\n");
  const text = data.textContent
    ? `\n${indent}  {${JSON.stringify(data.textContent)}}`
    : "";
  const inner =
    (children ? "\n" + children : "") +
    text +
    (children || text ? "\n" + indent : "");

  return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr}>${inner}</${data.tag}>`;
}

function buildChildMarkupHTML(
  data: ExtractedElement,
  indent: string,
  bindClass = false,
): string {
  const ariaPart = ariaString(data.ariaAttributes, data.role);
  const classPart =
    data.classes.length > 0
      ? bindClass
        ? ` :class="className"`
        : ` class="${escapeAttr(data.classes.join(" "))}"`
      : "";
  const idPart = data.id ? ` id="${escapeAttr(data.id)}"` : "";
  const extraAttrs = Object.entries(data.attributes)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";
  const textPart = data.textContent ? escapeAttr(data.textContent) : "";

  if (data.children.length === 0 && !data.textContent) {
    if (data.tag === "img")
      return `${indent}<img src="${escapeAttr(data.attributes["src"] || "")}" alt="${escapeAttr(data.attributes["alt"] || "")}"${classPart} />`;
    if (["input", "br", "hr"].includes(data.tag))
      return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr} />`;
    return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr}></${data.tag}>`;
  }

  const childrenHTML = data.children
    .map((c) => buildChildMarkupHTML(c, indent + "  ", bindClass))
    .join("\n");
  const inner =
    textPart + (childrenHTML ? "\n" + childrenHTML + "\n" + indent : "");

  return `${indent}<${data.tag}${classPart}${idPart}${extraAttrs}${ariaAttr}>${inner}</${data.tag}>`;
}

// ---- React TSX ----

function generateReact(
  data: ExtractedElement,
  config: Record<string, unknown>,
): string {
  const componentName = generateComponentName(data);
  const includeTypes = config.includeTypes !== false;
  const includeStyles = config.includeStyles !== false;
  const includeA11y = config.includeAccessibility !== false;
  const defaultClass =
    data.classes.length > 0
      ? data.classes.join(" ")
      : componentName.toLowerCase();

  const ariaPart = includeA11y
    ? ariaString(data.ariaAttributes, data.role)
    : "";
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";

  const childMarkup = data.children
    .map((c) => buildChildMarkupReact(c, "        "))
    .join("\n");
  const textChild = data.textContent
    ? `\n        {${JSON.stringify(data.textContent)}}`
    : "";
  const innerParts: string[] = [];
  if (textChild) innerParts.push(textChild);
  if (childMarkup) innerParts.push("\n" + childMarkup);
  innerParts.push("\n        {children}");
  const innerContent = innerParts.join("");

  const propsInterface = includeTypes
    ? `interface ${componentName}Props {\n  children?: React.ReactNode;\n  className?: string;\n}\n\n`
    : "";

  const cssExport =
    includeStyles && Object.keys(data.computedStyles).length > 0
      ? `/* --- styles.css (copy into your stylesheet) --- */\n${buildCSSBlock(defaultClass, data.computedStyles)}\n\n`
      : "";

  const propsType = includeTypes ? `${componentName}Props` : "any";
  const defaultClassLit = JSON.stringify(defaultClass);

  return `${cssExport}import React from 'react';\n\n${propsInterface}export function ${componentName}({ children, className = ${defaultClassLit} }: ${propsType}) {\n  return (\n    <${data.tag} className={className}${ariaAttr}>${innerContent}\n    </${data.tag}>\n  );\n}\n`;
}

// ---- Vue SFC ----

function generateVue(
  data: ExtractedElement,
  config: Record<string, unknown>,
): string {
  const componentName = generateComponentName(data);
  const includeTypes = config.includeTypes !== false;
  const includeStyles = config.includeStyles !== false;
  const includeA11y = config.includeAccessibility !== false;
  const defaultClass =
    data.classes.length > 0
      ? data.classes.join(" ")
      : componentName.toLowerCase();

  const ariaPart = includeA11y
    ? ariaString(data.ariaAttributes, data.role)
    : "";
  const classAttr = includeStyles ? ` :class="className"` : "";
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";

  const childMarkup = data.children
    .map((c) => buildChildMarkupHTML(c, "    ", true))
    .join("\n");
  const textChild = data.textContent
    ? `\n      ${escapeAttr(data.textContent)}`
    : "";
  const innerContent =
    textChild +
    (childMarkup ? "\n" + childMarkup : "") +
    "\n      <slot />\n    ";

  const propsBlock = includeTypes
    ? `const props = withDefaults(defineProps<{ className?: string }>(), { className: ${JSON.stringify(defaultClass)} });`
    : `const props = defineProps({ className: { type: String, default: ${JSON.stringify(defaultClass)} } });`;

  const styleBlock =
    includeStyles && Object.keys(data.computedStyles).length > 0
      ? `\n<style scoped>\n${buildCSSBlock(defaultClass, data.computedStyles)}\n</style>\n`
      : "";

  return `<template>\n  <${data.tag}${classAttr}${ariaAttr}>${innerContent}</${data.tag}>\n</template>\n\n<script setup ${includeTypes ? 'lang="ts"' : ""}>\n${propsBlock}\n</script>${styleBlock}`;
}

// ---- Svelte ----

function generateSvelte(
  data: ExtractedElement,
  config: Record<string, unknown>,
): string {
  const componentName = generateComponentName(data);
  const includeTypes = config.includeTypes !== false;
  const includeStyles = config.includeStyles !== false;
  const includeA11y = config.includeAccessibility !== false;
  const defaultClass =
    data.classes.length > 0
      ? data.classes.join(" ")
      : componentName.toLowerCase();

  const ariaPart = includeA11y
    ? ariaString(data.ariaAttributes, data.role)
    : "";
  const classAttr = includeStyles ? ` class={className}` : "";
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";

  const childMarkup = data.children
    .map((c) => buildChildMarkupHTML(c, "  ", false))
    .join("\n");
  const textChild = data.textContent
    ? `\n  ${escapeAttr(data.textContent)}`
    : "";
  const innerContent =
    textChild + (childMarkup ? "\n" + childMarkup : "") + "\n  <slot />\n";

  const scriptBlock = includeTypes
    ? `<script lang="ts">\n  export let className: string = ${JSON.stringify(defaultClass)};\n</script>\n\n`
    : `<script>\n  export let className = ${JSON.stringify(defaultClass)};\n</script>\n\n`;

  const styleBlock =
    includeStyles && Object.keys(data.computedStyles).length > 0
      ? `\n<style>\n${buildCSSBlock(defaultClass, data.computedStyles)}\n</style>\n`
      : "";

  return `${scriptBlock}<${data.tag}${classAttr}${ariaAttr}>${innerContent}</${data.tag}>${styleBlock}`;
}

// ---- HTML/CSS ----

function generateHTML(
  data: ExtractedElement,
  config: Record<string, unknown>,
): string {
  const componentName = generateComponentName(data);
  const includeStyles = config.includeStyles !== false;
  const includeA11y = config.includeAccessibility !== false;
  const className =
    data.classes.length > 0
      ? data.classes.join(" ")
      : componentName.toLowerCase();

  const ariaPart = includeA11y
    ? ariaString(data.ariaAttributes, data.role)
    : "";
  const classAttr = ` class="${className}"`;
  const ariaAttr = ariaPart ? ` ${ariaPart}` : "";

  const childMarkup = data.children
    .map((c) => buildChildMarkupHTML(c, "  "))
    .join("\n");
  const hasChildren = data.children.length > 0 || data.textContent;
  const innerContent = hasChildren
    ? "\n  " +
      (data.textContent || "<!-- content -->") +
      (childMarkup ? "\n" + childMarkup : "") +
      "\n"
    : "";

  const styleBlock =
    includeStyles && Object.keys(data.computedStyles).length > 0
      ? `\n<style>\n${buildCSSBlock(className, data.computedStyles)}\n</style>\n`
      : "";

  return `<${data.tag}${classAttr}${ariaAttr}>${innerContent}</${data.tag}>${styleBlock}`;
}

export function generateCode(
  data: ExtractedElement,
  framework: Framework,
  config: Record<string, unknown>,
): string {
  switch (framework) {
    case "react":
      return generateReact(data, config);
    case "vue":
      return generateVue(data, config);
    case "svelte":
      return generateSvelte(data, config);
    case "html":
      return generateHTML(data, config);
  }
}

// ---------------------------------------------------------------------------
// Accessibility score calculation
// ---------------------------------------------------------------------------

function calculateAccessibilityScore(data: ExtractedElement): {
  score: number;
  issues: string[];
} {
  let score = 100;
  const issues: string[] = [];

  // Check images for alt text
  for (const img of data.images) {
    if (!img.alt) {
      score -= 15;
      issues.push("Image missing alt text");
    }
  }

  // Check form elements for labels
  if (data.formInfo) {
    const hasAriaLabel = !!data.ariaAttributes["aria-label"];
    const hasLabel = !!data.attributes["name"];
    if (!hasAriaLabel && !hasLabel) {
      score -= 20;
      issues.push("Form element missing label/aria-label");
    }
  }

  // Check for keyboard accessibility
  if (data.attributes["tabindex"] === "-1") {
    score -= 10;
    issues.push("Element removed from tab order (tabindex=-1)");
  }

  // Check interactive elements
  const interactiveTags = ["button", "a", "input", "select", "textarea"];
  if (interactiveTags.includes(data.tag)) {
    if (data.tag === "a" && !data.attributes["href"]) {
      score -= 10;
      issues.push("Anchor missing href");
    }
    if (
      data.tag === "button" &&
      !data.textContent &&
      !data.ariaAttributes["aria-label"]
    ) {
      score -= 15;
      issues.push("Button has no accessible text");
    }
  }

  // Check color contrast (basic: warn if light text on light background)
  const fg = data.computedStyles["color"];
  const bg = data.computedStyles["background-color"];
  if (fg && bg && fg.includes("rgb")) {
    const parseRGB = (s: string) => {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
    };
    const fgc = parseRGB(fg);
    const bgc = parseRGB(bg);
    if (fgc && bgc) {
      const fLum = 0.299 * fgc.r + 0.587 * fgc.g + 0.114 * fgc.b;
      const bLum = 0.299 * bgc.r + 0.587 * bgc.g + 0.114 * bgc.b;
      if (Math.abs(fLum - bLum) < 50) {
        score -= 15;
        issues.push("Low contrast between text and background");
      }
    }
  }

  return { score: Math.max(0, score), issues };
}

// ---------------------------------------------------------------------------
// Helper: create styled elements safely (avoiding innerHTML)
// ---------------------------------------------------------------------------

function styledDiv(css: string, content?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = css;
  if (content !== undefined) el.textContent = content;
  return el;
}

function styledSpan(css: string, text: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.style.cssText = css;
  el.textContent = text;
  return el;
}

function styledButton(text: string, css: string): HTMLButtonElement {
  const el = document.createElement("button");
  el.style.cssText = css;
  el.textContent = text;
  return el;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const copyAsComponent: ToolDefinition = {
  id: "copy-as-component",
  name: "Copy as Component",
  description: "Hover any element, copy as production-ready component code",
  category: "ai",
  icon: "copy",
  configSchema: {
    targetFramework: {
      type: "select",
      label: "Target Framework",
      default: "react",
      options: [
        { label: "React TSX", value: "react" },
        { label: "Vue SFC", value: "vue" },
        { label: "Svelte", value: "svelte" },
        { label: "HTML/CSS", value: "html" },
      ],
    },
    includeTypes: {
      type: "boolean",
      label: "Include TypeScript Types",
      default: true,
    },
    includeStyles: { type: "boolean", label: "Include Styles", default: true },
    includeAccessibility: {
      type: "boolean",
      label: "Include ARIA Attributes",
      default: true,
    },
    makeResponsive: {
      type: "boolean",
      label: "Make Responsive",
      default: false,
    },
  },

  run: (ctx, config) => {
    const cfg = config || {};
    const overlays: HTMLElement[] = [];
    let disposed = false;
    let hoveredEl: HTMLElement | null = null;
    let pinnedEl: HTMLElement | null = null;

    // ---- Highlight overlay ----
    const highlight = document.createElement("div");
    highlight.style.cssText =
      "position:fixed;z-index:2147483645;pointer-events:none;display:none;" +
      "border:2px solid #3b82f6;background:rgba(59,130,246,.1);border-radius:3px;transition:all .05s ease;";
    addOverlayElement(highlight);
    overlays.push(highlight);

    // ---- Tooltip ----
    const tooltip = document.createElement("div");
    tooltip.style.cssText =
      "position:fixed;z-index:2147483646;pointer-events:none;display:none;" +
      "background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px 10px;max-width:320px;" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,.4);" +
      "flex-direction:column;gap:2px;";
    addOverlayElement(tooltip);
    overlays.push(tooltip);

    // ---- Main panel ----
    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:440px;max-height:80vh;z-index:2147483647;" +
      "background:#0f172a;border:1px solid #1e293b;border-radius:12px;" +
      "box-shadow:0 20px 60px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.05);" +
      "font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#e2e8f0;" +
      "display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;";
    addOverlayElement(panel);
    overlays.push(panel);

    // -- Panel Header --
    const headerBar = styledDiv(
      "display:flex;align-items:center;justify-content:space-between;padding:10px 14px;" +
        "background:#1e293b;border-bottom:1px solid #334155;cursor:move;user-select:none;",
    );

    const headerTitle = styledSpan(
      "font-weight:600;font-size:13px;color:#f1f5f9;",
      "Copy as Component",
    );

    const fw = (cfg.targetFramework as string) || "react";
    const fwLabels: Record<string, string> = {
      react: "React TSX",
      vue: "Vue SFC",
      svelte: "Svelte",
      html: "HTML/CSS",
    };
    const frameworkBadge = styledSpan(
      "display:inline-flex;align-items:center;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:500;" +
        "background:#3b82f620;color:#3b82f6;margin-left:8px;",
      fwLabels[fw] || fw,
    );

    const titleWrap = styledDiv("display:flex;align-items:center;");
    titleWrap.append(headerTitle, frameworkBadge);

    const closeBtn = styledButton(
      "×",
      "background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;border-radius:4px;",
    );
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.color = "#f1f5f9";
      closeBtn.style.background = "#334155";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.color = "#94a3b8";
      closeBtn.style.background = "none";
    });
    closeBtn.addEventListener("click", cleanup);

    headerBar.append(titleWrap, closeBtn);

    // -- Panel Body --
    const body = styledDiv(
      "flex:1;overflow-y:auto;padding:12px 14px;min-height:0;",
    );

    // Placeholder content
    const placeholder = styledDiv(
      "color:#64748b;text-align:center;padding:32px 16px;line-height:1.6;",
    );
    const placeholderIcon = styledDiv(
      "font-size:28px;margin-bottom:8px;",
      "📦",
    );
    const placeholderTitle = styledDiv(
      "font-size:13px;color:#94a3b8;font-weight:500;",
      "Hover over any element",
    );
    const placeholderSub = styledDiv(
      "margin-top:4px;",
      "Click to select and generate component code",
    );
    placeholder.append(placeholderIcon, placeholderTitle, placeholderSub);
    body.appendChild(placeholder);

    // -- Panel Status --
    const statusBar = styledDiv(
      "padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;" +
        "display:flex;justify-content:space-between;align-items:center;",
    );
    const statusLeft = styledSpan("", "Waiting for element selection...");
    const statusRight = styledSpan("", "");
    statusBar.append(statusLeft, statusRight);

    panel.append(headerBar, body, statusBar);

    // ---- Dragging support ----
    let isDragging = false;
    const dragOffset = { x: 0, y: 0 };

    const onHeaderMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      panel.style.transition = "none";
    };
    const onMouseMoveDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      panel.style.left = `${e.clientX - dragOffset.x}px`;
      panel.style.top = `${e.clientY - dragOffset.y}px`;
      panel.style.right = "auto";
    };
    const onMouseUpDrag = () => {
      isDragging = false;
      panel.style.transition = "";
    };

    headerBar.addEventListener("mousedown", onHeaderMouseDown);
    document.addEventListener("mousemove", onMouseMoveDrag);
    document.addEventListener("mouseup", onMouseUpDrag);

    // ---- Tooltip updater ----
    function updateTooltip(el: HTMLElement, rect: DOMRect): void {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      const cls =
        typeof el.className === "string"
          ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")
          : "";
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      // Clear tooltip and rebuild safely
      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

      const tagLine = styledSpan(
        "color:#f472b6;font-weight:600;",
        `<${tag}${id}${cls ? "." + cls : ""}>`,
      );
      const dimLine = styledSpan("color:#64748b;", `${w} x ${h}px`);
      tooltip.append(tagLine, dimLine);
      tooltip.style.display = "flex";

      // Position tooltip above element
      const ttTop = rect.top - 48;
      tooltip.style.top = (ttTop > 0 ? ttTop : rect.bottom + 4) + "px";
      tooltip.style.left = rect.left + "px";
    }

    // ---- Code display renderer ----
    function renderCode(
      code: string,
      a11yScore: number,
      a11yIssues: string[],
    ): void {
      while (body.firstChild) body.removeChild(body.firstChild);

      // Accessibility score row
      const scoreRow = styledDiv(
        "display:flex;align-items:center;gap:8px;margin-bottom:10px;",
      );

      const scoreLabel = styledSpan(
        "font-size:11px;color:#64748b;",
        "Accessibility Score",
      );

      const scoreValue = styledSpan("", String(a11yScore));
      const scoreColor =
        a11yScore >= 90 ? "#22c55e" : a11yScore >= 70 ? "#eab308" : "#ef4444";
      scoreValue.style.cssText =
        `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;` +
        `background:${scoreColor}20;color:${scoreColor};font-weight:700;font-size:12px;`;

      scoreRow.append(scoreLabel, scoreValue);

      // Accessibility issues
      if (a11yIssues.length > 0) {
        const issuesWrap = styledDiv(
          "margin-left:auto;display:flex;flex-direction:column;gap:2px;",
        );
        for (const issue of a11yIssues.slice(0, 3)) {
          const issueEl = styledSpan(
            "font-size:10px;color:#f871c0;background:#f871c015;padding:1px 6px;border-radius:3px;",
            issue,
          );
          issuesWrap.appendChild(issueEl);
        }
        scoreRow.appendChild(issuesWrap);
      }

      body.appendChild(scoreRow);

      // Code block wrapper
      const codeWrap = styledDiv(
        "background:#0c1222;border:1px solid #1e293b;border-radius:8px;overflow:hidden;",
      );

      // Code block header
      const codeHeader = styledDiv(
        "display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#1e293b;border-bottom:1px solid #334155;",
      );

      const codeLabel = styledSpan(
        "font-size:11px;color:#64748b;",
        fwLabels[fw] || "Code",
      );

      const copyBtn = styledButton(
        "Copy to Clipboard",
        "padding:3px 10px;border-radius:4px;border:1px solid #334155;background:#1e293b;" +
          "color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;",
      );
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.textContent = "Copied!";
          copyBtn.style.color = "#22c55e";
          copyBtn.style.borderColor = "#22c55e";
          setTimeout(() => {
            copyBtn.textContent = "Copy to Clipboard";
            copyBtn.style.color = "#94a3b8";
            copyBtn.style.borderColor = "#334155";
          }, 2000);
        });
      });
      copyBtn.addEventListener("mouseenter", () => {
        copyBtn.style.opacity = "0.8";
      });
      copyBtn.addEventListener("mouseleave", () => {
        copyBtn.style.opacity = "1";
      });

      codeHeader.append(codeLabel, copyBtn);

      // Code content (uses innerHTML for syntax highlighting spans - content is generated
      // internally from extracted DOM data, not from arbitrary user input)
      const codeContent = document.createElement("pre");
      codeContent.style.cssText =
        'padding:10px 12px;margin:0;overflow-x:auto;font-family:"SF Mono",Menlo,monospace;' +
        "font-size:11px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;";
      // Plain text — regex highlighter corrupted nested spans on real output.
      codeContent.textContent = code;

      codeWrap.append(codeHeader, codeContent);
      body.appendChild(codeWrap);
    }

    // ---- Selection & code generation ----
    function selectElement(el: HTMLElement): void {
      pinnedEl = el;
      statusLeft.textContent = "Analyzing element...";
      statusRight.textContent = "";

      const data = extractElement(el, 0, 3);
      const code = generateCode(data, fw as Framework, cfg);
      const { score, issues } = calculateAccessibilityScore(data);

      renderCode(code, score, issues);

      const sel =
        (typeof el.className === "string"
          ? el.className.split(/\s+/)[0]
          : "") || el.tagName.toLowerCase();
      const lines = code.split("\n").length;
      statusLeft.textContent = `Selected: ${sel}`;
      statusRight.textContent = `${lines} lines generated`;
    }

    // ---- Event handlers ----
    const handleMouseMove = (e: MouseEvent) => {
      if (disposed || isDragging) return;
      const target = e.target as HTMLElement;
      if (
        !target ||
        target === document.documentElement ||
        target === document.body
      )
        return;
      if (
        panel.contains(target) ||
        tooltip.contains(target) ||
        highlight.contains(target)
      )
        return;

      hoveredEl = target;
      const rect = target.getBoundingClientRect();
      highlight.style.display = "block";
      highlight.style.top = rect.top - 1 + "px";
      highlight.style.left = rect.left - 1 + "px";
      highlight.style.width = rect.width + 2 + "px";
      highlight.style.height = rect.height + 2 + "px";

      updateTooltip(target, rect);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || panel.contains(target)) return;
      if (target === pinnedEl) return;
      e.preventDefault();
      e.stopPropagation();
      if (hoveredEl) {
        selectElement(hoveredEl);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      headerBar.removeEventListener("mousedown", onHeaderMouseDown);
      document.removeEventListener("mousemove", onMouseMoveDrag);
      document.removeEventListener("mouseup", onMouseUpDrag);
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
