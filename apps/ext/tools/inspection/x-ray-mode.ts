import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  getOverlayContainer,
} from "@/content/overlay-manager";
import { ToolPanel, createBadge } from "@/content/tool-panel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface XRayIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "accessibility" | "performance" | "seo" | "best-practice";
  title: string;
  description: string;
  element?: HTMLElement;
  selector: string;
  suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<XRayIssue["severity"], string> = {
  critical: "#ef4444",
  warning: "#eab308",
  info: "#3b82f6",
};

const CATEGORY_COLORS: Record<XRayIssue["category"], string> = {
  accessibility: "#ef4444",
  performance: "#f97316",
  seo: "#3b82f6",
  "best-practice": "#eab308",
};

const CATEGORY_LABELS: Record<XRayIssue["category"], string> = {
  accessibility: "A11Y",
  performance: "PERF",
  seo: "SEO",
  "best-practice": "BP",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let issueCounter = 0;
function nextId(): string {
  return "xray-" + ++issueCounter;
}

function getSelector(el: Element): string {
  if (el.id) return "#" + el.id;
  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === "string") {
    const first = el.className.trim().split(/\s+/)[0];
    if (first) return tag + "." + first;
  }
  return tag;
}

function describeEl(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = el.textContent?.slice(0, 40).trim() || "";
  return text ? "<" + tag + '> "' + text + '"' : "<" + tag + ">";
}

function isHidden(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  );
}

// ---------------------------------------------------------------------------
// Colour contrast helpers (reused from accessibility-audit)
// ---------------------------------------------------------------------------

export function parseColour(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function getBackgroundColour(el: HTMLElement): [number, number, number] | null {
  let current: HTMLElement | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return parseColour(bg);
    }
    current = current.parentElement;
  }
  return [255, 255, 255];
}

