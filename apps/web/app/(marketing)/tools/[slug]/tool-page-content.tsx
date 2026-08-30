"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import Link from "next/link";
import type { ToolPageData } from "@/data/tools";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const DOWNLOAD_URL =
  "https://github.com/rejisterjack/frontend-dev-helper/releases";

export default function ToolPageContent({
  tool,
  relatedTools,
}: {
  tool: ToolPageData;
  relatedTools: ToolPageData[];
}) {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Breadcrumbs (matches BreadcrumbList JSON-LD) */}
      <section className="pt-24">
        <Container>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-text-secondary"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/#tools"
                  className="transition-colors hover:text-text-secondary"
                >
                  Tools
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-text-secondary">
                {tool.name}
              </li>
            </ol>
          </nav>
        </Container>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-10 md:pt-16">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-cyan/10 blur-[120px]" />
        </div>
        <Container>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All tools
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-3xl"
          >
            <Eyebrow tone="brand">Tool</Eyebrow>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl md:text-6xl">
              {tool.name}
            </h1>
            <p className="mt-5 text-lg text-text-tertiary">{tool.tagline}</p>
            <p className="mt-3 max-w-2xl leading-relaxed text-text-tertiary">
              {tool.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={DOWNLOAD_URL} size="lg">
                <Download className="h-4 w-4" />
                Install free
              </Button>
              <Button href="#features" variant="secondary" size="lg">
                See features
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* At a glance — self-contained passage for LLM extraction */}
      <section className="border-y border-line-subtle bg-bg-elevated/50">
        <Container>
          <div className="py-8 md:py-10">
            <p className="text-xs font-medium uppercase tracking-widest text-brand-cyan">
              At a glance
            </p>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-text-secondary">
              {tool.name} is a visual debugging tool built into the free,
              open-source FrontendDevHelper browser extension. {tool.tagline}{" "}
              It runs entirely locally in the browser and works on any site,
              including localhost and production.
            </p>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section id="features" className="section-y border-y border-line-subtle">
        <Container>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <SectionHeading eyebrow="Features" title="What it does" />
            <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5">
              {tool.features.map((f) => (
                <motion.div key={f.title} variants={fadeUp}>
                  <Card className="h-full p-6 sm:p-7">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-cyan/20 bg-brand-cyan/10">
                      <Check
                        className="h-4 w-4 text-brand-cyan"
                        strokeWidth={2.5}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                      {f.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="section-y">
        <Container>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <SectionHeading eyebrow="How it works" title="Three steps." />
            <ol className="mt-12 space-y-6">
              {tool.howItWorks.map((step) => (
                <motion.li
                  key={step.step}
                  variants={fadeUp}
                  className="flex gap-5 sm:gap-7"
                >
                  <span className="shrink-0 font-mono text-2xl font-medium text-brand-cyan">
                    {step.step}
                  </span>
                  <div className="border-l border-line-subtle pl-5 sm:pl-7">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-1 leading-relaxed text-text-tertiary">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </motion.div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="section-y border-y border-line-subtle">
        <Container size="narrow">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <SectionHeading eyebrow="FAQ" title="Common questions." />
            <motion.div
              variants={fadeUp}
              className="mt-12 divide-y divide-line-subtle border-y border-line-subtle"
            >
              {tool.faq.map((item) => (
                <div key={item.question} className="py-5">
                  <h3 className="text-base font-medium text-text-primary">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                    {item.answer}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <section className="section-y">
          <Container>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <SectionHeading eyebrow="More tools" title="Related." />
              <div className="mt-12 grid gap-4 sm:grid-cols-2 md:gap-5">
                {relatedTools.map((t) => (
                  <motion.div key={t.slug} variants={fadeUp}>
                    <Link href={`/tools/${t.slug}`}>
                      <Card
                        variant="interactive"
                        className="flex items-center justify-between p-5"
                      >
                        <div>
                          <h3 className="font-medium text-text-primary">
                            {t.name}
                          </h3>
                          <p className="mt-0.5 text-sm text-text-tertiary">
                            {t.tagline}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </Container>
        </section>
      )}
    </div>
  );
}
