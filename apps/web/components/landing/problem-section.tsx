'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Puzzle, Check, X, AlertTriangle, Layers } from 'lucide-react';

const comparisonData = [
  { feature: 'Tool Count', chrome: 'Built-in only', many: '8-12 extensions', fdh: '39 tools unified' },
  { feature: 'Manifest', chrome: 'N/A', many: 'V2 (deprecated)', fdh: 'V3 from day one' },
  { feature: 'On-page overlays', chrome: 'Limited', many: 'Fragmented', fdh: 'Unified toggles' },
  { feature: 'Keyboard workflow', chrome: 'DevTools only', many: 'Inconsistent', fdh: 'Command palette + shortcuts' },
  { feature: 'Updates', chrome: 'With Chrome', many: 'Inconsistent', fdh: 'One codebase, always current' },
];

export default function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="problem" className="section-padding relative">
      <div className="max-w-6xl mx-auto" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">The Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Extension Clutter Is{' '}
            <span className="text-gradient">Killing Your Flow</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            You have 8–12 separate browser extensions for visual debugging.
            Most are built on deprecated Manifest V2 and are now broken on modern browsers.
          </p>
        </motion.div>

        {/* Visual comparison */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Before: Cluttered */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-card p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Before</h3>
                <p className="text-sm text-white/40">12+ separate extensions</p>
              </div>
            </div>

            <div className="space-y-3">
              {['Color picker (broken on V3)', 'Ruler extension (outdated)', 'Pesticide (deprecated)', 'A11y checker (separate)', 'Screenshot tool (another one)', 'Font inspector (yet another)', '...and 6 more icons cluttering your toolbar'].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                >
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm text-white/60">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* After: Unified */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="glass-card p-6 lg:p-8 border-accent-cyan/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h3 className="font-semibold text-white">After</h3>
                <p className="text-sm text-white/40">One extension, everything</p>
              </div>
            </div>

            <div className="space-y-3">
              {['DOM Outliner with 18 element colors', 'Color Picker + palette extraction', 'Pixel Ruler (px + rem)', 'WCAG AA/AAA contrast checker', 'Flex/Grid visualizer', 'Z-Index 3D view', '...and 21 more powerful tools'].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/10"
                >
                  <Check className="w-4 h-4 text-accent-cyan shrink-0" />
                  <span className="text-sm text-white/80">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-white/40">Feature</th>
                  <th className="text-left p-4 text-sm font-medium text-white/40">Chrome DevTools</th>
                  <th className="text-left p-4 text-sm font-medium text-white/40">Many Extensions</th>
                  <th className="text-left p-4 text-sm font-medium text-accent-cyan">FrontendDevHelper</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="p-4 text-sm font-medium text-white/70">{row.feature}</td>
                    <td className="p-4 text-sm text-white/40">{row.chrome}</td>
                    <td className="p-4 text-sm text-white/40">{row.many}</td>
                    <td className="p-4 text-sm font-medium text-accent-cyan">{row.fdh}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
