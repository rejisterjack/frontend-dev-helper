import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "@/content/overlay-manager";
import {
  collectCascadedRules,
  getPropertyCascade,
  specificityToString,
  type CascadedRule,
} from "@/lib/css-analysis";
import { jumpToCSSSource } from "@/lib/css-source-resolver";

function truncate(s: string, max = 30): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function styledSpan(parent: HTMLElement, text: string, color: string): void {
  const span = document.createElement("span");
  span.style.color = color;
  span.textContent = text;
  parent.appendChild(span);
}

function ruleSourceInfo(
  rule: CSSStyleRule | null,
): { href: string; line: number } | null {
  if (!rule) return null;
  let parentSheet: CSSStyleSheet | null = null;
  try {
    parentSheet =
      (rule as CSSStyleRule & { parentStyleSheet?: CSSStyleSheet | null })
        .parentStyleSheet ?? null;
  } catch {
    return null;
  }
  if (!parentSheet) return null;
  const href =
    parentSheet.href ||
    (parentSheet.ownerNode as HTMLElement | null)?.nodeName ||
    "<inline>";
  let line = -1;
  try {
    const rules = parentSheet.cssRules ?? parentSheet.rules;
    for (let i = 0; i < rules.length; i++) {
      if (rules[i] === rule) {
        line = i + 1;
        break;
      }
    }
  } catch {
    line = -1;
  }
  return { href: String(href), line };
}

