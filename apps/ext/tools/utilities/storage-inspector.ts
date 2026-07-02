import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

interface StorageEntry {
  key: string;
  value: string;
  size: number;
  attributes?: string;
}

function inferCookieAttributes(name: string): string[] {
  const attrs: string[] = [];
  if (name.startsWith("__Secure-") || name.startsWith("__Host-")) {
    attrs.push("Secure");
  }
  if (name.startsWith("__Host-")) {
    attrs.push("Path=/");
  }
  return attrs;
}

async function loadCookieEntries(): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  const seen = new Set<string>();

  interface CookieStoreItem {
    name: string;
    value?: string;
    secure?: boolean;
    sameSite?: string;
    path?: string;
  }

  const cookieStore = (
    window as Window & {
      cookieStore?: { getAll(): Promise<CookieStoreItem[]> };
    }
  ).cookieStore;
  if (cookieStore?.getAll) {
    try {
      const cookies = (await cookieStore.getAll()) as CookieStoreItem[];
      for (const cookie of cookies) {
        if (!cookie.name) continue;
        seen.add(cookie.name);
        const attrs: string[] = [];
        if (cookie.secure) attrs.push("Secure");
        if (cookie.sameSite) attrs.push(`SameSite=${cookie.sameSite}`);
        if (cookie.path) attrs.push(`Path=${cookie.path}`);
        const value = cookie.value ?? "";
        entries.push({
          key: cookie.name,
          value,
          size: new Blob([value]).size,
          attributes: attrs.length > 0 ? attrs.join("; ") : undefined,
        });
      }
    } catch {
      // Fall back to document.cookie below.
    }
  }

  document.cookie.split(";").forEach((c) => {
    const [k, ...rest] = c.split("=");
    const key = k.trim();
    if (!key || seen.has(key)) return;
    const val = rest.join("=").trim();
    const inferred = inferCookieAttributes(key);
    entries.push({
      key,
      value: val,
      size: new Blob([val]).size,
      attributes: inferred.length > 0 ? inferred.join("; ") : undefined,
    });
  });

  return entries;
}

async function loadIndexedDbEntries(): Promise<StorageEntry[]> {
  if (typeof indexedDB.databases !== "function") {
    return [
      {
        key: "(unsupported)",
        value: "indexedDB.databases() is not available in this browser",
        size: 0,
      },
    ];
  }

  try {
    const databases = await indexedDB.databases();
    if (databases.length === 0) {
      return [];
    }
    return databases.map((db) => {
      const version = db.version ?? "unknown";
      const value = `version ${version}`;
      return {
        key: db.name ?? "(unnamed)",
        value,
        size: new Blob([value]).size,
      };
    });
  } catch (err) {
    return [
      {
        key: "(error)",
        value:
          err instanceof Error
            ? err.message
            : "Failed to list IndexedDB databases",
        size: 0,
      },
    ];
  }
}

