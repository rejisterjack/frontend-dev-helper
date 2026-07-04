import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";
import { resolveElementSource } from "@/lib/element-source-resolver";

interface AuditIssue {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  element?: string;
  selector?: string;
  fixAvailable?: boolean;
  sourceFile?: string;
  sourceLine?: number;
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

// ---------------------------------------------------------------------------
// axe-core integration
// ---------------------------------------------------------------------------

type WcagLevel = "a" | "aa" | "aaa";

function wcagTagsForLevel(level: WcagLevel): string[] {
  switch (level) {
    case "a":
      return ["wcag2a", "wcag21a"];
    case "aaa":
      return [
        "wcag2a",
        "wcag2aa",
        "wcag2aaa",
        "wcag21a",
        "wcag21aa",
        "wcag21aaa",
        "best-practice",
      ];
    case "aa":
    default:
      return ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
  }
}

async function runAxeAudit(
  config: Record<string, unknown>,
  onAxeReady?: (cleanup: () => void) => void,
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const level = (config.level as WcagLevel) ?? "aa";
  const resultTypes = (config.resultTypes as string) ?? "violations";
  const showIncomplete = resultTypes !== "violations";
  const showPasses = resultTypes === "all";

  try {
    const axe = await import("axe-core");
    onAxeReady?.(() => {
      try {
        axe.default.cleanup();
      } catch {
        // Ignore cleanup errors during teardown.
      }
    });
    // Always ask axe for every result bucket — the resultTypes toggle
    // controls what we surface to the user, not what axe computes. Asking for
    // `['violations', 'incomplete', 'passes']` upfront avoids a re-run when
    // the user flips the toggle in the UI.
    const resultTypesQuery = showPasses
      ? ["violations", "incomplete", "passes"]
      : showIncomplete
        ? ["violations", "incomplete"]
        : ["violations"];
    const results = await axe.default.run(document, {
      runOnly: {
        type: "tag",
        values: wcagTagsForLevel(level),
      },
      resultTypes: resultTypesQuery as unknown as string[],
    });

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const selector = node.target.join(" > ");
        issues.push({
          severity:
            violation.impact === "critical" || violation.impact === "serious"
              ? "error"
              : "warning",
          rule: violation.id,
          message: violation.description,
          element: node.html?.slice(0, 60) || selector,
          selector,
          fixAvailable: node.failureSummary !== undefined,
        });
      }
    }

    if (showIncomplete) {
      for (const incomplete of results.incomplete) {
        for (const node of incomplete.nodes) {
          const selector = node.target.join(" > ");
          issues.push({
            severity: "info",
            rule: incomplete.id,
            message: "Needs review: " + incomplete.description,
            element: node.html?.slice(0, 60) || selector,
            selector,
          });
        }
      }
    }

    if (showPasses) {
      for (const pass of results.passes) {
        for (const node of pass.nodes) {
          const selector = node.target.join(" > ");
          issues.push({
            severity: "info",
            rule: pass.id,
            message: "Passing: " + pass.description,
            element: node.html?.slice(0, 60) || selector,
            selector,
          });
        }
      }
    }
  } catch (err) {
    console.warn(
      "[FDH A11y] axe-core failed, falling back to custom checks:",
      err,
    );
    return runCustomAudit(config);
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Custom fallback checks (used if axe-core fails)
// ---------------------------------------------------------------------------

function checkImages(issues: AuditIssue[]): void {
  document.querySelectorAll("img").forEach((img) => {
    // alt="" is valid for decorative images; only flag when alt is absent.
    if (img.hasAttribute("alt")) return;
    if (
      img.getAttribute("role") === "presentation" ||
      img.getAttribute("aria-hidden") === "true"
    )
      return;
    issues.push({
      severity: "error",
      rule: "image-alt",
      message: "Image missing alt text",
      element: describeEl(img),
      selector: getSelector(img),
    });
  });
}

function checkHeadings(issues: AuditIssue[]): void {
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let lastLevel = 0;
  let h1Count = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    if (level === 1) h1Count++;
    if (level > lastLevel + 1 && lastLevel > 0) {
      issues.push({
        severity: "warning",
        rule: "heading-order",
        message: "Heading level skipped: h" + lastLevel + " to h" + level,
        element: describeEl(h),
        selector: getSelector(h),
      });
    }
    lastLevel = level;
  });
  if (h1Count === 0)
    issues.push({
      severity: "warning",
      rule: "page-has-heading-one",
      message: "No h1 heading found on the page",
    });
}

