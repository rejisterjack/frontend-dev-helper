import type { ToolDefinition } from "../types";

interface DetectedTech {
  name: string;
  category: string;
  version?: string;
  evidence: string[];
  icon?: string;
}

function detectAllTech(config: Record<string, unknown>): DetectedTech[] {
  const results: DetectedTech[] = [];
  // Library globals (jQuery, _, THREE, d3, etc.) live on `window` under
  // arbitrary keys. We cast to a permissive index signature so optional-chain
  // access compiles without a per-site cast. Every read site guards with
  // `?.` so unknown / undefined values short-circuit safely.
  const w = window as unknown as Record<
    string,
    Record<string, unknown> | undefined
  >;
  const detectFrameworks = (config.detectFrameworks as boolean) ?? true;
  const detectLibraries = (config.detectLibraries as boolean) ?? true;
  const detectAnalytics = (config.detectAnalytics as boolean) ?? true;
  const detectCMS = (config.detectCMS as boolean) ?? true;
  const showVersions = (config.showVersions as boolean) ?? true;

  if (detectFrameworks) {
    // React
    if (
      w.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
      w.React?.hasOwnProperty("createElement")
    ) {
      const evidence: string[] = ["window.__REACT_DEVTOOLS_GLOBAL_HOOK__"];
      if (document.querySelector("[data-reactroot], [data-reactid]"))
        evidence.push("[data-reactroot]");
      results.push({
        name: "React",
        category: "Framework",
        version: showVersions
          ? ((w.React as Record<string, unknown>)?.version as
              | string
              | undefined)
          : undefined,
        evidence,
      });
    }

    // Next.js
    if (w.__NEXT_DATA__) {
      const nd = w.__NEXT_DATA__ as Record<string, unknown>;
      results.push({
        name: "Next.js",
        category: "Meta Framework",
        version: showVersions ? (nd.buildId as string | undefined) : undefined,
        evidence: ["window.__NEXT_DATA__"],
      });
    }

    // Vue
    if (w.__VUE__ || w.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      const evidence: string[] = [];
      if (w.__VUE__) evidence.push("window.__VUE__");
      if (w.__VUE_DEVTOOLS_GLOBAL_HOOK__)
        evidence.push("window.__VUE_DEVTOOLS_GLOBAL_HOOK__");
      if (document.querySelector("[data-v-app], [data-vue-root]"))
        evidence.push("[data-v-app]");
      results.push({ name: "Vue.js", category: "Framework", evidence });
    } else if (document.querySelector("[data-v-]")) {
      // Vue 3 component scoped styles
    }

    // Nuxt
    if (w.__NUXT__) {
      results.push({
        name: "Nuxt",
        category: "Meta Framework",
        evidence: ["window.__NUXT__"],
      });
    }

    // Angular
    if (
      w.ng ||
      document.querySelector("[ng-version], [ng-app], [_ngcontent]")
    ) {
      const evidence: string[] = [];
      if (w.ng) evidence.push("window.ng");
      const ngVer = document.querySelector("[ng-version]");
      if (ngVer) evidence.push("[ng-version]");
      results.push({
        name: "Angular",
        category: "Framework",
        version:
          showVersions && ngVer
            ? (ngVer.getAttribute("ng-version") ?? undefined)
            : undefined,
        evidence,
      });
    }

    // Svelte
    const svelteClass = document.querySelector('[class*="svelte-"]');
    if (w.__svelte || svelteClass) {
      const evidence: string[] = [];
      if (w.__svelte) evidence.push("window.__svelte");
      if (svelteClass) evidence.push('[class*="svelte-"]');
      results.push({ name: "Svelte", category: "Framework", evidence });
    }

    // SvelteKit
    if (
      document.querySelector('script[type="module"][src*="svelte"]') ||
      document.querySelector("[data-sveltekit]")
    ) {
      results.push({
        name: "SvelteKit",
        category: "Meta Framework",
        evidence: ["SvelteKit module/script detected"],
      });
    }

    // Gatsby
    if (w.__GATSBY) {
      results.push({
        name: "Gatsby",
        category: "Meta Framework",
        evidence: ["window.__GATSBY"],
      });
    }

    // Remix
    if (
      document.querySelector('script[src*="remix"], link[href*="remix"]') ||
      document.querySelector("[data-remix]")
    ) {
      results.push({
        name: "Remix",
        category: "Meta Framework",
        evidence: ["Remix assets detected"],
      });
    }

    // Astro
    if (
      document.querySelector(
        "astro-island, [data-astro-island], [data-astro-transition-persist]",
      )
    ) {
      const evidence: string[] = [];
      if (document.querySelector("astro-island"))
        evidence.push("<astro-island>");
      if (document.querySelector("[data-astro-island]"))
        evidence.push("[data-astro-island]");
      results.push({ name: "Astro", category: "Meta Framework", evidence });
    }

    // Qwik
    if (document.querySelector("[q\\:slot], [q\\:container]")) {
      results.push({
        name: "Qwik",
        category: "Framework",
        evidence: ["[q:slot], [q:container]"],
      });
    }

    // Solid.js
    if (w.Solid || w._$DX_DELEGATE) {
      const evidence: string[] = [];
      if (w.Solid) evidence.push("window.Solid");
      if (w._$DX_DELEGATE) evidence.push("window._$DX_DELEGATE");
      results.push({ name: "SolidJS", category: "Framework", evidence });
    }

    // Preact
    if (w.__PREACT_DEVTOOLS__ || w.preact) {
      results.push({
        name: "Preact",
        category: "Framework",
        evidence: ["Preact globals detected"],
      });
    }

    // Lit
    if (w.litElementVersions || document.querySelector('[class*="lit-"]')) {
      const evidence: string[] = [];
      if (w.litElementVersions) evidence.push("window.litElementVersions");
      if (document.querySelector('[class*="lit-"]'))
        evidence.push('[class*="lit-"]');
      results.push({ name: "Lit", category: "Framework", evidence });
    }

    // Ember
    if (w.Ember) {
      results.push({
        name: "Ember.js",
        category: "Framework",
        version: showVersions
          ? ((w.Ember as Record<string, unknown>)?.VERSION as
              | string
              | undefined)
          : undefined,
        evidence: ["window.Ember"],
      });
    }

    // Backbone
    if (w.Backbone) {
      results.push({
        name: "Backbone.js",
        category: "Framework",
        version: showVersions
          ? ((w.Backbone as Record<string, unknown>)?.VERSION as
              | string
              | undefined)
          : undefined,
        evidence: ["window.Backbone"],
      });
    }
  }

  if (detectLibraries) {
    // jQuery
    if (
      w.jQuery ||
      (w.$ as Record<string, { jquery?: string } | undefined> | undefined)?.fn
        ?.jquery
    ) {
      const evidence: string[] = [];
      if (w.jQuery) evidence.push("window.jQuery");
      if (
        (w.$ as Record<string, { jquery?: string } | undefined> | undefined)?.fn
          ?.jquery
      )
        evidence.push("window.$.fn.jquery");
      const version = showVersions
        ? (((w.jQuery as Record<string, unknown>)?.jquery as
            | string
            | undefined) ??
          (w.$ as Record<string, { jquery: string }>)?.fn?.jquery)
        : undefined;
      results.push({ name: "jQuery", category: "Library", version, evidence });
    }

    // Lodash
    if (w._?.VERSION && typeof w._?.chain === "function") {
      results.push({
        name: "Lodash",
        category: "Library",
        version: showVersions ? (w._.VERSION as string) : undefined,
        evidence: ["window._.VERSION"],
      });
    }

    // Three.js
    if (w.THREE?.REVISION) {
      results.push({
        name: "Three.js",
        category: "Library",
        version: showVersions ? "r" + (w.THREE.REVISION as string) : undefined,
        evidence: ["window.THREE"],
      });
    }

    // D3.js
    if (w.d3?.version) {
      results.push({
        name: "D3.js",
        category: "Library",
        version: showVersions ? (w.d3.version as string) : undefined,
        evidence: ["window.d3"],
      });
    }

    // GSAP
    if (w.gsap?.version) {
      results.push({
        name: "GSAP",
        category: "Library",
        version: showVersions ? (w.gsap.version as string) : undefined,
        evidence: ["window.gsap"],
      });
    }

    // Moment.js
    if (w.moment?.version) {
      results.push({
        name: "Moment.js",
        category: "Library",
        version: showVersions ? (w.moment.version as string) : undefined,
        evidence: ["window.moment"],
      });
    }

    // Day.js
    if (w.dayjs) {
      results.push({
        name: "Day.js",
        category: "Library",
        evidence: ["window.dayjs"],
      });
    }

    // axios
    if (w.axios) {
      results.push({
        name: "Axios",
        category: "Library",
        version: showVersions
          ? ((w.axios as Record<string, unknown>)?.VERSION as
              | string
              | undefined)
          : undefined,
        evidence: ["window.axios"],
      });
    }

    // Hammer.js
    if (w.Hammer) {
      results.push({
        name: "Hammer.js",
        category: "Library",
        evidence: ["window.Hammer"],
      });
    }

    // Chart.js
    if (w.Chart) {
      results.push({
        name: "Chart.js",
        category: "Library",
        version: showVersions
          ? ((w.Chart as Record<string, unknown>)?.version as
              | string
              | undefined)
          : undefined,
        evidence: ["window.Chart"],
      });
    }

    // Bootstrap
    const bsCss = document.querySelector('link[href*="bootstrap"]');
    if (w.bootstrap || bsCss) {
      const evidence: string[] = [];
      if (w.bootstrap) evidence.push("window.bootstrap");
      if (bsCss) evidence.push("Bootstrap CSS");
      results.push({ name: "Bootstrap", category: "UI Library", evidence });
    }

    // Tailwind CSS
    const allElements = document.querySelectorAll("*");
    const tailwindPatterns = [
      /^flex$/,
      /^grid$/,
      /^p(t|r|b|l|x|y)?-\d/,
      /^m(t|r|b|l|x|y)?-\d/,
      /^text-(xs|sm|base|lg|xl|2xl)/,
      /^bg-/,
      /^rounded/,
      /^shadow/,
    ];
    let twCount = 0;
    for (let i = 0; i < Math.min(allElements.length, 200); i++) {
      const el = allElements[i];
      for (const c of el.classList) {
        if (tailwindPatterns.some((p) => p.test(c))) {
          twCount++;
          break;
        }
      }
    }
    if (twCount > 5) {
      results.push({
        name: "Tailwind CSS",
        category: "CSS Framework",
        evidence: [twCount + " elements with Tailwind classes"],
      });
    }

    // Material UI
    if (
      document.querySelector(
        '[class*="MuiButton"], [class*="MuiTypography"], [class*="css-"]',
      )
    ) {
      results.push({
        name: "Material UI",
        category: "UI Library",
        evidence: ["MUI class names detected"],
      });
    }
  }

  if (detectAnalytics) {
    // Google Analytics
    if (
      w.ga ||
      w.gtag ||
      w.GoogleAnalyticsObject ||
      document.querySelector('script[src*="google-analytics"]')
    ) {
      const evidence: string[] = [];
      if (w.GoogleAnalyticsObject)
        evidence.push("window.GoogleAnalyticsObject");
      if (w.gtag) evidence.push("window.gtag");
      if (document.querySelector('script[src*="google-analytics"]'))
        evidence.push("GA script tag");
      results.push({
        name: "Google Analytics",
        category: "Analytics",
        evidence,
      });
    }

    // Google Tag Manager
    if (
      w.dataLayer ||
      document.querySelector('script[src*="googletagmanager"]')
    ) {
      results.push({
        name: "Google Tag Manager",
        category: "Analytics",
        evidence: ["window.dataLayer or GTM script"],
      });
    }

    // Facebook Pixel
    if (w.fbq) {
      results.push({
        name: "Facebook Pixel",
        category: "Analytics",
        evidence: ["window.fbq"],
      });
    }

    // Segment
    if (w.analytics?.track) {
      results.push({
        name: "Segment",
        category: "Analytics",
        evidence: ["window.analytics"],
      });
    }

    // Hotjar
    if (w.hj) {
      results.push({
        name: "Hotjar",
        category: "Analytics",
        evidence: ["window.hj"],
      });
    }

    // Mixpanel
    if (w.mixpanel) {
      results.push({
        name: "Mixpanel",
        category: "Analytics",
        evidence: ["window.mixpanel"],
      });
    }

    // Sentry
    if (w.Sentry) {
      results.push({
        name: "Sentry",
        category: "Monitoring",
        evidence: ["window.Sentry"],
      });
    }

    // New Relic
    if (w.newrelic) {
      results.push({
        name: "New Relic",
        category: "Monitoring",
        evidence: ["window.newrelic"],
      });
    }

    // Plausible
    if (document.querySelector('script[src*="plausible"]')) {
      results.push({
        name: "Plausible",
        category: "Analytics",
        evidence: ["Plausible script tag"],
      });
    }

    // Amplitude
    if (w.amplitude) {
      results.push({
        name: "Amplitude",
        category: "Analytics",
        evidence: ["window.amplitude"],
      });
    }
  }

  if (detectCMS) {
    // WordPress
    const wpMeta = document.querySelector(
      'meta[name="generator"][content*="WordPress"]',
    );
    const wpLinks = document.querySelector('link[href*="wp-content"]');
    if (wpMeta || wpLinks) {
      const evidence: string[] = [];
      if (wpMeta) evidence.push('meta[name="generator"]');
      if (wpLinks) evidence.push("wp-content link");
      const version =
        showVersions && wpMeta
          ? wpMeta.getAttribute("content")?.replace("WordPress ", "") ||
            undefined
          : undefined;
      results.push({ name: "WordPress", category: "CMS", version, evidence });
    }

    // Shopify
    if (
      w.Shopify ||
      document.querySelector('link[href*="shopify"], script[src*="shopify"]')
    ) {
      results.push({
        name: "Shopify",
        category: "CMS",
        evidence: ["Shopify globals or assets"],
      });
    }

    // Drupal
    const drupalMeta = document.querySelector(
      'meta[name="Generator"][content*="Drupal"]',
    );
    const drupalSettings = w.drupalSettings || w.Drupal;
    if (drupalMeta || drupalSettings) {
      results.push({
        name: "Drupal",
        category: "CMS",
        evidence: ["Drupal meta tag or globals"],
      });
    }

    // Wix
    if (
      document.querySelector(
        'meta[name="generator"][content*="Wix"], script[src*="wix"]',
      )
    ) {
      results.push({
        name: "Wix",
        category: "CMS",
        evidence: ["Wix meta or scripts"],
      });
    }

    // Squarespace
    if (
      document.querySelector('meta[name="generator"][content*="Squarespace"]')
    ) {
      results.push({
        name: "Squarespace",
        category: "CMS",
        evidence: ["Squarespace meta tag"],
      });
    }

    // Webflow
    if (document.querySelector('meta[name="generator"][content*="Webflow"]')) {
      results.push({
        name: "Webflow",
        category: "CMS",
        evidence: ["Webflow meta tag"],
      });
    }

    // Contentful / Sanity headless CMS
    if (
      document.querySelector(
        'img[src*="ctfassets.net"], img[src*="images.ctfassets.net"]',
      )
    ) {
      results.push({
        name: "Contentful",
        category: "Headless CMS",
        evidence: ["Contentful image CDN"],
      });
    }
    if (document.querySelector('img[src*="cdn.sanity.io"]')) {
      results.push({
        name: "Sanity",
        category: "Headless CMS",
        evidence: ["Sanity image CDN"],
      });
    }
  }

  return results;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export const techDetector: ToolDefinition = {
  id: "tech-detector",
  name: "Tech Detector",
  description:
    "Detect technologies, frameworks, and libraries used on the page",
  category: "inspection",
  icon: "Cpu",
  configSchema: {
    detectFrameworks: {
      type: "boolean",
      label: "Detect Frameworks",
      default: true,
    },
    detectLibraries: {
      type: "boolean",
      label: "Detect Libraries",
      default: true,
    },
    detectAnalytics: {
      type: "boolean",
      label: "Detect Analytics",
      default: true,
    },
    detectCMS: { type: "boolean", label: "Detect CMS", default: true },
    showVersions: { type: "boolean", label: "Show Versions", default: true },
  },
  run: (ctx, config) => {
    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:460px;max-height:80vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .panel{background:#1e1e2e;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid #313244;overflow:hidden;display:flex;flex-direction:column;max-height:80vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#cdd6f4;}
      .header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825;}
      .title{font-weight:600;font-size:14px;}
      .actions{display:flex;gap:4px;}
      .actions button{background:transparent;border:none;color:#6c7086;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .actions button:hover{background:#313244;color:#cdd6f4;}
      .summary{display:flex;gap:12px;padding:8px 16px;border-bottom:1px solid #313244;background:#181825;flex-wrap:wrap;}
      .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;}
      .badge-framework{background:rgba(137,180,250,0.15);color:#89b4fa;}
      .badge-library{background:rgba(166,227,161,0.15);color:#a6e3a1;}
      .badge-analytics{background:rgba(249,226,175,0.15);color:#f9e2af;}
      .badge-cms{background:rgba(203,166,247,0.15);color:#cba6f7;}
      .content{flex:1;overflow-y:auto;padding:12px;}
      .tech-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#313244;border-radius:6px;margin-bottom:6px;cursor:pointer;transition:background 0.15s;}
      .tech-item:hover{background:#45475a;}
      .tech-left{display:flex;align-items:center;gap:10px;min-width:0;flex:1;}
      .tech-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tech-version{font-size:11px;color:#6c7086;font-family:monospace;}
      .tech-category{font-size:10px;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
      .cat-framework{background:rgba(137,180,250,0.15);color:#89b4fa;}
      .cat-meta-framework{background:rgba(180,190,254,0.15);color:#b4befe;}
      .cat-library{background:rgba(166,227,161,0.15);color:#a6e3a1;}
      .cat-ui-library{background:rgba(148,226,213,0.15);color:#94e2d5;}
      .cat-css-framework{background:rgba(249,226,175,0.15);color:#f9e2af;}
      .cat-analytics{background:rgba(250,179,135,0.15);color:#fab387;}
      .cat-monitoring{background:rgba(243,139,168,0.15);color:#f38ba8;}
      .cat-cms{background:rgba(203,166,247,0.15);color:#cba6f7;}
      .cat-headless-cms{background:rgba(245,194,231,0.15);color:#f5c2e7;}
      .tech-evidence{font-size:10px;color:#585b70;margin-top:4px;max-height:0;overflow:hidden;transition:max-height 0.2s;}
      .tech-item.expanded .tech-evidence{max-height:100px;}
      .empty{text-align:center;padding:40px 20px;color:#6c7086;}
      .footer{display:flex;justify-content:space-between;padding:8px 16px;border-top:1px solid #313244;background:#181825;font-size:11px;color:#6c7086;}
      .content::-webkit-scrollbar{width:6px;}
      .content::-webkit-scrollbar-thumb{background:#313244;border-radius:3px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "title";
    titleDiv.textContent = "Tech Detector";
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.textContent = "🔄";
    const btnClose = document.createElement("button");
    btnClose.textContent = "✕";
    actionsDiv.append(btnRefresh, btnClose);
    header.append(titleDiv, actionsDiv);

    const summaryEl = document.createElement("div");
    summaryEl.className = "summary";

    const content = document.createElement("div");
    content.className = "content";

    const footer = document.createElement("div");
    footer.className = "footer";
    const statsEl = document.createElement("span");
    statsEl.textContent = "Scanning...";
    const urlEl = document.createElement("span");
    urlEl.style.cssText =
      "max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    urlEl.textContent = window.location.hostname;
    footer.append(statsEl, urlEl);

    panel.append(header, summaryEl, content, footer);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function getCategoryClass(cat: string): string {
      const c = cat.toLowerCase().replace(/[\s.]/g, "-");
      return "cat-" + c;
    }

    function getSummaryBadgeClass(cat: string): string {
      const lower = cat.toLowerCase();
      if (
        lower.includes("framework") &&
        !lower.includes("meta") &&
        !lower.includes("css")
      )
        return "badge-framework";
      if (lower.includes("meta") || lower.includes("css"))
        return "badge-framework";
      if (lower.includes("library")) return "badge-library";
      if (lower.includes("analytics") || lower.includes("monitoring"))
        return "badge-analytics";
      if (lower.includes("cms")) return "badge-cms";
      return "badge-framework";
    }

    function render(techs: DetectedTech[]): void {
      while (summaryEl.firstChild) summaryEl.removeChild(summaryEl.firstChild);
      while (content.firstChild) content.removeChild(content.firstChild);

      if (techs.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No technologies detected";
        content.appendChild(empty);
        statsEl.textContent = "0 technologies";
        return;
      }

      const grouped: Record<string, number> = {};
      for (const t of techs) {
        grouped[t.category] = (grouped[t.category] || 0) + 1;
      }
      for (const [cat, count] of Object.entries(grouped)) {
        const badge = document.createElement("span");
        badge.className = "badge " + getSummaryBadgeClass(cat);
        badge.textContent = count + " " + cat;
        summaryEl.appendChild(badge);
      }

      statsEl.textContent = techs.length + " technologies detected";

      for (const tech of techs) {
        const item = document.createElement("div");
        item.className = "tech-item";

        const left = document.createElement("div");
        left.className = "tech-left";

        const nameSpan = document.createElement("span");
        nameSpan.className = "tech-name";
        nameSpan.textContent = tech.name;
        left.appendChild(nameSpan);

        if (tech.version) {
          const verSpan = document.createElement("span");
          verSpan.className = "tech-version";
          verSpan.textContent = "v" + tech.version;
          left.appendChild(verSpan);
        }

        const catSpan = document.createElement("span");
        catSpan.className = "tech-category " + getCategoryClass(tech.category);
        catSpan.textContent = tech.category;
        left.appendChild(catSpan);

        item.appendChild(left);

        const evidenceDiv = document.createElement("div");
        evidenceDiv.className = "tech-evidence";
        evidenceDiv.textContent = tech.evidence.join(" | ");
        item.appendChild(evidenceDiv);

        item.addEventListener("click", () => {
          item.classList.toggle("expanded");
        });

        content.appendChild(item);
      }
    }

    function scan(): void {
      const techs = detectAllTech(config ?? {});
      render(techs);
    }

    btnRefresh.addEventListener("click", scan);
    btnClose.addEventListener("click", cleanup);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    scan();

    function cleanup(): void {
      document.removeEventListener("keydown", handleKeyDown, true);
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
