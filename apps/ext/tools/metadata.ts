import type { ToolCategory, ConfigField } from "./types";

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  configSchema?: Record<string, ConfigField>;
  loader: () => Promise<{ [key: string]: unknown }>;
}

export const toolMetadata: Record<string, ToolMetadata> = {
  // Inspection tools
  "dom-outliner": {
    id: "dom-outliner",
    name: "DOM Outliner",
    description:
      "Visualize DOM structure with colored outlines around elements",
    category: "inspection",
    icon: "Box",
    configSchema: {
      showLabels: { type: "boolean", label: "Show Labels", default: true },
      outlineColor: {
        type: "color",
        label: "Outline Color",
        default: "#ff6b6b",
      },
      maxDepth: {
        type: "slider",
        label: "Max Depth",
        default: 5,
        min: 1,
        max: 10,
        step: 1,
      },
      excludeHidden: {
        type: "boolean",
        label: "Exclude Hidden Elements",
        default: true,
      },
      targetTags: {
        type: "select",
        label: "Target Elements",
        default: "block",
        options: [
          { label: "Block Elements", value: "block" },
          { label: "All Elements", value: "all" },
          { label: "Custom Selector", value: "custom" },
        ],
      },
    },
    loader: () => import("./inspection/dom-outliner"),
  },
  "spacing-visualizer": {
    id: "spacing-visualizer",
    name: "Spacing Visualizer",
    description: "Visualize margin, padding, and gap spacing on elements",
    category: "inspection",
    icon: "Move",
    configSchema: {
      showMargin: { type: "boolean", label: "Show Margin", default: true },
      showPadding: { type: "boolean", label: "Show Padding", default: true },
      showGap: { type: "boolean", label: "Show Gap", default: true },
      marginColor: { type: "color", label: "Margin Color", default: "#f97316" },
      paddingColor: {
        type: "color",
        label: "Padding Color",
        default: "#22c55e",
      },
      gapColor: { type: "color", label: "Gap Color", default: "#3b82f6" },
      showValues: { type: "boolean", label: "Show Values", default: true },
    },
    loader: () => import("./inspection/spacing-visualizer"),
  },
  "font-inspector": {
    id: "font-inspector",
    name: "Font Inspector",
    description: "Inspect font properties of any element on the page",
    category: "inspection",
    icon: "Type",
    configSchema: {
      showFontFamily: {
        type: "boolean",
        label: "Show Font Family",
        default: true,
      },
      showFontSize: { type: "boolean", label: "Show Font Size", default: true },
      showLineHeight: {
        type: "boolean",
        label: "Show Line Height",
        default: true,
      },
      showFontWeight: {
        type: "boolean",
        label: "Show Font Weight",
        default: true,
      },
      showLetterSpacing: {
        type: "boolean",
        label: "Show Letter Spacing",
        default: false,
      },
      highlightOnHover: {
        type: "boolean",
        label: "Highlight on Hover",
        default: true,
      },
    },
    loader: () => import("./inspection/font-inspector"),
  },
  "color-picker": {
    id: "color-picker",
    name: "Color Picker",
    description: "Pick and copy colors from any element on the page",
    category: "inspection",
    icon: "Pipette",
    configSchema: {
      format: {
        type: "select",
        label: "Color Format",
        default: "hex",
        options: [
          { label: "HEX", value: "hex" },
          { label: "RGB", value: "rgb" },
          { label: "HSL", value: "hsl" },
        ],
      },
      copyOnPick: { type: "boolean", label: "Copy on Pick", default: true },
      showTooltip: { type: "boolean", label: "Show Tooltip", default: true },
      includeOpacity: {
        type: "boolean",
        label: "Include Opacity",
        default: false,
      },
    },
    loader: () => import("./inspection/color-picker"),
  },
  "pixel-ruler": {
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
    loader: () => import("./inspection/pixel-ruler"),
  },
  "element-inspector": {
    id: "element-inspector",
    name: "Element Inspector",
    description: "Deep inspect element properties, styles, and computed values",
    category: "inspection",
    icon: "Scan",
    configSchema: {
      showComputedStyles: {
        type: "boolean",
        label: "Show Computed Styles",
        default: true,
      },
      showBoxModel: { type: "boolean", label: "Show Box Model", default: true },
      showEventListeners: {
        type: "boolean",
        label: "Show Event Listeners",
        default: false,
      },
      showAccessibility: {
        type: "boolean",
        label: "Show Accessibility",
        default: true,
      },
      maxStyles: {
        type: "slider",
        label: "Max Styles Shown",
        default: 20,
        min: 5,
        max: 50,
        step: 5,
      },
    },
    loader: () => import("./inspection/element-inspector"),
  },
  "source-map-viewer": {
    id: "source-map-viewer",
    name: "Source Map Viewer",
    description: "Resolve minified code to original sources using source maps",
    category: "inspection",
    icon: "Map",
    configSchema: {
      autoScan: { type: "boolean", label: "Auto Scan", default: true },
      showContent: {
        type: "boolean",
        label: "Show Source Content",
        default: true,
      },
      maxFileSize: {
        type: "slider",
        label: "Max File Size (KB)",
        default: 500,
        min: 100,
        max: 2000,
        step: 100,
      },
    },
    loader: () => import("./inspection/source-map-viewer"),
  },
  "tech-detector": {
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
    loader: () => import("./inspection/tech-detector"),
  },
  "component-tree": {
    id: "component-tree",
    name: "DOM Tree Viewer",
    description:
      "Walk and inspect the DOM tree hierarchy and element attributes",
    category: "inspection",
    icon: "GitBranch",
    configSchema: {
      maxDepth: {
        type: "slider",
        label: "Max Depth",
        default: 6,
        min: 1,
        max: 15,
        step: 1,
      },
      showProps: { type: "boolean", label: "Show Props", default: true },
      showState: { type: "boolean", label: "Show State", default: false },
      highlightUpdates: {
        type: "boolean",
        label: "Highlight Updates",
        default: true,
      },
      collapseThreshold: {
        type: "number",
        label: "Collapse Threshold",
        default: 50,
      },
    },
    loader: () => import("./inspection/component-tree"),
  },
  "focus-debugger": {
    id: "focus-debugger",
    name: "Focus Debugger",
    description: "Debug focus order, tabindex, and keyboard navigation flow",
    category: "inspection",
    icon: "Focus",
    configSchema: {
      showFocusOrder: {
        type: "boolean",
        label: "Show Focus Order",
        default: true,
      },
      showTabindex: { type: "boolean", label: "Show Tabindex", default: true },
      highlightFocused: {
        type: "boolean",
        label: "Highlight Focused Element",
        default: true,
      },
      showFocusRing: {
        type: "boolean",
        label: "Show Focus Ring",
        default: true,
      },
      trapFocus: { type: "boolean", label: "Trap Focus Mode", default: false },
    },
    loader: () => import("./inspection/focus-debugger"),
  },
  "form-debugger": {
    id: "form-debugger",
    name: "Form Debugger",
    description: "Inspect form fields, validation, and submission behavior",
    category: "inspection",
    icon: "FileInput",
    configSchema: {
      showValidation: {
        type: "boolean",
        label: "Show Validation",
        default: true,
      },
      showConstraints: {
        type: "boolean",
        label: "Show Constraints",
        default: true,
      },
      showLabels: { type: "boolean", label: "Show Labels", default: true },
      showDefaultValues: {
        type: "boolean",
        label: "Show Default Values",
        default: false,
      },
      highlightRequired: {
        type: "boolean",
        label: "Highlight Required",
        default: true,
      },
    },
    loader: () => import("./inspection/form-debugger"),
  },
  "z-index-visualizer": {
    id: "z-index-visualizer",
    name: "Z-Index Visualizer",
    description: "Visualize stacking contexts and z-index values on the page",
    category: "inspection",
    icon: "Layers",
    configSchema: {
      showValues: { type: "boolean", label: "Show Values", default: true },
      colorMode: {
        type: "select",
        label: "Color Mode",
        default: "gradient",
        options: [
          { label: "Gradient", value: "gradient" },
          { label: "Random", value: "random" },
          { label: "Fixed", value: "fixed" },
        ],
      },
      minZIndex: { type: "number", label: "Min Z-Index", default: 0 },
      highlightStackingContexts: {
        type: "boolean",
        label: "Highlight Stacking Contexts",
        default: true,
      },
    },
    loader: () => import("./inspection/z-index-visualizer"),
  },
  "smart-element-picker": {
    id: "smart-element-picker",
    name: "Smart Element Picker",
    description: "Intelligent element selection with CSS selector generation",
    category: "inspection",
    icon: "MousePointerClick",
    configSchema: {
      selectorType: {
        type: "select",
        label: "Selector Type",
        default: "css",
        options: [
          { label: "CSS", value: "css" },
          { label: "XPath", value: "xpath" },
          { label: "Both", value: "both" },
        ],
      },
      copyOnClick: { type: "boolean", label: "Copy on Click", default: true },
      showSelectorBar: {
        type: "boolean",
        label: "Show Selector Bar",
        default: true,
      },
      preferClass: {
        type: "boolean",
        label: "Prefer Class Selectors",
        default: true,
      },
    },
    loader: () => import("./inspection/smart-element-picker"),
  },
  "framework-devtools": {
    id: "framework-devtools",
    name: "Framework DevTools",
    description:
      "Bridge to framework-specific developer tools (React, Vue, etc.)",
    category: "inspection",
    icon: "Code2",
    configSchema: {
      framework: {
        type: "select",
        label: "Framework",
        default: "auto",
        options: [
          { label: "Auto Detect", value: "auto" },
          { label: "React", value: "react" },
          { label: "Vue", value: "vue" },
          { label: "Angular", value: "angular" },
          { label: "Svelte", value: "svelte" },
        ],
      },
      showOverlay: { type: "boolean", label: "Show Overlay", default: true },
      autoOpen: {
        type: "boolean",
        label: "Auto Open DevTools",
        default: false,
      },
    },
    loader: () => import("./inspection/framework-devtools"),
  },
  "react-state-panel": {
    id: "react-state-panel",
    name: "React State Panel",
    description: "Inspect React component hooks, props, and state in real-time",
    category: "inspection",
    icon: "Atom",
    configSchema: {
      showProps: { type: "boolean", label: "Show Props", default: true },
      showState: { type: "boolean", label: "Show State", default: true },
      showEffects: { type: "boolean", label: "Show Effects", default: false },
      showContext: { type: "boolean", label: "Show Context", default: true },
      liveUpdate: { type: "boolean", label: "Live Updates", default: true },
    },
    loader: () => import("./inspection/react-state-panel"),
  },
  "vue-state-panel": {
    id: "vue-state-panel",
    name: "Vue State Panel",
    description: "Inspect Vue component reactive data and computed properties",
    category: "inspection",
    icon: "Diamond",
    configSchema: {
      showData: { type: "boolean", label: "Show Data", default: true },
      showComputed: { type: "boolean", label: "Show Computed", default: true },
      showProps: { type: "boolean", label: "Show Props", default: true },
      showSetup: { type: "boolean", label: "Show Setup State", default: true },
      liveUpdate: { type: "boolean", label: "Live Updates", default: true },
    },
    loader: () => import("./inspection/vue-state-panel"),
  },
  "container-query-inspector": {
    id: "container-query-inspector",
    name: "Container Query Inspector",
    description: "Inspect container queries and their matched conditions",
    category: "inspection",
    icon: "Containers",
    configSchema: {
      highlightContainers: {
        type: "boolean",
        label: "Highlight Containers",
        default: true,
      },
      showBreakpoints: {
        type: "boolean",
        label: "Show Breakpoints",
        default: true,
      },
      showMatchedRules: {
        type: "boolean",
        label: "Show Matched Rules",
        default: true,
      },
      liveResize: {
        type: "boolean",
        label: "Live Resize Preview",
        default: true,
      },
    },
    loader: () => import("./inspection/container-query-inspector"),
  },
  "view-transitions-debugger": {
    id: "view-transitions-debugger",
    name: "View Transitions Debugger",
    description: "Debug and preview View Transitions API animations",
    category: "inspection",
    icon: "RefreshCcw",
    configSchema: {
      captureSnapshots: {
        type: "boolean",
        label: "Capture Snapshots",
        default: true,
      },
      slowMotion: { type: "boolean", label: "Slow Motion", default: false },
      slowMotionDuration: {
        type: "slider",
        label: "Duration (ms)",
        default: 2000,
        min: 500,
        max: 10000,
        step: 500,
      },
      showOverlay: { type: "boolean", label: "Show Overlay", default: true },
    },
    loader: () => import("./inspection/view-transitions-debugger"),
  },
  "x-ray-mode": {
    id: "x-ray-mode",
    name: "X-Ray Mode",
    description:
      "Instant visual overlay of all issues: accessibility, performance, SEO, and best practices",
    category: "inspection",
    icon: "scan-eye",
    configSchema: {
      checkAccessibility: {
        type: "boolean",
        label: "Accessibility",
        default: true,
      },
      checkPerformance: {
        type: "boolean",
        label: "Performance",
        default: true,
      },
      checkSEO: { type: "boolean", label: "SEO", default: true },
      checkBestPractices: {
        type: "boolean",
        label: "Best Practices",
        default: true,
      },
    },
    loader: () => import("./inspection/x-ray-mode"),
  },

  // CSS tools
  "css-inspector": {
    id: "css-inspector",
    name: "CSS Inspector",
    description:
      "Inspect applied CSS rules and computed styles for any element",
    category: "css",
    icon: "Eye",
    configSchema: {
      showInherited: {
        type: "boolean",
        label: "Show Inherited Styles",
        default: false,
      },
      showBrowserDefaults: {
        type: "boolean",
        label: "Show Browser Defaults",
        default: false,
      },
      groupByProperty: {
        type: "boolean",
        label: "Group by Property",
        default: true,
      },
      maxRules: {
        type: "slider",
        label: "Max Rules Shown",
        default: 30,
        min: 10,
        max: 100,
        step: 10,
      },
    },
    loader: () => import("./css/css-inspector"),
  },
  "css-editor": {
    id: "css-editor",
    name: "CSS Editor",
    description: "Live-edit CSS properties on any element with instant preview",
    category: "css",
    icon: "PenTool",
    configSchema: {
      autoApply: { type: "boolean", label: "Auto Apply", default: true },
      showDiff: { type: "boolean", label: "Show Diff", default: true },
      persistChanges: {
        type: "boolean",
        label: "Persist Changes",
        default: false,
      },
    },
    loader: () => import("./css/css-editor"),
  },
  "css-scanner": {
    id: "css-scanner",
    name: "CSS Scanner",
    description: "Scan for unused CSS, specificity issues, and duplicate rules",
    category: "css",
    icon: "Search",
    configSchema: {
      scanUnused: { type: "boolean", label: "Scan Unused CSS", default: true },
      scanDuplicates: {
        type: "boolean",
        label: "Scan Duplicates",
        default: true,
      },
      scanSpecificity: {
        type: "boolean",
        label: "Check Specificity",
        default: true,
      },
    },
    loader: () => import("./css/css-scanner"),
  },
  "css-variable-inspector": {
    id: "css-variable-inspector",
    name: "CSS Variable Inspector",
    description: "Browse and inspect CSS custom properties and their values",
    category: "css",
    icon: "Variable",
    configSchema: {
      groupByScope: { type: "boolean", label: "Group by Scope", default: true },
      showComputed: {
        type: "boolean",
        label: "Show Computed Values",
        default: true,
      },
      showFallbacks: {
        type: "boolean",
        label: "Show Fallbacks",
        default: false,
      },
    },
    loader: () => import("./css/css-variable-inspector"),
  },
  "layout-visualizer": {
    id: "layout-visualizer",
    name: "Layout Visualizer",
    description: "Visualize Flexbox, Grid, and block layout properties",
    category: "css",
    icon: "LayoutGrid",
    configSchema: {
      showFlex: { type: "boolean", label: "Show Flex Layouts", default: true },
      showGrid: { type: "boolean", label: "Show Grid Layouts", default: true },
      showBlock: {
        type: "boolean",
        label: "Show Block Layouts",
        default: false,
      },
    },
    loader: () => import("./css/layout-visualizer"),
  },
  "grid-overlay": {
    id: "grid-overlay",
    name: "Grid Overlay",
    description: "Overlay CSS Grid lines, areas, and tracks on the page",
    category: "css",
    icon: "Grid3x3",
    configSchema: {
      showLines: { type: "boolean", label: "Show Grid Lines", default: true },
      showAreas: { type: "boolean", label: "Show Areas", default: true },
      showTracks: { type: "boolean", label: "Show Tracks", default: true },
    },
    loader: () => import("./css/grid-overlay"),
  },
  "contrast-checker": {
    id: "contrast-checker",
    name: "Contrast Checker",
    description: "Check color contrast ratios against WCAG standards",
    category: "css",
    icon: "Contrast",
    configSchema: {
      standard: {
        type: "select",
        label: "WCAG Standard",
        default: "aa",
        options: [
          { label: "WCAG AA", value: "aa" },
          { label: "WCAG AAA", value: "aaa" },
        ],
      },
    },
    loader: () => import("./css/contrast-checker"),
  },
  "animation-inspector": {
    id: "animation-inspector",
    name: "Animation Inspector",
    description: "Inspect, pause, and control CSS animations and transitions",
    category: "css",
    icon: "Play",
    configSchema: {
      pauseAll: { type: "boolean", label: "Pause All", default: false },
      showTimeline: { type: "boolean", label: "Show Timeline", default: true },
      slowMotion: { type: "boolean", label: "Slow Motion", default: false },
    },
    loader: () => import("./css/animation-inspector"),
  },
  "design-system-validator": {
    id: "design-system-validator",
    name: "Design System Validator",
    description: "Validate page elements against a design system specification",
    category: "css",
    icon: "CheckCircle",
    configSchema: {
      checkColors: { type: "boolean", label: "Check Colors", default: true },
      checkTypography: {
        type: "boolean",
        label: "Check Typography",
        default: true,
      },
      checkSpacing: { type: "boolean", label: "Check Spacing", default: true },
      checkBorderRadius: {
        type: "boolean",
        label: "Check Border Radius",
        default: false,
      },
      tolerance: {
        type: "slider",
        label: "Tolerance (%)",
        default: 5,
        min: 0,
        max: 20,
        step: 1,
      },
    },
    loader: () => import("./css/design-system-validator"),
  },
  "breakpoint-overlay": {
    id: "breakpoint-overlay",
    name: "Breakpoint Overlay",
    description: "Show active CSS breakpoints and media query boundaries",
    category: "css",
    icon: "Monitor",
    configSchema: {
      showIndicator: {
        type: "boolean",
        label: "Show Indicator",
        default: true,
      },
      showAllBreakpoints: {
        type: "boolean",
        label: "Show All Breakpoints",
        default: false,
      },
      highlightActive: {
        type: "boolean",
        label: "Highlight Active",
        default: true,
      },
    },
    loader: () => import("./css/breakpoint-overlay"),
  },
  "design-token-extractor": {
    id: "design-token-extractor",
    name: "Design Token Extractor",
    description:
      "Extract and export design tokens: colors, spacing, typography, shadows, and breakpoints",
    category: "css",
    icon: "palette",
    loader: () => import("./css/design-token-extractor"),
  },
  "specificity-cascade": {
    id: "specificity-cascade",
    name: "Specificity Cascade",
    description:
      "Visualize CSS cascade showing which rules win and why for each property",
    category: "css",
    icon: "GitBranch",
    loader: () => import("./css/specificity-cascade"),
  },

  // Performance tools
  "network-analyzer": {
    id: "network-analyzer",
    name: "Network Analyzer",
    description: "Analyze network requests, payloads, and loading performance",
    category: "performance",
    icon: "Wifi",
    configSchema: {
      captureXHR: { type: "boolean", label: "Capture XHR", default: true },
      captureFetch: { type: "boolean", label: "Capture Fetch", default: true },
      captureImages: {
        type: "boolean",
        label: "Capture Images",
        default: true,
      },
    },
    loader: () => import("./performance/network-analyzer"),
  },
  "flame-graph": {
    id: "flame-graph",
    name: "Performance Entries Viewer",
    description:
      "Visualize performance.measure / mark / resource / longtask entries as a timeline",
    category: "performance",
    icon: "Flame",
    configSchema: {
      sampleRate: {
        type: "slider",
        label: "Sample Rate (ms)",
        default: 10,
        min: 1,
        max: 100,
        step: 1,
      },
      maxDuration: {
        type: "slider",
        label: "Max Duration (s)",
        default: 30,
        min: 5,
        max: 120,
        step: 5,
      },
      showLongTasks: {
        type: "boolean",
        label: "Show Long Tasks",
        default: true,
      },
    },
    loader: () => import("./performance/flame-graph"),
  },
  "performance-budget": {
    id: "performance-budget",
    name: "Performance Budget",
    description: "Set and monitor performance budgets for page metrics",
    category: "performance",
    icon: "Gauge",
    configSchema: {
      maxDOMNodes: { type: "number", label: "Max DOM Nodes", default: 1500 },
      maxBundleSize: {
        type: "number",
        label: "Max Bundle Size (KB)",
        default: 300,
      },
      maxImages: { type: "number", label: "Max Images", default: 50 },
    },
    loader: () => import("./performance/performance-budget"),
  },
  "scroll-animations-debugger": {
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
    },
    loader: () => import("./performance/scroll-animations-debugger"),
  },
  "performance-audit": {
    id: "performance-audit",
    name: "Performance Audit",
    description:
      "Measure Core Web Vitals and get actionable performance suggestions",
    category: "performance",
    icon: "Gauge",
    loader: () => import("./performance/performance-audit"),
  },
  // Note: 'react-render-tracker' was removed in favor of the dedicated React
  // Profiler DevTools panel (see components/panels/react-profiler-panel.tsx).
  "network-replay": {
    id: "network-replay",
    name: "Network Replay",
    description:
      "Capture, replay, and export network requests as cURL, fetch, or Postman",
    category: "performance",
    icon: "Repeat",
    configSchema: {
      captureXHR: { type: "boolean", label: "Capture XHR", default: true },
      captureFetch: { type: "boolean", label: "Capture Fetch", default: true },
      maxBodySize: {
        type: "slider",
        label: "Max Body Size (KB)",
        default: 100,
        min: 10,
        max: 500,
        step: 10,
      },
    },
    loader: () => import("./performance/network-replay"),
  },

  // Accessibility tools
  "accessibility-audit": {
    id: "accessibility-audit",
    name: "Accessibility Audit",
    description:
      "Run comprehensive accessibility audit against WCAG guidelines",
    category: "accessibility",
    icon: "ShieldCheck",
    configSchema: {
      level: {
        type: "select",
        label: "WCAG Level",
        default: "aa",
        options: [
          { label: "Level A", value: "a" },
          { label: "Level AA", value: "aa" },
          { label: "Level AAA", value: "aaa" },
        ],
      },
      resultTypes: {
        type: "select",
        label: "Show Result Types",
        default: "violations",
        options: [
          { label: "Violations only", value: "violations" },
          { label: "Violations + Incomplete", value: "violations-incomplete" },
          { label: "All (incl. Passes)", value: "all" },
        ],
      },
    },
    loader: () => import("./accessibility/accessibility-audit"),
  },
  "focus-debugger-a11y": {
    id: "focus-debugger-a11y",
    name: "Focus Debugger (A11y)",
    description: "Accessibility-focused focus and keyboard navigation debugger",
    category: "accessibility",
    icon: "Eye",
    configSchema: {
      showFocusOrder: {
        type: "boolean",
        label: "Show Focus Order",
        default: true,
      },
      showTrapRegions: {
        type: "boolean",
        label: "Show Focus Trap Regions",
        default: true,
      },
      highlightSkipLinks: {
        type: "boolean",
        label: "Highlight Skip Links",
        default: true,
      },
    },
    loader: () => import("./accessibility/focus-debugger-a11y"),
  },

  // AI tools
  "smart-suggestions": {
    id: "smart-suggestions",
    name: "Smart Suggestions",
    description: "AI-powered design and code suggestions for the current page",
    category: "ai",
    icon: "Sparkles",
    configSchema: {
      suggestFixes: { type: "boolean", label: "Suggest Fixes", default: true },
      suggestImprovements: {
        type: "boolean",
        label: "Suggest Improvements",
        default: true,
      },
      maxSuggestions: {
        type: "slider",
        label: "Max Suggestions",
        default: 10,
        min: 1,
        max: 50,
        step: 1,
      },
    },
    loader: () => import("./ai/smart-suggestions"),
  },
  "ai-analyzer": {
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
    },
    loader: () => import("./ai/ai-analyzer"),
  },
  "ai-auto-fix": {
    id: "ai-auto-fix",
    name: "AI Auto-Fix",
    description: "AI-powered automatic fix suggestions with diff preview",
    category: "ai",
    icon: "Wand2",
    loader: () => import("./ai/ai-auto-fix"),
  },

  // Utility tools
  "screenshot-studio": {
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
        ],
      },
    },
    loader: () => import("./utilities/screenshot-studio"),
  },
  "storage-inspector": {
    id: "storage-inspector",
    name: "Storage Inspector",
    description: "Browse and manage localStorage, sessionStorage, and cookies",
    category: "utility",
    icon: "Database",
    configSchema: {
      showLocalStorage: {
        type: "boolean",
        label: "Show localStorage",
        default: true,
      },
      showSessionStorage: {
        type: "boolean",
        label: "Show sessionStorage",
        default: true,
      },
      showCookies: { type: "boolean", label: "Show Cookies", default: true },
    },
    loader: () => import("./utilities/storage-inspector"),
  },
  "visual-regression": {
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
    },
    loader: () => import("./utilities/visual-regression"),
  },
  "responsive-preview": {
    id: "responsive-preview",
    name: "Responsive Preview",
    description:
      "Preview the page at different screen sizes and device viewports",
    category: "utility",
    icon: "Smartphone",
    configSchema: {
      device: {
        type: "select",
        label: "Device",
        default: "iphone-14",
        options: [
          { label: "iPhone 14", value: "iphone-14" },
          { label: "iPad", value: "ipad" },
          { label: "Pixel 7", value: "pixel-7" },
        ],
      },
    },
    loader: () => import("./utilities/responsive-preview"),
  },
  "command-palette": {
    id: "command-palette",
    name: "Command Palette",
    description: "Quick-access command palette for all tools and actions",
    category: "utility",
    icon: "Terminal",
    configSchema: {
      shortcut: {
        type: "string",
        label: "Keyboard Shortcut",
        default: "Ctrl+Shift+P",
      },
      showRecent: {
        type: "boolean",
        label: "Show Recent Commands",
        default: true,
      },
      maxRecent: {
        type: "slider",
        label: "Max Recent",
        default: 5,
        min: 1,
        max: 20,
        step: 1,
      },
    },
    loader: () => import("./utilities/command-palette"),
  },
  "site-report-generator": {
    id: "site-report-generator",
    name: "Site Report Generator",
    description:
      "Generate comprehensive reports about page quality and metrics",
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
    },
    loader: () => import("./utilities/site-report-generator"),
  },
  "full-audit": {
    id: "full-audit",
    name: "Full Audit",
    description:
      "One-click comprehensive audit across accessibility, performance, SEO, and best practices",
    category: "utility",
    icon: "clipboard-check",
    loader: () => import("./utilities/full-audit"),
  },
  "session-replay": {
    id: "session-replay",
    name: "Session Replay",
    description: "Record and replay debugging sessions for team collaboration",
    category: "utility",
    icon: "Video",
    configSchema: {
      recordTools: {
        type: "boolean",
        label: "Record Tool Events",
        default: true,
      },
      recordElementSelection: {
        type: "boolean",
        label: "Record Element Selection",
        default: true,
      },
      recordAIMessages: {
        type: "boolean",
        label: "Record AI Messages",
        default: true,
      },
      maxThumbnailSize: {
        type: "slider",
        label: "Thumbnail Size (px)",
        default: 200,
        min: 100,
        max: 400,
        step: 50,
      },
    },
    loader: () => import("./utilities/session-replay"),
  },
};

export const metadataByCategory: Record<ToolCategory, ToolMetadata[]> = {
  inspection: Object.values(toolMetadata).filter(
    (t) => t.category === "inspection",
  ),
  css: Object.values(toolMetadata).filter((t) => t.category === "css"),
  performance: Object.values(toolMetadata).filter(
    (t) => t.category === "performance",
  ),
  accessibility: Object.values(toolMetadata).filter(
    (t) => t.category === "accessibility",
  ),
  ai: Object.values(toolMetadata).filter((t) => t.category === "ai"),
  utility: Object.values(toolMetadata).filter((t) => t.category === "utility"),
};

/**
 * Phase 1.7: derived tool count so documentation strings can never drift
 * again. README and CLAUDE.md copy is generated from this value (or imported
 * directly where renderable); the previous "40+" claim was stale the moment a
 * tool was added or removed.
 */
export const toolCount: number = Object.keys(toolMetadata).length;
