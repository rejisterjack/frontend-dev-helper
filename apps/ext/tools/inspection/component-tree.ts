import type { ToolDefinition } from "../types";
import { jumpToElementSource } from "@/lib/element-source-resolver";

interface ComponentNode {
  id: string;
  name: string;
  type: "component" | "element" | "text" | "fragment";
  framework: string;
  props?: Record<string, string>;
  children: ComponentNode[];
  depth: number;
  domElement?: HTMLElement;
  isExpanded: boolean;
  hasChildren: boolean;
}

function detectFramework(): string {
  if (
    document.querySelector("[data-reactroot]") ||
    document.querySelector("[data-reactid]") ||
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
  )
    return "react";
  const allEls = document.querySelectorAll("*");
  for (const el of allEls) {
    if ((el as any).__vue__ || (el as any).__vue_app__) return "vue";
  }
  if (
    document.querySelector("[ng-version]") ||
    document.querySelector("[ng-app]")
  )
    return "angular";
  if (document.querySelectorAll('[class*="svelte-"]').length > 0)
    return "svelte";
  return "unknown";
}

function deriveTitle(element: HTMLElement): string {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
  const role = element.getAttribute("role");
  if (role) {
    const txt = (element.innerText || "").trim();
    if (txt) return txt.slice(0, 30);
  }
  const titleAttr = element.getAttribute("title");
  if (titleAttr && titleAttr.trim()) return titleAttr.trim();
  const txt = (element.innerText || "").trim();
  if (txt) return txt.slice(0, 30);
  return element.tagName.toLowerCase();
}

function domElementToNode(
  element: HTMLElement,
  depth: number,
  index: number,
  maxDepth: number,
): ComponentNode {
  const childNodes: ComponentNode[] = [];
  if (depth < maxDepth) {
    for (let i = 0; i < element.children.length; i++) {
      childNodes.push(
        domElementToNode(
          element.children[i] as HTMLElement,
          depth + 1,
          i,
          maxDepth,
        ),
      );
    }
  }
  const props: Record<string, string> = {};
  for (const attr of ["id", "class", "data-testid", "aria-label", "role"]) {
    const value = element.getAttribute(attr);
    if (value) props[attr] = value;
  }
  return {
    id: `dom-${element.tagName}-${depth}-${index}`,
    name: deriveTitle(element),
    type: "element",
    framework: "unknown",
    props: Object.keys(props).length > 0 ? props : undefined,
    children: childNodes,
    depth,
    domElement: element,
    isExpanded: depth < 2,
    hasChildren: childNodes.length > 0,
  };
}

function extractTree(maxDepth: number): ComponentNode | null {
  const framework = detectFramework();
  const rootEl =
    framework === "react"
      ? document.getElementById("root") ||
        document.getElementById("__next") ||
        (document.body.firstElementChild as HTMLElement)
      : framework === "vue"
        ? (document.querySelector("#app") as HTMLElement) ||
          (document.body.firstElementChild as HTMLElement)
        : document.body;

  if (!rootEl) return null;

  const rootName =
    framework === "react"
      ? "React Root"
      : framework === "vue"
        ? "Vue Root"
        : framework === "angular"
          ? "Angular Root"
          : framework === "svelte"
            ? "Svelte Root"
            : "DOM Tree";

  return {
    id: `${framework}-root`,
    name: rootName,
    type: "component",
    framework,
    children: Array.from(rootEl.children).map((child, i) =>
      domElementToNode(child as HTMLElement, 1, i, maxDepth),
    ),
    depth: 0,
    isExpanded: true,
    hasChildren: rootEl.children.length > 0,
  };
}

function getFrameworkIcon(fw: string): string {
  switch (fw) {
    case "react":
      return "⚛️";
    case "vue":
      return "🟢";
    case "angular":
      return "🅰️";
    case "svelte":
      return "🔶";
    default:
      return "🌲";
  }
}

