"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { TOOL_COUNT } from "@/data/tools";
import { EASE_OUT_QUART, fadeUp, staggerContainer } from "@/lib/motion";

const DOWNLOAD_URL =
  "https://github.com/rejisterjack/frontend-dev-helper/releases";
const GITHUB_URL = "https://github.com/rejisterjack/frontend-dev-helper";

const trustPoints = [
  "Zero telemetry",
  "No data collection",
  "MIT licensed",
  "Manifest V3",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 md:pt-44 md:pb-32">
      {/* Background: one accent glow + grid + fade. Refused the 3-stack glow +
          scanline + parallax from the old design — restraint. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-cyan/12 blur-[120px]" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-60" />
      </div>

      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeUp} className="flex justify-center">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line-subtle bg-bg-elevated/60 py-1.5 pl-2 pr-3 text-xs text-text-secondary backdrop-blur-md transition-colors hover:border-line hover:text-text-primary"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cyan/12 px-2 py-0.5 text-[11px] font-medium text-brand-cyan">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                v1.2.0
              </span>
              Open source on GitHub
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-8 text-balance text-5xl font-semibold tracking-[-0.03em] text-text-primary sm:text-6xl"
            style={{ lineHeight: 1.02 }}
          >
            Master your frontend craft.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-text-tertiary sm:text-xl"
          >
            {TOOL_COUNT} surgical debugging tools in one Manifest V3 browser
            extension. Replace the pile of zombie extensions with one fast,
            private, open-source toolkit.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              href={DOWNLOAD_URL}
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                if (typeof window.plausible === "function") {
                  window.plausible("download_click", {
                    props: { source: "hero" },
                  });
                }
              }}
            >
              Download for Chrome
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              href={GITHUB_URL}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-xs text-text-muted">
            Also works on Firefox, Edge, and Brave. Chrome Web Store listing
            coming soon — install via GitHub in the meantime.
          </motion.p>

          {/* Trust strip */}
          <motion.ul
            variants={fadeUp}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-muted"
          >
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-success"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Product mock — single subtle elevated card with the tool grid inside. */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, ease: EASE_OUT_QUART, delay: 0.3 }}
          className="perspective-1000 mx-auto mt-20 max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-line-subtle bg-bg-elevated shadow-elevated">
            {/* Mock browser top bar */}
            <div className="flex items-center gap-2 border-b border-line-subtle bg-bg-subtle px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <div className="ml-3 flex-1">
                <div className="h-5 max-w-md rounded-md bg-bg-base/60 px-3 py-0.5 font-mono text-[11px] text-text-muted">
                  localhost:3000/dashboard
                </div>
              </div>
            </div>
            {/* Mock extension panel */}
            <div className="grid grid-cols-4 gap-3 bg-bg-base p-6 sm:p-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="group flex aspect-square items-center justify-center rounded-lg border border-line-subtle bg-bg-elevated transition-colors hover:border-brand-cyan/40 hover:bg-brand-cyan/5"
                >
                  <div className="h-6 w-6 rounded-md bg-line-subtle transition-colors group-hover:bg-brand-cyan/60" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line-subtle bg-bg-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-line-subtle" />
                <div className="h-5 w-5 rounded-md bg-line-subtle" />
                <div className="h-5 w-5 rounded-md bg-line-subtle" />
              </div>
              <Eyebrow>{TOOL_COUNT} tools · active</Eyebrow>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export default Hero;
