'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Download, Wrench, Github, ExternalLink, Shield, CheckCircle2, Package } from 'lucide-react';

const installSteps = [
  {
    step: '01',
    title: 'Download the Release',
    description: 'Grab the latest build ZIP from GitHub Releases — always the most current version.',
    action: {
      label: 'View GitHub Releases',
      href: 'https://github.com/rejisterjack/frontend-dev-helper/releases',
    },
  },
  {
    step: '02',
    title: 'Enable Developer Mode',
    description: 'Open Chrome and go to chrome://extensions. Toggle "Developer mode" in the top-right corner.',
    action: null,
  },
  {
    step: '03',
    title: 'Load Unpacked',
    description: 'Extract the ZIP, click "Load unpacked", and select the extracted folder. Done.',
    action: null,
  },
];

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="download" className="py-40 relative overflow-hidden bg-[#000]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/[0.08] rounded-full blur-[200px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/[0.04] rounded-full blur-[180px]" />
      </div>

      <div className="max-w-6xl mx-auto text-center relative px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-12">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-black text-green-300 uppercase tracking-widest">100% Free & Open Source &middot; MIT License</span>
          </div>

          <h2 className="text-5xl md:text-9xl font-black mb-10 tracking-tighter leading-[0.85] text-white">
            Stop Waiting. <br /> Start{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Building.
            </span>
          </h2>

          <p className="text-neutral-400 text-xl md:text-2xl max-w-3xl mx-auto mb-16 font-medium leading-relaxed">
            No accounts, no subscriptions, no tracking. Download the extension from GitHub
            and load it in Chrome in under 60 seconds.
          </p>

          {/* Chrome Web Store notice */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-yellow-500/[0.05] border border-yellow-500/20 backdrop-blur-xl">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm font-bold text-yellow-400/80 tracking-tight">
                Chrome Web Store listing coming soon — install via GitHub in the meantime
              </span>
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-white text-black px-14 py-6 text-2xl font-black rounded-full hover:bg-neutral-200 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.2)] ring-8 ring-white/5 active:scale-95 inline-flex items-center gap-3"
              onClick={() => {
                if (typeof (window as any).plausible === 'function') {
                  (window as any).plausible('download_click', { props: { source: 'cta_bottom' } });
                }
              }}
            >
              <Download className="w-6 h-6" />
              Download from GitHub
              <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
            </a>

            <a
              href="https://github.com/rejisterjack/frontend-dev-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-6 text-xl font-black text-white border border-white/10 rounded-full bg-white/[0.03] hover:bg-white/[0.08] transition-all backdrop-blur-xl inline-flex items-center gap-3"
            >
              <Github className="w-5 h-5" />
              View Source
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-8 text-[12px] text-neutral-500 font-black uppercase tracking-widest mb-24">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Zero Telemetry
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Manifest V3 Native
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Local-First Processing
            </div>
          </div>

          {/* Install steps */}
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-black text-neutral-600 uppercase tracking-widest mb-8 text-center">
              Manual installation guide
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {installSteps.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-left group hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-4xl font-black text-white/[0.06] group-hover:text-white/[0.1] transition-colors block mb-4">
                    {item.step}
                  </span>
                  <h4 className="font-black text-white text-sm mb-2 uppercase tracking-tight">{item.title}</h4>
                  <p className="text-xs text-neutral-500 font-bold leading-relaxed mb-4">{item.description}</p>
                  {item.action && (
                    <a
                      href={item.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
                    >
                      {item.action.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