function checkForms(issues: AuditIssue[]): void {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    const el = input as HTMLInputElement;
    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "reset"
    )
      return;
    let hasLabel = false;
    if (el.id) {
      if (document.querySelector('label[for="' + el.id + '"]')) hasLabel = true;
    }
    if (el.closest("label")) hasLabel = true;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
      hasLabel = true;
    if (!hasLabel) {
      issues.push({
        severity: "error",
        rule: "label",
        message:
          "Form element missing associated label (type: " + el.type + ")",
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });
}

function checkLinks(issues: AuditIssue[]): void {
  document.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("aria-hidden") === "true") return;
    const text = a.textContent?.trim() || "";
    const ariaLabel = a.getAttribute("aria-label")?.trim() || "";
    if (
      !text &&
      !ariaLabel &&
      !a.getAttribute("title")?.trim() &&
      !a.querySelector("img")?.alt?.trim()
    ) {
      issues.push({
        severity: "error",
        rule: "link-name",
        message: "Link has no accessible text",
        element: describeEl(a),
        selector: getSelector(a),
      });
    }
  });
}

function checkAria(issues: AuditIssue[]): void {
  const validRoles = new Set([
    "alert",
    "alertdialog",
    "button",
    "checkbox",
    "dialog",
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
    "menu",
    "menubar",
    "menuitem",
    "navigation",
    "none",
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
    "slider",
    "spinbutton",
    "status",
    "switch",
    "tab",
    "table",
    "tablist",
    "tabpanel",
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
        severity: "error",
        rule: "aria-roles",
        message: 'Invalid ARIA role: "' + role + '"',
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });
  document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
    if (el.querySelector("a, button, input, select, textarea, [tabindex]")) {
      issues.push({
        severity: "error",
        rule: "aria-hidden-focus",
        message: 'Focusable element inside aria-hidden="true"',
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColour(css: string): Rgba | null {
  if (!css || css === "transparent") return null;
  const m = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!m) return null;
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    a: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

function blendColours(over: Rgba, under: Rgba): Rgba {
  const alpha = over.a + under.a * (1 - over.a);
  if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 1 };
  return {
    r: Math.round((over.r * over.a + under.r * under.a * (1 - over.a)) / alpha),
    g: Math.round((over.g * over.a + under.g * under.a * (1 - over.a)) / alpha),
    b: Math.round((over.b * over.a + under.b * under.a * (1 - over.a)) / alpha),
    a: alpha,
  };
}

function getBackgroundColour(el: HTMLElement): Rgba {
  let composite: Rgba = { r: 255, g: 255, b: 255, a: 1 };
  let current: HTMLElement | null = el;
  while (current) {
    const parsed = parseColour(
      window.getComputedStyle(current).backgroundColor,
    );
    if (parsed && parsed.a > 0) {
      composite = blendColours(parsed, composite);
      if (composite.a >= 0.99) break;
    }
    current = current.parentElement;
  }
  return composite;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const vals = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
}

function checkColorContrast(issues: AuditIssue[]): void {
  const textElements = document.querySelectorAll(
    "p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button, small, strong, em, div",
  );
  const seen = new Set<string>();
  let checked = 0;
  textElements.forEach((el) => {
    if (checked >= 50) return;
    const key = getSelector(el);
    if (seen.has(key)) return;
    seen.add(key);
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight, 10);
    const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
    if (style.display === "none" || style.visibility === "hidden") return;
    const bgColor = getBackgroundColour(el as HTMLElement);
    const fgParsed = parseColour(style.color);
    if (!fgParsed) return;
    const fgColor: Rgba =
      fgParsed.a < 1 ? blendColours(fgParsed, bgColor) : fgParsed;
    const fgRgb: [number, number, number] = [fgColor.r, fgColor.g, fgColor.b];
    const bgRgb: [number, number, number] = [bgColor.r, bgColor.g, bgColor.b];
    const ratio =
      (Math.max(relativeLuminance(fgRgb), relativeLuminance(bgRgb)) + 0.05) /
      (Math.min(relativeLuminance(fgRgb), relativeLuminance(bgRgb)) + 0.05);
    const requiredRatio = isLarge ? 3.0 : 4.5;
    if (ratio < requiredRatio) {
      issues.push({
        severity: ratio < 3 ? "error" : "warning",
        rule: "color-contrast",
        message:
          "Low contrast ratio: " +
          ratio.toFixed(1) +
          ":1 (required: " +
          requiredRatio +
          ":1)",
        element: describeEl(el),
        selector: getSelector(el),
      });
      checked++;
    }
  });
}

function runCustomAudit(config: Record<string, unknown>): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (config.checkImages !== false) checkImages(issues);
  if (config.checkHeadings !== false) checkHeadings(issues);
  if (config.checkForms !== false) checkForms(issues);
  if (config.checkLinks !== false) checkLinks(issues);
  if (config.checkAria !== false) checkAria(issues);
  if (config.checkColor !== false) checkColorContrast(issues);
  return issues;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function makeBoldSpan(text: string, color: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.style.cssText = `color:${color};font-weight:700;`;
  s.textContent = text;
  return s;
}

function renderIssues(issues: AuditIssue[]): HTMLElement {
  const list = document.createElement("div");
  list.style.cssText = "flex:1;overflow-y:auto;";

  const severityColor: Record<string, string> = {
    error: "#f38ba8",
    warning: "#fab387",
    info: "#89b4fa",
  };
  const severityLabel: Record<string, string> = {
    error: "ERROR",
    warning: "WARN",
    info: "INFO",
  };

  for (const issue of issues) {
    const item = document.createElement("div");
    item.style.cssText =
      "padding:10px 16px;border-bottom:1px solid #313244;cursor:pointer;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:flex-start;";

    const badge = makeBoldSpan(
      severityLabel[issue.severity],
      severityColor[issue.severity],
    );
    badge.style.cssText += "font-size:11px;min-width:40px;margin-top:1px;";
    row.appendChild(badge);

    const content = document.createElement("div");
    content.style.cssText = "flex:1;";

    const ruleEl = document.createElement("div");
    ruleEl.style.cssText = "color:#a6e3a1;font-size:11px;margin-bottom:2px;";
    ruleEl.textContent = issue.rule;
    content.appendChild(ruleEl);

    const msgEl = document.createElement("div");
    msgEl.style.cssText = "color:#cdd6f4;";
    msgEl.textContent = issue.message;
    content.appendChild(msgEl);

    if (issue.element) {
      const elInfo = document.createElement("div");
      elInfo.style.cssText = "color:#9399b2;font-size:11px;margin-top:2px;";
      elInfo.textContent = issue.element;
      content.appendChild(elInfo);
    }

    row.appendChild(content);

    // "Fix in VS Code" button
    if (issue.selector) {
      const fixBtn = document.createElement("button");
      fixBtn.textContent = "Fix";
      fixBtn.style.cssText =
        "background:#6366f1;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;flex-shrink:0;align-self:center;";
      fixBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = document.querySelector(issue.selector!);
        if (target instanceof HTMLElement) {
          jumpToElementSourceSafe(target);
        }
      });
      row.appendChild(fixBtn);
    }

    item.appendChild(row);

    // Scroll to element on hover and draw a colored outline + role tag.
    // Outlining the matched element makes it obvious which node a violation
    // refers to — DevTools parity. The role tag floats above the outline so
    // the user can see e.g. "role=button" without opening the inspector.
    if (issue.selector) {
      const outlineColor = severityColor[issue.severity];
      item.addEventListener("mouseenter", () => {
        const target = document.querySelector(issue.selector!);
        if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.style.outline = `2px solid ${outlineColor}`;
          target.style.outlineOffset = "1px";
          // Role tag (only if the element has an explicit role or landmark tag).
          const role = target.getAttribute("role");
          const landmark = [
            "main",
            "header",
            "footer",
            "nav",
            "aside",
            "section",
            "article",
            "form",
            "search",
          ].includes(target.tagName.toLowerCase());
          if (role || landmark) {
            const tag = document.createElement("div");
            tag.setAttribute("data-fdh-a11y-tag", "true");
            tag.style.cssText = `position:fixed;z-index:2147483646;background:${outlineColor};color:#1e1e2e;font-size:10px;font-weight:600;font-family:system-ui,sans-serif;padding:1px 6px;border-radius:3px;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.3);`;
            const r = target.getBoundingClientRect();
            tag.style.top = `${Math.max(0, r.top - 16)}px`;
            tag.style.left = `${r.left}px`;
            tag.textContent = role
              ? `role=${role}`
              : target.tagName.toLowerCase();
            document.documentElement.appendChild(tag);
          }
        }
      });
      item.addEventListener("mouseleave", () => {
        const target = document.querySelector(issue.selector!);
        if (target instanceof HTMLElement) {
          target.style.outline = "";
          target.style.outlineOffset = "";
        }
        document
          .querySelectorAll('[data-fdh-a11y-tag="true"]')
          .forEach((t) => t.remove());
      });
    }

    list.appendChild(item);
  }

  if (issues.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:32px 16px;text-align:center;color:#a6e3a1;";
    empty.textContent = "No accessibility issues found!";
    list.appendChild(empty);
  }

  return list;
}

