'use client';

import { Github, FileText, Shield, Heart, Mail, Twitter, ExternalLink, Wrench as WrenchIcon } from 'lucide-react';
import Link from 'next/link';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Download', href: '#install-guide' },
      { label: 'Changelog', href: 'https://github.com/rejisterjack/frontend-dev-helper/blob/main/CHANGELOG.md' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'CSS Debugger', href: '/tools/css-debugger' },
      { label: 'Accessibility Checker', href: '/tools/accessibility-checker' },
      { label: 'Performance Profiler', href: '/tools/performance-profiler' },
      { label: 'Color Picker', href: '/tools/color-picker' },
      { label: 'DOM Inspector', href: '/tools/dom-inspector' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: 'https://github.com/rejisterjack/frontend-dev-helper#readme' },
      { label: 'GitHub', href: 'https://github.com/rejisterjack/frontend-dev-helper' },
      { label: 'Contributing', href: 'https://github.com/rejisterjack/frontend-dev-helper/blob/main/CONTRIBUTING.md' },
      { label: 'Firefox Add-ons', href: 'https://addons.mozilla.org/en-US/firefox/addon/frontenddevhelper/' },
      { label: 'Report a Bug', href: 'https://github.com/rejisterjack/frontend-dev-helper/issues' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'MIT License', href: 'https://github.com/rejisterjack/frontend-dev-helper/blob/main/LICENSE' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 pt-24 pb-12 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-6 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <WrenchIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter text-white">
                Frontend<span className="text-neutral-500 font-bold">Dev</span>Helper
              </span>
            </div>
            <p className="text-neutral-500 font-bold text-sm leading-relaxed mb-8">
              The ultimate professional toolkit for elite frontend engineers.
              39 tools. One extension. 100% Free.
            </p>
            <div className="flex items-center gap-4">
              {[
              { icon: Github, href: "https://github.com/rejisterjack/frontend-dev-helper" },
              { icon: Twitter, href: "https://github.com/rejisterjack/frontend-dev-helper/discussions" },
              { icon: Mail, href: "https://github.com/rejisterjack/frontend-dev-helper/issues" }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all hover:-translate-y-1 border border-white/5"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="font-black text-white text-[12px] uppercase tracking-widest mb-8">{column.title}</h3>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('http') || link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm font-bold text-neutral-500 hover:text-white transition-all inline-flex items-center gap-2 group"
                      >
                        {link.label}
                        {link.href.startsWith('http') && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm font-bold text-neutral-500 hover:text-white transition-all inline-flex items-center gap-2 group"
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

        {/* Bottom bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-xs font-black text-neutral-600 uppercase tracking-widest">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>for the elite frontend community</span>
          </div>

          <div className="flex items-center gap-8 text-[10px] font-black text-neutral-600 uppercase tracking-widest">
             <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                MIT License
             </div>
             <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Manifest V3
             </div>
             <span>&copy; 2026 FrontendDevHelper</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
