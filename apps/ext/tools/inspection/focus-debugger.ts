import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  clearAllOverlays,
  createHighlightBox,
} from "@/content/overlay-manager";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "details",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  "audio[controls]",
  "video[controls]",
  "iframe",
].join(", ");

interface FocusableItem {
  element: HTMLElement;
  selector: string;
  tabIndex: number;
  tabOrder: number;
  ariaLabel?: string;
}

interface FocusHistoryEntry {
  timestamp: number;
  element: string;
  selector: string;
  trigger: "keyboard" | "mouse" | "script";
}

function generateSelector(el: HTMLElement): string {
  if (el.id) return "#" + CSS.escape(el.id);
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    let seg = current.tagName.toLowerCase();
    if (current.className && typeof current.className === "string") {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith("fdh-"))
        .join(".");
      if (classes) seg += "." + classes;
    }
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s: Element) => s.tagName === current!.tagName,
      );
      if (siblings.length > 1)
        seg += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
    }
    path.unshift(seg);
    current = parent;
  }
  return path.join(" > ");
}

function scanFocusable(): FocusableItem[] {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
  );
  return elements
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    })
    .map((el, index) => ({
      element: el,
      selector: generateSelector(el),
      tabIndex: el.tabIndex,
      tabOrder: index + 1,
      ariaLabel: el.getAttribute("aria-label") || undefined,
    }))
    .sort((a, b) => {
      const at = a.tabIndex === 0 ? Number.MAX_SAFE_INTEGER : a.tabIndex;
      const bt = b.tabIndex === 0 ? Number.MAX_SAFE_INTEGER : b.tabIndex;
      if (at !== bt) return at - bt;
      return a.tabOrder - b.tabOrder;
    })
    .map((item, index) => ({ ...item, tabOrder: index + 1 }));
}

