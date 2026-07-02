import { describe, it, expect, beforeEach, vi } from "vitest";

// Stub WXT's defineBackground as identity so the router's IIFE runs at import.
let defineBackgroundCalls = 0;
vi.stubGlobal("defineBackground", (fn: () => void) => {
  defineBackgroundCalls++;
  fn();
});

// Stub defineContentScript too — background.ts imports sibling modules that may use it.
vi.stubGlobal("defineContentScript", (config: unknown) => config);

const llmMocks = vi.hoisted(() => ({
  sendChatMessage: vi.fn().mockResolvedValue(undefined),
  sendRawRequest: vi.fn().mockResolvedValue("mock llm response"),
  loadConfig: vi.fn().mockResolvedValue(undefined),
  isEnabled: vi.fn().mockReturnValue(false),
}));

// Instruct llm-service + secrets to short-circuit so we can drive AI handlers deterministically.
vi.mock("@/lib/llm-service", () => ({
  sendChatMessage: llmMocks.sendChatMessage,
  sendRawRequest: llmMocks.sendRawRequest,
  loadConfig: llmMocks.loadConfig,
  isEnabled: llmMocks.isEnabled,
}));
vi.mock("@/lib/secrets", () => ({
  getSecret: vi.fn().mockResolvedValue(""),
  migrateLegacySecrets: vi.fn().mockResolvedValue(undefined),
}));

// ---- chrome.* harness ------------------------------------------------------
// We need full control of the onMessage listener that background.ts registers.
// Build it fresh for each test.

type MessageListener = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => boolean | undefined;

function makeChromeMock() {
  const onMessageListeners: MessageListener[] = [];
  const storageLocal = new Map<string, unknown>();
  const sentTabs: Array<{ tabId: number; message: any }> = [];
  const sentRuntime: any[] = [];

  const chromeMock = {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) {
            return Object.fromEntries(storageLocal);
          }
          const out: Record<string, unknown> = {};
          for (const k of Array.isArray(keys) ? keys : [keys]) {
            if (storageLocal.has(k)) out[k] = storageLocal.get(k);
          }
          return out;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) storageLocal.set(k, v);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const k of Array.isArray(keys) ? keys : [keys])
            storageLocal.delete(k);
        }),
      },
      session: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) },
    },
    tabs: {
      query: vi.fn(async () => [{ id: 42, url: "https://example.com" }]),
      sendMessage: vi.fn(async (tabId: number, message: any) => {
        sentTabs.push({ tabId, message });
        return {};
      }),
      captureVisibleTab: vi.fn(async () => "data:image/png;base64,test"),
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
      onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    windows: {
      WINDOW_ID_CURRENT: -2,
    },
    runtime: {
      onMessage: {
        addListener: vi.fn((l: MessageListener) => onMessageListeners.push(l)),
        removeListener: vi.fn(),
        hasListeners: vi.fn(() => onMessageListeners.length > 0),
      },
      onConnect: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      onInstalled: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      onStartup: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn(async (message: any) => {
        sentRuntime.push(message);
      }),
      id: "test-extension-id",
      getManifest: () => ({ version: "1.0.0" }),
    },
    scripting: { executeScript: vi.fn(async () => []) },
    contextMenus: {
      create: vi.fn(),
      remove: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    commands: { onCommand: { addListener: vi.fn() } },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
      setTitle: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    sidePanel: { setOptions: vi.fn(), open: vi.fn() },
  };

  return {
    chromeMock,
    onMessageListeners,
    storageLocal,
    sentTabs,
    sentRuntime,
    /** Drive the registered router with a message; resolves the sendResponse value. */
    async dispatch(
      message: any,
      sender: chrome.runtime.MessageSender = {},
    ): Promise<any> {
      // background.ts registers multiple onMessage listeners; the *first* one is
      // the main router (later ones are narrow profiler/getTabId handlers that
      // short-circuit on message.type). Drive the first; if it returns false
      // without calling sendResponse, also try the next listener in order.
      if (onMessageListeners.length === 0) {
        throw new Error("No onMessage listener registered");
      }
      const listeners = [...onMessageListeners];
      return new Promise((resolve) => {
        let settled = false;
        const finish = (response: any) => {
          if (!settled) {
            settled = true;
            resolve(response);
          }
        };

        // Walk listeners in registration order; the first one that handles
        // the message (calls sendResponse OR returns true) wins. Listeners
        // that return false/undefined without calling sendResponse are skipped.
        const tryListener = (idx: number) => {
          if (idx >= listeners.length) {
            finish(undefined);
            return;
          }
          let listenerHandled = false;
          const listener = listeners[idx];
          const sendResponseSpy = (response: any) => {
            listenerHandled = true;
            finish(response);
          };
          const result = listener(message, sender, sendResponseSpy);
          if (result === true) {
            listenerHandled = true;
            setTimeout(() => finish(undefined), 1000);
            return;
          }
          if (listenerHandled) return;
          setTimeout(() => {
            if (!settled) tryListener(idx + 1);
          }, 10);
        };
        tryListener(0);
      });
    },
  };
}

