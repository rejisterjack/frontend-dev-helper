import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

interface AnalyzerConfig {
  analyzeStructure: boolean;
  analyzeSemantics: boolean;
  analyzePatterns: boolean;
  detailLevel: "brief" | "medium" | "detailed";
  includeCode: boolean;
}

const FENCE_RE = /```(\w+)?\n([\s\S]*?)```/g;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdownToNode(md: string, target: HTMLElement) {
  target.textContent = "";

  const sections = splitFencedBlocks(md);
  for (const section of sections) {
    if (section.kind === "code") {
      const pre = document.createElement("pre");
      pre.style.cssText =
        "background:#0c1222;border:1px solid #1e293b;border-radius:6px;padding:8px;margin:6px 0;" +
        'font-family:"SF Mono",Menlo,Consolas,monospace;font-size:11px;color:#cbd5e1;overflow-x:auto;';
      const code = document.createElement("code");
      code.textContent = section.content;
      if (section.lang) {
        code.setAttribute("data-lang", section.lang);
      }
      pre.appendChild(code);
      target.appendChild(pre);
    } else {
      const lines = section.content.split("\n");
      let listType: "ul" | "ol" | null = null;
      let listEl: HTMLUListElement | HTMLOListElement | null = null;
      const closeList = () => {
        listEl = null;
        listType = null;
      };
      for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, "");
        if (!line.trim()) {
          closeList();
          continue;
        }

        const h = /^(#{1,6})\s+(.*)$/.exec(line);
        const ulItem = /^\s*[-*+]\s+(.*)$/.exec(line);
        const olItem = /^\s*\d+\.\s+(.*)$/.exec(line);

        if (h) {
          closeList();
          const level = h[1].length;
          const headEl = document.createElement("h" + Math.min(6, level + 1));
          headEl.style.cssText = `font-weight:600;color:#e2e8f0;margin:8px 0 4px;font-size:${16 - level}px;`;
          headEl.appendChild(renderInline(h[2]));
          target.appendChild(headEl);
        } else if (ulItem) {
          if (listType !== "ul") {
            closeList();
            listType = "ul";
            listEl = document.createElement("ul");
            listEl.style.cssText =
              "margin:4px 0 4px 18px;padding:0;list-style:disc;";
            target.appendChild(listEl);
          }
          const li = document.createElement("li");
          li.style.cssText =
            "font-size:12px;color:#cbd5e1;line-height:1.5;margin:2px 0;";
          li.appendChild(renderInline(ulItem[1]));
          listEl!.appendChild(li);
        } else if (olItem) {
          if (listType !== "ol") {
            closeList();
            listType = "ol";
            listEl = document.createElement("ol");
            listEl.style.cssText =
              "margin:4px 0 4px 20px;padding:0;list-style:decimal;";
            target.appendChild(listEl);
          }
          const li = document.createElement("li");
          li.style.cssText =
            "font-size:12px;color:#cbd5e1;line-height:1.5;margin:2px 0;";
          li.appendChild(renderInline(olItem[1]));
          listEl!.appendChild(li);
        } else {
          closeList();
          const p = document.createElement("p");
          p.style.cssText =
            "font-size:12px;color:#cbd5e1;line-height:1.5;margin:4px 0;";
          p.appendChild(renderInline(line));
          target.appendChild(p);
        }
      }
    }
  }
}

function renderInline(text: string): Node {
  const fragment = document.createDocumentFragment();
  const pattern = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    if (m[2] !== undefined) {
      const strong = document.createElement("strong");
      strong.style.cssText = "color:#f1f5f9;font-weight:600;";
      strong.textContent = m[2];
      fragment.appendChild(strong);
    } else if (m[4] !== undefined) {
      const code = document.createElement("code");
      code.style.cssText =
        "background:#1e293b;color:#a78bfa;padding:1px 4px;border-radius:3px;" +
        'font-family:"SF Mono",Menlo,Consolas,monospace;font-size:11px;';
      code.textContent = m[4];
      fragment.appendChild(code);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(last)));
  }
  return fragment;
}

interface MdSection {
  kind: "text" | "code";
  content: string;
  lang?: string;
}

function splitFencedBlocks(md: string): MdSection[] {
  const out: MdSection[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(md)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", content: md.slice(last, m.index) });
    }
    out.push({ kind: "code", content: m[2].replace(/\n$/, ""), lang: m[1] });
    last = m.index + m[0].length;
  }
  if (last < md.length) {
    out.push({ kind: "text", content: md.slice(last) });
  }
  return out;
}

