import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";
import { toolMetadata } from "../metadata";

export const commandPalette: ToolDefinition = {
  id: "command-palette",
  name: "Command Palette",
  description: "Quick-access command palette for all tools and actions",
  category: "utility",
  icon: "Terminal",
  configSchema: {
    shortcut: {
      type: "string",
      label: "Keyboard Shortcut",
      default: "Ctrl+Shift+P",
    },
    showRecent: {
      type: "boolean",
      label: "Show Recent Commands",
      default: true,
    },
    maxRecent: {
      type: "slider",
      label: "Max Recent",
      default: 5,
      min: 1,
      max: 20,
      step: 1,
    },
    fuzzySearch: { type: "boolean", label: "Fuzzy Search", default: true },
  },
  run: (ctx, config) => {
    const {
      _shortcut = "Ctrl+Shift+P",
      _showRecent = true,
      _maxRecent = 5,
      fuzzySearch = true,
    } = config ?? {};

    let isOpen = false;
    let panel: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let filteredTools: ToolEntry[] = [];
    let disposed = false;
    let previouslyFocused: HTMLElement | null = null;

    interface ToolEntry {
      id: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      keywords: string[];
    }

    // Auto-derive the tool list from the central metadata registry so the
    // palette never drifts out of sync with the actual tool catalog. The
    // previous hardcoded list covered only 15 of the 50+ tools.
    const allTools: ToolEntry[] = Object.values(toolMetadata).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      icon: m.icon,
      category: m.category,
      keywords: (m.name + " " + m.description + " " + m.category)
        .toLowerCase()
        .split(/\W+/)
        .filter(Boolean),
    }));

    filteredTools = [...allTools];

    function fuzzyMatch(query: string, text: string): boolean {
      const q = query.toLowerCase();
      const t = text.toLowerCase();
      let qi = 0;
      for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
      }
      return qi === q.length;
    }

    function getIconSvg(icon: string): string {
      const icons: Record<string, string> = {
        CheckCircle:
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        Smartphone:
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
        Camera:
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        FileBarChart:
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="8" y1="18" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="10"/></svg>',
        Database:
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      };
      return icons[icon] || icons.Database;
    }

    function appendItemToList(
      listEl: HTMLElement,
      tool: ToolEntry,
      index: number,
    ): HTMLElement {
      const item = document.createElement("div");
      item.dataset.index = String(index);
      item.dataset.toolId = tool.id;
      item.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;";

      const iconSpan = document.createElement("span");
      iconSpan.style.color = index === selectedIndex ? "#3b82f6" : "#64748b";
      iconSpan.style.display = "flex";
      iconSpan.style.alignItems = "center";
      // getIconSvg returns a hardcoded SVG literal keyed off a registry enum — no user input. Audited Phase 1.1.
      // eslint-disable-next-line no-restricted-syntax
      iconSpan.innerHTML = getIconSvg(tool.icon);

      const textDiv = document.createElement("div");
      textDiv.style.cssText = "flex:1;min-width:0;";

      const nameDiv = document.createElement("div");
      nameDiv.style.cssText =
        "font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      nameDiv.style.color = index === selectedIndex ? "#e2e8f0" : "#cbd5e1";
      nameDiv.textContent = tool.name;

      const descDiv = document.createElement("div");
      descDiv.style.cssText =
        "font-size:11px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      descDiv.textContent = tool.description;

      textDiv.appendChild(nameDiv);
      textDiv.appendChild(descDiv);

      const catSpan = document.createElement("span");
      catSpan.style.cssText =
        "font-size:10px;padding:2px 6px;background:#1e293b;border-radius:4px;color:#64748b;";
      catSpan.textContent = tool.category;

      item.appendChild(iconSpan);
      item.appendChild(textDiv);
      item.appendChild(catSpan);

      item.addEventListener("click", () => activateTool(tool.id));
      item.addEventListener("mouseenter", () => {
        selectedIndex = index;
        updateSelection();
      });

      listEl.appendChild(item);
      return item;
    }

    function renderList(listEl: HTMLElement): void {
      listEl.textContent = "";
      if (filteredTools.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText =
          "padding:24px;text-align:center;color:#64748b;font-size:13px;";
        empty.textContent = "No matching tools found";
        listEl.appendChild(empty);
        return;
      }
      filteredTools.forEach((tool, i) => appendItemToList(listEl, tool, i));
    }

    function updateSelection(): void {
      if (!panel) return;
      const items = panel.querySelectorAll("[data-index]");
      items.forEach((item, i) => {
        const el = item as HTMLElement;
        el.style.background =
          i === selectedIndex ? "rgba(59,130,246,0.15)" : "";
        const nameEl = el.querySelector("div > div:first-child") as HTMLElement;
        if (nameEl)
          nameEl.style.color = i === selectedIndex ? "#e2e8f0" : "#cbd5e1";
        const iconEl = el.querySelector("span") as HTMLElement;
        if (iconEl)
          iconEl.style.color = i === selectedIndex ? "#3b82f6" : "#64748b";
      });
      const selected = panel.querySelector(
        '[data-index="' + selectedIndex + '"]',
      );
      selected?.scrollIntoView({ block: "nearest" });
    }

    function openPalette(): void {
      if (isOpen || disposed) return;
      previouslyFocused = document.activeElement as HTMLElement;
      isOpen = true;
      selectedIndex = 0;
      filteredTools = [...allTools];
      panel = createPanel();
      addOverlayElement(panel);
      setTimeout(() => {
        panel?.querySelector("input")?.focus();
      }, 50);
    }

    function closePalette(): void {
      if (!isOpen || disposed) return;
      isOpen = false;
      if (panel) {
        removeOverlayElement(panel);
        panel = null;
      }
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    }

    function createPanel(): HTMLDivElement {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:auto;font-family:system-ui,-apple-system,sans-serif;";

      // Backdrop
      const backdrop = document.createElement("div");
      backdrop.dataset.action = "backdrop";
      backdrop.style.cssText =
        "position:absolute;inset:0;background:rgba(0,0,0,0.4);";
      backdrop.addEventListener("click", closePalette);
      el.appendChild(backdrop);

      // Modal container
      const modal = document.createElement("div");
      modal.style.cssText =
        "position:relative;width:560px;max-width:90vw;margin:20vh auto 0;background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;";

      // Search row
      const searchRow = document.createElement("div");
      searchRow.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #1e293b;";

      const searchIcon = document.createElement("span");
      // Static SVG literal — no user input. Audited Phase 1.1.
      // eslint-disable-next-line no-restricted-syntax
      searchIcon.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      searchRow.appendChild(searchIcon);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Type a command or search tools...";
      input.style.cssText =
        "flex:1;background:none;border:none;outline:none;color:#e2e8f0;font-size:14px;font-family:inherit;";
      searchRow.appendChild(input);

      const escHint = document.createElement("kbd");
      escHint.style.cssText =
        "padding:2px 5px;background:#1e293b;border:1px solid #334155;border-radius:3px;font-size:11px;color:#475569;";
      escHint.textContent = "ESC";
      searchRow.appendChild(escHint);

      modal.appendChild(searchRow);

      // List
      const list = document.createElement("div");
      list.dataset.list = "";
      list.style.cssText = "max-height:320px;overflow-y:auto;padding:6px 0;";
      renderList(list);
      modal.appendChild(list);

      // Footer
      const footer = document.createElement("div");
      footer.style.cssText =
        "padding:8px 16px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;font-size:11px;color:#475569;";

      const countSpan = document.createElement("span");
      countSpan.textContent = filteredTools.length + " tools available";
      footer.appendChild(countSpan);

      const hintSpan = document.createElement("span");
      // Static string with inline styles — no user input. Audited Phase 1.1.
      // eslint-disable-next-line no-restricted-syntax
      hintSpan.innerHTML =
        '<kbd style="padding:1px 4px;background:#1e293b;border:1px solid #334155;border-radius:3px;">↑↓</kbd> navigate &nbsp; <kbd style="padding:1px 4px;background:#1e293b;border:1px solid #334155;border-radius:3px;">↵</kbd> select';
      footer.appendChild(hintSpan);

      modal.appendChild(footer);
      el.appendChild(modal);

      // Input handlers
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        if (!query) {
          filteredTools = [...allTools];
        } else {
          filteredTools = allTools.filter((tool) => {
            const text = (
              tool.name +
              " " +
              tool.description +
              " " +
              tool.keywords.join(" ")
            ).toLowerCase();
            if (fuzzySearch) {
              return (
                fuzzyMatch(query, tool.name) ||
                fuzzyMatch(query, tool.description) ||
                text.includes(query)
              );
            }
            return text.includes(query);
          });
        }
        selectedIndex = 0;
        renderList(list);
        countSpan.textContent = filteredTools.length + " tools available";
      });

      input.addEventListener("keydown", (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            selectedIndex = Math.min(
              selectedIndex + 1,
              filteredTools.length - 1,
            );
            updateSelection();
            break;
          case "ArrowUp":
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection();
            break;
          case "Enter":
            e.preventDefault();
            if (filteredTools[selectedIndex])
              activateTool(filteredTools[selectedIndex].id);
            break;
          case "Escape":
            e.preventDefault();
            closePalette();
            break;
        }
      });

      return el;
    }

    function activateTool(toolId: string): void {
      closePalette();
      // Previously: window.postMessage({ type: 'FDH_ACTIVATE_TOOL', toolId })
      // — but nothing in the codebase listened for it, so the palette could
      // not actually launch any tool. Route through the existing
      // BG_ACTIVATE_TOOL message that content.ts already handles.
      browser.runtime
        .sendMessage({ type: "BG_ACTIVATE_TOOL", toolId })
        .catch(() => {
          // Content scripts can receive their own runtime messages; if this
          // ever fails (older Chrome), fall back to the legacy postMessage so
          // any future listener can pick it up.
          window.postMessage({ type: "FDH_ACTIVATE_TOOL", toolId }, "*");
        });
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) closePalette();
        else openPalette();
        return;
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      closePalette();
      document.removeEventListener("keydown", handleKeyDown, true);
    };

    ctx.onInvalidated(cleanup);

    return cleanup;
  },
};