export const specificityCascade: ToolDefinition = {
  id: "specificity-cascade",
  name: "Specificity Cascade",
  description:
    "Visualize CSS cascade showing which rules win and why for each property",
  category: "css",
  icon: "GitBranch",

  run(ctx) {
    let panel: HTMLElement | null = null;
    let highlightBox: HTMLElement | null = null;
    let pinnedElement: HTMLElement | null = null;
    let allRules: CascadedRule[] = [];
    let contentDiv: HTMLElement | null = null;
    let detachTracker: (() => void) | null = null;

    function createPanel(): void {
      if (panel) return;
      panel = document.createElement("div");
      panel.className = "fdh-sc-panel";
      panel.style.cssText = `
        position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
        z-index: 2147483640; background: #1e1e2e; color: #cdd6f4;
        font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px;
        border-left: 1px solid #45475a; overflow-y: auto;
        box-shadow: -4px 0 24px rgba(0,0,0,0.3);
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText =
        "padding: 12px 16px; border-bottom: 1px solid #45475a; display: flex; justify-content: space-between; align-items: center;";
      const title = document.createElement("span");
      title.style.cssText =
        "font-weight: 600; font-size: 13px; color: #cdd6f4;";
      title.textContent = "Specificity Cascade";
      header.appendChild(title);

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.cssText =
        "background: none; border: none; color: #a6adc8; cursor: pointer; font-size: 16px; padding: 4px;";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cleanup();
      });
      header.appendChild(closeBtn);
      panel.appendChild(header);

      // Content area
      contentDiv = document.createElement("div");
      contentDiv.id = "fdh-sc-content";
      contentDiv.style.cssText = "padding: 12px 16px; color: #a6adc8;";
      contentDiv.textContent = "Click an element to inspect its CSS cascade";
      panel.appendChild(contentDiv);

      addOverlayElement(panel);
    }

    function createHighlight(): void {
      if (highlightBox) return;
      highlightBox = document.createElement("div");
      highlightBox.className = "fdh-sc-highlight";
      highlightBox.setAttribute("data-fdh-overlay", "sc-highlight");
      highlightBox.style.cssText = `
        position: fixed; pointer-events: none; z-index: 2147483639;
        border: 2px solid #f38ba8; background: rgba(243, 139, 168, 0.08);
        border-radius: 2px; display: none;
      `;
      addOverlayElement(highlightBox);
    }

    function positionHighlight(el: HTMLElement): void {
      if (!highlightBox) return;
      const rect = el.getBoundingClientRect();
      highlightBox.style.display = "block";
      highlightBox.style.top = `${rect.top}px`;
      highlightBox.style.left = `${rect.left}px`;
      highlightBox.style.width = `${rect.width}px`;
      highlightBox.style.height = `${rect.height}px`;
    }

    function startTrackingPinned(el: HTMLElement): void {
      stopTrackingPinned();
      detachTracker = attachViewportTracker(() => {
        if (!pinnedElement || pinnedElement !== el) {
          stopTrackingPinned();
          return;
        }
        positionHighlight(el);
      });
    }

    function stopTrackingPinned(): void {
      if (detachTracker) {
        detachTracker();
        detachTracker = null;
      }
    }

    function isOwnOverlay(el: Element): boolean {
      if (!el) return false;
      const cl = el.classList;
      if (cl) {
        for (let i = 0; i < cl.length; i++) {
          if (cl[i].startsWith("fdh-")) return true;
        }
      }
      return false;
    }

    function renderCascade(el: HTMLElement): void {
      allRules = collectCascadedRules(el);
      if (!contentDiv) return;

      // Clear content
      while (contentDiv.firstChild)
        contentDiv.removeChild(contentDiv.firstChild);

      if (allRules.length === 0) {
        contentDiv.textContent = "No CSS rules match this element";
        return;
      }

      // Collect all properties
      const allProps = new Set<string>();
      for (const rule of allRules) {
        for (const [prop] of rule.properties) {
          allProps.add(prop);
        }
      }

      // Element info header
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = "margin-bottom: 12px;";
      const tag = el.tagName.toLowerCase();
      const idStr = el.id ? `#${el.id}` : "";
      const classes =
        el.className && typeof el.className === "string"
          ? el.className
              .trim()
              .split(/\s+/)
              .slice(0, 3)
              .map((c) => `.${c}`)
              .join("")
          : "";
      styledSpan(headerDiv, `<${tag}>${idStr}${classes}`, "#89b4fa");
      const countLine = document.createElement("div");
      countLine.style.cssText =
        "color: #6c7086; font-size: 11px; margin-top: 2px;";
      countLine.textContent = `${allRules.length} rule${allRules.length !== 1 ? "s" : ""} match`;
      headerDiv.appendChild(countLine);
      contentDiv.appendChild(headerDiv);

      // Group and render properties
      const categories: Record<string, string[]> = {
        Layout: [
          "display",
          "position",
          "width",
          "height",
          "min-width",
          "max-width",
          "min-height",
          "max-height",
          "overflow",
        ],
        Flexbox: [
          "flex-direction",
          "flex-wrap",
          "justify-content",
          "align-items",
          "gap",
          "flex",
          "flex-grow",
          "flex-shrink",
          "flex-basis",
        ],
        Grid: [
          "grid-template-columns",
          "grid-template-rows",
          "grid-area",
          "grid-column",
          "grid-row",
        ],
        Spacing: [
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
        ],
        Typography: [
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "color",
          "text-align",
          "text-decoration",
        ],
        Border: ["border", "border-radius", "box-shadow"],
      };

      const catOrder = [
        "Layout",
        "Flexbox",
        "Grid",
        "Spacing",
        "Typography",
        "Border",
      ];
      const catSet = new Set(catOrder.flatMap((c) => categories[c] || []));
      const otherProps = [...allProps].filter((p) => !catSet.has(p));
      if (otherProps.length > 0) {
        catOrder.push("Other");
        categories["Other"] = otherProps;
      }

      for (const cat of catOrder) {
        const catProps = (categories[cat] || []).filter((p) => allProps.has(p));
        if (catProps.length === 0) continue;

        const catDiv = document.createElement("div");
        catDiv.style.cssText = "margin-bottom: 12px;";

        const catLabel = document.createElement("div");
        catLabel.style.cssText =
          "color: #6c7086; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;";
        catLabel.textContent = cat;
        catDiv.appendChild(catLabel);

        for (const prop of catProps) {
          const cascade = getPropertyCascade(allRules, prop);
          if (cascade.length === 0) continue;
          catDiv.appendChild(renderPropertyCascade(prop, cascade, el));
        }

        contentDiv.appendChild(catDiv);
      }
    }

    function renderPropertyCascade(
      property: string,
      cascade: Array<{
        rule: CascadedRule;
        value: string;
        isWinning: boolean;
        isImportant: boolean;
      }>,
      el: HTMLElement,
    ): HTMLElement {
      const container = document.createElement("div");
      container.style.cssText = "margin-bottom: 8px;";

      const propLabel = document.createElement("div");
      propLabel.style.cssText =
        "color: #94e2d5; font-size: 11px; margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center; gap: 6px;";
      const labelLeft = document.createElement("span");
      labelLeft.textContent = property;
      propLabel.appendChild(labelLeft);

      let computedValue = "";
      try {
        computedValue = getComputedStyle(el).getPropertyValue(property).trim();
      } catch {
        computedValue = "";
      }
      if (computedValue) {
        const computedSpan = document.createElement("span");
        computedSpan.style.cssText =
          "color: #f5c2e7; font-size: 10px; font-family: monospace;";
        computedSpan.textContent = `computed: ${truncate(computedValue, 28)}`;
        propLabel.appendChild(computedSpan);
      }
      container.appendChild(propLabel);

      for (const entry of cascade) {
        const spec = specificityToString(entry.rule.specificity);
        const row = document.createElement("div");
        row.style.cssText = `
          opacity: ${entry.isWinning ? "1" : "0.5"};
          border: 1px solid ${entry.isWinning ? "#a6e3a1" : "#45475a"};
          background: ${entry.isWinning ? "rgba(166, 227, 161, 0.1)" : "transparent"};
          border-radius: 3px; padding: 3px 6px; margin-bottom: 2px;
          cursor: pointer; display: flex; justify-content: space-between; align-items: center;
        `;

        const leftDiv = document.createElement("div");
        leftDiv.style.cssText =
          "display: flex; align-items: center; gap: 6px; overflow: hidden;";
        styledSpan(leftDiv, truncate(entry.rule.selector, 25), "#cba6f7");
        leftDiv.lastElementChild!.setAttribute(
          "style",
          "color: #cba6f7; font-size: 10px; white-space: nowrap;",
        );
        styledSpan(leftDiv, truncate(entry.value, 20), "#f5e0dc");
        leftDiv.lastElementChild!.setAttribute(
          "style",
          "color: #f5e0dc; font-size: 11px;",
        );

        if (entry.isImportant) {
          styledSpan(leftDiv, "!important", "#f38ba8");
          leftDiv.lastElementChild!.setAttribute(
            "style",
            "color: #f38ba8; font-size: 9px; font-weight: 700; margin-left: 4px;",
          );
        }

        row.appendChild(leftDiv);

        const rightDiv = document.createElement("div");
        rightDiv.style.cssText =
          "display: flex; align-items: center; gap: 4px; flex-shrink: 0;";

        const badge = document.createElement("span");
        badge.style.cssText = `color: ${entry.isWinning ? "#a6e3a1" : "#6c7086"}; font-size: 9px;`;
        // Always show specificity so reviewers can see *why* a rule wins,
        // not just that it does. The winner is labelled but its score is
        // included in parens so users learn to read specificity at a glance.
        badge.textContent = entry.isWinning ? `WINNER (${spec})` : `(${spec})`;
        rightDiv.appendChild(badge);

        row.appendChild(rightDiv);

        let sourceDetail: HTMLElement | null = null;
        const expandSource = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          if (sourceDetail) {
            const visible = sourceDetail.style.display !== "none";
            sourceDetail.style.display = visible ? "none" : "block";
            return;
          }
          sourceDetail = document.createElement("div");
          sourceDetail.style.cssText =
            "border-top: 1px dashed #45475a; margin-top: 4px; padding-top: 4px; font-size: 10px; color: #94e2d5;";
          const info = ruleSourceInfo(entry.rule.rule);
          if (info) {
            const loc = document.createElement("div");
            loc.style.cssText =
              "color: #94e2d5; margin-bottom: 3px; word-break: break-all;";
            loc.textContent = `${info.href}:${info.line >= 0 ? info.line : "?"}`;
            sourceDetail.appendChild(loc);
          } else if (entry.rule.isInline) {
            const inlineNote = document.createElement("div");
            inlineNote.style.cssText = "color: #94e2d5; margin-bottom: 3px;";
            inlineNote.textContent = "inline style (element.style)";
            sourceDetail.appendChild(inlineNote);
          } else {
            const note = document.createElement("div");
            note.style.cssText = "color: #6c7086; margin-bottom: 3px;";
            note.textContent = "source location unavailable";
            sourceDetail.appendChild(note);
          }
          const openBtn = document.createElement("button");
          openBtn.style.cssText =
            "background:#45475a;border:none;border-radius:3px;color:#cdd6f4;font-size:10px;padding:2px 6px;cursor:pointer;";
          openBtn.textContent = "Open in VS Code";
          openBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            void jumpToCSSSource(el, property);
          });
          sourceDetail.appendChild(openBtn);
          row.appendChild(sourceDetail);
        };

        row.addEventListener("click", expandSource);

        container.appendChild(row);
      }

      return container;
    }

    createHighlight();
    createPanel();

    const handleMouseMove = (e: MouseEvent) => {
      if (pinnedElement) return;
      const target = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement | null;
      if (
        !target ||
        isOwnOverlay(target) ||
        target === document.documentElement ||
        target === document.body
      ) {
        if (highlightBox) highlightBox.style.display = "none";
        return;
      }
      positionHighlight(target);
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement | null;
      if (!target || isOwnOverlay(target)) return;
      e.preventDefault();
      e.stopPropagation();
      pinnedElement = target;
      positionHighlight(target);
      renderCascade(target);
      startTrackingPinned(target);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pinnedElement) {
          pinnedElement = null;
          allRules = [];
          stopTrackingPinned();
          if (highlightBox) highlightBox.style.display = "none";
          if (contentDiv) {
            while (contentDiv.firstChild)
              contentDiv.removeChild(contentDiv.firstChild);
            contentDiv.textContent =
              "Click an element to inspect its CSS cascade";
          }
        } else {
          cleanup();
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.body.style.cursor = "crosshair";

    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.cursor = "";
      pinnedElement = null;
      allRules = [];
      stopTrackingPinned();
      if (highlightBox) {
        removeOverlayElement(highlightBox);
        highlightBox = null;
      }
      if (panel) {
        removeOverlayElement(panel);
        panel = null;
      }
      contentDiv = null;
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
