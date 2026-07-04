import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "@/content/overlay-manager";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable=""],[contenteditable="true"]',
  "audio[controls]",
  "video[controls]",
  "iframe",
  "details",
  "summary",
  "embed",
  "object",
].join(", ");

function hasHiddenAncestor(el: Element): boolean {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    if (current.getAttribute("aria-hidden") === "true") return true;
    if (current.hasAttribute("hidden")) return true;
    if (current.closest("[inert]")) return true;
    // Closed <dialog> without open makes its descendants non-focusable.
    if (
      current instanceof HTMLDialogElement &&
      !current.open &&
      current !== el
    ) {
      return true;
    }
    const style = window.getComputedStyle(current as HTMLElement);
    if (style.display === "none") return true;
    // visibility:hidden cascades to descendants unless they redeclare it.
    if (style.visibility === "hidden") return true;
    current = current.parentElement;
  }
  return false;
}

function isVisibleFocusable(el: HTMLElement): boolean {
  if (hasHiddenAncestor(el)) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.hasAttribute("hidden")) return false;
  if (el.closest("[inert]")) return false;
  if (el.disabled) return false;
  const style = window.getComputedStyle(el);
  // NOTE: opacity:0 IS focusable per the HTML spec — only display:none,
  // visibility:hidden, hidden, inert, disabled, or aria-hidden remove
  // focusability. Do not filter opacity.
  return style.display !== "none" && style.visibility !== "hidden";
}

/**
 * Walk the focusable elements in correct tab order:
 *   1. elements with tabindex > 0, sorted ascending by tabindex
 *   2. elements with tabindex = 0 OR naturally focusable, in DOM-tree order
 *   3. elements with tabindex = -1 are excluded (only programmatically focusable)
 *
 * Per https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute
 */
function getFocusableElements(): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isVisibleFocusable);

  const positive: HTMLElement[] = [];
  const rest: HTMLElement[] = [];
  for (const el of all) {
    const tabindex = el.getAttribute("tabindex");
    const ti = tabindex ? parseInt(tabindex, 10) : 0;
    if (ti > 0) positive.push(el);
    else rest.push(el); // ti === 0 OR invalid OR naturally focusable
  }
  positive.sort((a, b) => {
    const ta = parseInt(a.getAttribute("tabindex") || "0", 10);
    const tb = parseInt(b.getAttribute("tabindex") || "0", 10);
    return ta - tb;
  });
  return [...positive, ...rest];
}