export const storageInspector: ToolDefinition = {
  id: "storage-inspector",
  name: "Storage Inspector",
  description: "Browse and manage localStorage, sessionStorage, and cookies",
  category: "utility",
  icon: "Database",
  configSchema: {
    showLocalStorage: {
      type: "boolean",
      label: "Show localStorage",
      default: true,
    },
    showSessionStorage: {
      type: "boolean",
      label: "Show sessionStorage",
      default: true,
    },
    showCookies: { type: "boolean", label: "Show Cookies", default: true },
    showIndexedDB: { type: "boolean", label: "Show IndexedDB", default: false },
    searchQuery: { type: "string", label: "Search", default: "" },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const showLS = (cfg.showLocalStorage as boolean) ?? true;
    const showSS = (cfg.showSessionStorage as boolean) ?? true;
    const showCookies = (cfg.showCookies as boolean) ?? true;
    const showIndexedDB = (cfg.showIndexedDB as boolean) ?? false;

    const overlays: HTMLElement[] = [];
    let disposed = false;
    let activeTab = showLS
      ? "localStorage"
      : showSS
        ? "sessionStorage"
        : showIndexedDB
          ? "indexedDB"
          : "cookies";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:440px;max-height:520px;z-index:2147483647;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:14px;";
    title.textContent = "Storage Inspector";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;
    const exportBtn = document.createElement("button");
    exportBtn.style.cssText =
      "background:transparent;border:1px solid #475569;color:#94a3b8;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-right:8px;";
    exportBtn.textContent = "Export";
    header.append(title, exportBtn, closeBtn);

    const tabBar = document.createElement("div");
    tabBar.style.cssText =
      "display:flex;background:#1e293b;border-bottom:1px solid #334155;";

    const cookieNote = document.createElement("div");
    cookieNote.style.cssText =
      "display:none;padding:8px 14px;background:#172554;border-bottom:1px solid #334155;font-size:11px;color:#93c5fd;line-height:1.4;";
    cookieNote.textContent =
      "Note: HttpOnly cookies are not visible via document.cookie. Only non-HttpOnly cookies appear here. Secure and SameSite are shown when available from the Cookie Store API or inferable from cookie name prefixes.";

    function createTab(label: string, key: string): HTMLButtonElement {
      const tab = document.createElement("button");
      tab.style.cssText = `flex:1;padding:8px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:background .15s;background:${activeTab === key ? "#0f172a" : "transparent"};color:${activeTab === key ? "#e2e8f0" : "#64748b"};border-bottom:2px solid ${activeTab === key ? "#3b82f6" : "transparent"};`;
      tab.textContent = label;
      tab.onclick = () => {
        activeTab = key;
        tabBar.querySelectorAll("button").forEach((b) => {
          b.style.background = "transparent";
          b.style.color = "#64748b";
          b.style.borderBottom = "2px solid transparent";
        });
        tab.style.background = "#0f172a";
        tab.style.color = "#e2e8f0";
        tab.style.borderBottom = "2px solid #3b82f6";
        cookieNote.style.display = activeTab === "cookies" ? "block" : "none";
        void renderEntries();
      };
      return tab;
    }

    if (showLS) tabBar.appendChild(createTab("localStorage", "localStorage"));
    if (showSS)
      tabBar.appendChild(createTab("sessionStorage", "sessionStorage"));
    if (showCookies) tabBar.appendChild(createTab("Cookies", "cookies"));
    if (showIndexedDB) tabBar.appendChild(createTab("IndexedDB", "indexedDB"));

    const searchWrap = document.createElement("div");
    searchWrap.style.cssText =
      "padding:8px 14px;border-bottom:1px solid #334155;";
    const searchInput = document.createElement("input");
    searchInput.style.cssText =
      "width:100%;padding:6px 10px;background:#1e293b;border:1px solid #475569;border-radius:4px;color:#e2e8f0;font-size:12px;outline:none;";
    searchInput.placeholder = "Search keys...";
    searchInput.oninput = () => {
      void renderEntries();
    };
    searchWrap.appendChild(searchInput);

    const listContainer = document.createElement("div");
    listContainer.style.cssText = "flex:1;overflow-y:auto;padding:4px 0;";

    const footer = document.createElement("div");
    footer.style.cssText =
      "padding:8px 14px;background:#1e293b;border-top:1px solid #334155;font-size:11px;color:#64748b;display:flex;justify-content:space-between;";

    panel.append(header, tabBar, cookieNote, searchWrap, listContainer, footer);
    cookieNote.style.display = activeTab === "cookies" ? "block" : "none";

    let cachedEntries: StorageEntry[] = [];

    async function getEntries(): Promise<StorageEntry[]> {
      const entries: StorageEntry[] = [];
      try {
        if (activeTab === "localStorage") {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              const val = localStorage.getItem(key) || "";
              entries.push({ key, value: val, size: new Blob([val]).size });
            }
          }
        } else if (activeTab === "sessionStorage") {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              const val = sessionStorage.getItem(key) || "";
              entries.push({ key, value: val, size: new Blob([val]).size });
            }
          }
        } else if (activeTab === "cookies") {
          return loadCookieEntries();
        } else if (activeTab === "indexedDB") {
          return loadIndexedDbEntries();
        }
      } catch {
        // storage may be restricted
      }
      return entries;
    }

    async function renderEntries() {
      while (listContainer.firstChild)
        listContainer.removeChild(listContainer.firstChild);
      cachedEntries = await getEntries();
      const entries = cachedEntries;
      const query = searchInput.value.toLowerCase();
      const filtered = query
        ? entries.filter(
            (e) =>
              e.key.toLowerCase().includes(query) ||
              e.value.toLowerCase().includes(query) ||
              (e.attributes?.toLowerCase().includes(query) ?? false),
          )
        : entries;

      footer.textContent = `${filtered.length} entries${query ? " (filtered)" : ""} | Total: ${(filtered.reduce((s, e) => s + e.size, 0) / 1024).toFixed(1)}KB`;

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:30px;text-align:center;color:#64748b;";
        empty.textContent =
          activeTab === "indexedDB"
            ? "No IndexedDB databases found"
            : "No entries found";
        listContainer.appendChild(empty);
        return;
      }

      for (const entry of filtered.slice(0, 200)) {
        const row = document.createElement("div");
        row.style.cssText =
          "padding:6px 14px;border-bottom:1px solid #1e293b;display:flex;align-items:flex-start;gap:8px;";

        const keySpan = document.createElement("span");
        keySpan.style.cssText =
          "font-weight:500;min-width:120px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#e2e8f0;flex-shrink:0;";
        keySpan.textContent = entry.key;
        keySpan.title = entry.key;

        const valueWrap = document.createElement("div");
        valueWrap.style.cssText = "flex:1;min-width:0;";

        const valSpan = document.createElement("div");
        valSpan.style.cssText =
          "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#94a3b8;font-family:monospace;";
        valSpan.textContent = entry.value.slice(0, 100);
        valSpan.title = entry.value;
        valueWrap.appendChild(valSpan);

        if (entry.attributes) {
          const attrSpan = document.createElement("div");
          attrSpan.style.cssText =
            "font-size:10px;color:#64748b;margin-top:2px;font-family:monospace;";
          attrSpan.textContent = entry.attributes;
          valueWrap.appendChild(attrSpan);
        }

        const sizeSpan = document.createElement("span");
        sizeSpan.style.cssText =
          "font-size:10px;color:#64748b;min-width:50px;text-align:right;flex-shrink:0;";
        sizeSpan.textContent =
          entry.size > 1024
            ? (entry.size / 1024).toFixed(1) + "KB"
            : entry.size + "B";

        const delBtn = document.createElement("button");
        delBtn.style.cssText =
          "background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:11px;flex-shrink:0;padding:0 2px;";
        delBtn.textContent = "✕";
        delBtn.title = "Delete";
        if (activeTab === "localStorage" || activeTab === "sessionStorage") {
          delBtn.onclick = () => {
            try {
              if (activeTab === "localStorage")
                localStorage.removeItem(entry.key);
              else if (activeTab === "sessionStorage")
                sessionStorage.removeItem(entry.key);
            } catch {
              // ignore
            }
            void renderEntries();
          };
        } else {
          delBtn.style.visibility = "hidden";
        }

        row.append(keySpan, valueWrap, sizeSpan, delBtn);
        listContainer.appendChild(row);
      }
    }

    exportBtn.onclick = () => {
      const data = cachedEntries;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    void renderEntries();

    function cleanup() {
      if (disposed) return;
      disposed = true;
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
