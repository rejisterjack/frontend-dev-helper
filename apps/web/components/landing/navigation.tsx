'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Wrench } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-4 bg-black/80 backdrop-blur-xl border-b border-white/5'
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all group-hover:scale-110 group-hover:rotate-3">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">
              Frontend<span className="text-neutral-500 font-bold">Dev</span>Helper
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-5 py-2 text-[13px] font-bold text-neutral-400 hover:text-white rounded-full hover:bg-white/5 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-8">
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-black text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              GitHub
            </a>
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-white text-black text-[13px] font-black rounded-full hover:bg-neutral-200 transition-all shadow-xl active:scale-95"
            >
              DOWNLOAD
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white border border-white/10"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-0 right-0 bg-[#050505] backdrop-blur-2xl border-b border-white/5"
          >
            <div className="px-6 py-8 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-4 text-lg font-black text-neutral-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://github.com/rejisterjack/frontend-dev-helper/releases"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block mt-6 px-6 py-5 bg-white text-black text-center font-black rounded-2xl text-xl"
              >
                Download Extension
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
