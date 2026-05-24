'use client';

import React from 'react';
import { Zap, Eye, Sparkles, Database, Blocks, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const PreviewBox = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-full h-full min-h-[160px] bg-black/40 rounded-t-xl border-b border-white/5 overflow-hidden flex items-center justify-center p-4 relative ${className}`}>
    <div className="absolute inset-0 bg-grid bg-grid-fade opacity-20" />
    {children}
  </div>
);

const DOMInspectorPreview = () => (
  <PreviewBox>
    <div className="relative w-full h-24 border border-cyan-400/30 rounded flex items-center justify-center">
      <div className="absolute -top-3 left-2 bg-cyan-400 px-1.5 py-0.5 rounded text-[10px] font-bold text-black uppercase">div.container</div>
      <div className="w-3/4 h-12 border border-dashed border-white/20 rounded flex items-center justify-center gap-2">
        <div className="w-1/3 h-6 bg-white/5 border border-white/10 rounded" />
        <div className="w-1/3 h-6 bg-white/5 border border-white/10 rounded" />
      </div>
      <div className="absolute inset-0 bg-cyan-400/5 pointer-events-none" />
    </div>
  </PreviewBox>
);

const CommandPalettePreview = () => (
  <PreviewBox>
    <div className="w-full max-w-[200px] bg-neutral-900 border border-white/10 rounded-lg shadow-2xl p-2 space-y-1">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded border border-white/10">
        <Zap className="w-3 h-3 text-cyan-400" />
        <div className="w-full h-2 bg-white/20 rounded" />
      </div>
      <div className="px-2 py-1.5 flex justify-between items-center opacity-40">
        <div className="w-2/3 h-2 bg-white/10 rounded" />
        <div className="w-8 h-2 bg-white/10 rounded" />
      </div>
    </div>
  </PreviewBox>
);

const features = [
  {
    title: 'DOM & Component Inspector',
    description: 'Deep visual auditing for React, Vue, and Svelte. Inspect spacing, computed CSS, and accessibility tree with zero layout shift.',
    header: <DOMInspectorPreview />,
    icon: <Blocks className="h-5 w-5 text-brand-purple" />,
    className: 'md:col-span-2',
  },
  {
    title: '3D Z-Index View',
    description: 'Visualize stacking contexts in interactive 3D. Debug overlap issues and z-index wars with ease.',
    header: <PreviewBox className="bg-gradient-to-br from-brand-amber/5 to-transparent"><Layers className="w-16 h-16 text-brand-amber/20" /></PreviewBox>,
    icon: <Layers className="h-5 w-5 text-brand-amber" />,
    className: 'md:col-span-1',
  },
  {
    title: 'Command Palette',
    description: 'Press Ctrl+Shift+P to search and trigger any of the 39 tools instantly. VS Code style productivity for the browser.',
    header: <CommandPalettePreview />,
    icon: <Zap className="h-5 w-5 text-brand-cyan" />,
    className: 'md:col-span-1',
  },
  {
    title: 'AI Smart Suggestions',
    description: 'One-click analysis of your entire page. Detect performance bottlenecks, a11y gaps, and SEO leaks with auto-fix suggestions.',
    header: <PreviewBox className="bg-gradient-to-tr from-brand-cyan/5 to-brand-purple/5"><Sparkles className="w-16 h-16 text-white/10 animate-pulse" /></PreviewBox>,
    icon: <Sparkles className="h-5 w-5 text-white" />,
    className: 'md:col-span-2',
  },
  {
    title: 'Visual Regression',
    description: 'Capture pixel-perfect baselines and compare changes over time. Never let a CSS regression slip through again.',
    header: <PreviewBox><div className="w-full h-full flex items-center justify-center gap-4"><div className="w-20 h-20 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl" /><div className="w-20 h-20 bg-brand-purple/10 border border-brand-purple/20 rounded-xl relative"><div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center text-[10px] font-black text-red-400">DIFF</div></div></div></PreviewBox>,
    icon: <Eye className="h-5 w-5 text-pink-400" />,
    className: 'md:col-span-2',
  },
  {
    title: 'Tech & Performance',
    description: 'Detect frameworks, libraries, and core web vitals in real-time. Full site report generation with one click.',
    header: <PreviewBox><div className="flex flex-col items-center gap-2"><div className="text-5xl font-black text-brand-green">98</div><div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-2">Lighthouse Score</div></div></PreviewBox>,
    icon: <Database className="h-5 w-5 text-brand-green" />,
    className: 'md:col-span-1',
  },
];

export const FeatureBento = () => {
  return (
    <section id="features" className="py-48 relative z-10 px-6 overflow-hidden bg-[#000]">
      <div className="absolute inset-0 bg-grid opacity-5" />

      <div className="max-w-7xl mx-auto mb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="text-xs-technical text-neutral-500">Core Engine</span>
          </div>
          <h2 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
            Everything you need <br /> to ship <span className="text-neutral-700">elite code.</span>
          </h2>
          <p className="text-neutral-500 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
            Deep visual auditing for modern web applications. Identify bottlenecks,
            leaks, and accessibility gaps with surgical precision.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[18rem]">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`group glass-card glass-card-hover p-8 flex flex-col justify-between relative overflow-hidden ${feature.className}`}
          >
             {/* Card Header/Icon */}
             <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                   {feature.icon}
                </div>
                <div className="text-xs-technical text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity">
                   Reference: {i + 1}
                </div>
             </div>

             {/* Card Content */}
             <div className="relative z-10">
                <h3 className="text-xl font-black text-white mb-2 tracking-tight uppercase italic">{feature.title}</h3>
                <p className="text-sm font-bold text-neutral-500 leading-relaxed max-w-[280px]">
                   {feature.description}
                </p>
             </div>

             {/* Subtle Decorative Element */}
             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-brand-cyan/5 transition-colors" />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeatureBento;
