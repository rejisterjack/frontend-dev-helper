import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
  attachViewportTracker,
} from "@/content/overlay-manager";

interface AnimationEntry {
  element: HTMLElement;
  selector: string;
  animations: {
    name: string;
    duration: string;
    timingFunction: string;
    delay: string;
    iterationCount: string;
    direction: string;
  }[];
  transitions: {
    property: string;
    duration: string;
    timingFunction: string;
    delay: string;
  }[];
}

interface TrackedAnim {
  anim: Animation;
  originalPlaybackRate: number;
  originalPaused: boolean;
}

function describeElement(el: HTMLElement): string {
  let s = el.tagName.toLowerCase();
  if (el.id) s += "#" + el.id;
  const classes =
    el.className && typeof el.className === "string"
      ? el.className.trim().split(/\s+/).slice(0, 2)
      : [];
  if (classes.length) s += "." + classes.join(".");
  return s;
}

function collectAnimatedElements(): AnimationEntry[] {
  const entries: AnimationEntry[] = [];
  const all = document.querySelectorAll("*");

  for (const el of all) {
    const html = el as HTMLElement;
    const computed = getComputedStyle(html);
    const animName = computed.animationName;
    const transProp = computed.transitionProperty;
    const hasAnim = animName && animName !== "none";
    const hasTrans = transProp && transProp !== "none" && transProp !== "all";

    if (!hasAnim && !hasTrans) continue;

    const rect = html.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const entry: AnimationEntry = {
      element: html,
      selector: describeElement(html),
      animations: [],
      transitions: [],
    };

    if (hasAnim) {
      const names = animName.split(",");
      const durations = computed.animationDuration.split(",");
      const timings = computed.animationTimingFunction.split(",");
      const delays = computed.animationDelay.split(",");
      const iterations = computed.animationIterationCount.split(",");
      const directions = computed.animationDirection.split(",");

      for (let i = 0; i < names.length; i++) {
        entry.animations.push({
          name: names[i].trim(),
          duration: (durations[i] || durations[0] || "0s").trim(),
          timingFunction: (timings[i] || timings[0] || "ease").trim(),
          delay: (delays[i] || delays[0] || "0s").trim(),
          iterationCount: (iterations[i] || iterations[0] || "1").trim(),
          direction: (directions[i] || directions[0] || "normal").trim(),
        });
      }
    }

    if (hasTrans) {
      const props = transProp.split(",");
      const durations = computed.transitionDuration.split(",");
      const timings = computed.transitionTimingFunction.split(",");
      const delays = computed.transitionDelay.split(",");

      for (let i = 0; i < props.length; i++) {
        entry.transitions.push({
          property: props[i].trim(),
          duration: (durations[i] || durations[0] || "0s").trim(),
          timingFunction: (timings[i] || timings[0] || "ease").trim(),
          delay: (delays[i] || delays[0] || "0s").trim(),
        });
      }
    }

    entries.push(entry);
  }

  return entries;
}

function parseDurationToMs(raw: string): number {
  const v = parseFloat(raw);
  if (isNaN(v)) return 0;
  if (/ms$/i.test(raw)) return v;
  if (/s$/i.test(raw)) return v * 1000;
  return v;
}

/**
 * Render a 16x16 SVG thumbnail of a CSS easing function so the user can see
 * the curve shape at a glance. Named easings map to their canonical cubic-
 * bezier. Custom `cubic-bezier(a, b, c, d)` values are parsed directly.
 * `linear` and unknown values fall back to a straight diagonal.
 */