function createOverlayBadge(
  item: FocusableItem,
  isCurrent: boolean,
): HTMLDivElement {
  const rect = item.element.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:2147483645;border:${isCurrent ? "3px solid #22c55e" : "2px solid #4f46e5"};border-radius:3px;box-shadow:${isCurrent ? "0 0 0 3px rgba(34,197,94,0.3)" : "0 0 0 2px rgba(79,70,229,0.2)"};`;

  const badge = document.createElement("div");
  badge.style.cssText = `position:absolute;top:-10px;left:-10px;background:${isCurrent ? "#22c55e" : "#4f46e5"};color:white;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center;font-family:monospace;`;
  badge.textContent = String(item.tabOrder);
  overlay.appendChild(badge);
  return overlay;
}

export const focusDebugger: ToolDefinition = {
  id: "focus-debugger",
  name: "Focus Debugger",
  description: "Debug focus order, tabindex, and keyboard navigation flow",
  category: "inspection",
  icon: "Focus",
  configSchema: {
    showFocusOrder: {
      type: "boolean",
      label: "Show Focus Order",
      default: true,
    },
    showTabindex: { type: "boolean", label: "Show Tabindex", default: true },
    highlightFocused: {
      type: "boolean",
      label: "Highlight Focused Element",
      default: true,
    },
    showFocusRing: { type: "boolean", label: "Show Focus Ring", default: true },
    trapFocus: { type: "boolean", label: "Trap Focus Mode", default: false },
  },
  run: (ctx, config) => {
    const showFocusOrder = (config?.showFocusOrder as boolean) ?? true;
    const showTabindex = (config?.showTabindex as boolean) ?? true;
    const highlightFocused = (config?.highlightFocused as boolean) ?? true;
    const showFocusRing = (config?.showFocusRing as boolean) ?? true;
    const trapFocus = (config?.trapFocus as boolean) ?? false;
    let focusableItems: FocusableItem[] = [];
    let focusHistory: FocusHistoryEntry[] = [];
    let currentFocused: HTMLElement | null = null;
    let lastKeyboardFocusTime = 0;
    const overlayEls: HTMLDivElement[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let focusTrapActive = false;
    let trappedTabbable: HTMLElement[] = [];
    let lastFocusedBeforeTrap: HTMLElement | null = null;

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:500px;max-height:80vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .fdh-fd-panel{background:#0f172a;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1);overflow:hidden;display:flex;flex-direction:column;max-height:80vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#e2e8f0;}
      .fdh-fd-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #334155;background:#1e293b;}
      .fdh-fd-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;}
      .fdh-fd-actions{display:flex;gap:4px;}
      .fdh-fd-actions button{background:transparent;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .fdh-fd-actions button:hover{background:#334155;color:#f8fafc;}
      .fdh-fd-content{flex:1;overflow-y:auto;padding:12px;min-height:200px;}
      .fdh-fd-item{background:#1e293b;border-radius:8px;padding:10px 12px;border:1px solid #334155;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
      .fdh-fd-item.current{border-color:#22c55e;background:rgba(34,197,94,.1);}
      .fdh-fd-order{background:#4f46e5;color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;min-width:20px;text-align:center;}
      .fdh-fd-tag{font-weight:600;color:#f8fafc;text-transform:lowercase;}
      .fdh-fd-ti{background:#f59e0b;color:#1e293b;padding:2px 6px;border-radius:4px;font-size:10px;}
      .fdh-fd-sel{font-family:monospace;font-size:11px;color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .fdh-fd-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid #334155;font-size:11px;color:#64748b;background:#1e293b;}
      .fdh-fd-empty{text-align:center;padding:40px;color:#64748b;}
      .fdh-fd-info{padding:8px 12px;background:#1e293b;border-radius:6px;margin-bottom:12px;font-size:12px;color:#94a3b8;}
      .fdh-fd-content::-webkit-scrollbar{width:8px;}
      .fdh-fd-content::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "fdh-fd-panel";

    const header = document.createElement("div");
    header.className = "fdh-fd-header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "fdh-fd-title";
    titleDiv.textContent = "🎯 Focus Debugger";
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "fdh-fd-actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.dataset.action = "refresh";
    btnRefresh.textContent = "🔄";
    const btnToggle = document.createElement("button");
    btnToggle.dataset.action = "toggle";
    btnToggle.textContent = "👁️";
    const btnClose = document.createElement("button");
    btnClose.dataset.action = "close";
    btnClose.textContent = "✕";
    actionsDiv.append(btnRefresh, btnToggle, btnClose);
    header.append(titleDiv, actionsDiv);

    const contentEl = document.createElement("div");
    contentEl.className = "fdh-fd-content";
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "fdh-fd-empty";
    emptyMsg.textContent = "Scanning focusable elements...";
    contentEl.appendChild(emptyMsg);

    const footer = document.createElement("div");
    footer.className = "fdh-fd-footer";
    const statsEl = document.createElement("span");
    statsEl.textContent = "0 elements";
    const statusEl = document.createElement("span");
    statusEl.textContent = "Ready";
    footer.append(statsEl, statusEl);

    panel.append(header, contentEl, footer);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    let overlaysVisible = true;

    function updateOverlays(): void {
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      if (!overlaysVisible || !showFocusOrder) return;

      for (const item of focusableItems) {
        const rect = item.element.getBoundingClientRect();
        if (
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth
        )
          continue;
        const overlay = createOverlayBadge(
          item,
          item.element === currentFocused,
        );
        addOverlayElement(overlay);
        overlayEls.push(overlay);
      }
    }

    function renderList(): void {
      while (contentEl.firstChild) contentEl.removeChild(contentEl.firstChild);
      if (focusableItems.length === 0) {
        const msg = document.createElement("div");
        msg.className = "fdh-fd-empty";
        msg.textContent = "No focusable elements found";
        contentEl.appendChild(msg);
        return;
      }

      const info = document.createElement("div");
      info.className = "fdh-fd-info";
      info.textContent = focusableItems.length + " focusable elements";
      contentEl.appendChild(info);

      for (const item of focusableItems) {
        const row = document.createElement("div");
        row.className =
          "fdh-fd-item" + (item.element === currentFocused ? " current" : "");

        const order = document.createElement("span");
        order.className = "fdh-fd-order";
        order.textContent = String(item.tabOrder);
        row.appendChild(order);

        const tag = document.createElement("span");
        tag.className = "fdh-fd-tag";
        tag.textContent = item.element.tagName.toLowerCase();
        row.appendChild(tag);

        if (showTabindex && item.tabIndex !== 0) {
          const ti = document.createElement("span");
          ti.className = "fdh-fd-ti";
          ti.textContent = 'tabindex="' + item.tabIndex + '"';
          row.appendChild(ti);
        }

        const sel = document.createElement("span");
        sel.className = "fdh-fd-sel";
        sel.textContent = item.selector;
        row.appendChild(sel);

        contentEl.appendChild(row);
      }

      statsEl.textContent =
        "Focus: " +
        (currentFocused ? findTabIndex() : "-") +
        " / " +
        focusableItems.length;
    }

    function findTabIndex(): number | undefined {
      const found = focusableItems.find((i) => i.element === currentFocused);
      return found?.tabOrder;
    }

    function refresh(): void {
      focusableItems = scanFocusable();
      updateOverlays();
      renderList();
    }

    function handleFocusIn(e: FocusEvent): void {
      const target = e.target as HTMLElement;
      if (!target) return;
      currentFocused = target;
      let trigger: "keyboard" | "mouse" | "script" = "script";
      if (Date.now() - lastKeyboardFocusTime < 100) trigger = "keyboard";
      else if (e.relatedTarget === null && document.hasFocus())
        trigger = "mouse";

      focusHistory.unshift({
        timestamp: Date.now(),
        element: target.tagName.toLowerCase(),
        selector: generateSelector(target),
        trigger,
      });
      if (focusHistory.length > 50) focusHistory = focusHistory.slice(0, 50);

      if (highlightFocused) {
        if (showFocusRing) {
          target.style.outline = target.style.outline || "";
          const prevOutline = target.style.outline;
          const prevOutlineOffset = target.style.outlineOffset;
          target.style.outline = "3px solid #22c55e";
          target.style.outlineOffset = "2px";
          window.setTimeout(() => {
            target.style.outline = prevOutline;
            target.style.outlineOffset = prevOutlineOffset;
          }, 1200);
        }
        updateOverlays();
        renderList();
      }
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Tab") {
        lastKeyboardFocusTime = Date.now();
        if (trapFocus && focusTrapActive && trappedTabbable.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const active = document.activeElement as HTMLElement | null;
          const idx = trappedTabbable.indexOf(active as HTMLElement);
          const shift = e.shiftKey;
          let next: HTMLElement;
          if (idx === -1) {
            next = shift
              ? trappedTabbable[trappedTabbable.length - 1]
              : trappedTabbable[0];
          } else {
            const delta = shift ? -1 : 1;
            const nextIdx =
              (idx + delta + trappedTabbable.length) % trappedTabbable.length;
            next = trappedTabbable[nextIdx];
          }
          next.focus();
          return;
        }
      }
      if (e.key === "Escape") {
        if (trapFocus && focusTrapActive) {
          focusTrapActive = false;
          trappedTabbable = [];
          if (lastFocusedBeforeTrap) {
            lastFocusedBeforeTrap.focus();
            lastFocusedBeforeTrap = null;
          }
          statusEl.textContent = "Trap off";
          return;
        }
        cleanup();
      }
    }

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refresh, 100);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["tabindex", "disabled", "hidden", "style"],
    });

    panel.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === "close") cleanup();
      else if (action === "refresh") {
        refresh();
        statusEl.textContent = "Refreshed";
        setTimeout(() => {
          statusEl.textContent = "Ready";
        }, 2000);
      } else if (action === "toggle") {
        if (trapFocus) {
          if (!focusTrapActive) {
            trappedTabbable = focusableItems.map((i) => i.element);
            focusTrapActive = true;
            lastFocusedBeforeTrap =
              (document.activeElement as HTMLElement) || null;
            statusEl.textContent = "Trap on";
          } else {
            focusTrapActive = false;
            trappedTabbable = [];
            if (lastFocusedBeforeTrap) {
              lastFocusedBeforeTrap.focus();
              lastFocusedBeforeTrap = null;
            }
            statusEl.textContent = "Trap off";
          }
          return;
        }
        overlaysVisible = !overlaysVisible;
        updateOverlays();
      }
    });

    refresh();

    function cleanup() {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
