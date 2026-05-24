'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const ProblemSolution = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-150, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="py-64 relative overflow-hidden bg-[#000] border-y border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-purple/10 via-black to-black -z-10" />

      <motion.div style={{ opacity }} className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-32">
          <h2 className="text-6xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85] text-balance">
            Web Dev is hard. <br />
            <span className="text-neutral-700">Until it isn't.</span>
          </h2>
          <p className="text-xl md:text-2xl text-neutral-500 max-w-3xl mx-auto font-medium">
            Fragmented extensions and legacy tools compound friction,
            turning a clean workflow into a sluggish nightmare.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start max-w-6xl mx-auto">
          {/* Problem Card */}
          <motion.div style={{ y: y1 }} className="space-y-6">
            <div className="glass-card p-10 border-red-500/20 bg-red-500/[0.02] relative overflow-hidden rounded-[2.5rem]">
              <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-xs px-4 py-2 rounded-bl-2xl font-black uppercase tracking-widest">
                The Reality
              </div>
              <h3 className="text-2xl font-black text-white mb-8 uppercase italic">The Daily Grind</h3>
              <ul className="space-y-5 text-neutral-500 font-bold">
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                  <span>Which z-index is winning? Open 3 extensions, cross-reference, still unsure.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                  <span>CSS change looks right on desktop. Mobile layout is broken. Debugging for hours.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                  <span>Accessibility audit failed in review. Found issues you could have seen before pushing.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1.5" />
                  <span>8 extensions, 8 UIs, 8 different shortcut systems — and 4 of them are Manifest V2 zombies.</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Solution Card */}
          <motion.div style={{ y: y2 }} className="space-y-6">
            <div className="glass-card p-10 border-brand-cyan/20 bg-brand-cyan/[0.02] relative overflow-hidden rounded-[2.5rem] shadow-[0_0_50px_rgba(0,229,255,0.1)]">
              <div className="absolute top-0 right-0 bg-brand-cyan/20 text-brand-cyan text-xs px-4 py-2 rounded-bl-2xl font-black uppercase tracking-widest">
                The Fix
              </div>
              <h3 className="text-2xl font-black text-white mb-8 uppercase italic">One Extension</h3>
              <ul className="space-y-5 text-neutral-400 font-bold">
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 shadow-[0_0_10px_rgba(0,229,255,1)] mt-1.5" />
                  <span>3D Z-Index view shows every stacking context at once — solved in seconds.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 shadow-[0_0_10px_rgba(0,229,255,1)] mt-1.5" />
                  <span>Responsive Preview with Tailwind & Bootstrap breakpoints. Side-by-side, synced scroll.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 shadow-[0_0_10px_rgba(0,229,255,1)] mt-1.5" />
                  <span>WCAG 2.1 + ARIA audit on every page load. Catch violations before code review.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan shrink-0 shadow-[0_0_10px_rgba(0,229,255,1)] mt-1.5" />
                  <span>One Command Palette. One UX. One Manifest V3 codebase. Zero overhead.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ProblemSolution;
