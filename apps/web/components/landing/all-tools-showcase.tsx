'use client';

import { motion } from 'framer-motion';
import {
  Eye, Layout, Type, Palette, Move, Smartphone,
  Search, Shield, BarChart3, Edit3, Camera, Clapperboard,
  SmartphoneNfc, CheckCircle2, Globe, Keyboard, Database,
  Sparkles, Box, Flame, Target, FileText, SplitSquareVertical,
  Zap, Layers, Blocks, LayoutGrid,
} from 'lucide-react';

const toolCategories = [
  {
    label: 'Visual Inspection',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    bgColor: 'bg-cyan-500/[0.03]',
    tools: [
      { name: 'DOM Outliner', icon: Eye, description: 'Color-coded element outlines (Pesticide reborn) with 18 element types' },
      { name: 'Spacing', icon: Layout, description: 'Margin & padding overlays with exact pixel values on click' },
      { name: 'Font Inspect', icon: Type, description: 'Typography analysis with source detection (Google Fonts, Typekit, self-hosted)' },
      { name: 'Color Picker', icon: Palette, description: 'EyeDropper + full page palette extraction with harmonies' },
      { name: 'Pixel Ruler', icon: Move, description: 'Click & drag measurement in px and rem with arrow endpoints' },
      { name: 'Breakpoints', icon: Smartphone, description: 'Viewport size badge with Tailwind & Bootstrap breakpoint presets' },
      { name: 'CSS Inspect', icon: Search, description: '11 property categories with filter, inherit toggle, and one-click copy' },
      { name: 'Grid View', icon: LayoutGrid, description: 'Flexbox & Grid axis visualization with gap indicators' },
      { name: '3D Z-Index', icon: Layers, description: 'Stacking order hierarchy with interactive 3D drag-to-rotate view' },
      { name: 'Animations', icon: Clapperboard, description: 'CSS animation timeline with play/pause and 0.25x–2x speed control' },
      { name: 'Responsive', icon: SmartphoneNfc, description: 'Multi-device side-by-side preview with sync scrolling' },
      { name: 'Live Editor', icon: Edit3, description: 'Real-time CSS editing with undo/redo and export' },
    ],
  },
  {
    label: 'Accessibility & Quality',
    color: 'text-green-400',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/[0.03]',
    tools: [
      { name: 'Accessibility', icon: CheckCircle2, description: 'WCAG 2.1 + ARIA validator with 70+ roles, focus order, and contrast analysis' },
      { name: 'Contrast', icon: Shield, description: 'WCAG AA/AAA contrast compliance with improvement suggestions' },
      { name: 'Focus Flow', icon: Target, description: 'Tab order visualization with focus trap detection' },
      { name: 'Form Debug', icon: FileText, description: 'Form field analysis, label detection, autofill, and validation messages' },
      { name: 'Token Audit', icon: Box, description: 'Design token consistency — spacing, colors, typography against Tailwind/Material/Bootstrap' },
      { name: 'Regression', icon: SplitSquareVertical, description: 'Pixel-perfect screenshot baseline capture and visual diff comparison' },
    ],
  },
  {
    label: 'Performance & Analysis',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/20',
    bgColor: 'bg-yellow-500/[0.03]',
    tools: [
      { name: 'Performance', icon: Flame, description: 'JS execution flame graph — long task detection >50ms with zoom & pan' },
      { name: 'Network', icon: Globe, description: 'Request waterfall with timing breakdown, render-blocking detection' },
      { name: 'Tech Detect', icon: Keyboard, description: 'Detects 20+ frameworks, CMS, analytics, build tools, and fonts' },
      { name: 'Site Report', icon: BarChart3, description: 'All-in-one score: performance, accessibility, SEO, best practices (JSON/PDF)' },
      { name: 'Screenshots', icon: Camera, description: 'Viewport or full-page capture with arrow, rect, circle, and text annotations' },
    ],
  },
  {
    label: 'AI & Developer Tools',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/[0.03]',
    tools: [
      { name: 'AI Audit', icon: Sparkles, description: '50+ detection patterns across a11y, perf, SEO, best practices — with auto-fixes' },
      { name: 'Components', icon: Blocks, description: 'React, Vue, Angular, Svelte component tree with props & state inspection' },
      { name: 'Storage', icon: Database, description: 'LocalStorage, SessionStorage, IndexedDB, Cookies, and Cache inspection' },
      { name: 'Palette', icon: Zap, description: 'Command Palette: fuzzy search all 39 tools via Ctrl+Shift+P' },
    ],
  },
];

function ToolCard({ tool, color, borderColor, bgColor, index }: {
  tool: { name: string; icon: React.ElementType; description: string };
  color: string;
  borderColor: string;
  bgColor: string;
  index: number;
}) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.02 }}
      className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.04] bg-surface-900/40 hover:${bgColor} hover:${borderColor} transition-all group aspect-square cursor-default`}
    >
      <Icon className={`w-6 h-6 mb-3 ${color} opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110`} />
      <span className="text-[9px] font-black text-neutral-600 group-hover:text-white transition-colors text-center uppercase tracking-tight leading-tight">
        {tool.name}
      </span>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 w-52">
        <div className="bg-[#111] border border-white/10 rounded-xl p-3 shadow-2xl text-center">
          <p className="text-xs font-black text-white mb-1">{tool.name}</p>
          <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">{tool.description}</p>
        </div>
        <div className="w-2 h-2 bg-[#111] border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
      </div>
    </motion.div>
  );
}

export const AllToolsShowcase = () => {
  return (
    <section className="py-40 bg-[#000] relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-grid opacity-5" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">
              Surgical <span className="text-neutral-700">Precision.</span>
            </h2>
            <p className="text-neutral-500 font-black uppercase tracking-[0.3em] text-sm">
              39 professional tools — hover to explore
            </p>
          </motion.div>
        </div>

        <div className="space-y-12">
          {toolCategories.map((category, catIdx) => (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIdx * 0.1 }}
            >
              {/* Category label */}
              <div className="flex items-center gap-4 mb-6">
                <span className={`text-xs font-black uppercase tracking-widest ${category.color}`}>
                  {category.label}
                </span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">
                  {category.tools.length} tools
                </span>
              </div>

              {/* Tools grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 xl:grid-cols-12 gap-2">
                {category.tools.map((tool, toolIdx) => (
                  <ToolCard
                    key={tool.name}
                    tool={tool}
                    color={category.color}
                    borderColor={category.borderColor}
                    bgColor={category.bgColor}
                    index={toolIdx}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AllToolsShowcase;
