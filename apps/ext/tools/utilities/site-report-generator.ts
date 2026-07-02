import {
  addOverlayElement,
  removeOverlayElement,
} from "../../content/overlay-manager";
import type { ToolDefinition } from "../types";

export const siteReportGenerator: ToolDefinition = {
  id: "site-report-generator",
  name: "Site Report Generator",
  description: "Generate comprehensive reports about page quality and metrics",
  category: "utility",
  icon: "FileBarChart",
  configSchema: {
    includePerformance: {
      type: "boolean",
      label: "Include Performance",
      default: true,
    },
    includeAccessibility: {
      type: "boolean",
      label: "Include Accessibility",
      default: true,
    },
    includeSEO: { type: "boolean", label: "Include SEO", default: true },
    includeBestPractices: {
      type: "boolean",
      label: "Include Best Practices",
      default: true,
    },
    format: {
      type: "select",
      label: "Report Format",
      default: "html",
      options: [
        { label: "HTML", value: "html" },
        { label: "JSON", value: "json" },
        { label: "Markdown", value: "markdown" },
      ],
    },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const includePerf = (cfg.includePerformance as boolean) ?? true;
    const includeA11y = (cfg.includeAccessibility as boolean) ?? true;
    const includeSEO = (cfg.includeSEO as boolean) ?? true;
    const includeBP = (cfg.includeBestPractices as boolean) ?? true;
    const format = (cfg.format as string) ?? "html";

    const overlays: HTMLElement[] = [];
    let disposed = false;

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;width:440px;max-height:550px;z-index:2147483647;" +
      "background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;";
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;font-size:14px;";
    title.textContent = "Site Report";
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;";
    closeBtn.textContent = "×";
    closeBtn.onclick = cleanup;
    const exportBtn = document.createElement("button");
    exportBtn.style.cssText =
      "background:transparent;border:1px solid #475569;color:#94a3b8;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;";
    exportBtn.textContent = "Export JSON";
    header.append(title, exportBtn, closeBtn);

    const body = document.createElement("div");
    body.style.cssText =
      "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;";

    panel.append(header, body);

    function collectReport() {
      const scores: Array<{
        category: string;
        score: number;
        issues: string[];
      }> = [];

      if (includePerf) {
        const issues: string[] = [];
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        let score = 85;
        if (nav) {
          if (nav.domContentLoadedEventEnd > 3000) {
            issues.push("DOM content loaded > 3s");
            score -= 20;
          }
          if (nav.loadEventEnd > 5000) {
            issues.push("Page load > 5s");
            score -= 20;
          }
          if (nav.transferSize > 3 * 1024 * 1024) {
            issues.push("Transfer size > 3MB");
            score -= 15;
          }
        }
        const domSize = document.querySelectorAll("*").length;
        if (domSize > 1500) {
          issues.push(`DOM has ${domSize} nodes (>1500)`);
          score -= 10;
        }
        const scripts = document.querySelectorAll("script[src]").length;
        if (scripts > 15) {
          issues.push(`${scripts} external scripts`);
          score -= 10;
        }
        scores.push({
          category: "Performance",
          score: Math.max(0, score),
          issues,
        });
      }

      if (includeA11y) {
        const issues: string[] = [];
        let score = 90;
        const imgs = document.querySelectorAll("img:not([alt])");
        if (imgs.length > 0) {
          issues.push(`${imgs.length} images missing alt text`);
          score -= 15;
        }
        const inputs = document.querySelectorAll(
          "input:not([aria-label]):not([id])",
        );
        if (inputs.length > 0) {
          issues.push(`${inputs.length} inputs without labels`);
          score -= 10;
        }
        const headings = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
        let prevLevel = 0;
        headings.forEach((h) => {
          const level = parseInt(h.tagName[1]);
          if (prevLevel > 0 && level > prevLevel + 1) {
            issues.push("Heading level skipped");
            score -= 5;
          }
          prevLevel = level;
        });
        if (!document.querySelectorAll("h1").length) {
          issues.push("No h1 heading found");
          score -= 10;
        }
        const buttons = document.querySelectorAll("button");
        buttons.forEach((b) => {
          if (!b.textContent?.trim() && !b.getAttribute("aria-label")) {
            issues.push("Button without accessible text");
            score -= 5;
          }
        });
        scores.push({
          category: "Accessibility",
          score: Math.max(0, score),
          issues,
        });
      }

      if (includeSEO) {
        const issues: string[] = [];
        let score = 85;
        const titleEl = document.querySelector("title");
        if (!titleEl?.textContent) {
          issues.push("Missing page title");
          score -= 15;
        } else if (titleEl.textContent.length > 60) {
          issues.push("Title too long (>60 chars)");
          score -= 5;
        }
        const desc = document.querySelector('meta[name="description"]');
        if (!desc?.getAttribute("content")) {
          issues.push("Missing meta description");
          score -= 15;
        }
        const canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
          issues.push("No canonical URL");
          score -= 5;
        }
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          issues.push("Missing viewport meta");
          score -= 10;
        }
        const ogTags = document.querySelectorAll('meta[property^="og:"]');
        if (ogTags.length === 0) {
          issues.push("No Open Graph tags");
          score -= 10;
        }
        scores.push({ category: "SEO", score: Math.max(0, score), issues });
      }

      if (includeBP) {
        const issues: string[] = [];
        let score = 90;
        if (location.protocol !== "https:") {
          issues.push("Not using HTTPS");
          score -= 20;
        }
        const deprecated = document.querySelectorAll(
          "font,center,marquee,blink",
        );
        if (deprecated.length > 0) {
          issues.push(`${deprecated.length} deprecated HTML elements`);
          score -= 10;
        }
        const inlineStyles = document.querySelectorAll("[style]");
        if (inlineStyles.length > 50) {
          issues.push(`${inlineStyles.length} inline styles`);
          score -= 5;
        }
        scores.push({
          category: "Best Practices",
          score: Math.max(0, score),
          issues,
        });
      }

      return scores;
    }

    function renderReport() {
      while (body.firstChild) body.removeChild(body.firstChild);
      const scores = collectReport();
      const overall = Math.round(
        scores.reduce((sum, s) => sum + s.score, 0) / (scores.length || 1),
      );

      // Overall score
      const overallDiv = document.createElement("div");
      overallDiv.style.cssText = "text-align:center;padding:16px 0;";
      const scoreCircle = document.createElement("div");
      scoreCircle.style.cssText = `width:80px;height:80px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;border:4px solid ${overall >= 80 ? "#22c55e" : overall >= 50 ? "#f59e0b" : "#ef4444"};color:${overall >= 80 ? "#22c55e" : overall >= 50 ? "#f59e0b" : "#ef4444"};`;
      scoreCircle.textContent = String(overall);
      const scoreLabel = document.createElement("div");
      scoreLabel.style.cssText = "font-size:12px;color:#94a3b8;";
      scoreLabel.textContent = "Overall Score";
      overallDiv.append(scoreCircle, scoreLabel);
      body.appendChild(overallDiv);

      // Categories
      for (const cat of scores) {
        const catDiv = document.createElement("div");
        catDiv.style.cssText =
          "background:#1e293b;border-radius:8px;padding:12px;";

        const catHeader = document.createElement("div");
        catHeader.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
        const catName = document.createElement("span");
        catName.style.cssText = "font-weight:600;font-size:13px;";
        catName.textContent = cat.category;
        const catScore = document.createElement("span");
        catScore.style.cssText = `font-weight:700;font-size:16px;color:${cat.score >= 80 ? "#22c55e" : cat.score >= 50 ? "#f59e0b" : "#ef4444"};`;
        catScore.textContent = String(cat.score);
        catHeader.append(catName, catScore);

        catDiv.appendChild(catHeader);

        if (cat.issues.length > 0) {
          for (const issue of cat.issues) {
            const issueDiv = document.createElement("div");
            issueDiv.style.cssText =
              "font-size:11px;color:#94a3b8;padding:2px 0;padding-left:12px;";
            issueDiv.textContent = "• " + issue;
            catDiv.appendChild(issueDiv);
          }
        } else {
          const passDiv = document.createElement("div");
          passDiv.style.cssText = "font-size:11px;color:#22c55e;";
          passDiv.textContent = "All checks passed!";
          catDiv.appendChild(passDiv);
        }
        body.appendChild(catDiv);
      }

      // Export handler
      exportBtn.onclick = () => {
        const report = {
          url: location.href,
          timestamp: Date.now(),
          overallScore: overall,
          categories: scores,
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `site-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    renderReport();

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
