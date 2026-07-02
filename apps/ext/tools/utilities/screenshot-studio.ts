import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

export const screenshotStudio: ToolDefinition = {
  id: "screenshot-studio",
  name: "Screenshot Studio",
  description: "Capture, annotate, and export page screenshots",
  category: "utility",
  icon: "Camera",
  configSchema: {
    captureMode: {
      type: "select",
      label: "Capture Mode",
      default: "viewport",
      options: [
        { label: "Viewport", value: "viewport" },
        { label: "Full Page", value: "fullpage" },
        { label: "Element", value: "element" },
        { label: "Selection", value: "selection" },
      ],
    },
    format: {
      type: "select",
      label: "Format",
      default: "png",
      options: [
        { label: "PNG", value: "png" },
        { label: "JPEG", value: "jpeg" },
        { label: "WebP", value: "webp" },
      ],
    },
    quality: {
      type: "slider",
      label: "Quality",
      default: 90,
      min: 10,
      max: 100,
      step: 5,
    },
    showAnnotations: {
      type: "boolean",
      label: "Show Annotations",
      default: true,
    },
    includeMetadata: {
      type: "boolean",
      label: "Include Metadata",
      default: false,
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const captureMode = (cfg.captureMode as string) ?? "viewport";
    const format = (cfg.format as string) ?? "png";
    const quality = ((cfg.quality as number) ?? 90) / 100;

    const overlays: HTMLElement[] = [];
    let disposed = false;
    let isCapturing = false;

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:280px;z-index:2147483647;pointer-events:auto;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:13px;";
    title.textContent = "Screenshot Studio";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;
    header.append(title, closeBtn);

    const body = document.createElement("div");
    body.style.cssText =
      "padding:14px;display:flex;flex-direction:column;gap:8px;";

    const status = document.createElement("div");
    status.style.cssText = "font-size:11px;color:#64748b;text-align:center;";

    function createBtn(label: string, onClick: () => void): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.style.cssText =
        "width:100%;padding:8px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:background .15s;";
      btn.textContent = label;
      btn.onclick = onClick;
      return btn;
    }

    const captureBtn = createBtn("Capture Viewport", () =>
      captureScreenshot("viewport"),
    );
    captureBtn.style.background = "#3b82f6";
    captureBtn.style.color = "white";

    const fullBtn = createBtn("Capture Full Page", () =>
      captureScreenshot("fullpage"),
    );
    fullBtn.style.background = "#334155";
    fullBtn.style.color = "#e2e8f0";

    const elementBtn = createBtn("Capture Element", () =>
      startElementCapture(),
    );
    elementBtn.style.background = "#334155";
    elementBtn.style.color = "#e2e8f0";

    body.append(captureBtn, fullBtn, elementBtn, status);
    panel.append(header, body);

    async function captureTab(): Promise<string | null> {
      // RPC to background — only the service worker can call
      // chrome.tabs.captureVisibleTab. See S3 in the Tools Remediation Plan.
      try {
        const resp = (await browser.runtime.sendMessage({
          type: "CAPTURE_TAB",
        })) as { dataUrl?: string; error?: string } | undefined;
        return resp?.dataUrl ?? null;
      } catch {
        return null;
      }
    }

    function loadImage(dataUrl: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    async function captureScreenshot(mode: string) {
      if (isCapturing) return;
      isCapturing = true;
      status.textContent = "Capturing...";

      try {
        const mimeType =
          format === "jpeg"
            ? "image/jpeg"
            : format === "webp"
              ? "image/webp"
              : "image/png";

        if (mode === "viewport") {
          const dataUrl = await captureTab();
          if (!dataUrl) {
            status.textContent =
              "Capture failed (background permission denied)";
            isCapturing = false;
            return;
          }
          // Re-encode at the requested format/quality if it differs from PNG.
          let outUrl = dataUrl;
          if (format !== "png") {
            const img = await loadImage(dataUrl);
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            outUrl = canvas.toDataURL(mimeType, quality);
          }
          showPreview(outUrl, "viewport");
          status.textContent = "Captured!";
        } else if (mode === "fullpage") {
          // Scroll + stitch: capture the visible viewport at each scroll
          // position and composite onto a single tall canvas.
          const origScrollX = window.scrollX;
          const origScrollY = window.scrollY;
          const viewportW = window.innerWidth;
          const viewportH = window.innerHeight;
          const docH = document.documentElement.scrollHeight;
          const docW = document.documentElement.scrollWidth;

          const cols = Math.ceil(docW / viewportW);
          const rows = Math.ceil(docH / viewportH);
          const canvas = document.createElement("canvas");
          canvas.width = docW;
          canvas.height = docH;
          const ctx2d = canvas.getContext("2d")!;

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const targetX = col * viewportW;
              const targetY = row * viewportH;
              window.scrollTo(targetX, targetY);
              // Wait two RAFs so the browser paints the new scroll position.
              await new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
              );
              const part = await captureTab();
              if (!part) continue;
              const img = await loadImage(part);
              ctx2d.drawImage(
                img,
                targetX - window.scrollX,
                targetY - window.scrollY,
              );
            }
          }
          // Restore scroll.
          window.scrollTo(origScrollX, origScrollY);
          showPreview(canvas.toDataURL(mimeType, quality), "fullpage");
          status.textContent = "Captured!";
        } else {
          status.textContent = "Unknown mode";
        }
      } catch (err) {
        status.textContent =
          "Capture failed: " +
          (err instanceof Error ? err.message : "Unknown error");
      }
      isCapturing = false;
    }

    function startElementCapture() {
      status.textContent = "Click an element to capture it";
      const handleClick = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("click", handleClick, true);
        const target = e.target as HTMLElement;
        if (target === panel || panel.contains(target)) return;
        await captureElementScreenshot(target);
      };
      document.addEventListener("click", handleClick, true);
    }

    async function captureElementScreenshot(el: HTMLElement) {
      const rect = el.getBoundingClientRect();
      // Element capture: capture the tab, then crop to the element's rect.
      const dataUrl = await captureTab();
      if (!dataUrl) {
        status.textContent =
          "Element capture failed (background permission denied)";
        return;
      }
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      // devicePixelRatio: captureVisibleTab returns device pixels, but
      // getBoundingClientRect returns CSS pixels.
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx2d = canvas.getContext("2d")!;
      ctx2d.drawImage(
        img,
        Math.round(rect.left * dpr),
        Math.round(rect.top * dpr),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const mimeType =
        format === "jpeg"
          ? "image/jpeg"
          : format === "webp"
            ? "image/webp"
            : "image/png";
      showPreview(canvas.toDataURL(mimeType, quality), "element");
      status.textContent = "Element captured!";
    }

    function showPreview(dataUrl: string, mode: string) {
      // Remove old preview
      const old = body.querySelector(".fdh-preview");
      if (old) old.remove();

      const preview = document.createElement("div");
      preview.className = "fdh-preview";
      preview.style.cssText =
        "margin-top:8px;border:1px solid #334155;border-radius:6px;overflow:hidden;";

      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.cssText = "width:100%;display:block;";

      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;gap:4px;padding:8px;background:#1e293b;";

      const dlBtn = document.createElement("button");
      dlBtn.style.cssText =
        "flex:1;padding:6px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;";
      dlBtn.textContent = "Download";
      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `screenshot-${mode}-${Date.now()}.${format === "jpeg" ? "jpg" : format}`;
        a.click();
      };

      const copyBtn = document.createElement("button");
      copyBtn.style.cssText =
        "flex:1;padding:6px;background:#334155;color:#e2e8f0;border:none;border-radius:4px;cursor:pointer;font-size:11px;";
      copyBtn.textContent = "Copy";
      copyBtn.onclick = async () => {
        try {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          copyBtn.textContent = "Copied!";
        } catch {
          copyBtn.textContent = "Failed";
        }
      };

      actions.append(dlBtn, copyBtn);
      preview.append(img, actions);
      body.appendChild(preview);
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
