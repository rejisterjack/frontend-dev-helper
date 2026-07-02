import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

interface TrackedBadge {
  badge: HTMLElement;
  outline: HTMLElement;
  el: HTMLElement;
}

export const scrollAnimationsDebugger: ToolDefinition = {
  id: "scroll-animations-debugger",
  name: "Scroll Animations Debugger",
  description: "Debug scroll-driven animations and scroll-linked effects",
  category: "performance",
  icon: "ArrowDown",
  configSchema: {
    showScrollTimeline: {
      type: "boolean",
      label: "Show Scroll Timeline",
      default: true,
    },
    showProgress: { type: "boolean", label: "Show Progress", default: true },
    freezeScroll: { type: "boolean", label: "Freeze Scroll", default: false },
    highlightTriggers: {
      type: "boolean",
      label: "Highlight Triggers",
      default: true,
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const showTimeline = (cfg.showScrollTimeline as boolean) ?? true;
    const showProgress = (cfg.showProgress as boolean) ?? true;
    const freezeScroll = (cfg.freezeScroll as boolean) ?? false;
    const highlightTriggers = (cfg.highlightTriggers as boolean) ?? true;

    const overlays: HTMLElement[] = [];
    const trackedBadges: TrackedBadge[] = [];
    const detachTrackers: Array<() => void> = [];
    let disposed = false;

    if (freezeScroll) {
      // Note: this can pause CSS scroll-driven animations because they need
      // a scrolling container. It is opt-in and intended for measuring the
      // static state of an in-progress animation.
      document.body.style.overflow = "hidden";
    }

    // Progress bar at top of viewport
    let progressBar: HTMLElement | null = null;
    if (showProgress) {
      progressBar = document.createElement("div");
      progressBar.style.cssText =
        "position:fixed;top:0;left:0;width:0%;height:3px;z-index:2147483646;" +
        "background:linear-gradient(90deg,#3b82f6,#a855f7);transition:width .1s ease;pointer-events:none;";
      addOverlayElement(progressBar);
      overlays.push(progressBar);
    }

    // Timeline panel
    let timelinePanel: HTMLElement | null = null;
    let scrollPctLabel: HTMLElement | null = null;
    let ioBadge: HTMLElement | null = null;

    function updateScrollPosition(): void {
      if (disposed) return;
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      if (scrollPctLabel) scrollPctLabel.textContent = pct + "%";
      if (progressBar) progressBar.style.width = pct + "%";
    }

    function updateFrameStats(): void {
      // Frame-rate / scroll-jank detector: tracks the worst frame interval
      // over the last 1s. Cheap enough to run alongside the existing rAF.
      // (Implementation deferred — this stub keeps the slot without spending
      // CPU on a high-frequency timer; a real jank detector is tracked as
      // Phase 2 work.)
    }

    if (showTimeline) {
      timelinePanel = document.createElement("div");
      timelinePanel.style.cssText =
        "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:auto;" +
        "background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 16px;" +
        "font-family:system-ui,sans-serif;color:#e2e8f0;font-size:12px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 12px rgba(0,0,0,.4);";
      const title = document.createElement("span");
      title.style.cssText = "font-weight:600;";
      title.textContent = "Scroll Debugger";
      scrollPctLabel = document.createElement("span");
      scrollPctLabel.style.cssText = "color:#94a3b8;";
      scrollPctLabel.textContent = "0%";
      const closeBtn = document.createElement("button");
      closeBtn.style.cssText =
        "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;";
      closeBtn.textContent = "×";
      // IMPORTANT: bind to the real cleanup function reference, not the
      // placeholder const. Previously `closeBtn.onclick = cleanup` captured
      // the no-op placeholder before `cleanup` was reassigned, leaving the
      // close button dead.
      closeBtn.onclick = () => doCleanup();
      timelinePanel.append(title, scrollPctLabel, closeBtn);
      addOverlayElement(timelinePanel);
      overlays.push(timelinePanel);

      window.addEventListener("scroll", updateScrollPosition, {
        passive: true,
      });
      window.addEventListener("scroll", updateFrameStats, { passive: true });
    }

    // Find scroll-animated elements.
    if (highlightTriggers) {
      const allEls = document.querySelectorAll("*");
      const animatedEls: HTMLElement[] = [];

      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        const animName = style.animationName;
        // animation-timeline / view-timeline are the real CSS signals for
        // scroll-driven animations. animName !== none alone is far too broad
        // (catches every spinner, hover transition, marquee).
        const scrollTimeline =
          style.getPropertyValue("animation-timeline") ||
          style.getPropertyValue("view-timeline");
        const isSticky = style.position === "sticky";
        const hasTransform = style.transform !== "none";

        if (scrollTimeline.trim() !== "" || (isSticky && hasTransform)) {
          animatedEls.push(htmlEl);
        }
      });

      // Highlight detected elements and track them through scroll/resize.
      for (const el of animatedEls.slice(0, 50)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const badge = document.createElement("div");
        badge.style.cssText =
          "position:fixed;z-index:2147483646;pointer-events:none;" +
          `top:${rect.top - 16}px;left:${rect.left}px;` +
          "background:#a855f7;color:white;padding:1px 6px;border-radius:2px;font-size:9px;font-family:system-ui,sans-serif;white-space:nowrap;";
        badge.textContent = "⬇ scroll-anim";
        addOverlayElement(badge);
        overlays.push(badge);

        const outline = document.createElement("div");
        outline.style.cssText =
          "position:fixed;z-index:2147483645;pointer-events:none;" +
          `top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;` +
          "border:2px dashed #a855f7;border-radius:3px;background:rgba(168,85,247,.05);";
        addOverlayElement(outline);
        overlays.push(outline);

        // Reposition on scroll/resize so badges don't drift off-target.
        const tracker = () => {
          if (disposed) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          badge.style.top = `${r.top - 16}px`;
          badge.style.left = `${r.left}px`;
          outline.style.top = `${r.top}px`;
          outline.style.left = `${r.left}px`;
          outline.style.width = `${r.width}px`;
          outline.style.height = `${r.height}px`;
        };
        detachTrackers.push(attachViewportTracker(tracker));
        trackedBadges.push({ badge, outline, el });
      }

      // Approximate IO-observer count via getEntriesByType when supported.
      // Note: the previous implementation monkey-patched window.IntersectionObserver
      // and never restored the patch — that leak is removed entirely.
      if (timelinePanel) {
        let ioCount = 0;
        try {
          // There's no public API to enumerate live IntersectionObservers;
          // we use the presence of any element with an intersecting-related
          // data attribute as a heuristic instead of leaking a monkey-patch.
          ioCount = document.querySelectorAll(
            "[data-io],[data-intersection]",
          ).length;
        } catch {
          /* ignore */
        }
        if (ioCount > 0) {
          ioBadge = document.createElement("span");
          ioBadge.style.cssText =
            "background:#7c3aed;color:white;padding:2px 6px;border-radius:4px;font-size:10px;";
          ioBadge.textContent = `${ioCount} IO candidates`;
          timelinePanel.insertBefore(ioBadge, timelinePanel.lastChild);
        }
      }
    }

    updateScrollPosition();

    function doCleanup(): void {
      if (disposed) return;
      disposed = true;
      if (freezeScroll) document.body.style.overflow = "";
      for (const detach of detachTrackers) detach();
      detachTrackers.length = 0;
      window.removeEventListener("scroll", updateScrollPosition);
      window.removeEventListener("scroll", updateFrameStats);
      for (const o of overlays) removeOverlayElement(o);
      overlays.length = 0;
      trackedBadges.length = 0;
    }

    ctx.onInvalidated(doCleanup);
    return doCleanup;
  },
};
