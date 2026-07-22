import { TOOL_IDS } from "@/lib/constants";

import {
  sendChatMessage,
  sendRawRequest,
  loadConfig,
  isEnabled,
} from "@/lib/llm-service";
import type { PageContextData } from "@/lib/messaging/types";
import { getBridge, initBridge } from "@/lib/vscode-bridge";
import { getSecret, migrateLegacySecrets } from "@/lib/secrets";

/**
 * Read a persisted Zustand store from chrome.storage.local with a known shape.
 *
 * The chrome.storage.local.get() return type is `{ [key: string]: any }`,
 * but the indexed-access result is widened to `{}` when strict-mode tsc
 * touches it — leading to "Property 'state' does not exist on type '{}'" on
 * every read site. This helper does one cast at the boundary and gives the
 * call site the typed shape they expect.
 *
 * `T` is the persisted wrapper shape (typically `{ state: ..., version: ... }`).
 */
async function _readStored<T = unknown>(key: string): Promise<T | undefined> {
  const result = await browser.storage.local.get(key);
  return result[key] as T | undefined;
}

function registerBridgeRequestHandlers(): void {
  const bridge = getBridge();

  const forwardToContentScript = async (
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> => {
    const tabId = await getActiveTabId();
    if (!tabId) throw new Error("No active tab");
    const response = await browser.tabs.sendMessage(tabId, {
      type: "BG_VSCODE_REQUEST",
      method,
      params,
    });
    return response?.result ?? response;
  };

  bridge.onRequest("inspectElement", (_, params) =>
    forwardToContentScript("inspectElement", params),
  );
  bridge.onRequest("getPageContext", async () => {
    const tabId = await getActiveTabId();
    if (!tabId) throw new Error("No active tab");
    return collectPageContext(tabId);
  });
  bridge.onRequest("getDiagnostics", (_, params) =>
    forwardToContentScript("getDiagnostics", params),
  );
  bridge.onRequest("getCssRules", (_, params) =>
    forwardToContentScript("getCssRules", params),
  );
  bridge.onRequest("scanAccessibility", (_, params) =>
    forwardToContentScript("scanAccessibility", params),
  );
  bridge.onRequest("getSuggestions", (_, params) =>
    forwardToContentScript("getSuggestions", params),
  );
  bridge.onRequest("jumpToSource", (_, params) =>
    forwardToContentScript("jumpToSource", params),
  );
  bridge.onRequest("getComponentTree", (_, params) =>
    forwardToContentScript("getComponentTree", params),
  );
}

const COMMAND_TO_TOOL_ID: Record<string, string> = {
  "toggle-pesticide": TOOL_IDS.domOutliner,
  "toggle-spacing": TOOL_IDS.spacingVisualizer,
  "toggle-font-inspector": TOOL_IDS.fontInspector,
  "toggle-color-picker": TOOL_IDS.colorPicker,
  "toggle-pixel-ruler": TOOL_IDS.pixelRuler,
  "toggle-inspector": TOOL_IDS.elementInspector,
  "open-command-palette": TOOL_IDS.commandPalette,
  "toggle-css-inspector": TOOL_IDS.cssInspector,
  "toggle-contrast-checker": TOOL_IDS.contrastChecker,
  "toggle-layout-visualizer": TOOL_IDS.layoutVisualizer,
  "toggle-zindex-visualizer": TOOL_IDS.zIndexVisualizer,
  "toggle-tech-detector": TOOL_IDS.techDetector,
  "toggle-accessibility-audit": TOOL_IDS.accessibilityAudit,
  "toggle-network-analyzer": TOOL_IDS.networkAnalyzer,
  "toggle-screenshot-studio": TOOL_IDS.screenshotStudio,
  "toggle-ai-suggestions": TOOL_IDS.smartSuggestions,
  "toggle-component-tree": TOOL_IDS.componentTree,
  "toggle-flame-graph": TOOL_IDS.flameGraph,
  "toggle-storage-inspector": TOOL_IDS.storageInspector,
  "toggle-focus-debugger": TOOL_IDS.focusDebugger,
  "toggle-form-debugger": TOOL_IDS.formDebugger,
  "toggle-visual-regression": TOOL_IDS.visualRegression,
};

let pendingToggle: Promise<void> = Promise.resolve();
const pendingDebounce = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    resolve: (value: { toolId: string; enabled: boolean }) => void;
    payload: { toolId: string; config?: Record<string, unknown> };
    tabId?: number;
  }
>();
const DEBOUNCE_MS = 100;

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

/**
 * Deep-merge two settings objects. Plain objects are merged recursively;
 * arrays, primitives, and null are replaced wholesale (matches the
 * behavior callers expect from `setState({...})` semantics).
 */
