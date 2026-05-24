'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const detectionCategories = [
  {
    icon: ShieldCheck,
    label: 'Accessibility',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    examples: ['Missing alt text', 'Low contrast ratio', 'Focus trap detected', 'Unlabelled form field'],
  },
  {
    icon: Zap,
    label: 'Performance',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    examples: ['Large DOM size (2,400+ nodes)', 'Render-blocking script', 'Unoptimised images', 'Lazy-load candidates'],
  },
  {
    icon: Search,
    label: 'SEO',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    examples: ['Missing meta description', 'Heading hierarchy broken', 'Images without alt', 'No structured data'],
  },
  {
    icon: Eye,
    label: 'Best Practices',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    examples: ['Deprecated HTML element', 'Missing HTTPS', 'No doctype declaration', 'Console errors present'],
  },
];

const demoSuggestions = [
  {
    severity: 'error',
    category: 'Accessibility',
    title: '3 images missing alt text',
    fix: 'Add descriptive alt attributes',
    confidence: 98,
    color: 'border-red-500/30 bg-red-500/[0.03]',
    badge: 'bg-red-500/10 text-red-400',
    dot: 'bg-red-500',
  },
  {
    severity: 'warning',
    category: 'Performance',
    title: 'DOM has 3,240 nodes',
    fix: 'Implement virtual scrolling',
    confidence: 91,
    color: 'border-yellow-500/30 bg-yellow-500/[0.03]',
    badge: 'bg-yellow-500/10 text-yellow-400',
    dot: 'bg-yellow-500',
  },
  {
    severity: 'info',
    category: 'SEO',
    title: 'Meta description missing',
    fix: 'Add 150-char meta description',
    confidence: 100,
    color: 'border-blue-500/30 bg-blue-500/[0.03]',
    badge: 'bg-blue-500/10 text-blue-400',
    dot: 'bg-blue-500',
  },
];

export default function AISuggestionsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="ai-suggestions" className="py-40 relative overflow-hidden bg-[#000]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/[0.05] via-transparent to-transparent -z-10" />
      <div className="absolute inset-0 bg-grid opacity-5 -z-10" />

      <div className="max-w-7xl mx-auto px-6" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-black text-cyan-400 uppercase tracking-widest">
              AI-Powered Analysis
            </span>
          </div>
          <h2 className="text-5xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85]">
            One Click. <br />
            <span className="text-neutral-700">Every Issue Found.</span>
          </h2>
          <p className="text-neutral-400 text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
            AI Suggestions scans your entire page with 50+ detection patterns across
            accessibility, performance, SEO, and best practices — then offers one-click auto-fixes.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Live demo panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.01] overflow-hidden">
              {/* Panel header */}
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">AI Suggestions</p>
                    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                      3 issues detected
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                    Scan complete
                  </span>
                </div>
              </div>

              {/* Suggestions list */}
              <div className="p-6 space-y-3">
                {demoSuggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.12 }}
                    className={`p-5 rounded-2xl border ${s.color} group hover:brightness-110 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.badge}`}
                            >
                              {s.category}
                            </span>
                            <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                              {s.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-sm font-black text-white truncate">{s.title}</p>
                          <p className="text-xs text-neutral-500 font-bold mt-1">Fix: {s.fix}</p>
                        </div>
                      </div>
                      <button className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-colors whitespace-nowrap">
                        Auto-fix
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Panel footer */}
              <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <span className="text-xs font-black text-neutral-600 uppercase tracking-widest">
                  Powered by OpenRouter · Your API key
                </span>
                <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                  View all 50+ patterns
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Detection categories */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-6"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                50+ detection patterns across 4 categories
              </h3>
              <p className="text-neutral-500 font-bold leading-relaxed">
                Each pattern comes with a confidence score, impact rating, and — where possible — a one-click
                auto-fix that applies the correction directly to the page.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {detectionCategories.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className={`p-6 rounded-2xl border ${cat.bg} group hover:scale-[1.02] transition-transform`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                      <span className={`text-xs font-black uppercase tracking-widest ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {cat.examples.map((ex, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-neutral-500 font-bold">
                          <AlertTriangle className="w-3 h-3 shrink-0 text-neutral-700" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            {/* Privacy callout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <CheckCircle2 className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-white mb-1">Privacy-first AI</p>
                <p className="text-xs text-neutral-500 font-bold leading-relaxed">
                  AI features are opt-in. Bring your own OpenRouter API key. No page data leaves your
                  browser unless you explicitly trigger an analysis. You can use a local model too.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
