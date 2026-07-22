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
    // Animations we paused for freezeScroll, with their original playState for restore.
    const pausedAnimations = new Map<
      Animation,
      "paused" | "running" | "idle"
    >();
    let disposed = false;
    // Capture the prior body overflow so we restore the exact value rather than blanking it.
    const priorBodyOverflow = document.body.style.overflow;

    function applyFreezeScroll(): void {
      if (!freezeScroll) return;
      // Real freeze: pause every live Animation (covers CSS scroll-driven, WAAPI,
      // and time-driven alike). This is the same approach as
      // tools/css/animation-inspector.ts.
      try {
        const animations = document.getAnimations();
        for (const anim of animations) {
          if (anim.playState !== "paused") {
            pausedAnimations.set(
              anim,
              anim.playState as "idle" | "paused" | "running",
            );
            try {
              anim.pause();
            } catch {
              // Animation may be in an invalid state; skip.
            }
          }
        }
      } catch {
        // getAnimations may throw on older browsers; fall back to nothing —
        // we intentionally do NOT use body.style.overflow as a fake freeze.
      }
    }

    function restoreFreezeScroll(): void {
      for (const [anim, prevState] of pausedAnimations) {
        try {
          if (prevState === "running") anim.play();
          else if (prevState === "idle") anim.cancel();
        } catch {
          // best-effort restore
        }
      }
      pausedAnimations.clear();
      document.body.style.overflow = priorBodyOverflow;
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
      closeBtn.setAttribute("aria-label", "Close scroll debugger");
      closeBtn.style.cssText =
        "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;";
      closeBtn.textContent = "×";
      closeBtn.onclick = () => doCleanup();
      timelinePanel.append(title, scrollPctLabel, closeBtn);
      addOverlayElement(timelinePanel);
      overlays.push(timelinePanel);

      window.addEventListener("scroll", updateScrollPosition, {
        passive: true,
      });
    }

    // Find scroll-animated elements via the real Animation API.
    // document.getAnimations() returns every live Animation, including those
    // driven by ScrollTimeline / ViewTimeline (CSS scroll-driven animations)
    // and WAAPI animations that were never wired to a CSS rule. This is far
    // more accurate than sniffing computed styles.
    if (highlightTriggers) {
      const animatedEls = new Set<HTMLElement>();

      // 1. Live Animation objects with a non-default timeline.
      try {
        const animations = document.getAnimations();
        for (const anim of animations) {
          const timeline = anim.timeline as any as {
            constructor: { name: string };
          } | null;
          const ctorName = timeline?.constructor?.name ?? "";
          if (
            ctorName === "ScrollTimeline" ||
            ctorName === "ViewTimeline" ||
            ctorName === "AnimationTimeline"
          ) {
            // AnimationTimeline is the default; only count it if the animation
            // is bound to a scroll-driven timeline via range effects.
            const effect = anim.effect as {
              getTiming?: () => { rangeStart?: unknown };
            } | null;
            const hasRange =
              effect?.getTiming &&
              typeof effect.getTiming === "function" &&
              (effect.getTiming() as { rangeStart?: unknown }).rangeStart;
            if (ctorName !== "AnimationTimeline" || hasRange) {
              const target = (anim.effect as { target?: Element | null })
                ?.target;
              if (target instanceof HTMLElement) animatedEls.add(target);
            }
          }
        }
      } catch {
        // getAnimations unsupported; fall through to CSS detection below.
      }

      // 2. CSS-driven detection via computed animation-timeline / view-timeline.
      const allEls = document.querySelectorAll("*");
      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const scrollTimeline =
          style.getPropertyValue("animation-timeline") ||
          style.getPropertyValue("view-timeline");
        if (scrollTimeline.trim() !== "" && scrollTimeline.trim() !== "auto") {
          animatedEls.add(htmlEl);
        }
      });

      // Highlight detected elements and track them through scroll/resize.
      for (const el of Array.from(animatedEls).slice(0, 50)) {
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

      // content-visibility is the modern, actually-adopted signal for
      // scroll-driven reveal. The legacy [data-io] convention is virtually
      // unused in real sites.
      if (timelinePanel) {
        let ioCount = 0;
        try {
          ioCount = document.querySelectorAll(
            "[style*='content-visibility']",
          ).length;
        } catch {
          /* ignore */
        }
        if (ioCount > 0) {
          ioBadge = document.createElement("span");
          ioBadge.style.cssText =
            "background:#7c3aed;color:white;padding:2px 6px;border-radius:4px;font-size:10px;";
          ioBadge.textContent = `${ioCount} content-visibility els`;
          timelinePanel.insertBefore(ioBadge, timelinePanel.lastChild);
        }
      }
    }

    applyFreezeScroll();
    updateScrollPosition();

    function doCleanup(): void {
      if (disposed) return;
      disposed = true;
      restoreFreezeScroll();
      for (const detach of detachTrackers) detach();
      detachTrackers.length = 0;
      window.removeEventListener("scroll", updateScrollPosition);
      for (const o of overlays) removeOverlayElement(o);
      overlays.length = 0;
      trackedBadges.length = 0;
    }

    ctx.onInvalidated(doCleanup);
    return doCleanup;
  },
};