function renderEasingThumbnail(timing: string): SVGSVGElement {
  const NAMED: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
  };
  const trimmed = (timing || "ease").trim();
  let pts: [number, number, number, number] = NAMED[trimmed] ?? [
    0.25, 0.1, 0.25, 1,
  ];
  const m =
    /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(
      trimmed,
    );
  if (m) {
    pts = [+m[1], +m[2], +m[3], +m[4]];
  }
  // Sample the bezier curve to build a polyline. Coordinate system: SVG with
  // origin top-left; flip y so "up" is progress.
  const size = 16;
  const pad = 1;
  const inner = size - pad * 2;
  const samples: string[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // De Casteljau's algorithm for cubic bezier with P0=(0,0) P3=(1,1).
    const [x1, y1, x2, y2] = pts;
    const x =
      3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    const y =
      3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    const sx = pad + x * inner;
    const sy = pad + (1 - y) * inner;
    samples.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.style.cssText = "flex-shrink:0;opacity:0.85;";
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", String(pad));
  rect.setAttribute("y", String(pad));
  rect.setAttribute("width", String(inner));
  rect.setAttribute("height", String(inner));
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke", "#45475a");
  rect.setAttribute("stroke-width", "0.5");
  svg.appendChild(rect);
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  poly.setAttribute("points", samples.join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "#89b4fa");
  poly.setAttribute("stroke-width", "1");
  svg.appendChild(poly);
  return svg;
}

function createTimelineStrip(
  durationMs: number,
  delayMs: number,
  iterationCount: string,
  isActive: boolean,
): HTMLDivElement {
  const strip = document.createElement("div");
  strip.style.cssText = `
    position:relative;height:6px;border-radius:3px;background:#1e1e2e;
    overflow:hidden;margin-top:4px;border:1px solid #313244;
  `;

  const cycleMs = durationMs + delayMs;
  const totalMs =
    cycleMs > 0
      ? iterationCount === "infinite" || iterationCount === "infinite alternate"
        ? cycleMs * 3
        : cycleMs * Math.max(1, parseInt(iterationCount || "1", 10) || 1)
      : 0;

  const delayPct = totalMs > 0 ? (delayMs / totalMs) * 100 : 0;
  const durPct = totalMs > 0 ? (durationMs / totalMs) * 100 : 0;

  const delayBar = document.createElement("div");
  delayBar.style.cssText = `position:absolute;left:0;top:0;height:100%;width:${delayPct}%;background:#45475a;`;
  strip.appendChild(delayBar);

  const fill = document.createElement("div");
  fill.style.cssText = `position:absolute;left:${delayPct}%;top:0;height:100%;width:${durPct}%;background:${isActive ? "#89b4fa" : "#6c7086"};opacity:0.6;`;
  strip.appendChild(fill);

  const progress = document.createElement("div");
  progress.style.cssText = `position:absolute;left:${delayPct}%;top:0;height:100%;width:0%;background:${isActive ? "#a6e3a1" : "#94e2d5"};transition:width 0.1s linear;`;
  strip.appendChild(progress);

  strip.dataset.fillLeft = String(delayPct);
  strip.dataset.durPct = String(durPct);
  return strip;
}

function updateTimelineProgress(strip: HTMLDivElement, anim: Animation): void {
  const fill = strip.querySelector<HTMLDivElement>("div:nth-child(3)");
  if (!fill) return;
  const _startTime = anim.startTime ?? 0;
  const duration =
    anim.effect && "getTiming" in anim.effect
      ? anim.effect.getTiming().duration
      : 0;
  const dur = typeof duration === "number" ? duration : 0;
  if (dur <= 0) return;
  const currentTime =
    typeof anim.currentTime === "number" ? anim.currentTime : 0;
  const pct = Math.min(100, Math.max(0, (currentTime / dur) * 100));
  const baseLeft = parseFloat(strip.dataset.fillLeft || "0");
  const durPct = parseFloat(strip.dataset.durPct || "0");
  fill.style.left = `${baseLeft}%`;
  fill.style.width = `${(pct / 100) * durPct}%`;
}

