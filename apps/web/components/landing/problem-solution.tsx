"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const problems = [
  "Twelve extensions, twelve UIs, twelve shortcut schemes.",
  "Open DevTools, three Firefox plugins, and a linter just to find one z-index conflict.",
  "Your a11y audit only runs in CI — after the PR is already open.",
];

const solutions = [
  "One extension, one palette, one shortcut system. ⌘⇧P anywhere.",
  "3D stacking-context view renders every layer at once — resolve overlaps in seconds.",
  "WCAG 2.1 + ARIA audit runs live in the tab, before you commit a line.",
];

export function ProblemSolution() {
  return (
    <section className="section-y relative overflow-hidden border-y border-line-subtle">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <SectionHeading
            eyebrow="Why FrontendDevHelper"
            title={
              <>
                Stop fighting your tools.{" "}
                <span className="text-text-muted">Start shipping.</span>
              </>
            }
            lead="The modern frontend workflow has fragmented into a pile of disconnected extensions. Each one adds another UI to learn, another tab to manage, another Manifest V2 zombie to keep alive."
          />

          <div className="mt-16 grid gap-6 md:grid-cols-2 md:gap-8">
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-line-subtle bg-bg-elevated p-6 sm:p-8"
            >
              <div className="mb-6 flex items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border border-danger/20 bg-danger/10 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-danger">
                  The reality
                </span>
              </div>
              <ul className="space-y-4">
                {problems.map((p) => (
                  <li key={p} className="flex gap-3 text-text-secondary">
                    <span
                      className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"
                      aria-hidden="true"
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/[0.04] p-6 shadow-glow-cyan sm:p-8"
            >
              <div className="mb-6 flex items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border border-brand-cyan/30 bg-brand-cyan/12 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-cyan">
                  The fix
                </span>
              </div>
              <ul className="space-y-4">
                {solutions.map((s) => (
                  <li key={s} className="flex gap-3 text-text-primary">
                    <span
                      className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-cyan/15 text-brand-cyan"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default ProblemSolution;
