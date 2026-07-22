import type { ToolDefinition } from "../types";
import { addOverlayElement, removeOverlayElement } from "@/content/overlay-manager";

interface ContainerQueryMatch {
  condition: string;
  matchedSelectors: string[];
}

interface ContainerInfo {
  element: HTMLElement;
  name: string | null;
  type: string;
  width: number;
  height: number;
  queries: ContainerQueryMatch[];
}

interface ContainerRule {
  condition: string;
  name: string | null;
  selectors: string[];
}

function isConditionRule(rule: CSSRule): rule is CSSConditionRule {
  return (
    rule instanceof CSSConditionRule ||
    typeof (rule as any as { conditionText?: unknown }).conditionText !==
      "undefined"
  );
}

function extractContainerRules(): ContainerRule[] {
  const rules: ContainerRule[] = [];
  const sheets = document.styleSheets;
  for (const sheet of sheets) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of cssRules) {
      if (!isConditionRule(rule)) continue;
      const conditionText = (rule as CSSConditionRule).conditionText;
      if (typeof conditionText !== "string") continue;
      // CSSContainerRule appears as CSSConditionRule whose conditionText starts
      // with the "container" keyword (e.g. "container (min-width: 200px)" or
      // "container sidebar (min-width: 200px)").
      if (!/^container\b/i.test(conditionText.trim())) continue;

      let name: string | null = null;
      const m = conditionText.match(/^container\s+([^\s(]+)/i);
      if (m && m[1] && !/^\d/.test(m[1])) name = m[1];

      const selectors: string[] = [];
      try {
        for (const inner of rule.cssRules) {
          if (inner instanceof CSSStyleRule && inner.selectorText) {
            selectors.push(inner.selectorText);
          }
        }
      } catch {
        // cross-origin or restricted
      }

      rules.push({ condition: conditionText, name, selectors });
    }
  }
  return rules;
}

function detectContainers(): ContainerInfo[] {
  const containers: ContainerInfo[] = [];
  const allRules = extractContainerRules();

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
  );
  const containerEls: HTMLElement[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const element = node as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const containerType = computedStyle.containerType;
    if (containerType && containerType !== "normal") {
      containerEls.push(element);
    }
  }

  for (const element of containerEls) {
    const computedStyle = window.getComputedStyle(element);
    const containerName = computedStyle.containerName;
    const rect = element.getBoundingClientRect();
    const ownName =
      containerName && containerName !== "none" ? containerName : null;

    const applicableRules = allRules.filter((r) => {
      if (r.name) return r.name === ownName;
      // Anonymous container rules apply to any container that is an ancestor
      // context of at least one element matching a selector in the rule.
      return true;
    });

    const queries: ContainerQueryMatch[] = applicableRules.map((rule) => {
      const matchedSelectors: string[] = [];
      for (const selector of rule.selectors) {
        let matches = false;
        try {
          matches = !!element.querySelector(selector);
        } catch {
          // Invalid or unsupported selector — skip.
        }
        if (matches) matchedSelectors.push(selector);
      }
      return { condition: rule.condition, matchedSelectors };
    });

    containers.push({
      element,
      name: ownName,
      type: computedStyle.containerType,
      width: rect.width,
      height: rect.height,
      queries,
    });
  }

  return containers;
}