export function relativeLuminance(rgb: [number, number, number]): number {
  const vals = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Scanners — each populates the issues array in-place
// ---------------------------------------------------------------------------

function scanAccessibility(issues: XRayIssue[]): void {
  // --- Images without alt text ---
  document.querySelectorAll("img").forEach((img) => {
    if (
      img.getAttribute("role") === "presentation" ||
      img.getAttribute("aria-hidden") === "true"
    )
      return;
    if (!img.alt || img.alt.trim() === "") {
      issues.push({
        id: nextId(),
        severity: "critical",
        category: "accessibility",
        title: "Image missing alt text",
        description:
          "This image has no alt attribute. Screen readers cannot convey its purpose.",
        element: img as HTMLImageElement,
        selector: getSelector(img),
        suggestedFix:
          'Add a descriptive alt attribute, or role="presentation" if decorative.',
      });
    }
    if (img.alt && img.alt.length > 125) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "accessibility",
        title: "Alt text too long",
        description:
          "Alt text is " +
          img.alt.length +
          " characters (recommended max 125).",
        element: img as HTMLImageElement,
        selector: getSelector(img),
        suggestedFix: "Shorten the alt text to a concise description.",
      });
    }
  });

  // --- Inputs without labels ---
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    const el = input as HTMLInputElement;
    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "reset"
    )
      return;
    if (isHidden(el)) return;

    const id = el.id;
    let hasLabel = false;
    if (id) {
      const label = document.querySelector('label[for="' + id + '"]');
      if (label) hasLabel = true;
    }
    if (el.closest("label")) hasLabel = true;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
      hasLabel = true;

    if (!hasLabel) {
      issues.push({
        id: nextId(),
        severity: "critical",
        category: "accessibility",
        title: "Form control missing label",
        description:
          describeEl(el) +
          " has no associated label, aria-label, or aria-labelledby.",
        element: el,
        selector: getSelector(el),
        suggestedFix:
          'Add a <label for="..."> element, or an aria-label attribute.',
      });
    }
  });

  // --- Invalid ARIA roles ---
  const validRoles = new Set([
    "alert",
    "alertdialog",
    "application",
    "article",
    "banner",
    "button",
    "cell",
    "checkbox",
    "columnheader",
    "combobox",
    "complementary",
    "contentinfo",
    "dialog",
    "directory",
    "document",
    "feed",
    "figure",
    "form",
    "grid",
    "gridcell",
    "group",
    "heading",
    "img",
    "link",
    "list",
    "listbox",
    "listitem",
    "log",
    "main",
    "marquee",
    "math",
    "menu",
    "menubar",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "navigation",
    "none",
    "note",
    "option",
    "presentation",
    "progressbar",
    "radio",
    "radiogroup",
    "region",
    "row",
    "rowgroup",
    "rowheader",
    "scrollbar",
    "search",
    "searchbox",
    "separator",
    "slider",
    "spinbutton",
    "status",
    "switch",
    "tab",
    "table",
    "tablist",
    "tabpanel",
    "term",
    "textbox",
    "timer",
    "toolbar",
    "tooltip",
    "tree",
    "treegrid",
    "treeitem",
  ]);

  document.querySelectorAll("[role]").forEach((el) => {
    const role = el.getAttribute("role")?.trim();
    if (role && !validRoles.has(role)) {
      issues.push({
        id: nextId(),
        severity: "critical",
        category: "accessibility",
        title: 'Invalid ARIA role: "' + role + '"',
        description: 'The role "' + role + '" is not a valid WAI-ARIA role.',
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix:
          "Replace with a valid ARIA role from the WAI-ARIA specification.",
      });
    }
  });

  // --- Focusable element inside aria-hidden ---
  document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
    const focusable = el.querySelector(
      "a, button, input, select, textarea, [tabindex]",
    );
    if (focusable) {
      issues.push({
        id: nextId(),
        severity: "critical",
        category: "accessibility",
        title: "Focusable element inside aria-hidden",
        description:
          'A focusable element is inside a container with aria-hidden="true".',
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix:
          "Remove aria-hidden or make descendant elements non-focusable.",
      });
    }
  });

  // --- Links without accessible text ---
  document.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("aria-hidden") === "true") return;
    const text = a.textContent?.trim() || "";
    const ariaLabel = a.getAttribute("aria-label")?.trim() || "";
    const title = a.getAttribute("title")?.trim() || "";
    const imgAlt = a.querySelector("img")?.alt?.trim() || "";
    if (!text && !ariaLabel && !title && !imgAlt) {
      issues.push({
        id: nextId(),
        severity: "critical",
        category: "accessibility",
        title: "Link has no accessible text",
        description: describeEl(a) + " has no discernible link text.",
        element: a as HTMLAnchorElement,
        selector: getSelector(a),
        suggestedFix: "Add link text, an aria-label, or a title attribute.",
      });
    }
  });

  // --- Colour contrast ---
  const textEls = document.querySelectorAll(
    "p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button, small, strong, em, div",
  );
  const seen = new Set<string>();
  let checked = 0;
  textEls.forEach((el) => {
    if (checked >= 60) return;
    const key = getSelector(el);
    if (seen.has(key)) return;
    seen.add(key);

    const htmlEl = el as HTMLElement;
    if (isHidden(htmlEl)) return;

    const style = window.getComputedStyle(htmlEl);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight, 10);
    const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

    const bgColor = getBackgroundColour(htmlEl);
    const fgColor = parseColour(style.color);
    if (!bgColor || !fgColor) return;

    const ratio = contrastRatio(
      relativeLuminance(fgColor),
      relativeLuminance(bgColor),
    );
    const required = isLarge ? 3.0 : 4.5;

    if (ratio < required) {
      issues.push({
        id: nextId(),
        severity: ratio < 3 ? "critical" : "warning",
        category: "accessibility",
        title: "Low colour contrast (" + ratio.toFixed(1) + ":1)",
        description:
          describeEl(htmlEl) +
          " has a contrast ratio of " +
          ratio.toFixed(1) +
          ":1 (required " +
          required +
          ":1).",
        element: htmlEl,
        selector: getSelector(htmlEl),
        suggestedFix:
          "Increase the contrast between text and background colour.",
      });
      checked++;
    }
  });

  // --- Heading hierarchy ---
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let lastLevel = 0;
  let h1Count = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    if (level === 1) h1Count++;
    if (level > lastLevel + 1 && lastLevel > 0) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "accessibility",
        title: "Heading level skipped",
        description: "Skipped from h" + lastLevel + " to h" + level + ".",
        element: h as HTMLElement,
        selector: getSelector(h),
        suggestedFix: "Use sequential heading levels (h1-h6) without skipping.",
      });
    }
    lastLevel = level;
  });
  if (h1Count === 0) {
    issues.push({
      id: nextId(),
      severity: "warning",
      category: "accessibility",
      title: "No h1 heading on page",
      description:
        "The page has no <h1> element. Screen readers and SEO rely on a single h1.",
      selector: "html",
      suggestedFix: "Add an <h1> element as the primary page heading.",
    });
  }

  // --- Missing lang attribute ---
  const lang = document.documentElement.getAttribute("lang");
  if (!lang || lang.trim() === "") {
    issues.push({
      id: nextId(),
      severity: "critical",
      category: "accessibility",
      title: "Missing lang attribute on <html>",
      description:
        "The <html> element has no lang attribute. Screen readers need it to choose pronunciation rules.",
      selector: "html",
      suggestedFix:
        'Add lang="en" (or the appropriate language code) to <html>.',
    });
  }
}

