"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TOOL_COUNT } from "@/data/tools";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const faqs = [
  {
    question: "Is FrontendDevHelper free?",
    answer: `Yes — completely free and open source under the MIT License. All ${TOOL_COUNT} tools, AI suggestions, and features are available at no cost. No paid tiers, no subscriptions, no hidden fees.`,
  },
  {
    question: "Does it work on Manifest V3?",
    answer:
      "Yes. FrontendDevHelper was built for Manifest V3 from day one. Unlike legacy Manifest V2 extensions that browsers are now disabling, this toolkit is fully compliant and optimized for the modern security model.",
  },
  {
    question: "Which browsers are supported?",
    answer:
      'Chrome (91+), Brave, and Edge via GitHub releases. Firefox is available on the Firefox Add-ons store (AMO). The Chrome Web Store listing is coming soon — install via the "Load unpacked" method in the meantime.',
  },
  {
    question: "Why does it need access to all URLs?",
    answer:
      'Visual debugging tools have to run on whichever site you are inspecting — that requires host access to all URLs. The "scripting" permission is needed to inject overlays into pages. We request only what the tools need, everything runs locally, and the source is on GitHub for anyone to audit.',
  },
  {
    question: "Does the AI feature send my page data externally?",
    answer:
      "Only if you configure it. AI Suggestions use OpenRouter and require your own API key. Without a key, no AI feature activates. With one, page-derived content is sent to OpenRouter only when you explicitly trigger a scan. You can disable AI entirely in settings, or use a local model.",
  },
  {
    question: "Does it collect any usage data or telemetry?",
    answer:
      "Zero. All tool processing happens locally in your browser. No default telemetry, no analytics, no data collection. The extension does not phone home.",
  },
  {
    question: "How is this different from Chrome DevTools?",
    answer:
      "They complement each other. DevTools is for deep source and network debugging. FrontendDevHelper is for visual crafting — on-page overlays, 3D visualizations, keyboard-first workflows, and designer-centric audits that DevTools does not provide as a cohesive experience.",
  },
  {
    question: "Can I use it with React, Vue, Angular, or Svelte?",
    answer:
      "Yes. The Component Tree tool automatically detects and visualizes hierarchies for React, Vue, Angular, and Svelte — inspect props, view reactive state, and highlight components in the DOM. All other overlay tools work on any site regardless of framework.",
  },
  {
    question: "Does it work on SPAs, Shadow DOM, or iframes?",
    answer:
      "Most tools work on any page including SPAs. Shadow DOM and cross-origin iframes have inherent browser security restrictions that limit some overlays — see the docs for what degrades gracefully.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line-subtle last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-text-primary">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-normal ease-out-quart ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-text-tertiary">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="section-y border-t border-line-subtle">
      <Container size="narrow">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered."
            align="center"
          />

          <motion.div variants={fadeUp} className="mt-12">
            {faqs.map((f) => (
              <FAQItem key={f.question} q={f.question} a={f.answer} />
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-10 text-center text-sm text-text-muted"
          >
            Still curious?{" "}
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-cyan underline-offset-4 hover:underline"
            >
              Open an issue on GitHub
            </a>
            .
          </motion.p>
        </motion.div>
      </Container>
    </section>
  );
}

export default FAQSection;
