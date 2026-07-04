import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { computeDiff, applyFix, type DiffLine } from "@/lib/diff-utils";
import { resolveElementSource } from "@/lib/element-source-resolver";
import { getBridge } from "@/lib/vscode-bridge";
import type {
  ApplySourceFixPayload,
  PreviewFixPayload,
  SourceFixRange,
} from "@repo/bridge-protocol/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScannedIssue {
  id: string;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  element?: string;
  selector?: string;
}

interface StyleChangeEntry {
  selector: string;
  property: string;
  oldValue: string;
  newValue: string;
}

interface AIFix {
  html?: string;
  css?: string;
  styleChanges?: Record<string, string>;
  description: string;
  styleChangeEntries?: StyleChangeEntry[];
}

interface StyleSnapshot {
  selector: string;
  element: HTMLElement;
  cssText: string;
}

interface AppliedFixRecord {
  issueId: string;
  selector: string;
  originalHTML: string;
  styleSnapshots: StyleSnapshot[];
  fix: AIFix;
}

const AI_AUTO_FIX_FENCE_RE = /```(\w+)?\n([\s\S]*?)```/g;

// ---------------------------------------------------------------------------
// Page scan helpers (lightweight a11y + best-practices)
// ---------------------------------------------------------------------------

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

function scanPage(): ScannedIssue[] {
  const issues: ScannedIssue[] = [];
  let counter = 0;
  const nextId = () => "issue-" + ++counter;

  // Images without alt
  document.querySelectorAll("img").forEach((img) => {
    if (
      img.getAttribute("role") === "presentation" ||
      img.getAttribute("aria-hidden") === "true"
    )
      return;
    if (!img.alt || img.alt.trim() === "") {
      issues.push({
        id: nextId(),
        severity: "error",
        rule: "WCAG 1.1.1",
        message: "Image missing alt text",
        element: describeEl(img),
        selector: getSelector(img),
      });
    }
  });

  // Heading hierarchy
  const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
  let lastLevel = 0;
  let h1Count = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    if (level === 1) h1Count++;
    if (level > lastLevel + 1 && lastLevel > 0) {
      issues.push({
        id: nextId(),
        severity: "warning",
        rule: "WCAG 1.3.1",
        message: "Heading level skipped: h" + lastLevel + " to h" + level,
        element: describeEl(h),
        selector: getSelector(h),
      });
    }
    lastLevel = level;
  });
  if (h1Count === 0) {
    issues.push({
      id: nextId(),
      severity: "warning",
      rule: "WCAG 1.3.1",
      message: "No h1 heading found on the page",
    });
  }

  // Form labels
  document.querySelectorAll("input,select,textarea").forEach((input) => {
    const el = input as HTMLInputElement;
    if (["hidden", "submit", "button", "reset"].includes(el.type)) return;
    const id = el.id;
    let hasLabel = false;
    if (id && document.querySelector('label[for="' + id + '"]'))
      hasLabel = true;
    if (el.closest("label")) hasLabel = true;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))
      hasLabel = true;
    if (!hasLabel) {
      issues.push({
        id: nextId(),
        severity: "error",
        rule: "WCAG 1.3.1",
        message: "Form element missing label (type: " + el.type + ")",
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });

  // Links without text
  document.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("aria-hidden") === "true") return;
    const text =
      (a.textContent?.trim() || "") +
      (a.getAttribute("aria-label")?.trim() || "") +
      (a.getAttribute("title")?.trim() || "") +
      (a.querySelector("img")?.alt?.trim() || "");
    if (!text) {
      issues.push({
        id: nextId(),
        severity: "error",
        rule: "WCAG 2.4.4",
        message: "Link has no accessible text",
        element: describeEl(a),
        selector: getSelector(a),
      });
    }
  });

  // Positive tabindex
  document.querySelectorAll("[tabindex]").forEach((el) => {
    const val = parseInt(el.getAttribute("tabindex") || "0", 10);
    if (val > 0) {
      issues.push({
        id: nextId(),
        severity: "warning",
        rule: "WCAG 2.4.3",
        message: "Positive tabindex (" + val + ") disrupts tab order",
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });

  // Clickable non-keyboard-accessible divs/spans
  document.querySelectorAll("div[onclick],span[onclick]").forEach((el) => {
    if (!el.getAttribute("tabindex") && !el.getAttribute("role")) {
      issues.push({
        id: nextId(),
        severity: "warning",
        rule: "WCAG 2.1.1",
        message: "Clickable element not keyboard accessible",
        element: describeEl(el),
        selector: getSelector(el),
      });
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// AI fix generation
// ---------------------------------------------------------------------------

async function generateAIFix(
  issue: ScannedIssue,
  signal?: AbortSignal,
): Promise<AIFix | null> {
  // Try to get the element's current HTML for context
  let currentHTML = "";
  if (issue.selector) {
    try {
      const el = document.querySelector(issue.selector);
      if (el) currentHTML = el.outerHTML;
    } catch {
      /* ignore */
    }
  }

  const prompt = `You are a web accessibility and best-practices expert. Given the following issue, provide a JSON fix.

ISSUE:
- Rule: ${issue.rule}
- Severity: ${issue.severity}
- Message: ${issue.message}
${issue.selector ? "- Selector: " + issue.selector : ""}
${currentHTML ? "- Current HTML:\n" + currentHTML : ""}

Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{
  "html": "the fixed outerHTML for the element (leave empty string if only style changes are needed)",
  "css": "any CSS to inject via a <style> tag (optional)",
  "styleChanges": { "cssProperty": "value" },
  "description": "short human-readable description of what was changed and why"
}

If the issue cannot be fixed by modifying HTML/CSS alone, set all fields to empty and explain in description.
Only fix the specific issue. Do not alter unrelated attributes or content.`;

  try {
    if (signal?.aborted) return null;
    const response = await browser.runtime.sendMessage({
      type: "AI_AUTO_FIX",
      data: { prompt },
    });

    if (signal?.aborted) return null;
    if (!response?.fix) return null;

    let fix: AIFix | null = null;
    if (typeof response.fix === "string") {
      const cleaned = stripCodeFences(response.fix);
      fix = cleaned ? parseJsonObjectResponse<AIFix>(cleaned) : null;
      if (!fix) return null;
    } else {
      fix = response.fix as AIFix;
    }

    if (!fix.description) fix.description = "Applied fix for " + issue.rule;
    return fix;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function sevColor(sev: string): string {
  if (sev === "error") return "#f87171";
  if (sev === "warning") return "#fbbf24";
  return "#60a5fa";
}

function sevBg(sev: string): string {
  if (sev === "error") return "#f8717120";
  if (sev === "warning") return "#fbbf2420";
  return "#60a5fa20";
}

function makeEl(tag: string, styles: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = styles;
  if (text !== undefined) e.textContent = text;
  return e;
}

function clearContainer(container: HTMLElement): void {
  while (container.firstChild) container.removeChild(container.firstChild);
}

export function stripCodeFences(raw: string): string {
  // Use non-greedy fence stripping to avoid swallowing across multiple blocks.
  AI_AUTO_FIX_FENCE_RE.lastIndex = 0;
  const stripped = raw
    .replace(AI_AUTO_FIX_FENCE_RE, (_m, _lang, body) => body as string)
    .trim();
  return stripped;
}

export function parseJsonObjectResponse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseJsonArrayResponse<T>(raw: string): T[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function snapshotStyle(
  target: HTMLElement,
  selector: string,
  fix: AIFix,
): StyleSnapshot[] {
  const snapshots: StyleSnapshot[] = [
    { selector, element: target, cssText: target.style.cssText },
  ];
  const props = fix.styleChanges ? Object.keys(fix.styleChanges) : [];
  if (props.length === 0) return snapshots;
  return snapshots;
}

function computeStyleDiff(
  snapshots: StyleSnapshot[],
  currentTarget: HTMLElement,
  selector: string,
  fix: AIFix,
): StyleChangeEntry[] {
  const entries: StyleChangeEntry[] = [];
  if (!fix.styleChanges) return entries;
  const originalCssText = snapshots[0]?.cssText ?? "";
  const originalMap = parseInlineStyles(originalCssText);
  const currentMap = parseInlineStyles(currentTarget.style.cssText);
  for (const [prop, newValue] of Object.entries(fix.styleChanges)) {
    const oldValue = originalMap[prop] ?? "";
    const applied = currentMap[prop] ?? "";
    if (oldValue === applied && applied === newValue) {
      entries.push({ selector, property: prop, oldValue, newValue });
    } else {
      entries.push({ selector, property: prop, oldValue, newValue });
    }
  }
  return entries;
}

function parseInlineStyles(cssText: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cssText) return out;
  for (const decl of cssText.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop) out[prop] = value;
  }
  return out;
}

function computeLineColumn(
  source: string,
  needle: string,
): SourceFixRange | null {
  if (!needle || !source.includes(needle)) return null;
  const before = source.slice(0, source.indexOf(needle));
  const lines = before.split("\n");
  const sl = lines.length;
  const sc = (lines[lines.length - 1]?.length ?? 0) + 1;
  const needleLines = needle.split("\n");
  const el = sl + needleLines.length - 1;
  const lastLine = needleLines[needleLines.length - 1] ?? "";
  const ec =
    needleLines.length === 1 ? sc + lastLine.length : lastLine.length + 1;
  return { sl, sc, el, ec };
}

async function fetchFileContent(file: string): Promise<string | null> {
  try {
    const bridge = getBridge();
    if (!bridge.connected) return null;
    const resp = await browser.runtime.sendMessage({
      type: "READ_SOURCE_FILE",
      data: { file },
    });
    if (resp && typeof resp.content === "string") return resp.content;
    return null;
  } catch {
    return null;
  }
}

function buildFixedPreview(el: HTMLElement, fix: AIFix): string {
  if (fix.styleChanges && Object.keys(fix.styleChanges).length > 0) {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const [prop, value] of Object.entries(fix.styleChanges)) {
      (clone.style as unknown as Record<string, string>)[prop] = value;
    }
    return clone.outerHTML;
  }
  return el.outerHTML;
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const aiAutoFix: ToolDefinition = {
  id: "ai-auto-fix",
  name: "AI Auto-Fix",
  description: "AI-powered automatic fix suggestions with diff preview",
  category: "ai",
  icon: "wand-2",
  configSchema: {
    minSeverity: {
      type: "select",
      label: "Apply fixes for severity",
      default: "error",
      options: [
        { label: "Errors only", value: "error" },
        { label: "Errors + warnings", value: "warning" },
        { label: "All", value: "info" },
      ],
    },
  },

  run(ctx, config) {
    const cfg = config ?? {};
    const minSeverityRaw = (cfg.minSeverity ?? "error") as
      | "error"
      | "warning"
      | "info";
    const severityRank: Record<string, number> = {
      error: 3,
      warning: 2,
      info: 1,
    };
    const minRank = severityRank[minSeverityRaw] ?? severityRank.error;
    const passesFilter = (sev: string) => (severityRank[sev] ?? 0) >= minRank;

    const overlayHost = document.createElement("div");
    overlayHost.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483640;";
    document.documentElement.appendChild(overlayHost);

    const panel = makeEl(
      "div",
      "position:fixed;top:16px;right:16px;width:440px;max-height:80vh;z-index:2147483647;" +
        "background:#0f172a;border:1px solid #1e293b;border-radius:12px;" +
        "box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);" +
        "font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#e2e8f0;" +
        "display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;",
    );

    // -- Header --
    const header = makeEl(
      "div",
      "display:flex;align-items:center;justify-content:space-between;" +
        "padding:10px 12px;background:#1e293b;border-bottom:1px solid #334155;",
    );
    const titleSpan = makeEl(
      "span",
      "font-weight:600;font-size:13px;color:#f1f5f9;",
      "AI Auto-Fix",
    );
    header.appendChild(titleSpan);

    const headerRight = makeEl(
      "div",
      "display:flex;align-items:center;gap:8px;",
    );
    const rescanBtn = makeEl(
      "button",
      "background:none;border:1px solid #334155;color:#94a3b8;font-size:11px;" +
        "padding:2px 8px;border-radius:4px;cursor:pointer;font-family:inherit;",
      "Rescan",
    );
    headerRight.appendChild(rescanBtn);

    const closeBtn = makeEl(
      "button",
      "background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;" +
        "padding:0 4px;line-height:1;border-radius:4px;",
      "×",
    );
    headerRight.appendChild(closeBtn);
    header.appendChild(headerRight);
    panel.appendChild(header);

    // -- Content --
    const contentArea = makeEl(
      "div",
      "flex:1;overflow-y:auto;padding:12px;min-height:0;",
    );
    panel.appendChild(contentArea);

    // -- Footer --
    const footer = makeEl(
      "div",
      "padding:8px 12px;border-top:1px solid #1e293b;background:#0c1222;font-size:11px;color:#64748b;" +
        "display:flex;justify-content:space-between;align-items:center;",
    );
    const footerLeft = makeEl("span", "", "Ready");
    footer.appendChild(footerLeft);
    panel.appendChild(footer);

    addOverlayElement(panel);
    panel.style.pointerEvents = "auto";

    // -- State --
    let issues: ScannedIssue[] = [];
    const appliedFixes: AppliedFixRecord[] = [];
    let disposed = false;
    let abortController: AbortController | null = null;

    // ---- Rendering ----

    function renderLoading(message: string) {
      clearContainer(contentArea);
      const spinner = makeEl(
        "div",
        "display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;color:#94a3b8;",
      );
      const dot = makeEl(
        "div",
        "width:14px;height:14px;border:2px solid #334155;border-top-color:#a78bfa;border-radius:50%;" +
          "animation:fdh-autofix-spin 0.6s linear infinite;",
      );
      const label = makeEl("span", "", message);
      spinner.append(dot, label);
      contentArea.appendChild(spinner);

      // Inject keyframe once
      if (!document.getElementById("fdh-autofix-style")) {
        const style = document.createElement("style");
        style.id = "fdh-autofix-style";
        style.textContent =
          "@keyframes fdh-autofix-spin{to{transform:rotate(360deg)}}";
        document.head.appendChild(style);
      }
    }

    function renderIssueList() {
      clearContainer(contentArea);
      if (issues.length === 0) {
        const empty = makeEl(
          "div",
          "text-align:center;padding:32px 12px;color:#a78bfa;",
          "No issues found on this page!",
        );
        contentArea.appendChild(empty);
        footerLeft.textContent = "All clear";
        return;
      }

      const summary = makeEl(
        "div",
        "display:flex;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #1e293b;",
      );
      const errs = issues.filter((i) => i.severity === "error").length;
      const warns = issues.filter((i) => i.severity === "warning").length;
      const infos = issues.filter((i) => i.severity === "info").length;
      if (errs)
        summary.appendChild(
          makeEl(
            "span",
            "font-weight:600;font-size:12px;color:#f87171;",
            errs + " Errors",
          ),
        );
      if (warns)
        summary.appendChild(
          makeEl(
            "span",
            "font-weight:600;font-size:12px;color:#fbbf24;",
            warns + " Warnings",
          ),
        );
      if (infos)
        summary.appendChild(
          makeEl(
            "span",
            "font-weight:600;font-size:12px;color:#60a5fa;",
            infos + " Info",
          ),
        );
      contentArea.appendChild(summary);

      issues.forEach((issue) => {
        const row = makeEl(
          "div",
          "padding:8px 10px;margin-bottom:4px;border-radius:6px;background:#1e293b;" +
            "display:flex;justify-content:space-between;align-items:center;gap:8px;",
        );

        const left = makeEl("div", "flex:1;min-width:0;");

        const topRow = makeEl(
          "div",
          "display:flex;align-items:center;gap:6px;margin-bottom:2px;",
        );
        const badge = makeEl(
          "span",
          "display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:10px;" +
            "font-weight:600;background:" +
            sevBg(issue.severity) +
            ";color:" +
            sevColor(issue.severity) +
            ";",
          issue.severity.toUpperCase(),
        );
        topRow.appendChild(badge);
        const ruleLabel = makeEl(
          "span",
          "font-size:10px;color:#a78bfa;",
          issue.rule,
        );
        topRow.appendChild(ruleLabel);
        left.appendChild(topRow);

        const msg = makeEl(
          "div",
          "font-size:11px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
          issue.message,
        );
        left.appendChild(msg);

        if (issue.element) {
          const elInfo = makeEl(
            "div",
            "font-size:10px;color:#64748b;margin-top:1px;",
            issue.element,
          );
          left.appendChild(elInfo);
        }

        row.appendChild(left);

        const fixBtn = makeEl(
          "button",
          "padding:4px 10px;border-radius:6px;border:1px solid #a78bfa;background:#a78bfa15;color:#a78bfa;" +
            "font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;",
          "Fix",
        );
        fixBtn.addEventListener("mouseenter", () => {
          fixBtn.style.background = "#a78bfa30";
        });
        fixBtn.addEventListener("mouseleave", () => {
          fixBtn.style.background = "#a78bfa15";
        });
        fixBtn.addEventListener("click", () => handleFixClick(issue));
        row.appendChild(fixBtn);

        // Hover highlight
        if (issue.selector) {
          row.addEventListener("mouseenter", () => {
            const target = document.querySelector(issue.selector!);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              (target as HTMLElement).style.outline = "2px solid #a78bfa";
            }
          });
          row.addEventListener("mouseleave", () => {
            if (issue.selector) {
              const target = document.querySelector(issue.selector);
              if (target) (target as HTMLElement).style.outline = "";
            }
          });
        }

        contentArea.appendChild(row);
      });

      // Fix All button
      const fixAllRow = makeEl(
        "div",
        "display:flex;justify-content:center;padding-top:8px;",
      );
      const fixAllBtn = makeEl(
        "button",
        "padding:6px 16px;border-radius:6px;border:1px solid #a78bfa;background:#a78bfa;color:#fff;" +
          "font-size:12px;cursor:pointer;font-family:inherit;font-weight:600;",
        "Fix All (" + issues.length + ")",
      );
      fixAllBtn.addEventListener("click", () => handleFixAll());
      fixAllRow.appendChild(fixAllBtn);
      contentArea.appendChild(fixAllRow);

      footerLeft.textContent =
        issues.length + " issue" + (issues.length !== 1 ? "s" : "") + " found";
    }

    function renderDiffPreview(issue: ScannedIssue, fix: AIFix) {
      clearContainer(contentArea);

      // Back button
      const backBtn = makeEl(
        "button",
        "background:none;border:none;color:#94a3b8;font-size:11px;cursor:pointer;padding:0 0 8px 0;" +
          "font-family:inherit;display:flex;align-items:center;gap:4px;",
        "← Back to issues",
      );
      backBtn.addEventListener("click", () => renderIssueList());
      contentArea.appendChild(backBtn);

      // Issue summary
      const summaryBox = makeEl(
        "div",
        "padding:8px 10px;border-radius:6px;background:#1e293b;margin-bottom:10px;",
      );
      const issueMsg = makeEl(
        "div",
        "font-size:12px;color:#cbd5e1;font-weight:500;",
        issue.message,
      );
      summaryBox.appendChild(issueMsg);
      const issueRule = makeEl(
        "div",
        "font-size:10px;color:#a78bfa;margin-top:2px;",
        issue.rule,
      );
      summaryBox.appendChild(issueRule);
      contentArea.appendChild(summaryBox);

      // Fix description
      const descBox = makeEl(
        "div",
        "padding:8px 10px;border-radius:6px;background:#a78bfa10;border:1px solid #a78bfa30;margin-bottom:10px;",
      );
      const descLabel = makeEl(
        "div",
        "font-size:10px;color:#a78bfa;font-weight:600;margin-bottom:2px;",
        "AI SUGGESTION",
      );
      descBox.appendChild(descLabel);
      const descText = makeEl(
        "div",
        "font-size:11px;color:#cbd5e1;line-height:1.5;",
        fix.description,
      );
      descBox.appendChild(descText);
      contentArea.appendChild(descBox);

      // Diff view
      const diffContainer = makeEl(
        "div",
        "border:1px solid #1e293b;border-radius:6px;overflow:hidden;margin-bottom:10px;",
      );
      const diffHeader = makeEl(
        "div",
        "display:flex;background:#1e293b;border-bottom:1px solid #334155;",
      );
      const beforeTab = makeEl(
        "div",
        "flex:1;text-align:center;padding:4px;font-size:10px;color:#f87171;font-weight:600;",
        "BEFORE",
      );
      const afterTab = makeEl(
        "div",
        "flex:1;text-align:center;padding:4px;font-size:10px;color:#4ade80;font-weight:600;",
        "AFTER",
      );
      diffHeader.append(beforeTab, afterTab);
      diffContainer.appendChild(diffHeader);

      // Compute diff
      let beforeText = "";
      if (issue.selector) {
        try {
          const domEl = document.querySelector(issue.selector);
          if (domEl) beforeText = (domEl as HTMLElement).outerHTML;
        } catch {
          /* ignore */
        }
      }
      const afterText = fix.html || beforeText;
      const diffLines: DiffLine[] = computeDiff(beforeText, afterText);

      const diffBody = makeEl(
        "div",
        'padding:8px;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:11px;' +
          "max-height:220px;overflow-y:auto;background:#0c1222;",
      );

      diffLines.forEach((line) => {
        const lineEl = makeEl(
          "div",
          "padding:1px 6px;border-radius:2px;white-space:pre-wrap;word-break:break-all;line-height:1.6;",
          line.content,
        );
        if (line.type === "add") {
          lineEl.style.background = "#4ade8015";
          lineEl.style.color = "#4ade80";
          lineEl.textContent = "+ " + line.content;
        } else if (line.type === "remove") {
          lineEl.style.background = "#f8717115";
          lineEl.style.color = "#f87171";
          lineEl.textContent = "- " + line.content;
        } else {
          lineEl.style.color = "#64748b";
          lineEl.textContent = "  " + line.content;
        }
        diffBody.appendChild(lineEl);
      });

      diffContainer.appendChild(diffBody);
      contentArea.appendChild(diffContainer);

      // Action buttons
      const actions = makeEl(
        "div",
        "display:flex;gap:8px;justify-content:flex-end;",
      );

      const rejectBtn = makeEl(
        "button",
        "padding:6px 14px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;" +
          "font-size:11px;cursor:pointer;font-family:inherit;",
        "Reject",
      );
      rejectBtn.addEventListener("click", () => renderIssueList());
      actions.appendChild(rejectBtn);

      const applyBtn = makeEl(
        "button",
        "padding:6px 14px;border-radius:6px;border:1px solid #4ade80;background:#4ade80;color:#0f172a;" +
          "font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;",
        "Apply Fix",
      );
      applyBtn.addEventListener("click", () => handleApply(issue, fix));
      actions.appendChild(applyBtn);

      // "Fix in VS Code" button
      const vscodeBtn = makeEl(
        "button",
        "padding:6px 14px;border-radius:6px;border:1px solid #6366f1;background:#6366f115;color:#6366f1;" +
          "font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;",
        "Fix in VS Code",
      );
      vscodeBtn.addEventListener("click", async () => {
        if (!issue.selector) return;
        const el = document.querySelector(issue.selector) as HTMLElement | null;
        if (!el) return;

        const source = await resolveElementSource(el);
        const bridge = getBridge();
        if (!bridge.connected) {
          vscodeBtn.textContent = "Not connected";
          setTimeout(() => {
            vscodeBtn.textContent = "Fix in VS Code";
          }, 2000);
          return;
        }

        const originalHTML = el.outerHTML;
        const fixedHTML = fix.html || "";
        const description =
          fix.description || `Fix ${issue.rule}: ${issue.message}`;

        if (!source) {
          const payload: PreviewFixPayload = {
            file: issue.selector || "unknown",
            original: originalHTML,
            fixed: fixedHTML || buildFixedPreview(el, fix),
            description,
            fixId: issue.id,
          };
          bridge.send({ type: "PreviewFix", payload });
          return;
        }

        const fixPrompt = `Fix the following accessibility issue in the source file.
Rule: ${issue.rule}
Message: ${issue.message}
Current element HTML: ${originalHTML.slice(0, 500)}
Suggested fixed HTML: ${fixedHTML.slice(0, 500)}
Suggested fix description: ${fix.description}
${fix.styleChanges ? "Inline style changes: " + JSON.stringify(fix.styleChanges) : ""}

Respond ONLY with a JSON array of edits (no markdown, no code fences):
[{"range":{"sl":START_LINE,"sc":START_COL,"el":END_LINE,"ec":END_COL},"newText":"replacement text"}]

Only include the minimal edits needed to fix the specific issue. Do not change unrelated code.`;

        let edits: Array<{ range: SourceFixRange; newText: string }> | null =
          null;
        try {
          const response = await browser.runtime.sendMessage({
            type: "AI_AUTO_FIX",
            data: { prompt: fixPrompt },
          });

          if (response?.fix) {
            if (typeof response.fix === "string") {
              const cleaned = stripCodeFences(response.fix);
              edits = cleaned
                ? parseJsonArrayResponse<(typeof edits)[number]>(cleaned)
                : null;
            } else if (Array.isArray(response.fix)) {
              edits = response.fix as typeof edits;
            }
          }
        } catch {
          edits = null;
        }

        if (!edits || edits.length === 0) {
          const fallback = await fetchFileContent(source.file);
          if (fallback != null) {
            const range =
              computeLineColumn(fallback, originalHTML) ??
              computeLineColumn(fallback, fixedHTML);
            edits = range ? [{ range, newText: fixedHTML }] : [];
          }
        }

        if (edits && edits.length > 0) {
          const applyPayload: ApplySourceFixPayload = {
            file: source.file,
            edits,
          };
          bridge.send({ type: "ApplySourceFix", payload: applyPayload });
        } else {
          const payload: PreviewFixPayload = {
            file: source.file,
            original: originalHTML,
            fixed: fixedHTML || buildFixedPreview(el, fix),
            description,
            fixId: issue.id,
          };
          bridge.send({ type: "PreviewFix", payload });
        }
      });
      actions.appendChild(vscodeBtn);

      contentArea.appendChild(actions);

      // Undo button if there are applied fixes
      if (appliedFixes.length > 0) {
        const undoRow = makeEl(
          "div",
          "display:flex;justify-content:flex-start;margin-top:8px;",
        );
        const undoBtn = makeEl(
          "button",
          "padding:4px 10px;border-radius:6px;border:1px solid #fbbf24;background:#fbbf2415;color:#fbbf24;" +
            "font-size:11px;cursor:pointer;font-family:inherit;",
          "Undo Last Fix",
        );
        undoBtn.addEventListener("click", handleUndoLast);
        undoRow.appendChild(undoBtn);
        contentArea.appendChild(undoRow);
      }
    }

    function renderSuccess(message: string) {
      clearContainer(contentArea);
      const box = makeEl("div", "text-align:center;padding:24px;");
      const icon = makeEl(
        "div",
        "font-size:24px;color:#4ade80;margin-bottom:8px;",
        "✓",
      );
      box.appendChild(icon);
      const msg = makeEl(
        "div",
        "font-size:12px;color:#cbd5e1;margin-bottom:12px;",
        message,
      );
      box.appendChild(msg);
      const backBtn = makeEl(
        "button",
        "padding:4px 12px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;" +
          "font-size:11px;cursor:pointer;font-family:inherit;",
        "Back to issues",
      );
      backBtn.addEventListener("click", () => {
        rescan();
      });
      box.appendChild(backBtn);
      contentArea.appendChild(box);
    }

    function renderError(message: string) {
      clearContainer(contentArea);
      const box = makeEl("div", "text-align:center;padding:24px;");
      const msg = makeEl(
        "div",
        "font-size:12px;color:#f87171;margin-bottom:12px;",
        message,
      );
      box.appendChild(msg);
      const backBtn = makeEl(
        "button",
        "padding:4px 12px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#94a3b8;" +
          "font-size:11px;cursor:pointer;font-family:inherit;",
        "Back",
      );
      backBtn.addEventListener("click", () => renderIssueList());
      box.appendChild(backBtn);
      contentArea.appendChild(box);
    }

    // ---- Handlers ----

    function rescan() {
      renderLoading("Scanning page...");
      requestAnimationFrame(() => {
        const all = scanPage();
        issues = all.filter((i) => passesFilter(i.severity));
        renderIssueList();

        const bridge = getBridge();
        if (bridge.connected && issues.length > 0) {
          const diagnostics = issues.map((issue) => ({
            file: issue.selector || "",
            line: 1,
            column: 1,
            severity: issue.severity,
            message: issue.message,
            rule: issue.rule,
          }));
          bridge.send({
            type: "PublishDiagnostics",
            payload: { diagnostics },
          });
        }
      });
    }

    async function handleFixClick(issue: ScannedIssue) {
      abortController?.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      renderLoading("Generating fix...");
      footerLeft.textContent =
        "Generating fix for: " + issue.message.slice(0, 40);

      const fix = await generateAIFix(issue, signal);
      if (disposed || signal.aborted) return;

      if (!fix) {
        renderError(
          "Could not generate a fix. Ensure AI is configured in Settings.",
        );
        return;
      }

      renderDiffPreview(issue, fix);
    }

    async function handleFixAll() {
      abortController?.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      const remaining = [...issues];
      const fixedIds: string[] = [];

      for (const issue of remaining) {
        if (disposed || signal.aborted) break;
        renderLoading(
          "Fixing " +
            (fixedIds.length + 1) +
            "/" +
            remaining.length +
            ": " +
            issue.message.slice(0, 30),
        );
        footerLeft.textContent =
          "Fixing " + (fixedIds.length + 1) + " of " + remaining.length;

        const fix = await generateAIFix(issue, signal);
        if (signal.aborted) break;
        if (!fix) continue;

        const applied = applyFixToDOM(issue, fix);
        if (applied) {
          fixedIds.push(issue.id);
        }
      }

      if (disposed) return;
      issues = scanPage().filter((i) => passesFilter(i.severity));
      renderIssueList();
      footerLeft.textContent =
        "Applied " +
        fixedIds.length +
        " fix" +
        (fixedIds.length !== 1 ? "es" : "");
    }

    function applyFixToDOM(issue: ScannedIssue, fix: AIFix): boolean {
      if (!issue.selector) return false;
      const target = document.querySelector(
        issue.selector,
      ) as HTMLElement | null;
      if (!target) return false;

      const originalHTML = target.outerHTML;
      const styleSnapshots = snapshotStyle(target, issue.selector, fix);
      const success = applyFix(target, fix);
      if (success) {
        fix.styleChangeEntries = computeStyleDiff(
          styleSnapshots,
          target,
          issue.selector,
          fix,
        );
        appliedFixes.push({
          issueId: issue.id,
          selector: issue.selector,
          originalHTML,
          styleSnapshots,
          fix,
        });
      }
      return success;
    }

    function handleApply(issue: ScannedIssue, fix: AIFix) {
      const success = applyFixToDOM(issue, fix);
      if (success) {
        // Remove the fixed issue from the list
        issues = issues.filter((i) => i.id !== issue.id);
        renderSuccess("Fix applied successfully!");
        footerLeft.textContent = appliedFixes.length + " fix(es) applied";
      } else {
        renderError("Failed to apply fix. The element may have changed.");
      }
    }

    function handleUndoLast() {
      if (appliedFixes.length === 0) return;
      const last = appliedFixes.pop()!;

      for (let i = last.styleSnapshots.length - 1; i >= 0; i--) {
        const snap = last.styleSnapshots[i];
        try {
          const el = snap.element.isConnected
            ? snap.element
            : (document.querySelector(last.selector) as HTMLElement | null);
          if (el && el.style.cssText !== snap.cssText) {
            el.style.cssText = snap.cssText;
          }
        } catch {
          // Keep unwinding the rest of the stack even if one entry fails.
        }
      }

      try {
        const target = document.querySelector(
          last.selector,
        ) as HTMLElement | null;
        if (target) target.outerHTML = last.originalHTML;
      } catch {
        // Element may be gone; the style restore above already best-effort.
      }

      issues = scanPage().filter((i) => passesFilter(i.severity));
      renderIssueList();
      footerLeft.textContent =
        "Undo applied. " + appliedFixes.length + " fix(es) remaining.";
    }

    // ---- Lifecycle ----

    function cleanup() {
      if (disposed) return;
      disposed = true;
      abortController?.abort();
      abortController = null;
      removeOverlayElement(panel);
      overlayHost.remove();
      const injectedStyle = document.getElementById("fdh-autofix-style");
      if (injectedStyle) injectedStyle.remove();
    }

    closeBtn.addEventListener("click", cleanup);
    rescanBtn.addEventListener("click", rescan);
    ctx.onInvalidated(cleanup);

    // Kick off initial scan
    rescan();

    return cleanup;
  },
};
