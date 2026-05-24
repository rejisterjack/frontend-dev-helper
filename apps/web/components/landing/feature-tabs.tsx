'use client';

import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Eye, Type, Palette, Ruler, Smartphone, BarChart3, Sparkles, Code2, Layers, Grid3X3 } from 'lucide-react';

const categories = [
  {
    id: 'inspection',
    label: 'Inspection',
    icon: Eye,
    tools: [
      { name: 'DOM Outliner', desc: '18 element types with unique colors. Hover labels. Zero layout impact.', icon: Eye },
      { name: 'Spacing Visualizer', desc: 'Blue = padding, orange = margin. Exact pixel values on click.', icon: Grid3X3 },
      { name: 'Font Inspector', desc: 'Typography analysis with source detection. One-click CSS copy.', icon: Type },
      { name: 'Pixel Ruler', desc: 'Click & drag measurement. px and rem display. Element-to-element.', icon: Ruler },
      { name: 'Component Tree', desc: 'Visualize React, Vue, Angular, Svelte hierarchy. Props & state.', icon: Layers },
    ],
  },
  {
    id: 'css',
    label: 'CSS & Design',
    icon: Palette,
    tools: [
      { name: 'Color Picker', desc: 'EyeDropper API + palette extraction with harmonies. Export JSON.', icon: Palette },
      { name: 'CSS Inspector', desc: '11 categories of computed properties. Filter, copy, contrast ratio.', icon: Code2 },
      { name: 'Flex/Grid Visualizer', desc: 'Main axis, cross axis, gap indicators. Item numbers & properties.', icon: Grid3X3 },
      { name: 'Z-Index 3D View', desc: 'Interactive stacking visualization. Drag, zoom, wireframe.', icon: Layers },
      { name: 'Design System Validator', desc: 'Validate spacing, colors, typography against design tokens.', icon: Eye },
    ],
  },
  {
    id: 'responsive',
    label: 'Responsive',
    icon: Smartphone,
    tools: [
      { name: 'Breakpoint Overlay', desc: 'Viewport size + Tailwind/Bootstrap breakpoints. One-click resize.', icon: Smartphone },
      { name: 'Responsive Preview', desc: 'Multi-device side-by-side. Sync scrolling. Portrait/landscape.', icon: Smartphone },
      { name: 'Container Query Inspector', desc: 'Debug @container rules with visual overlays.', icon: Grid3X3 },
      { name: 'Animation Inspector', desc: 'Timeline visualization. Play/pause. Speed control 0.25x–2x.', icon: Eye },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: BarChart3,
    tools: [
      { name: 'Network Analyzer', desc: 'Request waterfall. Timing breakdown. Render-blocking detection.', icon: BarChart3 },
      { name: 'Performance Flame Graph', desc: 'JS execution profiling. Long task detection. Zoom & pan.', icon: BarChart3 },
      { name: 'Core Web Vitals', desc: 'LCP, FID, CLS tracking with ratings and optimization hints.', icon: BarChart3 },
      { name: 'Site Report Generator', desc: 'Comprehensive HTML/PDF/Markdown reports. Score 0-100.', icon: Eye },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Smart',
    icon: Sparkles,
    tools: [
      { name: 'AI Suggestions', desc: '50+ detection patterns. One-click auto-fixes. Confidence scoring.', icon: Sparkles },
      { name: 'Command Palette', desc: 'VS Code-style fuzzy search. Recent commands. Ctrl+Shift+P.', icon: Code2 },
      { name: 'Tech Detector', desc: 'Detect 20+ frameworks, libraries, analytics, CMS, build tools.', icon: Eye },
      { name: 'Accessibility Audit', desc: 'WCAG 2.1 + ARIA validation. 70+ roles. Export JSON.', icon: Eye },
    ],
  },
];

export default function FeatureTabs() {
  const [activeTab, setActiveTab] = useState('inspection');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const activeCategory = categories.find((c) => c.id === activeTab)!;

  return (
    <section id="features-deep" className="section-padding relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Every Tool.{' '}
            <span className="text-gradient">Deep Dive.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Explore all 39 tools across 5 categories. Each one is crafted for
            real-world debugging scenarios.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan'
                    : 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tool grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeCategory.tools.map((tool, i) => {
              const ToolIcon = tool.icon;
              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card-hover p-6 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-accent-cyan/10 group-hover:border-accent-cyan/20 transition-colors">
                      <ToolIcon className="w-5 h-5 text-white/60 group-hover:text-accent-cyan transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1 group-hover:text-accent-cyan transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-white/50 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
