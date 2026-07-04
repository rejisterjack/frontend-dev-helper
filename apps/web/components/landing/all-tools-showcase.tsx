"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Layout,
  Type,
  Palette,
  Move,
  Smartphone,
  Search,
  Shield,
  BarChart3,
  Edit3,
  Camera,
  Clapperboard,
  SmartphoneNfc,
  CheckCircle2,
  Globe,
  Keyboard,
  Database,
  Sparkles,
  Box,
  Flame,
  Target,
  FileText,
  SplitSquareVertical,
  Zap,
  Layers,
  Blocks,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TOOL_COUNT } from "@/data/tools";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

type Tool = { name: string; icon: LucideIcon; description: string };
type Category = {
  label: string;
  accent: "cyan" | "violet" | "amber" | "green";
  tools: Tool[];
};

const categories: Category[] = [
  {
    label: "Visual inspection",
    accent: "cyan",
    tools: [
      {
        name: "DOM Outliner",
        icon: Eye,
        description:
          "Color-coded element outlines (Pesticide reborn) with 18 element types",
      },
      {
        name: "Spacing",
        icon: Layout,
        description:
          "Margin & padding overlays with exact pixel values on click",
      },
      {
        name: "Font Inspect",
        icon: Type,
        description:
          "Typography analysis with source detection (Google Fonts, Typekit, self-hosted)",
      },
      {
        name: "Color Picker",
        icon: Palette,
        description: "EyeDropper + full page palette extraction with harmonies",
      },
      {
        name: "Pixel Ruler",
        icon: Move,
        description:
          "Click & drag measurement in px and rem with arrow endpoints",
      },
      {
        name: "Breakpoints",
        icon: Smartphone,
        description:
          "Viewport size badge with Tailwind & Bootstrap breakpoint presets",
      },
      {
        name: "CSS Inspect",
        icon: Search,
        description:
          "11 property categories with filter, inherit toggle, and one-click copy",
      },
      {
        name: "Grid View",
        icon: LayoutGrid,
        description: "Flexbox & Grid axis visualization with gap indicators",
      },
      {
        name: "3D Z-Index",
        icon: Layers,
        description:
          "Stacking order hierarchy with interactive 3D drag-to-rotate view",
      },
      {
        name: "Animations",
        icon: Clapperboard,
        description:
          "CSS animation timeline with play/pause and 0.25x–2x speed control",
      },
      {
        name: "Responsive",
        icon: SmartphoneNfc,
        description: "Multi-device side-by-side preview with sync scrolling",
      },
      {
        name: "Live Editor",
        icon: Edit3,
        description: "Real-time CSS editing with undo/redo and export",
      },
    ],
  },
  {
    label: "Accessibility & quality",
    accent: "green",
    tools: [
      {
        name: "Accessibility",
        icon: CheckCircle2,
        description:
          "WCAG 2.1 + ARIA validator with 70+ roles, focus order, and contrast analysis",
      },
      {
        name: "Contrast",
        icon: Shield,
        description:
          "WCAG AA/AAA contrast compliance with improvement suggestions",
      },
      {
        name: "Focus Flow",
        icon: Target,
        description: "Tab order visualization with focus trap detection",
      },
      {
        name: "Form Debug",
        icon: FileText,
        description:
          "Form field analysis, label detection, autofill, and validation messages",
      },
      {
        name: "Token Audit",
        icon: Box,
        description:
          "Design token consistency — spacing, colors, typography against Tailwind/Material/Bootstrap",
      },
      {
        name: "Regression",
        icon: SplitSquareVertical,
        description:
          "Pixel-perfect screenshot baseline capture and visual diff comparison",
      },
    ],
  },
  {
    label: "Performance & analysis",
    accent: "amber",
    tools: [
      {
        name: "Performance",
        icon: Flame,
        description:
          "JS execution flame graph — long task detection >50ms with zoom & pan",
      },
      {
        name: "Network",
        icon: Globe,
        description:
          "Request waterfall with timing breakdown, render-blocking detection",
      },
      {
        name: "Tech Detect",
        icon: Keyboard,
        description:
          "Detects 20+ frameworks, CMS, analytics, build tools, and fonts",
      },
      {
        name: "Site Report",
        icon: BarChart3,
        description:
          "All-in-one score: performance, accessibility, SEO, best practices (JSON/PDF)",
      },
      {
        name: "Screenshots",
        icon: Camera,
        description:
          "Viewport or full-page capture with arrow, rect, circle, and text annotations",
      },
    ],
  },
  {
    label: "AI & developer tools",
    accent: "violet",
    tools: [
      {
        name: "AI Audit",
        icon: Sparkles,
        description:
          "50+ detection patterns across a11y, perf, SEO, best practices — with auto-fixes",
      },
      {
        name: "Components",
        icon: Blocks,
        description:
          "React, Vue, Angular, Svelte component tree with props & state inspection",
      },
      {
        name: "Storage",
        icon: Database,
        description:
          "LocalStorage, SessionStorage, IndexedDB, Cookies, and Cache inspection",
      },
      {
        name: "Palette",
        icon: Zap,
        description: `Command Palette: fuzzy search all ${TOOL_COUNT} tools via Ctrl+Shift+P`,
      },
    ],
  },
];