function scanPerformance(issues: XRayIssue[]): void {
  // --- Large images ---
  document.querySelectorAll("img").forEach((img) => {
    const htmlImg = img as HTMLImageElement;
    if (isHidden(htmlImg)) return;

    // Check natural dimensions once loaded
    const naturalW = htmlImg.naturalWidth || 0;
    const displayW = htmlImg.getBoundingClientRect().width;
    if (naturalW > 1000 && displayW > 0 && naturalW > displayW * 2) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "performance",
        title: "Oversized image",
        description:
          "Image natural width is " +
          naturalW +
          "px but displayed at ~" +
          Math.round(displayW) +
          "px. Serving a smaller file would save bandwidth.",
        element: htmlImg,
        selector: getSelector(htmlImg),
        suggestedFix:
          "Use srcset / responsive images or resize the source file to ~" +
          Math.round(displayW * 2) +
          "px wide.",
      });
    }

    // Missing width/height attributes (CLS risk)
    if (
      !htmlImg.getAttribute("width") &&
      !htmlImg.getAttribute("height") &&
      !htmlImg.style.aspectRatio
    ) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "performance",
        title: "Image missing dimensions (CLS risk)",
        description:
          describeEl(htmlImg) +
          " has no width/height attributes, which can cause layout shifts.",
        element: htmlImg,
        selector: getSelector(htmlImg),
        suggestedFix:
          "Add width and height attributes to prevent Cumulative Layout Shift.",
      });
    }
  });

  // --- Render-blocking: inline scripts with sync src ---
  document.querySelectorAll("script[src]").forEach((script) => {
    const el = script as HTMLScriptElement;
    if (el.async || el.defer) return;
    if (el.type === "module") return;
    // Only flag scripts in <head>
    if (el.parentElement?.tagName?.toLowerCase() !== "head") return;
    issues.push({
      id: nextId(),
      severity: "warning",
      category: "performance",
      title: "Render-blocking script",
      description:
        "Script in <head> without async/defer: " +
        (el.src?.slice(0, 80) || "inline"),
      element: el,
      selector: getSelector(el),
      suggestedFix:
        "Add async or defer attribute, or move the script to the end of <body>.",
    });
  });
}

