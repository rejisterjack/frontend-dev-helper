import type { Metadata } from "next";
import Link from "next/link";
import { allComparisons } from "@/data/comparisons";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Comparisons — Honest Alternatives | FrontendDevHelper",
  description:
    "Honest, feature-by-feature comparisons between FrontendDevHelper and the popular tools it can replace: Pesticide, WhatFont, ColorZilla, WAVE, axe DevTools, VisBug, React DevTools.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndexPage() {
  return (
    <section className="pb-20 pt-32 md:pt-40">
      <Container>
        <div className="max-w-3xl">
          <Eyebrow tone="brand">Comparisons</Eyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
            Honest alternatives, feature by feature.
          </h1>
          <p className="mt-5 text-lg text-text-tertiary">
            Every popular tool below is genuinely good at its job. These
            comparisons lay out where each one wins and where a consolidated
            toolkit makes more sense — no fake superiority.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {allComparisons.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`}>
              <Card variant="interactive" className="h-full p-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  {c.name} alternative
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                  {c.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-brand-cyan">
                  Compare <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
