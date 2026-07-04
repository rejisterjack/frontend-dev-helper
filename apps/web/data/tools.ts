export interface ToolPageData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  metaDescription: string;
  metaTitle: string;
  features: { title: string; description: string }[];
  howItWorks: { step: string; title: string; description: string }[];
  faq: { question: string; answer: string }[];
  relatedTools: string[];
}

export const allTools: ToolPageData[] = [
  {
    slug: "css-debugger",
    name: "CSS Debugger",
    tagline:
      "Instantly visualize, inspect, and fix CSS issues directly in the browser.",
    description:
      "The CSS Debugger Chrome Extension is a professional visual debugging tool that lets frontend developers inspect computed styles, debug layout issues, and analyze CSS properties in real-time — all with on-page overlays and zero configuration. Built into FrontendDevHelper, it replaces scattered browser extensions with one unified, Manifest V3-compliant toolkit.",
    metaTitle:
      "CSS Debugger Chrome Extension — Visual CSS Debugging Tool | FrontendDevHelper",
    metaDescription:
      "Debug CSS layouts visually with the CSS Debugger Chrome Extension. Inspect box models, visualize flexbox and grid, audit computed styles, and fix layout bugs instantly. Free, open-source, Manifest V3.",
    features: [
      {
        title: "Visual Box Model Overlay",
        description:
          "Instantly visualize margin, padding, border, and content dimensions for any element. Color-coded layers make layout debugging intuitive and fast.",
      },
      {
        title: "Flexbox & Grid Inspector",
        description:
          "See flexbox alignment, gap, wrap behavior, and CSS Grid tracks rendered directly on the page. No more guessing why items do not line up.",
      },
      {
        title: "Computed Styles Panel",
        description:
          "View the fully resolved computed styles for any hovered or selected element, including inherited and cascaded values.",
      },
      {
        title: "CSS Specificity Debugger",
        description:
          "Understand which rule wins and why. Highlight specificity conflicts and trace cascading overrides across stylesheets.",
      },
      {
        title: "Responsive Breakpoint Ruler",
        description:
          "Display a pixel ruler with configurable breakpoint markers so you can see exactly where your media queries kick in.",
      },
      {
        title: "Color Contrast Analyzer",
        description:
          "Check foreground/background contrast ratios on the fly with WCAG AA and AAA compliance indicators built right into the overlay.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the FrontendDevHelper popup, command palette (Ctrl+Shift+P), or right-click context menu and select CSS Debugger.",
      },
      {
        step: "02",
        title: "Hover & Inspect",
        description:
          "Move your mouse over any element to see a real-time overlay with box model dimensions, flexbox/grid info, and computed styles.",
      },
      {
        step: "03",
        title: "Fix & Export",
        description:
          "Copy resolved CSS, screenshot the annotated layout, or export a full style report to share with your team.",
      },
    ],
    faq: [
      {
        question: "Is the CSS Debugger free to use?",
        answer:
          "Yes. The CSS Debugger is included in the free, open-source FrontendDevHelper extension under the MIT License. All features are completely free — no account needed.",
      },
      {
        question:
          "Does it work with CSS frameworks like Tailwind, Bootstrap, or Material UI?",
        answer:
          "Absolutely. The CSS Debugger inspects the final computed styles regardless of whether they come from utility classes, CSS-in-JS, SCSS modules, or any framework. It shows you what the browser actually renders.",
      },
      {
        question: "Can I debug CSS on localhost and production sites?",
        answer:
          "Yes. The extension works on any page your browser can render, including localhost development servers, staging environments, and live production sites. All processing happens locally in your browser.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "dom-inspector",
      "color-picker",
      "performance-profiler",
    ],
  },
  {
    slug: "accessibility-checker",
    name: "Accessibility Checker",
    tagline:
      "Audit WCAG compliance and find accessibility issues in seconds, not hours.",
    description:
      "The Accessibility Checker Extension is a professional auditing tool built into FrontendDevHelper that scans pages for WCAG 2.1 AA and AAA violations, highlights issues with on-page overlays, and provides actionable fix suggestions — all running locally in your browser with zero data sent to external servers.",
    metaTitle:
      "Accessibility Checker Chrome Extension — WCAG Audit Tool | FrontendDevHelper",
    metaDescription:
      "Find and fix WCAG accessibility issues instantly with the Accessibility Checker Chrome Extension. Audit contrast ratios, ARIA labels, heading hierarchy, and more. Free, open-source, runs locally.",
    features: [
      {
        title: "WCAG 2.1 AA & AAA Scanner",
        description:
          "One-click page scan that checks for over 50 WCAG success criteria including contrast ratios, text alternatives, keyboard accessibility, and focus order.",
      },
      {
        title: "Color Contrast Overlay",
        description:
          "Highlight every text element on the page with a pass/fail contrast indicator. See exact ratios, WCAG level, and suggested color adjustments inline.",
      },
      {
        title: "Heading Hierarchy Map",
        description:
          "Visualize the heading structure (h1-h6) of your page as an interactive tree. Detect skipped levels, missing h1 tags, and illogical nesting at a glance.",
      },
      {
        title: "ARIA Label Audit",
        description:
          "Scan all ARIA attributes for correctness — missing labels, invalid roles, redundant semantics, and misconfigured live regions are surfaced instantly.",
      },
      {
        title: "Keyboard Navigation Tracer",
        description:
          "Activate the tab-order visualizer to see the exact sequence keyboard-only users will follow. Identify focus traps, skip-link issues, and unreachable interactive elements.",
      },
      {
        title: "Image Alt-Text Inspector",
        description:
          "Overlay every image on the page with its alt text (or a warning if missing). Essential for content audits and ADA compliance reviews.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Run Audit",
        description:
          "Click the Accessibility Checker in the FrontendDevHelper panel. It scans the current page DOM locally — no data leaves your browser.",
      },
      {
        step: "02",
        title: "Review Issues",
        description:
          "Issues are highlighted directly on the page with severity badges (critical, warning, info). Click any overlay to see the full details and WCAG criterion reference.",
      },
      {
        step: "03",
        title: "Fix & Verify",
        description:
          "Follow the actionable fix suggestions for each issue. Re-run the audit at any time to verify your fixes — instant feedback loop with zero deployment.",
      },
    ],
    faq: [
      {
        question: "How is this different from Lighthouse or axe?",
        answer:
          "Lighthouse gives you a one-time score. The Accessibility Checker gives you live, on-page overlays you can interact with while you code. It integrates with your development workflow rather than being a separate report you check once.",
      },
      {
        question: "Does it check for ADA and Section 508 compliance?",
        answer:
          "Yes. The checker audits against WCAG 2.1 success criteria, which form the technical basis for both ADA digital accessibility requirements and Section 508 compliance. It covers the core criteria referenced by both standards.",
      },
      {
        question: "Can I export the accessibility audit results?",
        answer:
          "Yes. You can export a structured report of all detected issues including element selectors, WCAG criteria references, severity levels, and suggested fixes. Share it with designers, PMs, or compliance teams.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "dom-inspector",
      "color-picker",
      "performance-profiler",
    ],
  },
  {
    slug: "performance-profiler",
    name: "Performance Profiler",
    tagline:
      "Measure page load performance, rendering bottlenecks, and layout shifts visually.",
    description:
      "The Performance Profiler Extension is a visual performance analysis tool built into FrontendDevHelper that measures Core Web Vitals, identifies layout shifts, renders flame-graph-style timelines, and highlights rendering bottlenecks — all from a browser extension overlay with no external tooling required.",
    metaTitle:
      "Performance Profiler Chrome Extension — Core Web Vitals Tool | FrontendDevHelper",
    metaDescription:
      "Profile page performance, Core Web Vitals, layout shifts, and rendering bottlenecks with the Performance Profiler Chrome Extension. Visual flame graphs and instant metrics. Free and open source.",
    features: [
      {
        title: "Core Web Vitals Dashboard",
        description:
          "Instantly measure LCP, FID/INP, and CLS for the current page. See real-time scores with color-coded pass/fail indicators matching Google PageSpeed thresholds.",
      },
      {
        title: "Layout Shift Visualizer",
        description:
          "Every Cumulative Layout Shift is highlighted with a red flash overlay showing the before and after position. Understand exactly what moved and why.",
      },
      {
        title: "Rendering Flame Graph",
        description:
          "A visual timeline of rendering activity showing style recalculation, layout, paint, and composite phases. Identify long tasks and main-thread blockers at a glance.",
      },
      {
        title: "Resource Load Waterfall",
        description:
          "See a simplified waterfall chart of critical resource loading. Identify render-blocking scripts, late-loading fonts, and uncompressed assets without opening DevTools.",
      },
      {
        title: "Main Thread Activity Monitor",
        description:
          "Track CPU usage on the main thread with a live graph. Spot JavaScript execution spikes and long tasks that hurt interactivity.",
      },
      {
        title: "Performance Budget Alerts",
        description:
          "Set custom thresholds for page weight, request count, and timing metrics. Get instant visual feedback when your page exceeds its performance budget.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Start Profiling",
        description:
          "Open the Performance Profiler from the FrontendDevHelper panel. It begins capturing performance metrics using the Performance and Paint Timing APIs.",
      },
      {
        step: "02",
        title: "Interact & Measure",
        description:
          "Navigate, scroll, click, and interact with the page naturally. The profiler records layout shifts, long tasks, and rendering activity in real-time.",
      },
      {
        step: "03",
        title: "Analyze Results",
        description:
          "Stop the profiler to see the full report: Core Web Vitals scores, flame graph, shift visualizations, and prioritized optimization suggestions.",
      },
    ],
    faq: [
      {
        question: "Does the profiler itself slow down the page?",
        answer:
          "The Performance Profiler uses native browser Performance APIs with minimal overhead. It is designed to have a negligible impact on the metrics it measures, so you get accurate real-world numbers.",
      },
      {
        question: "Can I use this on production sites?",
        answer:
          "Yes. Since it runs entirely in your browser as a local extension, you can profile any website including production, staging, or localhost. No server-side integration or deployment changes are needed.",
      },
      {
        question: "How does it compare to Chrome DevTools Performance tab?",
        answer:
          "DevTools gives you a raw timeline for deep analysis. The Performance Profiler gives you opinionated, visual summaries focused on Core Web Vitals and user-perceived performance. Use them together for the best results.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "dom-inspector",
      "accessibility-checker",
      "color-picker",
    ],
  },
  {
    slug: "color-picker",
    name: "Color Picker",
    tagline:
      "Pick, convert, and manage colors from any webpage with one click.",
    description:
      "The Color Picker Extension is a professional color tool built into FrontendDevHelper that lets you sample any color from a webpage, convert between HEX, RGB, HSL, and OKLCH, build palettes, and check contrast ratios — all within a sleek on-page overlay that stays out of your way.",
    metaTitle:
      "Color Picker Chrome Extension — Eyedropper & Palette Tool | FrontendDevHelper",
    metaDescription:
      "Pick colors from any webpage, convert between HEX/RGB/HSL/OKLCH, build palettes, and check contrast ratios with the Color Picker Chrome Extension. Free eyedropper tool for frontend developers.",
    features: [
      {
        title: "Pixel-Perfect Eyedropper",
        description:
          "Hover over any pixel on the page to see its exact color value in real-time. Click to copy in your preferred format — HEX, RGB, HSL, or OKLCH.",
      },
      {
        title: "Multi-Format Conversion",
        description:
          "Instantly convert any color between HEX, RGB, RGBA, HSL, HSLA, and OKLCH. See all formats simultaneously and copy whichever you need.",
      },
      {
        title: "Palette Builder",
        description:
          "Collect colors from the page into a live palette. Auto-generate complementary, analogous, and triadic harmonies from any base color.",
      },
      {
        title: "Contrast Ratio Checker",
        description:
          "Pick two colors and instantly see the WCAG contrast ratio with AA and AAA pass/fail indicators. Essential for accessible design work.",
      },
      {
        title: "CSS Variable Mapper",
        description:
          "Scan the page for all CSS custom properties containing color values. See which elements use each variable and their resolved values.",
      },
      {
        title: "Color Accessibility Simulator",
        description:
          "Preview how your color choices look under protanopia, deuteranopia, and tritanopia color vision deficiencies without leaving the browser.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate Eyedropper",
        description:
          "Open the Color Picker from the FrontendDevHelper panel or keyboard shortcut. The eyedropper activates immediately over the current page.",
      },
      {
        step: "02",
        title: "Pick & Collect",
        description:
          "Hover to preview colors in real-time. Click to add them to your palette. Each picked color shows all format conversions instantly.",
      },
      {
        step: "03",
        title: "Export & Apply",
        description:
          "Export your palette as CSS variables, Tailwind config, SCSS variables, or JSON. Copy individual values with a single click.",
      },
    ],
    faq: [
      {
        question: "Can it pick colors from images and videos?",
        answer:
          "Yes. The eyedropper samples the actual rendered pixel color from anything visible on the page, including images, videos, canvas elements, and CSS gradients.",
      },
      {
        question: "Does it support OKLCH color space?",
        answer:
          "Yes. Along with HEX, RGB, and HSL, the Color Picker fully supports OKLCH — the perceptually uniform color space recommended for modern CSS. See and copy OKLCH values for any sampled color.",
      },
      {
        question: "Can I save and reuse palettes across sessions?",
        answer:
          "Palettes are saved locally in your browser storage and persist between sessions. You can also export palettes to share with your team or import them on another device.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "accessibility-checker",
      "dom-inspector",
      "performance-profiler",
    ],
  },
  {
    slug: "dom-inspector",
    name: "DOM Inspector",
    tagline:
      "Navigate, search, and visualize the DOM tree with powerful on-page overlays.",
    description:
      "The DOM Inspector Extension is a professional DOM exploration tool built into FrontendDevHelper that provides interactive tree navigation, element search, component detection, and visual outlines — going beyond Chrome DevTools with a designer-friendly overlay that highlights elements as you move your mouse.",
    metaTitle:
      "DOM Inspector Chrome Extension — Visual DOM Explorer | FrontendDevHelper",
    metaDescription:
      "Inspect and navigate the DOM visually with the DOM Inspector Chrome Extension. Interactive tree explorer, element search, component detection, and real-time overlays. Free and open source.",
    features: [
      {
        title: "Interactive DOM Tree",
        description:
          "Navigate the full DOM tree in a collapsible sidebar panel. Search, filter, and jump to any node. Collapsible subtrees keep complex pages manageable.",
      },
      {
        title: "Element Search & Filter",
        description:
          "Find elements by tag name, class, ID, attributes, or text content. Results highlight in the DOM tree and on the page simultaneously.",
      },
      {
        title: "Component Detector",
        description:
          "Automatically detect React, Vue, Angular, and Svelte component boundaries. See component names, props, and state directly in the overlay.",
      },
      {
        title: "3D DOM Visualization",
        description:
          "Render the DOM as a 3D nested-block visualization to understand nesting depth, z-index stacking, and layout relationships spatially.",
      },
      {
        title: "Ancestry Path Display",
        description:
          "Hover over any element to see its full CSS selector path from root to target. Copy the selector with one click for use in stylesheets or tests.",
      },
      {
        title: "Event Listener Inspector",
        description:
          "See which event listeners are attached to any element, including delegated listeners. Identify memory leaks and unnecessary bindings.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Open Inspector",
        description:
          "Launch the DOM Inspector from the FrontendDevHelper panel, DevTools tab, or the Ctrl+Shift+P command palette.",
      },
      {
        step: "02",
        title: "Explore & Search",
        description:
          "Browse the DOM tree in the sidebar or hover over the page to highlight elements. Use the search bar to filter by tag, class, ID, or content.",
      },
      {
        step: "03",
        title: "Inspect & Copy",
        description:
          "Click any element to see its attributes, styles, event listeners, and component data. Copy selectors, HTML, or full component snapshots.",
      },
    ],
    faq: [
      {
        question: "How is this different from Chrome DevTools Elements panel?",
        answer:
          "Chrome DevTools is built for deep source-level debugging. The DOM Inspector provides a faster, overlay-first experience focused on visual exploration. It also adds features DevTools lacks: framework component detection, 3D DOM visualization, and integrated element search that highlights on the page.",
      },
      {
        question: "Does it detect React, Vue, and Angular components?",
        answer:
          "Yes. The Component Detector automatically identifies React fiber nodes, Vue component instances, Angular component boundaries, and Svelte blocks. You see the framework component name and its props/state alongside the DOM element.",
      },
      {
        question: "Can it inspect Shadow DOM?",
        answer:
          "Partial support. The DOM Inspector can traverse open Shadow DOM boundaries and show the elements inside. Closed Shadow DOM has browser-imposed restrictions that limit what any extension can access.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "accessibility-checker",
      "performance-profiler",
      "color-picker",
    ],
  },
  {
    slug: "z-index-visualizer",
    name: "Z-Index Visualizer",
    tagline:
      "See stacking order in 3D, debug z-index conflicts, and fix overlapping elements visually.",
    description:
      "The Z-Index Visualizer is a powerful layout debugging tool built into FrontendDevHelper that renders the stacking context as an interactive 3D view, highlights z-index conflicts, and shows exactly which elements overlap — making the browser stacking model transparent and intuitive.",
    metaTitle:
      "Z-Index Visualizer Chrome Extension — 3D Stacking Context Tool | FrontendDevHelper",
    metaDescription:
      "Visualize z-index stacking order in 3D, debug z-index conflicts, and fix overlapping elements with the Z-Index Visualizer Chrome Extension. Free, open-source, runs locally.",
    features: [
      {
        title: "3D Stacking Context View",
        description:
          "Render the entire page stacking context as an interactive 3D layered visualization. Rotate, zoom, and pan to understand which elements sit above or below others.",
      },
      {
        title: "Z-Index Conflict Detector",
        description:
          "Automatically scan the page for z-index conflicts — elements with competing z-index values that produce unexpected overlap behavior. See conflicts listed by severity.",
      },
      {
        title: "Stacking Context Map",
        description:
          "Visualize every stacking context boundary on the page. Understand which CSS properties create new stacking contexts and how they isolate child elements.",
      },
      {
        title: "Overlap Highlighter",
        description:
          "Highlight pairs of elements that visually overlap on screen. See the overlap region highlighted with the computed z-index of each competing element.",
      },
      {
        title: "Z-Index Heatmap",
        description:
          "Color-code every positioned element on the page by its z-index value. Instantly spot outliers, excessively high values, and unnecessary z-index declarations.",
      },
      {
        title: "Click-to-Inspect",
        description:
          "Click any element in the 3D view or heatmap to see its z-index, position property, stacking context parent, and suggestions for fixing conflicts.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Z-Index Visualizer from the FrontendDevHelper popup, command palette (Ctrl+Shift+P), or context menu.",
      },
      {
        step: "02",
        title: "Explore in 3D",
        description:
          "The page is rendered as an interactive 3D layered view. Rotate and zoom to see the stacking order. Red highlights indicate conflicts.",
      },
      {
        step: "03",
        title: "Fix & Verify",
        description:
          "Click conflicting elements to see details and suggested fixes. Re-render the 3D view after changes to verify the fix.",
      },
    ],
    faq: [
      {
        question: "Why are my z-index values not working as expected?",
        answer:
          "Z-index only works on positioned elements and is scoped to stacking contexts. The Z-Index Visualizer shows you exactly which stacking context an element belongs to and whether a parent context is preventing your z-index from taking effect.",
      },
      {
        question: "Does it work with CSS frameworks?",
        answer:
          "Yes. The Z-Index Visualizer inspects computed styles regardless of whether z-index values come from Tailwind, Bootstrap, inline styles, or any other source. It shows the final rendered stacking behavior.",
      },
      {
        question: "Can I use this on complex single-page applications?",
        answer:
          "Absolutely. The visualizer handles dynamic SPAs built with React, Vue, Angular, or any framework. It re-scans the DOM when content changes so you can debug z-index issues in modals, dropdowns, tooltips, and overlays.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "dom-inspector",
      "element-inspector",
      "css-inspector",
    ],
  },
  {
    slug: "flex-grid-visualizer",
    name: "Flex/Grid Visualizer",
    tagline:
      "Interactive visualization of Flexbox and CSS Grid layouts with alignment and spacing debugging.",
    description:
      "The Flex/Grid Visualizer is a layout debugging tool built into FrontendDevHelper that overlays interactive diagrams on Flexbox and CSS Grid containers, showing alignment, gap, wrap behavior, track sizes, and item placement — making even the most complex grid layouts easy to understand and debug.",
    metaTitle:
      "Flexbox & Grid Visualizer Chrome Extension — CSS Layout Debugging | FrontendDevHelper",
    metaDescription:
      "Debug Flexbox and CSS Grid layouts visually. See alignment, gaps, tracks, and item placement with interactive overlays. Free Chrome Extension for frontend developers.",
    features: [
      {
        title: "Flexbox Alignment Overlay",
        description:
          "Visualize justify-content, align-items, align-content, and flex-wrap behavior directly on the page. See exactly where flex items are placed and why.",
      },
      {
        title: "CSS Grid Track Visualization",
        description:
          "See grid rows, columns, and cells rendered as an overlay with track names and sizes. Understand implicit vs explicit tracks at a glance.",
      },
      {
        title: "Gap & Spacing Inspector",
        description:
          "Highlight row-gap and column-gap values on any flex or grid container. See computed gap sizes in pixels alongside the CSS declaration.",
      },
      {
        title: "Item Placement Debugger",
        description:
          "For grid layouts, visualize grid-area assignments, span values, and placement conflicts. See which cell each item occupies in the grid.",
      },
      {
        title: "Auto-Fill/Fit Analyzer",
        description:
          "See how auto-fill and auto-fit compute their track lists. Visualize the difference between the two and understand minmax() behavior.",
      },
      {
        title: "Responsive Grid Preview",
        description:
          "Resize the viewport and watch the grid overlay update in real-time. See how your grid responds to different breakpoints without switching tools.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Flex/Grid Visualizer from the FrontendDevHelper panel or command palette. Hover over any flex or grid container to activate the overlay.",
      },
      {
        step: "02",
        title: "Inspect Layout",
        description:
          "See tracks, gaps, alignment, and item placement rendered on the page. Click any item to see its flex or grid properties in detail.",
      },
      {
        step: "03",
        title: "Debug & Fix",
        description:
          "Identify misalignment, unexpected wrapping, or track sizing issues. Copy the relevant CSS properties and suggested fixes to your clipboard.",
      },
    ],
    faq: [
      {
        question: "Does it support subgrid?",
        answer:
          "Yes. The visualizer detects subgrid usage and shows how nested grids inherit track sizing from their parent, making subgrid debugging straightforward.",
      },
      {
        question: "Can I visualize nested flex and grid containers?",
        answer:
          "Absolutely. The tool handles arbitrarily nested flex and grid layouts. Each container gets its own overlay that you can toggle independently.",
      },
      {
        question:
          "Does it work with CSS frameworks like Tailwind or Bootstrap?",
        answer:
          "Yes. The visualizer works on computed styles, so it handles utility classes, framework grids, and custom CSS equally well. It shows what the browser actually renders.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "spacing-visualizer",
      "responsive-tester",
      "css-inspector",
    ],
  },
  {
    slug: "font-inspector",
    name: "Font Inspector",
    tagline:
      "Analyze typography on any page — detect font stacks, sizes, weights, line heights, and sources.",
    description:
      "The Font Inspector is a typography analysis tool built into FrontendDevHelper that lets you hover over any text to see its complete font stack, computed size, weight, line height, letter spacing, and the actual rendered font — including whether it fell back to a system font. Perfect for design audits, performance reviews, and typography consistency checks.",
    metaTitle:
      "Font Inspector Chrome Extension — Typography Analysis Tool | FrontendDevHelper",
    metaDescription:
      "Inspect fonts on any webpage. See rendered font families, sizes, weights, line heights, and sources. Detect font loading issues and inconsistencies. Free Chrome Extension.",
    features: [
      {
        title: "Rendered Font Detection",
        description:
          "Hover over any text to see which font actually rendered — not just the CSS declaration. Detect when web fonts fail to load and the browser falls back to system fonts.",
      },
      {
        title: "Full Typography Profile",
        description:
          "See computed font-size, font-weight, line-height, letter-spacing, word-spacing, and text-transform for any text element in one clean panel.",
      },
      {
        title: "Font Stack Analyzer",
        description:
          "View the complete font-family stack for any element, showing the declared order and highlighting which font in the stack is actually being used.",
      },
      {
        title: "Page-Wide Font Audit",
        description:
          "Scan the entire page to list every unique font in use. See a summary of font families, their variants, which elements use each one, and total font file sizes.",
      },
      {
        title: "Web Font Performance Check",
        description:
          "Detect web fonts loaded via @font-face, Google Fonts, or font services. See load times, display strategies (swap, fallback, optional), and unused font variants.",
      },
      {
        title: "Copy Typography Tokens",
        description:
          "One-click copy of any element's typography properties as CSS, Tailwind classes, or design token JSON for use in your design system.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Font Inspector from the FrontendDevHelper panel or command palette (Ctrl+Shift+P).",
      },
      {
        step: "02",
        title: "Hover & Inspect",
        description:
          "Move your mouse over any text element. A tooltip shows the rendered font, size, weight, line height, and full font stack instantly.",
      },
      {
        step: "03",
        title: "Audit & Export",
        description:
          "Run a page-wide font audit to see all fonts in use, or copy individual typography tokens to your clipboard in your preferred format.",
      },
    ],
    faq: [
      {
        question: "Can it detect which Google Fonts are loaded on a page?",
        answer:
          "Yes. The Font Inspector detects all @font-face declarations including Google Fonts, Adobe Fonts, and self-hosted web fonts. It shows the declared font family, loaded variants, and whether each variant is actually used on the page.",
      },
      {
        question:
          "Does it show the difference between declared and rendered fonts?",
        answer:
          "Yes. The inspector compares the CSS font-family declaration against the browser's computed rendered font using the Document Fonts API. If a web font failed to load and the browser used a fallback, you see both the intended and actual font.",
      },
      {
        question: "Can I export a typography style guide from a page?",
        answer:
          "Yes. The page-wide font audit generates a typography style guide listing every unique font, size, weight, and line height combination used on the page. Export it as CSS custom properties, Tailwind config, or JSON design tokens.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "css-inspector",
      "element-inspector",
      "dom-inspector",
    ],
  },
  {
    slug: "responsive-tester",
    name: "Breakpoint Overlay",
    tagline:
      "View current viewport size, responsive breakpoints, and test layouts at any screen size.",
    description:
      "The Breakpoint Overlay is a responsive design testing tool built into FrontendDevHelper that displays the current viewport dimensions, highlights active CSS media query breakpoints, and lets you quickly preview your layout at common device sizes — all from a lightweight browser overlay without resizing your window.",
    metaTitle:
      "Responsive Breakpoint Tester Chrome Extension — Viewport & Media Query Tool | FrontendDevHelper",
    metaDescription:
      "Test responsive breakpoints, view viewport dimensions, and preview layouts at any screen size. Free Chrome Extension for frontend developers debugging responsive design.",
    features: [
      {
        title: "Live Viewport Dimensions",
        description:
          "See the current viewport width and height displayed as a persistent overlay. Dimensions update in real-time as you resize the browser window.",
      },
      {
        title: "Media Query Breakpoint Ruler",
        description:
          "Display a horizontal ruler showing all CSS media query breakpoints defined in your stylesheets. Active breakpoints are highlighted as the viewport changes.",
      },
      {
        title: "Device Preset Preview",
        description:
          "Quickly switch between common device presets — iPhone, iPad, Pixel, Galaxy, desktop breakpoints — without opening Chrome DevTools device mode.",
      },
      {
        title: "Breakpoint Change Detection",
        description:
          "Get a visual notification when the viewport crosses a media query boundary. See which CSS rules activated or deactivated at the current size.",
      },
      {
        title: "Min/Max Width Labels",
        description:
          "See min-width and max-width boundaries labeled directly on the breakpoint ruler. Understand whether your breakpoints use mobile-first or desktop-first strategy.",
      },
      {
        title: "CSS Container Query Support",
        description:
          "Detect and visualize @container query breakpoints alongside media query breakpoints. See container sizes and the breakpoints they define.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate Overlay",
        description:
          "Open the Breakpoint Overlay from the FrontendDevHelper panel. The viewport dimensions and breakpoint ruler appear immediately.",
      },
      {
        step: "02",
        title: "Resize & Observe",
        description:
          "Resize the browser window or pick a device preset. Watch the breakpoint ruler update in real-time to show which media queries are active.",
      },
      {
        step: "03",
        title: "Debug & Document",
        description:
          "Screenshot the overlay with active breakpoint labels, or copy the list of breakpoints as CSS custom properties for your design tokens.",
      },
    ],
    faq: [
      {
        question: "How is this different from Chrome DevTools device mode?",
        answer:
          "Chrome DevTools device mode requires opening DevTools and uses emulation. The Breakpoint Overlay is a lightweight overlay that shows viewport size and breakpoint information without opening DevTools. It also detects breakpoints from your actual CSS rather than using predefined values.",
      },
      {
        question: "Can it detect custom breakpoints from CSS frameworks?",
        answer:
          "Yes. The overlay reads all @media rules from your page stylesheets, including those from Tailwind, Bootstrap, or custom frameworks. It shows your actual breakpoint values, not hardcoded defaults.",
      },
      {
        question: "Does it support container queries?",
        answer:
          "Yes. The Breakpoint Overlay detects @container query rules and visualizes container-based breakpoints alongside traditional media query breakpoints.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "flex-grid-visualizer",
      "pixel-ruler",
      "screenshot-studio",
    ],
  },
  {
    slug: "element-inspector",
    name: "Element Inspector",
    tagline:
      "Hover tooltip showing element tag, classes, dimensions, and computed styles at a glance.",
    description:
      "The Element Inspector is a quick-lookup tool built into FrontendDevHelper that shows a compact tooltip on hover with the element tag name, class list, ID, pixel dimensions, and key computed styles — giving you the essential information you need without opening DevTools.",
    metaTitle:
      "Element Inspector Chrome Extension — Quick Element Info Tooltip | FrontendDevHelper",
    metaDescription:
      "Inspect any element instantly with a hover tooltip showing tag, classes, dimensions, and computed styles. Lightweight alternative to DevTools. Free Chrome Extension.",
    features: [
      {
        title: "Instant Hover Tooltip",
        description:
          "Hover over any element to see a compact tooltip with tag name, classes, ID, and pixel dimensions. No click required — information appears as you move your mouse.",
      },
      {
        title: "Computed Style Summary",
        description:
          "See key computed properties at a glance: display, position, color, background, font-size, and z-index. Enough context to understand the element without deep inspection.",
      },
      {
        title: "Dimension Overlay",
        description:
          "Every hovered element gets a precise outline with width and height labels. See content, padding, and border dimensions broken down in the tooltip.",
      },
      {
        title: "Selector Path",
        description:
          "View the CSS selector path from the root element to the hovered target. Copy the full selector with one click for use in stylesheets or end-to-end tests.",
      },
      {
        title: "Parent Chain Navigation",
        description:
          "Navigate up the DOM tree from any element using keyboard shortcuts. Each parent shows its own tooltip with tag, classes, and dimensions.",
      },
      {
        title: "Quick Copy Actions",
        description:
          "Copy the element's selector, HTML snippet, or computed styles to clipboard with keyboard shortcuts — no right-click context menu needed.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Element Inspector from the FrontendDevHelper popup, command palette, or context menu.",
      },
      {
        step: "02",
        title: "Hover & See",
        description:
          "Move your mouse over any element. A tooltip instantly appears with tag, classes, dimensions, and key styles. The element is outlined on the page.",
      },
      {
        step: "03",
        title: "Copy & Go",
        description:
          "Press a keyboard shortcut to copy the selector, HTML, or styles. Press Escape to deactivate and return to normal browsing.",
      },
    ],
    faq: [
      {
        question: "How is this different from the full DOM Inspector tool?",
        answer:
          "The Element Inspector is designed for quick lookups — a lightweight hover tooltip for when you just need to know what an element is. The DOM Inspector provides a full tree navigation panel, component detection, and deep analysis. Use the Element Inspector for speed, the DOM Inspector for depth.",
      },
      {
        question: "Does it slow down the page when active?",
        answer:
          "No. The Element Inspector uses lightweight DOM queries that only activate on mouse movement. It has negligible performance impact even on complex pages with thousands of elements.",
      },
      {
        question: "Can I pin the tooltip on a specific element?",
        answer:
          "Yes. Click on any element to pin the tooltip in place. This lets you inspect the element's properties while scrolling or interacting with other parts of the page.",
      },
    ],
    relatedTools: [
      "dom-inspector",
      "css-debugger",
      "css-inspector",
      "smart-picker",
    ],
  },
  {
    slug: "contrast-checker",
    name: "Contrast Checker",
    tagline:
      "WCAG AA/AAA color contrast analysis — detect accessibility issues in text/background pairs.",
    description:
      "The Contrast Checker is a dedicated accessibility tool built into FrontendDevHelper that scans every visible text element on the page, computes foreground/background contrast ratios, and flags WCAG AA and AAA violations with on-page highlights — making color accessibility compliance fast and visual.",
    metaTitle:
      "Contrast Checker Chrome Extension — WCAG Color Accessibility Tool | FrontendDevHelper",
    metaDescription:
      "Check color contrast ratios against WCAG AA and AAA standards. Detect accessibility issues in text and background color pairs instantly. Free Chrome Extension.",
    features: [
      {
        title: "Page-Wide Contrast Scan",
        description:
          "One-click scan of every visible text element on the page. Each element is highlighted green (pass) or red (fail) based on its contrast ratio.",
      },
      {
        title: "WCAG AA & AAA Ratings",
        description:
          "See exact contrast ratios with pass/fail indicators for both WCAG 2.1 AA (4.5:1 normal text, 3:1 large text) and AAA (7:1 normal, 4.5:1 large) thresholds.",
      },
      {
        title: "Fix Suggestions",
        description:
          "For every failing element, get suggested foreground or background color adjustments that meet the minimum contrast requirement with minimal visual change.",
      },
      {
        title: "Large Text Detection",
        description:
          "Automatically detect large text (18pt+ or 14pt+ bold) and apply the appropriate WCAG threshold. No manual classification needed.",
      },
      {
        title: "Gradient & Image Background Support",
        description:
          "Handle complex backgrounds including CSS gradients, background images, and semi-transparent overlays. Sample the actual rendered pixel color for accurate ratios.",
      },
      {
        title: "Contrast Ratio Heatmap",
        description:
          "Toggle a heatmap view that color-codes every text element by its contrast ratio. Quickly spot clusters of low-contrast text that need attention.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Run Scan",
        description:
          "Click the Contrast Checker in the FrontendDevHelper panel. It scans all visible text elements and computes contrast ratios locally.",
      },
      {
        step: "02",
        title: "Review Results",
        description:
          "Failing elements are highlighted with red overlays showing the exact ratio. Passing elements get a green indicator. Toggle the heatmap for a broader view.",
      },
      {
        step: "03",
        title: "Fix & Recheck",
        description:
          "Click any failing element to see suggested color adjustments. Apply fixes in your code and re-scan to verify compliance instantly.",
      },
    ],
    faq: [
      {
        question: "How does it handle text over background images?",
        answer:
          "The Contrast Checker samples the actual rendered pixels behind each text element using canvas-based color sampling. This produces accurate contrast ratios even when the background is a gradient, image, or has semi-transparent overlays.",
      },
      {
        question: "Does it check contrast for hover and focus states?",
        answer:
          "Yes. You can trigger hover and focus states on interactive elements and re-run the contrast scan to verify that text remains readable in all states — essential for button and link accessibility.",
      },
      {
        question: "Can I export a contrast report?",
        answer:
          "Yes. Export a full report listing every text element, its foreground/background colors, contrast ratio, WCAG level, and pass/fail status. Share it with designers or compliance teams.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "css-debugger",
      "color-picker",
      "element-inspector",
    ],
  },
  {
    slug: "tech-detector",
    name: "Tech Detector",
    tagline:
      "Detect frameworks, libraries, CSS frameworks, and build tools running on any webpage.",
    description:
      "The Tech Detector is a technology identification tool built into FrontendDevHelper that analyzes any webpage to detect which JavaScript frameworks, UI libraries, CSS frameworks, build tools, analytics services, and CMS platforms are in use — providing a comprehensive technology profile at a glance.",
    metaTitle:
      "Tech Detector Chrome Extension — Identify Frameworks & Libraries | FrontendDevHelper",
    metaDescription:
      "Detect React, Vue, Angular, Svelte, Tailwind, Bootstrap, and 100+ other technologies on any webpage. Free Chrome Extension for frontend developers and tech analysts.",
    features: [
      {
        title: "Framework Detection",
        description:
          "Identify JavaScript frameworks including React, Vue, Angular, Svelte, Solid, Preact, Qwik, Next.js, Nuxt, and more — with version numbers when available.",
      },
      {
        title: "CSS Framework Scanner",
        description:
          "Detect CSS frameworks and methodologies: Tailwind CSS, Bootstrap, Material UI, Chakra UI, Emotion, Styled Components, CSS Modules, and others.",
      },
      {
        title: "Build Tool Identification",
        description:
          "Detect build tools and bundlers in use: Vite, Webpack, Rollup, esbuild, Parcel, Turbo, and more based on bundle signatures and meta tags.",
      },
      {
        title: "Analytics & Tracking",
        description:
          "Identify analytics scripts, tag managers, and tracking pixels: Google Analytics, Tag Manager, Facebook Pixel, Hotjar, Mixpanel, Segment, and others.",
      },
      {
        title: "CMS & Hosting Detection",
        description:
          "Detect the underlying CMS (WordPress, Shopify, Contentful, Sanity) and hosting platform (Vercel, Netlify, Cloudflare) from HTTP headers and page signatures.",
      },
      {
        title: "Technology Scorecard",
        description:
          "Get a technology scorecard showing the modernity and complexity of the page's tech stack. See how many frameworks, libraries, and services are loaded.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Tech Detector from the FrontendDevHelper panel or command palette. It begins analyzing the current page immediately.",
      },
      {
        step: "02",
        title: "Review Stack",
        description:
          "See a categorized list of all detected technologies: frameworks, libraries, CSS tools, analytics, and infrastructure. Each detection includes a confidence score.",
      },
      {
        step: "03",
        title: "Export & Share",
        description:
          "Copy the technology profile as a formatted report, or export it as JSON for integration with tech stack documentation or competitive analysis.",
      },
    ],
    faq: [
      {
        question: "How accurate is the technology detection?",
        answer:
          "The Tech Detector uses multiple detection strategies — DOM inspection, global variable checks, script source analysis, meta tags, and HTTP headers — to provide high-confidence detections. Each result includes a confidence percentage so you know how reliable the detection is.",
      },
      {
        question: "Can it detect technologies on any website?",
        answer:
          "It works on any page your browser can render. Some heavily obfuscated or server-side rendered applications may limit detection accuracy, but the tool still identifies most major frameworks and libraries.",
      },
      {
        question: "Does it work on single-page applications?",
        answer:
          "Yes. For SPAs, the Tech Detector re-scans after the JavaScript has hydrated the page, ensuring it detects client-side frameworks and libraries that are not present in the initial HTML.",
      },
    ],
    relatedTools: [
      "dom-inspector",
      "component-tree",
      "network-analyzer",
      "css-debugger",
    ],
  },
  {
    slug: "accessibility-audit",
    name: "Accessibility Audit",
    tagline:
      "Full WCAG validator, ARIA checker, and comprehensive accessibility auditing in one click.",
    description:
      "The Accessibility Audit is a comprehensive compliance tool built into FrontendDevHelper that goes beyond quick scans to deliver a full WCAG 2.1 validation, ARIA attribute checking, form label verification, heading hierarchy analysis, and keyboard navigation testing — producing a detailed audit report you can share with stakeholders.",
    metaTitle:
      "Accessibility Audit Chrome Extension — Full WCAG Validator | FrontendDevHelper",
    metaDescription:
      "Run a full WCAG accessibility audit with ARIA checking, heading hierarchy, form validation, and keyboard navigation testing. Free Chrome Extension for compliance teams.",
    features: [
      {
        title: "WCAG 2.1 Full Validation",
        description:
          "Comprehensive scan against WCAG 2.1 success criteria across all three levels (A, AA, AAA). Results grouped by principle: perceivable, operable, understandable, and robust.",
      },
      {
        title: "ARIA Attribute Checker",
        description:
          "Validate every ARIA role, property, and state on the page. Detect missing labels, invalid role combinations, redundant semantics, and misconfigured live regions.",
      },
      {
        title: "Form Accessibility Validator",
        description:
          "Check every form control for associated labels, proper input types, required field indicators, error message associations, and autocomplete attributes.",
      },
      {
        title: "Heading Hierarchy Analyzer",
        description:
          "Map the complete heading structure (h1-h6) as an interactive tree. Detect skipped levels, multiple h1 tags, empty headings, and illogical nesting.",
      },
      {
        title: "Keyboard Navigation Audit",
        description:
          "Trace the full tab order and identify focus traps, unreachable interactive elements, missing skip links, and incorrect tab indexing across the page.",
      },
      {
        title: "Audit Report Generator",
        description:
          "Generate a detailed audit report with issue counts by severity, WCAG criterion references, element selectors, and actionable fix suggestions. Export as HTML, PDF, or JSON.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Run Full Audit",
        description:
          "Click the Accessibility Audit in the FrontendDevHelper panel. The tool scans the complete DOM tree and all accessibility-related properties.",
      },
      {
        step: "02",
        title: "Review by Category",
        description:
          "Results are organized by WCAG principle and severity. Drill into each category to see individual issues with element highlights and criterion references.",
      },
      {
        step: "03",
        title: "Export & Remediate",
        description:
          "Export the full audit report for your team. Each issue includes a suggested fix. Re-run the audit after remediation to track your compliance progress.",
      },
    ],
    faq: [
      {
        question: "How is this different from the Accessibility Checker tool?",
        answer:
          "The Accessibility Checker provides quick, interactive on-page overlays for live debugging. The Accessibility Audit delivers a comprehensive, formal audit report covering more WCAG criteria with severity ratings and export capabilities. Use the Checker during development and the Audit for formal compliance reviews.",
      },
      {
        question: "Does it check for Section 508 and EN 301 549 compliance?",
        answer:
          "Yes. Since Section 508 and EN 301 549 both reference WCAG 2.1 Level AA, the audit covers the relevant criteria. The report maps issues to the applicable standard for your documentation.",
      },
      {
        question: "Can I schedule recurring audits?",
        answer:
          "The audit runs on-demand from the extension. For automated recurring audits, you can integrate with CI/CD pipelines using the exported JSON report format alongside tools like axe-core or Pa11y.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "contrast-checker",
      "focus-debugger",
      "form-debugger",
    ],
  },
  {
    slug: "network-analyzer",
    name: "Network Analyzer",
    tagline:
      "Monitor network requests, analyze load times, and detect slow resources on any page.",
    description:
      "The Network Analyzer is a network performance tool built into FrontendDevHelper that monitors all HTTP requests made by the page, visualizes load times in a waterfall chart, identifies slow resources, and highlights performance anti-patterns — all from a browser extension overlay without opening DevTools.",
    metaTitle:
      "Network Analyzer Chrome Extension — Request Monitor & Load Time Tool | FrontendDevHelper",
    metaDescription:
      "Monitor network requests, analyze resource load times, and detect slow assets with the Network Analyzer Chrome Extension. Visual waterfall chart and performance insights. Free.",
    features: [
      {
        title: "Live Request Monitor",
        description:
          "See all network requests in real-time as the page loads and during interaction. Filter by type: documents, scripts, stylesheets, images, fonts, XHR, and fetch.",
      },
      {
        title: "Waterfall Chart",
        description:
          "Visualize request timing as a waterfall chart showing DNS lookup, connection, TLS handshake, waiting (TTFB), and download phases for each resource.",
      },
      {
        title: "Slow Resource Detector",
        description:
          "Automatically flag resources that exceed configurable time thresholds. See the slowest requests ranked by total load time with suggestions for optimization.",
      },
      {
        title: "Payload Size Analysis",
        description:
          "See transfer size vs. decoded size for every resource. Identify uncompressed assets, oversized images, and bloated JavaScript bundles that increase page weight.",
      },
      {
        title: "Request Blocking Simulator",
        description:
          "Temporarily block specific requests or domains to test how their removal affects page load and functionality — useful for evaluating third-party script impact.",
      },
      {
        title: "Caching Audit",
        description:
          "Check cache headers on every response. Identify resources missing proper cache-control, ETag, or last-modified headers that could be cached but are not.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Start Monitoring",
        description:
          "Open the Network Analyzer from the FrontendDevHelper panel. It begins capturing network activity using the browser Performance and Network APIs.",
      },
      {
        step: "02",
        title: "Analyze Requests",
        description:
          "Browse the waterfall chart, filter by resource type, and sort by load time. Slow resources are highlighted with performance suggestions.",
      },
      {
        step: "03",
        title: "Optimize & Verify",
        description:
          "Use the request blocking simulator to test optimizations. Export the network profile to share with backend teams or include in performance reports.",
      },
    ],
    faq: [
      {
        question: "How is this different from Chrome DevTools Network tab?",
        answer:
          "The Network Analyzer provides a more focused, opinionated view. It highlights performance problems automatically, suggests optimizations, and includes a request blocking simulator that DevTools does not have. It is designed for quick performance assessments rather than deep network debugging.",
      },
      {
        question: "Does it capture XHR and Fetch API requests?",
        answer:
          "Yes. All XMLHttpRequest and Fetch API calls are captured, including those made by frameworks and third-party scripts. You see the full URL, method, status, timing, and response size.",
      },
      {
        question: "Can I analyze third-party script impact?",
        answer:
          "Yes. Use the request blocking simulator to selectively block third-party domains and measure the impact on page load time. This helps you make data-driven decisions about which third-party scripts to keep or remove.",
      },
    ],
    relatedTools: [
      "performance-profiler",
      "css-scanner",
      "storage-inspector",
      "flame-graph",
    ],
  },
  {
    slug: "component-tree",
    name: "Component Tree",
    tagline:
      "Visualize React, Vue, Angular, and Svelte component hierarchies in an interactive tree view.",
    description:
      "The Component Tree is a framework-aware debugging tool built into FrontendDevHelper that detects your frontend framework and renders an interactive component hierarchy — showing component names, props, state, and nesting relationships in a collapsible tree view that makes complex applications easy to navigate.",
    metaTitle:
      "Component Tree Chrome Extension — React, Vue, Angular Component Viewer | FrontendDevHelper",
    metaDescription:
      "Visualize component hierarchies for React, Vue, Angular, and Svelte apps. See component names, props, and state in an interactive tree. Free Chrome Extension.",
    features: [
      {
        title: "Framework Auto-Detection",
        description:
          "Automatically detect React, Vue, Angular, or Svelte and use framework-specific APIs to build the component tree. No configuration required.",
      },
      {
        title: "Interactive Component Hierarchy",
        description:
          "Browse the full component tree in a collapsible sidebar. Expand and collapse nodes, search by component name, and click to highlight the component on the page.",
      },
      {
        title: "Props & State Inspector",
        description:
          "Select any component node to see its current props, state (React), data (Vue), or store bindings. Values are displayed in a readable, expandable format.",
      },
      {
        title: "Component Highlight Overlay",
        description:
          "Click a component in the tree to outline its rendered DOM on the page with a labeled border. See exactly which part of the UI each component renders.",
      },
      {
        title: "Re-render Tracker",
        description:
          "Track which components re-render when you interact with the page. See render counts and identify unnecessary re-renders that hurt performance.",
      },
      {
        title: "Source File Locator",
        description:
          "When source maps are available, see the file path and line number where each component is defined. Jump directly to the source code in your editor.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Open Component Tree",
        description:
          "Launch the Component Tree from the FrontendDevHelper panel. It auto-detects the framework and begins building the hierarchy.",
      },
      {
        step: "02",
        title: "Explore Hierarchy",
        description:
          "Browse the collapsible tree in the sidebar. Click any component to see its props, state, and rendered DOM boundary on the page.",
      },
      {
        step: "03",
        title: "Debug & Profile",
        description:
          "Enable the re-render tracker to see which components update on interaction. Identify performance bottlenecks in your component tree.",
      },
    ],
    faq: [
      {
        question: "Does it work with React, Vue, Angular, and Svelte?",
        answer:
          "Yes. The Component Tree auto-detects the framework and uses framework-specific internals to build the tree. It supports React (fiber), Vue (component instances), Angular (component refs), and Svelte (component boundaries).",
      },
      {
        question: "Can I see component state and props in real-time?",
        answer:
          "Yes. When you select a component in the tree, the inspector shows its current props and state (or data for Vue). Values update in real-time as you interact with the application.",
      },
      {
        question: "Does it work in production builds?",
        answer:
          "Limited. Production builds often strip component names and state inspection hooks. The Component Tree works best in development mode, but can still show the DOM hierarchy and detect the framework in production.",
      },
    ],
    relatedTools: [
      "dom-inspector",
      "tech-detector",
      "element-inspector",
      "performance-profiler",
    ],
  },
  {
    slug: "flame-graph",
    name: "Performance Flame Graph",
    tagline:
      "JavaScript execution profiling with flame graphs to identify performance bottlenecks.",
    description:
      "The Performance Flame Graph is a profiling tool built into FrontendDevHelper that captures JavaScript execution activity and renders it as an interactive flame graph — making it easy to identify long tasks, expensive functions, and main-thread bottlenecks that hurt your page's responsiveness.",
    metaTitle:
      "Performance Flame Graph Chrome Extension — JS Profiling Tool | FrontendDevHelper",
    metaDescription:
      "Profile JavaScript execution with interactive flame graphs. Identify performance bottlenecks, long tasks, and expensive functions. Free Chrome Extension for developers.",
    features: [
      {
        title: "Interactive Flame Graph",
        description:
          "Visualize JavaScript call stacks as a color-coded flame graph. Click to zoom into specific functions, hover to see execution time, and navigate the call hierarchy.",
      },
      {
        title: "Long Task Detection",
        description:
          "Automatically flag tasks that exceed 50ms — the threshold where users perceive lag. See which functions contribute to each long task and how much time they consume.",
      },
      {
        title: "Hot Function Highlighting",
        description:
          "The most frequently called and longest-running functions are highlighted with warm colors. Quickly identify the hottest code paths that need optimization.",
      },
      {
        title: "Rendering Activity Overlay",
        description:
          "See style recalculation, layout, paint, and composite phases alongside JavaScript execution. Understand when JS triggers expensive rendering operations.",
      },
      {
        title: "Comparison Mode",
        description:
          "Record two flame graphs and compare them side-by-side. Measure the impact of code changes, library upgrades, or optimization experiments.",
      },
      {
        title: "Export & Share",
        description:
          "Export the flame graph as an SVG image or JSON data. Share performance profiles with your team or attach them to issue trackers.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Start Profiling",
        description:
          "Open the Performance Flame Graph from the FrontendDevHelper panel. Click Start Recording to begin capturing JavaScript execution data.",
      },
      {
        step: "02",
        title: "Interact with Page",
        description:
          "Use the page normally — click, scroll, type, navigate. The profiler records all JavaScript activity, including event handlers, timers, and network callbacks.",
      },
      {
        step: "03",
        title: "Analyze Flame Graph",
        description:
          "Stop recording and explore the interactive flame graph. Click to zoom into hot functions, see execution times, and identify optimization opportunities.",
      },
    ],
    faq: [
      {
        question: "Does profiling slow down the page?",
        answer:
          "Profiling adds some overhead during the recording phase, which is unavoidable for any profiler. The Performance Flame Graph uses the browser's native Sampling Profiler API to minimize impact. Always profile in development or staging, not in production.",
      },
      {
        question: "Can I profile specific interactions?",
        answer:
          "Yes. Start recording just before the interaction you want to profile (e.g., clicking a button, opening a modal) and stop immediately after. This gives you a focused flame graph of just that interaction.",
      },
      {
        question: "Does it show anonymous and arrow functions?",
        answer:
          "Yes. The flame graph captures the full call stack including anonymous functions, arrow functions, and callbacks. When source maps are available, it shows the original function names from your source code.",
      },
    ],
    relatedTools: [
      "performance-profiler",
      "network-analyzer",
      "component-tree",
      "css-scanner",
    ],
  },
  {
    slug: "storage-inspector",
    name: "Storage Inspector",
    tagline:
      "Debug LocalStorage, SessionStorage, IndexedDB, Cookies, and Cache API in one panel.",
    description:
      "The Storage Inspector is a browser storage debugging tool built into FrontendDevHelper that provides a unified interface for viewing, searching, editing, and clearing data across LocalStorage, SessionStorage, IndexedDB, Cookies, and the Cache API — replacing the need to switch between multiple DevTools tabs.",
    metaTitle:
      "Storage Inspector Chrome Extension — LocalStorage, IndexedDB, Cookie Tool | FrontendDevHelper",
    metaDescription:
      "Debug browser storage in one panel. View, search, edit, and clear LocalStorage, SessionStorage, IndexedDB, Cookies, and Cache API. Free Chrome Extension.",
    features: [
      {
        title: "Unified Storage Dashboard",
        description:
          "See all storage mechanisms in one panel: LocalStorage, SessionStorage, IndexedDB databases, Cookies, and Cache API entries. No more switching between DevTools tabs.",
      },
      {
        title: "Search Across All Storage",
        description:
          "Search for keys, values, or fragments across all storage types simultaneously. Find that one cookie or LocalStorage entry without checking each store individually.",
      },
      {
        title: "Inline Editing",
        description:
          "Double-click any value to edit it inline. Add, modify, or delete entries across all storage types without writing console commands.",
      },
      {
        title: "Storage Usage Meter",
        description:
          "See how much storage each mechanism is using and how close you are to browser quotas. Get warnings before you hit storage limits.",
      },
      {
        title: "Cookie Inspector",
        description:
          "View all cookies with their attributes: value, domain, path, expiry, HttpOnly, Secure, SameSite. Edit or delete cookies with a visual interface.",
      },
      {
        title: "Export & Import",
        description:
          "Export storage snapshots as JSON for debugging or backup. Import storage data to set up test scenarios or reproduce bugs with specific storage states.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Open Storage Inspector",
        description:
          "Launch the Storage Inspector from the FrontendDevHelper panel or command palette. The unified dashboard loads all storage data for the current origin.",
      },
      {
        step: "02",
        title: "Browse & Search",
        description:
          "Navigate between storage types in the sidebar. Use the search bar to find specific entries across all storage mechanisms.",
      },
      {
        step: "03",
        title: "Edit & Debug",
        description:
          "Double-click to edit values, add new entries, or clear storage. Export a snapshot to share with your team or import one to reproduce a bug.",
      },
    ],
    faq: [
      {
        question: "Can I inspect third-party cookies?",
        answer:
          "The Storage Inspector shows cookies for the current page origin. Third-party cookies set by embedded iframes may be limited by browser privacy controls and SameSite policies, but all accessible cookies are displayed.",
      },
      {
        question: "Does it support IndexedDB object stores?",
        answer:
          "Yes. The inspector browses all IndexedDB databases, their object stores, indexes, and records. You can view, search, add, and delete records in any object store.",
      },
      {
        question: "Can I clear all storage at once?",
        answer:
          "Yes. There is a Clear All button that wipes LocalStorage, SessionStorage, IndexedDB databases, and Cache API entries for the current origin in one action.",
      },
    ],
    relatedTools: [
      "network-analyzer",
      "dom-inspector",
      "css-debugger",
      "element-inspector",
    ],
  },
  {
    slug: "focus-debugger",
    name: "Focus Debugger",
    tagline:
      "Visualize tab focus order, detect focus traps, and debug keyboard navigation issues.",
    description:
      "The Focus Debugger is a keyboard accessibility tool built into FrontendDevHelper that visualizes the tab order on the page, highlights focus traps, detects unreachable interactive elements, and shows tabindex issues — making keyboard navigation debugging visual and intuitive.",
    metaTitle:
      "Focus Debugger Chrome Extension — Keyboard Navigation & Tab Order Tool | FrontendDevHelper",
    metaDescription:
      "Visualize tab focus order, detect focus traps, and fix keyboard navigation issues. WCAG keyboard accessibility debugging tool. Free Chrome Extension.",
    features: [
      {
        title: "Tab Order Visualization",
        description:
          "Press Tab and see numbered badges appear on each focusable element showing the exact tab sequence. The focus path is drawn as a connecting line on the page.",
      },
      {
        title: "Focus Trap Detection",
        description:
          "Automatically detect when focus gets stuck in a loop and cannot escape a component — common in modals, dialogs, and custom dropdown menus.",
      },
      {
        title: "Unreachable Element Finder",
        description:
          "Identify interactive elements (buttons, links, inputs) that cannot be reached by keyboard navigation. These are flagged as accessibility violations.",
      },
      {
        title: "Tabindex Audit",
        description:
          "Scan the page for positive tabindex values that disrupt the natural tab order. See which elements have custom tabindex and whether it improves or harms navigation.",
      },
      {
        title: "Skip Link Validator",
        description:
          "Check for skip navigation links and verify they work correctly. Ensure keyboard-only users can bypass repetitive navigation blocks.",
      },
      {
        title: "Focus Ring Inspector",
        description:
          "Highlight all elements that receive visible focus rings and flag interactive elements with missing or invisible focus indicators.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate Debugger",
        description:
          "Open the Focus Debugger from the FrontendDevHelper panel or command palette. It prepares to track keyboard focus on the current page.",
      },
      {
        step: "02",
        title: "Tab Through Page",
        description:
          "Press Tab to move through the page. Each focused element gets a numbered badge. The focus path is drawn as a line. Watch for traps or unexpected jumps.",
      },
      {
        step: "03",
        title: "Review Issues",
        description:
          "The debugger lists all detected issues: focus traps, unreachable elements, tabindex problems, and missing focus indicators. Click any issue to highlight the element.",
      },
    ],
    faq: [
      {
        question:
          "Does it work with dynamic content like modals and dropdowns?",
        answer:
          "Yes. The Focus Debugger tracks focus changes in real-time, including focus moved by JavaScript (e.g., when a modal opens and traps focus). It detects whether focus management is correct in these dynamic scenarios.",
      },
      {
        question: "Can it test roving tabindex patterns?",
        answer:
          "Yes. The debugger recognizes roving tabindex patterns used in toolbar, menu, and tab panel widgets. It shows the current focus position within the roving group and whether arrow key navigation works correctly.",
      },
      {
        question: "Does it check focus management in single-page applications?",
        answer:
          "Yes. For SPAs, the Focus Debugger monitors route changes and checks whether focus is moved to the new content area or skip link. It flags pages where route changes do not manage focus, a common accessibility issue in SPAs.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "accessibility-audit",
      "element-inspector",
      "form-debugger",
    ],
  },
  {
    slug: "form-debugger",
    name: "Form Debugger",
    tagline:
      "Debug form validation, detect missing labels, and fix broken autofill patterns.",
    description:
      "The Form Debugger is a form analysis tool built into FrontendDevHelper that scans every form on the page to detect missing labels, broken autofill attributes, validation issues, inaccessible error messages, and submission problems — making form debugging fast and comprehensive.",
    metaTitle:
      "Form Debugger Chrome Extension — Form Validation & Accessibility Tool | FrontendDevHelper",
    metaDescription:
      "Debug HTML forms, detect missing labels, fix autofill patterns, and validate form accessibility. Free Chrome Extension for frontend developers.",
    features: [
      {
        title: "Label Association Checker",
        description:
          "Verify that every form control has an associated label element or aria-label attribute. Detect orphaned inputs, mismatched for attributes, and implicit label issues.",
      },
      {
        title: "Autofill Analyzer",
        description:
          "Scan autocomplete attributes on all form fields. Detect missing, incorrect, or non-standard autocomplete values that break browser autofill and password managers.",
      },
      {
        title: "Validation Rule Inspector",
        description:
          "See HTML5 validation attributes (required, pattern, minlength, maxlength, min, max, type) for every field. Identify missing validation that could allow bad data.",
      },
      {
        title: "Error Message Audit",
        description:
          "Check whether each form field has an associated error message container using aria-describedby or aria-errormessage. Detect inline errors that are not announced to screen readers.",
      },
      {
        title: "Form Submission Monitor",
        description:
          "Monitor form submissions to see submitted data, validation errors, and response handling. Debug submit handlers, fetch calls, and redirect behavior.",
      },
      {
        title: "Multi-Step Form Navigator",
        description:
          "For multi-step forms, verify that each step validates correctly, focus moves to the first error, and the user can navigate back without losing data.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Scan Forms",
        description:
          "Open the Form Debugger from the FrontendDevHelper panel. It scans all form elements on the page and lists detected issues.",
      },
      {
        step: "02",
        title: "Review Issues",
        description:
          "Issues are categorized: missing labels, autofill problems, validation gaps, and accessibility violations. Click any issue to highlight the field on the page.",
      },
      {
        step: "03",
        title: "Fix & Test",
        description:
          "Use the validation inspector to test form behavior. Submit the form while the debugger monitors for errors, network requests, and response handling.",
      },
    ],
    faq: [
      {
        question:
          "Does it work with React Hook Form, Formik, or other form libraries?",
        answer:
          "Yes. The Form Debugger inspects the actual DOM and form elements regardless of which library manages them. It checks the rendered HTML attributes and accessibility properties that all form libraries ultimately produce.",
      },
      {
        question: "Can it test custom validation logic?",
        answer:
          "The debugger monitors form submission events and tracks custom validation results. It shows whether custom error messages are properly associated with their fields using ARIA attributes.",
      },
      {
        question: "Does it detect reCAPTCHA and honeypot fields?",
        answer:
          "Yes. The debugger identifies common anti-spam patterns including honeypot fields (hidden inputs) and third-party CAPTCHA integrations, and verifies they are properly hidden from assistive technology.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "accessibility-audit",
      "focus-debugger",
      "element-inspector",
    ],
  },
  {
    slug: "visual-regression",
    name: "Visual Regression Testing",
    tagline:
      "Screenshot comparison to detect visual changes between page states and deployments.",
    description:
      "The Visual Regression Testing tool is a pixel-level comparison tool built into FrontendDevHelper that captures screenshots at different page states and compares them to detect unintended visual changes — helping you catch CSS regressions, layout shifts, and broken designs before they reach production.",
    metaTitle:
      "Visual Regression Testing Chrome Extension — Screenshot Diff Tool | FrontendDevHelper",
    metaDescription:
      "Compare screenshots to detect visual changes between page states. Pixel-level diff for catching CSS regressions and layout bugs. Free Chrome Extension.",
    features: [
      {
        title: "Baseline Capture",
        description:
          "Capture a screenshot of the current page state as a baseline. Save multiple baselines for different pages, viewports, or application states.",
      },
      {
        title: "Pixel-Level Diff",
        description:
          "Compare the current page against a saved baseline with pixel-level accuracy. Differences are highlighted in a color-coded overlay showing added, removed, and changed pixels.",
      },
      {
        title: "Threshold Configuration",
        description:
          "Set comparison sensitivity thresholds to ignore anti-aliasing differences, font rendering variations, or dynamic content. Focus on meaningful visual changes.",
      },
      {
        title: "Viewport Comparison",
        description:
          "Capture and compare screenshots at multiple viewport sizes simultaneously. Catch responsive layout regressions across mobile, tablet, and desktop breakpoints.",
      },
      {
        title: "Element-Level Diff",
        description:
          "Select a specific element to compare instead of the full page. Useful for tracking visual changes in individual components, cards, or widgets.",
      },
      {
        title: "Diff Report Export",
        description:
          "Export a side-by-side diff report with highlighted changes, diff percentage, and the baseline and current screenshots. Attach to pull requests or issue tickets.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Capture Baseline",
        description:
          "Navigate to the page you want to track. Click Capture Baseline to save the current screenshot as the reference state.",
      },
      {
        step: "02",
        title: "Make Changes",
        description:
          "Update your CSS, components, or content. Navigate back to the page and click Compare to run the diff against the baseline.",
      },
      {
        step: "03",
        title: "Review Diff",
        description:
          "See the pixel-level diff overlay with changes highlighted. Accept or reject changes, and export the diff report for your team.",
      },
    ],
    faq: [
      {
        question:
          "How does this differ from automated visual regression tools like Percy or Chromatic?",
        answer:
          "Those tools run in CI/CD pipelines. The Visual Regression Testing extension runs locally in your browser, making it ideal for quick manual checks during development. Use it as a fast feedback loop before committing, and use CI tools for automated regression testing.",
      },
      {
        question: "Can I compare across different URLs?",
        answer:
          "Yes. You can capture a baseline on one URL (e.g., staging) and compare it against another URL (e.g., production). This is useful for deployment verification.",
      },
      {
        question:
          "Does it handle dynamic content like timestamps and random data?",
        answer:
          "You can configure ignore regions to mask out areas with dynamic content. The comparison will skip those regions and only diff the stable parts of the page.",
      },
    ],
    relatedTools: [
      "screenshot-studio",
      "css-debugger",
      "responsive-tester",
      "css-scanner",
    ],
  },
  {
    slug: "command-palette",
    name: "Command Palette",
    tagline:
      "VS Code-style quick access to all tools with keyboard shortcuts (Ctrl+Shift+P).",
    description:
      "The Command Palette is a productivity tool built into FrontendDevHelper that provides a VS Code-style search interface activated with Ctrl+Shift+P, giving you instant keyboard access to all the tools, settings, and actions — keeping your hands on the keyboard and your workflow uninterrupted.",
    metaTitle:
      "Command Palette Chrome Extension — VS Code-Style Quick Access | FrontendDevHelper",
    metaDescription:
      "Access all developer tools instantly with a VS Code-style command palette. Ctrl+Shift+P to search and run any tool. Free Chrome Extension for power users.",
    features: [
      {
        title: "Instant Activation",
        description:
          "Press Ctrl+Shift+P (or Cmd+Shift+P on Mac) to open the command palette from any page. Start typing to search — no mouse needed.",
      },
      {
        title: "Fuzzy Search",
        description:
          'Search tool names, descriptions, and keywords with fuzzy matching. Type "css" to find the CSS Debugger, CSS Inspector, and CSS Scanner instantly.',
      },
      {
        title: "Tool Quick Launch",
        description:
          "Every FrontendDevHelper tool is available from the command palette. Activate any tool with a few keystrokes — faster than navigating the popup.",
      },
      {
        title: "Keyboard Shortcuts",
        description:
          "Assign custom keyboard shortcuts to your most-used tools. Override default shortcuts or add new ones to match your muscle memory.",
      },
      {
        title: "Recent Commands",
        description:
          "The palette remembers your most recently used commands. Access your top tools with zero typing — just open and press Enter.",
      },
      {
        title: "Action History",
        description:
          "Browse a history of actions taken through the command palette. Re-run previous commands or review what tools you used during a debugging session.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Open Palette",
        description:
          "Press Ctrl+Shift+P (Cmd+Shift+P on Mac) anywhere on the page. The command palette opens as an overlay centered on screen.",
      },
      {
        step: "02",
        title: "Search & Select",
        description:
          "Type to search tools and actions. Use arrow keys to navigate results. Press Enter to activate the selected tool.",
      },
      {
        step: "03",
        title: "Customize",
        description:
          "Open Settings from the palette to assign custom keyboard shortcuts and configure your preferred tool launch behavior.",
      },
    ],
    faq: [
      {
        question: "Does the keyboard shortcut conflict with other extensions?",
        answer:
          "The default Ctrl+Shift+P shortcut can be customized in the extension settings. If it conflicts with another extension or DevTools, you can reassign it to any key combination you prefer.",
      },
      {
        question: "Can I access extension settings from the command palette?",
        answer:
          'Yes. The command palette includes access to all extension settings, tool configurations, and preferences. Search for "settings" or "config" to find them.',
      },
      {
        question: "Does it work when DevTools is open?",
        answer:
          "Yes. The command palette works independently of DevTools. It can be activated whether DevTools is open or closed, and it runs as a page overlay rather than inside the DevTools panel.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "dom-inspector",
      "element-inspector",
      "smart-picker",
    ],
  },
  {
    slug: "ai-suggestions",
    name: "AI Suggestions",
    tagline:
      "Smart detection of 50+ patterns across accessibility, performance, SEO, and security with auto-fixes.",
    description:
      "The AI Suggestions tool is an intelligent analysis engine built into FrontendDevHelper that scans your page for 50+ common issues across accessibility, performance, SEO, and security — then provides prioritized suggestions with one-click auto-fixes powered by AI, dramatically speeding up your development workflow.",
    metaTitle:
      "AI Suggestions Chrome Extension — Smart Code Fix Tool | FrontendDevHelper",
    metaDescription:
      "Get AI-powered suggestions for accessibility, performance, SEO, and security issues with one-click auto-fixes. 50+ pattern detection. Free Chrome Extension.",
    features: [
      {
        title: "Multi-Category Scanner",
        description:
          "Scan for issues across four categories simultaneously: accessibility (WCAG), performance (Core Web Vitals), SEO (meta tags, structured data), and security (headers, mixed content).",
      },
      {
        title: "50+ Pattern Detection",
        description:
          "Detect over 50 common frontend anti-patterns including missing alt text, render-blocking resources, duplicate IDs, insecure form actions, and broken ARIA usage.",
      },
      {
        title: "AI-Powered Auto-Fixes",
        description:
          "Many detected issues come with one-click auto-fix suggestions generated by AI. Review the suggested code change and apply it directly from the extension.",
      },
      {
        title: "Priority Ranking",
        description:
          "Issues are ranked by severity and impact. Critical accessibility violations and security issues appear first, followed by performance optimizations and SEO improvements.",
      },
      {
        title: "Code Context",
        description:
          "Each suggestion includes the relevant HTML, CSS, or JavaScript snippet with highlighted lines. See exactly what needs to change and where.",
      },
      {
        title: "Learning Mode",
        description:
          "Toggle explanations to understand why each issue matters. Each suggestion links to the relevant specification, best practice, or WCAG criterion for deeper learning.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Run Analysis",
        description:
          "Open the AI Suggestions panel from the FrontendDevHelper popup. Click Analyze to scan the page for issues across all categories.",
      },
      {
        step: "02",
        title: "Review Suggestions",
        description:
          "Browse prioritized suggestions organized by category. Each issue shows the affected element, a description, and the relevant code context.",
      },
      {
        step: "03",
        title: "Apply Fixes",
        description:
          "Review auto-fix suggestions for supported issues. Apply fixes with one click, or copy the suggested code changes to implement manually.",
      },
    ],
    faq: [
      {
        question: "Does the AI send my page data to external servers?",
        answer:
          "The pattern detection runs entirely locally in your browser. AI-powered auto-fix suggestions are optional and use your configured API key. You can use the scanner without any external API calls.",
      },
      {
        question: "How accurate are the auto-fix suggestions?",
        answer:
          "Auto-fixes target well-known, deterministic issues (e.g., adding missing alt attributes, fixing meta viewport tags). They are designed to be safe and conservative. Complex issues that require human judgment are flagged without auto-fix, with detailed explanations instead.",
      },
      {
        question: "Can I configure which categories to scan?",
        answer:
          "Yes. You can enable or disable individual categories (accessibility, performance, SEO, security) and set minimum severity thresholds to control which issues appear in the results.",
      },
    ],
    relatedTools: [
      "accessibility-checker",
      "performance-profiler",
      "css-scanner",
      "css-debugger",
    ],
  },
  {
    slug: "spacing-visualizer",
    name: "Spacing Visualizer",
    tagline:
      "Visualize margin and padding overlays for any element on the page.",
    description:
      "The Spacing Visualizer is a layout debugging tool built into FrontendDevHelper that renders color-coded margin and padding overlays for any element, showing exact pixel values for each side — making it easy to debug spacing inconsistencies and understand the box model at a glance.",
    metaTitle:
      "Spacing Visualizer Chrome Extension — Margin & Padding Overlay Tool | FrontendDevHelper",
    metaDescription:
      "Visualize margin and padding with color-coded overlays showing exact pixel values. Debug spacing and box model issues instantly. Free Chrome Extension.",
    features: [
      {
        title: "Color-Coded Spacing Overlay",
        description:
          "Margin is shown in orange and padding in green, matching the DevTools box model convention. Each side displays its exact pixel value.",
      },
      {
        title: "Nested Spacing View",
        description:
          "See margin and padding for the hovered element and its parent simultaneously. Understand how spacing compounds through the DOM tree.",
      },
      {
        title: "Negative Margin Detection",
        description:
          "Highlight elements with negative margins in red. See the negative value and understand how it affects surrounding elements.",
      },
      {
        title: "Auto Margin Indicator",
        description:
          "Detect auto margins used for centering or spacing distribution. See which axis uses auto margins and the computed pixel value.",
      },
      {
        title: "Spacing Consistency Audit",
        description:
          "Scan the page for spacing inconsistencies. Find elements with similar but not identical spacing values that may indicate design system violations.",
      },
      {
        title: "Spacing Values as Design Tokens",
        description:
          "Map detected spacing values to common design token scales (4px, 8px, 16px, etc.). See which elements do not conform to the expected spacing scale.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate",
        description:
          "Open the Spacing Visualizer from the FrontendDevHelper panel or command palette. Hover over any element to see its spacing overlay.",
      },
      {
        step: "02",
        title: "Inspect Spacing",
        description:
          "Move your mouse to see margin (orange) and padding (green) for each element. Each side shows its computed pixel value.",
      },
      {
        step: "03",
        title: "Audit & Fix",
        description:
          "Run the consistency audit to find spacing violations. Click elements with inconsistent spacing to see suggested values that match the design system.",
      },
    ],
    faq: [
      {
        question: "Does it show CSS gap property values?",
        answer:
          "Yes. For flex and grid containers, the Spacing Visualizer shows the computed row-gap and column-gap values alongside the margin and padding overlays.",
      },
      {
        question: "Can I see spacing for elements inside iframes?",
        answer:
          "The Spacing Visualizer works on elements in the top-level document. Cross-origin iframes are restricted by browser security policies, but same-origin iframes are fully supported.",
      },
      {
        question: "Does it handle CSS transforms and positioned elements?",
        answer:
          "Yes. The visualizer accounts for CSS transforms, relative/absolute positioning, and other layout properties. It shows the visual spacing as rendered on screen.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "flex-grid-visualizer",
      "pixel-ruler",
      "css-inspector",
    ],
  },
  {
    slug: "css-inspector",
    name: "CSS Inspector",
    tagline:
      "All computed CSS properties organized by category — layout, typography, colors, and effects.",
    description:
      "The CSS Inspector is a comprehensive style analysis tool built into FrontendDevHelper that displays all computed CSS properties for any element, organized into logical categories — layout, typography, colors, effects, and transitions — making it easy to find and understand any style value without scrolling through a massive alphabetical list.",
    metaTitle:
      "CSS Inspector Chrome Extension — Computed Styles by Category | FrontendDevHelper",
    metaDescription:
      "Inspect all computed CSS properties organized by category: layout, typography, colors, effects. Copy any property value instantly. Free Chrome Extension.",
    features: [
      {
        title: "Categorized Property View",
        description:
          "Computed properties are organized into categories: Layout (display, position, flex, grid), Typography (font, text), Colors (foreground, background, border), Effects (box-shadow, filter, opacity), and Transitions.",
      },
      {
        title: "Property Search",
        description:
          "Search for any CSS property name or value across all categories. Results highlight instantly with the category context.",
      },
      {
        title: "Inherited vs. Declared",
        description:
          "Each property shows whether it was explicitly declared on the element or inherited from a parent. Trace inherited values up the DOM tree.",
      },
      {
        title: "Source Stylesheet Link",
        description:
          "When source maps are available, click any property to see which stylesheet and line number it comes from. Jump to the source in your editor.",
      },
      {
        title: "Property Diff",
        description:
          "Compare computed styles between two elements side-by-side. See which properties differ — useful for debugging why two elements look different.",
      },
      {
        title: "Quick Copy",
        description:
          "Click any property value to copy it to clipboard. Copy individual properties, full categories, or the entire computed style set as CSS.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Select Element",
        description:
          "Use the element picker to select any element on the page, or hover to inspect. The CSS Inspector panel opens with categorized properties.",
      },
      {
        step: "02",
        title: "Browse Categories",
        description:
          "Expand categories to see all computed properties. Use search to find specific values. See whether each property is declared or inherited.",
      },
      {
        step: "03",
        title: "Compare & Copy",
        description:
          "Use the property diff to compare two elements. Click any value to copy it. Export the full computed style set when needed.",
      },
    ],
    faq: [
      {
        question: "How is this different from Chrome DevTools Computed panel?",
        answer:
          "DevTools shows properties in alphabetical order. The CSS Inspector groups them into logical categories so you can find related properties together. It also adds inherited vs. declared indicators and a property diff feature that DevTools does not have.",
      },
      {
        question: "Does it show shorthand and longhand properties?",
        answer:
          "The inspector shows resolved longhand properties by default (as the browser computes them). You can toggle a view that groups longhand properties under their shorthand for easier reading.",
      },
      {
        question: "Can I inspect pseudo-element styles?",
        answer:
          "Yes. The CSS Inspector can show computed styles for ::before, ::after, ::placeholder, and other pseudo-elements when they are present on the selected element.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "css-scanner",
      "element-inspector",
      "spacing-visualizer",
    ],
  },
  {
    slug: "pixel-ruler",
    name: "Pixel Ruler",
    tagline: "Precise distance measurement between elements in pixels.",
    description:
      "The Pixel Ruler is a measurement tool built into FrontendDevHelper that lets you measure the exact pixel distance between any two points on the page — element edges, arbitrary points, or guides. It provides horizontal, vertical, and diagonal measurements with a visual ruler overlay.",
    metaTitle:
      "Pixel Ruler Chrome Extension — Distance Measurement Tool | FrontendDevHelper",
    metaDescription:
      "Measure pixel distances between elements on any webpage. Horizontal, vertical, and diagonal measurements with visual ruler overlays. Free Chrome Extension.",
    features: [
      {
        title: "Point-to-Point Measurement",
        description:
          "Click two points on the page to measure the exact pixel distance between them. See horizontal, vertical, and diagonal distance values.",
      },
      {
        title: "Element-to-Element Measurement",
        description:
          "Select two elements to measure the gap between them. The ruler accounts for margins, borders, and padding to show the true visual distance.",
      },
      {
        title: "Persistent Guides",
        description:
          "Place horizontal and vertical guide lines on the page that stay in place as you scroll. Align elements visually and verify pixel-perfect positioning.",
      },
      {
        title: "Measurement History",
        description:
          "All measurements are saved in a history panel. Review previous measurements, re-measure the same elements, or clear the history.",
      },
      {
        title: "Grid Overlay",
        description:
          "Apply a configurable pixel grid overlay to verify alignment. Choose grid spacing (4px, 8px, 16px, etc.) and opacity to match your design system.",
      },
      {
        title: "Screenshot with Measurements",
        description:
          "Capture a screenshot that includes all active ruler overlays, guide lines, and measurement labels — perfect for design review and bug reports.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Activate Ruler",
        description:
          "Open the Pixel Ruler from the FrontendDevHelper panel or command palette. The measurement cursor activates immediately.",
      },
      {
        step: "02",
        title: "Measure",
        description:
          "Click and drag between two points to measure. Or hover over an element and press a shortcut to set the first measurement anchor, then click the second element.",
      },
      {
        step: "03",
        title: "Document",
        description:
          "Review measurements in the history panel. Place persistent guides for alignment checks. Take a screenshot with all rulers and guides visible.",
      },
    ],
    faq: [
      {
        question: "Does it account for CSS transforms and zoom?",
        answer:
          "Yes. The Pixel Ruler measures the visual position of elements on screen, accounting for CSS transforms, scale, and browser zoom level. The displayed values reflect actual pixel distances as you see them.",
      },
      {
        question: "Can I measure inside scrollable containers?",
        answer:
          "Yes. Measurements work inside scrollable containers. You can measure distances between elements that are not simultaneously visible by scrolling between measurement points.",
      },
      {
        question: "How precise are the measurements?",
        answer:
          "Measurements are accurate to the sub-pixel level, matching the browser's rendering precision. Fractional pixel values are displayed when relevant.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "spacing-visualizer",
      "screenshot-studio",
      "responsive-tester",
    ],
  },
  {
    slug: "screenshot-studio",
    name: "Screenshot Studio",
    tagline:
      "Full-page, viewport, or element screenshots with annotation tools.",
    description:
      "The Screenshot Studio is a capture and annotation tool built into FrontendDevHelper that takes full-page, viewport, or element-specific screenshots and adds annotations — arrows, text, shapes, highlights, and redactions — making it easy to document bugs, create design reviews, and share visual feedback.",
    metaTitle:
      "Screenshot Studio Chrome Extension — Annotate & Capture Tool | FrontendDevHelper",
    metaDescription:
      "Capture full-page, viewport, or element screenshots with annotation tools. Add arrows, text, highlights, and redactions. Free Chrome Extension for developers.",
    features: [
      {
        title: "Full-Page Capture",
        description:
          "Capture the entire page from top to bottom, including content below the fold. Automatically stitches visible sections into one seamless image.",
      },
      {
        title: "Element Screenshot",
        description:
          "Click any element to capture just that element. Perfect for documenting specific components, cards, or widgets in isolation.",
      },
      {
        title: "Annotation Tools",
        description:
          "Add arrows, text labels, rectangles, circles, and freehand highlights to your screenshot. Annotate bugs, design issues, or feedback directly on the image.",
      },
      {
        title: "Sensitive Data Redaction",
        description:
          "Redact sensitive information like emails, names, or API keys before sharing. Drag a redaction box over any area to permanently black it out in the screenshot.",
      },
      {
        title: "Device Frame Mockup",
        description:
          "Optionally wrap the screenshot in a device frame (browser, phone, tablet) for professional-looking documentation and presentations.",
      },
      {
        title: "One-Click Share",
        description:
          "Copy the annotated screenshot to clipboard, download as PNG or SVG, or share directly to issue trackers, Slack, or email with one click.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Capture",
        description:
          "Choose capture mode: full page, visible viewport, or selected element. Click to capture the screenshot.",
      },
      {
        step: "02",
        title: "Annotate",
        description:
          "Use the annotation toolbar to add arrows, text, shapes, and highlights. Redact any sensitive areas before sharing.",
      },
      {
        step: "03",
        title: "Share",
        description:
          "Copy to clipboard, download as PNG, or share directly to your team. All processing happens locally in your browser.",
      },
    ],
    faq: [
      {
        question: "Can I capture screenshots of pages that require scrolling?",
        answer:
          "Yes. The full-page capture mode automatically scrolls through the entire page and stitches the sections into one seamless image. No manual scrolling required.",
      },
      {
        question: "Are annotations editable after placement?",
        answer:
          "Yes. All annotations are vector-based and fully editable. You can move, resize, change colors, and edit text after placing them. Annotations remain editable until you export the final image.",
      },
      {
        question: "Does the screenshot include DevTools or extension panels?",
        answer:
          "No. Screenshots capture the page content only. Extension panels, DevTools, and other browser UI are excluded from the capture.",
      },
    ],
    relatedTools: [
      "visual-regression",
      "responsive-tester",
      "pixel-ruler",
      "css-debugger",
    ],
  },
  {
    slug: "css-scanner",
    name: "CSS Scanner",
    tagline:
      "Detect CSS anti-patterns, unused styles, specificity issues, and performance problems.",
    description:
      "The CSS Scanner is a code quality tool built into FrontendDevHelper that analyzes all stylesheets loaded by the page to detect unused CSS rules, specificity conflicts, duplicate declarations, expensive selectors, and performance anti-patterns — helping you clean up your CSS and reduce stylesheet bloat.",
    metaTitle:
      "CSS Scanner Chrome Extension — Unused CSS & Specificity Tool | FrontendDevHelper",
    metaDescription:
      "Scan CSS for unused styles, specificity conflicts, duplicate rules, and performance anti-patterns. Reduce stylesheet bloat and improve maintainability. Free.",
    features: [
      {
        title: "Unused CSS Detector",
        description:
          "Compare all loaded CSS rules against the current DOM to find declarations that do not match any element. See the percentage of unused CSS and the byte savings from removing it.",
      },
      {
        title: "Specificity Conflict Finder",
        description:
          "Identify CSS rules that override each other due to specificity. See the full cascade chain for any property and understand which rule wins.",
      },
      {
        title: "Duplicate Declaration Detector",
        description:
          "Find CSS properties that are declared multiple times for the same selector or equivalent selectors. Consolidate duplicates to reduce stylesheet size.",
      },
      {
        title: "Expensive Selector Analyzer",
        description:
          "Flag selectors that are slow for the browser to match: universal selectors, deeply nested descendants, and over-qualified selectors. Get suggestions for faster alternatives.",
      },
      {
        title: "!important Audit",
        description:
          "List all uses of !important in the page stylesheets. Each instance is flagged with the property, selector, and a suggestion for resolving it without !important.",
      },
      {
        title: "Stylesheet Size Report",
        description:
          "See the total size of all loaded stylesheets, broken down by file. Identify the largest stylesheets and the potential savings from removing unused rules.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Run Scan",
        description:
          "Open the CSS Scanner from the FrontendDevHelper panel. Click Scan to analyze all loaded stylesheets against the current page DOM.",
      },
      {
        step: "02",
        title: "Review Findings",
        description:
          "Results are grouped by category: unused rules, specificity conflicts, duplicates, expensive selectors, and !important usage. Each finding links to the source rule.",
      },
      {
        step: "03",
        title: "Optimize",
        description:
          "See the total byte savings potential from fixing each category. Export the list of unused rules for removal or the full report for your team.",
      },
    ],
    faq: [
      {
        question:
          "Does unused CSS detection work for single-page applications?",
        answer:
          "For SPAs, unused CSS detection is based on the current DOM state. Run the scanner after navigating to all major routes to get a complete picture of which CSS rules are actually used across your application.",
      },
      {
        question: "Can it analyze CSS-in-JS and styled-components?",
        answer:
          "The scanner analyzes all stylesheets in the browser's CSS OM, including dynamically generated style tags from CSS-in-JS libraries. It treats generated styles the same as static stylesheets.",
      },
      {
        question: "Does it check media query usage?",
        answer:
          "Yes. The CSS Scanner identifies media query blocks and checks whether any rules inside them match elements on the current page at any breakpoint. This helps identify responsive styles that may no longer be needed.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "css-inspector",
      "performance-profiler",
      "network-analyzer",
    ],
  },
  {
    slug: "smart-picker",
    name: "Smart Element Picker",
    tagline: "Advanced element selection with context-aware highlighting.",
    description:
      "The Smart Element Picker is an enhanced element selection tool built into FrontendDevHelper that provides intelligent, context-aware element selection with multiple picking modes — by tag, class, component boundary, or visual region — making it easy to select exactly the element you want, even in complex DOMs.",
    metaTitle:
      "Smart Element Picker Chrome Extension — Advanced Element Selection | FrontendDevHelper",
    metaDescription:
      "Select elements intelligently with context-aware picking modes. Pick by tag, class, component, or visual region. Free Chrome Extension for developers.",
    features: [
      {
        title: "Multi-Mode Picker",
        description:
          "Switch between picking modes: exact element, parent container, nearest component boundary, or all elements matching a selector. One tool for every selection need.",
      },
      {
        title: "Component Boundary Detection",
        description:
          "In component mode, the picker automatically identifies framework component boundaries and selects the component root rather than the individual DOM node.",
      },
      {
        title: "Selector Generation",
        description:
          "Generate a robust CSS selector for the picked element — optimized for uniqueness while avoiding over-specificity. Copy selectors for use in tests or stylesheets.",
      },
      {
        title: "Batch Selection",
        description:
          "Select all elements matching a pattern (same class, same tag, same role). Apply actions or inspections to the entire batch at once.",
      },
      {
        title: "Visual Region Picker",
        description:
          "Draw a rectangle on the page to select all elements within that visual region. Useful for selecting a group of elements in a specific layout area.",
      },
      {
        title: "Selection History",
        description:
          "The picker remembers previously selected elements during the session. Re-select a previous target with one click without navigating the DOM again.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Choose Mode",
        description:
          "Open the Smart Picker and select your picking mode: exact, parent, component, selector, or region.",
      },
      {
        step: "02",
        title: "Pick Element",
        description:
          "Click on the page to select. The picker highlights the target element based on your chosen mode. Use arrow keys to adjust the selection up or down the DOM tree.",
      },
      {
        step: "03",
        title: "Act",
        description:
          "Copy the generated selector, inspect the element, or apply a tool action. Switch to batch mode to select all matching elements.",
      },
    ],
    faq: [
      {
        question: "How does component mode work?",
        answer:
          "Component mode detects the framework (React, Vue, Angular, Svelte) and identifies the component root for the clicked element. It selects the entire component boundary instead of the individual DOM node, which is more useful for debugging and inspection.",
      },
      {
        question: "Can I use keyboard navigation to adjust the selection?",
        answer:
          "Yes. After clicking, use arrow keys to move the selection up (parent) or down (children) the DOM tree. Hold Shift to jump to sibling elements. This lets you fine-tune your selection without re-clicking.",
      },
      {
        question: "Does batch selection work across iframes?",
        answer:
          "Batch selection works within the top-level document and same-origin iframes. Cross-origin iframes are restricted by browser security policies.",
      },
    ],
    relatedTools: [
      "element-inspector",
      "dom-inspector",
      "css-debugger",
      "component-tree",
    ],
  },
  {
    slug: "animation-inspector",
    name: "Animation Inspector",
    tagline:
      "Inspect CSS animations and transitions with playback speed control.",
    description:
      "The Animation Inspector is a motion debugging tool built into FrontendDevHelper that captures all running CSS animations and transitions on the page, displays their properties in a timeline view, and provides playback speed controls — making it easy to debug timing, easing, and sequencing issues.",
    metaTitle:
      "Animation Inspector Chrome Extension — CSS Animation Debugging Tool | FrontendDevHelper",
    metaDescription:
      "Inspect CSS animations and transitions, control playback speed, debug timing and easing. Free Chrome Extension for frontend developers.",
    features: [
      {
        title: "Animation Timeline",
        description:
          "See all active CSS animations and transitions on a timeline. Each animation shows its duration, delay, iteration count, and current progress.",
      },
      {
        title: "Playback Speed Control",
        description:
          "Slow down animations to 0.1x speed for detailed inspection, or speed them up to 10x to verify loop behavior. Pause animations to examine a specific frame.",
      },
      {
        title: "Easing Curve Editor",
        description:
          "View the easing function for any animation as an interactive cubic-bezier curve. Compare with common easings and adjust the control points in real-time.",
      },
      {
        title: "Property Change Tracker",
        description:
          "See exactly which CSS properties each animation modifies and the start/end values. Track transform, opacity, color, and other animated properties.",
      },
      {
        title: "Keyframe Inspector",
        description:
          "For @keyframes animations, see every keyframe with its percentage offset and declared properties. Understand the full animation sequence at a glance.",
      },
      {
        title: "Performance Impact Indicator",
        description:
          "Animations that trigger layout or paint (non-compositor-friendly) are flagged with performance warnings. Get suggestions for using transform and opacity instead.",
      },
    ],
    howItWorks: [
      {
        step: "01",
        title: "Capture Animations",
        description:
          "Open the Animation Inspector from the FrontendDevHelper panel. It captures all currently running CSS animations and transitions on the page.",
      },
      {
        step: "02",
        title: "Inspect Timeline",
        description:
          "Browse the animation timeline to see duration, easing, and keyframes for each animation. Adjust playback speed or pause to examine specific frames.",
      },
      {
        step: "03",
        title: "Debug & Optimize",
        description:
          "Check the performance impact indicator for layout-triggering animations. Use the easing curve editor to fine-tune timing. Copy optimized CSS animation declarations.",
      },
    ],
    faq: [
      {
        question: "Does it inspect JavaScript-driven animations?",
        answer:
          "The Animation Inspector captures CSS animations, CSS transitions, and Web Animations API animations. JavaScript animations using requestAnimationFrame are shown as general frame activity but not with the same keyframe detail.",
      },
      {
        question: "Can I edit animation properties live?",
        answer:
          "You can adjust playback speed, pause, and scrub through the animation timeline. For editing animation CSS properties, use the integration with the CSS Inspector to modify values and see the results immediately.",
      },
      {
        question:
          "Does it work with animation libraries like GSAP or Framer Motion?",
        answer:
          "Animations applied via inline styles by libraries like GSAP or Framer Motion are captured as CSS transitions or Web Animations API entries where applicable. The inspector shows the resulting animation properties regardless of the library that created them.",
      },
    ],
    relatedTools: [
      "css-debugger",
      "css-inspector",
      "performance-profiler",
      "flame-graph",
    ],
  },
];

export function getToolBySlug(slug: string): ToolPageData | undefined {
  return allTools.find((tool) => tool.slug === slug);
}

export function getRelatedTools(slugs: string[]): ToolPageData[] {
  return slugs
    .map((slug) => allTools.find((tool) => tool.slug === slug))
    .filter((t): t is ToolPageData => t !== undefined);
}

/**
 * Single source of truth for the marketing copy. Use this everywhere the
 * number of shipped tools is mentioned — landing page, OG image, email
 * templates, terms. The `data/domain` field on the marketing site must match.
 */
export const TOOL_COUNT = allTools.length;
