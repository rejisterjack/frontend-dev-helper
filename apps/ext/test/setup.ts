import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock the overlay-manager module
vi.mock("@/content/overlay-manager", () => ({
  getOverlayContainer: () => ({
    container: document.createElement("div"),
    shadow: document.createElement("div"),
  }),
  addOverlayElement: (el: HTMLElement) => {
    // no-op in test: just track it on the element
    (el as any).__addedToOverlay = true;
  },
  removeOverlayElement: (el: HTMLElement) => {
    (el as any).__addedToOverlay = false;
    if (el.parentNode) el.parentNode.removeChild(el);
  },
  clearAllOverlays: () => {},
  attachViewportTracker: (tracker: () => void) => {
    tracker();
    return () => {};
  },
  createHighlightBox: (rect: DOMRect, color: string, label?: string) => {
    const box = document.createElement("div");
    box.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border:2px solid ${color};pointer-events:none;z-index:2147483641;`;
    if (label) {
      const labelEl = document.createElement("div");
      labelEl.textContent = label;
      box.appendChild(labelEl);
    }
    return box;
  },
  destroyOverlayContainer: () => {},
}));

// Mock the highlight-engine module
vi.mock("@/content/highlight-engine", () => ({
  HighlightEngine: class MockHighlightEngine {
    start() {}
    stop() {}
  },
  generateSelector: (el: HTMLElement) => {
    if (el.id) return "#" + el.id;
    return el.tagName.toLowerCase();
  },
  getComputedStyles: (el: HTMLElement) => {
    const computed = window.getComputedStyle(el);
    const styles: Record<string, string> = {};
    const props = [
      "display",
      "position",
      "width",
      "height",
      "color",
      "background-color",
    ];
    for (const prop of props) {
      styles[prop] = computed.getPropertyValue(prop);
    }
    return styles;
  },
}));

// Mock Chrome extension APIs
const chromeStorageMock = {
  local: {
    get: () => Promise.resolve({}),
    set: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  },
  sync: {
    get: () => Promise.resolve({}),
    set: () => Promise.resolve(),
  },
};

const chromeTabsMock = {
  query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
  sendMessage: () => Promise.resolve(),
};

const chromeRuntimeMock = {
  sendMessage: () => Promise.resolve(),
  onMessage: {
    addListener: () => {},
    removeListener: () => {},
  },
  getURL: (p: string) => `chrome-extension://test-id/${p}`,
};

const chromeDevtoolsMock = {
  panels: { create: () => {} },
  inspectedWindow: { eval: () => {}, tabId: 1 },
};

const chromeSidePanelMock = { setOptions: () => {} };
const chromeContextMenusMock = {
  create: () => {},
  remove: () => {},
  onClicked: { addListener: () => {} },
};
const chromeCommandsMock = { onCommand: { addListener: () => {} } };
const chromeScriptingMock = { executeScript: () => Promise.resolve([]) };
const chromeBadgeMock = {
  setBadgeText: () => {},
  setBadgeBackgroundColor: () => {},
  setText: () => {},
};

global.chrome = {
  storage: chromeStorageMock,
  tabs: chromeTabsMock,
  runtime: chromeRuntimeMock,
  devtools: chromeDevtoolsMock as any,
  sidePanel: chromeSidePanelMock as any,
  contextMenus: chromeContextMenusMock as any,
  commands: chromeCommandsMock as any,
  scripting: chromeScriptingMock as any,
  action: chromeBadgeMock as any,
} as any;

global.browser = global.chrome as any;

// Mock MutationObserver
class MockMutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
global.MutationObserver = MockMutationObserver as any;

class MockResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
global.ResizeObserver = MockResizeObserver as any;

class MockIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
global.IntersectionObserver = MockIntersectionObserver as any;

if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  } as any;
}

if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 0) as unknown as number;
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

if (typeof CSS !== "undefined" && !CSS.escape) {
  (CSS as any).escape = (str: string) => str.replace(/([^\w-])/g, "\\$1");
}

if (!document.createTreeWalker) {
  document.createTreeWalker = () =>
    ({
      nextNode: () => null,
      currentNode: null,
    }) as any;
}

if (!document.getAnimations) {
  document.getAnimations = () => [];
}

if (typeof NodeFilter === "undefined") {
  (global as any).NodeFilter = {
    SHOW_ELEMENT: 1,
    SHOW_TEXT: 4,
    SHOW_ALL: 0xffffffff,
  };
}

// Mock addOverlayElement / removeOverlayElement as globals for tools that use them without imports
(global as any).addOverlayElement = (el: HTMLElement) => {
  (el as any).__addedToOverlay = true;
};
(global as any).removeOverlayElement = (el: HTMLElement) => {
  (el as any).__addedToOverlay = false;
  if (el.parentNode) el.parentNode.removeChild(el);
};
(global as any).clearAllOverlays = () => {};