export const containerQueryInspector: ToolDefinition = {
  id: "container-query-inspector",
  name: "Container Query Inspector",
  description: "Inspect container queries and their matched conditions",
  category: "inspection",
  icon: "Containers",
  configSchema: {
    highlightContainers: {
      type: "boolean",
      label: "Highlight Containers",
      default: true,
    },
    showBreakpoints: {
      type: "boolean",
      label: "Show Breakpoints",
      default: true,
    },
    showMatchedRules: {
      type: "boolean",
      label: "Show Matched Rules",
      default: true,
    },
    liveResize: {
      type: "boolean",
      label: "Live Resize Preview",
      default: true,
    },
  },
  run: (ctx, config) => {
    const highlightContainers =
      (config?.highlightContainers as boolean) ?? true;
    const showBreakpoints = (config?.showBreakpoints as boolean) ?? true;
    const showMatchedRules = (config?.showMatchedRules as boolean) ?? true;
    const overlayEls: HTMLDivElement[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:420px;max-height:75vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .panel{background:#1e1e2e;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid #313244;overflow:hidden;display:flex;flex-direction:column;max-height:75vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#cdd6f4;}
      .header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825;}
      .title{font-weight:600;font-size:14px;}
      .actions{display:flex;gap:4px;}
      .actions button{background:transparent;border:none;color:#6c7086;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .actions button:hover{background:#313244;color:#cdd6f4;}
      .content{flex:1;overflow-y:auto;padding:12px;}
      .section-title{font-size:11px;text-transform:uppercase;color:#6c7086;margin-bottom:8px;font-weight:600;}
      .container-card{background:#313244;padding:10px 12px;border-radius:6px;margin-bottom:8px;border-left:3px solid #a855f7;}
      .container-name{font-family:monospace;font-size:12px;color:#a855f7;font-weight:600;}
      .container-type{font-size:11px;color:#94e2d5;margin-top:2px;}
      .container-dims{font-size:11px;color:#6c7086;margin-top:4px;}
      .query-item{background:rgba(168,85,247,0.15);padding:4px 8px;border-radius:4px;margin-top:4px;font-family:monospace;font-size:11px;color:#cdd6f4;}
      .summary{display:flex;gap:16px;padding:8px 12px;border-bottom:1px solid #313244;}
      .summary-item{font-size:11px;color:#6c7086;}
      .empty{text-align:center;padding:40px 20px;color:#6c7086;}
      .content::-webkit-scrollbar{width:6px;}
      .content::-webkit-scrollbar-thumb{background:#313244;border-radius:3px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.textContent = "Container Query Inspector";
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.textContent = "🔄";
    const btnClose = document.createElement("button");
    btnClose.textContent = "✕";
    actionsDiv.append(btnRefresh, btnClose);
    header.append(titleDiv, actionsDiv);

    const summaryEl = document.createElement("div");
    summaryEl.className = "summary";

    const content = document.createElement("div");
    content.className = "content";

    panel.append(header, summaryEl, content);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function updateOverlays(containers: ContainerInfo[]): void {
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;

      if (!highlightContainers) return;

      for (const info of containers) {
        const rect = info.element.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border:2px dashed #a855f7;background:rgba(168,85,247,0.05);pointer-events:none;z-index:2147483641;box-sizing:border-box;`;

        const label = document.createElement("div");
        label.style.cssText =
          "position:absolute;top:-22px;left:0;background:#a855f7;color:white;padding:3px 8px;font-size:10px;font-family:monospace;border-radius:4px 4px 0 0;white-space:nowrap;font-weight:600;";
        const nameText = info.name ? ` (${info.name})` : "";
        label.textContent = "@container" + nameText + " [" + info.type + "]";
        overlay.appendChild(label);

        if (showBreakpoints) {
          const dims = document.createElement("div");
          dims.style.cssText =
            "position:absolute;bottom:4px;right:4px;background:rgba(168,85,247,0.9);color:white;padding:2px 6px;font-size:10px;font-family:monospace;border-radius:3px;";
          dims.textContent =
            Math.round(info.width) + "x" + Math.round(info.height);
          overlay.appendChild(dims);
        }

        addOverlayElement(overlay);
        overlayEls.push(overlay);
      }
    }

    function render(containers: ContainerInfo[]): void {
      while (summaryEl.firstChild) summaryEl.removeChild(summaryEl.firstChild);
      while (content.firstChild) content.removeChild(content.firstChild);

      const sizeCount = containers.filter((c) => c.type === "size").length;
      const inlineCount = containers.filter(
        (c) => c.type === "inline-size",
      ).length;
      const namedCount = containers.filter((c) => c.name !== null).length;

      const items = [
        { label: "Total", value: containers.length },
        { label: "Size", value: sizeCount },
        { label: "Inline-size", value: inlineCount },
        { label: "Named", value: namedCount },
      ];
      for (const item of items) {
        const el = document.createElement("div");
        el.className = "summary-item";
        el.textContent = item.label + ": " + item.value;
        summaryEl.appendChild(el);
      }

      if (containers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No CSS containers found on this page";
        content.appendChild(empty);
        return;
      }

      const title = document.createElement("div");
      title.className = "section-title";
      title.textContent = "Containers";
      content.appendChild(title);

      for (const info of containers) {
        const card = document.createElement("div");
        card.className = "container-card";

        const nameEl = document.createElement("div");
        nameEl.className = "container-name";
        nameEl.textContent = info.name
          ? "@container " + info.name
          : "@container (anonymous)";
        card.appendChild(nameEl);

        const typeEl = document.createElement("div");
        typeEl.className = "container-type";
        typeEl.textContent = "type: " + info.type;
        card.appendChild(typeEl);

        const dimsEl = document.createElement("div");
        dimsEl.className = "container-dims";
        dimsEl.textContent =
          Math.round(info.width) + " x " + Math.round(info.height) + "px";
        card.appendChild(dimsEl);

        if (showMatchedRules && info.queries.length > 0) {
          for (const q of info.queries.slice(0, 3)) {
            const qEl = document.createElement("div");
            qEl.className = "query-item";
            const matchCount = q.matchedSelectors.length;
            const matchSuffix =
              matchCount > 0 ? " (" + matchCount + " matched)" : "";
            qEl.textContent = "@container " + q.condition + matchSuffix;
            card.appendChild(qEl);
          }
          if (info.queries.length > 3) {
            const more = document.createElement("div");
            more.style.cssText =
              "font-size:10px;color:#6c7086;text-align:center;padding-top:4px;";
            more.textContent =
              "+" + (info.queries.length - 3) + " more queries";
            card.appendChild(more);
          }
        }

        content.appendChild(card);
      }

      updateOverlays(containers);
    }

    function refresh(): void {
      const containers = detectContainers();
      render(containers);
    }

    let resizeObserver: ResizeObserver | null = null;
    if ((config?.liveResize as boolean) ?? true) {
      resizeObserver = new ResizeObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refresh, 200);
      });
      resizeObserver.observe(document.body);
    }

    btnRefresh.addEventListener("click", refresh);
    btnClose.addEventListener("click", cleanup);

    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === "Escape") cleanup();
    }
    document.addEventListener("keydown", handleKeydown, true);

    refresh();

    function cleanup(): void {
      document.removeEventListener("keydown", handleKeydown, true);
      resizeObserver?.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