function positionFixedOverlay(
  overlay: HTMLElement,
  rect: DOMRect,
  offsetTop = 0,
  offsetLeft = 0,
): void {
  overlay.style.top = `${rect.top + offsetTop}px`;
  overlay.style.left = `${rect.left + offsetLeft}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

function createSvgArrow(
  fromRect: DOMRect,
  toRect: DOMRect,
  fromIdx: number,
  toIdx: number,
): SVGSVGElement {
  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;

  const edgeFromX = fromX + (fromRect.width / 2 + 4) * Math.sign(toX - fromX);
  const edgeFromY =
    fromY + (fromRect.height / 2 + 4) * Math.sign(toY - fromY || 0.1);
  const edgeToX = toX - (toRect.width / 2 + 4) * Math.sign(toX - fromX);
  const edgeToY = toY - (toRect.height / 2 + 4) * Math.sign(toY - fromY || 0.1);

  const minX = Math.min(edgeFromX, edgeToX) - 20;
  const minY = Math.min(edgeFromY, edgeToY) - 20;
  const maxX = Math.max(edgeFromX, edgeToX) + 20;
  const maxY = Math.max(edgeFromY, edgeToY) + 20;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(maxX - minX));
  svg.setAttribute("height", String(maxY - minY));
  svg.style.cssText = `position:fixed;top:${minY}px;left:${minX}px;width:${maxX - minX}px;height:${maxY - minY}px;pointer-events:none;z-index:2147483644;overflow:visible;`;

  const sx = edgeFromX - minX;
  const sy = edgeFromY - minY;
  const ex = edgeToX - minX;
  const ey = edgeToY - minY;

  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(dist * 0.15, 40);
  const cx1 = midX;
  const cy1 = sy + curvature * Math.sign(dy || 1);
  const cx2 = midX;
  const cy2 = ey - curvature * Math.sign(dy || 1);

  path.setAttribute(
    "d",
    `M${sx},${sy} C${cx1},${cy1} ${cx2},${cy2} ${ex},${ey}`,
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#6366f1");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-dasharray", "4 2");
  path.setAttribute("opacity", "0.7");
  svg.appendChild(path);

  const arrow = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon",
  );
  const angle = Math.atan2(ey - cy2, ex - cx2);
  const aSize = 6;
  const ax1 = ex - aSize * Math.cos(angle - 0.4);
  const ay1 = ey - aSize * Math.sin(angle - 0.4);
  const ax2 = ex - aSize * Math.cos(angle + 0.4);
  const ay2 = ey - aSize * Math.sin(angle + 0.4);
  arrow.setAttribute("points", `${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`);
  arrow.setAttribute("fill", "#6366f1");
  arrow.setAttribute("opacity", "0.8");
  svg.appendChild(arrow);

  return svg;
}

function detectBrokenFocusTraps(): { element: Element; issue: string }[] {
  const issues: { element: Element; issue: string }[] = [];
  const modals = document.querySelectorAll(
    '[role="dialog"], [role="modal"], [aria-modal="true"], dialog',
  );

  modals.forEach((modal) => {
    const focusableAll = Array.from(
      modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(isVisibleFocusable);

    if (focusableAll.length === 0) {
      issues.push({ element: modal, issue: "Modal has no focusable elements" });
      return;
    }

    const firstFocusable = focusableAll[0];
    const lastFocusable = focusableAll[focusableAll.length - 1];

    // Static check: if focus is currently outside the modal but somewhere on
    // the page (and not on body), the trap has leaked.
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      !modal.contains(document.activeElement)
    ) {
      issues.push({
        element: modal,
        issue: "Focus may have escaped the modal",
      });
    }

    // Synthetic Tab simulation: programmatically focus the last focusable
    // element in the modal and dispatch a Tab keydown. A correctly-trapped
    // modal should move focus back to the first focusable element (or wrap
    // within the modal). If focus ends up outside the modal, the trap is
    // broken. This catches JS-based traps that look correct in markup but
    // fail at runtime (e.g. missing keydown listener, wrong selector).
    if (
      modal instanceof HTMLElement &&
      typeof firstFocusable.focus === "function"
    ) {
      try {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        lastFocusable.focus();
        const syntheticTab = new KeyboardEvent("keydown", {
          key: "Tab",
          code: "Tab",
          keyCode: 9,
          which: 9,
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        document.dispatchEvent(syntheticTab);
        // After the dispatched Tab, check where focus landed.
        const after = document.activeElement;
        if (after && !modal.contains(after) && after !== document.body) {
          issues.push({
            element: modal,
            issue:
              "Synthetic Tab from last focusable escaped the modal — trap handler may be missing or broken",
          });
        }
        // Restore prior focus to avoid disturbing the user.
        if (
          previouslyFocused &&
          typeof previouslyFocused.focus === "function"
        ) {
          previouslyFocused.focus();
        } else {
          firstFocusable.blur();
        }
      } catch {
        // Focus manipulation can throw on detached/removed elements; skip.
      }
    }
  });

  return issues;
}

export const focusDebuggerA11y: ToolDefinition = {
  id: "focus-debugger-a11y",
  name: "Focus Debugger (A11y)",
  description: "Accessibility-focused focus and keyboard navigation debugger",
  category: "accessibility",
  icon: "Eye",
  configSchema: {
    showFocusOrder: {
      type: "boolean",
      label: "Show Focus Order",
      default: true,
    },
    showTrapRegions: {
      type: "boolean",
      label: "Show Focus Trap Regions",
      default: true,
    },
    highlightSkipLinks: {
      type: "boolean",
      label: "Highlight Skip Links",
      default: true,
    },
    showAriaRoles: { type: "boolean", label: "Show ARIA Roles", default: true },
    simulateScreenReader: {
      type: "boolean",
      label: "Simulate Screen Reader",
      default: false,
    },
    showArrows: {
      type: "boolean",
      label: "Show Focus Order Arrows",
      default: true,
    },
    showBrokenTraps: {
      type: "boolean",
      label: "Detect Broken Focus Traps",
      default: true,
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const showFocusOrder = (cfg.showFocusOrder ?? true) as boolean;
    const showTrapRegions = (cfg.showTrapRegions ?? true) as boolean;
    const highlightSkipLinks = (cfg.highlightSkipLinks ?? true) as boolean;
    const showAriaRoles = (cfg.showAriaRoles ?? true) as boolean;
    const simulateScreenReader = (cfg.simulateScreenReader ?? false) as boolean;
    const showArrows = (cfg.showArrows ?? true) as boolean;
    const showBrokenTraps = (cfg.showBrokenTraps ?? true) as boolean;

    let disposed = false;
    const overlays: HTMLElement[] = [];
    const badges: HTMLElement[] = [];
    const arrows: SVGSVGElement[] = [];
    const detachTrackers: Array<() => void> = [];
    let activeFocusTarget: HTMLElement | null = null;

    function trackOverlay(tracker: () => void): void {
      detachTrackers.push(attachViewportTracker(tracker));
    }

    function createBadge(el: HTMLElement, index: number): HTMLElement {
      const badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;z-index:2147483646;pointer-events:none;" +
        "min-width:18px;height:18px;border-radius:9px;" +
        "background:#6366f1;color:white;font-size:10px;font-weight:700;" +
        "display:flex;align-items:center;justify-content:center;padding:0 4px;" +
        "font-family:system-ui,sans-serif;line-height:1;";
      const update = () => {
        if (disposed) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        badge.style.top = `${rect.top - 10}px`;
        badge.style.left = `${rect.left - 10}px`;
      };
      update();
      addOverlayElement(badge);
      trackOverlay(update);
      return badge;
    }

    function renderFocusBadges(): void {
      clearBadges();
      const focusable = getFocusableElements();
      focusable.forEach((el, i) => {
        const badge = createBadge(el, i);
        badge.textContent = String(i + 1);
        badges.push(badge);
        overlays.push(badge);
      });
    }

    function clearBadges(): void {
      badges.forEach((b) => removeOverlayElement(b));
      badges.length = 0;
    }

    function createFocusHighlight(): HTMLElement {
      const hl = document.createElement("div");
      hl.style.cssText =
        "position:fixed;z-index:2147483645;pointer-events:none;" +
        "border:3px solid #f59e0b;background:rgba(245,158,11,0.12);border-radius:3px;" +
        "display:none;transition:all 0.1s ease;";
      addOverlayElement(hl);
      overlays.push(hl);
      return hl;
    }

    const focusHighlight = createFocusHighlight();

    function updateFocusHighlight(el: HTMLElement): void {
      activeFocusTarget = el;
      const rect = el.getBoundingClientRect();
      focusHighlight.style.display = "block";
      focusHighlight.style.top = `${rect.top - 2}px`;
      focusHighlight.style.left = `${rect.left - 2}px`;
      focusHighlight.style.width = `${rect.width + 4}px`;
      focusHighlight.style.height = `${rect.height + 4}px`;
    }

    trackOverlay(() => {
      if (disposed || !activeFocusTarget) return;
      const rect = activeFocusTarget.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        focusHighlight.style.display = "none";
        return;
      }
      focusHighlight.style.display = "block";
      focusHighlight.style.top = `${rect.top - 2}px`;
      focusHighlight.style.left = `${rect.left - 2}px`;
      focusHighlight.style.width = `${rect.width + 4}px`;
      focusHighlight.style.height = `${rect.height + 4}px`;
    });

    function hideFocusHighlight(): void {
      focusHighlight.style.display = "none";
    }

    function highlightSkipLinksOnPage(): void {
      const skipLinks = document.querySelectorAll(
        'a[href^="#"], a.skip-link, a[class*="skip"]',
      );
      skipLinks.forEach((link) => {
        if (!link.textContent?.trim()) return;
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          const indicator = document.createElement("div");
          indicator.style.cssText =
            "position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483646;pointer-events:none;" +
            "background:#10b981;color:white;padding:4px 12px;border-radius:4px;font-size:11px;font-family:system-ui,sans-serif;";
          indicator.textContent =
            "Skip link: " + (link.textContent?.trim().slice(0, 30) || "");
          addOverlayElement(indicator);
          overlays.push(indicator);
        }
      });
    }

    function detectFocusTraps(): void {
      const modalRoots = document.querySelectorAll(
        '[role="dialog"], [role="modal"], [aria-modal="true"]',
      );
      modalRoots.forEach((modal) => {
        const indicator = document.createElement("div");
        indicator.style.cssText =
          "position:fixed;z-index:2147483646;pointer-events:none;" +
          "border:2px dashed #f97316;background:rgba(249,115,22,0.06);border-radius:4px;";
        const label = document.createElement("div");
        label.style.cssText =
          "position:absolute;top:-18px;left:0;background:#f97316;color:white;padding:1px 6px;" +
          "border-radius:2px;font-size:10px;font-family:system-ui,sans-serif;white-space:nowrap;";
        label.textContent = "Focus trap region";
        indicator.appendChild(label);
        const update = () => {
          if (disposed) return;
          const rect = modal.getBoundingClientRect();
          positionFixedOverlay(indicator, rect);
        };
        update();
        addOverlayElement(indicator);
        overlays.push(indicator);
        trackOverlay(update);
      });
    }

    function showAriaRoleIndicators(): void {
      const elementsWithRoles = document.querySelectorAll("[role]");
      elementsWithRoles.forEach((el) => {
        const role = el.getAttribute("role");
        if (!role) return;
        const tag = document.createElement("div");
        tag.style.cssText =
          "position:fixed;z-index:2147483646;pointer-events:none;" +
          "background:#8b5cf6;color:white;padding:1px 5px;border-radius:2px;" +
          "font-size:9px;font-family:monospace;white-space:nowrap;";
        tag.textContent = "role=" + role;
        const update = () => {
          if (disposed) return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            tag.style.display = "none";
            return;
          }
          tag.style.display = "block";
          tag.style.top = `${rect.top - 14}px`;
          tag.style.left = `${rect.right + 4}px`;
        };
        update();
        addOverlayElement(tag);
        overlays.push(tag);
        trackOverlay(update);
      });
    }

    const screenReaderPanel = document.createElement("div");
    screenReaderPanel.style.cssText =
      "position:fixed;bottom:16px;left:16px;z-index:2147483647;pointer-events:none;" +
      "background:#1e1e2e;color:#cdd6f4;padding:10px 14px;border-radius:8px;" +
      "font-family:system-ui,sans-serif;font-size:12px;max-width:400px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.4);border:1px solid #45475a;display:none;";

    function describeForScreenReader(el: HTMLElement): string {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      const ariaLabel = el.getAttribute("aria-label") || "";
      const text = el.textContent?.trim().slice(0, 60) || "";
      const parts: string[] = [tag];
      if (role) parts.push("role: " + role);
      if (ariaLabel) parts.push("label: " + ariaLabel);
      else if (text) parts.push('"' + text + '"');
      return parts.join(" | ");
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.getBoundingClientRect) return;
      updateFocusHighlight(target);
      if (simulateScreenReader) {
        screenReaderPanel.style.display = "block";
        screenReaderPanel.textContent = describeForScreenReader(target);
      }
    };

    const handleFocusOut = () => {
      activeFocusTarget = null;
      hideFocusHighlight();
      screenReaderPanel.style.display = "none";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cleanup();
      }
    };

    function clearArrows(): void {
      arrows.forEach((a) => a.remove());
      arrows.length = 0;
    }

    function renderFocusArrows(): void {
      clearArrows();
      const focusable = getFocusableElements();
      for (let i = 0; i < focusable.length - 1; i++) {
        const fromRect = focusable[i].getBoundingClientRect();
        const toRect = focusable[i + 1].getBoundingClientRect();
        if (fromRect.width === 0 || toRect.width === 0) continue;
        const arrow = createSvgArrow(fromRect, toRect, i, i + 1);
        document.body.appendChild(arrow);
        arrows.push(arrow);
      }
    }

    function renderBrokenTrapWarnings(): void {
      const broken = detectBrokenFocusTraps();
      broken.forEach(({ element, issue }) => {
        const warning = document.createElement("div");
        warning.style.cssText =
          "position:fixed;z-index:2147483646;pointer-events:none;" +
          "background:#dc2626;color:white;padding:4px 10px;border-radius:4px;" +
          "font-size:11px;font-family:system-ui,sans-serif;white-space:nowrap;" +
          "box-shadow:0 2px 8px rgba(220,38,38,0.4);";
        warning.textContent = "⚠ " + issue;
        const update = () => {
          if (disposed) return;
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            warning.style.display = "none";
            return;
          }
          warning.style.display = "block";
          warning.style.top = `${rect.bottom + 4}px`;
          warning.style.left = `${rect.left}px`;
        };
        update();
        addOverlayElement(warning);
        overlays.push(warning);
        trackOverlay(update);
      });
    }

    if (showFocusOrder) renderFocusBadges();
    if (showTrapRegions) detectFocusTraps();
    if (showBrokenTraps) renderBrokenTrapWarnings();
    if (highlightSkipLinks) highlightSkipLinksOnPage();
    if (showAriaRoles) showAriaRoleIndicators();

    if (simulateScreenReader) {
      addOverlayElement(screenReaderPanel);
      screenReaderPanel.style.pointerEvents = "none";
      overlays.push(screenReaderPanel);
    }

    if (showArrows && showFocusOrder) {
      renderFocusArrows();
      trackOverlay(() => {
        if (disposed) return;
        renderFocusArrows();
      });
    }

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("keydown", handleKeyDown, true);

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      detachTrackers.forEach((detach) => detach());
      detachTrackers.length = 0;
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      overlays.forEach((el) => removeOverlayElement(el));
      overlays.length = 0;
      badges.length = 0;
      clearArrows();
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
