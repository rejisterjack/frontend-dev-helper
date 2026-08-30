"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Tools", href: "#tools" },
  { label: "Compare", href: "/compare" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "#faq" },
];

const DOWNLOAD_URL =
  "https://github.com/rejisterjack/frontend-dev-helper/releases";
const GITHUB_URL = "https://github.com/rejisterjack/frontend-dev-helper";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-normal ease-out-quart ${
        scrolled
          ? "border-b border-line-subtle bg-bg-base/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <Container>
        <nav className="flex h-16 items-center justify-between md:h-18">
          <Link
            href="/"
            aria-label="FrontendDevHelper home"
            className="flex items-center gap-2.5"
          >
            <Logo size={28} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button href={GITHUB_URL} variant="ghost" size="sm">
              GitHub
            </Button>
            <Button
              href={DOWNLOAD_URL}
              size="sm"
              onClick={() => {
                if (typeof window.plausible === "function") {
                  window.plausible("download_click", {
                    props: { source: "nav" },
                  });
                }
              }}
            >
              Download
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-subtle bg-bg-elevated text-text-secondary md:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </nav>
      </Container>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-line-subtle bg-bg-base md:hidden"
          >
            <Container>
              <div className="flex flex-col gap-1 py-4">
                {navLinks.map((link) =>
                  link.href.startsWith("/") ? (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  ),
                )}
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    href={DOWNLOAD_URL}
                    onClick={() => setMobileOpen(false)}
                  >
                    Download
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    href={GITHUB_URL}
                    variant="secondary"
                    onClick={() => setMobileOpen(false)}
                  >
                    View on GitHub
                  </Button>
                </div>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
