export interface ToolPanelConfig {
  title: string;
  width?: number;
  maxHeight?: string;
  onClose?: () => void;
  footer?: HTMLElement;
  headerExtra?: HTMLElement;
}

export class ToolPanel {
  private panel: HTMLDivElement;
  private contentArea: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private footerEl: HTMLDivElement | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private cleanupFns: (() => void)[] = [];

  constructor(private config: ToolPanelConfig) {
    this.panel = document.createElement("div");
    this.panel.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: ${config.width || 420}px;
      max-height: ${config.maxHeight || "80vh"};
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      color: #e2e8f0;
      overflow: hidden;
      pointer-events: auto;
    `;

    this.headerEl = this.createHeader();
    this.panel.appendChild(this.headerEl);

    this.contentArea = document.createElement("div");
    this.contentArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      min-height: 0;
    `;
    this.panel.appendChild(this.contentArea);

    if (config.footer) {
      // config.footer is typed HTMLElement; coerce to HTMLDivElement since
      // tool callers always pass a div here. (TS otherwise complains about
      // the missing `align` property on the loose assignment.)
      this.footerEl = config.footer as HTMLDivElement;
      this.footerEl.style.cssText = `
        padding: 8px 12px;
        border-top: 1px solid #1e293b;
        background: #0c1222;
        font-size: 11px;
        color: #64748b;
      `;
      if (this.footerEl) {
        this.panel.appendChild(this.footerEl);
      }
    }

    this.setupDragging();
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      cursor: move;
      user-select: none;
    `;

    const title = document.createElement("span");
    title.style.cssText = `
      font-weight: 600;
      font-size: 13px;
      color: #f1f5f9;
    `;
    title.textContent = this.config.title;
    header.appendChild(title);

    if (this.config.headerExtra) {
      const extraContainer = document.createElement("div");
      extraContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        justify-content: center;
      `;
      extraContainer.appendChild(this.config.headerExtra);
      header.appendChild(extraContainer);
    }

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
      border-radius: 4px;
    `;
    closeBtn.textContent = "×";
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.color = "#f1f5f9";
      closeBtn.style.background = "#334155";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.color = "#94a3b8";
      closeBtn.style.background = "none";
    });
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.config.onClose?.();
      this.destroy();
    });
    header.appendChild(closeBtn);

    return header;
  }

  private setupDragging(): void {
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      this.isDragging = true;
      const rect = this.panel.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.panel.style.transition = "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.panel.style.left = `${x}px`;
      this.panel.style.top = `${y}px`;
      this.panel.style.right = "auto";
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.panel.style.transition = "";
    };

    this.headerEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    this.cleanupFns.push(() => {
      this.headerEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    });
  }

  mount(shadowRoot: ShadowRoot): this {
    shadowRoot.appendChild(this.panel);
    return this;
  }

  getContainer(): HTMLDivElement {
    return this.contentArea;
  }

  getPanelElement(): HTMLDivElement {
    return this.panel;
  }

  appendContent(el: HTMLElement): void {
    this.contentArea.appendChild(el);
  }

  clearContent(): void {
    while (this.contentArea.firstChild) {
      this.contentArea.removeChild(this.contentArea.firstChild);
    }
  }

  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.panel.remove();
  }
}

export function createBadge(text: string, color: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    background: ${color}20;
    color: ${color};
    margin-left: 6px;
  `;
  badge.textContent = text;
  return badge;
}

export function createButton(
  text: string,
  onClick: () => void,
  variant: "primary" | "secondary" = "secondary",
): HTMLButtonElement {
  const btn = document.createElement("button");
  const isPrimary = variant === "primary";
  btn.style.cssText = `
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid ${isPrimary ? "#3b82f6" : "#334155"};
    background: ${isPrimary ? "#3b82f6" : "#1e293b"};
    color: ${isPrimary ? "#fff" : "#94a3b8"};
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  `;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  btn.addEventListener("mouseenter", () => {
    btn.style.opacity = "0.8";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.opacity = "1";
  });
  return btn;
}

export function createScrollList(
  items: Array<{ label: string; value: string; color?: string }>,
): HTMLDivElement {
  const list = document.createElement("div");
  list.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  for (const item of items) {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      border-radius: 4px;
      background: #1e293b;
    `;
    const label = document.createElement("span");
    label.style.cssText = `color: #94a3b8; font-size: 12px;`;
    label.textContent = item.label;

    const value = document.createElement("span");
    value.style.cssText = `color: ${item.color || "#e2e8f0"}; font-family: 'SF Mono', monospace; font-size: 11px;`;
    value.textContent = item.value;

    row.appendChild(label);
    row.appendChild(value);
    list.appendChild(row);
  }
  return list;
}

export function createTabBar(
  tabs: Array<{ id: string; label: string }>,
  onTabChange: (id: string) => void,
): { container: HTMLDivElement; setActive: (id: string) => void } {
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    gap: 2px;
    background: #0c1222;
    padding: 2px;
    border-radius: 6px;
    margin-bottom: 8px;
  `;

  const tabButtons: Record<string, HTMLButtonElement> = {};

  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.style.cssText = `
      flex: 1;
      padding: 5px 8px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #64748b;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    `;
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      onTabChange(tab.id);
      setActive(tab.id);
    });
    tabButtons[tab.id] = btn;
    container.appendChild(btn);
  }

  function setActive(id: string) {
    for (const [tabId, btn] of Object.entries(tabButtons)) {
      if (tabId === id) {
        btn.style.background = "#1e293b";
        btn.style.color = "#f1f5f9";
      } else {
        btn.style.background = "transparent";
        btn.style.color = "#64748b";
      }
    }
  }

  if (tabs.length > 0) setActive(tabs[0].id);

  return { container, setActive };
}

export function createSearchInput(
  placeholder: string,
  onSearch: (query: string) => void,
): { container: HTMLDivElement; getValue: () => string } {
  const container = document.createElement("div");
  container.style.cssText = `margin-bottom: 8px;`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.style.cssText = `
    width: 100%;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #334155;
    background: #0c1222;
    color: #e2e8f0;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  `;
  input.addEventListener("input", () => onSearch(input.value));
  input.addEventListener("focus", () => {
    input.style.borderColor = "#3b82f6";
  });
  input.addEventListener("blur", () => {
    input.style.borderColor = "#334155";
  });

  container.appendChild(input);
  return { container, getValue: () => input.value };
}
