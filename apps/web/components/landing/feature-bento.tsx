"use client";

import { motion } from "framer-motion";
import {
  Blocks,
  Layers,
  Command,
  Sparkles,
  Eye,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TOOL_COUNT } from "@/data/tools";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "cyan" | "violet" | "amber" | "green";
  span: "wide" | "default";
};

const features: Feature[] = [
  {
    icon: Blocks,
    title: "DOM & Component Inspector",
    description:
      "Inspect spacing, computed CSS, and the accessibility tree for React, Vue, and Svelte — without layout shift.",
    accent: "violet",
    span: "wide",
  },
  {
    icon: Layers,
    title: "3D Z-Index View",
    description:
      "Rotate and explore every stacking context on the page. End z-index wars in seconds, not hours.",
    accent: "amber",
    span: "default",
  },
  {
    icon: Command,
    title: "Command Palette",
    description: `⌘⇧P opens fuzzy search across all ${TOOL_COUNT} tools. VS Code-grade keyboard productivity, in the browser.`,
    accent: "cyan",
    span: "default",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions",
    description:
      "Bring your own API key. Detect 50+ a11y, performance, SEO, and best-practice patterns with one-click fixes.",
    accent: "cyan",
    span: "wide",
  },
  {
    icon: Eye,
    title: "Visual Regression",
    description:
      "Capture pixel-perfect baselines and diff every change. CSS regressions never ship again.",
    accent: "violet",
    span: "default",
  },
  {
    icon: Gauge,
    title: "Performance Profiler",
    description:
      "JS flame graph, network waterfall, and Core Web Vitals — live in the tab, exportable as a full site report.",
    accent: "green",
    span: "default",
  },
];

const accentMap = {
  cyan: "text-brand-cyan",
  violet: "text-brand-violet",
  amber: "text-warning",
  green: "text-success",
} as const;

export function FeatureBento() {
  return (
    <section id="features" className="section-y">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <SectionHeading
            eyebrow="Core features"
            title={
              <>
                Everything you need.{" "}
                <span className="text-text-muted">Nothing you don&apos;t.</span>
              </>
            }
            lead={`Six headline capabilities out of ${TOOL_COUNT}. Each one replaces a separate extension you used to juggle.`}
          />

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  className={`group rounded-2xl border border-line-subtle bg-bg-elevated p-6 transition-colors duration-normal ease-out-quart hover:border-line sm:p-8 ${
                    feature.span === "wide" ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line-subtle bg-bg-base">
                    <Icon
                      className={`h-5 w-5 ${accentMap[feature.accent]}`}
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-text-tertiary">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default FeatureBento;