function scanSEO(issues: XRayIssue[]): void {
  // --- Meta description ---
  const metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc || !metaDesc.getAttribute("content")?.trim()) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Missing meta description",
      description: 'The page has no <meta name="description"> tag.',
      selector: "head",
      suggestedFix:
        'Add <meta name="description" content="..."> with a concise page summary.',
    });
  } else if ((metaDesc.getAttribute("content")?.length || 0) > 160) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Meta description too long",
      description:
        "Meta description is " +
        (metaDesc.getAttribute("content")?.length || 0) +
        " chars (recommended max 160).",
      selector: 'meta[name="description"]',
      suggestedFix: "Shorten the meta description to 120-160 characters.",
    });
  }

  // --- Title tag ---
  const titleEl = document.querySelector("title");
  if (!titleEl || !titleEl.textContent?.trim()) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Missing <title> tag",
      description: "The page has no <title> element.",
      selector: "head",
      suggestedFix: "Add a descriptive <title> element inside <head>.",
    });
  } else if (titleEl.textContent!.length > 60) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Title tag too long",
      description:
        "Title is " +
        titleEl.textContent!.length +
        " chars (recommended max 60).",
      selector: "title",
      suggestedFix: "Shorten the <title> to 50-60 characters.",
    });
  }

  // --- Canonical URL ---
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Missing canonical URL",
      description:
        'No <link rel="canonical"> found. Search engines may index duplicate URLs.',
      selector: "head",
      suggestedFix:
        'Add <link rel="canonical" href="..."> to specify the preferred URL.',
    });
  }

  // --- Heading hierarchy (multiple h1) ---
  const h1s = document.querySelectorAll("h1");
  if (h1s.length > 1) {
    h1s.forEach((h1) => {
      issues.push({
        id: nextId(),
        severity: "info",
        category: "seo",
        title: "Multiple h1 elements",
        description:
          "Found " +
          h1s.length +
          " <h1> elements. Use only one per page for optimal SEO.",
        element: h1 as HTMLElement,
        selector: getSelector(h1),
        suggestedFix:
          "Keep one <h1> as the primary heading and downgrade others to <h2>.",
      });
    });
  }

  // --- Images without alt (SEO perspective — already flagged in a11y, so
  //     only add if no a11y issue for this image was created) ---
  // We skip this because the a11y scanner already covers it.

  // --- Viewport meta ---
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Missing viewport meta tag",
      description:
        'No <meta name="viewport"> found. Mobile friendliness affects rankings.',
      selector: "head",
      suggestedFix:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
    });
  }

  // --- Open Graph tags (informational) ---
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    issues.push({
      id: nextId(),
      severity: "info",
      category: "seo",
      title: "Missing og:title",
      description:
        "No Open Graph title found. Social sharing previews will fall back to <title>.",
      selector: "head",
      suggestedFix: 'Add <meta property="og:title" content="...">.',
    });
  }
}

