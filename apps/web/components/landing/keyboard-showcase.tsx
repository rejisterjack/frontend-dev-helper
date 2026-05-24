'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Command, Keyboard } from 'lucide-react';

const shortcuts = [
  {
    keys: ['Ctrl', 'Shift', 'F'],
    action: 'Open popup',
    builtin: true,
  },
  {
    keys: ['Ctrl', 'Shift', 'P'],
    action: 'Open Command Palette',
    builtin: true,
  },
  {
    keys: ['Alt', 'P'],
    action: 'Toggle DOM Outliner',
    builtin: true,
  },
  {
    keys: ['Alt', 'Shift', 'D'],
    action: 'Disable all tools',
    builtin: true,
  },
  {
    keys: ['Alt', 'S'],
    action: 'Toggle Spacing Visualizer',
    builtin: false,
  },
  {
    keys: ['Alt', 'F'],
    action: 'Toggle Font Inspector',
    builtin: false,
  },
  {
    keys: ['Alt', 'C'],
    action: 'Toggle Color Picker',
    builtin: false,
  },
  {
    keys: ['Alt', 'M'],
    action: 'Toggle Pixel Ruler',
    builtin: false,
  },
  {
    keys: ['Alt', 'B'],
    action: 'Toggle Breakpoint Overlay',
    builtin: false,
  },
];

function KeyCap({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-white/10 border border-white/10 font-mono font-semibold text-white/80 shadow-[0_2px_0_rgba(255,255,255,0.1)] ${
        small ? 'min-w-[28px] h-7 px-1.5 text-xs' : 'min-w-[36px] h-9 px-2 text-sm'
      }`}
    >
      {children}
    </span>
  );
}

export default function KeyboardShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="section-padding relative">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <Keyboard className="w-4 h-4 text-white/60" />
            <span className="text-sm font-medium text-white/60">Keyboard First</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Never Touch Your{' '}
            <span className="text-gradient">Mouse</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Chrome allows 4 built-in shortcuts. We pre-register the essentials.
            Add the rest in chrome://extensions/shortcuts — or just use the Command Palette.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="glass-card p-6 lg:p-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
              <Command className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Command Palette</h3>
              <p className="text-sm text-white/40">Ctrl+Shift+P — Fuzzy search all 39 tools instantly</p>
            </div>
          </div>

          <div className="space-y-3">
            {shortcuts.map((shortcut, i) => (
              <motion.div
                key={shortcut.action}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {shortcut.builtin && (
                    <span className="px-2 py-0.5 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-[10px] font-semibold text-accent-cyan uppercase tracking-wider">
                      Built-in
                    </span>
                  )}
                  {!shortcut.builtin && (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                      Custom
                    </span>
                  )}
                  <span className="text-sm text-white/60">{shortcut.action}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {shortcut.keys.map((key, j) => (
                    <span key={j} className="flex items-center gap-1.5">
                      <KeyCap>{key}</KeyCap>
                      {j < shortcut.keys.length - 1 && (
                        <span className="text-white/20 text-xs">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
            <p className="text-sm text-yellow-200/60">
              <span className="font-semibold text-yellow-200/80">Pro tip:</span> Use{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">chrome://extensions/shortcuts</kbd>{' '}
              to customize any command. Every tool is accessible via keyboard.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
