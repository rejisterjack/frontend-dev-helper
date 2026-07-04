import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

interface ViewTransitionInfo {
  isActive: boolean;
  phase: "idle" | "animating" | "finished";
  pseudoElements: {
    name: string;
    type: string;
    styles: Record<string, string>;
  }[];
  capturedElements: {
    name: string;
    element: Element | null;
    rect: DOMRect | null;
  }[];
  recentEvents: string[];
}

function isSupported(): boolean {
  return "startViewTransition" in document;
}

function hasStylesheetViewTransitionRules(): boolean {
  // Recursively walk any rule that has nested cssRules (media, supports,
  // layer, container, import, etc.) rather than just CSSImportRule, so we
  // find `::view-transition-*` rules hidden inside `@media` or `@layer`.
  function walk(rules: CSSRuleList): boolean {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText;
        if (selector && selector.includes("::view-transition")) {
          return true;
        }
      }
      if ("cssRules" in rule && rule.cssRules) {
        try {
          if (walk(rule.cssRules as CSSRuleList)) return true;
        } catch {
          // cross-origin nested rules
        }
      }
    }
    return false;
  }

  const sheets = document.styleSheets;
  for (const sheet of sheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (walk(rules)) return true;
  }
  return false;
}

function isViewTransitionsActive(): boolean {
  return isSupported() || hasStylesheetViewTransitionRules();
}

function detectTransitionState(recentEvents: string[]): ViewTransitionInfo {
  const info: ViewTransitionInfo = {
    isActive: false,
    phase: "idle",
    pseudoElements: [],
    capturedElements: [],
    recentEvents,
  };

  const elementsWithTransitionName = document.querySelectorAll(
    '[style*="view-transition-name"], [style*="viewTransitionName"]',
  );
  for (const el of elementsWithTransitionName) {
    const style = (el as HTMLElement).style;
    const name =
      style.viewTransitionName ||
      style.cssText.match(/view-transition-name:\s*([^;]+)/)?.[1];
    if (name && name !== "none") {
      info.capturedElements.push({
        name: name.trim(),
        element: el,
        rect: el.getBoundingClientRect(),
      });
    }
  }

  info.pseudoElements = detectPseudoElements();
  if (info.capturedElements.length > 0 || info.pseudoElements.length > 0) {
    info.isActive = true;
    info.phase = "animating";
  }
  return info;
}

function detectPseudoElements(): {
  name: string;
  type: string;
  styles: Record<string, string>;
}[] {
  const pseudoElements: {
    name: string;
    type: string;
    styles: Record<string, string>;
  }[] = [];
  const sheets = document.styleSheets;
  for (const sheet of sheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          if (selector?.includes("::view-transition")) {
            const styles: Record<string, string> = {};
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              styles[prop] = rule.style.getPropertyValue(prop);
            }
            pseudoElements.push({
              name: selector,
              type: getPseudoElementType(selector),
              styles,
            });
          }
        }
      }
    } catch {
      /* cross-origin */
    }
  }
  return pseudoElements;
}

function getPseudoElementType(selector: string): string {
  if (selector.includes("::view-transition-old")) return "old";
  if (selector.includes("::view-transition-new")) return "new";
  if (selector.includes("::view-transition-image-pair")) return "image-pair";
  if (selector.includes("::view-transition-group")) return "group";
  return "root";
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case "idle":
      return "#6c7086";
    case "animating":
      return "#a6e3a1";
    case "finished":
      return "#89b4fa";
    default:
      return "#cdd6f4";
  }
}

