export interface ComparisonRow {
  feature: string;
  us: string | boolean;
  them: string | boolean;
}

export interface ComparisonPageData {
  slug: string;
  /** Competitor or comparison subject. */
  name: string;
  metaTitle: string;
  metaDescription: string;
  /** Short intro used in schema and page header. */
  description: string;
  /** One-line honest verdict on who should pick what. */
  verdict: string;
  rows: ComparisonRow[];
  relatedToolSlugs: string[];
}

export const allComparisons: ComparisonPageData[] = [
  {
    slug: "pesticide-alternative",
    name: "Pesticide",
    metaTitle: "Pesticide Alternative — 50 Visual Debugging Tools in One | FrontendDevHelper",
    metaDescription:
      "Looking for a Pesticide alternative? FrontendDevHelper covers element outlines plus 49 more visual debugging tools — flexbox/grid overlays, a11y audits, performance. Free & open source.",
    description:
      "Pesticide is a beloved single-purpose extension that outlines every element on a page. FrontendDevHelper includes that capability (X-Ray Mode) alongside 49 other visual debugging tools in one Manifest V3 extension.",
    verdict:
      "If you only ever need element outlines, Pesticide is perfectly good. If you debug CSS, accessibility, or performance as part of your job, one toolkit replaces it and a dozen others.",
    rows: [
      { feature: "Element outlines on hover/all", us: true, them: true },
      { feature: "Flexbox & grid visualization", us: true, them: false },
      { feature: "Accessibility auditing (WCAG)", us: true, them: false },
      { feature: "Performance profiling", us: true, them: false },
      { feature: "Color/contrast tools", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: true },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free" },
      { feature: "Browsers", us: "Chrome, Edge, Brave, Firefox", them: "Chrome, Firefox" },
    ],
    relatedToolSlugs: ["x-ray-mode", "css-debugger", "dom-inspector", "layout-visualizer"],
  },
  {
    slug: "whatfont-alternative",
    name: "WhatFont",
    metaTitle: "WhatFont Alternative — Font Identification Plus 49 More Tools | FrontendDevHelper",
    metaDescription:
      "Need a WhatFont alternative? FrontendDevHelper's Font Inspector identifies fonts, weights, and styles on hover — plus 49 other visual debugging tools. Free & open source.",
    description:
      "WhatFont shows the font family of hovered text. FrontendDevHelper's Font Inspector does that and surfaces weights, styles, line-height, and letter-spacing in the same overlay — as one of 50 tools in a single extension.",
    verdict:
      "WhatFont is the right pick if font identification is your only need. FrontendDevHelper is the better pick if your toolbox also includes CSS, a11y, or performance work.",
    rows: [
      { feature: "Hover font identification", us: true, them: true },
      { feature: "Weight/style/line-height in overlay", us: true, them: false },
      { feature: "Design token extraction", us: true, them: false },
      { feature: "Contrast checking", us: true, them: false },
      { feature: "CSS debugging overlays", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: false },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free" },
      { feature: "Browsers", us: "Chrome, Edge, Brave, Firefox", them: "Chrome, Safari, Firefox, Edge" },
    ],
    relatedToolSlugs: ["font-inspector", "design-token-extractor", "contrast-checker", "css-inspector"],
  },
  {
    slug: "colorzilla-alternative",
    name: "ColorZilla",
    metaTitle: "ColorZilla Alternative — Color Picker Plus 49 More Tools | FrontendDevHelper",
    metaDescription:
      "Looking beyond ColorZilla? FrontendDevHelper's Color Picker does eyedropper, palettes, and formats — plus contrast checking and 48 other visual debugging tools. Free & open source.",
    description:
      "ColorZilla is a long-standing eyedropper and palette tool. FrontendDevHelper's Color Picker covers eyedropper, format copying (hex/rgb/hsl), and saved palettes, and pairs it with WCAG contrast checking and 48 other debugging tools.",
    verdict:
      "ColorZilla wins on its history and eyedropper polish. FrontendDevHelper is the better fit when color work is part of broader frontend debugging.",
    rows: [
      { feature: "Eyedropper", us: true, them: true },
      { feature: "Multiple color formats", us: true, them: true },
      { feature: "Saved palettes", us: true, them: true },
      { feature: "WCAG contrast checking", us: true, them: false },
      { feature: "CSS variable inspection", us: true, them: false },
      { feature: "Accessibility auditing", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: false },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free" },
    ],
    relatedToolSlugs: ["color-picker", "contrast-checker", "css-variable-inspector", "design-token-extractor"],
  },
  {
    slug: "wave-alternative",
    name: "WAVE",
    metaTitle: "WAVE Alternative — Accessibility Auditing That Runs Locally | FrontendDevHelper",
    metaDescription:
      "Considering a WAVE alternative? FrontendDevHelper audits WCAG 2.1 AA/AAA with on-page overlays, runs entirely locally, and includes 49 more debugging tools. Free & open source.",
    description:
      "WAVE is a widely used accessibility evaluation tool (web and extension). FrontendDevHelper's Accessibility Checker scans 50+ WCAG success criteria with on-page overlays and runs entirely in your browser — no page data sent to any server.",
    verdict:
      "WAVE remains a strong standalone choice, especially for its detailed rule documentation. FrontendDevHelper suits developers who want a11y feedback inside a broader daily debugging toolkit, fully offline.",
    rows: [
      { feature: "WCAG scanning", us: true, them: true },
      { feature: "On-page issue overlays", us: true, them: true },
      { feature: "Runs fully locally (no server round-trip)", us: true, them: false },
      { feature: "Contrast checking", us: true, them: true },
      { feature: "Focus order debugging", us: true, them: false },
      { feature: "CSS/performance tools included", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: false },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free (paid API)" },
    ],
    relatedToolSlugs: ["accessibility-checker", "accessibility-audit", "contrast-checker", "focus-debugger"],
  },
  {
    slug: "axe-devtools-alternative",
    name: "axe DevTools",
    metaTitle: "axe DevTools Alternative — Free, Open-Source WCAG Auditing | FrontendDevHelper",
    metaDescription:
      "Need an axe DevTools alternative? FrontendDevHelper offers WCAG 2.1 scanning powered by axe-core with visual overlays — free, open source, plus 49 more debugging tools.",
    description:
      "axe DevTools (Deque) is a professional accessibility tooling suite with paid tiers. FrontendDevHelper's Accessibility Checker uses the open-source axe-core engine, renders results as on-page overlays, and costs nothing — as part of a 50-tool debugging extension.",
    verdict:
      "For enterprise compliance workflows, reporting pipelines, and dedicated support, axe DevTools is the professional choice and worth paying for. For day-to-day a11y debugging in the browser, FrontendDevHelper covers the core need at zero cost.",
    rows: [
      { feature: "axe-core engine", us: true, them: true },
      { feature: "On-page issue overlays", us: true, them: true },
      { feature: "Free tier", us: "All features", them: "Limited (DevTools-lite)" },
      { feature: "Compliance reporting/export", us: "Basic", them: "Advanced (paid)" },
      { feature: "CSS/performance tools included", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: "Engine only (axe-core)" },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free tier + paid plans" },
    ],
    relatedToolSlugs: ["accessibility-checker", "accessibility-audit", "full-audit", "focus-debugger"],
  },
  {
    slug: "visbug-alternative",
    name: "VisBug",
    metaTitle: "VisBug Alternative — Visual Editing Plus Full Debugging Toolkit | FrontendDevHelper",
    metaDescription:
      "Looking for a VisBug alternative? FrontendDevHelper pairs visual inspection overlays with 50 debugging tools — CSS, a11y, performance, DOM. Free & open source, Manifest V3.",
    description:
      "VisBug is a popular open-source design-in-the-browser toolkit. FrontendDevHelper overlaps on element inspection, measurement, and color tools, and extends into accessibility auditing, performance profiling, and DOM analysis.",
    verdict:
      "VisBug excels at lightweight in-browser design edits. FrontendDevHelper is the broader debugging toolkit — a11y, performance, and CSS analysis beyond visual editing.",
    rows: [
      { feature: "Element inspection overlays", us: true, them: true },
      { feature: "In-browser design editing", us: true, them: true },
      { feature: "Accessibility auditing (WCAG)", us: true, them: "Partial" },
      { feature: "Performance profiling", us: true, them: false },
      { feature: "Component tree (React/Vue/etc.)", us: true, them: false },
      { feature: "AI-assisted suggestions", us: true, them: false },
      { feature: "Command palette", us: true, them: true },
      { feature: "Open source", us: true, them: true },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free" },
    ],
    relatedToolSlugs: ["css-editor", "smart-element-picker", "accessibility-checker", "performance-profiler"],
  },
  {
    slug: "react-developer-tools-alternative",
    name: "React Developer Tools",
    metaTitle: "React Developer Tools Alternative — Component Tree Plus 49 Tools | FrontendDevHelper",
    metaDescription:
      "Need more than React DevTools? FrontendDevHelper visualizes React component trees, props, and state — plus performance profiling and 48 more visual debugging tools. Free & open source.",
    description:
      "React Developer Tools is the official extension for React component hierarchies. FrontendDevHelper's Component Tree and React State Panel cover hierarchy, props, and state visualization for React — alongside Vue/Angular/Svelte support and 48 other debugging tools.",
    verdict:
      "Keep React DevTools for deep hooks debugging and the Profiler flame chart — it's official and unmatched there. FrontendDevHelper adds cross-framework component visualization plus a full visual debugging toolkit in one install.",
    rows: [
      { feature: "Component tree visualization", us: true, them: true },
      { feature: "Props & state inspection", us: true, them: true },
      { feature: "Framework support", us: "React, Vue, Angular, Svelte", them: "React only" },
      { feature: "Official hooks Profiler", us: false, them: true },
      { feature: "CSS/a11y/performance overlays", us: true, them: false },
      { feature: "VS Code jump-to-source bridge", us: true, them: false },
      { feature: "Command palette", us: true, them: false },
      { feature: "Open source", us: true, them: true },
      { feature: "Manifest V3", us: true, them: true },
      { feature: "Price", us: "Free", them: "Free" },
    ],
    relatedToolSlugs: ["component-tree", "react-state-panel", "performance-profiler", "flame-graph"],
  },
];

export function getComparisonBySlug(slug: string): ComparisonPageData | undefined {
  return allComparisons.find((c) => c.slug === slug);
}