const accentText = {
  cyan: "text-brand-cyan",
  violet: "text-brand-violet",
  amber: "text-warning",
  green: "text-success",
} as const;

const accentBg = {
  cyan: "group-hover:border-brand-cyan/40 group-hover:bg-brand-cyan/5",
  violet: "group-hover:border-brand-violet/40 group-hover:bg-brand-violet/5",
  amber: "group-hover:border-warning/40 group-hover:bg-warning/5",
  green: "group-hover:border-success/40 group-hover:bg-success/5",
} as const;

const accentIcon = {
  cyan: "group-hover:text-brand-cyan",
  violet: "group-hover:text-brand-violet",
  amber: "group-hover:text-warning",
  green: "group-hover:text-success",
} as const;

export function AllToolsShowcase() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        tools: c.tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.tools.length > 0);
  }, [query]);

  const shownCount = filtered.reduce((n, c) => n + c.tools.length, 0);

  return (
    <section id="tools" className="section-y">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <SectionHeading
            eyebrow={`${TOOL_COUNT} tools`}
            title={
              <>
                The full toolkit.{" "}
                <span className="text-text-muted">Filter, search, ship.</span>
              </>
            }
            lead="Every tool, grouped by job. Hover any tile for details, or filter to find the exact one you need."
          />

          <motion.div variants={fadeUp} className="mt-8 max-w-md">
            <label htmlFor="tool-filter" className="sr-only">
              Filter tools
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                id="tool-filter"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${TOOL_COUNT} tools…`}
                className="h-11 w-full rounded-xl border border-line-subtle bg-bg-elevated pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan/40 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
              />
            </div>
            <p
              className="mt-2 font-mono text-xs text-text-muted"
              aria-live="polite"
            >
              Showing {shownCount} of {TOOL_COUNT}
            </p>
          </motion.div>

          <div className="mt-12 space-y-12">
            {filtered.map((category) => (
              <motion.div key={category.label} variants={fadeUp}>
                <div className="mb-5 flex items-center gap-4">
                  <span
                    className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${accentText[category.accent]}`}
                  >
                    {category.label}
                  </span>
                  <div className="h-px flex-1 bg-line-subtle" />
                  <span className="font-mono text-[11px] text-text-muted">
                    {category.tools.length} tools
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {category.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <div
                        key={tool.name}
                        title={tool.description}
                        className={`group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-line-subtle bg-bg-elevated p-3 transition-colors duration-normal ease-out-quart ${accentBg[category.accent]}`}
                      >
                        <Icon
                          className={`h-5 w-5 text-text-muted transition-colors ${accentIcon[category.accent]}`}
                          strokeWidth={1.75}
                        />
                        <span className="text-center text-[11px] font-medium leading-tight text-text-tertiary transition-colors group-hover:text-text-primary">
                          {tool.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-line-subtle bg-bg-elevated p-8 text-center text-sm text-text-tertiary">
                No tools match &ldquo;{query}&rdquo;.
              </div>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default AllToolsShowcase;