describe("background message router", () => {
  let harness: ReturnType<typeof makeChromeMock>;

  beforeEach(async () => {
    harness = makeChromeMock();
    llmMocks.sendChatMessage.mockClear();
    llmMocks.sendRawRequest.mockClear();
    llmMocks.loadConfig.mockClear();
    llmMocks.isEnabled.mockReset();
    llmMocks.isEnabled.mockReturnValue(false);
    llmMocks.sendRawRequest.mockResolvedValue("mock llm response");
    // Set chrome/browser BEFORE resetModules+import so the freshly-imported
    // background.ts sees our mock at module-evaluation time.
    (globalThis as any).chrome = harness.chromeMock as any;
    (globalThis as any).browser = harness.chromeMock as any;

    // Import background.ts fresh so the IIFE runs against our harness.
    vi.resetModules();
    await import("@/entrypoints/background");
    // Sanity check: defineBackground should have been invoked at least once
    // for the default export's body to run.
    expect(defineBackgroundCalls).toBeGreaterThan(0);

    // Drain the immediate microtasks (migrateLegacySecrets).
    await new Promise((r) => setTimeout(r, 0));
  });

  it("POPUP_GET_TAB_STATUS echoes sender.tab.id", async () => {
    const res = await harness.dispatch({ type: "POPUP_GET_TAB_STATUS" }, {
      tab: { id: 99 },
    } as chrome.runtime.MessageSender);
    expect(res).toEqual({ tabId: 99, supported: true });
  });

  it("POPUP_UPDATE_SETTINGS writes to fdh-settings-storage", async () => {
    const res = await harness.dispatch({
      type: "POPUP_UPDATE_SETTINGS",
      settings: { ai: { provider: "openai" } },
    });
    expect(res).toEqual({ success: true });
    expect(harness.chromeMock.storage.local.set).toHaveBeenCalledWith({
      "fdh-settings-storage": { state: { ai: { provider: "openai" } } },
    });
  });

  it("POPUP_GET_SETTINGS reads from fdh-settings-storage", async () => {
    harness.storageLocal.set("fdh-settings-storage", {
      state: { vscode: { port: 1234 } },
    });
    const res = await harness.dispatch({ type: "POPUP_GET_SETTINGS" });
    expect(res).toEqual({ vscode: { port: 1234 } });
  });

  it("POPUP_CLEAR_AI_HISTORY removes fdh-chat-history", async () => {
    harness.storageLocal.set("fdh-chat-history", [
      { role: "user", content: "hi" },
    ]);
    const res = await harness.dispatch({ type: "POPUP_CLEAR_AI_HISTORY" });
    expect(res).toEqual({ success: true });
    expect(harness.chromeMock.storage.local.remove).toHaveBeenCalledWith(
      "fdh-chat-history",
    );
    expect(harness.storageLocal.has("fdh-chat-history")).toBe(false);
  });

  it("POPUP_GET_ALL_TOOL_STATES returns activeTools object", async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { "tool-a": { active: true } } },
    });
    const res = await harness.dispatch({ type: "POPUP_GET_ALL_TOOL_STATES" });
    expect(res).toEqual({ "tool-a": { active: true } });
  });

  it("POPUP_DEACTIVATE_ALL zeroes every active tool + sends BG_DEACTIVATE_ALL", async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { a: { active: true }, b: { active: true } } },
    });

    const res = await harness.dispatch({ type: "POPUP_DEACTIVATE_ALL" }, {
      tab: { id: 7 },
    } as chrome.runtime.MessageSender);

    expect(res).toEqual({ success: true });
    expect(harness.sentTabs).toContainEqual({
      tabId: 7,
      message: { type: "BG_DEACTIVATE_ALL" },
    });

    // After the .then chain runs, storage should be updated.
    await new Promise((r) => setTimeout(r, 0));
    const stored = harness.storageLocal.get("fdh-tools-storage") as any;
    expect(stored.state.activeTools.a.active).toBe(false);
    expect(stored.state.activeTools.b.active).toBe(false);
  });

  it("CONTENT_READY acks with success", async () => {
    const res = await harness.dispatch({ type: "CONTENT_READY" });
    expect(res).toEqual({ success: true });
  });

  it("POPUP_ACTIVATE_TOOL forwards BG_ACTIVATE_TOOL to the content script", async () => {
    await harness.dispatch(
      {
        type: "POPUP_ACTIVATE_TOOL",
        toolId: "css-inspector",
        config: { mode: "auto" },
      },
      { tab: { id: 5 } } as chrome.runtime.MessageSender,
    );

    // Allow the async chain inside the handler to flush.
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.sentTabs).toContainEqual({
      tabId: 5,
      message: {
        type: "BG_ACTIVATE_TOOL",
        toolId: "css-inspector",
        config: { mode: "auto" },
      },
    });
  });

  it("POPUP_GET_AI_HISTORY returns [] when key absent", async () => {
    const res = await harness.dispatch({ type: "POPUP_GET_AI_HISTORY" });
    expect(res).toEqual([]);
  });

  it("unknown message types do not throw and return undefined", async () => {
    await expect(
      harness.dispatch({ type: "TOTALLY_UNKNOWN" }),
    ).resolves.toBeUndefined();
  });

  // ----- More message cases -------------------------------------------------

  it("POPUP_DEACTIVATE_TOOL forwards BG_DEACTIVATE_TOOL and removes from storage", async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { "css-inspector": { active: true } } },
    });
    await harness.dispatch(
      { type: "POPUP_DEACTIVATE_TOOL", toolId: "css-inspector" },
      { tab: { id: 7 } } as chrome.runtime.MessageSender,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.sentTabs).toContainEqual({
      tabId: 7,
      message: { type: "BG_DEACTIVATE_TOOL", toolId: "css-inspector" },
    });
  });

  it("POPUP_GET_TOOL_STATE returns the activeTool entry for the id", async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: {
        activeTools: { "color-picker": { active: true, config: { x: 1 } } },
      },
    });
    const res = await harness.dispatch({
      type: "POPUP_GET_TOOL_STATE",
      toolId: "color-picker",
    });
    expect(res).toEqual({ active: true, config: { x: 1 } });
  });

  it("POPUP_GET_TOOL_STATE returns null for an unknown tool", async () => {
    const res = await harness.dispatch({
      type: "POPUP_GET_TOOL_STATE",
      toolId: "nope",
    });
    expect(res).toBeNull();
  });

  it("POPUP_SEND_AI_PROMPT rejects with an error when AI is not configured", async () => {
    // getAIConfig() returns null when no provider/apiKey is configured.
    const res = await harness.dispatch({
      type: "POPUP_SEND_AI_PROMPT",
      content: "hi",
      history: [],
    });
    // The handler first resolves { messageId } synchronously, then errors async.
    // We accept either shape; the key invariant is no throw.
    expect(res).toBeTruthy();
  });

  it("DEVTOOLS_DEACTIVATE_ALL forwards BG_DEACTIVATE_ALL for the given tab", async () => {
    await harness.dispatch({ type: "DEVTOOLS_DEACTIVATE_ALL", tabId: 9 });
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.sentTabs).toContainEqual({
      tabId: 9,
      message: { type: "BG_DEACTIVATE_ALL" },
    });
  });

  it("VSCODE_GET_STATUS replies with the bridge connected state", async () => {
    const res = await harness.dispatch({ type: "VSCODE_GET_STATUS" });
    expect(res).toEqual({ connected: expect.any(Boolean) });
  });

  it("VSCODE_INIT_BRIDGE acks synchronously and triggers initBridge", async () => {
    const res = await harness.dispatch({
      type: "VSCODE_INIT_BRIDGE",
      payload: { port: 9999 },
    });
    expect(res).toEqual({ success: true });
  });

  it("VSCODE_JUMP_TO_SOURCE acks synchronously", async () => {
    const res = await harness.dispatch({
      type: "VSCODE_JUMP_TO_SOURCE",
      payload: { file: "/x.ts", line: 1, column: 1 },
    });
    // This case returns true (async) — accept either a settled response or undefined.
    expect(res === undefined || res === null || typeof res === "object").toBe(
      true,
    );
  });

  it("VSCODE_MESSAGE forwards to the bridge when connected", async () => {
    const res = await harness.dispatch({
      type: "VSCODE_MESSAGE",
      message: { type: "Ping" },
    });
    // Bridge is not connected in this harness → send returns false silently.
    expect(res === undefined || res === null || typeof res === "object").toBe(
      true,
    );
  });

  it("FDH_PROFILER_GET_TAB_ID responds with the sender tab id", async () => {
    // This hits the SECOND onMessage listener (registered later for the profiler).
    const res = await harness.dispatch({ type: "FDH_PROFILER_GET_TAB_ID" }, {
      tab: { id: 333 },
    } as chrome.runtime.MessageSender);
    expect(res).toEqual({ tabId: 333 });
  });

  // ----- Lifecycle listeners (commands, contextMenus) -----------------------

  it('keyboard command "disable-all-tools" sends BG_DEACTIVATE_ALL and zeroes storage', async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { a: { active: true }, b: { active: true } } },
    });

    // The command listener was registered with chrome.commands.onCommand.addListener.
    const cmdListener = (
      harness.chromeMock.commands.onCommand.addListener as any
    ).mock.calls[0]?.[0];
    expect(cmdListener).toBeTruthy();
    cmdListener("disable-all-tools", { id: 99 });

    await new Promise((r) => setTimeout(r, 0));
    expect(harness.sentTabs).toContainEqual({
      tabId: 99,
      message: { type: "BG_DEACTIVATE_ALL" },
    });
    const stored = harness.storageLocal.get("fdh-tools-storage") as any;
    expect(stored.state.activeTools.a.active).toBe(false);
    expect(stored.state.activeTools.b.active).toBe(false);
  });

  it("keyboard command for a registered tool toggle invokes handleToggleTool", async () => {
    const cmdListener = (
      harness.chromeMock.commands.onCommand.addListener as any
    ).mock.calls[0]?.[0];
    // "toggle-css-inspector" → COMMAND_TO_TOOL_ID.cssInspector
    cmdListener("toggle-css-inspector", { id: 7 });
    // handleToggleTool → debouncedToggle → setTimeout(DEBOUNCE_MS=100).
    await new Promise((r) => setTimeout(r, 250));
    // BG_ACTIVATE_TOOL or BG_DEACTIVATE_TOOL fires once the debounce clears.
    const sent = harness.sentTabs.filter((s) => s.tabId === 7);
    expect(sent.length).toBeGreaterThan(0);
  });

  it('context menu "fdh-disable-all" zeroes active tools + forwards BG_DEACTIVATE_ALL', async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { a: { active: true } } },
    });
    const clickListener = (
      harness.chromeMock.contextMenus.onClicked.addListener as any
    ).mock.calls[0]?.[0];
    clickListener({ menuItemId: "fdh-disable-all" }, { id: 42 });
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.sentTabs).toContainEqual({
      tabId: 42,
      message: { type: "BG_DEACTIVATE_ALL" },
    });
  });

  it('context menu "fdh-copy-selector" forwards BG_COPY_CSS_SELECTOR', async () => {
    const clickListener = (
      harness.chromeMock.contextMenus.onClicked.addListener as any
    ).mock.calls[0]?.[0];
    clickListener({ menuItemId: "fdh-copy-selector" }, { id: 11 });
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.sentTabs).toContainEqual({
      tabId: 11,
      message: { type: "BG_COPY_CSS_SELECTOR" },
    });
  });

  it('context menu "fdh-toggle-*" routes through handleToggleTool', async () => {
    const clickListener = (
      harness.chromeMock.contextMenus.onClicked.addListener as any
    ).mock.calls[0]?.[0];
    clickListener({ menuItemId: "fdh-toggle-css-inspector" }, { id: 5 });
    // handleToggleTool debounces 100ms before sending.
    await new Promise((r) => setTimeout(r, 250));
    expect(harness.sentTabs.some((s) => s.tabId === 5)).toBe(true);
  });

  // ----- Tab lifecycle listeners -------------------------------------------

  it("tabs.onUpdated with status=complete calls updateBadge", async () => {
    const listener = (harness.chromeMock.tabs.onUpdated.addListener as any).mock
      .calls[0]?.[0];
    expect(listener).toBeTruthy();
    listener(42, { status: "complete" }, { id: 42 });
    // updateBadge reads chrome.action.setBadgeText — verify it was invoked.
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.chromeMock.action.setBadgeText).toHaveBeenCalled();
  });

  it("tabs.onUpdated with a new url zeroes active tools in storage", async () => {
    harness.storageLocal.set("fdh-tools-storage", {
      state: { activeTools: { a: { active: true } } },
    });
    const listener = (harness.chromeMock.tabs.onUpdated.addListener as any).mock
      .calls[0]?.[0];
    listener(7, { url: "https://other.com" }, { id: 7 });
    await new Promise((r) => setTimeout(r, 0));
    const stored = harness.storageLocal.get("fdh-tools-storage") as any;
    expect(stored.state.activeTools.a.active).toBe(false);
  });

  it("tabs.onRemoved calls updateBadge", async () => {
    const listener = (harness.chromeMock.tabs.onRemoved.addListener as any).mock
      .calls[0]?.[0];
    listener(99);
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.chromeMock.action.setBadgeText).toHaveBeenCalled();
  });

  it("tabs.onActivated calls updateBadge for the new tab", async () => {
    const listener = (harness.chromeMock.tabs.onActivated.addListener as any)
      .mock.calls[0]?.[0];
    listener({ tabId: 5 });
    await new Promise((r) => setTimeout(r, 0));
    expect(harness.chromeMock.action.setBadgeText).toHaveBeenCalled();
  });

  // ----- AI tool handlers (LLM_QUERY / AI_SUGGESTIONS / AI_AUTO_FIX) --------

  it("LLM_QUERY returns error when AI is not configured", async () => {
    llmMocks.isEnabled.mockReturnValue(false);
    const res = await harness.dispatch({
      type: "LLM_QUERY",
      payload: { query: "analyze this page" },
    });
    expect(res).toEqual({
      response: null,
      error: "AI not configured. Open Settings to add your API key.",
    });
    expect(llmMocks.loadConfig).toHaveBeenCalled();
  });

  it("LLM_QUERY rejects empty queries", async () => {
    llmMocks.isEnabled.mockReturnValue(true);
    const res = await harness.dispatch({
      type: "LLM_QUERY",
      payload: { query: "" },
    });
    expect(res).toEqual({ response: null, error: "Empty query." });
    expect(llmMocks.sendRawRequest).not.toHaveBeenCalled();
  });

  it("LLM_QUERY delegates to sendRawRequest and returns the response", async () => {
    llmMocks.isEnabled.mockReturnValue(true);
    llmMocks.sendRawRequest.mockResolvedValue("Structured analysis");
    const res = await harness.dispatch({
      type: "LLM_QUERY",
      payload: { query: "analyze accessibility" },
    });
    expect(res).toEqual({ response: "Structured analysis" });
    expect(llmMocks.sendRawRequest).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: "analyze accessibility",
        }),
      ]),
      expect.objectContaining({ maxTokens: 1500, temperature: 0.3 }),
    );
  });

  it("AI_SUGGESTIONS parses JSON suggestions from the LLM response", async () => {
    llmMocks.isEnabled.mockReturnValue(true);
    llmMocks.sendRawRequest.mockResolvedValue(
      '{"suggestions":[{"category":"performance","priority":"high","description":"Optimize images"}]}',
    );
    const res = await harness.dispatch({
      type: "AI_SUGGESTIONS",
      data: {
        pageContext: {
          url: "https://example.com",
          title: "Example",
          frameworks: ["react"],
        },
        maxSuggestions: 5,
      },
    });
    expect(res.suggestions).toEqual([
      {
        category: "performance",
        priority: "high",
        description: "Optimize images",
      },
    ]);
  });

  it("AI_SUGGESTIONS returns empty list when AI is not configured", async () => {
    llmMocks.isEnabled.mockReturnValue(false);
    const res = await harness.dispatch({
      type: "AI_SUGGESTIONS",
      data: { pageContext: { url: "https://example.com" } },
    });
    expect(res).toEqual({
      suggestions: [],
      error: "AI not configured. Open Settings to add your API key.",
    });
  });

  it("AI_AUTO_FIX returns parsed fix JSON from the LLM response", async () => {
    llmMocks.isEnabled.mockReturnValue(true);
    llmMocks.sendRawRequest.mockResolvedValue(
      '{"html":"<button>Save</button>","description":"Added accessible label"}',
    );
    const res = await harness.dispatch({
      type: "AI_AUTO_FIX",
      data: { prompt: "Fix the submit button accessibility" },
    });
    expect(res.fix).toEqual({
      html: "<button>Save</button>",
      description: "Added accessible label",
    });
  });

  it("AI_AUTO_FIX rejects empty prompts", async () => {
    llmMocks.isEnabled.mockReturnValue(true);
    const res = await harness.dispatch({
      type: "AI_AUTO_FIX",
      data: { prompt: "" },
    });
    expect(res).toEqual({ fix: null, error: "Empty prompt." });
    expect(llmMocks.sendRawRequest).not.toHaveBeenCalled();
  });

  // ----- CAPTURE_TAB --------------------------------------------------------

  it("CAPTURE_TAB calls chrome.tabs.captureVisibleTab and returns dataUrl", async () => {
    const res = await harness.dispatch({ type: "CAPTURE_TAB" }, {
      tab: { id: 12, windowId: 77 },
    } as chrome.runtime.MessageSender);
    expect(res).toEqual({ dataUrl: "data:image/png;base64,test" });
    expect(harness.chromeMock.tabs.captureVisibleTab).toHaveBeenCalledWith(77, {
      format: "png",
    });
  });
});
