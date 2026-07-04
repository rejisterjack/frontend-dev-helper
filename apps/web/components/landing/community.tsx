"use client";

import { motion } from "framer-motion";
import { Star, GitFork, Users, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";

const GITHUB_URL = "https://github.com/rejisterjack/frontend-dev-helper";

// Pulled from the public repo. Update periodically — small static file, no
// client-side GitHub API call needed.
const stats = [
  { icon: Star, label: "GitHub stars", value: "320+" },
  { icon: GitFork, label: "Forks", value: "24" },
  { icon: Users, label: "Contributors", value: "7" },
];

export function Community() {
  return (
    <section id="community" className="section-y">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid items-center gap-12 md:grid-cols-2 md:gap-16"
        >
          <div>
            <SectionHeading
              eyebrow="Open source"
              title={
                <>
                  Built in the open.{" "}
                  <span className="text-text-muted">
                    Maintained with the community.
                  </span>
                </>
              }
              lead="MIT-licensed, no telemetry, no company. Star the repo, file an issue, or send a PR — every contribution is welcome."
            />
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line-subtle bg-bg-elevated px-5 text-sm font-medium text-text-primary transition-colors hover:border-line"
              >
                Star on GitHub
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={`${GITHUB_URL}/discussions`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Join Discussions
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>

          <motion.dl
            variants={fadeUp}
            className="grid grid-cols-3 gap-3 sm:gap-4"
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-line-subtle bg-bg-elevated p-5 text-center sm:p-6"
                >
                  <Icon
                    className="mx-auto mb-3 h-5 w-5 text-text-muted"
                    strokeWidth={1.75}
                  />
                  <dd className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-1">
                    <Eyebrow>{stat.label}</Eyebrow>
                  </dt>
                </div>
              );
            })}
          </motion.dl>
        </motion.div>
      </Container>
    </section>
  );
}

export default Community;
