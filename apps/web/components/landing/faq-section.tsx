'use client';

import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: 'Is FrontendDevHelper free?',
    answer:
      'Yes — completely free and open source under the MIT License. All 39 visual debugging tools, AI-powered suggestions, and every feature is available at no cost. No paid tiers, no subscriptions, no hidden fees. Free forever.',
  },
  {
    question: 'Does it work on Manifest V3?',
    answer:
      'Yes. FrontendDevHelper was architected for Manifest V3 from day one. Unlike legacy extensions that are now broken on modern browsers, this toolkit is fully compliant and optimized for modern security models with a single service worker and strict CSP.',
  },
  {
    question: 'Which browsers are supported?',
    answer:
      'Chrome (91+), Brave, and Edge via the GitHub releases page. Firefox is available now on the Firefox Add-ons store (AMO). The Chrome Web Store listing is coming soon — in the meantime, install via the manual "Load unpacked" method described in the install guide above.',
  },
  {
    question: 'Why does it need broad permissions like access to all URLs?',
    answer:
      'Visual debugging tools must run on whichever site you are inspecting — that requires host access to all URLs. The "scripting" permission is needed to inject overlay tools into pages. We request only what the tools actually need, and everything runs locally. You can review the full manifest and source code on GitHub.',
  },
  {
    question: 'Does the AI feature send my page data externally?',
    answer:
      'Only if you configure it. AI Suggestions are powered by OpenRouter, and you must provide your own API key in settings before any AI feature activates. When a key is set and you trigger an AI analysis, page-derived content (DOM structure, CSS values, etc.) is sent to OpenRouter. No page data is sent anywhere without your key and your explicit action. You can disable AI entirely in settings.',
  },
  {
    question: 'Does it collect any usage data or telemetry?',
    answer:
      'Zero. All tool processing happens locally in your browser. There is no default telemetry, no analytics tracking, no data collection. The extension does not phone home. Even if you use the AI feature, only the content you explicitly send to your configured AI provider leaves your browser.',
  },
  {
    question: 'How is this different from Chrome DevTools?',
    answer:
      'DevTools is for deep source and network debugging. FrontendDevHelper is for visual crafting. It provides on-page overlay tools, 3D visualizations, keyboard-first workflows, battery-in-one site reports, and designer-centric tools that DevTools does not offer as a cohesive experience. They complement each other — use DevTools for step debugging and profiling; use FrontendDevHelper for visual inspection, accessibility audits, and design system validation.',
  },
  {
    question: 'Can I use it with React, Vue, Angular, or Svelte?',
    answer:
      'Yes. The Component Tree tool automatically detects and visualizes hierarchies for React, Vue, Angular, and Svelte. You can inspect props, view reactive state, and highlight components directly in the DOM. All other overlay tools work on any website regardless of framework.',
  },
  {
    question: 'Does it work on SPAs, Shadow DOM, or iframes?',
    answer:
      'Most tools work on any page including single-page applications. Shadow DOM and cross-origin iframes have inherent browser security restrictions that limit some overlay tools — see the documentation on large-DOM and Shadow DOM behavior for details on what degrades gracefully.',
  },
];

function FAQItem({ faq, index }: { faq: (typeof faqs)[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-white/5 last:border-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="font-medium text-white/80 group-hover:text-white transition-colors pr-4">
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm text-white/50 leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="faq" className="py-40 relative overflow-hidden bg-[#000]">
      <div className="absolute inset-0 bg-grid opacity-10 -z-10" />
      <div className="max-w-5xl mx-auto px-6 relative" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-32"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md">
            <HelpCircle className="w-5 h-5 text-neutral-500" />
            <span className="text-sm font-black text-neutral-500 uppercase tracking-widest">Support</span>
          </div>
          <h2 className="text-5xl md:text-9xl font-black text-white mb-10 tracking-tighter leading-[0.85]">
            Got <span className="text-neutral-700 font-black">Questions?</span>
          </h2>
          <p className="text-neutral-400 text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
            Everything you need to know about the toolkit.
            For deeper technical questions, open an issue on GitHub.
          </p>
        </motion.div>

        <div className="grid gap-2">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-24 text-center"
        >
          <a
            href="https://github.com/rejisterjack/frontend-dev-helper/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all text-sm font-black text-white uppercase tracking-widest group"
          >
            <MessageCircle className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
            Ask on GitHub Issues
          </a>
        </motion.div>
      </div>
    </section>
  );
}
