import type { ToolDefinition } from "../types";
import { addOverlayElement } from "@/content/overlay-manager";

export const pixelRuler: ToolDefinition = {
  id: "pixel-ruler",
  name: "Pixel Ruler",
  description: "Measure distances and dimensions between elements",
  category: "inspection",
  icon: "Ruler",
  configSchema: {
    unit: {
      type: "select",
      label: "Unit",
      default: "px",
      options: [
        { label: "Pixels", value: "px" },
        { label: "Rem", value: "rem" },
        { label: "Em", value: "em" },
      ],
    },
    showGuides: { type: "boolean", label: "Show Guides", default: true },
    snapToGrid: { type: "boolean", label: "Snap to Grid", default: false },
    gridSize: { type: "number", label: "Grid Size", default: 8 },
    showDimensions: {
      type: "boolean",
      label: "Show Dimensions",
      default: true,
    },
  },
  run: (ctx, config) => {
    const unit = (config?.unit as string) || "px";
    const showGuides = config?.showGuides !== false;
    const snapToGrid = config?.snapToGrid === true;
    const gridSize = (config?.gridSize as number) || 8;
    const showDimensions = config?.showDimensions !== false;
    const REM_BASE =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const RULER_COLOR = "#00d2ff";

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let measuredElement: HTMLElement | null = null;

    const guideLine = document.createElement("div");
    guideLine.style.cssText = `
      position: fixed;
      background: ${RULER_COLOR};
      pointer-events: none;
      z-index: 2147483646;
      opacity: 0;
      transition: opacity 0.1s;
    `;
    addOverlayElement(guideLine);

    const startDot = document.createElement("div");
    startDot.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${RULER_COLOR};
      pointer-events: none;
      z-index: 2147483646;
      opacity: 0;
      transform: translate(-50%, -50%);
    `;
    addOverlayElement(startDot);

    const endDot = startDot.cloneNode(true) as HTMLElement;
    addOverlayElement(endDot);

    const badge = document.createElement("div");
    badge.style.cssText = `
      position: fixed;
      background: #1e293b;
      color: ${RULER_COLOR};
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid ${RULER_COLOR};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 2147483647;
      white-space: nowrap;
      opacity: 0;
    `;
    addOverlayElement(badge);

    const modeIndicator = document.createElement("div");
    modeIndicator.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      background: #1e293b;
      color: ${RULER_COLOR};
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      z-index: 2147483647;
      border: 1px solid ${RULER_COLOR};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    modeIndicator.textContent =
      "Click and drag to measure | ESC to cancel | Double-click to clear";
    addOverlayElement(modeIndicator);

    const crosshairH = document.createElement("div");
    crosshairH.style.cssText = `
      position: fixed;
      left: 0;
      width: 100%;
      height: 1px;
      background: ${RULER_COLOR}40;
      pointer-events: none;
      z-index: 2147483645;
      opacity: 0;
    `;
    addOverlayElement(crosshairH);

    const crosshairV = document.createElement("div");
    crosshairV.style.cssText = `
      position: fixed;
      top: 0;
      height: 100%;
      width: 1px;
      background: ${RULER_COLOR}40;
      pointer-events: none;
      z-index: 2147483645;
      opacity: 0;
    `;
    addOverlayElement(crosshairV);

    const measurements: Array<{
      line: HTMLElement;
      badge: HTMLElement;
      dot1: HTMLElement;
      dot2: HTMLElement;
    }> = [];

    function snap(value: number): number {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    }

    function formatDistance(px: number): string {
      if (unit === "rem") {
        return `${px}px (${(px / REM_BASE).toFixed(2)}rem)`;
      }
      if (unit === "em") {
        const baseFontSize = (() => {
          if (measuredElement) {
            const fs = parseFloat(getComputedStyle(measuredElement).fontSize);
            if (!isNaN(fs) && fs > 0) return fs;
          }
          return (
            parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16
          );
        })();
        return `${px}px (${(px / baseFontSize).toFixed(2)}em)`;
      }
      return `${px}px`;
    }

    function updateGuideLine(): void {
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      guideLine.style.opacity = "0.8";
      guideLine.style.width = `${length}px`;
      guideLine.style.height = "2px";
      guideLine.style.left = `${startX}px`;
      guideLine.style.top = `${startY}px`;
      guideLine.style.transform = `rotate(${angle}deg)`;
      guideLine.style.transformOrigin = "0 50%";

      startDot.style.opacity = "1";
      startDot.style.left = `${startX}px`;
      startDot.style.top = `${startY}px`;

      endDot.style.opacity = "1";
      endDot.style.left = `${endX}px`;
      endDot.style.top = `${endY}px`;

      if (showDimensions) {
        const dist = Math.round(length);
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        badge.style.opacity = "1";
        badge.textContent = formatDistance(dist);
        badge.style.left = `${centerX}px`;
        badge.style.top = `${Math.max(8, centerY - 30)}px`;
        badge.style.transform = "translate(-50%, -100%)";
      }
    }

    function finalizeMeasurement(): void {
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 5) return;

      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const dist = Math.round(length);

      const line = document.createElement("div");
      line.style.cssText = `
        position: fixed;
        height: 2px;
        background: ${RULER_COLOR};
        pointer-events: none;
        z-index: 2147483646;
        transform-origin: 0 50%;
      `;
      line.style.width = `${length}px`;
      line.style.left = `${startX}px`;
      line.style.top = `${startY}px`;
      line.style.transform = `rotate(${angle}deg)`;
      addOverlayElement(line);

      const d1 = document.createElement("div");
      d1.style.cssText = `
        position: fixed;
        width: 8px; height: 8px;
        border-radius: 50%;
        background: ${RULER_COLOR};
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%);
      `;
      d1.style.left = `${startX}px`;
      d1.style.top = `${startY}px`;
      addOverlayElement(d1);

      const d2 = d1.cloneNode(true) as HTMLElement;
      d2.style.left = `${endX}px`;
      d2.style.top = `${endY}px`;
      addOverlayElement(d2);

      const mBadge = document.createElement("div");
      mBadge.style.cssText = `
        position: fixed;
        background: #1e293b;
        color: ${RULER_COLOR};
        padding: 4px 10px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid ${RULER_COLOR};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        z-index: 2147483647;
        white-space: nowrap;
      `;
      mBadge.textContent = formatDistance(dist);
      const centerX = (startX + endX) / 2;
      const centerY = (startY + endY) / 2;
      mBadge.style.left = `${centerX}px`;
      mBadge.style.top = `${Math.max(8, centerY - 30)}px`;
      mBadge.style.transform = "translate(-50%, -100%)";
      addOverlayElement(mBadge);

      measurements.push({ line, badge: mBadge, dot1: d1, dot2: d2 });

      guideLine.style.opacity = "0";
      startDot.style.opacity = "0";
      endDot.style.opacity = "0";
      badge.style.opacity = "0";
    }

    function clearMeasurements(): void {
      for (const m of measurements) {
        m.line.remove();
        m.badge.remove();
        m.dot1.remove();
        m.dot2.remove();
      }
      measurements.length = 0;
    }

    function onMouseDown(e: MouseEvent): void {
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging = true;
      startX = snap(e.clientX);
      startY = snap(e.clientY);
      endX = startX;
      endY = startY;
      const target = e.target as HTMLElement | null;
      measuredElement =
        target &&
        target !== document.body &&
        target !== document.documentElement
          ? target
          : null;
      updateGuideLine();
    }

    function onMouseMove(e: MouseEvent): void {
      crosshairH.style.opacity = showGuides ? "1" : "0";
      crosshairV.style.opacity = showGuides ? "1" : "0";
      crosshairH.style.top = `${e.clientY}px`;
      crosshairV.style.left = `${e.clientX}px`;

      if (!isDragging) return;
      endX = snap(e.clientX);
      endY = snap(e.clientY);
      updateGuideLine();
    }

    function onMouseUp(_e: MouseEvent): void {
      if (!isDragging) return;
      isDragging = false;
      finalizeMeasurement();
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        isDragging = false;
        guideLine.style.opacity = "0";
        startDot.style.opacity = "0";
        endDot.style.opacity = "0";
        badge.style.opacity = "0";
      }
    }

    function onDblClick(_e: MouseEvent): void {
      clearMeasurements();
    }

    document.body.style.cursor = "crosshair";
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("dblclick", onDblClick, true);

    const cleanup = () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("dblclick", onDblClick, true);

      guideLine.remove();
      startDot.remove();
      endDot.remove();
      badge.remove();
      modeIndicator.remove();
      crosshairH.remove();
      crosshairV.remove();
      clearMeasurements();
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