function deepMergeSettings(
  base: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!incoming) return base ?? {};
  if (!base) return incoming;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key] as any) &&
      out[key] !== null
    ) {
      out[key] = deepMergeSettings(
        out[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function getActiveToolsCount(tabId?: number): Promise<number> {
  // The storage shape is global (not per-tab), so tabId is informational only.
  // We accept it for API symmetry but read from the shared store.
  void tabId;
  const result = await browser.storage.local.get("fdh-tools-storage");
  const state = result["fdh-tools-storage"] as { state?: any } | undefined;
  if (!state?.state?.activeTools) return 0;
  return Object.values(state.state.activeTools).filter(
    (t: unknown) => (t as { active: boolean }).active,
  ).length;
}

async function updateBadge(tabId?: number): Promise<void> {
  try {
    const count = await getActiveToolsCount(tabId);
    if (!tabId) {
      tabId = await getActiveTabId();
    }
    if (!tabId) return;

    await browser.action.setBadgeText({
      text: count > 0 ? String(count) : "",
      tabId,
    });
    await browser.action.setBadgeBackgroundColor({
      color: count > 0 ? "#10B981" : "#6B7280",
    });
  } catch {
    // Badge update can fail if tab is closed
  }
}

async function actuallyToggleTool(
  toolId: string,
  config: Record<string, unknown> | undefined,
  tabId: number,
): Promise<{ toolId: string; enabled: boolean }> {
  const result = await browser.storage.local.get("fdh-tools-storage");
  const state = result["fdh-tools-storage"] as { state?: any } | undefined;
  const activeTools = state?.state?.activeTools ?? {};
  const wasActive = activeTools[toolId]?.active ?? false;
  const newEnabled = !wasActive;

  try {
    if (newEnabled) {
      await browser.tabs.sendMessage(tabId, {
        type: "BG_ACTIVATE_TOOL",
        toolId,
        config,
      });
    } else {
      await browser.tabs.sendMessage(tabId, {
        type: "BG_DEACTIVATE_TOOL",
        toolId,
      });
    }
  } catch {
    // Content script may not be injected
  }

  activeTools[toolId] = {
    toolId,
    active: newEnabled,
    config: activeTools[toolId]?.config ?? config ?? {},
    activatedAt: Date.now(),
  };
  await browser.storage.local.set({
    "fdh-tools-storage": { state: { ...state?.state, activeTools } },
  });

  try {
    await browser.runtime.sendMessage({
      type: "BG_TOOL_STATE_CHANGED",
      toolId,
      enabled: newEnabled,
    });
  } catch {
    // Popup may be closed
  }

  await updateBadge(tabId);
  return { toolId, enabled: newEnabled };
}

function handleToggleTool(
  payload: { toolId: string; config?: Record<string, unknown> },
  sender?: chrome.runtime.MessageSender,
): Promise<{ toolId: string; enabled: boolean }> {
  const tabId = sender?.tab?.id;
  if (!tabId) {
    return getActiveTabId().then((id) => {
      if (!id) return Promise.reject(new Error("No active tab"));
      return debouncedToggle(payload, id);
    });
  }
  return debouncedToggle(payload, tabId);
}

function debouncedToggle(
  payload: { toolId: string; config?: Record<string, unknown> },
  tabId: number,
): Promise<{ toolId: string; enabled: boolean }> {
  const key = `${payload.toolId}:${tabId}`;
  const existing = pendingDebounce.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.resolve({ toolId: payload.toolId, enabled: false });
  }

  return new Promise<{ toolId: string; enabled: boolean }>((resolve) => {
    const timer = setTimeout(async () => {
      pendingDebounce.delete(key);
      await pendingToggle;
      const promise = actuallyToggleTool(payload.toolId, payload.config, tabId);
      pendingToggle = promise.then(
        () => {},
        () => {},
      );
      resolve(await promise);
    }, DEBOUNCE_MS);
    pendingDebounce.set(key, { timer, resolve, payload, tabId });
  });
}

async function getAIConfig(): Promise<{
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: string;
} | null> {
  const result = await browser.storage.local.get("fdh-settings-storage");
  const settings = (
    result["fdh-settings-storage"] as { state?: any } | undefined
  )?.state;
  if (!settings?.ai?.enabled) return null;
  const provider = settings.ai.provider || "openrouter";
  // Read from encrypted-at-rest storage; fall back to legacy plaintext once
  // for the migration window (see lib/secrets.ts::migrateLegacySecrets).
  const apiKey = (await getSecret("aiApiKey")) || settings.ai.apiKey || "";
  if (provider !== "ollama" && !apiKey) return null;
  return {
    apiKey,
    model: settings.ai.model || "openai/gpt-4o-mini",
    baseUrl: settings.ai.baseUrl || "https://openrouter.ai/api/v1",
    provider,
  };
}

async function collectPageContext(
  tabId: number,
): Promise<PageContextData | null> {
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "BG_COLLECT_PAGE_CONTEXT",
    });
    return response?.data ?? null;
  } catch {
    // Content script not available
    const tab = await browser.tabs.get(tabId);
    return {
      url: tab?.url ?? "",
      title: tab?.title ?? "",
      viewport: { width: 0, height: 0 },
      domStats: {
        totalElements: 0,
        images: 0,
        links: 0,
        headings: 0,
        scripts: 0,
        stylesheets: 0,
        forms: 0,
        inputs: 0,
        imagesWithoutAlt: 0,
        inputsWithoutLabel: 0,
      },
      headingHierarchy: [],
      performance: {
        domContentLoaded: 0,
        loadComplete: 0,
        domInteractive: 0,
        transferSize: 0,
      },
      css: { stylesheetCount: 0, customPropertyCount: 0, inlineStyles: 0 },
      storage: { localStorageKeys: 0, sessionStorageKeys: 0, cookieCount: 0 },
      meta: {},
      techStack: [],
      consoleErrors: [],
    };
  }
}

