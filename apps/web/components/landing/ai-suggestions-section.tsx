"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Gauge,
  Search,
  Eye,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

type Category = {
  icon: LucideIcon;
  label: string;
  patterns: string[];
  accent: "cyan" | "violet" | "amber" | "green";
};

const categories: Category[] = [
  {
    icon: ShieldCheck,
    label: "Accessibility",
    patterns: [
      "Missing alt text",
      "Low contrast ratio",
      "Focus trap detected",
      "Unlabelled form field",
    ],
    accent: "green",
  },
  {
    icon: Gauge,
    label: "Performance",
    patterns: [
      "Large DOM size",
      "Render-blocking script",
      "Unoptimized images",
      "Long task > 50ms",
    ],
    accent: "amber",
  },
  {
    icon: Search,
    label: "SEO",
    patterns: [
      "Missing meta description",
      "Broken heading hierarchy",
      "Images without alt",
      "No structured data",
    ],
    accent: "cyan",
  },
  {
    icon: Eye,
    label: "Best practices",
    patterns: [
      "Deprecated HTML",
      "Missing HTTPS",
      "No doctype",
      "Console errors",
    ],
    accent: "violet",
  },
];

const accentMap = {
  cyan: "text-brand-cyan",
  violet: "text-brand-violet",
  amber: "text-warning",
  green: "text-success",
} as const;

export function AISuggestionsSection() {
  return (
    <section
      id="ai-suggestions"
      className="section-y border-y border-line-subtle bg-bg-elevated/30"
    >
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <SectionHeading
            eyebrow="AI suggestions"
            title={
              <>
                One click.{" "}
                <span className="text-text-muted">Every issue surfaced.</span>
              </>
            }
            lead="Bring your own OpenRouter API key. FrontendDevHelper scans the page with 50+ detection patterns across four categories — and offers one-click fixes where it can."
          />

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={cat.label}
                  variants={fadeUp}
                  className="rounded-2xl border border-line-subtle bg-bg-elevated p-6 transition-colors duration-normal ease-out-quart hover:border-line sm:p-7"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-subtle bg-bg-base">
                      <Icon
                        className={`h-4 w-4 ${accentMap[cat.accent]}`}
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary">
                      {cat.label}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {cat.patterns.map((p) => (
                      <li
                        key={p}
                        className="flex items-center gap-2.5 text-sm text-text-tertiary"
                      >
                        <span
                          className="h-1 w-1 shrink-0 rounded-full bg-text-muted"
                          aria-hidden="true"
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex items-start gap-3 rounded-xl border border-line-subtle bg-bg-elevated p-5"
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <p className="text-sm leading-relaxed text-text-tertiary">
              <span className="font-medium text-text-secondary">
                Privacy-first by design.
              </span>{" "}
              AI features are opt-in. No page data leaves your browser unless
              you trigger a scan, and you can use a local model instead of
              OpenRouter if you prefer.
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

export default AISuggestionsSection;