export const aiAnalyzer: ToolDefinition = {
  id: "ai-analyzer",
  name: "AI Analyzer",
  description: "Analyze page structure, patterns, and issues using AI",
  category: "ai",
  icon: "Bot",
  configSchema: {
    analyzeStructure: {
      type: "boolean",
      label: "Analyze Structure",
      default: true,
    },
    analyzeSemantics: {
      type: "boolean",
      label: "Analyze Semantics",
      default: true,
    },
    analyzePatterns: {
      type: "boolean",
      label: "Analyze Patterns",
      default: true,
    },
    detailLevel: {
      type: "select",
      label: "Detail Level",
      default: "medium",
      options: [
        { label: "Brief", value: "brief" },
        { label: "Medium", value: "medium" },
        { label: "Detailed", value: "detailed" },
      ],
    },
    includeCode: {
      type: "boolean",
      label: "Include Code Samples",
      default: true,
    },
  },
  run: (ctx, config) => {
    const cfg: AnalyzerConfig = {
      analyzeStructure: (config?.analyzeStructure ?? true) as boolean,
      analyzeSemantics: (config?.analyzeSemantics ?? true) as boolean,
      analyzePatterns: (config?.analyzePatterns ?? true) as boolean,
      detailLevel: (config?.detailLevel ??
        "medium") as AnalyzerConfig["detailLevel"],
      includeCode: (config?.includeCode ?? true) as boolean,
    };

    const overlays: HTMLElement[] = [];
    let disposed = false;

    function getPageContext() {
      const imgs = document.querySelectorAll("img");
      const links = document.querySelectorAll("a[href]");
      const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
      return {
        url: location.href,
        title: document.title,
        domStats: {
          totalElements: document.querySelectorAll("*").length,
          images: imgs.length,
          links: links.length,
          headings: headings.length,
        },
        techStack: detectTech(),
      };
    }

    function getSemanticContext() {
      const headings = Array.from(
        document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
      )
        .slice(0, 30)
        .map(
          (h) =>
            `${h.tagName.toLowerCase()}: ${(h.textContent || "").trim().slice(0, 60)}`,
        );
      const landmarks = Array.from(
        document.querySelectorAll(
          "main,header,footer,nav,aside,section,article",
        ),
      )
        .slice(0, 20)
        .map((l) => `<${l.tagName.toLowerCase()}>`);
      const altMissing = document.querySelectorAll(
        'img:not([alt]),img[alt=""]',
      ).length;
      const totalImgs = document.querySelectorAll("img").length;
      return {
        headingsSample: headings,
        landmarksSample: landmarks,
        totalImgs,
        altMissing,
      };
    }

    function detectTech(): string[] {
      const tech: string[] = [];
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) tech.push("React");
      if ((window as any).__VUE__) tech.push("Vue");
      if (
        (window as any).ng ||
        document.querySelector("[ng-app],[ng-controller]")
      )
        tech.push("Angular");
      if ((window as any).__SVELTE__) tech.push("Svelte");
      if (document.querySelector("[data-reactroot],[data-reactid]"))
        tech.push("React");
      if (document.querySelector("[data-v-]")) tech.push("Vue");
      if (
        document.querySelector('meta[name="generator"][content*="WordPress"]')
      )
        tech.push("WordPress");
      if (document.querySelector('meta[name="generator"][content*="Next.js"]'))
        tech.push("Next.js");
      if (document.querySelector('meta[name="generator"][content*="Nuxt"]'))
        tech.push("Nuxt");
      return tech.length ? tech : ["Unknown"];
    }

    function buildQuery(context: ReturnType<typeof getPageContext>): string {
      const detailWordCount =
        cfg.detailLevel === "brief"
          ? 80
          : cfg.detailLevel === "detailed"
            ? 400
            : 200;
      const sections: string[] = [];
      sections.push(
        `Analyze this page. URL: ${context.url}, Title: ${context.title}, Tech: ${context.techStack.join(", ")}.`,
      );

      if (cfg.analyzeStructure) {
        sections.push(
          `DOM stats: ${context.domStats.totalElements} elements, ${context.domStats.images} images, ${context.domStats.links} links, ${context.domStats.headings} headings.`,
        );
      }

      if (cfg.analyzeSemantics) {
        const sem = getSemanticContext();
        sections.push(
          `Semantics: ${sem.headingsSample.length} headings (sample: ${sem.headingsSample.slice(0, 5).join(" | ")}); ${sem.landmarksSample.length} landmarks; ${sem.altMissing}/${sem.totalImgs} images missing alt.`,
        );
      }

      if (cfg.analyzePatterns) {
        sections.push(
          "Identify repeating UI patterns (cards, lists, forms) and design-system inconsistencies.",
        );
      }

      sections.push(
        `Be ${cfg.detailLevel}. Keep the response under ~${detailWordCount} words.`,
      );

      if (cfg.includeCode) {
        sections.push(
          "Where helpful, include short fenced code blocks (\`\`\`) with concrete fixes.",
        );
      } else {
        sections.push("Do NOT include code blocks; describe changes in prose.");
      }

      return sections.join(" ");
    }

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:420px;max-height:520px;z-index:2147483647;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;";
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-weight:600;font-size:14px;";
    titleEl.textContent = "AI Page Analyzer";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:0 4px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;
    header.append(titleEl, closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow-y:auto;padding:16px;";

    const loading = document.createElement("div");
    loading.style.cssText =
      "display:flex;align-items:center;justify-content:center;gap:8px;color:#94a3b8;padding:40px 0;";
    loading.textContent = "Analyzing page...";
    body.appendChild(loading);

    panel.append(header, body);

    async function analyze() {
      const context = getPageContext();
      const query = buildQuery(context);
      try {
        const response = await browser.runtime.sendMessage({
          type: "LLM_QUERY",
          payload: { query, context },
        });
        if (disposed) return;
        body.removeChild(loading);
        if (
          response?.response &&
          typeof response.response === "string" &&
          response.response.trim()
        ) {
          renderSuggestions(response.response);
        } else {
          renderError(
            "No response from AI service. Check your API key in Settings.",
          );
        }
      } catch (err) {
        if (disposed) return;
        body.removeChild(loading);
        const detail =
          err instanceof Error && err.message ? err.message : "Unknown error";
        renderError(
          `AI analysis failed: ${detail}. Ensure AI is configured in Settings.`,
        );
      }
    }

    function renderSuggestions(text: string) {
      const container = document.createElement("div");
      container.style.cssText = "display:flex;flex-direction:column;gap:8px;";
      renderMarkdownToNode(text, container);
      body.appendChild(container);
    }

    function renderError(msg: string) {
      const err = document.createElement("div");
      err.style.cssText =
        "color:#f871c7;padding:20px;text-align:center;font-size:13px;";
      err.textContent = msg;
      body.appendChild(err);
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      overlays.forEach((o) => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    void analyze();
    return cleanup;
  },
};
