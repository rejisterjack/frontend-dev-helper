'use client';

import { Download, Monitor, Terminal, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { MagneticButton } from '@/components/ui/magnetic-button';

const steps = [
  {
    icon: Download,
    title: 'Download & Unzip',
    description: 'Download the latest build from GitHub releases and extract the ZIP to a permanent folder.',
  },
  {
    icon: Monitor,
    title: 'Enable Developer Mode',
    description: 'Open Chrome and navigate to chrome://extensions. Toggle the "Developer mode" switch.',
  },
  {
    icon: Terminal,
    title: 'Load Unpacked',
    description: 'Click "Load unpacked" and select the extracted folder. It appears in your toolbar instantly.',
  },
];

export const ManualInstall = () => {
  return (
    <section className="py-48 relative overflow-hidden px-6 bg-[#000]" id="install-guide">
      <div className="absolute inset-0 bg-grid opacity-5" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="text-xs-technical text-neutral-500">Fast Deployment</span>
            </div>
            <h2 className="text-5xl md:text-[8rem] font-black text-white mb-10 tracking-tighter leading-[0.85]">
              Ready in <span className="text-neutral-700">Seconds.</span>
            </h2>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-10 glass-card glass-card-hover flex flex-col items-start text-left rounded-[2rem]"
            >
              <div className="text-xs-technical text-neutral-800 mb-8">Step 0{index + 1}</div>
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-10 group-hover:scale-110 transition-all border border-white/5">
                <step.icon className="w-7 h-7 text-white opacity-50" />
              </div>
              <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase italic italic">
                {step.title}
              </h3>
              <p className="text-neutral-600 font-bold text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 max-w-5xl mx-auto">
          <div className="p-1 glass-card rounded-full overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-surface-900 px-12 py-8 rounded-full">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center border border-brand-cyan/20">
                  <CheckCircle2 className="w-6 h-6 text-brand-cyan" />
                </div>
                <div>
                   <p className="text-white text-xl font-black tracking-tight uppercase italic">Ready to elevate your flow?</p>
                   <p className="text-xs-technical text-neutral-600 mt-1">Surgical tools for professional engineers.</p>
                </div>
              </div>
              <MagneticButton
                onClick={() => window.open('https://github.com/rejisterjack/frontend-dev-helper/releases', '_blank')}
                className="bg-white text-black px-12 py-4 text-lg font-black rounded-full hover:bg-neutral-200 transition-all shadow-xl"
              >
                Get Started
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManualInstall;
