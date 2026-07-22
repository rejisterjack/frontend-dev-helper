import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import { getBridge } from "@/lib/vscode-bridge";
import type { PreviewFixPayload } from "@repo/bridge-protocol/types";

interface Suggestion {
  category: string;
  priority: "high" | "medium" | "low";
  description: string;
  selector?: string;
  suggestedFix?: string;
  originalSnippet?: string;
  fixId?: string;
}

function gatherPageContext(): Record<string, unknown> {
  const url = window.location.href;
  const title = document.title;
  const metaTags: Record<string, string> = {};
  document.querySelectorAll("meta").forEach((meta) => {
    const name =
      meta.getAttribute("name") || meta.getAttribute("property") || "";
    const content = meta.getAttribute("content") || "";
    if (name && content) metaTags[name] = content;
  });

  const domStats = {
    elements: document.querySelectorAll("*").length,
    images: document.querySelectorAll("img").length,
    scripts: document.querySelectorAll("script").length,
    stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
    forms: document.querySelectorAll("form").length,
    links: document.querySelectorAll("a").length,
  };

  const frameworks: string[] = [];
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) frameworks.push("React");
  if ((window as any).Vue) frameworks.push("Vue");
  if ((window as any).angular) frameworks.push("Angular");
  if (document.querySelector("[data-svelte]") || (window as any).__SVELTE_HMR)
    frameworks.push("Svelte");
  if ((window as any).Next) frameworks.push("Next.js");
  if ((window as any).__NUXT__) frameworks.push("Nuxt");

  return { url, title, metaTags, domStats, frameworks };
}

const FENCE_RE = /```(\w+)?\n([\s\S]*?)```/g;
const KEYFRAMES_RE = /@keyframes\s+([a-zA-Z_][\w-]*)\s*\{[^}]*\}/g;

function collectAdoptedKeyframes(): string[] {
  const found: string[] = [];
  const seen = new Set<CSSStyleSheet>();

  const harvestFromSheets = (
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[] | undefined,
  ) => {
    if (!sheets) return;
    for (const sheet of sheets) {
      if (!sheet || seen.has(sheet)) continue;
      seen.add(sheet);
      try {
        const rules = sheet.cssRules ?? [];
        for (const rule of rules) {
          const text = (rule as CSSRule).cssText ?? "";
          let m: RegExpExecArray | null;
          KEYFRAMES_RE.lastIndex = 0;
          while ((m = KEYFRAMES_RE.exec(text)) !== null) {
            found.push(m[0]);
          }
        }
      } catch {
        // Cross-origin sheets throw on cssRules access.
      }
    }
  };

  harvestFromSheets(document.adoptedStyleSheets);

  const walkShadowRoots = (root: ParentNode) => {
    const tree = document.createTreeWalker(
      root as Node,
      NodeFilter.SHOW_ELEMENT,
    );
    let node: Node | null = tree.currentNode;
    while (node) {
      const el = node as Element & { shadowRoot?: ShadowRoot | null };
      const shadow = el.shadowRoot;
      if (shadow) {
        harvestFromSheets(shadow.adoptedStyleSheets);
        walkShadowRoots(shadow);
      }
      node = tree.nextNode();
    }
  };

  if (document.body?.shadowRoot) {
    harvestFromSheets(document.body.shadowRoot.adoptedStyleSheets);
    walkShadowRoots(document.body.shadowRoot);
  }
  walkShadowRoots(document);

  return Array.from(new Set(found));
}

function extractSuggestedFix(
  description: string,
): { original: string; fixed: string } | null {
  const matches = [...description.matchAll(FENCE_RE)];
  if (matches.length === 0) return null;
  // If two code blocks appear, treat first as original, second as fixed.
  if (matches.length >= 2) {
    return {
      original: matches[0][2].trim(),
      fixed: matches[1][2].trim(),
    };
  }
  return {
    original: "",
    fixed: matches[0][2].trim(),
  };
}

function snippetForSelector(selector: string | undefined): string {
  if (!selector) return document.documentElement.outerHTML.slice(0, 4000);
  try {
    const el = document.querySelector(selector);
    return el ? (el as HTMLElement).outerHTML : "";
  } catch {
    return "";
  }
}

