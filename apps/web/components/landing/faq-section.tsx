"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { landingFaqs } from "@/data/landing-faq";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const faqs = landingFaqs;


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
