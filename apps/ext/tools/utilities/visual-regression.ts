import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import type { ToolDefinition } from "../types";

// ============================================================
// Types
// ============================================================

interface BaselineEntry {
  id: string;
  name: string;
  url: string;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface ComparisonResult {
  baselineId: string;
  diffPercentage: number;
  passed: boolean;
  diffDataUrl?: string;
  currentDataUrl: string;
  timestamp: number;
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `vr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Capture the current viewport into a canvas data-URL */
async function captureViewport(): Promise<string> {
  // captureVisibleTab returns the device-pixel-ratio-scaled bitmap. We just
  // pass it through; the previous fallback (blank white canvas) was the bug
  // that caused every comparison to "pass" against an empty baseline.
  const resp: { dataUrl?: string; error?: string } | undefined =
    await chrome.runtime.sendMessage({
      type: "CAPTURE_TAB",
    });
  if (resp?.dataUrl) return resp.dataUrl;
  throw new Error(
    resp?.error ||
      "CAPTURE_TAB returned no dataUrl (background permission denied?)",
  );
}

/** Capture the full page (scroll-and-stitch). */
async function captureFullPage(): Promise<string> {
  const dpr = window.devicePixelRatio || 1;
  const w = document.documentElement.scrollWidth;
  const h = document.documentElement.scrollHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d")!;

  const origScrollX = window.scrollX;
  const origScrollY = window.scrollY;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const cols = Math.ceil(w / viewW);
  const rows = Math.ceil(h / viewH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const targetX = col * viewW;
      const targetY = row * viewH;
      window.scrollTo(targetX, targetY);
      // Two RAFs: one to schedule the paint, one for it to complete.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      try {
        const resp: { dataUrl?: string } | undefined =
          await chrome.runtime.sendMessage({ type: "CAPTURE_TAB" });
        if (!resp?.dataUrl) continue;
        const img = await loadImage(resp.dataUrl);
        // captureVisibleTab returns device pixels; we are writing into a
        // device-pixel-scaled canvas, so draw at native scale.
        ctx.drawImage(img, targetX * dpr, targetY * dpr);
      } catch {
        /* skip this tile */
      }
    }
  }

  window.scrollTo(origScrollX, origScrollY);
  return canvas.toDataURL("image/png");
}

/** Pixel-level diff between two same-dimension ImageData objects */
function computeDiff(
  imgData1: ImageData,
  imgData2: ImageData,
): { diffPercentage: number; diffDataUrl: string } {
  const w = Math.max(imgData1.width, imgData2.width);
  const h = Math.max(imgData1.height, imgData2.height);
  let diffPixels = 0;
  const totalPixels = imgData1.data.length / 4;

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = w;
  diffCanvas.height = h;
  const diffCtx = diffCanvas.getContext("2d")!;
  const diffImg = diffCtx.createImageData(w, h);

  for (let i = 0; i < imgData1.data.length; i += 4) {
    const rDiff = Math.abs(imgData1.data[i] - imgData2.data[i]);
    const gDiff = Math.abs(imgData1.data[i + 1] - imgData2.data[i + 1]);
    const bDiff = Math.abs(imgData1.data[i + 2] - imgData2.data[i + 2]);

    if (rDiff > 10 || gDiff > 10 || bDiff > 10) {
      diffPixels++;
      // Magenta/red highlight
      diffImg.data[i] = 255;
      diffImg.data[i + 1] = 0;
      diffImg.data[i + 2] = 255;
      diffImg.data[i + 3] = 180;
    } else {
      // Dimmed original
      diffImg.data[i] = imgData1.data[i];
      diffImg.data[i + 1] = imgData1.data[i + 1];
      diffImg.data[i + 2] = imgData1.data[i + 2];
      diffImg.data[i + 3] = 100;
    }
  }

  diffCtx.putImageData(diffImg, 0, 0);

  const diffPercentage = (diffPixels / totalPixels) * 100;
  return { diffPercentage, diffDataUrl: diffCanvas.toDataURL("image/png") };
}

/** Load a data-URL string into an ImageData object */
async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

// ============================================================
// Storage helpers (IndexedDB with chrome.storage.local fallback)
// ============================================================

const DB_NAME = "fdh_visual_regression";
const DB_VERSION = 1;
const STORE_NAME = "baselines";
const STORAGE_KEY = "fdh_visual_regression_baselines";

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase | null> {
  if (dbInstance) return dbInstance;
  try {
    return await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function loadBaselines(): Promise<BaselineEntry[]> {
  const db = await openDB();
  if (db) {
    try {
      return await new Promise<BaselineEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // fall through to chrome.storage.local
    }
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve((result[STORAGE_KEY] as BaselineEntry[] | undefined) || []);
    });
  });
}

async function saveBaseline(entry: BaselineEntry): Promise<void> {
  const db = await openDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return;
    } catch {
      // fall through to chrome.storage.local
    }
  }
  const baselines = await loadBaselines();
  baselines.push(entry);
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: baselines }, resolve);
  });
}

async function deleteBaselineById(id: string): Promise<void> {
  const db = await openDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return;
    } catch {
      // fall through to chrome.storage.local
    }
  }
  const baselines = await loadBaselines();
  await new Promise<void>((resolve) => {
    chrome.storage.local.set(
      { [STORAGE_KEY]: baselines.filter((b) => b.id !== id) },
      resolve,
    );
  });
}

async function findBaselineByUrl(
  url: string,
): Promise<BaselineEntry | undefined> {
  const baselines = await loadBaselines();
  return baselines.find((b) => b.url === url);
}

// ============================================================
// DOM helpers (no innerHTML - safe DOM construction only)
// ============================================================

function h(
  tag: string,
  styles: Record<string, string>,
  children?: (HTMLElement | string)[],
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(styles)) {
    el.style.setProperty(k, v);
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

function makeBtn(
  label: string,
  onClick: () => void,
  overrides?: Record<string, string>,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", onClick);
  b.style.cssText = `
    padding:6px 12px;
    border:1px solid #334155;
    border-radius:4px;
    background:#4f46e5;
    color:#fff;
    font-family:system-ui,-apple-system,sans-serif;
    font-size:12px;
    cursor:pointer;
    pointer-events:auto;
    line-height:1.4;
  `;
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      b.style.setProperty(k, v);
    }
  }
  return b;
}

function secondaryBtn(label: string, onClick: () => void): HTMLButtonElement {
  return makeBtn(label, onClick, {
    background: "#334155",
    "border-color": "#475569",
  });
}

function dangerBtn(label: string, onClick: () => void): HTMLButtonElement {
  return makeBtn(label, onClick, {
    background: "#991b1b",
    "border-color": "#dc2626",
  });
}

/** Remove all children from an element */
function clearChildren(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

// ============================================================
// Main run()
// ============================================================

export const visualRegression: ToolDefinition = {
  id: "visual-regression",
  name: "Visual Regression",
  description: "Capture and compare visual snapshots for regression testing",
  category: "utility",
  icon: "Image",
  configSchema: {
    threshold: {
      type: "slider",
      label: "Diff Threshold (%)",
      default: 1,
      min: 0,
      max: 10,
      step: 0.5,
    },
    captureViewport: {
      type: "boolean",
      label: "Capture Viewport",
      default: true,
    },
    captureFullPage: {
      type: "boolean",
      label: "Capture Full Page",
      default: false,
    },
    highlightDiffs: {
      type: "boolean",
      label: "Highlight Diffs",
      default: true,
    },
    diffColor: { type: "color", label: "Diff Color", default: "#ff00ff" },
  },
  run: (ctx, config) => {
    const threshold = (config?.threshold as number) ?? 1;
    const captureMode = (config?.captureViewport as boolean)
      ? "viewport"
      : (config?.captureFullPage as boolean)
        ? "fullpage"
        : "viewport";
    const highlightDiffs = (config?.highlightDiffs as boolean) ?? true;

    // Active overlays we need to clean up
    const overlays: HTMLElement[] = [];

    // State
    let baselines: BaselineEntry[] = [];
    const results: ComparisonResult[] = [];
    let selectedBaselineId: string | null = null;
    let sideBySideOverlay: HTMLElement | null = null;

    // ---- Panel shell ----
    const panel = h("div", {
      position: "fixed",
      top: "16px",
      right: "16px",
      width: "420px",
      "max-height": "85vh",
      "z-index": "2147483647",
      background: "#0f172a",
      border: "1px solid rgba(255,255,255,0.1)",
      "border-radius": "10px",
      "box-shadow": "0 25px 50px -12px rgba(0,0,0,0.5)",
      overflow: "hidden",
      display: "flex",
      "flex-direction": "column",
      "font-family": "system-ui,-apple-system,sans-serif",
      "font-size": "13px",
      color: "#e2e8f0",
      "pointer-events": "auto",
    });

    // Header
    const header = h("div", {
      display: "flex",
      "justify-content": "space-between",
      "align-items": "center",
      padding: "10px 14px",
      "border-bottom": "1px solid #334155",
      background: "#1e293b",
    });
    const title = h("span", { "font-weight": "600", "font-size": "14px" }, [
      "Visual Regression",
    ]);
    const closeBtn = makeBtn("Close", cleanup, {
      background: "transparent",
      border: "none",
      color: "#94a3b8",
      "font-size": "14px",
      padding: "2px 6px",
    });
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.color = "#f8fafc";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.color = "#94a3b8";
    });
    header.append(title, closeBtn);

    // Content area (scrollable)
    const content = h("div", {
      flex: "1",
      "overflow-y": "auto",
      padding: "12px 14px",
      "min-height": "180px",
    });

    // Status bar
    const statusBar = h("div", {
      padding: "8px 14px",
      "border-top": "1px solid #334155",
      background: "#1e293b",
      "font-size": "11px",
      color: "#64748b",
    });
    statusBar.textContent = "Ready";

    panel.append(header, content, statusBar);
    addOverlayElement(panel);
    overlays.push(panel);

    // ---- Status helper ----
    function setStatus(msg: string) {
      statusBar.textContent = msg;
    }

    // ---- Render baseline list ----
    async function refreshBaselines() {
      baselines = await loadBaselines();
      renderContent();
    }

    function renderContent() {
      clearChildren(content);

      // Toolbar
      const toolbar = h("div", {
        display: "flex",
        gap: "8px",
        "margin-bottom": "12px",
        "flex-wrap": "wrap",
      });

      const captureBtn = makeBtn("Capture Baseline", handleCapture, {
        flex: "1",
      });
      const compareBtn = makeBtn("Compare", handleCompare, {
        flex: "1",
        background: selectedBaselineId ? "#4f46e5" : "#475569",
        cursor: selectedBaselineId ? "pointer" : "not-allowed",
      });
      compareBtn.disabled = !selectedBaselineId;

      toolbar.append(captureBtn, compareBtn);
      content.appendChild(toolbar);

      // Baseline list
      if (baselines.length === 0) {
        const empty = h("div", {
          "text-align": "center",
          padding: "32px 16px",
          color: "#64748b",
          "font-size": "13px",
        });
        empty.textContent =
          'No baselines captured yet. Click "Capture Baseline" to start.';
        content.appendChild(empty);
      } else {
        const list = h("div", {
          display: "flex",
          "flex-direction": "column",
          gap: "6px",
        });
        for (const bl of baselines) {
          list.appendChild(buildBaselineRow(bl));
        }
        content.appendChild(list);
      }

      // Results section
      if (results.length > 0) {
        const divider = h("div", {
          "border-top": "1px solid #334155",
          margin: "12px 0 8px",
        });
        content.appendChild(divider);

        const resultsHeader = h("div", {
          "font-weight": "600",
          "font-size": "12px",
          "margin-bottom": "8px",
          color: "#94a3b8",
        });
        resultsHeader.textContent = "Comparison Results";
        content.appendChild(resultsHeader);

        for (const r of results) {
          content.appendChild(buildResultRow(r));
        }
      }
    }

    function buildBaselineRow(bl: BaselineEntry): HTMLElement {
      const isSelected = bl.id === selectedBaselineId;
      const isCurrentUrl = bl.url === window.location.href;
      const row = h("div", {
        display: "flex",
        "align-items": "center",
        gap: "8px",
        padding: "8px 10px",
        background: isSelected ? "#1e1b4b" : "#1e293b",
        border: `1px solid ${isSelected ? "#4f46e5" : isCurrentUrl ? "#22c55e40" : "#334155"}`,
        "border-radius": "6px",
        cursor: "pointer",
        "pointer-events": "auto",
      });

      // Thumbnail
      const thumb = document.createElement("img");
      thumb.src = bl.dataUrl;
      thumb.style.cssText =
        "width:48px;height:32px;object-fit:cover;border-radius:3px;background-color:#0f172a;border:none;opacity:0.6;transition:opacity 0.2s;";
      thumb.addEventListener("load", () => {
        thumb.style.opacity = "1";
      });

      const info = h("div", { flex: "1", "min-width": "0" });
      const nameEl = h("div", {
        "font-size": "12px",
        "font-weight": "500",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "white-space": "nowrap",
      });
      nameEl.textContent = bl.name;

      const meta = h("div", { "font-size": "10px", color: "#64748b" });
      const date = new Date(bl.timestamp).toLocaleString();
      const urlMatchTag = isCurrentUrl ? " · this page" : "";
      meta.textContent = `${bl.width}x${bl.height}  ${date}${urlMatchTag}`;

      info.append(nameEl, meta);

      const selectBtn = makeBtn(
        isSelected ? "Selected" : "Select",
        () => {
          selectedBaselineId = isSelected ? null : bl.id;
          renderContent();
        },
        {
          padding: "4px 10px",
          "font-size": "11px",
          background: isSelected ? "#22c55e" : "#334155",
        },
      );

      const delBtn = dangerBtn("X", async () => {
        await deleteBaselineById(bl.id);
        if (selectedBaselineId === bl.id) selectedBaselineId = null;
        await refreshBaselines();
      });
      delBtn.style.padding = "4px 8px";
      delBtn.style.fontSize = "11px";

      row.append(thumb, info, selectBtn, delBtn);
      return row;
    }

    function buildResultRow(r: ComparisonResult): HTMLElement {
      const passed = r.passed;
      const row = h("div", {
        display: "flex",
        "align-items": "center",
        gap: "8px",
        padding: "8px 10px",
        background: "#1e293b",
        border: `1px solid ${passed ? "#22c55e40" : "#ef444440"}`,
        "border-left": `3px solid ${passed ? "#22c55e" : "#ef4444"}`,
        "border-radius": "6px",
        "pointer-events": "auto",
      });

      // Pass/fail badge
      const badge = h("span", {
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: "22px",
        height: "22px",
        "border-radius": "50%",
        background: passed ? "#22c55e" : "#ef4444",
        color: "#fff",
        "font-size": "12px",
        "font-weight": "700",
        "flex-shrink": "0",
      });
      badge.textContent = passed ? "✓" : "✗";

      const info = h("div", { flex: "1" });
      const pct = h("div", {
        "font-size": "12px",
        "font-weight": "600",
        color: passed ? "#22c55e" : "#ef4444",
      });
      pct.textContent = `${r.diffPercentage.toFixed(2)}% diff  ${passed ? "PASSED" : "FAILED"}`;
      const ts = h("div", { "font-size": "10px", color: "#64748b" });
      ts.textContent = new Date(r.timestamp).toLocaleString();
      info.append(pct, ts);

      // View diff button
      const viewBtn = secondaryBtn("View Diff", () => showSideBySide(r));
      viewBtn.style.padding = "4px 10px";
      viewBtn.style.fontSize = "11px";

      row.append(badge, info, viewBtn);

      // Show overlay button
      if (highlightDiffs && r.diffDataUrl) {
        const overlayBtn = secondaryBtn("Overlay", () => toggleDiffOverlay(r));
        overlayBtn.style.padding = "4px 10px";
        overlayBtn.style.fontSize = "11px";
        row.appendChild(overlayBtn);
      }

      return row;
    }

    // ---- Capture handler ----
    async function handleCapture() {
      setStatus("Capturing...");
      try {
        let dataUrl: string;
        let w: number;
        let ht: number;

        if (captureMode === "fullpage") {
          dataUrl = await captureFullPage();
          w = document.documentElement.scrollWidth;
          ht = document.documentElement.scrollHeight;
        } else {
          dataUrl = await captureViewport();
          w = window.innerWidth;
          ht = window.innerHeight;
        }

        const entry: BaselineEntry = {
          id: generateId(),
          name: `${captureMode === "fullpage" ? "Full" : "Viewport"} - ${new Date().toLocaleTimeString()}`,
          url: window.location.href,
          timestamp: Date.now(),
          dataUrl,
          width: w,
          height: ht,
        };

        await saveBaseline(entry);
        await refreshBaselines();
        setStatus("Baseline captured");
      } catch (err) {
        setStatus("Capture failed");
        console.error("[Visual Regression] Capture error:", err);
      }
    }

    // ---- Compare handler ----
    async function handleCompare() {
      if (!selectedBaselineId) return;
      const baseline = baselines.find((b) => b.id === selectedBaselineId);
      if (!baseline) return;

      setStatus("Capturing current state...");
      try {
        let currentDataUrl: string;
        if (captureMode === "fullpage") {
          currentDataUrl = await captureFullPage();
        } else {
          currentDataUrl = await captureViewport();
        }

        setStatus("Comparing...");
        const [baselineImg, currentImg] = await Promise.all([
          dataUrlToImageData(baseline.dataUrl),
          dataUrlToImageData(currentDataUrl),
        ]);

        const { diffPercentage, diffDataUrl } = computeDiff(
          baselineImg,
          currentImg,
        );
        const passed = diffPercentage <= threshold;

        const result: ComparisonResult = {
          baselineId: baseline.id,
          diffPercentage,
          passed,
          diffDataUrl,
          currentDataUrl,
          timestamp: Date.now(),
        };

        results.unshift(result);
        renderContent();
        setStatus(
          passed
            ? "Comparison PASSED"
            : `Comparison FAILED (${diffPercentage.toFixed(2)}%)`,
        );
      } catch (err) {
        setStatus("Comparison failed");
        console.error("[Visual Regression] Compare error:", err);
      }
    }

    // ---- Side-by-side view ----
    function showSideBySide(r: ComparisonResult) {
      closeSideBySide();
      const baseline = baselines.find((b) => b.id === r.baselineId);
      if (!baseline) return;

      const overlay = h("div", {
        position: "fixed",
        inset: "0",
        "z-index": "2147483647",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        "font-family": "system-ui,-apple-system,sans-serif",
        color: "#e2e8f0",
        "pointer-events": "auto",
      });

      // Close button
      const cls = makeBtn("Close", closeSideBySide, {
        position: "absolute",
        top: "16px",
        right: "16px",
        background: "#334155",
        "font-size": "14px",
      });
      overlay.appendChild(cls);

      // Status badge
      const statusBadge = h("div", {
        "font-size": "18px",
        "font-weight": "700",
        "margin-bottom": "16px",
        color: r.passed ? "#22c55e" : "#ef4444",
      });
      statusBadge.textContent = `${r.passed ? "PASSED" : "FAILED"}  ${r.diffPercentage.toFixed(2)}% diff`;
      overlay.appendChild(statusBadge);

      // Images row
      const row = h("div", {
        display: "flex",
        gap: "12px",
        "max-width": "95vw",
        "max-height": "80vh",
        overflow: "auto",
      });

      const makeColumn = (label: string, src: string, borderColor: string) => {
        const col = h("div", {
          display: "flex",
          "flex-direction": "column",
          "align-items": "center",
        });
        const lbl = h("div", {
          "font-size": "12px",
          "font-weight": "600",
          "margin-bottom": "6px",
          color: borderColor,
        });
        lbl.textContent = label;
        const img = document.createElement("img");
        img.src = src;
        img.style.cssText = `max-width:45vw;max-height:70vh;object-fit:contain;border:2px solid ${borderColor};border-radius:4px;`;
        col.append(lbl, img);
        return col;
      };

      row.appendChild(makeColumn("Baseline", baseline.dataUrl, "#94a3b8"));
      row.appendChild(makeColumn("Current", r.currentDataUrl, "#94a3b8"));
      if (r.diffDataUrl) {
        row.appendChild(makeColumn("Diff", r.diffDataUrl, "#ff00ff"));
      }

      overlay.appendChild(row);
      addOverlayElement(overlay);
      overlays.push(overlay);
      sideBySideOverlay = overlay;
    }

    function closeSideBySide() {
      if (sideBySideOverlay) {
        removeOverlayElement(sideBySideOverlay);
        overlays.splice(overlays.indexOf(sideBySideOverlay), 1);
        sideBySideOverlay = null;
      }
    }

    // ---- Diff overlay on page ----
    let activeDiffOverlay: HTMLElement | null = null;

    function toggleDiffOverlay(r: ComparisonResult) {
      if (activeDiffOverlay) {
        removeOverlayElement(activeDiffOverlay);
        overlays.splice(overlays.indexOf(activeDiffOverlay), 1);
        activeDiffOverlay = null;
        return;
      }
      if (!r.diffDataUrl) return;

      const img = document.createElement("img");
      img.src = r.diffDataUrl;
      img.style.cssText =
        "position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:2147483646;opacity:0.6;pointer-events:none;";
      addOverlayElement(img);
      overlays.push(img);
      activeDiffOverlay = img;
    }

    // ---- Cleanup ----
    function cleanup() {
      for (const el of overlays) {
        removeOverlayElement(el);
      }
      overlays.length = 0;
      sideBySideOverlay = null;
      activeDiffOverlay = null;
    }

    ctx.onInvalidated(cleanup);

    // Initial render + auto-compare
    refreshBaselines().then(async () => {
      const existing = baselines.find((b) => b.url === window.location.href);
      if (existing) {
        setStatus(
          "Existing baseline found for this URL. Click Compare to check for changes.",
        );
      }
    });

    return cleanup;
  },
};
