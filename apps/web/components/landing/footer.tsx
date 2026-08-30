"use client";

import Link from "next/link";
import { Github, MessageSquare, Bug, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { TOOL_COUNT } from "@/data/tools";

const GITHUB_URL = "https://github.com/rejisterjack/frontend-dev-helper";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features", external: false },
      { label: "All tools", href: "#tools", external: false },
      { label: "Comparison", href: "#comparison", external: false },
      { label: "Install", href: "#install", external: false },
      {
        label: "Changelog",
        href: `${GITHUB_URL}/blob/main/CHANGELOG.md`,
        external: true,
      },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "All tools", href: "/#tools", external: false },
      { label: "CSS Debugger", href: "/tools/css-debugger", external: false },
      {
        label: "Accessibility Checker",
        href: "/tools/accessibility-checker",
        external: false,
      },
      {
        label: "Performance Profiler",
        href: "/tools/performance-profiler",
        external: false,
      },
      { label: "Color Picker", href: "/tools/color-picker", external: false },
      { label: "DOM Inspector", href: "/tools/dom-inspector", external: false },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog", external: false },
      { label: "Comparisons", href: "/compare", external: false },
      { label: "Documentation", href: `${GITHUB_URL}#readme`, external: true },
      { label: "GitHub", href: GITHUB_URL, external: true },
      {
        label: "Contributing",
        href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`,
        external: true,
      },
      {
        label: "Firefox Add-ons",
        href: "https://addons.mozilla.org/en-US/firefox/addon/frontenddevhelper/",
        external: true,
      },
      { label: "Report a bug", href: `${GITHUB_URL}/issues`, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy", external: false },
      { label: "Terms of Service", href: "/terms", external: false },
      {
        label: "MIT License",
        href: `${GITHUB_URL}/blob/main/LICENSE`,
        external: true,
      },
    ],
  },
];

const socials = [
  { icon: Github, href: GITHUB_URL, label: "GitHub" },
  {
    icon: MessageSquare,
    href: `${GITHUB_URL}/discussions`,
    label: "Discussions",
  },
  { icon: Bug, href: `${GITHUB_URL}/issues`, label: "Issues" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line-subtle bg-bg-elevated/40">
      <Container>
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-6 md:gap-8">
          <div className="col-span-2 md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-tertiary">
              {TOOL_COUNT} visual debugging tools, one Manifest V3 extension.
              Free and open source under the MIT License.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-subtle bg-bg-elevated text-text-muted transition-colors hover:border-line hover:text-text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4">
                <Eyebrow>{col.title}</Eyebrow>
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-text-tertiary transition-colors hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-line-subtle py-6 text-xs text-text-muted sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} FrontendDevHelper. MIT Licensed.
          </p>
          <p className="font-mono">
            Manifest V3 · No telemetry · No data collection
          </p>
        </div>
      </Container>
    </footer>
  );
}
