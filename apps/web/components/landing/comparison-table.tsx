'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, AlertTriangle, Trophy } from 'lucide-react';

const comparisons = [
  { feature: 'DOM Outliner', fdh: true, pesticide: true, visbug: true, other: 'separate' },
  { feature: 'Spacing Visualizer', fdh: true, pesticide: false, visbug: true, other: 'separate' },
  { feature: 'Font Inspector + Source', fdh: true, pesticide: false, visbug: 'limited', other: 'separate' },
  { feature: 'Color Picker + Palette', fdh: true, pesticide: false, visbug: true, other: 'separate' },
  { feature: 'Pixel Ruler (px + rem)', fdh: true, pesticide: false, visbug: true, other: 'separate' },
  { feature: 'Breakpoint Overlay', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'CSS Inspector (11 cats)', fdh: true, pesticide: false, visbug: 'limited', other: false },
  { feature: 'Contrast WCAG AA/AAA', fdh: true, pesticide: false, visbug: 'basic', other: 'separate' },
  { feature: 'Flex + Grid Visualizer', fdh: true, pesticide: false, visbug: 'limited', other: false },
  { feature: 'Z-Index + 3D View', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Tech Detector (20+)', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Accessibility Audit', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Site Report (JSON/PDF)', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Live CSS Editor', fdh: true, pesticide: false, visbug: 'limited', other: 'separate' },
  { feature: 'Screenshot + Annotate', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Animation Inspector', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Responsive Preview', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Design System Validator', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Network Analyzer', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Command Palette', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Storage Inspector', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'AI Suggestions + Fixes', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Component Tree', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Performance Flame Graph', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Focus Debugger', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Form Debugger', fdh: true, pesticide: false, visbug: false, other: false },
  { feature: 'Visual Regression', fdh: true, pesticide: false, visbug: false, other: 'separate' },
  { feature: 'Export & Reports', fdh: true, pesticide: false, visbug: false, other: false },
];

function StatusCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-400 mx-auto" />;
  }
  if (value === false) {
    return <X className="w-5 h-5 text-red-400/60 mx-auto" />;
  }
  if (value === 'limited') {
    return (
      <div className="flex items-center justify-center gap-1">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-yellow-400/80">Limited</span>
      </div>
    );
  }
  if (value === 'separate') {
    return (
      <div className="flex items-center justify-center gap-1">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-yellow-400/80">Separate ext</span>
      </div>
    );
  }
  return <span className="text-white/30">&mdash;</span>;
}

export default function ComparisonTable() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="comparison" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10 -z-10" />
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-black text-purple-300 uppercase tracking-widest">The Toolkit King</span>
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tight">
            Stop Settling for <span className="text-neutral-700">Less.</span>
          </h2>
          <p className="text-neutral-400 text-xl max-w-3xl mx-auto font-medium leading-relaxed">
            One extension replaces 12+ legacy tools. See how FrontendDevHelper
            destroys the fragmented status quo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="glass-card rounded-3xl overflow-hidden shadow-2xl border-white/5 ring-1 ring-white/10"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left p-6 text-xs font-black text-neutral-500 uppercase tracking-widest sticky left-0 bg-[#050505] z-10">
                    Professional Feature
                  </th>
                  <th className="text-center p-6 text-sm font-black text-cyan-400 bg-cyan-500/10 border-x border-white/5">
                    FrontendDevHelper
                  </th>
                  <th className="text-center p-6 text-xs font-black text-neutral-500 uppercase tracking-widest">
                    Pesticide
                  </th>
                  <th className="text-center p-6 text-xs font-black text-neutral-500 uppercase tracking-widest">
                    VisBug
                  </th>
                  <th className="text-center p-6 text-xs font-black text-neutral-500 uppercase tracking-widest">
                    Others
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparisons.map((row, i) => (
                  <motion.tr
                    key={row.feature}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.4 + i * 0.02 }}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="p-5 text-sm font-bold text-white/80 sticky left-0 bg-[#050505] z-10 group-hover:text-white transition-colors">
                      {row.feature}
                    </td>
                    <td className="p-5 bg-cyan-500/[0.05] border-x border-white/5">
                      <StatusCell value={row.fdh} />
                    </td>
                    <td className="p-5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <StatusCell value={row.pesticide} />
                    </td>
                    <td className="p-5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <StatusCell value={row.visbug} />
                    </td>
                    <td className="p-5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <StatusCell value={row.other} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary bar */}
          <div className="p-8 border-t border-white/10 bg-cyan-500/10 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-4 text-lg">
            <span className="font-black text-cyan-400 tracking-tight">39 PROFESSIONAL TOOLS</span>
            <span className="text-white/20 font-light">|</span>
            <span className="text-white/60 font-bold italic text-sm">ONE UNIFIED EXPERIENCE</span>
          </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