export const viewTransitionsDebugger: ToolDefinition = {
  id: "view-transitions-debugger",
  name: "View Transitions Debugger",
  description: "Debug and preview View Transitions API animations",
  category: "inspection",
  icon: "RefreshCcw",
  configSchema: {
    captureSnapshots: {
      type: "boolean",
      label: "Capture Snapshots",
      default: true,
    },
    slowMotion: { type: "boolean", label: "Slow Motion", default: false },
    slowMotionDuration: {
      type: "slider",
      label: "Duration (ms)",
      default: 2000,
      min: 500,
      max: 10000,
      step: 500,
    },
    showOverlay: { type: "boolean", label: "Show Overlay", default: true },
  },
  run: (ctx, config) => {
    const captureSnapshots = config?.captureSnapshots !== false;
    const slowMotion = config?.slowMotion === true;
    const slowMotionDuration = (config?.slowMotionDuration as number) ?? 2000;
    const showOverlay = config?.showOverlay !== false;

    let mutationObserver: MutationObserver | null = null;
    let trackedPhase: ViewTransitionInfo["phase"] = "idle";
    const recentEvents: string[] = [];
    let activeOverlay: HTMLDivElement | null = null;
    let slowMotionStyle: HTMLStyleElement | null = null;

    const logEvent = (message: string) => {
      recentEvents.push(`${new Date().toLocaleTimeString()} ${message}`);
      if (recentEvents.length > 20) recentEvents.shift();
      updatePanel();
    };

    function getCurrentInfo(): ViewTransitionInfo {
      const info = detectTransitionState(recentEvents);
      if (trackedPhase !== "idle") {
        info.phase = trackedPhase;
        info.isActive = trackedPhase === "animating";
      }
      return info;
    }

    function showTransitionOverlay(): void {
      if (!showOverlay || activeOverlay) return;
      activeOverlay = document.createElement("div");
      activeOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(137, 180, 250, 0.08);
        border: 2px dashed #89b4fa;
        pointer-events: none;
        z-index: 2147483640;
      `;
      addOverlayElement(activeOverlay);
    }

    function hideTransitionOverlay(): void {
      if (activeOverlay) {
        removeOverlayElement(activeOverlay);
        activeOverlay = null;
      }
    }

    function applySlowMotion(enabled: boolean): void {
      if (enabled) {
        if (!slowMotionStyle) {
          slowMotionStyle = document.createElement("style");
          slowMotionStyle.textContent = `
            ::view-transition-group(*),
            ::view-transition-old(*),
            ::view-transition-new(*) {
              animation-duration: ${slowMotionDuration}ms !important;
            }
          `;
          document.head.appendChild(slowMotionStyle);
        }
      } else if (slowMotionStyle) {
        slowMotionStyle.remove();
        slowMotionStyle = null;
      }
    }

    const originalStartViewTransition = isSupported()
      ? document.startViewTransition.bind(document)
      : null;

    if (originalStartViewTransition) {
      document.startViewTransition = (updateCallback) => {
        logEvent("startViewTransition called");
        trackedPhase = "animating";
        applySlowMotion(slowMotion);
        showTransitionOverlay();
        updatePanel();

        const transition = originalStartViewTransition(() => {
          if (typeof updateCallback === "function") {
            const result = updateCallback();
            if (captureSnapshots) {
              logEvent("DOM update callback executed");
            }
            return result;
          }
          if (captureSnapshots) {
            logEvent("startViewTransition (no callback)");
          }
        });

        transition.ready
          .then(() => {
            logEvent("transition ready");
            updatePanel();
          })
          .catch(() => {
            logEvent("transition ready rejected");
          });

        transition.finished
          .then(() => {
            trackedPhase = "finished";
            logEvent("transition finished");
            hideTransitionOverlay();
            applySlowMotion(false);
            updatePanel();
            setTimeout(() => {
              trackedPhase = "idle";
              updatePanel();
            }, 500);
          })
          .catch(() => {
            trackedPhase = "idle";
            logEvent("transition finished rejected");
            hideTransitionOverlay();
            applySlowMotion(false);
            updatePanel();
          });

        if (captureSnapshots && transition.types) {
          logEvent(
            `types: ${Array.from(transition.types).join(", ") || "none"}`,
          );
        }

        return transition;
      };
    }

    const onPageSwap = (event: Event) => {
      const navType = (
        event as PageSwapEvent & { activation?: { navigationType?: string } }
      ).activation?.navigationType;
      logEvent(`pageswap${navType ? ` (${navType})` : ""}`);
    };
    const onPageReveal = (_event: Event) => {
      logEvent("pagereveal");
    };

    if ("onpageswap" in window) {
      window.addEventListener("pageswap", onPageSwap);
    }
    if ("onpagereveal" in window) {
      window.addEventListener("pagereveal", onPageReveal);
    }

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:16px;right:16px;width:360px;max-height:80vh;z-index:2147483647;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .panel{background:#1e1e2e;border:1px solid #45475a;border-radius:12px;padding:16px;font-family:-apple-system,sans-serif;font-size:13px;color:#cdd6f4;overflow-y:auto;max-height:80vh;box-shadow:0 20px 50px rgba(0,0,0,.5);}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #313244;}
      .title{font-weight:600;font-size:14px;}
      .close-btn{background:none;border:none;color:#6c7086;font-size:18px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;}
      .close-btn:hover{color:#f38ba8;}
      .status{padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;}
      .status-active{background:#a6e3a1;color:#1e1e2e;}
      .status-idle{background:#6c7086;color:#cdd6f4;}
      .warning{background:#f9e2af;color:#1e1e2e;padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;font-weight:600;}
      .section{margin-bottom:16px;}
      .section-label{color:#6c7086;font-size:11px;text-transform:uppercase;margin-bottom:4px;}
      .section-value{font-family:monospace;}
      .item{background:#313244;padding:8px 12px;border-radius:6px;margin-bottom:6px;font-family:monospace;font-size:12px;}
      .item-name{color:#89b4fa;font-weight:600;}
      .item-meta{color:#6c7086;font-size:11px;margin-top:2px;}
      .pseudo-name{color:#f5c2e7;}
      .refresh-btn{width:100%;padding:10px;background:#45475a;border:none;border-radius:6px;color:#cdd6f4;font-size:12px;cursor:pointer;margin-top:8px;}
      .refresh-btn:hover{background:#585b70;}
      .event-log{font-size:11px;color:#a6adc8;font-family:monospace;max-height:80px;overflow-y:auto;}
      .event-item{padding:4px 0;border-bottom:1px solid #313244;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "panel";

    function buildPanel(info: ViewTransitionInfo): void {
      while (panel.firstChild) panel.removeChild(panel.firstChild);

      const header = document.createElement("div");
      header.className = "header";
      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      titleDiv.textContent = "View Transitions Debugger";
      const statusSpan = document.createElement("span");
      statusSpan.className =
        "status " + (info.isActive ? "status-active" : "status-idle");
      statusSpan.textContent = info.isActive ? "Active" : "Idle";
      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", cleanup);
      header.append(titleDiv, statusSpan, closeBtn);
      panel.appendChild(header);

      if (!isViewTransitionsActive()) {
        const warning = document.createElement("div");
        warning.className = "warning";
        warning.textContent =
          "View Transitions API is not supported in this browser.";
        panel.appendChild(warning);
        return;
      }

      const phaseSection = document.createElement("div");
      phaseSection.className = "section";
      const phaseLabel = document.createElement("div");
      phaseLabel.className = "section-label";
      phaseLabel.textContent = "Phase";
      const phaseValue = document.createElement("div");
      phaseValue.className = "section-value";
      phaseValue.style.color = getPhaseColor(info.phase);
      phaseValue.textContent = info.phase;
      phaseSection.append(phaseLabel, phaseValue);
      panel.appendChild(phaseSection);

      if (info.capturedElements.length > 0) {
        const elementsSection = document.createElement("div");
        elementsSection.className = "section";
        const elLabel = document.createElement("div");
        elLabel.className = "section-label";
        elLabel.textContent =
          "Captured Elements (" + info.capturedElements.length + ")";
        elementsSection.appendChild(elLabel);

        for (const el of info.capturedElements) {
          const item = document.createElement("div");
          item.className = "item";
          const nameSpan = document.createElement("div");
          nameSpan.className = "item-name";
          nameSpan.textContent = el.name;
          item.appendChild(nameSpan);
          if (el.rect) {
            const meta = document.createElement("div");
            meta.className = "item-meta";
            meta.textContent =
              Math.round(el.rect.width) + "×" + Math.round(el.rect.height);
            item.appendChild(meta);
          }
          elementsSection.appendChild(item);
        }
        panel.appendChild(elementsSection);
      }

      if (info.pseudoElements.length > 0) {
        const pseudoSection = document.createElement("div");
        pseudoSection.className = "section";
        const pseudoLabel = document.createElement("div");
        pseudoLabel.className = "section-label";
        pseudoLabel.textContent =
          "Pseudo-Elements (" + info.pseudoElements.length + ")";
        pseudoSection.appendChild(pseudoLabel);

        for (const pseudo of info.pseudoElements.slice(0, 5)) {
          const item = document.createElement("div");
          item.className = "item";
          const nameSpan = document.createElement("div");
          nameSpan.className = "pseudo-name";
          nameSpan.textContent = pseudo.name;
          item.appendChild(nameSpan);
          const meta = document.createElement("div");
          meta.className = "item-meta";
          meta.textContent = "type: " + pseudo.type;
          item.appendChild(meta);
          pseudoSection.appendChild(item);
        }
        if (info.pseudoElements.length > 5) {
          const more = document.createElement("div");
          more.style.cssText =
            "color:#6c7086;font-size:11px;text-align:center;";
          more.textContent = "+" + (info.pseudoElements.length - 5) + " more";
          pseudoSection.appendChild(more);
        }
        panel.appendChild(pseudoSection);
      }

      if (info.recentEvents.length > 0) {
        const eventsSection = document.createElement("div");
        eventsSection.className = "section";
        const eventsLabel = document.createElement("div");
        eventsLabel.className = "section-label";
        eventsLabel.textContent = "Recent Events";
        eventsSection.appendChild(eventsLabel);
        const log = document.createElement("div");
        log.className = "event-log";
        for (const evt of info.recentEvents.slice(-8).reverse()) {
          const item = document.createElement("div");
          item.className = "event-item";
          item.textContent = evt;
          log.appendChild(item);
        }
        eventsSection.appendChild(log);
        panel.appendChild(eventsSection);
      }

      const refreshBtn = document.createElement("button");
      refreshBtn.className = "refresh-btn";
      refreshBtn.textContent = "Refresh Detection";
      refreshBtn.addEventListener("click", () => {
        buildPanel(getCurrentInfo());
      });
      panel.appendChild(refreshBtn);
    }

    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function updatePanel(): void {
      buildPanel(getCurrentInfo());
    }

    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          const target = mutation.target as HTMLElement;
          if (target.style.viewTransitionName) {
            updatePanel();
            break;
          }
        }
      }
    });
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    updatePanel();

    function cleanup() {
      if (originalStartViewTransition) {
        document.startViewTransition = originalStartViewTransition;
      }
      if ("onpageswap" in window) {
        window.removeEventListener("pageswap", onPageSwap);
      }
      if ("onpagereveal" in window) {
        window.removeEventListener("pagereveal", onPageReveal);
      }
      applySlowMotion(false);
      hideTransitionOverlay();
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      document.removeEventListener("keydown", handleKeyDown, true);
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
