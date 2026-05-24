'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Eye, Palette, Layers, Flame, Sparkles, Command, Ruler, Type, Grid3X3, ArrowRight } from 'lucide-react';

const bentoItems = [
  {
    id: 'dom-outliner',
    title: 'DOM Outliner',
    description: 'Color-coded element outlines with 18 unique colors. Hover labels showing tag name, ID, and classes. Zero layout impact.',
    icon: Eye,
    color: 'from-accent-cyan/20 to-accent-cyan/5',
    borderColor: 'border-accent-cyan/20',
    size: 'large',
    shortcut: 'Alt+P',
  },
  {
    id: 'color-picker',
    title: 'Color Picker',
    description: 'EyeDropper API + palette extraction with harmonies.',
    icon: Palette,
    color: 'from-accent-pink/20 to-accent-pink/5',
    borderColor: 'border-accent-pink/20',
    size: 'small',
    shortcut: 'Alt+C',
  },
  {
    id: 'z-index',
    title: 'Z-Index 3D View',
    description: 'Interactive 3D stacking visualization. Drag, zoom, and wireframe modes. Detect z-index conflicts instantly.',
    icon: Layers,
    color: 'from-accent-purple/20 to-accent-purple/5',
    borderColor: 'border-accent-purple/20',
    size: 'large',
    shortcut: '—',
  },
  {
    id: 'flame-graph',
    title: 'Performance Flame Graph',
    description: 'Visualize JS execution & bottlenecks. Long task detection.',
    icon: Flame,
    color: 'from-orange-500/20 to-orange-500/5',
    borderColor: 'border-orange-500/20',
    size: 'small',
    shortcut: '—',
  },
  {
    id: 'ai-suggestions',
    title: 'AI Suggestions',
    description: '50+ detection patterns with one-click auto-fixes.',
    icon: Sparkles,
    color: 'from-yellow-500/20 to-yellow-500/5',
    borderColor: 'border-yellow-500/20',
    size: 'small',
    shortcut: '—',
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description: 'VS Code-style quick access to all 39 tools. Fuzzy search. Recent commands history.',
    icon: Command,
    color: 'from-accent-blue/20 to-accent-blue/5',
    borderColor: 'border-accent-blue/20',
    size: 'small',
    shortcut: 'Ctrl+Shift+P',
  },
];

function BentoCard({ item, index }: { item: typeof bentoItems[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const isLarge = item.size === 'large';
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group cursor-pointer ${
        isLarge ? 'md:col-span-2 md:row-span-2' : ''
      }`}
    >
      <div
        className={`relative h-full rounded-2xl border ${item.borderColor} bg-gradient-to-br ${item.color} backdrop-blur-xl p-6 lg:p-8 overflow-hidden transition-all duration-500 ${
          isHovered ? 'scale-[1.02] shadow-2xl' : ''
        }`}
      >
        {/* Glow effect on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white/80" />
            </div>
            {item.shortcut !== '—' && (
              <kbd className="hidden sm:inline-flex px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-white/40">
                {item.shortcut}
              </kbd>
            )}
          </div>

          <h3 className={`font-bold text-white mb-2 ${isLarge ? 'text-xl lg:text-2xl' : 'text-lg'}`}>
            {item.title}
          </h3>
          <p className={`text-white/50 leading-relaxed ${isLarge ? 'text-base max-w-md' : 'text-sm'}`}>
            {item.description}
          </p>

          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-white/70"
            >
              Learn more <ArrowRight className="w-4 h-4" />
            </motion.div>
          )}
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
      </div>
    </motion.div>
  );
}

export default function BentoGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="section-padding relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 mb-6">
            <Grid3X3 className="w-4 h-4 text-accent-cyan" />
            <span className="text-sm font-medium text-accent-cyan">Feature Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            39 Tools.{' '}
            <span className="text-gradient">One Extension.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            From DOM inspection to AI-powered analysis, every tool you need —
            unified in a single, keyboard-first workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 auto-rows-fr">
          {bentoItems.map((item, index) => (
            <BentoCard key={item.id} item={item} index={index} />
          ))}
        </div>

        {/* Additional mini features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {[
            { icon: Ruler, label: 'Pixel Ruler' },
            { icon: Type, label: 'Font Inspector' },
            { icon: Eye, label: 'A11y Audit' },
            { icon: Layers, label: 'Flex/Grid' },
            { icon: Sparkles, label: 'Tech Detector' },
            { icon: Command, label: 'And 33 more...' },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors"
            >
              <Icon className="w-4 h-4 text-white/50" />
              <span className="text-xs font-medium text-white/60">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Trust callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-600 text-sm font-bold">
            No permissions abuse. No data collection. Your code never leaves your browser.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