function getTypeIcon(type: ComponentNode["type"]): string {
  switch (type) {
    case "component":
      return "⚙️";
    case "element":
      return "📄";
    case "text":
      return "📝";
    case "fragment":
      return "🧩";
    default:
      return "📦";
  }
}

function countNodes(node: ComponentNode): number {
  let count = 1;
  for (const child of node.children) count += countNodes(child);
  return count;
}

function findNode(
  node: ComponentNode | null,
  id: string,
): ComponentNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function filterTree(node: ComponentNode, f: string): ComponentNode | null {
  const matches = node.name.toLowerCase().includes(f);
  const filteredChildren: ComponentNode[] = [];
  for (const child of node.children) {
    const filtered = filterTree(child, f);
    if (filtered) filteredChildren.push(filtered);
  }
  if (matches || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren, isExpanded: true };
  }
  return null;
}

function buildNodeEl(
  node: ComponentNode,
  expandedNodes: Set<string>,
  selectedId: string | null,
  options?: { showProps?: boolean },
): HTMLElement {
  const showProps = options?.showProps ?? true;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedId === node.id;
  const indent = node.depth * 16;

  const row = document.createElement("div");
  row.className = "fdh-ct-node" + (isSelected ? " fdh-ct-selected" : "");
  row.dataset.nodeId = node.id;
  row.style.paddingLeft = indent + "px";

  const content = document.createElement("div");
  content.className = "fdh-ct-node-content";

  if (node.hasChildren) {
    const toggle = document.createElement("span");
    toggle.className = "fdh-ct-toggle";
    toggle.textContent = isExpanded ? "▼" : "▶";
    content.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "fdh-ct-spacer";
    content.appendChild(spacer);
  }

  const icon = document.createElement("span");
  icon.className = "fdh-ct-icon";
  icon.textContent = getTypeIcon(node.type);
  content.appendChild(icon);

  const fw = document.createElement("span");
  fw.className = "fdh-ct-fw";
  fw.textContent = getFrameworkIcon(node.framework);
  content.appendChild(fw);

  const name = document.createElement("span");
  name.className = "fdh-ct-name";
  name.textContent = node.name;
  name.title = node.name;
  content.appendChild(name);

  if (showProps && node.props && Object.keys(node.props).length > 0) {
    const badge = document.createElement("span");
    badge.className = "fdh-ct-badge";
    badge.textContent = String(Object.keys(node.props).length);
    content.appendChild(badge);
  }

  if (node.domElement && node.type === "component") {
    const srcBtn = document.createElement("span");
    srcBtn.className = "fdh-ct-badge";
    srcBtn.style.cssText = "cursor:pointer;background:#4f46e5;color:white;";
    srcBtn.textContent = "→VS";
    srcBtn.title = "Jump to source in VS Code";
    srcBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (node.domElement) {
        jumpToElementSource(node.domElement);
      }
    });
    content.appendChild(srcBtn);
  }

  row.appendChild(content);
  const fragment = document.createDocumentFragment();
  fragment.appendChild(row);

  if (isExpanded) {
    for (const child of node.children) {
      fragment.appendChild(
        buildNodeEl(child, expandedNodes, selectedId, options),
      );
    }
  }

  const wrapper = document.createElement("div");
  wrapper.appendChild(fragment);
  return wrapper;
}