function buildContextMenus() {
  browser.contextMenus.removeAll(() => {
    // Top-level quick action
    browser.contextMenus.create({
      id: "fdh-inspect-element",
      title: "FDH: Inspect Element",
      contexts: ["page", "link", "image"],
    });

    // Copy CSS Selector
    browser.contextMenus.create({
      id: "fdh-copy-selector",
      title: "FDH: Copy CSS Selector",
      contexts: ["page", "selection", "link", "image"],
    });

    browser.contextMenus.create({
      id: "fdh-sep1",
      type: "separator",
      contexts: ["page"],
    });

    // Inspection tools submenu
    browser.contextMenus.create({
      id: "fdh-inspection",
      title: "FDH: Inspection",
      contexts: ["page"],
    });
    const inspectionTools = [
      { id: "dom-outliner", title: "DOM Outliner" },
      { id: "element-inspector", title: "Element Inspector" },
      { id: "smart-element-picker", title: "Smart Element Picker" },
      { id: "component-tree", title: "DOM Tree Viewer" },
      { id: "tech-detector", title: "Tech Detector" },
    ];
    for (const tool of inspectionTools) {
      browser.contextMenus.create({
        id: `fdh-toggle-${tool.id}`,
        title: tool.title,
        parentId: "fdh-inspection",
        contexts: ["page"],
      });
    }

    // CSS tools submenu
    browser.contextMenus.create({
      id: "fdh-css-tools",
      title: "FDH: CSS Tools",
      contexts: ["page"],
    });
    const cssTools = [
      { id: "css-inspector", title: "CSS Inspector" },
      { id: "color-picker", title: "Color Picker" },
      { id: "grid-overlay", title: "Grid Overlay" },
      { id: "contrast-checker", title: "Contrast Checker" },
      { id: "css-scanner", title: "CSS Scanner" },
      { id: "layout-visualizer", title: "Layout Visualizer" },
    ];
    for (const tool of cssTools) {
      browser.contextMenus.create({
        id: `fdh-toggle-${tool.id}`,
        title: tool.title,
        parentId: "fdh-css-tools",
        contexts: ["page"],
      });
    }

    // Performance tools submenu
    browser.contextMenus.create({
      id: "fdh-performance",
      title: "FDH: Performance",
      contexts: ["page"],
    });
    const perfTools = [
      { id: "network-analyzer", title: "Network Analyzer" },
      { id: "performance-budget", title: "Performance Budget" },
      { id: "flame-graph", title: "Performance Entries Viewer" },
    ];
    for (const tool of perfTools) {
      browser.contextMenus.create({
        id: `fdh-toggle-${tool.id}`,
        title: tool.title,
        parentId: "fdh-performance",
        contexts: ["page"],
      });
    }

    // Accessibility tools submenu
    browser.contextMenus.create({
      id: "fdh-accessibility",
      title: "FDH: Accessibility",
      contexts: ["page"],
    });
    const a11yTools = [
      { id: "accessibility-audit", title: "Accessibility Audit" },
      { id: "focus-debugger-a11y", title: "Focus Debugger (A11y)" },
    ];
    for (const tool of a11yTools) {
      browser.contextMenus.create({
        id: `fdh-toggle-${tool.id}`,
        title: tool.title,
        parentId: "fdh-accessibility",
        contexts: ["page"],
      });
    }

    browser.contextMenus.create({
      id: "fdh-sep2",
      type: "separator",
      contexts: ["page"],
    });

    // Disable all
    browser.contextMenus.create({
      id: "fdh-disable-all",
      title: "FDH: Disable All Tools",
      contexts: ["page"],
    });
  });
}