export const smartSuggestions: ToolDefinition = {
  id: "smart-suggestions",
  name: "Smart Suggestions",
  description: "AI-powered design and code suggestions for the current page",
  category: "ai",
  icon: "Sparkles",
  configSchema: {
    suggestFixes: { type: "boolean", label: "Suggest Fixes", default: true },
    suggestImprovements: {
      type: "boolean",
      label: "Suggest Improvements",
      default: true,
    },
    maxSuggestions: {
      type: "slider",
      label: "Max Suggestions",
      default: 10,
      min: 1,
      max: 50,
      step: 1,
    },
    focusArea: {
      type: "select",
      label: "Focus Area",
      default: "all",
      options: [
        { label: "All", value: "all" },
        { label: "Layout", value: "layout" },
        { label: "Colors", value: "colors" },
        { label: "Typography", value: "typography" },
        { label: "Accessibility", value: "accessibility" },
        { label: "Performance", value: "performance" },
      ],
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const suggestFixes = cfg.suggestFixes ?? true;
    const suggestImprovements = cfg.suggestImprovements ?? true;
    const maxSuggestions = cfg.maxSuggestions ?? 10;
    const focusArea = cfg.focusArea ?? "all";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:400px;max-height:80vh;overflow-y:auto;" +
      "z-index:2147483647;pointer-events:auto;background:#1e1e2e;color:#cdd6f4;" +
      "font-family:system-ui,-apple-system,sans-serif;font-size:13px;border-radius:12px;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #45475a;display:flex;flex-direction:column;";

    const header = document.createElement("div");
    header.style.cssText =
      "padding:12px 16px;border-bottom:1px solid #45475a;display:flex;justify-content:space-between;align-items:center;";
    const titleEl = document.createElement("span");
    titleEl.style.cssText = "font-weight:600;font-size:15px;";
    titleEl.textContent = "Smart Suggestions";
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.cssText =
      "background:#45475a;color:#cdd6f4;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;";
    header.appendChild(titleEl);
    header.appendChild(closeButton);
    panel.appendChild(header);

    const content = document.createElement("div");
    content.style.cssText = "padding:16px;";

    const spinner = document.createElement("div");
    spinner.style.cssText =
      "display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;color:#a6adc8;";
    const spinnerDot = document.createElement("div");
    spinnerDot.style.cssText =
      "width:16px;height:16px;border:2px solid #45475a;border-top-color:#6366f1;border-radius:50%;animation:fdh-spin 0.6s linear infinite;";
    const styleTag = document.createElement("style");
    styleTag.textContent =
      "@keyframes fdh-spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(styleTag);
    spinner.appendChild(spinnerDot);
    const spinnerText = document.createElement("span");
    spinnerText.textContent = "Analyzing page...";
    spinner.appendChild(spinnerText);
    content.appendChild(spinner);
    panel.appendChild(content);

    addOverlayElement(panel);
    panel.style.pointerEvents = "auto";

    let disposed = false;

    (async () => {
      try {
        const pageContext = gatherPageContext();
        const adoptedKeyframes = collectAdoptedKeyframes();
        const response = await browser.runtime.sendMessage({
          type: "AI_SUGGESTIONS",
          data: {
            pageContext,
            focusArea,
            maxSuggestions,
            suggestFixes,
            suggestImprovements,
            adoptedKeyframes,
            config: cfg,
          },
        });

        if (disposed) return;

        while (content.firstChild) content.removeChild(content.firstChild);

        const suggestions: Suggestion[] = response?.suggestions || [];

        if (suggestions.length === 0) {
          const empty = document.createElement("div");
          empty.style.cssText = "text-align:center;padding:24px;color:#a6adc8;";
          empty.textContent =
            "No suggestions available. Try a different focus area.";
          content.appendChild(empty);
          return;
        }

        const priorityColor: Record<string, string> = {
          high: "#f38ba8",
          medium: "#fab387",
          low: "#89b4fa",
        };
        const categoryColor: Record<string, string> = {
          layout: "#a6e3a1",
          colors: "#f9e2af",
          typography: "#89dceb",
          accessibility: "#cba6f7",
          performance: "#fab387",
          seo: "#94e2d5",
          general: "#cdd6f4",
        };

        suggestions.forEach((s, idx) => {
          const item = document.createElement("div");
          item.style.cssText =
            "padding:10px;margin-bottom:8px;background:#313244;border-radius:8px;";

          const topRow = document.createElement("div");
          topRow.style.cssText =
            "display:flex;gap:8px;align-items:center;margin-bottom:4px;";

          const catBadge = document.createElement("span");
          catBadge.style.cssText =
            "font-size:10px;padding:2px 6px;border-radius:4px;background:" +
            (categoryColor[s.category] || "#cdd6f4") +
            "33;color:" +
            (categoryColor[s.category] || "#cdd6f4") +
            ";";
          catBadge.textContent = s.category;
          topRow.appendChild(catBadge);

          const priBadge = document.createElement("span");
          priBadge.style.cssText =
            "font-size:10px;font-weight:600;color:" +
            priorityColor[s.priority] +
            ";";
          priBadge.textContent = s.priority.toUpperCase();
          topRow.appendChild(priBadge);

          item.appendChild(topRow);

          const desc = document.createElement("div");
          desc.style.cssText =
            "font-size:12px;line-height:1.5;color:#cdd6f4;white-space:pre-wrap;";
          desc.textContent = s.description;
          item.appendChild(desc);

          const actionRow = document.createElement("div");
          actionRow.style.cssText =
            "margin-top:6px;display:flex;justify-content:flex-end;";
          const vscodeBtn = document.createElement("button");
          vscodeBtn.textContent = "Fix in VS Code";
          vscodeBtn.style.cssText =
            "background:transparent;border:1px solid #6366f1;color:#6366f1;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:inherit;";
          vscodeBtn.addEventListener("click", () => {
            const bridge = getBridge();
            if (!bridge.connected) {
              vscodeBtn.textContent = "Not connected";
              setTimeout(() => {
                vscodeBtn.textContent = "Fix in VS Code";
              }, 2000);
              return;
            }
            const original =
              s.originalSnippet ?? snippetForSelector(s.selector);
            const fixed =
              s.suggestedFix ?? extractSuggestedFix(s.description)?.fixed ?? "";
            const fixId =
              s.fixId ?? `suggestion-${s.category}-${idx}-${Date.now()}`;
            const payload: PreviewFixPayload = {
              file: s.selector || window.location.href,
              original,
              fixed,
              description: s.description,
              fixId,
            };
            bridge.send({
              type: "PreviewFix",
              payload: payload as any as Record<string, unknown>,
            });
          });
          actionRow.appendChild(vscodeBtn);
          item.appendChild(actionRow);

          content.appendChild(item);
        });
      } catch {
        if (disposed) return;
        while (content.firstChild) content.removeChild(content.firstChild);
        const errorEl = document.createElement("div");
        errorEl.style.cssText = "text-align:center;padding:24px;color:#f38ba8;";
        errorEl.textContent = "Failed to get AI suggestions. Please try again.";
        content.appendChild(errorEl);
      }
    })();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      removeOverlayElement(panel);
      styleTag.remove();
    };

    closeButton.addEventListener("click", cleanup);
    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
