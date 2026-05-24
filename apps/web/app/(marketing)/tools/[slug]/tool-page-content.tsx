'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { ToolPageData } from '@/data/tools';

export default function ToolPageContent({
  tool,
  relatedTools,
}: {
  tool: ToolPageData;
  relatedTools: ToolPageData[];
}) {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-cyan-400 transition-colors mb-8 inline-block"
          >
            &larr; All Tools
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
          >
            {tool.name}
          </motion.h1>
          <p className="text-xl text-neutral-400 mb-4 font-medium">
            {tool.tagline}
          </p>
          <p className="text-neutral-500 leading-relaxed max-w-2xl">
            {tool.description}
          </p>
          <div className="flex gap-4 mt-8">
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-sm inline-flex items-center gap-2"
            >
              Install Free <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="px-6 py-3 rounded-2xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#050505]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-16">
            Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {tool.features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-8"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Check className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-16">
            How It Works
          </h2>
          <div className="space-y-12">
            {tool.howItWorks.map((step, i) => (
              <div key={i} className="flex gap-8">
                <div className="text-5xl font-black text-neutral-800">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-neutral-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#050505]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-16">
            FAQ
          </h2>
          <div className="space-y-8">
            {tool.faq.map((item, i) => (
              <div key={i}>
                <h3 className="text-lg font-bold text-white mb-3">
                  {item.question}
                </h3>
                <p className="text-neutral-400 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-white mb-12">
              Related Tools
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedTools.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 transition-colors group"
                >
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-sm text-neutral-500">{t.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