export default defineBackground(() => {
  // One-time migration of any pre-0.4 plaintext secrets into the encrypted
  // store. Idempotent; safe to call on every SW startup.
  void migrateLegacySecrets().catch((err) => {
    console.warn("[FDH] Secret migration failed:", err);
  });

  // Message handling
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msg = message as {
      type: string;
      toolId?: string;
      config?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      content?: string;
      tabId?: number;
      history?: { role: string; content: string }[];
    };

    switch (msg.type) {
      case "POPUP_ACTIVATE_TOOL":
      case "POPUP_DEACTIVATE_TOOL": {
        const isActivate = msg.type === "POPUP_ACTIVATE_TOOL";
        const tabId = sender.tab?.id;
        if (!tabId) {
          getActiveTabId().then((id) => {
            if (id) {
              browser.tabs
                .sendMessage(id, {
                  type: isActivate ? "BG_ACTIVATE_TOOL" : "BG_DEACTIVATE_TOOL",
                  toolId: msg.toolId,
                  config: msg.config,
                })
                .catch(() => {});
            }
          });
        } else {
          browser.tabs
            .sendMessage(tabId, {
              type: isActivate ? "BG_ACTIVATE_TOOL" : "BG_DEACTIVATE_TOOL",
              toolId: msg.toolId,
              config: msg.config,
            })
            .catch(() => {});
        }
        handleToggleTool({ toolId: msg.toolId!, config: msg.config }, sender)
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ error: String(err) }));
        return true;
      }

      case "POPUP_DEACTIVATE_ALL": {
        const tabId = sender.tab?.id ?? undefined;
        if (tabId) {
          browser.tabs
            .sendMessage(tabId, { type: "BG_DEACTIVATE_ALL" })
            .catch(() => {});
        }
        browser.storage.local.get("fdh-tools-storage").then((result) => {
          const state = result["fdh-tools-storage"] as
            | { state?: any }
            | undefined;
          if (state?.state?.activeTools) {
            for (const key of Object.keys(state.state.activeTools)) {
              state.state.activeTools[key].active = false;
            }
            browser.storage.local.set({ "fdh-tools-storage": state });
          }
          updateBadge(tabId);
        });
        sendResponse({ success: true });
        return false;
      }

      case "POPUP_GET_TAB_STATUS": {
        const tabId = sender.tab?.id;
        sendResponse({ tabId, supported: tabId !== undefined });
        return false;
      }

      case "POPUP_GET_TOOL_STATE": {
        browser.storage.local.get("fdh-tools-storage").then((result) => {
          const state = result["fdh-tools-storage"] as
            | { state?: any }
            | undefined;
          const toolState = state?.state?.activeTools?.[msg.toolId!] ?? null;
          sendResponse(toolState);
        });
        return true;
      }

      case "POPUP_GET_ALL_TOOL_STATES": {
        browser.storage.local.get("fdh-tools-storage").then((result) => {
          const state = result["fdh-tools-storage"] as
            | { state?: any }
            | undefined;
          sendResponse(state?.state?.activeTools ?? {});
        });
        return true;
      }

      case "POPUP_GET_SETTINGS": {
        browser.storage.local.get("fdh-settings-storage").then((result) => {
          const state = result["fdh-settings-storage"] as
            | { state?: any }
            | undefined;
          sendResponse(state?.state ?? null);
        });
        return true;
      }

      case "POPUP_UPDATE_SETTINGS": {
        // Deep-merge the incoming settings into the existing settings store
        // rather than replacing wholesale — a partial update from the popup
        // would otherwise wipe unrelated keys (apiKeys, theme, etc.).
        (async () => {
          try {
            const existing = await browser.storage.local.get(
              "fdh-settings-storage",
            );
            const existingState = (
              existing["fdh-settings-storage"] as { state?: any } | undefined
            )?.state;
            const merged = deepMergeSettings(existingState, msg.settings);
            await browser.storage.local.set({
              "fdh-settings-storage": { state: merged },
            });
            sendResponse({ success: true });
          } catch (err) {
            sendResponse({ success: false, error: String(err) });
          }
        })();
        return true;
      }

      case "POPUP_SEND_AI_PROMPT": {
        (async () => {
          const aiConfig = await getAIConfig();
          if (!aiConfig) {
            sendResponse({
              error: "AI not configured. Open Settings to add your API key.",
            });
            return;
          }

          const tabId = await getActiveTabId();
          const pageContext = tabId ? await collectPageContext(tabId) : null;

          const llmMessages = (msg.history ?? []).map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));
          llmMessages.push({ role: "user", content: msg.content! });

          const messageId = crypto.randomUUID();
          sendResponse({ messageId });

          await sendChatMessage(
            aiConfig,
            llmMessages,
            pageContext
              ? {
                  url: pageContext.url,
                  title: pageContext.title,
                  viewport: `${pageContext.viewport.width}x${pageContext.viewport.height}`,
                  techStack: pageContext.techStack,
                  pageContext,
                }
              : undefined,
            (chunk) => {
              browser.runtime
                .sendMessage({
                  type: "AI_RESPONSE",
                  messageId,
                  content: chunk.content,
                  done: chunk.done,
                  error: chunk.error,
                })
                .catch(() => {});
            },
          );
        })();
        return true;
      }

      case "POPUP_GET_AI_HISTORY": {
        browser.storage.local.get("fdh-chat-history").then((result) => {
          sendResponse((result["fdh-chat-history"] as unknown[]) ?? []);
        });
        return true;
      }

      case "POPUP_CLEAR_AI_HISTORY": {
        browser.storage.local.remove("fdh-chat-history");
        sendResponse({ success: true });
        return false;
      }

      // ---------------------------------------------------------------------
      // AI tool handlers (S2 of the Tools Remediation Plan).
      //
      // Previously smart-suggestions / ai-analyzer / ai-auto-fix sent these
      // message types but no listener existed, so every tool rendered its
      // "AI failed" UI 100% of the time. Each handler now delegates to the
      // existing llmService, which already knows how to read the user's
      // configured provider/key from encrypted storage.
      // ---------------------------------------------------------------------

      case "LLM_QUERY": {
        // ai-analyzer / smart-element-picker send a
        // { query, context? } payload and expect { response } back.
        (async () => {
          await loadConfig();
          if (!isEnabled()) {
            sendResponse({
              response: null,
              error: "AI not configured. Open Settings to add your API key.",
            });
            return;
          }
          const payload =
            (msg as { payload?: { query?: string; context?: unknown } })
              .payload ?? {};
          const query = payload.query ?? "";
          if (!query) {
            sendResponse({ response: null, error: "Empty query." });
            return;
          }
          // System prompt mirrors analyzePage's contract: ask for structured
          // JSON the tool can render. ai-analyzer buckets prose into
          // accessibility/performance/seo/best-practice sections, so a prose
          // answer is acceptable too.
          const messages = [
            {
              role: "system" as const,
              content:
                "You are a frontend development expert. Analyze the page and respond with concise, actionable findings grouped by category (accessibility, performance, SEO, best practices). Use markdown.",
            },
            { role: "user" as const, content: query },
          ];
          try {
            const result = await sendRawRequest(messages, {
              maxTokens: 1500,
              temperature: 0.3,
            });
            sendResponse({ response: result });
          } catch (err) {
            sendResponse({ response: null, error: String(err) });
          }
        })();
        return true;
      }

      case "AI_SUGGESTIONS": {
        // smart-suggestions sends { pageContext, focusArea, maxSuggestions }
        // and expects { suggestions: Suggestion[] }.
        (async () => {
          await loadConfig();
          if (!isEnabled()) {
            sendResponse({
              suggestions: [],
              error: "AI not configured. Open Settings to add your API key.",
            });
            return;
          }
          const data =
            (
              msg as {
                data?: {
                  pageContext?: {
                    url?: string;
                    title?: string;
                    frameworks?: string[];
                    domStats?: {
                      elements?: number;
                      images?: number;
                      scripts?: number;
                      links?: number;
                    };
                  };
                  focusArea?: string;
                  maxSuggestions?: number;
                };
              }
            ).data ?? {};
          const pc = data.pageContext ?? {};
          const focusArea = data.focusArea ?? "all";
          const max = Math.min(Math.max(data.maxSuggestions ?? 10, 1), 50);

          const summary = [
            `URL: ${pc.url ?? "unknown"}`,
            `Title: ${pc.title ?? ""}`,
            `Frameworks: ${(pc.frameworks ?? []).join(", ") || "unknown"}`,
            `Elements: ${pc.domStats?.elements ?? "?"}, Images: ${pc.domStats?.images ?? "?"}, Scripts: ${pc.domStats?.scripts ?? "?"}, Links: ${pc.domStats?.links ?? "?"}`,
            focusArea !== "all" ? `Focus area: ${focusArea}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          const messages = [
            {
              role: "system" as const,
              content:
                "You are a senior frontend design and code reviewer. Respond ONLY with a JSON object " +
                '{"suggestions":[{"category":"accessibility|performance|seo|best-practice|layout|colors|typography","priority":"high|medium|low","description":"What to change and why"}]}. ' +
                `Limit to ${max} high-impact suggestions. No prose, no code fences, no markdown — only the JSON object.`,
            },
            { role: "user" as const, content: `Page context:\n${summary}` },
          ];
          try {
            const raw = await sendRawRequest(messages, {
              maxTokens: 1500,
              temperature: 0.4,
            });
            if (!raw) {
              sendResponse({ suggestions: [] });
              return;
            }
            const cleaned = raw
              .replace(/```json\n?/g, "")
              .replace(/```/g, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            const suggestions = Array.isArray(parsed?.suggestions)
              ? parsed.suggestions
              : [];
            sendResponse({ suggestions: suggestions.slice(0, max) });
          } catch (err) {
            sendResponse({ suggestions: [], error: String(err) });
          }
        })();
        return true;
      }

      case "AI_AUTO_FIX": {
        // ai-auto-fix sends { prompt } and expects { fix: AIFix } back,
        // where AIFix = { html?, css?, styleChanges?, description }.
        (async () => {
          await loadConfig();
          if (!isEnabled()) {
            sendResponse({
              fix: null,
              error: "AI not configured. Open Settings to add your API key.",
            });
            return;
          }
          const data = (msg as { data?: { prompt?: string } }).data ?? {};
          const prompt = data.prompt ?? "";
          if (!prompt) {
            sendResponse({ fix: null, error: "Empty prompt." });
            return;
          }
          const messages = [
            {
              role: "system" as const,
              content:
                "You are an accessibility and best-practices expert. Respond ONLY with the JSON object requested. No markdown, no code fences.",
            },
            { role: "user" as const, content: prompt },
          ];
          try {
            const raw = await sendRawRequest(messages, {
              maxTokens: 1200,
              temperature: 0.2,
            });
            if (!raw) {
              sendResponse({ fix: null });
              return;
            }
            // Try to parse as the structured object the prompt asks for; if
            // parsing fails, return the raw text under description so the
            // user sees something useful instead of "no fix".
            try {
              const cleaned = raw
                .replace(/```json\n?/g, "")
                .replace(/```/g, "")
                .trim();
              const parsed = JSON.parse(cleaned);
              sendResponse({ fix: parsed });
            } catch {
              sendResponse({ fix: { description: raw } });
            }
          } catch (err) {
            sendResponse({ fix: null, error: String(err) });
          }
        })();
        return true;
      }

      // ---------------------------------------------------------------------
      // S3: CAPTURE_TAB handler.
      //
      // screenshot-studio + visual-regression need to capture the visible
      // tab. Only the background/service-worker context is permitted to call
      // chrome.tabs.captureVisibleTab, so content scripts must RPC to here.
      // ---------------------------------------------------------------------

      case "CAPTURE_TAB": {
        (async () => {
          try {
            // Prefer the sender's window so devtools popouts don't capture
            // the wrong window. Fall back to the last-focused window.
            const windowId =
              sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
            const dataUrl = await chrome.tabs.captureVisibleTab(
              windowId as number,
              { format: "png" },
            );
            sendResponse({ dataUrl });
          } catch (err) {
            sendResponse({ dataUrl: null, error: String(err) });
          }
        })();
        return true;
      }

      case "CONTENT_READY": {
        sendResponse({ success: true });
        return false;
      }

      case "DEVTOOLS_ACTIVATE_TOOL": {
        const tabId = msg.tabId;
        if (tabId) {
          browser.tabs
            .sendMessage(tabId, {
              type: "BG_ACTIVATE_TOOL",
              toolId: msg.toolId,
              config: msg.config,
            })
            .catch(() => {});
          handleToggleTool(
            { toolId: String(msg.toolId ?? ""), config: msg.config },
            { tab: { id: Number(tabId) } } as chrome.runtime.MessageSender,
          )
            .then((result) => sendResponse(result))
            .catch((err) => sendResponse({ error: String(err) }));
        }
        return true;
      }

      case "DEVTOOLS_DEACTIVATE_TOOL": {
        const tabId = msg.tabId;
        if (tabId) {
          browser.tabs
            .sendMessage(tabId, {
              type: "BG_DEACTIVATE_TOOL",
              toolId: msg.toolId,
            })
            .catch(() => {});
          handleToggleTool({ toolId: msg.toolId! }, {
            tab: { id: tabId },
          } as chrome.runtime.MessageSender)
            .then((result) => sendResponse(result))
            .catch((err) => sendResponse({ error: String(err) }));
        }
        return true;
      }

      case "DEVTOOLS_DEACTIVATE_ALL": {
        const tabId = msg.tabId;
        if (tabId) {
          browser.tabs
            .sendMessage(tabId, { type: "BG_DEACTIVATE_ALL" })
            .catch(() => {});
          browser.storage.local.get("fdh-tools-storage").then((result) => {
            const state = result["fdh-tools-storage"] as
              | { state?: any }
              | undefined;
            if (state?.state?.activeTools) {
              for (const key of Object.keys(state.state.activeTools)) {
                state.state.activeTools[key].active = false;
              }
              browser.storage.local.set({ "fdh-tools-storage": state });
            }
            updateBadge(tabId);
          });
        }
        sendResponse({ success: true });
        return false;
      }

      case "CONTENT_TOOL_RESULT":
      case "CONTENT_TOOL_ERROR": {
        browser.runtime.sendMessage(message).catch(() => {});
        sendResponse({ acknowledged: true });
        return false;
      }

      case "VSCODE_JUMP_TO_SOURCE": {
        const bridge = getBridge();
        const payload = (
          message as {
            type: string;
            payload: { file: string; line: number; column: number };
          }
        ).payload;
        bridge.jumpToSource(payload.file, payload.line, payload.column);
        sendResponse({ success: bridge.connected });
        return false;
      }

      case "VSCODE_OPEN_IN_EDITOR": {
        const bridge = getBridge();
        const payload = (
          message as {
            type: string;
            payload: { file: string; line?: number; column?: number };
          }
        ).payload;
        bridge.openInEditor(payload.file, payload.line, payload.column);
        sendResponse({ success: bridge.connected });
        return false;
      }

      case "VSCODE_INIT_BRIDGE": {
        const payload = (message as { type: string; payload: { port: number } })
          .payload;
        // initBridge now resolves only after the WebSocket is open + authed.
        // The response is sent immediately; status is reflected via the
        // connection store subscription.
        void initBridge(payload.port).then(() =>
          registerBridgeRequestHandlers(),
        );
        sendResponse({ success: true });
        return false;
      }

      case "VSCODE_GET_STATUS": {
        const bridge = getBridge();
        sendResponse({ connected: bridge.connected });
        return false;
      }

      case "VSCODE_MESSAGE": {
        const vscodeMsg = (message as { type: string; message: unknown })
          .message;
        const bridge = getBridge();
        if (bridge.connected && vscodeMsg) {
          bridge.send(
            vscodeMsg as import("@/lib/vscode-protocol").VSCodeMessage,
          );
        }
        sendResponse({ success: bridge.connected });
        return false;
      }

      default:
        return false;
    }
  });

  // Tab lifecycle
  browser.tabs.onActivated.addListener((activeInfo) => {
    updateBadge(activeInfo.tabId);
  });

  // =====================================================================
  // React Profiler pipeline routing
  // =====================================================================
  //
  // The bridge content script connects on port name `fdh-profiler@<tabId>`.
  // The DevTools panel connects on port name `fdh-profiler-panel@<tabId>`.
  // The background routes messages between the two pairs per tab.
  //
  // Bridge -> background messages: { from: 'bridge' | 'content', payload }
  // Panel  -> background messages: { target: 'bridge', payload }

  /* v8 ignore start -- Profiler pipeline routing is out of Phase 1.2 scope (Phase 2.8). */
  const profilerBridgePorts = new Map<number, chrome.runtime.Port>();
  const profilerPanelPorts = new Map<number, Set<chrome.runtime.Port>>();

  browser.runtime.onConnect.addListener((port) => {
    const name = port.name ?? "";
    const profilerBridgeMatch = name.match(/^fdh-profiler@(\d+)$/);
    const profilerPanelMatch = name.match(/^fdh-profiler-panel@(\d+)$/);

    if (profilerBridgeMatch) {
      const tabId = Number(profilerBridgeMatch[1]);
      profilerBridgePorts.set(tabId, port);

      port.onMessage.addListener((msg: unknown) => {
        const record = msg as { from?: string; payload?: unknown } | undefined;
        if (!record?.payload) return;
        const panels = profilerPanelPorts.get(tabId);
        if (!panels) return;
        for (const panel of panels) {
          try {
            panel.postMessage({ from: "bridge", payload: record.payload });
          } catch {
            /* panel disconnected */
          }
        }
      });

      port.onDisconnect.addListener(() => {
        if (profilerBridgePorts.get(tabId) === port) {
          profilerBridgePorts.delete(tabId);
        }
      });
      return;
    }

    if (profilerPanelMatch) {
      const tabId = Number(profilerPanelMatch[1]);
      let panels = profilerPanelPorts.get(tabId);
      if (!panels) {
        panels = new Set();
        profilerPanelPorts.set(tabId, panels);
      }
      panels.add(port);

      port.onMessage.addListener((msg: unknown) => {
        const record = msg as
          | { target?: string; payload?: unknown }
          | undefined;
        if (record?.target !== "bridge") return;
        const bridge = profilerBridgePorts.get(tabId);
        if (!bridge) return;
        try {
          bridge.postMessage({ target: "bridge", payload: record.payload });
        } catch {
          /* bridge disconnected */
        }
      });

      port.onDisconnect.addListener(() => {
        const panels = profilerPanelPorts.get(tabId);
        if (panels) {
          panels.delete(port);
          if (panels.size === 0) profilerPanelPorts.delete(tabId);
        }
      });
    }
  });

  // Content script asks for its own tab id on startup (it can't read
  // chrome.tabs.* itself; only the background has that privilege).
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message &&
      typeof message === "object" &&
      (message as { type?: string }).type === "FDH_PROFILER_GET_TAB_ID"
    ) {
      sendResponse({ tabId: sender.tab?.id ?? null });
      return false;
    }
    return false;
  });

  /* v8 ignore stop -- end of profiler pipeline routing block. */

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      updateBadge(tabId);
    }
    if (changeInfo.url) {
      browser.storage.local.get("fdh-tools-storage").then((result) => {
        const state = result["fdh-tools-storage"] as
          | { state?: any }
          | undefined;
        if (state?.state?.activeTools) {
          for (const key of Object.keys(state.state.activeTools)) {
            state.state.activeTools[key].active = false;
          }
          browser.storage.local.set({ "fdh-tools-storage": state });
        }
        updateBadge(tabId);
      });
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    updateBadge(tabId);
  });

  // Keyboard shortcuts
  browser.commands.onCommand.addListener((command, tab) => {
    const toolId = COMMAND_TO_TOOL_ID[command];
    if (toolId && tab?.id) {
      handleToggleTool({ toolId }, { tab } as chrome.runtime.MessageSender);
      return;
    }

    if (command === "disable-all-tools" && tab?.id) {
      browser.tabs
        .sendMessage(tab.id, { type: "BG_DEACTIVATE_ALL" })
        .catch(() => {});
      browser.storage.local.get("fdh-tools-storage").then((result) => {
        const state = result["fdh-tools-storage"] as
          | { state?: any }
          | undefined;
        if (state?.state?.activeTools) {
          for (const key of Object.keys(state.state.activeTools)) {
            state.state.activeTools[key].active = false;
          }
          browser.storage.local.set({ "fdh-tools-storage": state });
        }
        updateBadge(tab.id);
      });
    }
  });

  // Context menus
  browser.runtime.onInstalled.addListener(buildContextMenus);

  browser.contextMenus.onClicked.addListener((info, tab) => {
    const menuItemId = String(info.menuItemId);
    const tabId = tab?.id;
    if (!tabId) return;

    if (menuItemId === "fdh-inspect-element") {
      handleToggleTool({ toolId: "element-inspector" }, {
        tab,
      } as chrome.runtime.MessageSender);
    } else if (menuItemId === "fdh-copy-selector") {
      browser.tabs
        .sendMessage(tabId, { type: "BG_COPY_CSS_SELECTOR" })
        .catch(() => {});
    } else if (menuItemId === "fdh-disable-all") {
      browser.tabs
        .sendMessage(tabId, { type: "BG_DEACTIVATE_ALL" })
        .catch(() => {});
      browser.storage.local.get("fdh-tools-storage").then((result) => {
        const state = result["fdh-tools-storage"] as
          | { state?: any }
          | undefined;
        if (state?.state?.activeTools) {
          for (const key of Object.keys(state.state.activeTools)) {
            state.state.activeTools[key].active = false;
          }
          browser.storage.local.set({ "fdh-tools-storage": state });
        }
        updateBadge(tabId);
      });
    } else if (menuItemId.startsWith("fdh-toggle-")) {
      const toolId = menuItemId.slice("fdh-toggle-".length);
      handleToggleTool({ toolId }, { tab } as chrome.runtime.MessageSender);
    }
  });

  // Initialize
  updateBadge();
  console.log("[FDH] Background service worker initialized");
});
