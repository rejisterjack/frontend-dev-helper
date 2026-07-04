import { describe, it, expect, beforeEach } from "vitest";
import {
  ToolPanel,
  createBadge,
  createButton,
  createScrollList,
  createTabBar,
  createSearchInput,
} from "@/content/tool-panel";

describe("createBadge", () => {
  it("renders text and color", () => {
    const badge = createBadge("A11Y", "#ef4444");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.textContent).toBe("A11Y");
    // Background uses `${color}20` (hex alpha); jsdom resolves to rgba.
    expect(badge.style.background).toMatch(/#ef444420|rgba\(239, 68, 68/);
    // Inline `color` is preserved verbatim because no alpha was appended.
    expect(badge.style.color).toBe("rgb(239, 68, 68)");
  });
});

describe("createButton", () => {
  it("fires onClick when clicked", () => {
    let clicked = 0;
    const btn = createButton("Run", () => clicked++);
    expect(btn.textContent).toBe("Run");
    btn.click();
    btn.click();
    expect(clicked).toBe(2);
  });

  it("primary variant uses blue background", () => {
    const primary = createButton("OK", () => {}, "primary");
    // jsdom normalises hex to rgb()
    expect(primary.style.background).toMatch(/#3b82f6|rgb\(59, 130, 246\)/);
    expect(primary.style.color).toMatch(/#fff|rgb\(255, 255, 255\)/);
  });

  it("secondary variant uses slate background", () => {
    const secondary = createButton("Cancel", () => {}, "secondary");
    expect(secondary.style.background).toMatch(/#1e293b|rgb\(30, 41, 59\)/);
    expect(secondary.style.color).toMatch(/#94a3b8|rgb\(148, 163, 184\)/);
  });
});

describe("createScrollList", () => {
  it("renders one row per item with value text", () => {
    const list = createScrollList([
      { label: "Color", value: "red", color: "#f00" },
      { label: "Size", value: "16px" },
    ]);
    expect(list.tagName).toBe("DIV");
    expect(list.children).toHaveLength(2);
    expect(list.textContent).toContain("red");
    expect(list.textContent).toContain("16px");
  });
});

describe("createTabBar", () => {
  it("renders one button per tab; click fires onTabChange", () => {
    const seen: string[] = [];
    const { container, setActive } = createTabBar(
      [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      (id) => seen.push(id),
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    // No auto-fire; initial activation is purely visual styling.
    expect(seen).toEqual([]);
    (buttons[1] as HTMLButtonElement).click();
    expect(seen).toEqual(["b"]);
    // setActive visibly changes which tab is highlighted (no callback)
    setActive("a");
    expect(seen).toEqual(["b"]);
  });
});

describe("createSearchInput", () => {
  it("fires onSearch via the input event", () => {
    const events: string[] = [];
    const { container } = createSearchInput("Search…", (v) => events.push(v));
    const input = container.querySelector("input") as HTMLInputElement;
    input.value = "color";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(events).toEqual(["color"]);
  });

  it("getValue reads the live input value", () => {
    const { container, getValue } = createSearchInput("X", () => {});
    const input = container.querySelector("input") as HTMLInputElement;
    input.value = "abc";
    expect(getValue()).toBe("abc");
  });
});

describe("ToolPanel", () => {
  let shadowHost: ShadowRoot;

  beforeEach(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    shadowHost = host.attachShadow({ mode: "open" });
  });

  it("mounts into a shadow root and exposes a container", () => {
    const panel = new ToolPanel({ title: "Test" });
    panel.mount(shadowHost);
    const container = panel.getContainer();
    expect(container.tagName).toBe("DIV");
    expect(shadowHost.contains(container)).toBe(true);
    panel.destroy();
  });

  it("sets ARIA dialog role and label", () => {
    const panel = new ToolPanel({ title: "Inspector" });
    panel.mount(shadowHost);
    const el = panel.getPanelElement();
    expect(el.getAttribute("role")).toBe("dialog");
    expect(el.getAttribute("aria-label")).toBe("Inspector");
    panel.destroy();
  });

  it("appendContent adds children; clearContent removes them", () => {
    const panel = new ToolPanel({ title: "Test" });
    panel.mount(shadowHost);
    panel.appendContent(document.createTextNode("hello"));
    panel.appendContent(document.createTextNode("world"));
    expect(panel.getContainer().textContent).toContain("hello");
    panel.clearContent();
    expect(panel.getContainer().textContent).not.toContain("hello");
    panel.destroy();
  });

  it("destroy removes the panel from the DOM", () => {
    const panel = new ToolPanel({ title: "Test" });
    panel.mount(shadowHost);
    expect(shadowHost.contains(panel.getContainer())).toBe(true);
    panel.destroy();
    expect(shadowHost.contains(panel.getContainer())).toBe(false);
  });

  it("invokes onClose when the close button is clicked", () => {
    let closed = 0;
    const panel = new ToolPanel({ title: "T", onClose: () => closed++ });
    panel.mount(shadowHost);
    const closeBtn = panel
      .getPanelElement()
      .querySelector('button[aria-label="Close T"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(closed).toBe(1);
    panel.destroy();
  });

  it("appends a footer element when provided", () => {
    const footer = document.createElement("div");
    footer.textContent = "footer-text";
    const panel = new ToolPanel({ title: "T", footer });
    panel.mount(shadowHost);
    expect(panel.getPanelElement().textContent).toContain("footer-text");
    panel.destroy();
  });
});
