'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fadeUpStagger, containerVariants } from '@/lib/motion';
import { MagneticButton } from '@/components/ui/magnetic-button';
import {
  LayoutGrid,
  Eye,
  Zap,
  Move,
  Palette,
  Type,
  Layers,
  Sparkles,
} from 'lucide-react';

// Framework/CMS compatibility logos (text-based for zero external deps)
const compatibilityItems = [
  { label: 'React' },
  { label: 'Vue' },
  { label: 'Angular' },
  { label: 'Svelte' },
  { label: 'Next.js' },
  { label: 'Nuxt' },
  { label: 'WordPress' },
  { label: 'Webflow' },
  { label: 'Shopify' },
];

export const Hero = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent;
      const isMobileUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
      const isNarrowScreen = window.innerWidth < 768;
      setIsMobile(isMobileUA || isNarrowScreen);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  if (isMobile) {
    return (
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 bg-[#000]">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-cyan/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-lg mx-auto text-center z-10">
          <div className="mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan" />
            </span>
            <span className="text-xs-technical text-brand-cyan">Manifest V3 Certified</span>
          </div>

          <h1 className="text-5xl font-black tracking-tighter text-white mb-8 leading-[0.85]">
            Master Your <br />
            <span className="gradient-text">Frontend Craft.</span>
          </h1>

          <p className="text-neutral-500 text-lg mb-8 font-medium leading-relaxed">
            39 surgical debugging tools in one browser extension.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-brand-cyan" />
            </div>
            <h3 className="text-white font-black text-lg mb-2">Desktop Browser Required</h3>
            <p className="text-neutral-500 text-sm leading-relaxed mb-6">
              FrontendDevHelper is a browser extension. Open this page on Chrome, Firefox, or Edge to install.
            </p>

            {!submitted ? (
              <form onSubmit={handleMobileSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-brand-cyan/40"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-sm font-black"
                >
                  Remind Me
                </button>
              </form>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
                We'll send you a link to install on desktop.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Chrome', 'Firefox', 'Edge', 'Brave'].map((browser) => (
              <span key={browser} className="px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                {browser}
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-40 pb-32 overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[#000]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand-cyan/20 rounded-full blur-[140px] mix-blend-screen opacity-50" />
        <div className="absolute top-[10%] left-1/4 w-[600px] h-[600px] bg-brand-purple/10 rounded-full blur-[120px] opacity-30" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-grid-fade" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto text-center z-10 px-6"
      >
        <motion.div variants={fadeUpStagger} className="mb-12 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan" />
          </span>
          <span className="text-xs-technical text-brand-cyan">Manifest V3 Certified</span>
        </motion.div>

        <motion.h1
          variants={fadeUpStagger}
          className="text-7xl md:text-[10rem] font-black tracking-tighter text-white mb-12 leading-[0.8] text-balance"
        >
          Master Your <br />
          <span className="gradient-text">Frontend Craft.</span>
        </motion.h1>

        <motion.p
          variants={fadeUpStagger}
          className="text-xl md:text-2xl text-neutral-500 max-w-3xl mx-auto mb-16 font-medium leading-relaxed"
        >
          The most advanced visual debugging toolkit for professional engineers.
          39 surgical tools consolidated into one high-performance experience.
        </motion.p>

        <motion.div variants={fadeUpStagger} className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16">
          <MagneticButton
            onClick={() => {
              if (typeof (window as any).plausible === 'function') {
                (window as any).plausible('download_click', { props: { source: 'hero' } });
              }
              window.open('https://github.com/rejisterjack/frontend-dev-helper/releases', '_blank');
            }}
            className="bg-white text-black px-16 py-6 text-xl font-black rounded-full hover:bg-neutral-200 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.2)]"
          >
            Install Free for Chrome
          </MagneticButton>

          <div className="flex flex-col items-start px-6 border-l border-white/10">
            <div className="flex items-center gap-2 text-brand-amber text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
              Chrome Web Store
            </div>
            <span className="text-neutral-600 text-[10px] font-black uppercase tracking-widest mt-1">Coming Soon</span>
          </div>
        </motion.div>

        {/* Trust signals */}
        <motion.div variants={fadeUpStagger} className="flex flex-wrap items-center justify-center gap-6 mb-12">
          {[
            { label: 'Zero telemetry', detail: 'No usage tracking' },
            { label: 'No data collection', detail: 'Your code stays local' },
            { label: 'Open source', detail: 'MIT licensed' },
            { label: 'Manifest V3', detail: 'Latest standard' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.02]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{item.label}</span>
              <span className="text-[10px] font-bold text-neutral-600 hidden sm:inline">— {item.detail}</span>
            </div>
          ))}
        </motion.div>

        {/* Framework compatibility trust bar */}
        <motion.div variants={fadeUpStagger} className="mb-24">
          <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest text-center mb-6">
            Works on any site — React, Vue, Angular, Svelte, WordPress, and more
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {compatibilityItems.map((item) => (
              <span
                key={item.label}
                className="px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.02] text-xs font-black text-neutral-500 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
              >
                {item.label}
              </span>
            ))}
            <span className="px-4 py-2 rounded-full border border-dashed border-white/[0.06] text-xs font-black text-neutral-700 uppercase tracking-widest">
              + any website
            </span>
          </div>
        </motion.div>

        {/* Massive Perspective Mockup */}
        <motion.div
          variants={fadeUpStagger}
          className="relative max-w-6xl mx-auto perspective-1000 group"
        >
          <motion.div
            initial={{ rotateX: 15, y: 100, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative rounded-[3rem] border border-white/[0.08] bg-surface-900 overflow-hidden shadow-[0_64px_120px_-24px_rgba(0,0,0,1)] ring-1 ring-white/10 backface-hidden"
          >
            {/* UI Mockup Content */}
            <div className="aspect-[16/10] bg-[#020202] relative overflow-hidden">
               <div className="absolute inset-0 bg-grid opacity-10" />

               {/* Simulated Chrome Extension UI */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] glass-card rounded-[2rem] overflow-hidden border-white/10">
                  <div className="p-8 grid grid-cols-4 gap-4">
                     {[LayoutGrid, Eye, Palette, Move, Type, Layers, Zap, Sparkles].map((Icon, i) => (
                       <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group/icon hover:bg-brand-cyan/10 transition-colors">
                          <Icon className="w-6 h-6 text-neutral-500 group-hover/icon:text-brand-cyan transition-colors" />
                       </div>
                     ))}
                  </div>
                  <div className="px-8 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                     <div className="flex gap-1">
                        {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-white/5 border border-white/5" />)}
                     </div>
                     <span className="text-xs-technical text-neutral-600">v1.2.0 Active</span>
                  </div>
               </div>

               {/* Ambient Glows */}
               <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-brand-cyan/20 rounded-full blur-[100px]" />
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-brand-cyan/[0.03] to-transparent h-1/2 animate-scan" />
          </motion.div>

          {/* Floating Technical Badges */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 -right-8 glass-card px-8 py-4 rounded-2xl z-30 hidden lg:block border-brand-cyan/20 shadow-brand-cyan/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center border border-brand-cyan/20">
                 <Zap className="w-5 h-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-xs-technical text-neutral-500 mb-1">Response Time</p>
                <p className="text-lg font-black text-white leading-none">0.2ms</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 -left-12 glass-card px-8 py-4 rounded-2xl z-30 hidden lg:block border-brand-purple/20 shadow-brand-purple/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center border border-brand-purple/20">
                 <Layers className="w-5 h-5 text-brand-purple" />
              </div>
              <div>
                <p className="text-xs-technical text-neutral-500 mb-1">Stack Depth</p>
                <p className="text-lg font-black text-white leading-none">Infinite</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
