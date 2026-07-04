"use client";

import { motion } from "framer-motion";
import { Check, X, AlertTriangle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

type Cell = boolean | "limited" | "separate";
type Row = {
  feature: string;
  fdh: Cell;
  pesticide: Cell;
  visbug: Cell;
  other: Cell;
};

// Trimmed to ~12 high-signal rows (was 28 — too much noise).
const rows: Row[] = [
  {
    feature: "DOM Outliner",
    fdh: true,
    pesticide: true,
    visbug: true,
    other: "separate",
  },
  {
    feature: "Spacing Visualizer",
    fdh: true,
    pesticide: false,
    visbug: true,
    other: "separate",
  },
  {
    feature: "Color Picker + Palette",
    fdh: true,
    pesticide: false,
    visbug: true,
    other: "separate",
  },
  {
    feature: "Pixel Ruler (px + rem)",
    fdh: true,
    pesticide: false,
    visbug: true,
    other: "separate",
  },
  {
    feature: "CSS Inspector (11 cats)",
    fdh: true,
    pesticide: false,
    visbug: "limited",
    other: false,
  },
  {
    feature: "3D Z-Index View",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: false,
  },
  {
    feature: "Accessibility Audit",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: "separate",
  },
  {
    feature: "Contrast WCAG AA/AAA",
    fdh: true,
    pesticide: false,
    visbug: "limited",
    other: "separate",
  },
  {
    feature: "Performance Flame Graph",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: false,
  },
  {
    feature: "Network Analyzer",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: "separate",
  },
  {
    feature: "Command Palette",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: false,
  },
  {
    feature: "AI Suggestions + Fixes",
    fdh: true,
    pesticide: false,
    visbug: false,
    other: false,
  },
];

function Status({ value }: { value: Cell }) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-success" strokeWidth={2.5} />;
  }
  if (value === false) {
    return <X className="mx-auto h-4 w-4 text-text-muted" strokeWidth={2} />;
  }
  const label = value === "limited" ? "Limited" : "Separate ext";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
      {label}
    </span>
  );
}

export function ComparisonTable() {
  return (
    <section
      id="comparison"
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
            eyebrow="The difference"
            title={
              <>
                One extension vs.{" "}
                <span className="text-text-muted">twelve.</span>
              </>
            }
            lead="The features most engineers actually reach for — and which legacy tools provide them."
          />

          {/* Desktop: table. Mobile: stacked cards. */}
          <motion.div
            variants={fadeUp}
            className="mt-12 hidden overflow-hidden rounded-2xl border border-line-subtle bg-bg-elevated md:block"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-subtle bg-bg-subtle/60">
                  <th className="p-4 text-left">
                    <Eyebrow>Capability</Eyebrow>
                  </th>
                  <th className="bg-brand-cyan/[0.06] p-4 text-center">
                    <span className="text-sm font-semibold text-text-primary">
                      FrontendDevHelper
                    </span>
                  </th>
                  <th className="p-4 text-center">
                    <Eyebrow>Pesticide</Eyebrow>
                  </th>
                  <th className="p-4 text-center">
                    <Eyebrow>VisBug</Eyebrow>
                  </th>
                  <th className="p-4 text-center">
                    <Eyebrow>Others</Eyebrow>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-line-subtle last:border-0 transition-colors hover:bg-bg-subtle/40"
                  >
                    <td className="p-4 text-sm text-text-secondary">
                      {row.feature}
                    </td>
                    <td className="bg-brand-cyan/[0.04] p-4 text-center">
                      <Status value={row.fdh} />
                    </td>
                    <td className="p-4 text-center">
                      <Status value={row.pesticide} />
                    </td>
                    <td className="p-4 text-center">
                      <Status value={row.visbug} />
                    </td>
                    <td className="p-4 text-center">
                      <Status value={row.other} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile: accordion-style cards */}
          <motion.div variants={fadeUp} className="mt-12 space-y-2 md:hidden">
            {rows.map((row) => (
              <div
                key={row.feature}
                className="rounded-xl border border-line-subtle bg-bg-elevated p-4"
              >
                <p className="mb-3 text-sm font-medium text-text-primary">
                  {row.feature}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt className="text-text-muted">FrontendDevHelper</dt>
                  <dd className="text-right">
                    <Status value={row.fdh} />
                  </dd>
                  <dt className="text-text-muted">Pesticide</dt>
                  <dd className="text-right">
                    <Status value={row.pesticide} />
                  </dd>
                  <dt className="text-text-muted">VisBug</dt>
                  <dd className="text-right">
                    <Status value={row.visbug} />
                  </dd>
                  <dt className="text-text-muted">Others</dt>
                  <dd className="text-right">
                    <Status value={row.other} />
                  </dd>
                </dl>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

export default ComparisonTable;
