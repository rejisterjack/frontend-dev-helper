'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Download,
  MousePointer,
  ToggleRight,
  Search,
  Zap,
  Eye,
  LayoutGrid,
} from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Install',
    description:
      'Download the latest release ZIP from GitHub and load it unpacked in Chrome or Brave. Firefox available on AMO.',
    icon: Download,
    color: 'from-brand-cyan to-brand-blue',
    bgColor: 'bg-brand-cyan/10',
    borderColor: 'border-brand-cyan/20',
    shadowColor: 'shadow-brand-cyan/10',
    textColor: 'text-brand-cyan',
    glow: 'group-hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]',
  },
  {
    number: '02',
    title: 'Open',
    description:
      'Access via popup, Command Palette (Ctrl+Shift+P), DevTools panel, or right-click context menu.',
    icon: MousePointer,
    color: 'from-brand-blue to-brand-purple',
    bgColor: 'bg-brand-blue/10',
    borderColor: 'border-brand-blue/20',
    shadowColor: 'shadow-brand-blue/10',
    textColor: 'text-brand-blue',
    glow: 'group-hover:shadow-[0_0_30px_rgba(10,132,255,0.15)]',
  },
  {
    number: '03',
    title: 'Toggle',
    description:
      'Click any tool to activate an instant on-page overlay. Tools respect exclusivity rules and presets.',
    icon: ToggleRight,
    color: 'from-brand-purple to-pink-500',
    bgColor: 'bg-brand-purple/10',
    borderColor: 'border-brand-purple/20',
    shadowColor: 'shadow-brand-purple/10',
    textColor: 'text-brand-purple',
    glow: 'group-hover:shadow-[0_0_30px_rgba(176,38,255,0.15)]',
  },
  {
    number: '04',
    title: 'Inspect',
    description:
      'Visual debugging with real-time data. Export reports, copy CSS, capture screenshots, fix issues.',
    icon: Search,
    color: 'from-brand-green to-emerald-500',
    bgColor: 'bg-brand-green/10',
    borderColor: 'border-brand-green/20',
    shadowColor: 'shadow-brand-green/10',
    textColor: 'text-brand-green',
    glow: 'group-hover:shadow-[0_0_30px_rgba(48,209,88,0.15)]',
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="how-it-works"
      className="relative py-48 px-6 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-10 -z-10" />

      <div className="max-w-7xl mx-auto relative" ref={ref}>
        {/* Section Header */}
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 mb-10 backdrop-blur-md"
          >
            <Zap className="w-5 h-5 text-brand-cyan" />
            <span className="text-sm font-black text-brand-cyan uppercase tracking-widest">
              The Professional Workflow
            </span>
          </motion.div>

          <h2 className="text-5xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85]">
            Install to Insight <br/> In <span className="text-neutral-700 font-black">Seconds.</span>
          </h2>

          <p className="text-neutral-400 text-xl md:text-3xl max-w-5xl mx-auto font-medium leading-relaxed">
            Eliminating friction from the development cycle. Get professional tools
            that inject directly into your existing workflow.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-40">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group relative"
              >
                <div className="p-12 rounded-[3rem] border border-white/5 bg-surface-900/50 hover:bg-surface-800/80 transition-all duration-700 group-hover:-translate-y-4 shadow-2xl">
                  <div className="absolute top-10 right-10 text-7xl font-black text-white/[0.03] group-hover:text-white/[0.08] transition-colors">
                    {step.number}
                  </div>
                  <div className={`w-20 h-20 rounded-[1.8rem] ${step.bgColor} border ${step.borderColor} flex items-center justify-center mb-12 group-hover:scale-110 transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>
                    <Icon className={`w-10 h-10 ${step.textColor}`} />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-5 tracking-tight uppercase italic">{step.title}</h3>
                  <p className="text-neutral-500 font-bold text-xl leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Interactive Browser Demo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative max-w-6xl mx-auto perspective-1000"
        >
          <div className="absolute -inset-16 bg-gradient-to-b from-brand-cyan/20 via-brand-blue/10 to-transparent rounded-[4rem] blur-[120px] -z-10" />
          <div className="rounded-[3rem] border border-white/10 bg-surface-900 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] ring-1 ring-white/10">
            {/* Browser UI */}
            <div className="flex items-center justify-between px-10 py-7 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="flex gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                  <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <div className="h-10 w-[500px] rounded-xl bg-white/5 border border-white/5 flex items-center px-5 ml-6">
                  <div className="w-3 h-3 rounded-full bg-brand-green/40 mr-4" />
                  <span className="text-sm text-white/30 font-mono tracking-tight">localhost:3000/app/dashboard</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-[1rem] bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.2)]">
                <WrenchIcon className="w-6 h-6 text-brand-cyan" />
              </div>
            </div>

            {/* Simulated Debugging */}
            <div className="p-16 relative min-h-[500px] bg-gradient-to-br from-transparent to-brand-cyan/[0.02]">
              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-7 space-y-8">
                  <div className="h-14 bg-white/5 rounded-[1.5rem] w-3/4 border border-white/5" />
                  <div className="h-8 bg-white/5 rounded-full w-1/2 opacity-50" />
                  <div className="h-64 bg-white/[0.01] rounded-[3rem] border-2 border-dashed border-brand-cyan/20 flex items-center justify-center relative overflow-hidden group/box shadow-inner">
                    <div className="absolute inset-0 bg-brand-cyan/[0.02] group-hover/box:bg-brand-cyan/[0.05] transition-colors" />
                    <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-brand-cyan/30 to-brand-blue/30 rounded-3xl border border-brand-cyan/40 shadow-[0_0_50px_rgba(0,229,255,0.2)] flex items-center justify-center">
                       <LayoutGrid className="w-12 h-12 text-brand-cyan" />
                    </div>
                    {/* Dimension lines */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-brand-cyan/20 border border-brand-cyan/30 rounded-lg text-xs font-mono font-black text-brand-cyan shadow-xl uppercase">1200px</div>
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-cyan/20 border border-brand-cyan/30 rounded-lg text-xs font-mono font-black text-brand-cyan -rotate-90 shadow-xl uppercase">800px</div>
                  </div>
                </div>
                <div className="col-span-5 space-y-6">
                  <div className="h-full bg-white/[0.02] rounded-[3rem] border border-white/10 p-8 flex flex-col gap-6 shadow-2xl">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/5 flex items-center px-6 gap-4 group/item hover:bg-white/10 transition-colors cursor-pointer">
                         <div className={`w-3 h-3 rounded-full transition-all duration-500 ${i === 1 ? 'bg-brand-cyan shadow-[0_0_15px_rgba(0,229,255,1)] scale-125' : 'bg-white/10'}`} />
                         <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full bg-white/20 transition-all duration-1000 ${i === 1 ? 'w-3/4' : 'w-1/4'}`} />
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>

              {/* Floating Status Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 1.5 }}
                className="absolute top-16 right-16 p-8 rounded-[2.5rem] bg-surface-900/95 border border-white/10 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] w-80 ring-1 ring-white/10"
              >
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center shadow-xl">
                     <Eye className="w-7 h-7 text-brand-purple" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-neutral-500 uppercase tracking-widest mb-1">Active Tool</p>
                    <p className="text-lg font-black text-white italic tracking-tight">DOM OUTLINER</p>
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        transition={{ duration: 2, delay: 2 }}
                        className="h-full bg-gradient-to-r from-brand-purple to-pink-500"
                      />
                   </div>
                   <div className="flex justify-between text-[11px] font-black text-neutral-500 uppercase tracking-widest">
                      <span>Analyzing DOM</span>
                      <span className="text-brand-purple">85% Complete</span>
                   </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
