"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Package } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const DOWNLOAD_URL =
  "https://github.com/rejisterjack/frontend-dev-helper/releases";
const GITHUB_URL = "https://github.com/rejisterjack/frontend-dev-helper";

const steps = [
  {
    n: "01",
    title: "Download the release",
    body: "Grab the latest build ZIP from GitHub Releases. Always the most current version.",
  },
  {
    n: "02",
    title: "Enable Developer Mode",
    body: 'Open chrome://extensions and toggle "Developer mode" in the top-right corner.',
  },
  {
    n: "03",
    title: "Load unpacked",
    body: 'Extract the ZIP, click "Load unpacked", and select the extracted folder. Done.',
  },
];

export function CTASection() {
  return (
    <section id="install" className="section-y border-t border-line-subtle">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto max-w-2xl text-center"
          >
            <Eyebrow tone="brand">Install in 60 seconds</Eyebrow>
            <h2 className="section-heading mt-4">Ready when you are.</h2>
            <p className="mt-5 text-lg leading-relaxed text-text-tertiary">
              No accounts, no subscriptions, no tracking. Download the extension
              from GitHub and load it in Chrome, Edge, or Brave. Chrome Web
              Store listing coming soon.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                href={DOWNLOAD_URL}
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (typeof window.plausible === "function") {
                    window.plausible("download_click", {
                      props: { source: "final-cta" },
                    });
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download latest release
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                href={GITHUB_URL}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Package className="h-4 w-4" />
                View source
              </Button>
            </div>
          </motion.div>

          <motion.ol
            variants={fadeUp}
            className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3 md:gap-5"
          >
            {steps.map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-line-subtle bg-bg-elevated p-6"
              >
                <span className="font-mono text-xs text-brand-cyan">
                  {step.n}
                </span>
                <h3 className="mt-3 text-base font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                  {step.body}
                </p>
              </li>
            ))}
          </motion.ol>
        </motion.div>
      </Container>
    </section>
  );
}

export default CTASection;