async function jumpToElementSourceSafe(el: HTMLElement): Promise<void> {
  try {
    const source = await resolveElementSource(el);
    if (!source) return;
    const bridge = getBridge();
    if (!bridge.connected) return;
    bridge.jumpToSource(source.file, source.line, source.column);
  } catch {
    // Silently fail
  }
}

function sendDiagnosticsToVSCode(issues: AuditIssue[]): Promise<void> {
  const bridge = getBridge();
  if (!bridge.connected) return Promise.resolve();

  const diagnostics: Array<{
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning" | "info";
    message: string;
    rule: string;
  }> = [];

  const flush = (): void => {
    if (diagnostics.length === 0) return;
    bridge.send({
      type: "PublishDiagnostics",
      payload: { diagnostics: [...diagnostics] },
    });
    diagnostics.length = 0;
  };

  const pending: Promise<void>[] = [];

  for (const issue of issues.slice(0, 100)) {
    if (!issue.selector) continue;
    const el = document.querySelector(issue.selector);
    if (!el) continue;

    pending.push(
      resolveElementSource(el as HTMLElement)
        .then((source) => {
          if (!source) return;
          diagnostics.push({
            file: source.file,
            line: source.line,
            column: source.column,
            severity: issue.severity,
            message: `[A11y] ${issue.message}`,
            rule: issue.rule,
          });

          if (diagnostics.length >= 20) {
            flush();
          }
        })
        .catch(() => {}),
    );
  }

  return Promise.all(pending).then(() => {
    flush();
  });
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const accessibilityAudit: ToolDefinition = {
  id: "accessibility-audit",
  name: "Accessibility Audit",
  description:
    "Run comprehensive accessibility audit against WCAG guidelines (powered by axe-core)",
  category: "accessibility",
  icon: "ShieldCheck",
  configSchema: {
    level: {
      type: "select",
      label: "WCAG Level",
      default: "aa",
      options: [
        { label: "Level A", value: "a" },
        { label: "Level AA", value: "aa" },
        { label: "Level AAA", value: "aaa" },
      ],
    },
    resultTypes: {
      type: "select",
      label: "Show Result Types",
      default: "violations",
      options: [
        { label: "Violations only", value: "violations" },
        { label: "Violations + Incomplete", value: "violations-incomplete" },
        { label: "All (incl. Passes)", value: "all" },
      ],
    },
  },

  run: (ctx, config) => {
    const auditConfig = config ?? {};
    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:420px;max-height:80vh;overflow-y:auto;" +
      "z-index:2147483647;pointer-events:auto;background:#1e1e2e;color:#cdd6f4;" +
      "font-family:system-ui,-apple-system,sans-serif;font-size:13px;border-radius:12px;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #45475a;display:flex;flex-direction:column;";

    // Header with loading state
    const header = document.createElement("div");
    header.style.cssText =
      "padding:12px 16px;border-bottom:1px solid #45475a;display:flex;justify-content:space-between;align-items:center;";

    const headerLeft = document.createElement("div");
    headerLeft.style.cssText = "display:flex;align-items:center;gap:8px;";
    const title = document.createElement("span");
    title.style.cssText = "font-weight:600;font-size:15px;";
    title.textContent = "Accessibility Audit";
    const countBadge = document.createElement("span");
    countBadge.style.cssText = "font-size:11px;color:#a6adc8;";
    countBadge.textContent = "Running axe-core...";
    headerLeft.appendChild(title);
    headerLeft.appendChild(countBadge);
    header.appendChild(headerLeft);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;";

    const vscodeBtn = document.createElement("button");
    vscodeBtn.textContent = "Send to VS Code";
    vscodeBtn.style.cssText =
      "background:#6366f1;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;display:none;";
    btnRow.appendChild(vscodeBtn);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.cssText =
      "background:#45475a;color:#cdd6f4;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;";
    btnRow.appendChild(closeButton);

    header.appendChild(btnRow);
    panel.appendChild(header);

    // Loading indicator
    const loading = document.createElement("div");
    loading.style.cssText =
      "padding:32px 16px;text-align:center;color:#6c7086;";
    loading.textContent = "Running axe-core audit...";
    panel.appendChild(loading);

    addOverlayElement(panel);

    // Run the audit
    let currentIssues: AuditIssue[] = [];
    let cancelAxe: (() => void) | undefined;

    runAxeAudit(auditConfig, (cleanupAxe) => {
      cancelAxe = cleanupAxe;
    })
      .then((issues) => {
        currentIssues = issues;
        // Remove loading
        if (loading.parentNode) loading.parentNode.removeChild(loading);

        // Summary bar
        const summary = document.createElement("div");
        summary.style.cssText =
          "padding:10px 16px;border-bottom:1px solid #313244;display:flex;gap:16px;";
        const errors = issues.filter((i) => i.severity === "error").length;
        const warnings = issues.filter((i) => i.severity === "warning").length;
        const infos = issues.filter((i) => i.severity === "info").length;
        summary.appendChild(makeBoldSpan(errors + " Errors", "#f38ba8"));
        summary.appendChild(makeBoldSpan(warnings + " Warnings", "#fab387"));
        summary.appendChild(makeBoldSpan(infos + " Info", "#89b4fa"));
        panel.appendChild(summary);

        countBadge.textContent = issues.length + " issues";
        panel.appendChild(renderIssues(issues));

        vscodeBtn.style.display = "inline-block";

        if (getBridge().connected) {
          sendDiagnosticsToVSCode(issues).catch(() => {});
        }
      })
      .catch(() => {
        if (loading.parentNode) loading.parentNode.removeChild(loading);
        const errDiv = document.createElement("div");
        errDiv.style.cssText =
          "padding:32px 16px;text-align:center;color:#f38ba8;";
        errDiv.textContent = "Audit failed to run";
        panel.appendChild(errDiv);
      });

    // Send to VS Code button
    vscodeBtn.addEventListener("click", () => {
      sendDiagnosticsToVSCode(currentIssues).catch(() => {});
      vscodeBtn.textContent = "Sent!";
      setTimeout(() => {
        vscodeBtn.textContent = "Send to VS Code";
      }, 2000);
    });

    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      cancelAxe?.();
      cancelAxe = undefined;
      removeOverlayElement(panel);
    };

    closeButton.addEventListener("click", cleanup);
    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
