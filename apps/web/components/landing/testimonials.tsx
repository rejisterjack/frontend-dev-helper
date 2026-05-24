'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, Github, MessageSquare, GitFork, Users } from 'lucide-react';

const communityHighlights = [
  {
    quote: 'Replaces 8-12 separate extensions — DOM Outliner, Color Picker, CSS Inspector, Spacing Visualizer, and 35 more tools in a single, performant extension.',
    source: 'Core Capability',
    handle: '39 Tools · Zero Bloat',
    color: 'border-cyan-500/20 bg-cyan-500/[0.02]',
    accent: 'text-cyan-400',
  },
  {
    quote: 'Visualize z-index stacking order in 3D, debug Flex and Grid layouts interactively, and inspect computed CSS properties by category.',
    source: 'Layout Debugging',
    handle: 'CSS & Layout Tools',
    color: 'border-purple-500/20 bg-purple-500/[0.02]',
    accent: 'text-purple-400',
  },
  {
    quote: 'Manifest V3 certified, zero telemetry, no data collection. Fully open source under the MIT License — inspect every line of code yourself.',
    source: 'Security & Privacy',
    handle: 'Trust-First Architecture',
    color: 'border-pink-500/20 bg-pink-500/[0.02]',
    accent: 'text-pink-400',
  },
  {
    quote: 'Built with strict TypeScript, modular architecture, 82+ test files across unit, integration, E2E, security, and visual regression suites.',
    source: 'Engineering Quality',
    handle: 'Production-Grade Code',
    color: 'border-blue-500/20 bg-blue-500/[0.02]',
    accent: 'text-blue-400',
  },
  {
    quote: 'WCAG AA/AAA compliance checking, ARIA validation, focus order debugging, color contrast analysis, and a dedicated accessibility audit panel.',
    source: 'Accessibility Toolkit',
    handle: 'WCAG 2.1 + ARIA',
    color: 'border-emerald-500/20 bg-emerald-500/[0.02]',
    accent: 'text-emerald-400',
  },
  {
    quote: 'AI-powered suggestions detect 50+ patterns across accessibility, performance, SEO, and security — with one-click auto-fixes for common issues.',
    source: 'Smart Analysis',
    handle: 'AI-Powered Fixes',
    color: 'border-orange-500/20 bg-orange-500/[0.02]',
    accent: 'text-orange-400',
  },
];

const communityStats = [
  { icon: Github, label: 'Open Source', value: 'MIT License' },
  { icon: GitFork, label: 'Contributors', value: 'Growing' },
  { icon: Users, label: 'Community', value: 'GitHub Discussions' },
  { icon: MessageSquare, label: 'Support', value: 'GitHub Issues' },
];

export default function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="testimonials" className="py-40 relative overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 bg-grid opacity-10 -z-10" />
      <div className="max-w-7xl mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-32"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md">
            <Github className="w-5 h-5 text-neutral-500" />
            <span className="text-sm font-black text-neutral-500 uppercase tracking-widest">Community Feedback</span>
          </div>
          <h2 className="text-5xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85]">
            Built in the <span className="text-neutral-700 font-black">Open.</span>
          </h2>
          <p className="text-neutral-400 text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
            FrontendDevHelper is open source and built with the community.
            Every feature, every fix, and every improvement is done in public.
          </p>
        </motion.div>

        {/* Community stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24"
        >
          {communityStats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
              <stat.icon className="w-5 h-5 text-neutral-500" />
              <span className="text-sm font-black text-white">{stat.value}</span>
              <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Community feedback grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communityHighlights.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`p-8 rounded-[2rem] border ${item.color} hover:bg-white/[0.03] transition-all relative group`}
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 text-neutral-700 fill-neutral-700" />
                ))}
              </div>

              <p className="text-neutral-300 text-base font-bold leading-relaxed mb-8 italic">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${item.accent} uppercase tracking-widest`}>
                  {item.source}
                </span>
                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                  {item.handle}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-24 text-center space-y-4"
        >
          <p className="text-neutral-600 text-sm font-bold uppercase tracking-widest">
            Share your experience &rarr; help shape the roadmap
          </p>
          <a
            href="https://github.com/rejisterjack/frontend-dev-helper"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all text-sm font-black text-white uppercase tracking-widest group"
          >
            <Github className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
            Star & Contribute on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
