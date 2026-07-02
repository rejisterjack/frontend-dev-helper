import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
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

function setAllAnimationsPaused(paused: boolean): void {
  for (const anim of document.getAnimations()) {
    if (paused) anim.pause();
    else anim.play();
  }
}

function createAnimationPanel(
  entries: AnimationEntry[],
  onSpeedChange: (speed: string) => void,
  onPauseToggle: (paused: boolean) => void,
): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.cssText = `
    position:fixed;top:12px;right:12px;width:360px;
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
        .querySelectorAll("button")
        .forEach((b) => (b.style.background = "#45475a"));
      btn.style.background = "#89b4fa55";
      onSpeedChange(speed);
    });
    controls.appendChild(btn);
  }
  header.append(title, controls);
  panel.appendChild(header);

  const pauseBtn = document.createElement("button");
  pauseBtn.style.cssText =
    "width:100%;padding:8px;background:#45475a;border:none;border-radius:6px;color:#cdd6f4;font-size:11px;cursor:pointer;margin-bottom:10px;";
  let paused = false;
  pauseBtn.textContent = "Pause All Animations";
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    setAllAnimationsPaused(paused);
    onPauseToggle(paused);
    pauseBtn.textContent = paused
      ? "Resume All Animations"
      : "Pause All Animations";
    pauseBtn.style.background = paused ? "#f38ba855" : "#45475a";
  });
  panel.appendChild(pauseBtn);

  for (const entry of entries.slice(0, 30)) {
    const item = document.createElement("div");
    item.style.cssText =
      "background:#313244;padding:8px 10px;border-radius:6px;margin-bottom:4px;";

    const sel = document.createElement("div");
    sel.style.cssText =
      "font-family:monospace;font-size:11px;color:#89b4fa;margin-bottom:4px;word-break:break-all;";
    sel.textContent = entry.selector;
    item.appendChild(sel);

    for (const anim of entry.animations) {
      const row = document.createElement("div");
      row.style.cssText =
        "font-size:10px;color:#a6adc8;margin-left:8px;margin-bottom:2px;";
      row.textContent = `@${anim.name} ${anim.duration} ${anim.timingFunction} ${anim.delay} ×${anim.iterationCount}`;
      item.appendChild(row);
    }

    for (const trans of entry.transitions) {
      const row = document.createElement("div");
      row.style.cssText =
        "font-size:10px;color:#a6e3a1;margin-left:8px;margin-bottom:2px;";
      row.textContent = `transition: ${trans.property} ${trans.duration} ${trans.timingFunction}`;
      item.appendChild(row);
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
    const highlightOverlays: HTMLDivElement[] = [];
    const originalStyles = new Map<
      HTMLElement,
      { animDur: string; transDur: string }
    >();
    let wasPaused = false;

    const entries = collectAnimatedElements();
    const highlightAnimated = config.highlightAnimated !== false;

    if (highlightAnimated) {
      for (const entry of entries) {
        const rect = entry.element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const color = entry.animations.length > 0 ? "#f38ba8" : "#f9e2af";
        const box = document.createElement("div");
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
      }
    }

    function setPlaybackSpeed(speedStr: string) {
      const factor = parseFloat(speedStr) || 1;
      for (const entry of entries) {
        const computed = getComputedStyle(entry.element);
        if (!originalStyles.has(entry.element)) {
          originalStyles.set(entry.element, {
            animDur: entry.element.style.animationDuration,
            transDur: entry.element.style.transitionDuration,
          });
        }

        const animDurs = computed.animationDuration.split(",").map((d) => {
          const ms = parseFloat(d);
          return isNaN(ms) ? d : ms / factor + "s";
        });
        entry.element.style.animationDuration = animDurs.join(", ");

        const transDurs = computed.transitionDuration.split(",").map((d) => {
          const ms = parseFloat(d);
          return isNaN(ms) ? d : ms / factor + "s";
        });
        entry.element.style.transitionDuration = transDurs.join(", ");
      }

      for (const anim of document.getAnimations()) {
        anim.playbackRate = factor;
      }
    }

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;";
    const shadow = panelHost.attachShadow({ mode: "open" });
    const panel = createAnimationPanel(entries, setPlaybackSpeed, (paused) => {
      wasPaused = paused;
    });
    panel.style.pointerEvents = "auto";
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    const initialSpeed = (config.slowMotion as string) || "1x";
    if (initialSpeed !== "1x") setPlaybackSpeed(initialSpeed);

    if (config.pauseAll === true) {
      setAllAnimationsPaused(true);
      wasPaused = true;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    function cleanup() {
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const o of highlightOverlays) removeOverlayElement(o);
      if (wasPaused) setAllAnimationsPaused(false);
      for (const anim of document.getAnimations()) anim.playbackRate = 1;
      originalStyles.forEach((orig, el) => {
        el.style.animationDuration = orig.animDur;
        el.style.transitionDuration = orig.transDur;
      });
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