function createAnimationPanel(
  entries: AnimationEntry[],
  tracked: TrackedAnim[],
  onSpeedChange: (speed: string) => void,
  onPauseToggles: Record<string, (paused: boolean) => void>,
): HTMLDivElement {
  const panel = document.createElement("div");
  panel.setAttribute("data-fdh-overlay", "anim-inspector");
  panel.style.cssText = `
    position:fixed;top:12px;right:12px;width:380px;
    background:#1e1e2e;border:1px solid #45475a;border-radius:12px;
    padding:14px;font-family:-apple-system,system-ui,sans-serif;
    font-size:12px;color:#cdd6f4;z-index:2147483647;
    box-shadow:0 16px 40px rgba(0,0,0,0.5);max-height:80vh;overflow-y:auto;
  `;

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #313244;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:600;font-size:14px;";
  title.textContent = `Animations (${entries.length})`;
  header.appendChild(title);

  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;gap:4px;";

  const speeds = ["0.25x", "0.5x", "1x", "2x"];
  for (const speed of speeds) {
    const btn = document.createElement("button");
    btn.style.cssText = `padding:3px 8px;background:#45475a;border:none;border-radius:4px;color:#cdd6f4;font-size:10px;cursor:pointer;`;
    if (speed === "1x") btn.style.background = "#89b4fa55";
    btn.textContent = speed;
    btn.addEventListener("click", () => {
      controls
        .querySelectorAll("button[data-speed]")
        .forEach((b) => {
          (b as HTMLElement).style.background = "#45475a";
        });
      btn.style.background = "#89b4fa55";
      onSpeedChange(speed);
    });
    btn.dataset.speed = speed;
    controls.appendChild(btn);
  }
  // Global pause/resume button — complements the per-element pause buttons
  // and the initial `pauseAll` config flag.
  const pauseAllBtn = document.createElement("button");
  pauseAllBtn.style.cssText =
    "padding:3px 8px;background:#f38ba855;border:none;border-radius:4px;color:#f38ba8;font-size:10px;cursor:pointer;margin-left:4px;";
  pauseAllBtn.textContent = "Pause All";
  let allPaused = false;
  pauseAllBtn.addEventListener("click", () => {
    allPaused = !allPaused;
    pauseAllBtn.textContent = allPaused ? "Resume All" : "Pause All";
    pauseAllBtn.style.background = allPaused ? "#a6e3a155" : "#f38ba855";
    pauseAllBtn.style.color = allPaused ? "#a6e3a1" : "#f38ba8";
    // Apply to every tracked animation regardless of target.
    for (const selectorFn of Object.values(onPauseToggles)) {
      selectorFn(allPaused);
    }
  });
  controls.appendChild(pauseAllBtn);
  header.appendChild(controls);
  panel.appendChild(header);

  const helpLine = document.createElement("div");
  helpLine.style.cssText = "color:#6c7086;font-size:10px;margin-bottom:10px;";
  helpLine.textContent =
    "Per-animation pause preserves unrelated animations. Playback rate slider adjusts all.";
  panel.appendChild(helpLine);

  for (const entry of entries.slice(0, 30)) {
    const item = document.createElement("div");
    item.style.cssText =
      "background:#313244;padding:8px 10px;border-radius:6px;margin-bottom:6px;";

    const headRow = document.createElement("div");
    headRow.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;";

    const sel = document.createElement("div");
    sel.style.cssText =
      "font-family:monospace;font-size:11px;color:#89b4fa;word-break:break-all;flex:1;";
    sel.textContent = entry.selector;
    headRow.appendChild(sel);

    const perElBtn = document.createElement("button");
    perElBtn.style.cssText =
      "padding:2px 6px;background:#45475a;border:none;border-radius:3px;color:#cdd6f4;font-size:9px;cursor:pointer;margin-left:6px;flex-shrink:0;";
    perElBtn.textContent = "Pause";
    let elPaused = false;
    const elAnims = tracked.filter((t) => {
      const target =
        t.anim.effect && "target" in t.anim.effect
          ? (t.anim.effect as AnimationEffect).getComputedTiming
            ? null
            : null
          : null;
      return target === entry.element;
    });
    const elementAnimations: Animation[] = [];
    try {
      for (const t of tracked) {
        const eff = t.anim.effect;
        if (
          eff &&
          typeof (eff as KeyframeEffect).target === "object" &&
          (eff as KeyframeEffect).target === entry.element
        ) {
          elementAnimations.push(t.anim);
        }
      }
    } catch {
      // fall through
    }
    perElBtn.addEventListener("click", () => {
      elPaused = !elPaused;
      onPauseToggles[entry.selector]?.(elPaused);
      perElBtn.textContent = elPaused ? "Resume" : "Pause";
      perElBtn.style.background = elPaused ? "#f38ba855" : "#45475a";
      void elAnims;
      for (const a of elementAnimations) {
        try {
          if (elPaused) a.pause();
          else a.play();
        } catch {
          // swallow
        }
      }
    });
    headRow.appendChild(perElBtn);
    item.appendChild(headRow);

    for (const anim of entry.animations) {
      const animRow = document.createElement("div");
      animRow.style.cssText =
        "display:flex;align-items:center;gap:6px;font-size:10px;color:#a6adc8;margin-left:8px;margin-top:4px;margin-bottom:2px;";
      // Easing-curve thumbnail: a tiny SVG showing the cubic-bezier shape
      // so authors can see at a glance whether an animation is linear, ease-in,
      // ease-out, etc. — mirrors the Chrome DevTools animation sidebar.
      const thumb = renderEasingThumbnail(anim.timingFunction);
      animRow.appendChild(thumb);
      const label = document.createElement("span");
      label.textContent = `@${anim.name} ${anim.duration} ${anim.timingFunction} ${anim.delay} x${anim.iterationCount}`;
      animRow.appendChild(label);
      item.appendChild(animRow);

      const strip = createTimelineStrip(
        parseDurationToMs(anim.duration),
        parseDurationToMs(anim.delay),
        anim.iterationCount,
        true,
      );
      item.appendChild(strip);

      const matchingAnim = elementAnimations.find((a) => {
        try {
          const n = (a as Animation & { animationName?: string }).animationName;
          return !n || n === anim.name;
        } catch {
          return true;
        }
      });
      if (matchingAnim) {
        strip.dataset.animId = String(
          tracked.findIndex((t) => t.anim === matchingAnim),
        );
      }
    }

    for (const trans of entry.transitions) {
      const row = document.createElement("div");
      row.style.cssText =
        "font-size:10px;color:#a6e3a1;margin-left:8px;margin-top:4px;margin-bottom:2px;";
      row.textContent = `transition: ${trans.property} ${trans.duration} ${trans.timingFunction}`;
      item.appendChild(row);

      const strip = createTimelineStrip(
        parseDurationToMs(trans.duration),
        parseDurationToMs(trans.delay),
        "1",
        false,
      );
      item.appendChild(strip);
    }

    panel.appendChild(item);
  }

  if (entries.length > 30) {
    const more = document.createElement("div");
    more.style.cssText =
      "text-align:center;color:#6c7086;font-size:11px;margin-top:6px;";
    more.textContent = `+${entries.length - 30} more`;
    panel.appendChild(more);
  }

  return panel;
}