export const componentTree: ToolDefinition = {
  id: "component-tree",
  name: "DOM Tree Viewer",
  description: "Walk and inspect the DOM tree hierarchy and element attributes",
  category: "inspection",
  icon: "GitBranch",
  configSchema: {
    maxDepth: {
      type: "slider",
      label: "Max Depth",
      default: 6,
      min: 1,
      max: 15,
      step: 1,
    },
    showProps: { type: "boolean", label: "Show Props", default: true },
    showState: { type: "boolean", label: "Show State", default: false },
    highlightUpdates: {
      type: "boolean",
      label: "Highlight Updates",
      default: true,
    },
    collapseThreshold: {
      type: "number",
      label: "Collapse Threshold",
      default: 50,
    },
  },
  run: (ctx, config) => {
    const maxDepth = (config?.maxDepth as number) ?? 6;
    const showProps = (config?.showProps as boolean) ?? true;
    const showState = (config?.showState as boolean) ?? false;
    const highlightUpdates = (config?.highlightUpdates as boolean) ?? true;
    const collapseThreshold = (config?.collapseThreshold as number) ?? 50;
    const framework = detectFramework();
    const expandedNodes = new Set<string>();
    let selectedId: string | null = null;
    let root: ComponentNode | null = null;
    let filter = "";

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:400px;max-height:80vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .fdh-ct-panel{background:#0f172a;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1);overflow:hidden;display:flex;flex-direction:column;max-height:80vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#e2e8f0;}
      .fdh-ct-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #334155;background:#1e293b;}
      .fdh-ct-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;}
      .fdh-ct-fw-badge{background:#4f46e5;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;}
      .fdh-ct-actions{display:flex;gap:4px;}
      .fdh-ct-actions button{background:transparent;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .fdh-ct-actions button:hover{background:#334155;color:#f8fafc;}
      .fdh-ct-toolbar{padding:12px 16px;border-bottom:1px solid #334155;}
      .fdh-ct-search{width:100%;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 12px;color:#f8fafc;font-size:13px;box-sizing:border-box;}
      .fdh-ct-search:focus{outline:none;border-color:#4f46e5;}
      .fdh-ct-search::placeholder{color:#64748b;}
      .fdh-ct-content{flex:1;overflow-y:auto;padding:8px 0;min-height:200px;}
      .fdh-ct-node{cursor:pointer;user-select:none;}
      .fdh-ct-node-content{display:flex;align-items:center;gap:6px;padding:6px 16px;transition:background .1s;}
      .fdh-ct-node:hover .fdh-ct-node-content{background:#1e293b;}
      .fdh-ct-selected .fdh-ct-node-content{background:#4f46e5!important;color:white;}
      .fdh-ct-toggle{font-size:10px;width:14px;height:14px;display:flex;align-items:center;justify-content:center;color:#64748b;cursor:pointer;}
      .fdh-ct-spacer{width:14px;}
      .fdh-ct-icon,.fdh-ct-fw{font-size:12px;width:16px;text-align:center;}
      .fdh-ct-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:12px;}
      .fdh-ct-badge{background:#334155;color:#94a3b8;padding:1px 6px;border-radius:10px;font-size:10px;}
      .fdh-ct-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid #334155;font-size:11px;color:#64748b;background:#1e293b;}
      .fdh-ct-empty{text-align:center;padding:40px;color:#64748b;}
      .fdh-ct-content::-webkit-scrollbar{width:8px;}
      .fdh-ct-content::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "fdh-ct-panel";

    const header = document.createElement("div");
    header.className = "fdh-ct-header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "fdh-ct-title";
    const fwIcon = document.createElement("span");
    fwIcon.textContent = getFrameworkIcon(framework);
    const titleText = document.createElement("span");
    titleText.textContent = "DOM Tree Viewer";
    const fwBadge = document.createElement("span");
    fwBadge.className = "fdh-ct-fw-badge";
    fwBadge.textContent =
      framework.charAt(0).toUpperCase() + framework.slice(1);
    titleDiv.append(fwIcon, titleText, fwBadge);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "fdh-ct-actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.dataset.action = "refresh";
    btnRefresh.textContent = "🔄";
    btnRefresh.title = "Refresh";
    const btnExpand = document.createElement("button");
    btnExpand.dataset.action = "expand";
    btnExpand.textContent = "⬇️";
    btnExpand.title = "Expand All";
    const btnCollapse = document.createElement("button");
    btnCollapse.dataset.action = "collapse";
    btnCollapse.textContent = "➡️";
    btnCollapse.title = "Collapse All";
    const btnClose = document.createElement("button");
    btnClose.dataset.action = "close";
    btnClose.textContent = "✕";
    btnClose.title = "Close";
    actionsDiv.append(btnRefresh, btnExpand, btnCollapse, btnClose);
    header.append(titleDiv, actionsDiv);

    const toolbar = document.createElement("div");
    toolbar.className = "fdh-ct-toolbar";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "fdh-ct-search";
    searchInput.placeholder = "Filter elements...";
    toolbar.appendChild(searchInput);

    const content = document.createElement("div");
    content.className = "fdh-ct-content";
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "fdh-ct-empty";
    emptyMsg.textContent = "Detecting framework...";
    content.appendChild(emptyMsg);

    const footer = document.createElement("div");
    footer.className = "fdh-ct-footer";
    const stats = document.createElement("span");
    stats.className = "fdh-ct-stats";
    stats.textContent = "0 components";
    const status = document.createElement("span");
    status.className = "fdh-ct-status";
    status.textContent = "Ready";
    footer.append(stats, status);

    panel.append(header, toolbar, content, footer);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function doExtract(): void {
      root = extractTree(maxDepth);
      if (root) {
        expandedNodes.add(root.id);
        for (const child of root.children) {
          if (child.depth < 2) expandedNodes.add(child.id);
        }
        if (collapseThreshold > 0) {
          const visit = (n: ComponentNode) => {
            if (n.hasChildren && n.children.length > collapseThreshold) {
              for (const c of n.children) expandedNodes.delete(c.id);
            }
            n.children.forEach(visit);
          };
          visit(root);
        }
      }
    }

    function render(): void {
      while (content.firstChild) content.removeChild(content.firstChild);
      if (!root) {
        const msg = document.createElement("div");
        msg.className = "fdh-ct-empty";
        msg.textContent = "No component tree detected";
        content.appendChild(msg);
        stats.textContent = "0 components";
        return;
      }
      let displayRoot = root;
      if (filter) displayRoot = filterTree(root, filter) || root;
      content.appendChild(
        buildNodeEl(displayRoot, expandedNodes, selectedId, { showProps }),
      );
      const total = countNodes(displayRoot);
      stats.textContent = total + " component" + (total !== 1 ? "s" : "");
    }

    function highlightNode(node: ComponentNode): void {
      if (!highlightUpdates) return;
      if (node.domElement) {
        const el = node.domElement;
        const orig = el.style.outline;
        el.style.outline = "2px solid #6366f1";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          el.style.outline = orig;
        }, 3000);
      }
    }

    panel.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === "close") {
        cleanup();
        return;
      }
      if (action === "refresh") {
        doExtract();
        render();
        return;
      }
      if (action === "expand") {
        const addAll = (n: ComponentNode) => {
          expandedNodes.add(n.id);
          n.children.forEach(addAll);
        };
        if (root) addAll(root);
        render();
        return;
      }
      if (action === "collapse") {
        expandedNodes.clear();
        if (root) expandedNodes.add(root.id);
        render();
        return;
      }

      const nodeEl = target.closest("[data-node-id]") as HTMLElement;
      if (!nodeEl) return;
      const nodeId = nodeEl.dataset.nodeId!;
      if (target.closest(".fdh-ct-toggle")) {
        if (expandedNodes.has(nodeId)) expandedNodes.delete(nodeId);
        else expandedNodes.add(nodeId);
        render();
      } else {
        selectedId = nodeId;
        const found = findNode(root, nodeId);
        if (found) highlightNode(found);
        render();
      }
    });

    searchInput.addEventListener("input", () => {
      filter = searchInput.value.toLowerCase();
      render();
      if (showState) {
        status.textContent = "Filtered";
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        doExtract();
        render();
      }, 500);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id"],
    });

    doExtract();
    render();

    function cleanup() {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