function scanBestPractices(issues: XRayIssue[]): void {
  // --- Positive tabindex ---
  document.querySelectorAll("[tabindex]").forEach((el) => {
    const tabindex = parseInt(el.getAttribute("tabindex") || "0", 10);
    if (tabindex > 0) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "best-practice",
        title: "Positive tabindex (" + tabindex + ")",
        description: "Positive tabindex disrupts the natural tab order.",
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix:
          'Use tabindex="0" and reorder DOM elements to achieve the desired tab order.',
      });
    }
  });

  // --- Clickable non-interactive elements without keyboard access ---
  document.querySelectorAll("div[onclick], span[onclick]").forEach((el) => {
    if (!el.getAttribute("tabindex") && !el.getAttribute("role")) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "best-practice",
        title: "Clickable element not keyboard accessible",
        description:
          describeEl(el) + " has an onclick but no tabindex or role.",
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix:
          'Add tabindex="0" and role="button", or use a native <button>.',
      });
    }
  });

  // --- Deprecated HTML elements ---
  const deprecatedTags = [
    "font",
    "center",
    "marquee",
    "blink",
    "big",
    "strike",
    "tt",
  ];
  deprecatedTags.forEach((tag) => {
    document.querySelectorAll(tag).forEach((el) => {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "best-practice",
        title: "Deprecated element <" + tag + ">",
        description:
          "The <" + tag + "> element is deprecated and should not be used.",
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix: "Replace with modern CSS equivalents.",
      });
    });
  });

  // --- Insecure target="_blank" (missing rel="noopener") ---
  document.querySelectorAll('a[target="_blank"]').forEach((a) => {
    const rel = a.getAttribute("rel") || "";
    if (!rel.includes("noopener")) {
      issues.push({
        id: nextId(),
        severity: "warning",
        category: "best-practice",
        title: 'target="_blank" without rel="noopener"',
        description:
          describeEl(a) +
          ' opens in a new tab but lacks rel="noopener", which is a security risk.',
        element: a as HTMLAnchorElement,
        selector: getSelector(a),
        suggestedFix: 'Add rel="noopener noreferrer" to the link.',
      });
    }
  });

  // --- Empty links ---
  document.querySelectorAll('a[href=""]').forEach((a) => {
    issues.push({
      id: nextId(),
      severity: "warning",
      category: "best-practice",
      title: "Empty href on link",
      description: describeEl(a) + " has an empty href attribute.",
      element: a as HTMLAnchorElement,
      selector: getSelector(a),
      suggestedFix: "Provide a valid URL or use a <button> instead.",
    });
  });

  // --- Inline styles with !important ---
  document.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style") || "";
    if (style.includes("!important")) {
      issues.push({
        id: nextId(),
        severity: "info",
        category: "best-practice",
        title: "Inline style with !important",
        description:
          describeEl(el) +
          " uses !important in an inline style, making overrides harder.",
        element: el as HTMLElement,
        selector: getSelector(el),
        suggestedFix:
          "Move the style to a CSS class and increase specificity instead.",
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Unified scan
// ---------------------------------------------------------------------------

function runFullScan(): XRayIssue[] {
  issueCounter = 0;
  const issues: XRayIssue[] = [];
  scanAccessibility(issues);
  scanPerformance(issues);
  scanSEO(issues);
  scanBestPractices(issues);
  return issues;
}

// ---------------------------------------------------------------------------
// Overlay rendering
// ---------------------------------------------------------------------------

const OVERLAY_CLASS = "fdh-xray-outline";

function createOutlineForIssue(issue: XRayIssue): HTMLElement | null {
  const el = issue.element;
  if (!el) return null;
  if (isHidden(el)) return null;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const color = CATEGORY_COLORS[issue.category];

  const outline = document.createElement("div");
  outline.className = OVERLAY_CLASS;
  outline.dataset.issueId = issue.id;
  outline.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid ${color};
    background: ${color}18;
    pointer-events: auto;
    cursor: pointer;
    box-sizing: border-box;
    z-index: 2147483641;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  `;

  // Label badge
  const label = document.createElement("div");
  label.style.cssText = `
    position: absolute;
    top: -18px;
    left: 0;
    padding: 1px 5px;
    background: ${color};
    color: #fff;
    font-size: 10px;
    line-height: 16px;
    border-radius: 2px;
    white-space: nowrap;
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  label.textContent =
    CATEGORY_LABELS[issue.category] + ": " + issue.title.slice(0, 30);
  outline.appendChild(label);

  return outline;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function createTooltip(): HTMLDivElement {
  const tooltip = document.createElement("div");
  tooltip.className = "fdh-xray-tooltip";
  tooltip.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 10px 12px;
    max-width: 320px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    display: none;
  `;
  return tooltip;
}

function showTooltip(
  tooltip: HTMLDivElement,
  issue: XRayIssue,
  anchorRect: DOMRect,
): void {
  // Clear previous content
  while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

  const color = CATEGORY_COLORS[issue.category];

  // Header row: category badge + severity
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;gap:6px;margin-bottom:6px;";

  const catBadge = document.createElement("span");
  catBadge.style.cssText = `
    display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;
    font-size:10px;font-weight:600;background:${color}22;color:${color};
  `;
  catBadge.textContent = CATEGORY_LABELS[issue.category];
  header.appendChild(catBadge);

  const sevBadge = document.createElement("span");
  sevBadge.style.cssText = `
    display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;
    font-size:10px;font-weight:600;
    background:${SEVERITY_COLORS[issue.severity]}22;color:${SEVERITY_COLORS[issue.severity]};
  `;
  sevBadge.textContent = issue.severity.toUpperCase();
  header.appendChild(sevBadge);

  tooltip.appendChild(header);

  // Title
  const title = document.createElement("div");
  title.style.cssText =
    "font-weight:600;font-size:13px;margin-bottom:4px;color:#f1f5f9;";
  title.textContent = issue.title;
  tooltip.appendChild(title);

  // Description
  const desc = document.createElement("div");
  desc.style.cssText = "color:#94a3b8;margin-bottom:6px;line-height:1.4;";
  desc.textContent = issue.description;
  tooltip.appendChild(desc);

  // Suggested fix
  if (issue.suggestedFix) {
    const fixLabel = document.createElement("div");
    fixLabel.style.cssText =
      "font-size:10px;color:#64748b;margin-bottom:2px;font-weight:600;text-transform:uppercase;";
    fixLabel.textContent = "Suggested Fix";
    tooltip.appendChild(fixLabel);

    const fix = document.createElement("div");
    fix.style.cssText =
      "color:#4ade80;font-size:11px;line-height:1.4;background:#0c1222;padding:4px 6px;border-radius:4px;";
    fix.textContent = issue.suggestedFix;
    tooltip.appendChild(fix);
  }

  // Position
  tooltip.style.display = "block";
  tooltip.style.opacity = "1";

  // Let browser lay out so we can measure
  const ttRect = tooltip.getBoundingClientRect();
  let top = anchorRect.top - ttRect.height - 8;
  let left = anchorRect.left;

  if (top < 4) top = anchorRect.bottom + 8;
  if (left + ttRect.width > window.innerWidth - 8) {
    left = window.innerWidth - ttRect.width - 8;
  }
  if (left < 4) left = 4;

  tooltip.style.top = top + "px";
  tooltip.style.left = left + "px";
}

function hideTooltip(tooltip: HTMLDivElement): void {
  tooltip.style.opacity = "0";
  tooltip.style.display = "none";
}

// ---------------------------------------------------------------------------
// Summary panel content
// ---------------------------------------------------------------------------

function buildSummaryContent(
  issues: XRayIssue[],
  contentArea: HTMLDivElement,
  overlays: Map<string, HTMLElement>,
  _tooltip: HTMLDivElement,
): void {
  while (contentArea.firstChild)
    contentArea.removeChild(contentArea.firstChild);

  const categories: XRayIssue["category"][] = [
    "accessibility",
    "performance",
    "seo",
    "best-practice",
  ];

  // --- Summary bar ---
  const summary = document.createElement("div");
  summary.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;";

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  summary.appendChild(
    createBadge(criticalCount + " Critical", SEVERITY_COLORS.critical),
  );
  summary.appendChild(
    createBadge(warningCount + " Warning", SEVERITY_COLORS.warning),
  );
  summary.appendChild(createBadge(infoCount + " Info", SEVERITY_COLORS.info));
  summary.appendChild(createBadge(issues.length + " Total", "#94a3b8"));

  contentArea.appendChild(summary);

  // --- Per-category groups ---
  for (const cat of categories) {
    const catIssues = issues.filter((i) => i.category === cat);
    if (catIssues.length === 0) continue;

    const color = CATEGORY_COLORS[cat];

    const groupHeader = document.createElement("div");
    groupHeader.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:6px 0 4px;cursor:pointer;
      font-size:12px;font-weight:600;color:${color};
    `;
    groupHeader.textContent =
      cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");
    const countSpan = document.createElement("span");
    countSpan.style.cssText = "font-weight:400;color:#64748b;font-size:11px;";
    countSpan.textContent = "(" + catIssues.length + ")";
    groupHeader.appendChild(countSpan);

    const chevron = document.createElement("span");
    chevron.style.cssText =
      "margin-left:auto;font-size:10px;transition:transform 0.2s;";
    chevron.textContent = "▼";
    groupHeader.appendChild(chevron);

    const list = document.createElement("div");
    list.style.cssText =
      "display:flex;flex-direction:column;gap:2px;margin-bottom:8px;";

    let expanded = true;

    groupHeader.addEventListener("click", () => {
      expanded = !expanded;
      list.style.display = expanded ? "flex" : "none";
      chevron.style.transform = expanded ? "" : "rotate(-90deg)";
    });

    contentArea.appendChild(groupHeader);

    for (const issue of catIssues) {
      const item = document.createElement("div");
      item.style.cssText = `
        padding:6px 8px;border-radius:4px;background:#1e293b;cursor:pointer;
        border-left:3px solid ${SEVERITY_COLORS[issue.severity]};
        transition: background 0.15s;
      `;
      item.addEventListener("mouseenter", () => {
        item.style.background = "#334155";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "#1e293b";
      });

      const titleRow = document.createElement("div");
      titleRow.style.cssText =
        "font-size:11px;color:#f1f5f9;margin-bottom:2px;";
      titleRow.textContent = issue.title;
      item.appendChild(titleRow);

      if (
        issue.selector &&
        issue.selector !== "html" &&
        issue.selector !== "head" &&
        issue.selector !== "title"
      ) {
        const selectorRow = document.createElement("div");
        selectorRow.style.cssText =
          "font-size:10px;color:#64748b;font-family:monospace;";
        selectorRow.textContent = issue.selector;
        item.appendChild(selectorRow);
      }

      // Click to scroll & highlight
      item.addEventListener("click", () => {
        const overlay = overlays.get(issue.id);
        if (overlay) {
          // Flash the overlay
          const color = CATEGORY_COLORS[issue.category];
          overlay.style.background = color + "40";
          overlay.style.boxShadow = "0 0 0 4px " + color + "50";
          setTimeout(() => {
            overlay.style.background = color + "18";
            overlay.style.boxShadow = "none";
          }, 1200);
          // Scroll element into view
          overlay.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (issue.element) {
          issue.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      list.appendChild(item);
    }

    contentArea.appendChild(list);
  }

  if (issues.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "padding:32px 16px;text-align:center;color:#4ade80;font-size:14px;";
    empty.textContent = "No issues found! The page looks clean.";
    contentArea.appendChild(empty);
  }
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const xRayMode: ToolDefinition = {
  id: "x-ray-mode",
  name: "X-Ray Mode",
  description:
    "Instant visual overlay of all issues: accessibility, performance, SEO, and best practices",
  category: "inspection",
  icon: "scan-eye",
  configSchema: {
    checkAccessibility: {
      type: "boolean",
      label: "Accessibility",
      default: true,
    },
    checkPerformance: { type: "boolean", label: "Performance", default: true },
    checkSEO: { type: "boolean", label: "SEO", default: true },
    checkBestPractices: {
      type: "boolean",
      label: "Best Practices",
      default: true,
    },
  },

  run(ctx, config) {
    const checkAccessibility = (config?.checkAccessibility ?? true) as boolean;
    const checkPerformance = (config?.checkPerformance ?? true) as boolean;
    const checkSEO = (config?.checkSEO ?? true) as boolean;
    const checkBestPractices = (config?.checkBestPractices ?? true) as boolean;

    // Run full scan, then filter by user config
    const allIssues = runFullScan();
    const issues = allIssues.filter((i) => {
      if (i.category === "accessibility" && !checkAccessibility) return false;
      if (i.category === "performance" && !checkPerformance) return false;
      if (i.category === "seo" && !checkSEO) return false;
      if (i.category === "best-practice" && !checkBestPractices) return false;
      return true;
    });

    const { shadow } = getOverlayContainer();

    // --- Overlays ---
    const overlays = new Map<string, HTMLElement>(); // issueId -> outline element
    const overlayElements: HTMLElement[] = [];

    for (const issue of issues) {
      if (!issue.element) continue;
      const outline = createOutlineForIssue(issue);
      if (!outline) continue;
      overlays.set(issue.id, outline);
      overlayElements.push(outline);
      addOverlayElement(outline);

      // Hover interaction on overlay
      outline.addEventListener("mouseenter", () => {
        const color = CATEGORY_COLORS[issue.category];
        outline.style.background = color + "30";
        outline.style.boxShadow = "0 0 0 3px " + color + "40";
        const outlineRect = outline.getBoundingClientRect();
        showTooltip(tooltip, issue, outlineRect);
      });
      outline.addEventListener("mouseleave", () => {
        const color = CATEGORY_COLORS[issue.category];
        outline.style.background = color + "18";
        outline.style.boxShadow = "none";
        hideTooltip(tooltip);
      });
      outline.addEventListener("click", () => {
        if (issue.element) {
          issue.element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    // --- Tooltip ---
    const tooltip = createTooltip();
    addOverlayElement(tooltip);

    // --- Panel ---
    let disposed = false;

    const panel = new ToolPanel({
      title: "X-Ray Mode",
      onClose: () => cleanup(),
    });

    panel.mount(shadow);
    buildSummaryContent(issues, panel.getContainer(), overlays, tooltip);

    // --- Reposition overlays on scroll / resize ---
    let rafId = 0;
    const reposition = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const issue of issues) {
          const outline = overlays.get(issue.id);
          if (!outline || !issue.element) continue;
          const rect = issue.element.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            outline.style.display = "none";
            continue;
          }
          outline.style.display = "";
          outline.style.top = rect.top + "px";
          outline.style.left = rect.left + "px";
          outline.style.width = rect.width + "px";
          outline.style.height = rect.height + "px";
        }
      });
    };

    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition, { passive: true });

    const observer = new MutationObserver(reposition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // --- Cleanup ---
    function cleanup() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
      for (const el of overlayElements) removeOverlayElement(el);
      overlayElements.length = 0;
      overlays.clear();
      removeOverlayElement(tooltip);
      panel.destroy();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