export const animationInspector: ToolDefinition = {
  id: "animation-inspector",
  name: "Animation Inspector",
  description: "Inspect, pause, and control CSS animations and transitions",
  category: "css",
  icon: "Play",
  configSchema: {
    pauseAll: { type: "boolean", label: "Pause All", default: false },
    showTimeline: { type: "boolean", label: "Show Timeline", default: true },
    slowMotion: {
      type: "select",
      label: "Playback Speed",
      default: "1x",
      options: [
        { label: "0.25x", value: "0.25x" },
        { label: "0.5x", value: "0.5x" },
        { label: "1x", value: "1x" },
        { label: "2x", value: "2x" },
      ],
    },
    highlightAnimated: {
      type: "boolean",
      label: "Highlight Animated Elements",
      default: true,
    },
  },
  run(ctx, config = {}) {
    const showTimeline = config.showTimeline !== false;
    const highlightAnimated = config.highlightAnimated !== false;
    const highlightOverlays: HTMLDivElement[] = [];
    const detachTrackers: Array<() => void> = [];
    const tracked: TrackedAnim[] = [];

    const allAnimations = document.getAnimations();
    for (const anim of allAnimations) {
      tracked.push({
        anim,
        originalPlaybackRate: anim.playbackRate,
        originalPaused: anim.playState === "paused",
      });
    }

    const entries = collectAnimatedElements();

    if (highlightAnimated) {
      for (const entry of entries) {
        const rect = entry.element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const color = entry.animations.length > 0 ? "#f38ba8" : "#f9e2af";
        const box = document.createElement("div");
        box.setAttribute("data-fdh-overlay", "anim-highlight");
        const target = entry.element;
        const position = () => {
          const r = target.getBoundingClientRect();
          box.style.top = `${r.top}px`;
          box.style.left = `${r.left}px`;
          box.style.width = `${r.width}px`;
          box.style.height = `${r.height}px`;
        };
        box.style.cssText = `
          position:fixed;top:${rect.top}px;left:${rect.left}px;
          width:${rect.width}px;height:${rect.height}px;
          border:2px solid ${color};background:${color}15;
          pointer-events:none;z-index:2147483640;
        `;

        const label = document.createElement("div");
        label.style.cssText = `
          position:absolute;top:-16px;left:0;padding:0 4px;
          background:${color};color:#1e1e2e;font-size:9px;line-height:14px;
          font-weight:600;border-radius:2px;white-space:nowrap;
        `;
        label.textContent = entry.animations.length > 0 ? "anim" : "trans";
        box.appendChild(label);

        addOverlayElement(box);
        highlightOverlays.push(box);
        detachTrackers.push(attachViewportTracker(position));
      }
    }

    function setPlaybackSpeed(speedStr: string) {
      const factor = parseFloat(speedStr) || 1;
      for (const t of tracked) {
        try {
          t.anim.playbackRate = factor;
        } catch {
          // swallow
        }
      }
    }

    const panelHost = document.createElement("div");
    panelHost.setAttribute("data-fdh-overlay", "anim-panel-host");
    panelHost.style.cssText =
      "position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const pauseToggles: Record<string, (paused: boolean) => void> = {};
    for (const entry of entries) {
      pauseToggles[entry.selector] = (paused: boolean) => {
        for (const t of tracked) {
          const eff = t.anim.effect as KeyframeEffect | null;
          if (
            !eff ||
            typeof eff.target !== "object" ||
            eff.target !== entry.element
          )
            continue;
          try {
            if (paused) t.anim.pause();
            else t.anim.play();
          } catch {
            // swallow
          }
        }
      };
    }

    const panel = createAnimationPanel(
      entries,
      tracked,
      setPlaybackSpeed,
      pauseToggles,
    );
    panel.style.pointerEvents = "auto";
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    const initialSpeed = (config.slowMotion as string) || "1x";
    if (initialSpeed !== "1x") setPlaybackSpeed(initialSpeed);

    if (config.pauseAll === true) {
      for (const t of tracked) {
        try {
          t.anim.pause();
        } catch {
          // swallow
        }
      }
    }

    let rafId = 0;
    let rafRunning = showTimeline;
    function tick() {
      if (!rafRunning) return;
      const strips = panel.querySelectorAll<HTMLDivElement>("[data-anim-id]");
      strips.forEach((strip) => {
        const idx = parseInt(strip.dataset.animId || "-1", 10);
        const t = tracked[idx];
        if (!t) return;
        updateTimelineProgress(strip, t.anim);
      });
      rafId = requestAnimationFrame(tick);
    }
    if (rafRunning) rafId = requestAnimationFrame(tick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      rafRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const detach of detachTrackers) detach();
      for (const o of highlightOverlays) removeOverlayElement(o);
      for (const t of tracked) {
        try {
          t.anim.playbackRate = t.originalPlaybackRate;
          if (!t.originalPaused) t.anim.play();
          else t.anim.pause();
        } catch {
          // swallow
        }
      }
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
